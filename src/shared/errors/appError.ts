/**
 * Clases de error tipadas para la arquitectura modular de YogurArte.
 * Permiten lanzar errores operacionales consistentes con código HTTP y código de error de dominio.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_SERVER_ERROR',
    details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso no encontrado', code: string = 'NOT_FOUND', details?: any) {
    super(message, 404, code, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Error de validación en los datos enviados', details?: any, code: string = 'VALIDATION_ERROR') {
    super(message, 400, code, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Solicitud inválida', code: string = 'BAD_REQUEST', details?: any) {
    super(message, 400, code, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Acceso no autorizado', code: string = 'AUTH_REQUIRED', details?: any) {
    super(message, 401, code, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acceso denegado', code: string = 'FORBIDDEN', details?: any) {
    super(message, 403, code, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflicto con el recurso existente', code: string = 'CONFLICT', details?: any) {
    super(message, 409, code, details);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Error interno del servidor', code: string = 'INTERNAL_SERVER_ERROR', details?: any) {
    super(message, 500, code, details);
  }
}
