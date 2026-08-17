import { Router } from 'express';
import { getUsers, login } from '../controllers/users.controller.js';

const router = Router();

router.get('/', getUsers);
router.post('/login', login);

export default router;
