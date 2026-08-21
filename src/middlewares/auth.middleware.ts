import { Request, Response, NextFunction } from 'express';
import { verifyToken, AuthUserPayload } from '../utils/jwt.utils.js';

// Extender la interfaz Request de Express para incluir al usuario autenticado
declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

/**
 * Middleware que valida que la petición contenga un token JWT válido
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Acceso no autorizado: Se requiere token de sesión',
      code: 'AUTH_REQUIRED',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Formato de token inválido. Debe ser: Bearer <token>',
      code: 'INVALID_TOKEN_FORMAT',
    });
  }

  const token = parts[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({
      error: 'Token de sesión inválido o manipulado.',
      code: 'INVALID_TOKEN',
    });
  }
};

/**
 * Middleware para restringir el acceso a roles específicos
 * @param allowedRoles Lista de roles permitidos, ej: ['ADMIN', 'PRODUCCION']
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Acceso no autenticado',
        code: 'AUTH_REQUIRED',
      });
    }

    const userRole = (req.user.role || '').toUpperCase();
    const upperRoles = allowedRoles.map((r) => r.toUpperCase());

    if (!upperRoles.includes(userRole)) {
      return res.status(403).json({
        error: `Acceso denegado: Se requiere rol de ${allowedRoles.join(' o ')}`,
        code: 'FORBIDDEN_ROLE',
        userRole,
        requiredRoles: allowedRoles,
      });
    }

    next();
  };
};
