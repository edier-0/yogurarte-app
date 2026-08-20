import { Router } from 'express';
import {
  getExpenses,
  createExpense,
  deleteExpense,
} from '../controllers/expenses.controller.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import { createExpenseSchema } from '../schemas/expenses.schema.js';
import { idParamSchema } from '../schemas/common.schema.js';

const router = Router();

router.get('/', getExpenses);
router.post('/', validateBody(createExpenseSchema), createExpense);
router.delete('/:id', validateParams(idParamSchema), deleteExpense);

export default router;
