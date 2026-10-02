import { Router } from 'express';
import { auditController } from '../controllers/auditController.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/', auditController.list);
router.get('/export', auditController.exportCsv);

export default router;
