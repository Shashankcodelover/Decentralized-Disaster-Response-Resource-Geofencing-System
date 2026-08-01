import pino from 'pino';

/**
 * Structured JSON logger (Pino).
 * In development, pretty-print with colours; in production emit raw JSON.
 */
const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? 'info',
    base: { pid: process.pid, service: 'mirage-api' },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie'],
      censor: '[REDACTED]',
    },
  },
  process.env.NODE_ENV !== 'production'
    ? pino.transport({ target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } })
    : undefined
);

export default logger;
