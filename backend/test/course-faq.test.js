const assert = require('node:assert/strict');
const { test } = require('node:test');

const { buildCourseFaq } = require('../src/routes/catalog.routes');
const { requiredText, serializeQuestion } = require('../src/routes/question.routes');

test('builds five initial FAQ entries from course data', () => {
  const faq = buildCourseFaq(
    {
      title: 'APIs',
      level: 'iniciante',
      durationMinutes: 30,
      requirements: ['Navegador'],
    },
    [{ _id: 'one' }, { _id: 'two' }],
  );

  assert.equal(faq.length, 5);
  assert.match(faq[0].question, /APIs/);
  assert.match(faq[3].answer, /2 capitulos/);
});

test('question validation trims content and rejects short questions', () => {
  assert.equal(requiredText('  Wallace  ', 'nome', 2, 80), 'Wallace');
  assert.throws(() => requiredText('curta', 'duvida', 10, 1000), /entre 10 e 1000/);
});

test('public question serialization does not expose the author email', () => {
  const serialized = serializeQuestion({
    _id: 'question-1',
    courseId: 'apis',
    courseTitle: 'APIs',
    authorName: 'Ana',
    authorEmail: 'ana@example.com',
    question: 'Como praticar?',
    answer: 'Use um cliente HTTP.',
    published: true,
  });

  assert.equal(serialized.authorEmail, undefined);
  assert.equal(serialized.authorName, 'Ana');
});
