/**
 * Re-exportación para compatibilidad durante la migración arquitectónica (ADR-001)
 */
export {
  loginSchema,
  createUserSchema,
  updateUserSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginInput,
  type CreateUserInput,
  type UpdateUserInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from '../modules/auth/auth.schema.js';
