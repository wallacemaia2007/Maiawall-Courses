const express = require('express');

const { env } = require('../config/env');
const { fromFirestoreDoc, getDatabase } = require('../config/database');
const { AppError } = require('../middleware/error-handler');
const { UserRepository } = require('../repositories/user.repository');
const { getAnalyticsOverview } = require('../services/analytics.service');
const { successResponse } = require('../utils/api-response');

const adminRouter = express.Router();

const DAY_MS = 24 * 60 * 60 * 1000;
const LEAD_STATUSES = ['novo', 'contatado', 'convertido', 'descartado'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------------------ */
/* Helpers puros (exportados para teste)                               */
/* ------------------------------------------------------------------ */

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinDays(value, days, now = new Date()) {
  const date = toDate(value);
  return Boolean(date) && now.getTime() - date.getTime() <= days * DAY_MS;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/* Ultimo login. Usuarios antigos nao tem lastLoginAt: usa a ultima sessao emitida. */
function lastLoginOf(user) {
  return toDate(user.lastLoginAt) || toDate(user.refreshTokenUpdatedAt);
}

/* Como o usuario chegou a ser admin: papel gravado no banco e/ou ADMIN_EMAILS (Google verificado). */
function adminAccessOf(user, adminEmails = env.adminEmails) {
  const viaRole = user.role === 'ADMIN';
  const viaServer = user.provider === 'google'
    && user.emailVerified === true
    && adminEmails.includes(normalizeEmail(user.email));
  return { viaRole, viaServer, isAdmin: viaRole || viaServer };
}

function buildProgressStats(progress) {
  const byUser = new Map();
  const byCourse = new Map();

  for (const item of progress) {
    const completed = item.status === 'completed';

    const user = byUser.get(item.userId) || { completedChapters: 0, courses: new Set() };
    if (completed) user.completedChapters += 1;
    user.courses.add(item.courseId);
    byUser.set(item.userId, user);

    const course = byCourse.get(item.courseId) || { completedChapters: 0, learners: new Set() };
    if (completed) course.completedChapters += 1;
    course.learners.add(item.userId);
    byCourse.set(item.courseId, course);
  }

  return { byUser, byCourse };
}

function serializeStudent(user, stats) {
  const userStats = stats?.byUser.get(user._id);
  return {
    id: user._id,
    name: user.name || user.email,
    email: user.email,
    avatarUrl: user.avatarUrl,
    provider: user.provider || 'email',
    emailVerified: Boolean(user.emailVerified),
    createdAt: user.createdAt,
    lastLoginAt: lastLoginOf(user),
    completedChapters: userStats?.completedChapters || 0,
    startedCourses: userStats?.courses.size || 0,
  };
}

function byLastLoginDesc(a, b) {
  const left = toDate(a.lastLoginAt)?.getTime() || 0;
  const right = toDate(b.lastLoginAt)?.getTime() || 0;
  return right - left;
}

function buildStudents({ users, progress, adminEmails = env.adminEmails }) {
  const stats = buildProgressStats(progress);
  return users
    .filter((user) => !adminAccessOf(user, adminEmails).isAdmin)
    .map((user) => serializeStudent(user, stats))
    .sort(byLastLoginDesc);
}

function buildAdminCourses({ courses, chapters, progress }) {
  const stats = buildProgressStats(progress);
  const chapterCount = new Map();
  for (const chapter of chapters) {
    chapterCount.set(chapter.courseId, (chapterCount.get(chapter.courseId) || 0) + 1);
  }

  return courses
    .map((course) => {
      const courseStats = stats.byCourse.get(course._id);
      return {
        id: course._id,
        title: course.title,
        slug: course.slug,
        category: course.category,
        level: course.level,
        durationMinutes: course.durationMinutes,
        thumbnailUrl: course.thumbnailUrl,
        published: Boolean(course.published),
        chapters: chapterCount.get(course._id) ?? (Number(course.chapterCount) || 0),
        learners: courseStats?.learners.size || 0,
        completedChapters: courseStats?.completedChapters || 0,
        updatedAt: course.updatedAt,
      };
    })
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
}

/* Cursos com mais alunos com progresso iniciado, para o painel de engajamento. */
function topCoursesOf({ courses, chapters, progress }, limit = 3) {
  return buildAdminCourses({ courses, chapters, progress })
    .slice()
    .sort((a, b) => b.learners - a.learners)
    .slice(0, limit)
    .map((course) => ({
      id: course.id,
      title: course.title,
      learners: course.learners,
      completedChapters: course.completedChapters,
    }));
}

function buildAdminDashboard({
  users,
  courses,
  chapters = [],
  progress,
  questions,
  leads,
  now = new Date(),
  adminEmails = env.adminEmails,
}) {
  const students = buildStudents({ users, progress, adminEmails });
  const pendingQuestions = questions
    .filter((question) => !question.answer)
    .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));
  const learners = new Set(progress.map((item) => item.userId));

  return {
    students: {
      total: students.length,
      newLast30Days: students.filter((student) => isWithinDays(student.createdAt, 30, now)).length,
      activeLast7Days: students.filter((student) => isWithinDays(student.lastLoginAt, 7, now)).length,
    },
    courses: {
      total: courses.length,
      published: courses.filter((course) => course.published).length,
    },
    learning: {
      completedChapters: progress.filter((item) => item.status === 'completed').length,
      learners: learners.size,
    },
    questions: {
      total: questions.length,
      pending: pendingQuestions.length,
    },
    leads: {
      total: leads.length,
      new: leads.filter((lead) => (lead.status || 'novo') === 'novo').length,
      converted: leads.filter((lead) => lead.status === 'convertido').length,
      last30Days: leads.filter((lead) => isWithinDays(lead.capturedAt || lead.createdAt, 30, now)).length,
    },
    topCourses: topCoursesOf({ courses, chapters, progress }),
    recentStudents: students.slice(0, 5),
    pendingQuestions: pendingQuestions.slice(0, 5).map((question) => ({
      id: question._id,
      courseTitle: question.courseTitle,
      authorName: question.authorName,
      question: question.question,
      createdAt: question.createdAt,
    })),
  };
}

/* ---- Leads ---- */

function textField(value, field, { min = 0, max }) {
  const text = String(value ?? '').trim();
  if (text.length < min || text.length > max) {
    const range = min > 0 ? `entre ${min} e ${max}` : `com no maximo ${max}`;
    throw new AppError(400, 'VALIDATION_ERROR', `${field} deve ter ${range} caracteres`);
  }
  return text;
}

/*
 * Valida o corpo de um lead. Em criacao exige nome e origem; em edicao
 * (partial) valida apenas os campos enviados.
 */
function normalizeLeadInput(body = {}, { partial = false, now = new Date() } = {}) {
  const has = (key) => body[key] !== undefined;
  const lead = {};

  if (!partial || has('name')) lead.name = textField(body.name, 'nome', { min: 2, max: 80 });
  if (!partial || has('source')) lead.source = textField(body.source, 'origem', { min: 1, max: 60 });

  if (has('email')) {
    const email = normalizeEmail(textField(body.email, 'e-mail', { max: 120 }));
    if (email && !EMAIL_PATTERN.test(email)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'e-mail invalido');
    }
    lead.email = email;
  }
  if (has('phone')) lead.phone = textField(body.phone, 'telefone', { max: 30 });
  if (has('medium')) lead.medium = textField(body.medium, 'meio', { max: 60 });
  if (has('campaign')) lead.campaign = textField(body.campaign, 'campanha', { max: 80 });
  if (has('notes')) lead.notes = textField(body.notes, 'observacoes', { max: 1000 });

  if (!partial || has('status')) {
    const status = body.status === undefined ? 'novo' : body.status;
    if (!LEAD_STATUSES.includes(status)) {
      throw new AppError(400, 'VALIDATION_ERROR', `status deve ser um de: ${LEAD_STATUSES.join(', ')}`);
    }
    lead.status = status;
  }

  if (has('capturedAt') || !partial) {
    const capturedAt = has('capturedAt') ? toDate(body.capturedAt) : now;
    if (!capturedAt) {
      throw new AppError(400, 'VALIDATION_ERROR', 'data de captacao invalida');
    }
    lead.capturedAt = capturedAt;
  }

  return lead;
}

function serializeLead(lead) {
  return {
    id: lead._id,
    name: lead.name,
    email: lead.email || '',
    phone: lead.phone || '',
    source: lead.source,
    medium: lead.medium || '',
    campaign: lead.campaign || '',
    status: lead.status || 'novo',
    notes: lead.notes || '',
    capturedAt: lead.capturedAt || lead.createdAt,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

/* ---- Acessos (quem pode entrar no painel) ---- */

function serializeAdmin(user, actorId, adminEmails = env.adminEmails) {
  const access = adminAccessOf(user, adminEmails);
  const isSelf = user._id === actorId;
  return {
    id: user._id,
    name: user.name || user.email,
    email: user.email,
    avatarUrl: user.avatarUrl,
    provider: user.provider || 'email',
    lastLoginAt: lastLoginOf(user),
    grantedBy: access.viaServer ? 'server' : 'panel',
    isSelf,
    // Acesso definido em ADMIN_EMAILS nao sai pelo painel; e ninguem remove o proprio acesso.
    revocable: access.viaRole && !access.viaServer && !isSelf,
  };
}

function buildAdmins({ users, actorId, adminEmails = env.adminEmails }) {
  return users
    .filter((user) => adminAccessOf(user, adminEmails).isAdmin)
    .map((user) => serializeAdmin(user, actorId, adminEmails))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

/* Lanca AppError se o acesso do usuario nao puder ser revogado pelo painel. */
function assertCanRevoke(user, actorId, adminEmails = env.adminEmails) {
  const access = adminAccessOf(user, adminEmails);

  if (user._id === actorId) {
    throw new AppError(409, 'CANNOT_REVOKE_SELF', 'Voce nao pode remover o seu proprio acesso');
  }
  if (access.viaServer) {
    throw new AppError(
      409,
      'ACCESS_MANAGED_BY_SERVER',
      'Este acesso e definido em ADMIN_EMAILS no servidor e nao pode ser removido pelo painel',
    );
  }
  if (!access.viaRole) {
    throw new AppError(404, 'NOT_AN_ADMIN', 'Este usuario nao tem acesso ao painel');
  }
}

/* Lanca AppError se o usuario nao puder receber acesso de admin. */
function assertCanGrant(user) {
  if (!user) {
    throw new AppError(
      404,
      'USER_NOT_FOUND',
      'Nenhuma conta com esse e-mail. A pessoa precisa criar a conta primeiro',
    );
  }
  // Sem e-mail verificado, qualquer um poderia ter cadastrado o e-mail de outra pessoa antes dela.
  if (!user.emailVerified) {
    throw new AppError(
      409,
      'EMAIL_NOT_VERIFIED',
      'O e-mail dessa conta ainda nao foi verificado. Peca para a pessoa confirmar o e-mail ou entrar com Google/GitHub',
    );
  }
}

/* ------------------------------------------------------------------ */
/* Rotas (montadas em /api/admin, atras de requireAuth + requireAdmin) */
/* ------------------------------------------------------------------ */

async function readCollection(database, name) {
  const snapshot = await database.collection(name).get();
  return snapshot.docs.map(fromFirestoreDoc).filter(Boolean);
}

adminRouter.get('/dashboard', async (_request, response, next) => {
  try {
    const database = await getDatabase();
    const [users, courses, chapters, progress, questions, leads] = await Promise.all([
      UserRepository.listAll(),
      readCollection(database, 'courses'),
      readCollection(database, 'chapters'),
      readCollection(database, 'chapterProgress'),
      readCollection(database, 'courseQuestions'),
      readCollection(database, 'leads'),
    ]);

    response.json(
      successResponse(
        buildAdminDashboard({ users, courses, chapters, progress, questions, leads }),
        'OK',
      ),
    );
  } catch (error) {
    next(error);
  }
});

/*
 * Visao geral do GA4 (sessoes, origens, paginas). Opcional: sem
 * GA4_PROPERTY_ID configurado no servidor, devolve { configured: false }
 * em vez de erro, para o painel esconder a secao de analytics.
 */
adminRouter.get('/analytics', async (_request, response, next) => {
  try {
    response.json(successResponse(await getAnalyticsOverview(), 'OK'));
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/courses', async (_request, response, next) => {
  try {
    const database = await getDatabase();
    const [courses, chapters, progress] = await Promise.all([
      readCollection(database, 'courses'),
      readCollection(database, 'chapters'),
      readCollection(database, 'chapterProgress'),
    ]);

    response.json(successResponse(buildAdminCourses({ courses, chapters, progress }), 'OK'));
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/students', async (_request, response, next) => {
  try {
    const database = await getDatabase();
    const [users, progress] = await Promise.all([
      UserRepository.listAll(),
      readCollection(database, 'chapterProgress'),
    ]);

    response.json(successResponse(buildStudents({ users, progress }), 'OK'));
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/access', async (request, response, next) => {
  try {
    const users = await UserRepository.listAll();
    response.json(
      successResponse(buildAdmins({ users, actorId: request.auth.userId }), 'OK'),
    );
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/access', async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body?.email);
    if (!EMAIL_PATTERN.test(email)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Informe um e-mail valido');
    }

    const user = await UserRepository.findByEmail(email);
    assertCanGrant(user);

    let target = user;
    if (!adminAccessOf(user).isAdmin) {
      const now = new Date();
      target = await UserRepository.updateById(user._id, {
        role: 'ADMIN',
        adminGrantedAt: now,
        adminGrantedById: request.auth.userId,
        updatedAt: now,
      });
    }

    response
      .status(201)
      .json(successResponse(serializeAdmin(target, request.auth.userId), 'Acesso concedido'));
  } catch (error) {
    next(error);
  }
});

adminRouter.delete('/access/:userId', async (request, response, next) => {
  try {
    const user = await UserRepository.findById(request.params.userId);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Usuario nao encontrado');
    }
    assertCanRevoke(user, request.auth.userId);

    await UserRepository.updateById(user._id, { role: 'STUDENT', updatedAt: new Date() });

    response.json(successResponse({ id: user._id }, 'Acesso removido'));
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/leads', async (_request, response, next) => {
  try {
    const database = await getDatabase();
    const leads = await readCollection(database, 'leads');
    const sorted = leads.sort(
      (a, b) =>
        (toDate(b.capturedAt || b.createdAt)?.getTime() || 0)
        - (toDate(a.capturedAt || a.createdAt)?.getTime() || 0),
    );

    response.json(successResponse(sorted.map(serializeLead), 'OK'));
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/leads', async (request, response, next) => {
  try {
    const database = await getDatabase();
    const now = new Date();
    const lead = { ...normalizeLeadInput(request.body, { now }), createdAt: now, updatedAt: now };
    const reference = await database.collection('leads').add(lead);

    response.status(201).json(successResponse(serializeLead({ ...lead, _id: reference.id }), 'Lead salvo'));
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/leads/:leadId', async (request, response, next) => {
  try {
    const database = await getDatabase();
    const reference = database.collection('leads').doc(request.params.leadId);
    const current = fromFirestoreDoc(await reference.get());
    if (!current) {
      throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead nao encontrado');
    }

    const update = { ...normalizeLeadInput(request.body, { partial: true }), updatedAt: new Date() };
    await reference.set(update, { merge: true });

    response.json(successResponse(serializeLead({ ...current, ...update }), 'Lead atualizado'));
  } catch (error) {
    next(error);
  }
});

adminRouter.delete('/leads/:leadId', async (request, response, next) => {
  try {
    const database = await getDatabase();
    const reference = database.collection('leads').doc(request.params.leadId);
    if (!(await reference.get()).exists) {
      throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead nao encontrado');
    }

    await reference.delete();
    response.json(successResponse({ id: request.params.leadId }, 'Lead removido'));
  } catch (error) {
    next(error);
  }
});

module.exports = {
  LEAD_STATUSES,
  adminAccessOf,
  adminRouter,
  assertCanGrant,
  assertCanRevoke,
  buildAdminCourses,
  buildAdminDashboard,
  buildAdmins,
  buildStudents,
  normalizeLeadInput,
  serializeLead,
};
