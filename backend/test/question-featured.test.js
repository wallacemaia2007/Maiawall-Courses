const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  assertCanFeature,
  buildAuthorProfile,
  serializeQuestion,
} = require('../src/routes/question.routes');

test('featured serialization defaults to false and is kept when true', () => {
  const basic = serializeQuestion({
    _id: 'q-1',
    courseId: 'apis',
    courseTitle: 'APIs',
    authorName: 'Ana',
    question: 'Como praticar?',
    answer: 'Use um cliente HTTP.',
  });
  assert.equal(basic.featured, false);

  const starred = serializeQuestion({
    _id: 'q-2',
    courseId: 'apis',
    courseTitle: 'APIs',
    authorName: 'Bia',
    question: 'O que e REST?',
    answer: 'Um estilo de arquitetura.',
    published: true,
    featured: true,
  });
  assert.equal(starred.featured, true);
});

test('private serialization exposes the author profile but public does not', () => {
  const question = {
    _id: 'q-3',
    courseId: 'apis',
    courseTitle: 'APIs',
    userId: 'user-1',
    authorName: 'Ana',
    authorEmail: 'ana@example.com',
    question: 'Duvida?',
    answer: 'Resposta.',
    published: true,
    author: {
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
      avatarUrl: 'https://img/ana.png',
      createdAt: '2026-01-10T00:00:00.000Z',
      lastLoginAt: '2026-03-01T00:00:00.000Z',
      questionsCount: 2,
    },
  };

  const publicView = serializeQuestion(question);
  assert.equal(publicView.authorEmail, undefined);
  assert.equal(publicView.author, undefined);

  const privateView = serializeQuestion(question, true);
  assert.equal(privateView.authorEmail, 'ana@example.com');
  assert.equal(privateView.author.id, 'user-1');
  assert.equal(privateView.author.questionsCount, 2);
});

test('assertCanFeature rejects unanswered and unpublished questions', () => {
  assert.throws(() => assertCanFeature({ answer: '', published: true }), /Responda a duvida/);
  assert.throws(() => assertCanFeature({ answer: 'Sim', published: false }), /Publique a duvida/);
  assert.doesNotThrow(() => assertCanFeature({ answer: 'Sim', published: true }));
});

test('buildAuthorProfile maps a known user and falls back to stored data', () => {
  const usersById = new Map([
    ['user-1', {
      _id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
      avatarUrl: 'https://img/ana.png',
      createdAt: '2026-01-10T00:00:00.000Z',
      lastLoginAt: '2026-03-01T00:00:00.000Z',
    }],
  ]);
  const counts = new Map([['user-1', 3]]);

  const known = buildAuthorProfile(
    { userId: 'user-1', authorName: 'Ana', authorEmail: 'ana@example.com' },
    usersById,
    counts,
  );
  assert.equal(known.name, 'Ana');
  assert.equal(known.avatarUrl, 'https://img/ana.png');
  assert.equal(known.questionsCount, 3);

  const orphan = buildAuthorProfile(
    { authorName: 'Sem Conta', authorEmail: 'sem@conta.com' },
    usersById,
    counts,
  );
  assert.equal(orphan.id, null);
  assert.equal(orphan.email, 'sem@conta.com');
  assert.equal(orphan.questionsCount, 0);
});