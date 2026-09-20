const express = require('express');
const { ObjectId } = require('mongodb');

const { getDatabase } = require('../config/database');
const { AppError } = require('../middleware/error-handler');
const { successResponse } = require('../utils/api-response');

const learningRouter = express.Router();

function objectId(value, name) {
  if (!ObjectId.isValid(value)) throw new AppError(400, 'VALIDATION_ERROR', `${name} invalido`);
  return new ObjectId(value);
}

learningRouter.get('/me', async (request, response, next) => {
  try {
    const database = await getDatabase();
    const progress = await database.collection('chapterProgress').find({ userId: request.auth.userId }).sort({ updatedAt: -1 }).toArray();
    const courseIds = [...new Set(progress.map((item) => item.courseId.toString()))].map((id) => new ObjectId(id));
    const chapterIds = [...new Set(progress.map((item) => item.chapterId.toString()))].map((id) => new ObjectId(id));
    const [courses, chapters] = await Promise.all([
      courseIds.length ? database.collection('courses').find({ _id: { $in: courseIds } }).toArray() : [],
      chapterIds.length ? database.collection('chapters').find({ _id: { $in: chapterIds } }).toArray() : [],
    ]);
    const courseById = new Map(courses.map((course) => [course._id.toString(), course]));
    const chapterById = new Map(chapters.map((chapter) => [chapter._id.toString(), chapter]));
    const byCourse = new Map();
    for (const item of progress) {
      const key = item.courseId.toString(); const entries = byCourse.get(key) || [];
      entries.push(item); byCourse.set(key, entries);
    }
    const startedCourses = [...byCourse.entries()].flatMap(([courseId, entries]) => {
      const course = courseById.get(courseId); if (!course) return [];
      const last = entries[0]; const chapter = chapterById.get(last.chapterId.toString());
      return [{ course: { id: courseId, title: course.title, slug: course.slug, thumbnailUrl: course.thumbnailUrl },
        completedChapters: entries.filter((item) => item.status === 'completed').length,
        lastChapter: chapter ? { id: chapter._id.toString(), title: chapter.title, slug: chapter.slug, completedAt: last.completedAt } : null,
      }];
    });
    response.json(successResponse({ startedCourses }, 'OK'));
  } catch (error) { next(error); }
});

learningRouter.get('/courses/:courseId/progress', async (request, response, next) => {
  try {
    const database = await getDatabase(); const courseId = objectId(request.params.courseId, 'courseId');
    const chapters = await database.collection('chapters').find({ courseId }).toArray();
    const progress = await database.collection('chapterProgress').find({ userId: request.auth.userId, courseId }).toArray();
    const progressByChapter = new Map(progress.map((item) => [item.chapterId.toString(), item]));
    response.json(successResponse(chapters.map((chapter) => {
      const item = progressByChapter.get(chapter._id.toString());
      return { chapterId: chapter._id.toString(), status: item?.status || 'not-started', completedAt: item?.completedAt };
    }), 'OK'));
  } catch (error) { next(error); }
});

learningRouter.patch('/chapters/:chapterId', async (request, response, next) => {
  try {
    const status = request.body?.status;
    if (!['in-progress', 'completed'].includes(status)) throw new AppError(400, 'VALIDATION_ERROR', 'status invalido');
    const database = await getDatabase(); const chapterId = objectId(request.params.chapterId, 'chapterId');
    const chapter = await database.collection('chapters').findOne({ _id: chapterId });
    if (!chapter) throw new AppError(404, 'CHAPTER_NOT_FOUND', 'Capitulo nao encontrado');
    const now = new Date();
    const update = { status, updatedAt: now, ...(status === 'completed' ? { completedAt: now } : {}) };
    await database.collection('chapterProgress').updateOne(
      { userId: request.auth.userId, chapterId },
      { $set: { ...update, userId: request.auth.userId, chapterId, courseId: chapter.courseId }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
    response.json(successResponse({ chapterId: chapterId.toString(), courseId: chapter.courseId.toString(), ...update }, 'OK'));
  } catch (error) { next(error); }
});

module.exports = { learningRouter };
