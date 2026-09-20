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

module.exports = { catalogRouter };