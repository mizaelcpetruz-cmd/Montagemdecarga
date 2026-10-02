import { Router } from 'express';
import { settingsController } from '../controllers/settingsController.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validator.js';
import { updateSettingsSchema } from '../validators/settings.validator.js';

const router = Router();

router.use(authenticateToken);

router.get('/', settingsController.getSettings);
router.put(
  '/',
  requireRole(['admin']),
  validateRequest({ body: updateSettingsSchema }),
  settingsController.updateSettings
);

export default router;
