const mongoose = require('mongoose');
const env = require('./env');

/**
 * Connect to MongoDB database using Mongoose.
 * Prevents application from starting if database connection fails.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.mongoUri);
    console.log('[DATABASE] MongoDB connected successfully.');
    return conn;
  } catch (error) {
    console.error('[DATABASE] MongoDB connection failed.');
    console.error(`Error details: ${error.message}`);
    throw error; // Re-throw to prevent server startup
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[DATABASE] MongoDB disconnected.');
});

mongoose.connection.on('error', (err) => {
  console.error('[DATABASE] MongoDB connection error:', err.message);
});

module.exports = connectDB;
