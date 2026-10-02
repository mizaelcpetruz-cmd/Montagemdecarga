import { z } from 'zod';
export const vehicleSchema = z.object({
    plate: z
        .string()
        .trim()
        .min(7, 'Placa deve ter no mínimo 7 caracteres')
        .max(10, 'Placa deve ter no máximo 10 caracteres')
        .transform(val => val.toUpperCase()),
    model: z.string().trim().min(2, 'Modelo é obrigatório').transform(val => val.toUpperCase()),
    vehicle_type: z.enum(['Fiorino', 'VUC', 'Toco', 'Truck', 'Carreta', 'Bitrem']),
    driver_name: z.string().trim().min(3, 'Nome do motorista é obrigatório').transform(val => val.toUpperCase()),
    driver_cpf: z.string().trim().optional().default(''),
    driver_phone: z.string().trim().optional().default(''),
    carrier: z.string().trim().min(2, 'Transportadora é obrigatória').transform(val => val.toUpperCase()),
    max_weight_kg: z.coerce.number().positive('Capacidade de peso deve ser positiva'),
    max_volume_m3: z.coerce.number().positive('Capacidade de volume deve ser positiva'),
    max_pallets: z.coerce.number().int().positive('Quantidade de paletes deve ser positiva'),
    status: z.enum(['available', 'loading', 'in_transit', 'maintenance']).default('available'),
});
export const updateVehicleSchema = vehicleSchema.partial();
