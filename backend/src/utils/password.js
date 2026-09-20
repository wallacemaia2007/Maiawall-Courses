const bcrypt = require('bcryptjs');

const PASSWORD_SALT_ROUNDS = 12;

function hashPassword(password) {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

module.exports = {
  hashPassword,
  verifyPassword,
};
