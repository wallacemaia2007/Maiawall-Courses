const express = require('express');

const { fromFirestoreDoc, getDatabase } = require('../config/database');
const { AppError } = require('../middleware/error-handler');
const { successResponse } = require('../utils/api-response');

const learningRouter = express.Router();

function requireId(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(400, 'VALIDATION_ERROR', `${name} invalido`);
  }

  return value;
}

async function getDocumentsByIds(database, collection, ids) {
  const uniqueIds = [...new Set(ids)];
  const snapshots = await Promise.all(
    uniqueIds.map((id) => database.collection(collection).doc(id).get()),
  );

  return snapshots.map(fromFirestoreDoc).filter(Boolean);
}

learningRouter.get('/me', async (request, response, next) => {
  try {
    const database = await getDatabase();
    const snapshot = await database
      .collection('chapterProgress')
      .where('userId', '==', request.auth.userId)
      .get();
    const progress = snapshot.docs
      .map(fromFirestoreDoc)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    const courseIds = [...new Set(progress.map((item) => item.courseId))];
    const chapterIds = [...new Set(progress.map((item) => item.chapterId))];
    const [courses, chapters] = await Promise.all([
      getDocumentsByIds(database, 'courses', courseIds),
      getDocumentsByIds(database, 'chapters', chapterIds),
    ]);

    const courseById = new Map(courses.map((course) => [course._id, course]));
    const chapterById = new Map(chapters.map((chapter) => [chapter._id, chapter]));
    const byCourse = new Map();

    for (const item of progress) {
      const entries = byCourse.get(item.courseId) || [];
      entries.push(item);
      byCourse.set(item.courseId, entries);
    }

    const startedCourses = [...byCourse.entries()].flatMap(([courseId, entries]) => {
      const course = courseById.get(courseId);
      if (!course) return [];
      const last = entries[0];
      const chapter = chapterById.get(last.chapterId);
      return [{
        course: {
          id: courseId,
          title: course.title,
          slug: course.slug,
          thumbnailUrl: course.thumbnailUrl,
        },
        completedChapters: entries.filter((item) => item.status === 'completed').length,
        lastChapter: chapter
          ? {
              id: chapter._id,
              title: chapter.title,
              slug: chapter.slug,
              completedAt: last.completedAt,
            }
          : null,
      }];
    });

    response.json(successResponse({ startedCourses }, 'OK'));
  } catch (error) { next(error); }
});

learningRouter.get('/courses/:courseId/progress', async (request, response, next) => {
  try {
    const database = await getDatabase();
    const courseId = requireId(request.params.courseId, 'courseId');
    const chaptersSnapshot = await database
      .collection('chapters')
      .where('courseId', '==', courseId)
      .get();
    const chapters = chaptersSnapshot.docs.map(fromFirestoreDoc).sort((a, b) => a.order - b.order);
    const progressSnapshot = await database
      .collection('chapterProgress')
      .where('userId', '==', request.auth.userId)
      .get();
    const progress = progressSnapshot.docs
      .map(fromFirestoreDoc)
      .filter((item) => item.courseId === courseId);
    const progressByChapter = new Map(progress.map((item) => [item.chapterId, item]));

    response.json(successResponse(chapters.map((chapter) => {
      const item = progressByChapter.get(chapter._id);
      return {
        chapterId: chapter._id,
        status: item?.status || 'not-started',
        completedAt: item?.completedAt,
      };
    }), 'OK'));
  } catch (error) { next(error); }
});

learningRouter.patch('/chapters/:chapterId', async (request, response, next) => {
  try {
    const status = request.body?.status;
    if (!['in-progress', 'completed'].includes(status)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'status invalido');
    }

    const database = await getDatabase();
    const chapterId = requireId(request.params.chapterId, 'chapterId');
    const chapterSnapshot = await database.collection('chapters').doc(chapterId).get();
    const chapter = fromFirestoreDoc(chapterSnapshot);

    if (!chapter) {
      throw new AppError(404, 'CHAPTER_NOT_FOUND', 'Capitulo nao encontrado');
    }

    const now = new Date();
    const progressRef = database
      .collection('chapterProgress')
      .doc(`${request.auth.userId}:${chapterId}`);
    const existing = await progressRef.get();
    const data = {
      userId: request.auth.userId,
      chapterId,
      courseId: chapter.courseId,
      status,
      updatedAt: now,
      ...(status === 'completed' ? { completedAt: now } : {}),
    };

    if (!existing.exists) {
      data.createdAt = now;
    }

    await progressRef.set(data, { merge: true });

    response.json(successResponse({
      chapterId,
      courseId: chapter.courseId,
      status,
      updatedAt: now,
      ...(status === 'completed' ? { completedAt: now } : {}),
    }, 'OK'));
  } catch (error) { next(error); }
});

module.exports = { learningRouter };