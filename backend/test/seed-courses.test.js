const assert = require('node:assert/strict');
const { test } = require('node:test');

const { assertSeedEnvironment, validateCatalog } = require('../src/scripts/seed-courses');

test('rejeita rodar o seed fora de desenvolvimento/teste', () => {
  assert.throws(() => assertSeedEnvironment({ appEnv: 'production' }));
  assert.doesNotThrow(() => assertSeedEnvironment({ appEnv: 'development' }));
  assert.doesNotThrow(() => assertSeedEnvironment({ appEnv: 'test' }));
});

test('rejeita catálogo sem capítulos', () => {
  assert.throws(() => validateCatalog({ courses: [{ slug: 'api', title: 'API' }] }));
});