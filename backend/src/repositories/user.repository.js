const { ObjectId } = require('mongodb');

const { getDatabase } = require('../config/database');

const USERS_COLLECTION = 'users';

function users(database) {
  return database.collection(USERS_COLLECTION);
}

function objectIdFrom(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

const UserRepository = {
  async create(user) {
    const database = await getDatabase();
    const result = await users(database).insertOne(user);
    return { ...user, _id: result.insertedId };
  },

  async findByEmail(email) {
    const database = await getDatabase();
    return users(database).findOne({ email: email.toLowerCase() });
  },

  async findByProvider(provider, providerId) {
    const database = await getDatabase();
    return users(database).findOne({ provider, providerId });
  },

  async findById(id) {
    const _id = objectIdFrom(id);

    if (!_id) {
      return null;
    }

    const database = await getDatabase();
    return users(database).findOne({ _id });
  },

  async findByPasswordResetTokenHash(tokenHash, now = new Date()) {
    const database = await getDatabase();
    return users(database).findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: now },
    });
  },

  async findByEmailVerificationTokenHash(tokenHash) {
    const database = await getDatabase();
    return users(database).findOne({ emailVerificationTokenHash: tokenHash });
  },

  async updateById(id, update) {
    const _id = objectIdFrom(id);

    if (!_id) {
      return null;
    }

    const database = await getDatabase();
    await users(database).updateOne({ _id }, { $set: update });
    return this.findById(id);
  },

  async clearRefreshToken(id) {
    const _id = objectIdFrom(id);

    if (!_id) {
      return;
    }

    const database = await getDatabase();
    await users(database).updateOne(
      { _id },
      { $unset: { refreshTokenHash: '', refreshTokenUpdatedAt: '' } },
    );
  },
};

module.exports = {
  UserRepository,
};
