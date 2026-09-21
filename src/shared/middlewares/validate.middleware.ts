import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Middleware para validar el cuerpo de la petición (req.body) con un esquema Zod.
 */
export const validateBody = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req.body);
      req.body = parsed;
      next();
    } catch (error: any) {
      if (error instanceof ZodError || error?.issues) {
        const issues = error.issues || [];
        const errorMessages = issues.map((err: any) => ({
          field: Array.isArray(err.path) ? err.path.join('.') : '',
          message: err.message,
        }));
        return res.status(400).json({
          error: errorMessages[0]?.message || 'Datos de solicitud inválidos',
          details: errorMessages,
        });
      }
      return res.status(400).json({ error: 'Error en validación de datos' });
    }
  };
};

/**
 * Middleware para validar parámetros de ruta (req.params) con un esquema Zod.
 */
export const validateParams = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req.params);
      req.params = parsed as any;
      next();
    } catch (error: any) {
      if (error instanceof ZodError || error?.issues) {
        const issues = error.issues || [];
        const errorMessages = issues.map((err: any) => ({
          field: Array.isArray(err.path) ? err.path.join('.') : '',
          message: err.message,
        }));
        return res.status(400).json({
          error: errorMessages[0]?.message || 'Parámetros de ruta inválidos',
          details: errorMessages,
        });
      }
      return res.status(400).json({ error: 'Parámetros de ruta inválidos' });
    }
  };
};

/**
 * Middleware para validar parámetros de consulta (req.query) con un esquema Zod.
 */
export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req.query);
      req.query = parsed as any;
      next();
    } catch (error: any) {
      if (error instanceof ZodError || error?.issues) {
        const issues = error.issues || [];
        const errorMessages = issues.map((err: any) => ({
          field: Array.isArray(err.path) ? err.path.join('.') : '',
          message: err.message,
        }));
        return res.status(400).json({
          error: errorMessages[0]?.message || 'Parámetros de consulta inválidos',
          details: errorMessages,
        });
      }
      return res.status(400).json({ error: 'Parámetros de consulta inválidos' });
    }
  };
};
