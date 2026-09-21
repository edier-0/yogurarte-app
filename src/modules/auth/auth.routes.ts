import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validateBody, validateParams } from '../../shared/middlewares/validate.middleware.js';
import { requireAuth, requireRole } from '../../shared/middlewares/auth.middleware.js';
import { authLimiter } from '../../middlewares/rateLimiter.middleware.js';
import {
  loginSchema,
  createUserSchema,
  updateUserSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema.js';
import { idParamSchema } from '../../schemas/common.schema.js';

const router = Router();

// Selector público de usuarios activos para pantalla de login (sin datos sensibles)
router.get('/public-list', authController.getPublicUsersList);

// Ruta de inicio de sesión con limitador anti fuerza bruta
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);

// Rutas de recuperación de contraseña ("¿Olvidaste tu contraseña?")
router.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validateBody(resetPasswordSchema), authController.resetPassword);

// Obtener perfil del usuario actual (requiere token válido)
router.get('/me', requireAuth, authController.getMe);

// Rutas de administración de usuarios (Solo ADMIN)
router.get('/', requireAuth, requireRole(['ADMIN']), authController.getUsers);
router.get('/:id', requireAuth, requireRole(['ADMIN']), validateParams(idParamSchema), authController.getUserById);
router.post('/', requireAuth, requireRole(['ADMIN']), validateBody(createUserSchema), authController.createUser);
router.put('/:id', requireAuth, requireRole(['ADMIN']), validateParams(idParamSchema), validateBody(updateUserSchema), authController.updateUser);
router.delete('/:id', requireAuth, requireRole(['ADMIN']), validateParams(idParamSchema), authController.deleteUser);

export default router;
