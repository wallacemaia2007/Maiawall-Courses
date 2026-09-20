const { FieldValue } = require('firebase-admin/firestore');

const { fromFirestoreDoc, getDatabase } = require('../config/database');
const { AppError } = require('../middleware/error-handler');

const USERS_COLLECTION = 'users';
const EMAILS_COLLECTION = 'emails';

function isValidId(id) {
  return typeof id === 'string' && id.trim().length > 0;
}

const UserRepository = {
  async create(user) {
    const database = await getDatabase();
    const userRef = database.collection(USERS_COLLECTION).doc();
    const emailRef = database.collection(EMAILS_COLLECTION).doc(user.email.toLowerCase());

    await database.runTransaction(async (transaction) => {
      const existingEmail = await transaction.get(emailRef);

      if (existingEmail.exists) {
        throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'E-mail ja cadastrado');
      }

      transaction.set(userRef, user);
      transaction.set(emailRef, { userId: userRef.id });
    });

    return { ...user, _id: userRef.id };
  },

  async findByEmail(email) {
    const database = await getDatabase();
    const emailRef = database.collection(EMAILS_COLLECTION).doc(email.toLowerCase());
    const emailDoc = await emailRef.get();

    if (!emailDoc.exists) {
      return null;
    }

    const userDoc = await database.collection(USERS_COLLECTION).doc(emailDoc.data().userId).get();
    return fromFirestoreDoc(userDoc);
  },

  async findByGithubId(githubId) {
    const database = await getDatabase();
    const snapshot = await database
      .collection(USERS_COLLECTION)
      .where('githubId', '==', githubId)
      .limit(1)
      .get();

    return snapshot.empty ? null : fromFirestoreDoc(snapshot.docs[0]);
  },

  async findByGoogleId(googleId) {
    const database = await getDatabase();
    const snapshot = await database
      .collection(USERS_COLLECTION)
      .where('googleId', '==', googleId)
      .limit(1)
      .get();

    return snapshot.empty ? null : fromFirestoreDoc(snapshot.docs[0]);
  },

  async findByOAuthTicketHash(tokenHash, now = new Date()) {
    const database = await getDatabase();
    const snapshot = await database
      .collection(USERS_COLLECTION)
      .where('oauthTicketHash', '==', tokenHash)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const user = fromFirestoreDoc(snapshot.docs[0]);

    if (!user.oauthTicketExpiresAt || user.oauthTicketExpiresAt <= now) {
      return null;
    }

    return user;
  },

  async findById(id) {
    if (!isValidId(id)) {
      return null;
    }

    const database = await getDatabase();
    const snapshot = await database.collection(USERS_COLLECTION).doc(id).get();
    return fromFirestoreDoc(snapshot);
  },

  async findByPasswordResetTokenHash(tokenHash, now = new Date()) {
    const database = await getDatabase();
    const snapshot = await database
      .collection(USERS_COLLECTION)
      .where('passwordResetTokenHash', '==', tokenHash)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const user = fromFirestoreDoc(snapshot.docs[0]);

    if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt <= now) {
      return null;
    }

    return user;
  },

  async findByEmailVerificationTokenHash(tokenHash) {
    const database = await getDatabase();
    const snapshot = await database
      .collection(USERS_COLLECTION)
      .where('emailVerificationTokenHash', '==', tokenHash)
      .limit(1)
      .get();

    return snapshot.empty ? null : fromFirestoreDoc(snapshot.docs[0]);
  },

  async updateById(id, update) {
    if (!isValidId(id)) {
      return null;
    }

    const database = await getDatabase();
    await database.collection(USERS_COLLECTION).doc(id).set(update, { merge: true });
    return this.findById(id);
  },

  async clearRefreshToken(id) {
    if (!isValidId(id)) {
      return;
    }

    const database = await getDatabase();
    await database.collection(USERS_COLLECTION).doc(id).update({
      refreshTokenHash: FieldValue.delete(),
      refreshTokenUpdatedAt: FieldValue.delete(),
    }).catch(() => {});
  },
};

module.exports = {
  UserRepository,
};