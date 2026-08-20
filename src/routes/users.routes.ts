import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  login,
} from '../controllers/users.controller.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import { loginSchema, createUserSchema, updateUserSchema } from '../schemas/users.schema.js';
import { idParamSchema } from '../schemas/common.schema.js';

const router = Router();

router.get('/', getUsers);
router.get('/:id', validateParams(idParamSchema), getUserById);
router.post('/', validateBody(createUserSchema), createUser);
router.put('/:id', validateParams(idParamSchema), validateBody(updateUserSchema), updateUser);
router.delete('/:id', validateParams(idParamSchema), deleteUser);
router.post('/login', validateBody(loginSchema), login);

export default router;
