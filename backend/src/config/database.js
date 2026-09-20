const { MongoClient } = require('mongodb');

const { env } = require('./env');

let client;
let database;

async function connectDatabase() {
  if (database) {
    return database;
  }

  client = new MongoClient(env.mongodbUri);
  await client.connect();
  database = client.db(env.mongodbDbName);
  await database.collection('users').createIndex({ email: 1 }, { unique: true });

  return database;
}

async function getDatabase() {
  return database || connectDatabase();
}

async function closeDatabase() {
  if (client) {
    await client.close();
  }

  client = undefined;
  database = undefined;
}

module.exports = {
  closeDatabase,
  connectDatabase,
  getDatabase,
};
