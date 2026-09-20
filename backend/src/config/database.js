const {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} = require('firebase-admin/app');
const { Timestamp, getFirestore } = require('firebase-admin/firestore');

const { env } = require('./env');

let app;
let database;

function initializeAppIfNeeded() {
  const apps = getApps();

  if (apps.length > 0) {
    return apps[0];
  }

  const options = { projectId: env.firebaseProjectId };

  if (env.firebaseServiceAccountJson) {
    options.credential = cert(JSON.parse(env.firebaseServiceAccountJson));
  } else if (env.firebaseServiceAccountPath) {
    options.credential = cert(env.firebaseServiceAccountPath);
  } else if (!env.isFirestoreEmulator) {
    options.credential = applicationDefault();
  }

  return initializeApp(options);
}

async function connectDatabase() {
  if (database) {
    return database;
  }

  app = initializeAppIfNeeded();
  // O SDK do Firestore detecta o emulador automaticamente via FIRESTORE_EMULATOR_HOST.
  database = getFirestore(app, env.firebaseDatabaseId || undefined);

  return database;
}

async function getDatabase() {
  return database || connectDatabase();
}

async function closeDatabase() {
  if (app) {
    await app.delete();
  }

  app = undefined;
  database = undefined;
}

function fromFirestore(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (Array.isArray(value)) {
    return value.map(fromFirestore);
  }

  if (typeof value === 'object') {
    const result = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = fromFirestore(entry);
    }
    return result;
  }

  return value;
}

function fromFirestoreDoc(snapshot) {
  if (!snapshot.exists) {
    return null;
  }

  return { ...fromFirestore(snapshot.data()), _id: snapshot.id };
}

module.exports = {
  closeDatabase,
  connectDatabase,
  fromFirestore,
  fromFirestoreDoc,
  getDatabase,
};