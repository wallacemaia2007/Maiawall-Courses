const { connectDatabase, closeDatabase } = require('../config/database');
const { env } = require('../config/env');
const courseCatalog = require('../seed/courses.json');

const SEED_SOURCE = 'local-course-catalog';

function assertSeedEnvironment(currentEnv = env) {
  if (!['development', 'test'].includes(currentEnv.appEnv)) {
    throw new Error(
      'O seed de cursos só pode rodar em APP_ENV=development/test (Firestore).',
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

async function clearSeededDocs(database) {
  for (const collection of ['lessons', 'chapters', 'courses']) {
    const snapshot = await database
      .collection(collection)
      .where('seedSource', '==', SEED_SOURCE)
      .get();
    await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
  }
}

async function seedCourses(database, catalog = courseCatalog, now = new Date()) {
  validateCatalog(catalog);

  // O catálogo local é uma projeção exata do JSON: cada execução o substitui por completo.
  // Usuários e suas coleções de autenticação não são afetados.
  await clearSeededDocs(database);

  let chapterCount = 0;
  let lessonCount = 0;

  for (const sourceCourse of catalog.courses) {
    const { chapters: sourceChapters, ...courseFields } = sourceCourse;
    const course = {
      ...courseFields,
      chapterCount: sourceChapters.length,
      seedSource: SEED_SOURCE,
      createdAt: now,
      updatedAt: now,
    };
    await database.collection('courses').doc(sourceCourse.slug).set(course);

    for (const sourceChapter of sourceChapters) {
      const { lessons: sourceLessons, ...chapterFields } = sourceChapter;
      const chapterDocId = `${sourceCourse.slug}:${sourceChapter.slug}`;
      const chapter = {
        ...chapterFields,
        courseId: sourceCourse.slug,
        seedSource: SEED_SOURCE,
        createdAt: now,
        updatedAt: now,
      };
      await database.collection('chapters').doc(chapterDocId).set(chapter);
      chapterCount += 1;

      await Promise.all(
        sourceLessons.map((lesson, index) => database
          .collection('lessons')
          .doc(`${chapterDocId}:${index}`)
          .set({
            ...lesson,
            chapterId: chapterDocId,
            courseId: sourceCourse.slug,
            seedSource: SEED_SOURCE,
            createdAt: now,
            updatedAt: now,
          })),
      );
      lessonCount += sourceLessons.length;
    }
  }

  return { courses: catalog.courses.length, chapters: chapterCount, lessons: lessonCount };
}

async function main() {
  assertSeedEnvironment();
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
  assertSeedEnvironment,
  clearSeededDocs,
  seedCourses,
  validateCatalog,
};