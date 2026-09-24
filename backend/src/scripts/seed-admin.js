const { connectDatabase, closeDatabase } = require('../config/database');
const { env } = require('../config/env');
const { UserRepository } = require('../repositories/user.repository');
const { hashPassword } = require('../utils/password');

const DEFAULT_EMAIL = 'wallacemaia2007@gmail.com';
const DEFAULT_PASSWORD = 'Wallace2007';

function assertSeedEnvironment(currentEnv = env) {
  if (!['development', 'test'].includes(currentEnv.appEnv)) {
    throw new Error(
      'O seed de admin so pode rodar em APP_ENV=development/test (Firestore).',
    );
  }
}

function parseArgs(args) {
  const email = args[0] || DEFAULT_EMAIL;
  const password = args[1] || DEFAULT_PASSWORD;

  if (!email || !String(email).trim()) {
    throw new Error('O e-mail do admin e obrigatorio.');
  }

  if (String(password).length < 8) {
    throw new Error('A senha do admin deve ter ao menos 8 caracteres.');
  }

  return {
    email: String(email).trim().toLowerCase(),
    password,
  };
}

async function seedAdminUser(database, email, password) {
  const now = new Date();
  const existingUser = await UserRepository.findByEmail(email);

  if (existingUser) {
    const id = existingUser._id.toString();
    await UserRepository.updateById(id, {
      name: 'Maiawall Admin',
      passwordHash: await hashPassword(password),
      role: 'ADMIN',
      emailVerified: true,
      updatedAt: now,
    });
    return { created: false, id };
  }

  const user = await UserRepository.create({
    name: 'Maiawall Admin',
    email,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  return { created: true, id: user._id.toString() };
}

async function main() {
  assertSeedEnvironment();
  const { email, password } = parseArgs(process.argv.slice(2));
  const database = await connectDatabase();
  const result = await seedAdminUser(database, email, password);

  console.log(
    `Seed de admin concluido: ${result.created ? 'criado' : 'atualizado'} usuario ${email} (id ${result.id}) com role ADMIN.`,
  );
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Falha ao executar o seed de admin:', error.message);
      process.exitCode = 1;
    })
    .finally(closeDatabase);
}

module.exports = {
  DEFAULT_EMAIL,
  assertSeedEnvironment,
  parseArgs,
  seedAdminUser,
};