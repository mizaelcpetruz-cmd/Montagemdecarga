import { z } from 'zod';
export const calculateLoadSchema = z.object({
    vehicleId: z.string().min(1, 'Veículo é obrigatório'),
    docEntries: z.array(z.coerce.number()).min(1, 'Selecione ao menos 1 pedido para o cálculo'),
});
export const autoOptimizeSchema = z.object({
    vehicleId: z.string().min(1, 'Veículo é obrigatório para auto-otimização'),
    targetCity: z.string().trim().optional(),
});
export const createLoadSchema = z.object({
    vehicleId: z.string().min(1, 'Veículo é obrigatório'),
    docEntries: z.array(z.coerce.number()).min(1, 'Selecione ao menos 1 pedido para a carga'),
    branchId: z.coerce.number().optional(),
    docNumber: z.coerce.number().int().min(1).max(9999999).optional(),
    observations: z.string().trim().optional(),
    orders: z.array(z.any()).optional(),
});
export const deleteLoadSchema = z.object({
    justification: z.string().trim().min(5, 'A justificativa deve ter no mínimo 5 caracteres'),
});
