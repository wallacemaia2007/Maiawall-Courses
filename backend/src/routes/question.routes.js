const express = require('express');

const { fromFirestoreDoc, getDatabase } = require('../config/database');
const { AppError } = require('../middleware/error-handler');
const { successResponse } = require('../utils/api-response');

const courseQuestionRouter = express.Router();
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

function serializeQuestion(question, includePrivate = false) {
  return {
    id: question._id,
    courseId: question.courseId,
    courseTitle: question.courseTitle,
    authorName: question.authorName,
    question: question.question,
    answer: question.answer || '',
    published: Boolean(question.published),
    createdAt: question.createdAt,
    answeredAt: question.answeredAt,
    ...(includePrivate ? { authorEmail: question.authorEmail } : {}),
  };
}

async function findPublishedCourse(database, courseId) {
  const snapshot = await database.collection('courses').doc(courseId).get();
  const course = fromFirestoreDoc(snapshot);
  if (!course || !course.published) {
    throw new AppError(404, 'COURSE_NOT_FOUND', 'Curso nao encontrado');
  }
  return course;
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
    const course = await findPublishedCourse(database, request.params.courseId);
    const now = new Date();
    const question = {
      courseId: course._id,
      courseTitle: course.title,
      userId: request.auth.userId,
      authorName: requiredText(request.body?.authorName, 'nome', 2, 80),
      authorEmail: request.auth.user.email,
      question: requiredText(request.body?.question, 'duvida', 10, 1000),
      answer: '',
      published: false,
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

adminQuestionRouter.get('/questions', async (_request, response, next) => {
  try {
    const database = await getDatabase();
    const snapshot = await database.collection('courseQuestions').get();
    const questions = snapshot.docs
      .map(fromFirestoreDoc)
      .sort((a, b) => timestampOf(b.createdAt) - timestampOf(a.createdAt))
      .map((item) => serializeQuestion(item, true));

    response.json(successResponse(questions, 'OK'));
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
    const update = {
      answer,
      published: request.body?.published === true,
      answeredAt: now,
      answeredById: request.auth.userId,
      updatedAt: now,
    };
    await reference.set(update, { merge: true });

    response.json(
      successResponse(serializeQuestion({ ...current, ...update }, true), 'Resposta salva'),
    );
  } catch (error) {
    next(error);
  }
});

module.exports = {
  adminQuestionRouter,
  courseQuestionRouter,
  requiredText,
  serializeQuestion,
};
