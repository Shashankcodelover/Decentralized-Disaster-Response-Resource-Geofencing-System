import 'dotenv/config';
import http from 'http';
import app from './app';
import { connectDB } from './db';
import { initSocket } from './socket';
import logger from './logger';

const PORT = process.env.PORT ?? 4000;

async function main() {
  await connectDB();

  const server = http.createServer(app);
  const io = initSocket(server);
  app.set('io', io);

  server.listen(PORT, () => {
    logger.info({ port: PORT, nodeEnv: process.env.NODE_ENV }, `[mirage:api] listening on http://localhost:${PORT}`);
  });

  // --- GRACEFUL SHUTDOWN ---
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received, draining connections…');

    // Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed');
    });

    // Close Socket.io connections
    io.close(() => {
      logger.info('Socket.io server closed');
    });

    // Allow in-flight requests 10 seconds to complete
    setTimeout(async () => {
      try {
        const mongoose = await import('mongoose');
        await mongoose.default.connection.close();
        logger.info('MongoDB connection closed');
      } catch (err) {
        logger.error({ err }, 'Error closing MongoDB connection');
      }
      process.exit(0);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Catch unhandled rejections and uncaught exceptions
  process.on('unhandledRejection', (reason, promise) => {
    logger.fatal({ reason, promise }, 'Unhandled Rejection — shutting down');
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught Exception — shutting down');
    shutdown('uncaughtException');
  });
}

main().catch((err) => {
  logger.fatal({ err }, '[mirage:api] fatal startup error');
  process.exit(1);
});
