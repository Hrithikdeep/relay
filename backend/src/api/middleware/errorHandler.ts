import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid request data',
      details: err.flatten(),
    });
    return;
  }

  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error(err.message, { stack: err.stack });
    }
    res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
    });
    return;
  }

  logger.error('Unhandled error', { error: err instanceof Error ? err.stack : err });

  res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
  });
};
