const assert = require('node:assert/strict');
const { test } = require('node:test');

const { buildLearningOverview } = require('../src/routes/learning.routes');

const courses = [
  {
    _id: 'course-a',
    title: 'Curso A',
    slug: 'curso-a',
    shortDescription: 'Descrição A',
    bannerUrl: '/a.png',
    category: 'backend',
    level: 'iniciante',
    durationMinutes: 40,
  },
  { _id: 'course-b', title: 'Curso B', slug: 'curso-b', bannerUrl: '/b.png' },
];

const chapters = [
  { _id: 'a-1', courseId: 'course-a', title: 'A 1', slug: 'a-1', order: 1 },
  { _id: 'a-2', courseId: 'course-a', title: 'A 2', slug: 'a-2', order: 2 },
  { _id: 'a-3', courseId: 'course-a', title: 'A 3', slug: 'a-3', order: 3 },
  { _id: 'b-1', courseId: 'course-b', title: 'B 1', slug: 'b-1', order: 1 },
];

test('returns an empty overview when the learner has no progress', () => {
  assert.deepEqual(buildLearningOverview({ courses, chapters, progress: [] }), {
    startedCourses: [],
    recentCompletedChapters: [],
  });
});

test('orders courses by activity and resumes the latest in-progress chapter', () => {
  const result = buildLearningOverview({
    courses,
    chapters,
    progress: [
      {
        courseId: 'course-a',
        chapterId: 'a-1',
        status: 'completed',
        updatedAt: '2026-01-01T10:00:00Z',
        completedAt: '2026-01-01T10:00:00Z',
      },
      {
        courseId: 'course-a',
        chapterId: 'a-2',
        status: 'in-progress',
        updatedAt: '2026-01-03T10:00:00Z',
      },
      {
        courseId: 'course-b',
        chapterId: 'b-1',
        status: 'completed',
        updatedAt: '2026-01-02T10:00:00Z',
        completedAt: '2026-01-02T10:00:00Z',
      },
    ],
  });

  assert.deepEqual(
    result.startedCourses.map((item) => item.course.id),
    ['course-a', 'course-b'],
  );
  assert.equal(result.startedCourses[0].resumeChapter.id, 'a-2');
  assert.equal(result.startedCourses[0].progressPercentage, 33);
  assert.equal(result.startedCourses[0].course.bannerUrl, '/a.png');
  assert.equal(result.startedCourses[0].course.durationMinutes, 40);
});

test('continues at the next unread chapter after a completion', () => {
  const result = buildLearningOverview({
    courses: [courses[0]],
    chapters: chapters.filter((chapter) => chapter.courseId === 'course-a'),
    progress: [
      {
        courseId: 'course-a',
        chapterId: 'a-1',
        status: 'completed',
        updatedAt: '2026-01-01T10:00:00Z',
        completedAt: '2026-01-01T10:00:00Z',
      },
      {
        courseId: 'course-a',
        chapterId: 'a-2',
        status: 'completed',
        updatedAt: '2026-01-02T10:00:00Z',
        completedAt: '2026-01-02T10:00:00Z',
      },
    ],
  });

  assert.equal(result.startedCourses[0].resumeChapter.id, 'a-3');
  assert.equal(result.startedCourses[0].lastChapter.id, 'a-2');
  assert.equal(result.startedCourses[0].progressPercentage, 67);
});

test('marks a course as complete by returning no resume chapter', () => {
  const result = buildLearningOverview({
    courses: [courses[1]],
    chapters: [chapters[3]],
    progress: [
      {
        courseId: 'course-b',
        chapterId: 'b-1',
        status: 'completed',
        updatedAt: '2026-01-02T10:00:00Z',
        completedAt: '2026-01-02T10:00:00Z',
      },
    ],
  });

  assert.equal(result.startedCourses[0].resumeChapter, null);
  assert.equal(result.startedCourses[0].progressPercentage, 100);
});

test('returns at most five completed chapters ordered by completion date', () => {
  const manyChapters = Array.from({ length: 6 }, (_, index) => ({
    _id: `a-${index + 1}`,
    courseId: 'course-a',
    title: `A ${index + 1}`,
    slug: `a-${index + 1}`,
    order: index + 1,
  }));
  const progress = manyChapters.map((chapter, index) => ({
    courseId: 'course-a',
    chapterId: chapter._id,
    status: 'completed',
    updatedAt: `2026-01-0${index + 1}T10:00:00Z`,
    completedAt: `2026-01-0${index + 1}T10:00:00Z`,
  }));

  const result = buildLearningOverview({ courses: [courses[0]], chapters: manyChapters, progress });

  assert.equal(result.recentCompletedChapters.length, 5);
  assert.equal(result.recentCompletedChapters[0].chapter.id, 'a-6');
  assert.equal(result.recentCompletedChapters[4].chapter.id, 'a-2');
});
