import { Router } from 'express';
import { branchController } from '../controllers/branchController.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validator.js';
import {
  updateBranchSchema,
  adjustDocNumberSchema,
  batchUpdateBranchesSchema,
} from '../validators/branch.validator.js';

const router = Router();

router.use(authenticateToken);

router.get('/', branchController.list);
router.put(
  '/batch',
  requireRole(['admin']),
  validateRequest({ body: batchUpdateBranchesSchema }),
  branchController.batchUpdate
);
router.post('/sync-sap', requireRole(['admin']), branchController.syncFromSap);
router.get('/:id', branchController.getById);
router.put(
  '/:id',
  requireRole(['admin']),
  validateRequest({ body: updateBranchSchema }),
  branchController.update
);
router.patch('/:id/toggle-status', requireRole(['admin']), branchController.toggleStatus);
router.post(
  '/:id/doc-number',
  requireRole(['admin']),
  validateRequest({ body: adjustDocNumberSchema }),
  branchController.adjustDocNumber
);

export default router;
