import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Ошибка валидации входных данных',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  const errObj = err as any;
  if (errObj && typeof errObj === 'object' && typeof errObj.code === 'string') {
    if (errObj.code === 'P2002') {
      return res.status(409).json({
        error: 'Запись с такими параметрами уже существует',
        details: errObj.meta,
      });
    }
    if (errObj.code === 'P2025') {
      return res.status(404).json({
        error: 'Запрашиваемая запись не найдена',
      });
    }
    if (errObj.code === 'P2003') {
      return res.status(400).json({
        error: 'Нарушение ссылочной целостности данных',
      });
    }
  }

  if (err instanceof Error) {
    console.error('[Error]', err);
    return res.status(500).json({
      error: err.message || 'Внутренняя ошибка сервера',
    });
  }

  return res.status(500).json({
    error: 'Неизвестная ошибка сервера',
  });
}
