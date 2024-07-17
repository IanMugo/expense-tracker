const bcrypt = require('bcryptjs');

// Function to hash a password
async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(10); // Generate salt
    const hashedPassword = await bcrypt.hash(password, salt); // Hash the password
    return hashedPassword;
  } catch (error) {
    throw new Error('Password hashing failed');
  }
}

module.exports = { hashPassword };
