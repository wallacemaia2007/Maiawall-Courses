const { createApp } = require('../backend/src/app');
const { connectDatabase } = require('../backend/src/config/database');

let appPromise;

module.exports = async (request, response) => {
  if (!appPromise) {
    appPromise = connectDatabase().then(() => createApp());
  }

  const app = await appPromise;
  return app(request, response);
};
