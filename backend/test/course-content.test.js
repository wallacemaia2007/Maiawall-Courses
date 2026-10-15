const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  getFirstCodeLessonContent,
  getLessonSummaries,
} = require('../src/content/course-content');

const COURSE_SLUG = 'apis-metodos-http-e-json';
const CHAPTER_SLUG = 'fundamentos-da-comunicacao-web';

test('getLessonSummaries traz título/tipo/ordem sem o corpo da aula, com id determinístico', () => {
  const summaries = getLessonSummaries(COURSE_SLUG, CHAPTER_SLUG);

  assert.equal(summaries.length, 3);
  assert.deepEqual(
    summaries.map((lesson) => lesson.id),
    [
      `${COURSE_SLUG}:${CHAPTER_SLUG}:0`,
      `${COURSE_SLUG}:${CHAPTER_SLUG}:1`,
      `${COURSE_SLUG}:${CHAPTER_SLUG}:2`,
    ],
  );
  summaries.forEach((lesson) => {
    assert.equal(lesson.chapterId, `${COURSE_SLUG}:${CHAPTER_SLUG}`);
    assert.equal('content' in lesson, false);
  });
  assert.equal(summaries[2].type, 'code');
});

test('getFirstCodeLessonContent acha a primeira aula de código do capítulo', () => {
  const content = getFirstCodeLessonContent(COURSE_SLUG, CHAPTER_SLUG);
  assert.equal(typeof content, 'string');
  assert.ok(content.length > 0);
});

test('getFirstCodeLessonContent devolve null quando não há aula de código', () => {
  assert.equal(getFirstCodeLessonContent('curso-que-nao-existe', CHAPTER_SLUG), null);
});
