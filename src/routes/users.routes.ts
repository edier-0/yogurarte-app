import { Router } from 'express';
import {
  getUsers,
  getUserById,
  getMe,
  getPublicUsersList,
  createUser,
  updateUser,
  deleteUser,
  login,
  forgotPassword,
  resetPassword,
} from '../controllers/users.controller.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import {
  loginSchema,
  createUserSchema,
  updateUserSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/users.schema.js';
import { idParamSchema } from '../schemas/common.schema.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { authLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

// Selector público de usuarios activos para pantalla de login (sin datos sensibles)
router.get('/public-list', getPublicUsersList);

// Ruta de inicio de sesión con limitador anti fuerza bruta
router.post('/login', authLimiter, validateBody(loginSchema), login);

// Rutas de recuperación de contraseña ("¿Olvidaste tu contraseña?")
router.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validateBody(resetPasswordSchema), resetPassword);

// Obtener perfil del usuario actual (requiere token válido)
router.get('/me', requireAuth, getMe);

// Rutas de administración de usuarios (Solo ADMIN)
router.get('/', requireAuth, requireRole(['ADMIN']), getUsers);
router.get('/:id', requireAuth, requireRole(['ADMIN']), validateParams(idParamSchema), getUserById);
router.post('/', requireAuth, requireRole(['ADMIN']), validateBody(createUserSchema), createUser);
router.put('/:id', requireAuth, requireRole(['ADMIN']), validateParams(idParamSchema), validateBody(updateUserSchema), updateUser);
router.delete('/:id', requireAuth, requireRole(['ADMIN']), validateParams(idParamSchema), deleteUser);

export default router;
