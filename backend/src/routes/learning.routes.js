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

async function getChaptersByCourse(database, courseIds) {
  const snapshots = await Promise.all(
    courseIds.map((courseId) =>
      database.collection('chapters').where('courseId', '==', courseId).get(),
    ),
  );

  return snapshots.flatMap((snapshot) => snapshot.docs.map(fromFirestoreDoc).filter(Boolean));
}

function timestampOf(value) {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function chapterReference(chapter, completedAt) {
  if (!chapter) return null;
  return {
    id: chapter._id,
    title: chapter.title,
    slug: chapter.slug,
    order: chapter.order,
    ...(completedAt ? { completedAt } : {}),
  };
}

function buildLearningOverview({ courses, chapters, progress }) {
  const courseById = new Map(courses.map((course) => [course._id, course]));
  const chapterById = new Map(chapters.map((chapter) => [chapter._id, chapter]));
  const chaptersByCourse = new Map();

  for (const chapter of chapters) {
    const entries = chaptersByCourse.get(chapter.courseId) || [];
    entries.push(chapter);
    chaptersByCourse.set(chapter.courseId, entries);
  }

  for (const entries of chaptersByCourse.values()) {
    entries.sort((a, b) => a.order - b.order);
  }

  const orderedProgress = [...progress].sort(
    (a, b) => timestampOf(b.updatedAt) - timestampOf(a.updatedAt),
  );
  const progressByCourse = new Map();

  for (const item of orderedProgress) {
    const entries = progressByCourse.get(item.courseId) || [];
    entries.push(item);
    progressByCourse.set(item.courseId, entries);
  }

  const startedCourses = [...progressByCourse.entries()].flatMap(([courseId, entries]) => {
    const course = courseById.get(courseId);
    if (!course) return [];

    const courseChapters = chaptersByCourse.get(courseId) || [];
    const progressByChapter = new Map(entries.map((item) => [item.chapterId, item]));
    const completedChapterIds = new Set(
      entries
        .filter((item) => item.status === 'completed' && chapterById.has(item.chapterId))
        .map((item) => item.chapterId),
    );
    const last = entries[0];
    const lastChapter = chapterById.get(last.chapterId);
    let resumeChapter = null;

    if (last.status === 'in-progress') {
      resumeChapter = lastChapter;
    } else if (lastChapter) {
      resumeChapter = courseChapters.find(
        (chapter) => chapter.order > lastChapter.order && !completedChapterIds.has(chapter._id),
      );
    }

    resumeChapter ||= courseChapters.find((chapter) => {
      const item = progressByChapter.get(chapter._id);
      return !item || item.status !== 'completed';
    });

    const totalChapters = courseChapters.length;
    const completedChapters = completedChapterIds.size;

    return [
      {
        course: {
          id: courseId,
          title: course.title,
          slug: course.slug,
          shortDescription: course.shortDescription,
          bannerUrl: course.bannerUrl,
          thumbnailUrl: course.thumbnailUrl,
          category: course.category,
          level: course.level,
          durationMinutes: course.durationMinutes,
          totalChapters,
        },
        completedChapters,
        progressPercentage:
          totalChapters > 0
            ? Math.min(100, Math.round((completedChapters / totalChapters) * 100))
            : 0,
        lastActivityAt: last.updatedAt,
        lastChapter: chapterReference(lastChapter, last.completedAt),
        resumeChapter: chapterReference(resumeChapter),
      },
    ];
  });

  const recentCompletedChapters = orderedProgress
    .filter((item) => item.status === 'completed' && item.completedAt)
    .sort((a, b) => timestampOf(b.completedAt) - timestampOf(a.completedAt))
    .flatMap((item) => {
      const course = courseById.get(item.courseId);
      const chapter = chapterById.get(item.chapterId);
      if (!course || !chapter) return [];
      return [
        {
          course: { id: course._id, title: course.title, slug: course.slug },
          chapter: chapterReference(chapter),
          completedAt: item.completedAt,
        },
      ];
    })
    .slice(0, 5);

  return { startedCourses, recentCompletedChapters };
}

learningRouter.get('/me', async (request, response, next) => {
  try {
    const database = await getDatabase();
    const snapshot = await database
      .collection('chapterProgress')
      .where('userId', '==', request.auth.userId)
      .get();
    const progress = snapshot.docs.map(fromFirestoreDoc).sort((a, b) => b.updatedAt - a.updatedAt);

    const courseIds = [...new Set(progress.map((item) => item.courseId))];
    const [courses, chapters] = await Promise.all([
      getDocumentsByIds(database, 'courses', courseIds),
      getChaptersByCourse(database, courseIds),
    ]);

    response.json(successResponse(buildLearningOverview({ courses, chapters, progress }), 'OK'));
  } catch (error) {
    next(error);
  }
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

    response.json(
      successResponse(
        chapters.map((chapter) => {
          const item = progressByChapter.get(chapter._id);
          return {
            chapterId: chapter._id,
            status: item?.status || 'not-started',
            completedAt: item?.completedAt,
          };
        }),
        'OK',
      ),
    );
  } catch (error) {
    next(error);
  }
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

    response.json(
      successResponse(
        {
          chapterId,
          courseId: chapter.courseId,
          status,
          updatedAt: now,
          ...(status === 'completed' ? { completedAt: now } : {}),
        },
        'OK',
      ),
    );
  } catch (error) {
    next(error);
  }
});

module.exports = { buildLearningOverview, learningRouter };
