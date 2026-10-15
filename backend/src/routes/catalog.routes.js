const express = require('express');

const { fromFirestoreDoc, getDatabase } = require('../config/database');
const {
  getFirstCodeLessonContent,
  getLessonSummaries,
  hasCourseChapter,
} = require('../content/course-content');
const { AppError } = require('../middleware/error-handler');
const { successResponse } = require('../utils/api-response');

const catalogRouter = express.Router();

function toId(value) {
  return value ? value.toString() : '';
}

/*
 * Capítulos órfãos (no Firestore mas não no catálogo) são avisados uma única
 * vez por processo: esta rota é chamada a cada visita ao curso e o aviso se
 * repetir a cada request esconderia o problema real nos logs da função.
 */
const warnedMissingChapters = new Set();

function warnMissingChapter(courseSlug, chapterSlug) {
  const key = `${courseSlug}:${chapterSlug}`;
  if (warnedMissingChapters.has(key)) return;
  warnedMissingChapters.add(key);

  console.warn(
    `[catalog] Capítulo "${key}" está no Firestore mas não existe no catálogo de seed — ` +
      'as aulas não serão exibidas. Confira o JSON em backend/src/seed/ e rode o seed de novo.',
  );
}

/*
 * `lessons` traz só o resumo (título/tipo/ordem) de cada aula, vindo do
 * catálogo em memória (ver ../content/course-content.js) — o corpo completo
 * (content/imagem/anexos) não passa mais pela API: o frontend busca isso
 * direto do asset estático gerado em public/assets/courses/content/<slug>.json.
 * Isso é o que elimina a leitura da coleção `lessons` do Firestore (a mais
 * pesada e mais repetida) a cada troca de capítulo.
 */
function serializeChapter(chapter, courseSlug) {
  /*
   * O Firestore guarda o metadado do capítulo e o catálogo de seed guarda o
   * conteúdo: se um capítulo for criado/renomeado no Firestore sem espelhar no
   * JSON de `backend/src/seed/`, a lista de aulas volta vazia e o leitor cai no
   * empty state sem nenhuma pista do motivo. Avisa no log da function.
   */
  if (!hasCourseChapter(courseSlug, chapter.slug)) {
    warnMissingChapter(courseSlug, chapter.slug);
  }

  const lessons = getLessonSummaries(courseSlug, chapter.slug);

  return {
    id: toId(chapter._id), courseId: toId(chapter.courseId), title: chapter.title,
    slug: chapter.slug, description: chapter.description, order: chapter.order,
    isPublic: Boolean(chapter.isPublic), requiresLogin: Boolean(chapter.requiresLogin),
    /*
     * A contagem vem do catálogo, e não do campo `lessonCount` gravado pelo
     * seed: assim um Firestore ainda não migrado (ou editado à mão) nunca
     * anuncia 0 aulas para um capítulo que as tem. O campo continua sendo
     * gravado no seed porque descreve o documento para o admin/analytics.
     */
    lessonCount: lessons.length,
    lessons,
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

async function getChaptersForCourses(database, courseIds) {
  if (courseIds.length === 0) return [];
  const snapshots = await Promise.all(
    courseIds.map((courseId) =>
      database.collection('chapters').where('courseId', '==', courseId).get()),
  );
  return snapshots.flatMap((snapshot) => snapshot.docs.map(fromFirestoreDoc));
}

/* Limits a trecho de código enviado na listagem a poucas linhas (o payload do
 * catálogo continua leve mesmo com preview). */
const MAX_SNIPPET_LINES = 8;

// Conteúdo de aula pode trazer trechos entre ``` (renderizados como terminal no
// frontend). A prévia da home mostra só o código, sem as cercas.
const CODE_FENCE = /^[ \t]*```[^\n`]*\n([\s\S]*?)\n[ \t]*```[ \t]*(?=\n|$)/m;

function extractFirstCode(content) {
  const codeTag = /<pre>\s*<code(?:\s+class="language-[^"]+")?>([\s\S]*?)<\/code>\s*<\/pre>/i.exec(content);
  if (codeTag) {
    return decodeHtmlEntities(codeTag[1].trim());
  }

  const match = CODE_FENCE.exec(content.replace(/\r\n/g, '\n'));
  return match ? match[1] : content;
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

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

  for (const course of content) {
    const courseChapters = chaptersByCourse.get(course.id) || [];
    course.previewChapters = courseChapters.slice(0, 3).map((chapter) => ({ title: chapter.title }));

    const firstChapter = courseChapters[0];
    const codeContent = firstChapter
      ? getFirstCodeLessonContent(course.slug, firstChapter.slug)
      : null;

    if (codeContent) {
      course.previewSnippet = {
        code: extractFirstCode(codeContent)
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

    response.json(successResponse(serializeCourse(
      course,
      chapters.map((chapter) => serializeChapter(chapter, course.slug)),
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

    response.json(successResponse(serializeCourse(
      course,
      chapters.map((chapter) => serializeChapter(chapter, course.slug)),
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

    response.json(successResponse(serializeChapter(fromFirestoreDoc(chapter), course.slug), 'OK'));
  } catch (error) { next(error); }
});

module.exports = { buildCourseFaq, catalogRouter, serializeChapter, serializeCourse };
