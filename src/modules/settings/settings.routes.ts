import { Router } from 'express';
import { getSettings, updateSettings } from './settings.controller.js';
import { validateBody } from '../../shared/middlewares/validate.middleware.js';
import { updateSettingsSchema } from './settings.schema.js';
import { requireAuth, requireRole } from '../../shared/middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getSettings);
router.put('/', requireRole(['ADMIN']), validateBody(updateSettingsSchema), updateSettings);

export default router;
export { router as settingsRouter };
