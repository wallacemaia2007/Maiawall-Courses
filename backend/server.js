const { createApp } = require('./src/app');
const { env } = require('./src/config/env');
const { connectDatabase } = require('./src/config/database');

async function start() {
  await connectDatabase();

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`Maiawall Courses API listening on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start Maiawall Courses API', error);
  process.exit(1);
});
