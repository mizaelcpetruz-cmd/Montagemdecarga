import { z } from 'zod';

export const updateBranchSchema = z.object({
  name: z.string().trim().optional(),
  cnpj: z.string().trim().nullable().optional(),
  logo_url: z.string().trim().nullable().optional(),
  current_doc_number: z.coerce.number().int().min(1).max(9999999).optional(),
  is_active: z.union([z.number(), z.boolean()]).optional(),
});

export const adjustDocNumberSchema = z.object({
  action: z.enum(['increment', 'decrement', 'set']),
  value: z.coerce.number().int().min(1).max(9999999).optional(),
});

export const batchUpdateBranchesSchema = z.object({
  branches: z.array(
    z.object({
      id: z.coerce.number(),
      name: z.string().optional(),
      cnpj: z.string().nullable().optional(),
      logo_url: z.string().nullable().optional(),
      current_doc_number: z.coerce.number().int().min(1).max(9999999).optional(),
      is_active: z.union([z.number(), z.boolean()]).optional(),
    })
  ).min(1, 'A lista de filiais não pode estar vazia'),
});
