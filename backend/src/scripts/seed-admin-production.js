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
const { parseArgs, seedAdminUser } = require('./seed-admin');

function assertProductionSeedEnvironment(currentEnv = env, argumentsList = process.argv) {
  if (currentEnv.appEnv !== 'production') {
    throw new Error('O seed de admin de producao exige APP_ENV=production.');
  }

  if (currentEnv.isFirestoreEmulator) {
    throw new Error('O seed de admin de producao nao pode usar o emulador do Firestore.');
  }

  if (!argumentsList.includes('--confirm')) {
    throw new Error(
      'Operacao bloqueada. Execute novamente com "npm run seed:admin:prod -- --confirm".',
    );
  }
}

async function main() {
  assertProductionSeedEnvironment();
  const { email, password } = parseArgs(
    process.argv.slice(2).filter((argument) => argument !== '--confirm'),
  );
  const database = await connectDatabase();
  const result = await seedAdminUser(database, email, password);

  console.log(
    `Seed de admin de producao concluido: ${result.created ? 'criado' : 'atualizado'} usuario ${email} (id ${result.id}) com role ADMIN.`,
  );
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Falha ao executar o seed de admin de producao:', error.message);
      process.exitCode = 1;
    })
    .finally(closeDatabase);
}

module.exports = {
  assertProductionSeedEnvironment,
};