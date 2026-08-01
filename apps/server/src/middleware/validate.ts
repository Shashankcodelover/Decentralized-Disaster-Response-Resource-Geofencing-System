import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * validate(schema)
 * Middleware factory that validates req.body against a Zod schema.
 * Returns 422 with structured field errors on failure.
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = formatZodErrors(result.error);
      res.status(422).json({ error: 'Validation failed', details: errors });
      return;
    }
    // Replace req.body with the parsed (coerced + stripped) value
    req.body = result.data;
    next();
  };
}

/**
 * validateQuery(schema)
 * Same but validates req.query instead of req.body.
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = formatZodErrors(result.error);
      res.status(422).json({ error: 'Query validation failed', details: errors });
      return;
    }
    (req as any).parsedQuery = result.data;
    next();
  };
}

function formatZodErrors(err: ZodError) {
  return err.issues.map((e) => ({
    field: e.path.map(String).join('.'),
    message: e.message,
  }));
}
