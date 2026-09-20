const express = require('express');
const { ObjectId } = require('mongodb');

const { getDatabase } = require('../config/database');
const { AppError } = require('../middleware/error-handler');
const { successResponse } = require('../utils/api-response');

const catalogRouter = express.Router();

function toId(value) {
  return value ? value.toString() : '';
}

function serializeLesson(lesson) {
  return {
    id: toId(lesson._id), chapterId: toId(lesson.chapterId), title: lesson.title,
    type: lesson.type, content: lesson.content, isPublic: Boolean(lesson.isPublic),
    attachments: lesson.attachments || [], durationMinutes: lesson.durationMinutes, order: lesson.order,
  };
}

function serializeChapter(chapter, lessons = []) {
  return {
    id: toId(chapter._id), courseId: toId(chapter.courseId), title: chapter.title,
    slug: chapter.slug, description: chapter.description, order: chapter.order,
    isPublic: Boolean(chapter.isPublic), requiresLogin: Boolean(chapter.requiresLogin),
    lessons: lessons.sort((a, b) => a.order - b.order).map(serializeLesson),
  };
}

function serializeCourse(course, chapters = []) {
  return {
    id: toId(course._id), title: course.title, slug: course.slug,
    shortDescription: course.shortDescription, description: course.description,
    thumbnailUrl: course.thumbnailUrl, category: course.category, level: course.level,
    durationMinutes: course.durationMinutes, instructor: course.instructor,
    objectives: course.objectives || [], requirements: course.requirements || [],
    syllabus: course.syllabus || [], outcomes: course.outcomes || [],
    published: Boolean(course.published),
    chapters: chapters.sort((a, b) => a.order - b.order),
  };
}

catalogRouter.get('/', async (request, response, next) => {
  try {
    const database = await getDatabase();
    const page = Math.max(0, Number.parseInt(request.query.page, 10) || 0);
    const size = Math.min(100, Math.max(1, Number.parseInt(request.query.size, 10) || 12));
    const filter = { published: true };
    const [courses, totalElements] = await Promise.all([
      database.collection('courses').find(filter).sort({ title: 1 }).skip(page * size).limit(size).toArray(),
      database.collection('courses').countDocuments(filter),
    ]);
    const ids = courses.map((course) => course._id);
    const counts = ids.length
      ? await database.collection('chapters').aggregate([
        { $match: { courseId: { $in: ids } } }, { $group: { _id: '$courseId', count: { $sum: 1 } } },
      ]).toArray()
      : [];
    const chapterCounts = new Map(counts.map((item) => [item._id.toString(), item.count]));
    const content = courses.map((course) => ({
      id: toId(course._id), title: course.title, slug: course.slug,
      shortDescription: course.shortDescription, thumbnailUrl: course.thumbnailUrl,
      category: course.category, level: course.level, durationMinutes: course.durationMinutes,
      instructorName: course.instructor?.name || 'Maiawall', chapterCount: chapterCounts.get(toId(course._id)) || 0,
    }));
    response.json(successResponse({ content, page, size, totalElements, totalPages: Math.ceil(totalElements / size) }, 'OK'));
  } catch (error) { next(error); }
});

catalogRouter.get('/slug/:slug', async (request, response, next) => {
  try {
    const database = await getDatabase();
    const course = await database.collection('courses').findOne({ slug: request.params.slug, published: true });
    if (!course) throw new AppError(404, 'COURSE_NOT_FOUND', 'Curso nao encontrado');
    const chapters = await database.collection('chapters').find({ courseId: course._id }).sort({ order: 1 }).toArray();
    const chapterIds = chapters.map((chapter) => chapter._id);
    const lessons = chapterIds.length ? await database.collection('lessons').find({ chapterId: { $in: chapterIds } }).sort({ order: 1 }).toArray() : [];
    const lessonsByChapter = new Map();
    for (const lesson of lessons) {
      const key = toId(lesson.chapterId); const entries = lessonsByChapter.get(key) || [];
      entries.push(lesson); lessonsByChapter.set(key, entries);
    }
    response.json(successResponse(serializeCourse(course, chapters.map((chapter) => serializeChapter(chapter, lessonsByChapter.get(toId(chapter._id)) || []))), 'OK'));
  } catch (error) { next(error); }
});

catalogRouter.get('/:courseSlug/capitulos/:chapterSlug', async (request, response, next) => {
  try {
    const database = await getDatabase();
    const course = await database.collection('courses').findOne({ slug: request.params.courseSlug, published: true });
    if (!course) throw new AppError(404, 'COURSE_NOT_FOUND', 'Curso nao encontrado');
    const chapter = await database.collection('chapters').findOne({ courseId: course._id, slug: request.params.chapterSlug });
    if (!chapter) throw new AppError(404, 'CHAPTER_NOT_FOUND', 'Capitulo nao encontrado');
    const lessons = await database.collection('lessons').find({ chapterId: chapter._id }).sort({ order: 1 }).toArray();
    response.json(successResponse(serializeChapter(chapter, lessons), 'OK'));
  } catch (error) { next(error); }
});

module.exports = { catalogRouter };
