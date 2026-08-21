import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { updateSettingsSchema } from '../schemas/settings.schema.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getSettings);
router.put('/', requireRole(['ADMIN']), validateBody(updateSettingsSchema), updateSettings);

export default router;
