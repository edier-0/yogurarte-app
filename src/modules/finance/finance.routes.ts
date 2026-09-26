import { Router } from 'express';
import {
  getCashMovements,
  createCashMovement,
  updateCashMovement,
  deleteCashMovement,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getCredits,
  createCredit,
  payCreditInstallment,
  skipCreditInstallment,
  deleteCredit,
  getDashboardSummary,
} from './finance.controller.js';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../shared/middlewares/validate.middleware.js';
import {
  createCashMovementSchema,
  updateCashMovementSchema,
  cashMovementsQuerySchema,
  createExpenseSchema,
  updateExpenseSchema,
  expensesQuerySchema,
  createCreditSchema,
  payCreditInstallmentSchema,
  skipCreditInstallmentSchema,
  dashboardSummaryQuerySchema,
} from './finance.schema.js';
import { idParamSchema } from '../../schemas/common.schema.js';

// ==========================================
// 1. ROUTER MOVIMIENTOS DE CAJA (/api/cash-movements)
// ==========================================
export const cashMovementsRouter = Router();

cashMovementsRouter.get('/', validateQuery(cashMovementsQuerySchema), getCashMovements);
cashMovementsRouter.post('/', validateBody(createCashMovementSchema), createCashMovement);
cashMovementsRouter.put('/:id', validateParams(idParamSchema), validateBody(updateCashMovementSchema), updateCashMovement);
cashMovementsRouter.delete('/:id', validateParams(idParamSchema), deleteCashMovement);

// ==========================================
// 2. ROUTER GASTOS OPERATIVOS (/api/expenses)
// ==========================================
export const expensesRouter = Router();

expensesRouter.get('/', validateQuery(expensesQuerySchema), getExpenses);
expensesRouter.post('/', validateBody(createExpenseSchema), createExpense);
expensesRouter.put('/:id', validateParams(idParamSchema), validateBody(updateExpenseSchema), updateExpense);
expensesRouter.delete('/:id', validateParams(idParamSchema), deleteExpense);

// ==========================================
// 3. ROUTER CRÉDITOS (/api/credits)
// ==========================================
export const creditsRouter = Router();

creditsRouter.get('/', getCredits);
creditsRouter.post('/', validateBody(createCreditSchema), createCredit);
creditsRouter.post('/:id/pay', validateParams(idParamSchema), validateBody(payCreditInstallmentSchema), payCreditInstallment);
creditsRouter.post('/:id/skip', validateParams(idParamSchema), validateBody(skipCreditInstallmentSchema), skipCreditInstallment);
creditsRouter.delete('/:id', validateParams(idParamSchema), deleteCredit);

// ==========================================
// 4. ROUTER DASHBOARD ANALÍTICO (/api/dashboard)
// ==========================================
export const dashboardRouter = Router();

dashboardRouter.get('/summary', validateQuery(dashboardSummaryQuerySchema), getDashboardSummary);
dashboardRouter.get('/', validateQuery(dashboardSummaryQuerySchema), getDashboardSummary);

// ==========================================
// ROUTER PRINCIPAL DE FINANZAS (UNIFICADO)
// ==========================================
const financeRouter = Router();

financeRouter.use('/cash-movements', cashMovementsRouter);
financeRouter.use('/cash/movements', cashMovementsRouter);
financeRouter.use('/cash', cashMovementsRouter);
financeRouter.use('/expenses', expensesRouter);
financeRouter.use('/credits', creditsRouter);
financeRouter.use('/dashboard', dashboardRouter);

export default financeRouter;
