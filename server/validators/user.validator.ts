import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().trim().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().trim().email('E-mail em formato inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  role: z.enum(['admin', 'supervisor', 'operator']).default('operator'),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'Nome é obrigatório').optional(),
  email: z.string().trim().email('E-mail em formato inválido').optional(),
  role: z.enum(['admin', 'supervisor', 'operator']).optional(),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres').optional(),
  is_active: z.union([z.number(), z.boolean()]).optional(),
});

export const resetUserPasswordSchema = z.object({
  newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
});
