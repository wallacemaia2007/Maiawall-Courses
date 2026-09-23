const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const productionEnvPath = path.resolve(__dirname, '../../.env.production.local');
const fallbackEnvPath = path.resolve(__dirname, '../../.env');

dotenv.config({
  path: fs.existsSync(productionEnvPath) ? productionEnvPath : fallbackEnvPath,
});

const { closeDatabase, connectDatabase } = require('../config/database');
const { env } = require('../config/env');
const {
  seedCourses,
  validateCatalog,
} = require('./seed-courses');
const courseCatalog = require('../seed/course-catalog');

function assertProductionSeedEnvironment(currentEnv = env, argumentsList = process.argv) {
  if (currentEnv.appEnv !== 'production') {
    throw new Error('O seed de producao exige APP_ENV=production.');
  }

  if (currentEnv.isFirestoreEmulator) {
    throw new Error('O seed de producao nao pode usar o emulador do Firestore.');
  }

  if (!argumentsList.includes('--confirm')) {
    throw new Error(
      'Operacao bloqueada. Execute novamente com "npm run seed:courses:prod -- --confirm".',
    );
  }

  validateCatalog(courseCatalog);
}

async function main() {
  assertProductionSeedEnvironment();
  const database = await connectDatabase();
  const result = await seedCourses(database, courseCatalog);

  console.log(
    `Seed de producao concluido: ${result.courses} cursos, ${result.chapters} capitulos e ${result.lessons} aulas.`,
  );
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Falha ao executar o seed de producao:', error.message);
      process.exitCode = 1;
    })
    .finally(closeDatabase);
}

module.exports = {
  assertProductionSeedEnvironment,
};
