const assert = require('node:assert/strict');
const { test } = require('node:test');

const { assertLocalSeedEnvironment, isLocalMongoUri, validateCatalog } = require('../src/scripts/seed-courses');

test('aceita somente hosts Mongo locais no seed', () => {
  assert.equal(isLocalMongoUri('mongodb://127.0.0.1:27017/maiawall_courses'), true);
  assert.equal(isLocalMongoUri('mongodb://mongo:27017/maiawall_courses'), true);
  assert.equal(isLocalMongoUri('mongodb+srv://cluster.example.mongodb.net/maiawall_courses'), false);
  assert.throws(() =>
    assertLocalSeedEnvironment({ appEnv: 'production', mongodbUri: 'mongodb://127.0.0.1:27017/maiawall_courses' }),
  );
});

test('rejeita catálogo sem capítulos', () => {
  assert.throws(() => validateCatalog({ courses: [{ slug: 'api', title: 'API' }] }));
});
