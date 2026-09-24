const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');

const repositoryPath = require.resolve('../src/repositories/user.repository');
const users = new Map();

function clone(value) {
  return value ? structuredClone(value) : value;
}

const fakeRepository = {
  async findById(id) {
    return clone(users.get(id) || null);
  },
  async findByEmail(email) {
    return clone([...users.values()].find((user) => user.email === email) || null);
  },
  async listAll() {
    return [...users.values()].map(clone);
  },
  async updateById(id, update) {
    const updated = { ...users.get(id), ...update };
    users.set(id, updated);
    return clone(updated);
  },
};

require.cache[repositoryPath] = { exports: { UserRepository: fakeRepository } };

const { createApp } = require('../src/app');
const {
  assertCanGrant,
  assertCanRevoke,
  buildAdminCourses,
  buildAdminDashboard,
  buildAdmins,
  buildStudents,
  normalizeLeadInput,
} = require('../src/routes/admin.routes');
const { createAccessToken } = require('../src/utils/tokens');

const ADMIN_EMAILS = ['owner@example.com'];
const NOW = new Date('2026-09-24T12:00:00Z');
const daysAgo = (days) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

function person(id, overrides = {}) {
  return {
    _id: id,
    name: `Pessoa ${id}`,
    email: `${id}@example.com`,
    role: 'STUDENT',
    emailVerified: true,
    createdAt: daysAgo(100),
    ...overrides,
  };
}

/* ---------------- helpers puros ---------------- */

test('students list excludes admins and orders by last login', () => {
  const list = buildStudents({
    users: [
      person('old', { lastLoginAt: daysAgo(20) }),
      person('boss', { role: 'ADMIN' }),
      person('recent', { lastLoginAt: daysAgo(1) }),
      person('legacy', { refreshTokenUpdatedAt: daysAgo(5) }),
      person('never'),
    ],
    progress: [
      { userId: 'recent', courseId: 'c1', chapterId: 'a', status: 'completed' },
      { userId: 'recent', courseId: 'c1', chapterId: 'b', status: 'in-progress' },
    ],
    adminEmails: ADMIN_EMAILS,
  });

  assert.deepEqual(list.map((student) => student.id), ['recent', 'legacy', 'old', 'never']);
  assert.equal(list[0].completedChapters, 1);
  assert.equal(list[0].startedCourses, 1);
  assert.equal(list[1].lastLoginAt.getTime(), daysAgo(5).getTime());
  assert.equal(list[3].lastLoginAt, null);
  assert.equal(list[0].passwordHash, undefined);
});

test('verified google account listed in ADMIN_EMAILS is not a student', () => {
  const list = buildStudents({
    users: [person('owner', { email: 'owner@example.com', provider: 'google' })],
    progress: [],
    adminEmails: ADMIN_EMAILS,
  });
  assert.equal(list.length, 0);
});

test('dashboard aggregates students, courses, questions and leads', () => {
  const dashboard = buildAdminDashboard({
    now: NOW,
    adminEmails: ADMIN_EMAILS,
    users: [
      person('a', { createdAt: daysAgo(3), lastLoginAt: daysAgo(1) }),
      person('b', { createdAt: daysAgo(60), lastLoginAt: daysAgo(30) }),
      person('boss', { role: 'ADMIN' }),
    ],
    courses: [
      { _id: 'c1', title: 'A', published: true },
      { _id: 'c2', title: 'B', published: false },
    ],
    progress: [
      { userId: 'a', courseId: 'c1', chapterId: 'x', status: 'completed' },
      { userId: 'b', courseId: 'c1', chapterId: 'x', status: 'in-progress' },
    ],
    questions: [
      { _id: 'q1', question: 'Sem resposta?', createdAt: daysAgo(2), answer: '' },
      { _id: 'q2', question: 'Respondida?', createdAt: daysAgo(4), answer: 'Sim' },
    ],
    leads: [
      { _id: 'l1', status: 'novo', capturedAt: daysAgo(2) },
      { _id: 'l2', status: 'convertido', capturedAt: daysAgo(90) },
    ],
  });

  assert.deepEqual(dashboard.students, { total: 2, newLast30Days: 1, activeLast7Days: 1 });
  assert.deepEqual(dashboard.courses, { total: 2, published: 1 });
  assert.deepEqual(dashboard.learning, { completedChapters: 1, learners: 2 });
  assert.deepEqual(dashboard.questions, { total: 2, pending: 1 });
  assert.deepEqual(dashboard.leads, { total: 2, new: 1, last30Days: 1 });
  assert.deepEqual(dashboard.pendingQuestions.map((question) => question.id), ['q1']);
  assert.equal(dashboard.recentStudents[0].id, 'a');
});

test('admin course list includes unpublished courses with counts', () => {
  const list = buildAdminCourses({
    courses: [
      { _id: 'z', title: 'Zeta', published: false },
      { _id: 'a', title: 'Alfa', published: true, chapterCount: 9 },
    ],
    chapters: [
      { courseId: 'z' },
      { courseId: 'z' },
    ],
    progress: [
      { userId: 'u1', courseId: 'z', status: 'completed' },
      { userId: 'u1', courseId: 'z', status: 'completed' },
      { userId: 'u2', courseId: 'z', status: 'in-progress' },
    ],
  });

  assert.deepEqual(list.map((course) => course.id), ['a', 'z']);
  assert.equal(list[0].chapters, 9);
  assert.equal(list[1].chapters, 2);
  assert.equal(list[1].learners, 2);
  assert.equal(list[1].completedChapters, 2);
  assert.equal(list[1].published, false);
});

test('lead input requires name and source, trims and defaults status', () => {
  const lead = normalizeLeadInput({ name: '  Ana  ', source: ' Instagram ', email: 'ANA@Example.com ' });
  assert.equal(lead.name, 'Ana');
  assert.equal(lead.source, 'Instagram');
  assert.equal(lead.email, 'ana@example.com');
  assert.equal(lead.status, 'novo');
  assert.ok(lead.capturedAt instanceof Date);

  assert.throws(() => normalizeLeadInput({ source: 'x' }), /nome/);
  assert.throws(() => normalizeLeadInput({ name: 'Ana' }), /origem/);
  assert.throws(() => normalizeLeadInput({ name: 'Ana', source: 'x', email: 'nope' }), /e-mail invalido/);
  assert.throws(() => normalizeLeadInput({ name: 'Ana', source: 'x', status: 'xyz' }), /status/);
  assert.throws(() => normalizeLeadInput({ name: 'Ana', source: 'x', capturedAt: 'ontem' }), /data/);
});

test('partial lead update validates only the fields that were sent', () => {
  assert.deepEqual(normalizeLeadInput({ status: 'contatado' }, { partial: true }), { status: 'contatado' });
  assert.deepEqual(normalizeLeadInput({ email: '' }, { partial: true }), { email: '' });
  assert.throws(() => normalizeLeadInput({ name: 'A' }, { partial: true }), /nome/);
});

test('admin list marks who can be revoked', () => {
  const list = buildAdmins({
    actorId: 'me',
    adminEmails: ADMIN_EMAILS,
    users: [
      person('me', { role: 'ADMIN' }),
      person('other', { role: 'ADMIN' }),
      person('owner', { email: 'owner@example.com', provider: 'google' }),
      person('student'),
    ],
  });

  const byId = Object.fromEntries(list.map((admin) => [admin.id, admin]));
  assert.equal(list.length, 3);
  assert.equal(byId.me.revocable, false);
  assert.equal(byId.me.isSelf, true);
  assert.equal(byId.other.revocable, true);
  assert.equal(byId.owner.grantedBy, 'server');
  assert.equal(byId.owner.revocable, false);
});

test('revoke rules: not yourself, not server-managed, only real admins', () => {
  assert.throws(() => assertCanRevoke(person('me', { role: 'ADMIN' }), 'me', ADMIN_EMAILS), /proprio acesso/);
  assert.throws(
    () => assertCanRevoke(person('owner', { role: 'ADMIN', email: 'owner@example.com', provider: 'google' }), 'x', ADMIN_EMAILS),
    /ADMIN_EMAILS/,
  );
  assert.throws(() => assertCanRevoke(person('student'), 'x', ADMIN_EMAILS), /nao tem acesso/);
  assert.doesNotThrow(() => assertCanRevoke(person('other', { role: 'ADMIN' }), 'x', ADMIN_EMAILS));
});

test('grant rules: account must exist and have a verified e-mail', () => {
  assert.throws(() => assertCanGrant(null), /criar a conta/);
  assert.throws(() => assertCanGrant(person('u', { emailVerified: false })), /nao foi verificado/);
  assert.doesNotThrow(() => assertCanGrant(person('u')));
});

/* ---------------- rotas ---------------- */

let server;
let baseUrl;

function api(path, { as, ...options } = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (as) headers.Authorization = `Bearer ${createAccessToken({ id: as, role: 'ADMIN' })}`;
  return fetch(`${baseUrl}/api/admin${path}`, { ...options, headers });
}

before(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  users.clear();
  users.set('boss', person('boss', { role: 'ADMIN', email: 'boss@example.com' }));
  users.set('student', person('student', { email: 'student@example.com' }));
  users.set('pending', person('pending', { email: 'pending@example.com', emailVerified: false }));
});

test('admin endpoints reject anonymous visitors and non-admin students', async () => {
  assert.equal((await api('/access')).status, 401);
  assert.equal((await api('/access', { as: 'student' })).status, 403);
  assert.equal((await api('/students', { as: 'student' })).status, 403);
  assert.equal((await api('/leads', { as: 'student' })).status, 403);
  assert.equal((await api('/leads', { as: 'student', method: 'POST', body: '{}' })).status, 403);
});

test('GET /access lists the current admins', async () => {
  const response = await api('/access', { as: 'boss' });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body.data.map((admin) => admin.id), ['boss']);
  assert.equal(body.data[0].isSelf, true);
});

test('POST /access grants ADMIN to a verified account and DELETE revokes it', async () => {
  const grant = await api('/access', { as: 'boss', method: 'POST', body: JSON.stringify({ email: 'Student@Example.com' }) });
  assert.equal(grant.status, 201);
  assert.equal(users.get('student').role, 'ADMIN');
  assert.equal(users.get('student').adminGrantedById, 'boss');

  const revoke = await api('/access/student', { as: 'boss', method: 'DELETE' });
  assert.equal(revoke.status, 200);
  assert.equal(users.get('student').role, 'STUDENT');
});

test('POST /access refuses unknown, unverified and malformed e-mails', async () => {
  const send = (email) => api('/access', { as: 'boss', method: 'POST', body: JSON.stringify({ email }) });
  assert.equal((await send('ghost@example.com')).status, 404);
  assert.equal((await send('pending@example.com')).status, 409);
  assert.equal((await send('not-an-email')).status, 400);
  assert.equal(users.get('pending').role, 'STUDENT');
});

test('DELETE /access refuses removing your own access', async () => {
  const response = await api('/access/boss', { as: 'boss', method: 'DELETE' });
  assert.equal(response.status, 409);
  assert.equal(users.get('boss').role, 'ADMIN');
});
