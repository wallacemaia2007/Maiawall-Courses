const assert = require('node:assert/strict');
const { test } = require('node:test');

const { assertSeedEnvironment, seedCourses, validateCatalog } = require('../src/scripts/seed-courses');

const CATALOG = {
  courses: [
    {
      slug: 'curso-a',
      title: 'Curso A',
      published: true,
      chapters: [
        {
          slug: 'cap-1',
          title: 'Capítulo 1',
          order: 1,
          lessons: [
            { title: 'Aula 1', type: 'article', content: '<p>1</p>', order: 1 },
            { title: 'Aula 2', type: 'code', content: 'console.log(1)', order: 2 },
          ],
        },
      ],
    },
  ],
};

/* Firestore mínimo: só o que o seed usa (collection/doc/set/where+get). */
function fakeDatabase() {
  const writes = [];

  return {
    writes,
    collection(name) {
      return {
        doc(id) {
          return {
            set(data) {
              writes.push({ collection: name, id, data });
              return Promise.resolve();
            },
          };
        },
        where() {
          return { get: () => Promise.resolve({ docs: [] }) };
        },
      };
    },
  };
}

test('rejeita rodar o seed fora de desenvolvimento/teste', () => {
  assert.throws(() => assertSeedEnvironment({ appEnv: 'production' }));
  assert.doesNotThrow(() => assertSeedEnvironment({ appEnv: 'development' }));
  assert.doesNotThrow(() => assertSeedEnvironment({ appEnv: 'test' }));
});

test('rejeita catálogo sem capítulos', () => {
  assert.throws(() => validateCatalog({ courses: [{ slug: 'api', title: 'API' }] }));
});

test('rejeita curso sem "published" explícito (mesma regra do build dos assets)', () => {
  const withoutPublished = (published) => ({
    courses: [{ slug: 'api', title: 'API', published, chapters: [] }],
  });

  assert.throws(() => validateCatalog(withoutPublished(undefined)), /published/);
  assert.throws(() => validateCatalog(withoutPublished('true')), /published/);
  assert.doesNotThrow(() => validateCatalog(withoutPublished(false)));
  assert.doesNotThrow(() => validateCatalog(withoutPublished(true)));
});

test('o seed grava só o metadado de curso/capítulo no Firestore', async () => {
  const database = fakeDatabase();
  const result = await seedCourses(database, CATALOG);

  assert.deepEqual(result, { courses: 1, chapters: 1, lessons: 2 });
  assert.deepEqual(
    database.writes.map((write) => `${write.collection}/${write.id}`),
    ['courses/curso-a', 'chapters/curso-a:cap-1'],
  );

  // O corpo da aula não pode ir para o Firestore: ele vive nos JSONs de seed e
  // nos assets estáticos gerados a partir deles.
  const [, chapter] = database.writes;
  assert.equal(chapter.data.lessonCount, 2);
  assert.equal('lessons' in chapter.data, false);
  assert.equal('content' in chapter.data, false);
});

test('o seed apaga os documentos de "lessons" deixados por versões anteriores', async () => {
  const deleted = [];
  const database = {
    collection: (name) => ({
      where: () => ({
        get: async () => ({
          docs:
            name === 'lessons'
              ? [{ ref: { delete: async () => deleted.push(`${name}/antigo`) } }]
              : [],
        }),
      }),
      doc: (id) => ({ set: async () => {} }),
    }),
  };

  await seedCourses(database, CATALOG);

  /*
   * Versões antigas gravavam o corpo das aulas no Firestore. O seed atual não
   * escreve mais nada em `lessons`, mas precisa continuar limpando a coleção —
   * senão os documentos antigos (que contêm o conteúdo das aulas) ficam
   * pagos e legíveis no Firestore para sempre.
   */
  assert.deepEqual(deleted, ['lessons/antigo']);
});
