import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('E-mail em formato inválido'),
  password: z.string().min(1, 'A senha é obrigatória'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('E-mail em formato inválido'),
});

export const resetPasswordWithCodeSchema = z.object({
  email: z.string().trim().email('E-mail em formato inválido'),
  code: z.string().min(4, 'Código de verificação é obrigatório'),
  newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
});
