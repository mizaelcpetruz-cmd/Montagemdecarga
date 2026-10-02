import { Router } from 'express';
import { sapController } from '../controllers/sapController.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/orders', sapController.getOrders);
router.get('/orders/:docEntry', sapController.getOrderDetails);
router.get('/status', sapController.getStatus);
router.post('/toggle-mock', requireRole(['admin']), sapController.toggleMockMode);

export default router;
