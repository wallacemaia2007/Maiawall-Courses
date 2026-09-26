const express = require('express');

const { fromFirestoreDoc, getDatabase } = require('../config/database');
const { AppError } = require('../middleware/error-handler');
const { UserRepository } = require('../repositories/user.repository');
const { successResponse } = require('../utils/api-response');

const courseQuestionRouter = express.Router();
const publicQuestionRouter = express.Router();
const adminQuestionRouter = express.Router();

function requiredText(value, field, minLength, maxLength) {
  const text = String(value || '').trim();
  if (text.length < minLength || text.length > maxLength) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      `${field} deve ter entre ${minLength} e ${maxLength} caracteres`,
    );
  }
  return text;
}

function timestampOf(value) {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function lastLoginOf(user) {
  return user.lastLoginAt || user.refreshTokenUpdatedAt || null;
}

/*
 * "Outras dúvidas": perguntas que não pertencem a um minicurso específico.
 * O id é reservado (não é o id de um curso real) e aparece como opção no
 * formulário de dúvida do site inteiro.
 */
const GENERAL_COURSE_ID = 'outras-duvidas';
const GENERAL_COURSE_TITLE = 'Outras dúvidas';

const EMPTY_AUTHOR = { id: null, name: '', email: '', avatarUrl: null, createdAt: null, lastLoginAt: null, questionsCount: 0 };

function buildAuthorProfile(question, usersById, questionCounts) {
  const user = question.userId ? usersById.get(question.userId) : null;

  if (!user) {
    return {
      ...EMPTY_AUTHOR,
      name: question.authorName || '',
      email: question.authorEmail || '',
    };
  }

  return {
    id: user._id,
    name: user.name || user.email,
    email: user.email,
    avatarUrl: user.avatarUrl || null,
    createdAt: user.createdAt,
    lastLoginAt: lastLoginOf(user),
    questionsCount: questionCounts.get(user._id) || 0,
  };
}

/*
 * Só perguntas respondidas e publicadas podem ser destacadas (estrela) e
 * aparecer na página pública de "dúvidas mais frequentes" do curso.
 */
function assertCanFeature(question) {
  if (!question.answer) {
    throw new AppError(409, 'QUESTION_NOT_ANSWERED', 'Responda a duvida antes de destaca-la');
  }
  if (!question.published) {
    throw new AppError(409, 'QUESTION_NOT_PUBLISHED', 'Publique a duvida antes de destaca-la');
  }
}

function serializeQuestion(question, includePrivate = false) {
  return {
    id: question._id,
    courseId: question.courseId,
    courseTitle: question.courseTitle,
    authorName: question.authorName,
    question: question.question,
    answer: question.answer || '',
    published: Boolean(question.published),
    featured: Boolean(question.featured),
    createdAt: question.createdAt,
    answeredAt: question.answeredAt,
    ...(includePrivate
      ? { authorEmail: question.authorEmail, author: question.author }
      : {}),
  };
}

/*
 * Versao publica e segura do autor: so nome e foto, nunca e-mail ou
 * outros dados privados. Usada na pagina publica de duvidas em destaque.
 */
function serializePublicAuthor(question) {
  const name = question.author?.name || question.authorName || '';
  const avatarUrl = question.author?.avatarUrl || null;
  if (!name && !avatarUrl) return null;
  return { name, avatarUrl };
}

async function findPublishedCourse(database, courseId) {
  const snapshot = await database.collection('courses').doc(courseId).get();
  const course = fromFirestoreDoc(snapshot);
  if (!course || !course.published) {
    throw new AppError(404, 'COURSE_NOT_FOUND', 'Curso nao encontrado');
  }
  return course;
}

async function attachAuthorProfiles(questions) {
  const userIds = [...new Set(questions.map((item) => item.userId).filter(Boolean))];
  const users = (await Promise.all(userIds.map((id) => UserRepository.findById(id))))
    .filter(Boolean);
  const usersById = new Map(users.map((user) => [user._id, user]));
  const questionCounts = new Map();
  for (const question of questions) {
    if (question.userId) {
      questionCounts.set(question.userId, (questionCounts.get(question.userId) || 0) + 1);
    }
  }

  for (const question of questions) {
    question.author = buildAuthorProfile(question, usersById, questionCounts);
  }

  return questions;
}

function buildFeaturedQuestionGroups(questions, courses) {
  const publishedCoursesById = new Map(
    courses.filter((course) => course && course.published).map((course) => [course._id, course]),
  );
  const groupsByCourse = new Map();

  for (const question of questions) {
    if (!question || !question.published || !question.featured || !question.answer) continue;

    const published = publishedCoursesById.get(question.courseId);
    /* Perguntas gerais não têm curso publicado: viram um grupo próprio. */
    const course = published
      ? {
          id: published._id,
          title: published.title || question.courseTitle || published.slug || published._id,
          slug: published.slug || published._id,
          category: published.category || null,
        }
      : question.courseId === GENERAL_COURSE_ID
        ? { id: GENERAL_COURSE_ID, title: GENERAL_COURSE_TITLE, slug: '', category: null }
        : null;
    if (!course) continue;

    const group = groupsByCourse.get(course.id) || { course, questions: [] };
    group.questions.push({
      ...serializeQuestion(question),
      author: serializePublicAuthor(question),
    });
    groupsByCourse.set(course.id, group);
  }

  const ordered = [...groupsByCourse.values()].map((group) => ({
    ...group,
    questions: group.questions.sort(
      (first, second) => timestampOf(second.answeredAt) - timestampOf(first.answeredAt),
    ),
  }));

  return ordered
    .sort((first, second) => first.course.title.localeCompare(second.course.title, 'pt-BR'))
    .sort((first, second) => {
      const firstIsGeneral = first.course.id === GENERAL_COURSE_ID ? 1 : 0;
      const secondIsGeneral = second.course.id === GENERAL_COURSE_ID ? 1 : 0;
      return firstIsGeneral - secondIsGeneral;
    });
}

courseQuestionRouter.get('/:courseId/questions', async (request, response, next) => {
  try {
    const database = await getDatabase();
    await findPublishedCourse(database, request.params.courseId);
    const snapshot = await database
      .collection('courseQuestions')
      .where('courseId', '==', request.params.courseId)
      .get();
    const questions = snapshot.docs
      .map(fromFirestoreDoc)
      .filter((item) => item.published && item.answer)
      .sort((a, b) => timestampOf(b.answeredAt) - timestampOf(a.answeredAt))
      .map((item) => serializeQuestion(item));

    response.json(successResponse(questions, 'OK'));
  } catch (error) {
    next(error);
  }
});

courseQuestionRouter.post('/:courseId/questions', async (request, response, next) => {
  try {
    if (!request.auth?.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Faca login para enviar sua duvida');
    }

    const database = await getDatabase();
    const requestedId = String(request.params.courseId || '');
    /* "Outras dúvidas" não é um curso: aceita o id reservado sem lookup. */
    const course = requestedId === GENERAL_COURSE_ID ? null : await findPublishedCourse(database, requestedId);
    const now = new Date();
    const question = {
      courseId: course ? course._id : GENERAL_COURSE_ID,
      courseTitle: course ? course.title : GENERAL_COURSE_TITLE,
      userId: request.auth.userId,
      authorName: requiredText(request.body?.authorName, 'nome', 2, 80),
      authorEmail: request.auth.user.email,
      question: requiredText(request.body?.question, 'duvida', 10, 1000),
      answer: '',
      published: false,
      featured: false,
      createdAt: now,
      updatedAt: now,
    };
    const reference = await database.collection('courseQuestions').add(question);

    response.status(201).json(
      successResponse(serializeQuestion({ ...question, _id: reference.id }), 'Duvida enviada'),
    );
  } catch (error) {
    next(error);
  }
});

publicQuestionRouter.get('/featured', async (_request, response, next) => {
  try {
    const database = await getDatabase();
    const [questionsSnapshot, coursesSnapshot] = await Promise.all([
      database.collection('courseQuestions').get(),
      database.collection('courses').get(),
    ]);
    const questions = questionsSnapshot.docs.map(fromFirestoreDoc);
    const courses = coursesSnapshot.docs.map(fromFirestoreDoc);

    const eligible = questions.filter(
      (question) => question && question.published && question.featured && question.answer,
    );
    await attachAuthorProfiles(eligible);

    const groups = buildFeaturedQuestionGroups(eligible, courses);

    response.json(successResponse(groups, 'OK'));
  } catch (error) {
    next(error);
  }
});

adminQuestionRouter.get('/questions', async (_request, response, next) => {
  try {
    const database = await getDatabase();
    const snapshot = await database.collection('courseQuestions').get();
    const questions = snapshot.docs
      .map(fromFirestoreDoc)
      .sort((a, b) => timestampOf(b.createdAt) - timestampOf(a.createdAt));

    await attachAuthorProfiles(questions);

    response.json(successResponse(questions.map((item) => serializeQuestion(item, true)), 'OK'));
  } catch (error) {
    next(error);
  }
});

adminQuestionRouter.patch('/questions/:questionId', async (request, response, next) => {
  try {
    const database = await getDatabase();
    const reference = database.collection('courseQuestions').doc(request.params.questionId);
    const snapshot = await reference.get();
    const current = fromFirestoreDoc(snapshot);
    if (!current) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', 'Duvida nao encontrada');
    }

    const answer = requiredText(request.body?.answer, 'resposta', 2, 2000);
    const now = new Date();
    const published = request.body?.published === true;
    const update = {
      answer,
      published,
      answeredAt: now,
      answeredById: request.auth.userId,
      updatedAt: now,
      // Sem publicacao, a duvida deixa de poder aparecer como destaque.
      ...(published ? {} : { featured: false }),
    };
    await reference.set(update, { merge: true });

    const updated = { ...current, ...update };
    if (current.userId) {
      await attachAuthorProfiles([updated]);
    }

    response.json(
      successResponse(serializeQuestion(updated, true), 'Resposta salva'),
    );
  } catch (error) {
    next(error);
  }
});

adminQuestionRouter.patch('/questions/:questionId/featured', async (request, response, next) => {
  try {
    const database = await getDatabase();
    const reference = database.collection('courseQuestions').doc(request.params.questionId);
    const snapshot = await reference.get();
    const current = fromFirestoreDoc(snapshot);
    if (!current) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', 'Duvida nao encontrada');
    }

    const featured = request.body?.featured === true;
    if (featured) {
      assertCanFeature(current);
    }

    const now = new Date();
    const update = { featured, updatedAt: now };
    await reference.set(update, { merge: true });

    const updated = { ...current, ...update };
    if (current.userId) {
      await attachAuthorProfiles([updated]);
    }

    response.json(
      successResponse(serializeQuestion(updated, true), featured ? 'Duvida destacada' : 'Destaque removido'),
    );
  } catch (error) {
    next(error);
  }
});

module.exports = {
  assertCanFeature,
  adminQuestionRouter,
  buildAuthorProfile,
  buildFeaturedQuestionGroups,
  courseQuestionRouter,
  GENERAL_COURSE_ID,
  GENERAL_COURSE_TITLE,
  publicQuestionRouter,
  requiredText,
  serializePublicAuthor,
  serializeQuestion,
};