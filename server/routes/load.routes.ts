import { Router } from 'express';
import { loadController } from '../controllers/loadController.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validator.js';
import {
  calculateLoadSchema,
  autoOptimizeSchema,
  createLoadSchema,
  deleteLoadSchema,
} from '../validators/load.validator.js';

const router = Router();

router.use(authenticateToken);

router.post('/calculate', validateRequest({ body: calculateLoadSchema }), loadController.calculate);
router.post('/auto-optimize', validateRequest({ body: autoOptimizeSchema }), loadController.autoOptimize);
router.post('/', validateRequest({ body: createLoadSchema }), loadController.create);
router.get('/', loadController.list);
router.get('/:id', loadController.getById);
router.patch('/:id/finalize', loadController.finalizeLoad);
router.post('/:id/sync-sap', loadController.syncWithSap);
router.get('/:id/pdf', loadController.downloadPdf);
router.delete('/:id/items/:itemId', loadController.removeOrderItem);
router.delete(
  '/:id',
  requireRole(['admin', 'supervisor', 'operator']),
  validateRequest({ body: deleteLoadSchema }),
  loadController.deleteLoad
);

export default router;
