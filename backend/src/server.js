'use strict';
const app = require('./app');
const config = require('./config');
const { testConnection } = require('./config/database');
const logger = require('./shared/utils/logger');


const { startBudgetAlertJob } = require('./jobs/budgetAlertJob');
const { startRecurringTransactionsJob } = require('./jobs/recurringTransactionsJob');

async function startServer() {

  await testConnection();

  const server = app.listen(config.port, () => {
    logger.info(`Server started`, { port: config.port, env: config.env });
  });


  startRecurringTransactionsJob();
  startBudgetAlertJob();

  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });


    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason: reason?.message || reason });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
