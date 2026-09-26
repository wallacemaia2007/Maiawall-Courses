const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  assertCanFeature,
  buildAuthorProfile,
  buildFeaturedQuestionGroups,
  GENERAL_COURSE_ID,
  GENERAL_COURSE_TITLE,
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

test('buildFeaturedQuestionGroups groups only starred public questions by course', () => {
  const courses = [
    {
      _id: 'apis',
      slug: 'apis-metodos-http-e-json',
      title: 'APIs e Métodos HTTP',
      category: 'backend',
      published: true,
    },
    {
      _id: 'docker',
      slug: 'docker-na-pratica',
      title: 'Docker na Prática',
      category: 'devops',
      published: true,
    },
    {
      _id: 'oculto',
      slug: 'curso-oculto',
      title: 'Curso Oculto',
      category: 'frontend',
      published: false,
    },
  ];
  const questions = [
    {
      _id: 'apis-antiga',
      courseId: 'apis',
      courseTitle: 'Título antigo',
      authorName: 'Ana',
      authorEmail: 'ana@example.com',
      question: 'Primeira dúvida',
      answer: 'Primeira resposta',
      published: true,
      featured: true,
      answeredAt: '2026-01-01T00:00:00.000Z',
    },
    {
      _id: 'apis-recente',
      courseId: 'apis',
      courseTitle: 'Título antigo',
      authorName: 'Bia',
      question: 'Segunda dúvida',
      answer: 'Segunda resposta',
      published: true,
      featured: true,
      answeredAt: '2026-02-01T00:00:00.000Z',
      author: { name: 'Bia', avatarUrl: 'https://img/bia.png', email: 'bia@example.com' },
    },
    {
      _id: 'apis-sem-estrela',
      courseId: 'apis',
      courseTitle: 'APIs e Métodos HTTP',
      authorName: 'Cid',
      question: 'Dúvida comum',
      answer: 'Resposta comum',
      published: true,
      featured: false,
    },
    {
      _id: 'apis-nao-publicada',
      courseId: 'apis',
      courseTitle: 'APIs e Métodos HTTP',
      authorName: 'Dan',
      question: 'Dúvida oculta',
      answer: 'Resposta oculta',
      published: false,
      featured: true,
    },
    {
      _id: 'apis-sem-resposta',
      courseId: 'apis',
      courseTitle: 'APIs e Métodos HTTP',
      authorName: 'Eve',
      question: 'Dúvida pendente',
      answer: '',
      published: true,
      featured: true,
    },
    {
      _id: 'docker-destaque',
      courseId: 'docker',
      courseTitle: 'Docker na Prática',
      authorName: 'Ful',
      question: 'Dúvida de Docker',
      answer: 'Resposta de Docker',
      published: true,
      featured: true,
    },
    {
      _id: 'oculto-destaque',
      courseId: 'oculto',
      courseTitle: 'Curso Oculto',
      authorName: 'Gia',
      question: 'Dúvida de curso oculto',
      answer: 'Resposta oculta',
      published: true,
      featured: true,
    },
  ];

  const groups = buildFeaturedQuestionGroups(questions, courses);

  assert.deepEqual(groups.map((group) => group.course.id), ['apis', 'docker']);
  assert.equal(groups[0].course.slug, 'apis-metodos-http-e-json');
  assert.equal(groups[0].course.category, 'backend');
  assert.deepEqual(groups[0].questions.map((question) => question.id), [
    'apis-recente',
    'apis-antiga',
  ]);
  assert.equal(groups[0].questions[0].authorEmail, undefined);
  // Autor publico: so nome e foto, nunca o e-mail.
  assert.deepEqual(groups[0].questions[0].author, {
    name: 'Bia',
    avatarUrl: 'https://img/bia.png',
  });
  // Sem conta vinculada: cai para o nome informado no formulario, sem foto.
  assert.deepEqual(groups[0].questions[1].author, { name: 'Ana', avatarUrl: null });
});

test('serializePublicAuthor exposes only name and avatar, never e-mail', () => {
  const { serializePublicAuthor } = require('../src/routes/question.routes');

  const withAccount = serializePublicAuthor({
    authorName: 'Ana',
    author: { name: 'Ana', email: 'ana@example.com', avatarUrl: 'https://img/ana.png' },
  });
  assert.deepEqual(withAccount, { name: 'Ana', avatarUrl: 'https://img/ana.png' });

  const withoutAvatar = serializePublicAuthor({ authorName: 'Sem Foto', author: null });
  assert.deepEqual(withoutAvatar, { name: 'Sem Foto', avatarUrl: null });
});

test('buildFeaturedQuestionGroups keeps general questions in their own group at the end', () => {
  const courses = [
    {
      _id: 'apis',
      slug: 'apis-metodos-http-e-json',
      title: 'APIs e Métodos HTTP',
      category: 'backend',
      published: true,
    },
  ];
  const questions = [
    {
      _id: 'apis-destaque',
      courseId: 'apis',
      courseTitle: 'APIs',
      authorName: 'Ana',
      question: 'Dúvida de API',
      answer: 'Resposta de API',
      published: true,
      featured: true,
    },
    {
      _id: 'geral-destaque',
      courseId: GENERAL_COURSE_ID,
      courseTitle: GENERAL_COURSE_TITLE,
      authorName: 'Bia',
      question: 'Dúvida sobre a plataforma',
      answer: 'Resposta geral',
      published: true,
      featured: true,
    },
    {
      _id: 'geral-sem-estrela',
      courseId: GENERAL_COURSE_ID,
      courseTitle: GENERAL_COURSE_TITLE,
      authorName: 'Cid',
      question: 'Dúvida geral pendente',
      answer: 'Resposta escondida',
      published: true,
      featured: false,
    },
  ];

  const groups = buildFeaturedQuestionGroups(questions, courses);

  assert.deepEqual(groups.map((group) => group.course.id), ['apis', GENERAL_COURSE_ID]);
  const general = groups[1];
  assert.equal(general.course.title, GENERAL_COURSE_TITLE);
  // Sem curso para ligar: o slug fica vazio e a página esconde o CTA.
  assert.equal(general.course.slug, '');
  assert.equal(general.course.category, null);
  assert.deepEqual(general.questions.map((question) => question.id), ['geral-destaque']);
});