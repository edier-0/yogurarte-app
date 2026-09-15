import rateLimit from 'express-rate-limit';

/**
 * Limitador estricto para intentos de inicio de sesión
 * Previene ataques de fuerza bruta sobre credenciales de usuarios
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Ventana de 15 minutos
  max: 10, // Máximo 10 intentos por IP
  standardHeaders: true, // Retorna cabeceras RateLimit-* estándar
  legacyHeaders: false, // Deshabilita cabeceras X-RateLimit-*
  message: {
    error: 'Demasiados intentos fallidos de inicio de sesión. Por favor espera 15 minutos antes de volver a intentar.',
    code: 'TOO_MANY_AUTH_ATTEMPTS',
  },
  skipSuccessfulRequests: true, // Solo cuenta intentos fallidos (para no bloquear a usuarios legítimos)
});

/**
 * Limitador general para peticiones a la API
 * Previene ataques de denegación de servicio (DoS) y scraping automatizado
 */
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // Ventana de 1 minuto
  max: 300, // Máximo 300 peticiones por minuto por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Has excedido el límite de peticiones por minuto. Por favor reduce la velocidad.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Limitador específico para envío de mensajes de WhatsApp
 * Protege la línea telefónica contra bloqueos de Meta por ráfagas excesivas
 */
export const crmSendLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // Ventana de 1 minuto
  max: 40, // Máximo 40 mensajes por minuto por usuario/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Has enviado demasiados mensajes en poco tiempo. Por seguridad de la línea de WhatsApp, espera un momento.',
    code: 'CRM_RATE_LIMIT_EXCEEDED',
  },
});

