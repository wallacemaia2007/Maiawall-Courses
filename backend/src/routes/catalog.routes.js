const express = require('express');

const { fromFirestoreDoc, getDatabase } = require('../config/database');
const { AppError } = require('../middleware/error-handler');
const { successResponse } = require('../utils/api-response');

const catalogRouter = express.Router();

function toId(value) {
  return value ? value.toString() : '';
}

function serializeLesson(lesson) {
  return {
    id: toId(lesson._id), chapterId: toId(lesson.chapterId), title: lesson.title,
    type: lesson.type, content: lesson.content, isPublic: Boolean(lesson.isPublic),
    attachments: lesson.attachments || [], image: lesson.image || null, order: lesson.order,
  };
}

function serializeChapter(chapter, lessons = []) {
  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);
  return {
    id: toId(chapter._id), courseId: toId(chapter.courseId), title: chapter.title,
    slug: chapter.slug, description: chapter.description, order: chapter.order,
    isPublic: Boolean(chapter.isPublic), requiresLogin: Boolean(chapter.requiresLogin),
    lessons: sortedLessons.map(serializeLesson),
  };
}

function buildCourseFaq(course, chapters = []) {
  if (Array.isArray(course.faq) && course.faq.length >= 5) {
    return course.faq.slice(0, 5);
  }

  const requirements = course.requirements?.length
    ? course.requirements.join(', ')
    : 'Nao ha conhecimento previo obrigatorio';
  return [
    {
      question: `Para quem e o minicurso ${course.title}?`,
      answer: `Ele foi preparado para quem esta no nivel ${course.level || 'iniciante'} e quer aprender o tema de forma objetiva e pratica.`,
    },
    {
      question: 'Preciso ter algum conhecimento antes de comecar?',
      answer: requirements,
    },
    {
      question: 'Quanto tempo preciso reservar?',
      answer: course.durationMinutes
        ? `O conteudo foi planejado para aproximadamente ${course.durationMinutes} minutos, mas voce pode seguir no seu ritmo.`
        : 'Voce pode estudar no seu ritmo e retomar quando quiser.',
    },
    {
      question: 'Como o conteudo esta organizado?',
      answer: `O minicurso possui ${chapters.length || course.chapterCount || 0} capitulos curtos, organizados em uma sequencia de leitura pratica.`,
    },
    {
      question: 'Preciso fazer login para acessar?',
      answer: 'A leitura e publica. O login e necessario para salvar progresso e enviar uma duvida ao instrutor.',
    },
  ];
}

function serializeCourse(course, chapters = []) {
  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
  return {
    id: toId(course._id), title: course.title, slug: course.slug,
    shortDescription: course.shortDescription, description: course.description,
    bannerUrl: course.bannerUrl, thumbnailUrl: course.thumbnailUrl,
    category: course.category, level: course.level,
    durationMinutes: course.durationMinutes,
    objectives: course.objectives || [], requirements: course.requirements || [],
    syllabus: course.syllabus || [], outcomes: course.outcomes || [],
    published: Boolean(course.published),
    chapters: sortedChapters,
    faq: buildCourseFaq(course, sortedChapters),
  };
}

async function getPublishedCourse(database, slug) {
  const snapshot = await database.collection('courses').doc(slug).get();
  const course = fromFirestoreDoc(snapshot);

  if (!course || !course.published) {
    throw new AppError(404, 'COURSE_NOT_FOUND', 'Curso nao encontrado');
  }

  return course;
}

async function getChaptersByCourse(database, courseId) {
  const snapshot = await database.collection('chapters').where('courseId', '==', courseId).get();
  return snapshot.docs.map(fromFirestoreDoc).sort((a, b) => a.order - b.order);
}

async function getLessonsByCourse(database, courseId) {
  const snapshot = await database.collection('lessons').where('courseId', '==', courseId).get();
  return snapshot.docs
    .map(fromFirestoreDoc)
    .sort((a, b) => a.order - b.order);
}

function groupLessonsByChapter(lessons) {
  const lessonsByChapter = new Map();

  for (const lesson of lessons) {
    const key = toId(lesson.chapterId);
    const entries = lessonsByChapter.get(key) || [];
    entries.push(lesson);
    lessonsByChapter.set(key, entries);
  }

  return lessonsByChapter;
}

async function getChaptersForCourses(database, courseIds) {
  if (courseIds.length === 0) return [];
  const snapshots = await Promise.all(
    courseIds.map((courseId) =>
      database.collection('chapters').where('courseId', '==', courseId).get()),
  );
  return snapshots.flatMap((snapshot) => snapshot.docs.map(fromFirestoreDoc));
}

async function getLessonsForChapters(database, chapterIds) {
  if (chapterIds.length === 0) return [];
  const snapshots = await Promise.all(
    chapterIds.map((chapterId) =>
      database.collection('lessons').where('chapterId', '==', chapterId).get()),
  );
  return snapshots.flatMap((snapshot) => snapshot.docs.map(fromFirestoreDoc));
}

/* Limits a trecho de código enviado na listagem a poucas linhas (o payload do
 * catálogo continua leve mesmo com preview). */
const MAX_SNIPPET_LINES = 8;

/* Listagens pequenas (ex.: getFeatured do hero da Home manda size=3) ganham um
 * preview rico: títulos dos 3 primeiros capítulos e, quando houver, um trecho da
 * primeira lesson de código do capítulo 1. A página de catálogo completa (size
 * maior) não carrega isso para não estourar o payload. */
async function enrichWithPreview(database, content) {
  const ids = content.map((course) => course.id);
  const chapters = await getChaptersForCourses(database, ids);
  const chaptersByCourse = new Map();

  for (const chapter of chapters) {
    const entries = chaptersByCourse.get(chapter.courseId) || [];
    entries.push(chapter);
    chaptersByCourse.set(chapter.courseId, entries);
  }

  for (const entries of chaptersByCourse.values()) {
    entries.sort((a, b) => a.order - b.order);
  }

  const firstChapters = [...chaptersByCourse.values()].map((list) => list[0]).filter(Boolean);
  const lessons = await getLessonsForChapters(
    database,
    firstChapters.map((chapter) => chapter._id),
  );
  const lessonsByChapter = groupLessonsByChapter(lessons);

  for (const course of content) {
    const courseChapters = chaptersByCourse.get(course.id) || [];
    course.previewChapters = courseChapters.slice(0, 3).map((chapter) => ({ title: chapter.title }));

    const firstChapter = courseChapters[0];
    const codeLesson = (firstChapter ? lessonsByChapter.get(firstChapter._id) || [] : [])
      .find((lesson) => lesson.type === 'code'
        && typeof lesson.content === 'string'
        && lesson.content.trim().length > 0);

    if (codeLesson) {
      course.previewSnippet = {
        code: codeLesson.content
          .split('\n')
          .slice(0, MAX_SNIPPET_LINES)
          .map((line) => line.trimEnd())
          .join('\n'),
      };
    }
  }
}

catalogRouter.get('/', async (request, response, next) => {
  try {
    const database = await getDatabase();
    const page = Math.max(0, Number.parseInt(request.query.page, 10) || 0);
    const size = Math.min(100, Math.max(1, Number.parseInt(request.query.size, 10) || 12));

    const snapshot = await database.collection('courses').where('published', '==', true).get();
    const courses = snapshot.docs
      .map(fromFirestoreDoc)
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    const totalElements = courses.length;
    const content = courses.slice(page * size, page * size + size).map((course) => ({
      id: toId(course._id), title: course.title, slug: course.slug,
      shortDescription: course.shortDescription, bannerUrl: course.bannerUrl,
      thumbnailUrl: course.thumbnailUrl,
      category: course.category, level: course.level, durationMinutes: course.durationMinutes,
      chapterCount: Number(course.chapterCount) || 0,
    }));

    if (size <= 6) {
      await enrichWithPreview(database, content);
    }

    response.json(successResponse(
      { content, page, size, totalElements, totalPages: Math.ceil(totalElements / size) },
      'OK',
    ));
  } catch (error) { next(error); }
});

catalogRouter.get('/slug/:slug', async (request, response, next) => {
  try {
    const database = await getDatabase();
    const course = await getPublishedCourse(database, request.params.slug);
    const chapters = await getChaptersByCourse(database, course._id);
    const lessons = await getLessonsByCourse(database, course._id);
    const lessonsByChapter = groupLessonsByChapter(lessons);

    response.json(successResponse(serializeCourse(
      course,
      chapters.map((chapter) => serializeChapter(chapter, lessonsByChapter.get(chapter._id) || [])),
    ), 'OK'));
  } catch (error) { next(error); }
});

catalogRouter.get('/:id', async (request, response, next) => {
  try {
    const database = await getDatabase();
    const doc = await database.collection('courses').doc(request.params.id).get();
    const course = fromFirestoreDoc(doc);

    if (!course || !course.published) {
      throw new AppError(404, 'COURSE_NOT_FOUND', 'Curso nao encontrado');
    }

    const chapters = await getChaptersByCourse(database, course._id);
    const lessons = await getLessonsByCourse(database, course._id);
    const lessonsByChapter = groupLessonsByChapter(lessons);

    response.json(successResponse(serializeCourse(
      course,
      chapters.map((chapter) => serializeChapter(chapter, lessonsByChapter.get(chapter._id) || [])),
    ), 'OK'));
  } catch (error) { next(error); }
});

catalogRouter.get('/:courseSlug/capitulos/:chapterSlug', async (request, response, next) => {
  try {
    const database = await getDatabase();
    const course = await getPublishedCourse(database, request.params.courseSlug);
    const chapter = await database.collection('chapters').doc(`${course._id}:${request.params.chapterSlug}`).get();

    if (!chapter.exists || chapter.data().courseId !== course._id) {
      throw new AppError(404, 'CHAPTER_NOT_FOUND', 'Capitulo nao encontrado');
    }

    const chapterData = fromFirestoreDoc(chapter);
    const lessons = (await getLessonsByCourse(database, course._id))
      .filter((lesson) => lesson.chapterId === chapterData._id);

    response.json(successResponse(serializeChapter(chapterData, lessons), 'OK'));
  } catch (error) { next(error); }
});

module.exports = { buildCourseFaq, catalogRouter };
