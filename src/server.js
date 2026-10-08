const app = require('./app');
const connectDB = require('./config/database');
const env = require('./config/env');
const logger = require('./utils/helpers/logger');

// Handle Uncaught Exceptions
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION] Shutting down server...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

/**
 * Bootstrap Server with Database Connection Guard
 */
const startServer = async () => {
  try {
    // Database Connection Guard: Server will NOT accept requests if DB connection fails
    await connectDB();

    const server = app.listen(env.port, () => {
      logger.info(`[SERVER] ÉLAN Backend server running in ${env.env} mode on port ${env.port}`);
    });

    // Handle Unhandled Promise Rejections
    process.on('unhandledRejection', (err) => {
      console.error('[UNHANDLED REJECTION] Shutting down gracefully...');
      console.error(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });
  } catch (error) {
    console.error('[DATABASE] Application startup aborted due to database connection failure.');
    process.exit(1);
  }
};

startServer();
