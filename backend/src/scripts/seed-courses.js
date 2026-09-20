const { connectDatabase, closeDatabase } = require('../config/database');
const { env } = require('../config/env');
const courseCatalog = require('../seed/courses.json');

const SEED_SOURCE = 'local-course-catalog';
const LOCAL_MONGO_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', 'mongo']);

function isLocalMongoUri(uri) {
  try {
    const parsed = new URL(uri);
    const hosts = parsed.host
      .split(',')
      .map((host) => host.replace(/^\[|\]$/g, '').split(':')[0].toLowerCase());

    return ['mongodb:', 'mongodb+srv:'].includes(parsed.protocol) && hosts.every((host) => LOCAL_MONGO_HOSTS.has(host));
  } catch {
    return false;
  }
}

function assertLocalSeedEnvironment(currentEnv = env) {
  if (!['development', 'test'].includes(currentEnv.appEnv) || !isLocalMongoUri(currentEnv.mongodbUri)) {
    throw new Error(
      'O seed de cursos só pode rodar em APP_ENV=development/test com MONGODB_URI local (localhost, 127.0.0.1 ou mongo).',
    );
  }
}

function validateCatalog(catalog) {
  if (!Array.isArray(catalog.courses) || catalog.courses.length === 0) {
    throw new Error('O JSON do seed precisa conter ao menos um curso.');
  }

  for (const course of catalog.courses) {
    if (!course.slug || !course.title || !Array.isArray(course.chapters)) {
      throw new Error('Cada curso precisa de slug, title e chapters no JSON do seed.');
    }

    for (const chapter of course.chapters) {
      if (!chapter.slug || !chapter.title || !Array.isArray(chapter.lessons)) {
        throw new Error(`O capítulo do curso ${course.slug} está incompleto no JSON do seed.`);
      }
    }
  }
}

async function seedCourses(database, catalog = courseCatalog, now = new Date()) {
  validateCatalog(catalog);

  const courses = database.collection('courses');
  const chapters = database.collection('chapters');
  const lessons = database.collection('lessons');

  // O catálogo local é uma projeção exata do JSON: cada execução o substitui por completo.
  // Usuários e suas coleções de autenticação não são afetados.
  await lessons.deleteMany({});
  await chapters.deleteMany({});
  await courses.deleteMany({});

  let chapterCount = 0;
  let lessonCount = 0;

  for (const sourceCourse of catalog.courses) {
    const { chapters: sourceChapters, ...courseFields } = sourceCourse;
    const course = {
      ...courseFields,
      seedSource: SEED_SOURCE,
      createdAt: now,
      updatedAt: now,
    };
    const courseResult = await courses.insertOne(course);

    for (const sourceChapter of sourceChapters) {
      const { lessons: sourceLessons, ...chapterFields } = sourceChapter;
      const chapter = {
        ...chapterFields,
        courseId: courseResult.insertedId,
        seedSource: SEED_SOURCE,
        createdAt: now,
        updatedAt: now,
      };
      const chapterResult = await chapters.insertOne(chapter);
      chapterCount += 1;

      if (sourceLessons.length > 0) {
        await lessons.insertMany(
          sourceLessons.map((lesson) => ({
            ...lesson,
            chapterId: chapterResult.insertedId,
            courseId: courseResult.insertedId,
            seedSource: SEED_SOURCE,
            createdAt: now,
            updatedAt: now,
          })),
        );
        lessonCount += sourceLessons.length;
      }
    }
  }

  await Promise.all([
    courses.createIndex({ slug: 1 }, { unique: true }),
    chapters.createIndex({ courseId: 1, order: 1 }),
    lessons.createIndex({ chapterId: 1, order: 1 }),
  ]);

  return { courses: catalog.courses.length, chapters: chapterCount, lessons: lessonCount };
}

async function main() {
  assertLocalSeedEnvironment();
  const database = await connectDatabase();
  const result = await seedCourses(database);
  console.log(`Seed local concluído: ${result.courses} cursos, ${result.chapters} capítulos e ${result.lessons} aulas.`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Falha ao executar o seed local de cursos:', error.message);
      process.exitCode = 1;
    })
    .finally(closeDatabase);
}

module.exports = {
  SEED_SOURCE,
  assertLocalSeedEnvironment,
  isLocalMongoUri,
  seedCourses,
  validateCatalog,
};
