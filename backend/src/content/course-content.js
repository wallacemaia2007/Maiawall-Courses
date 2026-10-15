/*
 * Conteúdo (aulas) dos cursos, em memória, a partir do mesmo catálogo usado
 * pelo seed (backend/src/seed/course-catalog.js). Nada aqui toca o Firestore:
 * cursos/capítulos continuam vindo das coleções `courses`/`chapters` (metadado
 * leve), mas o corpo pesado de cada aula (content/imagem/anexos) sai só daqui.
 *
 * O mesmo catálogo também alimenta os assets estáticos consumidos pelo
 * frontend (ver scripts/build-course-content-assets.js) — o front busca o
 * conteúdo completo direto do CDN, e o backend usa este módulo só para o que
 * ainda precisa responder (contagem/resumo de aula e o snippet de código da
 * home). Os IDs seguem o mesmo esquema do seed: capítulo = `curso:capitulo`,
 * aula = `curso:capitulo:indice` (índice na lista, não o campo `order`).
 */

const courseCatalog = require('../seed/course-catalog');

/** Map<courseSlug, Map<chapterSlug, lessons[]>> — montado uma vez, no load. */
const lessonsByCourseAndChapter = new Map();

for (const course of courseCatalog.courses) {
  const chapterMap = new Map();
  for (const chapter of course.chapters || []) {
    chapterMap.set(chapter.slug, chapter.lessons || []);
  }
  lessonsByCourseAndChapter.set(course.slug, chapterMap);
}

function rawLessonsOf(courseSlug, chapterSlug) {
  return lessonsByCourseAndChapter.get(courseSlug)?.get(chapterSlug) || [];
}

/*
 * Resumo leve de cada aula (sem content/imagem/anexos) — usado na página de
 * detalhes do curso (ementa) e na listagem, onde só título/tipo/ordem
 * importam. O corpo completo só é servido pelo asset estático.
 */
function getLessonSummaries(courseSlug, chapterSlug) {
  const chapterId = `${courseSlug}:${chapterSlug}`;
  return rawLessonsOf(courseSlug, chapterSlug).map((lesson, index) => ({
    id: `${chapterId}:${index}`,
    chapterId,
    title: lesson.title,
    type: lesson.type,
    order: lesson.order ?? index + 1,
  }));
}

/* Conteúdo da primeira aula do tipo "code" do capítulo (para o preview da home). */
function getFirstCodeLessonContent(courseSlug, chapterSlug) {
  const lesson = rawLessonsOf(courseSlug, chapterSlug).find(
    (item) =>
      item.type === 'code' && typeof item.content === 'string' && item.content.trim().length > 0,
  );
  return lesson ? lesson.content : null;
}

/*
 * Aulas que o catálogo tem para um capítulo, sem filtrar por `published`: quem
 * decide o que é publicado é a collection `courses` do Firestore. Serve para
 * validar que o JSON do capítulo pedido existe de fato no catálogo.
 */
function hasCourseChapter(courseSlug, chapterSlug) {
  return lessonsByCourseAndChapter.get(courseSlug)?.has(chapterSlug) ?? false;
}

/*
 * Regra única de publicação, compartilhada pelo seed e pelo build dos assets
 * estáticos. `published` precisa ser explicitamente `true`: o asset é servido
 * publicamente pelo hosting, sem passar pela API, então um curso que saia do
 * catálogo sem o campo viraria um JSON baixável por qualquer um que adivinhasse
 * o slug, mesmo invisível no catálogo público. `isPublishable` (build) e
 * `validateCatalog` (seed) usam esta função para que os dois lados nunca
 * discordem sobre o que é público.
 */
function isCoursePublished(course) {
  return course.published === true;
}

module.exports = {
  getFirstCodeLessonContent,
  getLessonSummaries,
  hasCourseChapter,
  isCoursePublished,
};
