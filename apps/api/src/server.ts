import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './common/logging/logger.js';
import { initializeDatabase, AppDataSource } from './config/database.js';

const app = createApp();

async function startServer() {
  try {
    // Attempt database initialization (warns but doesn't crash if DB is starting up)
    try {
      await initializeDatabase();
    } catch (dbError) {
      logger.warn(
        { service: 'database', err: dbError instanceof Error ? dbError.message : String(dbError) },
        'Initial database connection failed; readiness probe will report unavailable until restored',
      );
    }

    const server = app.listen(env.PORT, () => {
      logger.info(
        {
          service: 'lrms-api',
          port: env.PORT,
          env: env.NODE_ENV,
          webOrigin: env.WEB_ORIGIN,
        },
        `Labour Room Management System API running at http://localhost:${env.PORT}/api/v1`,
      );
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal, closing HTTP server and database pool...');
      server.close(async () => {
        logger.info('HTTP server closed');
        if (AppDataSource.isInitialized) {
          await AppDataSource.destroy();
          logger.info('Database connections closed');
        }
        process.exit(0);
      });

      // Force exit after 10s if hanging
      setTimeout(() => {
        logger.error('Graceful shutdown timeout exceeded, forcing exit');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.fatal(
      { err: error instanceof Error ? error.message : String(error) },
      'Fatal error during server startup',
    );
    process.exit(1);
  }
}

startServer();
