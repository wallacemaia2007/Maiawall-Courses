const assert = require('node:assert/strict');
const { test } = require('node:test');

const { serializeChapter, serializeCourse } = require('../src/routes/catalog.routes');

const COURSE_SLUG = 'apis-metodos-http-e-json';
const CHAPTER_SLUG = 'fundamentos-da-comunicacao-web';

function fakeChapter(overrides = {}) {
  return {
    _id: `${COURSE_SLUG}:${CHAPTER_SLUG}`,
    courseId: COURSE_SLUG,
    title: 'Fundamentos da comunicação web',
    slug: CHAPTER_SLUG,
    description: 'Como o navegador conversa com o servidor',
    order: 1,
    isPublic: true,
    requiresLogin: false,
    ...overrides,
  };
}

test('serializeChapter anexa o resumo das aulas (sem o corpo) a partir do catálogo em memória', () => {
  const chapter = serializeChapter(fakeChapter({ isPublic: false, requiresLogin: true }), COURSE_SLUG);

  assert.equal(chapter.id, `${COURSE_SLUG}:${CHAPTER_SLUG}`);
  assert.equal(chapter.slug, CHAPTER_SLUG);
  assert.equal(chapter.lessons.length, 3);
  chapter.lessons.forEach((lesson) => assert.equal('content' in lesson, false));
  assert.equal('isPublic' in chapter, false);
  assert.equal('requiresLogin' in chapter, false);
});

test('serializeChapter devolve lista de aulas vazia para um capítulo fora do catálogo (curso ainda sem conteúdo estático)', () => {
  const chapter = serializeChapter(fakeChapter({ slug: 'capitulo-inexistente' }), COURSE_SLUG);
  assert.deepEqual(chapter.lessons, []);
});

test('serializeChapter deriva lessonCount do catálogo, não do documento do Firestore', () => {
  const fromCatalog = serializeChapter(fakeChapter(), COURSE_SLUG);
  assert.equal(fromCatalog.lessonCount, fromCatalog.lessons.length);

  /*
   * Firestore ainda não migrado (ou editado à mão) não pode anunciar 0 aulas
   * para um capítulo que as tem: a API precisa servir uma contagem que bata com
   * o resumo que ela mesma devolve.
   */
  const staleDoc = serializeChapter(fakeChapter({ lessonCount: 0 }), COURSE_SLUG);
  assert.equal(staleDoc.lessonCount, fromCatalog.lessons.length);
});

test('serializeCourse ordena os capítulos e não expõe o corpo das aulas', () => {
  const course = serializeCourse(
    { _id: COURSE_SLUG, slug: COURSE_SLUG, title: 'APIs, métodos HTTP e JSON', published: true },
    [
      fakeChapter({ order: 2, slug: 'protocolo-http-e-mensagens', title: 'Protocolo HTTP' }),
      fakeChapter({ order: 1 }),
    ].map((chapter) => serializeChapter(chapter, COURSE_SLUG)),
  );

  assert.deepEqual(
    course.chapters.map((chapter) => chapter.slug),
    [CHAPTER_SLUG, 'protocolo-http-e-mensagens'],
  );
});
