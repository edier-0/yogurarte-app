import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/appError.js';

/**
 * Middleware para capturar rutas no encontradas de la API (/api/*)
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({
      error: `Ruta de la API no encontrada: ${req.method} ${req.originalUrl}`,
      code: 'ROUTE_NOT_FOUND',
    });
  }
  next();
};

/**
 * Middleware centralizado para manejo de errores de todo el sistema.
 * Soporta AppError, ZodError, errores conocidos de Prisma y JWT.
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const isDev = process.env.NODE_ENV === 'development';

  // 1. Errores operacionales controlados de la aplicación (AppError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
  }

  // 2. Error de validación Zod
  if (err instanceof ZodError) {
    const formattedErrors: Record<string, string> = {};
    for (const issue of err.issues) {
      const fieldPath = issue.path.join('.') || 'body';
      formattedErrors[fieldPath] = issue.message;
    }

    return res.status(400).json({
      error: 'Error de validación en los datos enviados',
      code: 'VALIDATION_ERROR',
      details: formattedErrors,
    });
  }

  // 3. Errores conocidos de Prisma ORM
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[]) || [];
        const field = target.length > 0 ? target.join(', ') : 'campo único';
        return res.status(409).json({
          error: `Ya existe un registro con este valor duplicado (${field}).`,
          code: 'DUPLICATE_ENTRY',
          field,
        });
      }
      case 'P2003': {
        return res.status(409).json({
          error: 'No se puede completar la operación debido a registros dependientes o restricciones de datos.',
          code: 'FOREIGN_KEY_VIOLATION',
        });
      }
      case 'P2025': {
        return res.status(404).json({
          error: 'El registro solicitado no fue encontrado en la base de datos.',
          code: 'RECORD_NOT_FOUND',
        });
      }
      default: {
        console.error('Prisma Error Code:', err.code, err.message);
        return res.status(400).json({
          error: 'Error en la consulta de base de datos',
          code: `PRISMA_${err.code}`,
          message: isDev ? err.message : undefined,
        });
      }
    }
  }

  // 4. Error de validación de esquema en Prisma
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      error: 'Datos incompatibles con la estructura de la base de datos',
      code: 'DATABASE_VALIDATION_ERROR',
      message: isDev ? err.message : undefined,
    });
  }

  // 5. Errores de JWT (Token inválido o expirado)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token de autenticación inválido',
      code: 'INVALID_TOKEN',
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
      code: 'TOKEN_EXPIRED',
    });
  }

  // 6. Error interno no controlado (500)
  console.error('💥 Unhandled Server Error:', err);

  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor. Inténtalo de nuevo más tarde.',
    code: 'INTERNAL_SERVER_ERROR',
    stack: isDev ? err.stack : undefined,
  });
};
