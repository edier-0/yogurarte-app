/**
 * Re-exportación para compatibilidad durante la migración arquitectónica (ADR-001)
 */
export {
  validateBody,
  validateParams,
  validateQuery,
} from '../shared/middlewares/validate.middleware.js';
