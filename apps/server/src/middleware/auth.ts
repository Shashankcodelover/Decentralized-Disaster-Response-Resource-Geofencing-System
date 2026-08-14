import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../logger';

export interface AuthPayload {
  sub: string;
  role: 'admin' | 'coordinator' | 'field_agent' | 'responder' | 'viewer';
  iat?: number;
  exp?: number;
}

/** Extend Express Request to carry auth payload */
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const JWT_SECRET: string = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
  // Warn or throw depending on environment
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[FATAL] JWT_SECRET environment variable is not set. '
      + 'The server MUST NOT start without a securely configured secret. '
      + 'Set JWT_SECRET in your .env file or environment before launching.'
    );
  }
}

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET || JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

/**
 * requireAuth — rejects requests without a valid JWT.
 * Attach this to write routes (POST / PATCH / PUT / DELETE).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, getSecret()) as unknown as AuthPayload;
    req.user = payload;
    next();
  } catch (err) {
    logger.warn({ err }, 'JWT verification failed');
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * requireRole — further restrict to specific roles.
 * Must come after requireAuth.
 */
export function requireRole(...roles: AuthPayload['role'][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

/**
 * POST /api/auth/token
 * Issues a signed JWT for a given role (demo purposes — swap for real credential check in prod).
 */
export function issueToken(req: Request, res: Response): void {
  const { sub, role, secret } = req.body as {
    sub?: string;
    role?: AuthPayload['role'];
    secret?: string;
  };

  const configuredSecret = getSecret();
  if (secret !== configuredSecret) {
    res.status(401).json({ error: 'Invalid admin secret' });
    return;
  }
  if (!sub || !role) {
    res.status(400).json({ error: '`sub` and `role` are required' });
    return;
  }

  const token = jwt.sign({ sub, role }, configuredSecret, { expiresIn: '8h' });
  logger.info({ sub, role }, 'Token issued');
  res.json({ token, expiresIn: '8h' });
}
