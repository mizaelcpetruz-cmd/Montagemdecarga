import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { loginRateLimiter, passwordResetRateLimiter } from '../middlewares/security.js';
import { validateRequest } from '../middlewares/validator.js';
import {
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordWithCodeSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Rotas públicas com Rate Limiter e validação Zod
router.post(
  '/login',
  loginRateLimiter,
  validateRequest({ body: loginSchema }),
  authController.login
);

router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  validateRequest({ body: forgotPasswordSchema }),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  passwordResetRateLimiter,
  validateRequest({ body: resetPasswordWithCodeSchema }),
  authController.resetPasswordWithCode
);

// Rotas autenticadas
router.get('/me', authenticateToken, authController.me);
router.post(
  '/change-password',
  authenticateToken,
  validateRequest({ body: changePasswordSchema }),
  authController.changePassword
);

export default router;
