import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { updateSettingsSchema } from '../schemas/settings.schema.js';

const router = Router();

router.get('/', getSettings);
router.put('/', validateBody(updateSettingsSchema), updateSettings);

export default router;
