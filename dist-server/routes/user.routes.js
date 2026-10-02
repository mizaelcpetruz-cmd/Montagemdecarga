import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validator.js';
import { createUserSchema, updateUserSchema, resetUserPasswordSchema, } from '../validators/user.validator.js';
const router = Router();
// Todas as rotas de usuários exigem autenticação e perfil admin
router.use(authenticateToken);
router.use(requireRole(['admin']));
router.get('/', userController.list);
router.post('/', validateRequest({ body: createUserSchema }), userController.create);
router.put('/:id', validateRequest({ body: updateUserSchema }), userController.update);
router.patch('/:id/toggle-status', userController.toggleStatus);
router.patch('/:id/reset-password', validateRequest({ body: resetUserPasswordSchema }), userController.resetPassword);
export default router;
