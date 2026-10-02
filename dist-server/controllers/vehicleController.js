import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';
import { logAudit } from '../middlewares/security.js';
const vehicleSchema = z.object({
    plate: z.string().min(7, 'Placa deve ter no mínimo 7 caracteres').max(10).toUpperCase(),
    model: z.string().min(2, 'Modelo é obrigatório'),
    vehicle_type: z.enum(['Fiorino', 'VUC', 'Toco', 'Truck', 'Carreta', 'Bitrem']),
    driver_name: z.string().min(3, 'Nome do motorista é obrigatório'),
    driver_cpf: z.string().optional().default(''),
    driver_phone: z.string().optional().default(''),
    carrier: z.string().min(2, 'Transportadora é obrigatória'),
    max_weight_kg: z.number().positive('Capacidade de peso deve ser positiva'),
    max_volume_m3: z.number().positive('Capacidade de volume deve ser positiva'),
    max_pallets: z.number().int().positive('Quantidade de paletes deve ser positiva'),
    status: z.enum(['available', 'loading', 'in_transit', 'maintenance']).default('available'),
});
export const vehicleController = {
    list: async (req, res) => {
        try {
            const status = req.query.status;
            let query = supabase.from('vehicles').select('*').order('created_at', { ascending: false });
            if (status) {
                query = query.eq('status', status);
            }
            const { data: vehicles, error } = await query;
            if (error) {
                throw error;
            }
            res.status(200).json({
                success: true,
                data: vehicles || [],
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao listar veículos: ' + error.message });
        }
    },
    getById: async (req, res) => {
        try {
            const { data: vehicle, error } = await supabase
                .from('vehicles')
                .select('*')
                .eq('id', req.params.id)
                .single();
            if (error || !vehicle) {
                res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
                return;
            }
            res.status(200).json({ success: true, data: vehicle });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao buscar veículo: ' + error.message });
        }
    },
    create: async (req, res) => {
        try {
            const parsed = vehicleSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({
                    success: false,
                    message: 'Dados do veículo inválidos.',
                    errors: parsed.error.format(),
                });
                return;
            }
            const data = parsed.data;
            const id = 'veh-' + uuidv4().substring(0, 8);
            const formattedPlate = data.plate.toUpperCase().trim();
            const formattedModel = data.model.toUpperCase().trim();
            const formattedDriver = data.driver_name.toUpperCase().trim();
            const formattedCarrier = data.carrier.toUpperCase().trim();
            const { data: checkPlate } = await supabase
                .from('vehicles')
                .select('id')
                .eq('plate', formattedPlate)
                .maybeSingle();
            if (checkPlate) {
                res.status(409).json({ success: false, message: 'Já existe um veículo cadastrado com esta placa.' });
                return;
            }
            const newVehicle = {
                id,
                plate: formattedPlate,
                model: formattedModel,
                vehicle_type: data.vehicle_type,
                driver_name: formattedDriver,
                driver_cpf: data.driver_cpf || '',
                driver_phone: data.driver_phone || '',
                carrier: formattedCarrier,
                max_weight_kg: data.max_weight_kg,
                max_volume_m3: data.max_volume_m3,
                max_pallets: data.max_pallets,
                status: data.status,
            };
            const { data: created, error: insertError } = await supabase
                .from('vehicles')
                .insert(newVehicle)
                .select()
                .single();
            if (insertError) {
                throw insertError;
            }
            logAudit('VEHICLE_CREATED', req, `Veículo cadastrado: ${formattedPlate} - ${formattedModel}`);
            res.status(201).json({ success: true, message: 'Veículo cadastrado com sucesso.', data: created });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao criar veículo: ' + error.message });
        }
    },
    update: async (req, res) => {
        try {
            const id = req.params.id;
            const { data: vehicle, error: fetchErr } = await supabase
                .from('vehicles')
                .select('*')
                .eq('id', id)
                .single();
            if (fetchErr || !vehicle) {
                res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
                return;
            }
            const parsed = vehicleSchema.partial().safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ success: false, message: 'Dados inválidos.', errors: parsed.error.format() });
                return;
            }
            const data = parsed.data;
            const updates = {
                updated_at: new Date().toISOString(),
            };
            if (data.plate !== undefined)
                updates.plate = data.plate.toUpperCase().trim();
            if (data.model !== undefined)
                updates.model = data.model.toUpperCase().trim();
            if (data.vehicle_type !== undefined)
                updates.vehicle_type = data.vehicle_type;
            if (data.driver_name !== undefined)
                updates.driver_name = data.driver_name.toUpperCase().trim();
            if (data.driver_cpf !== undefined)
                updates.driver_cpf = data.driver_cpf;
            if (data.driver_phone !== undefined)
                updates.driver_phone = data.driver_phone;
            if (data.carrier !== undefined)
                updates.carrier = data.carrier.toUpperCase().trim();
            if (data.max_weight_kg !== undefined)
                updates.max_weight_kg = data.max_weight_kg;
            if (data.max_volume_m3 !== undefined)
                updates.max_volume_m3 = data.max_volume_m3;
            if (data.max_pallets !== undefined)
                updates.max_pallets = data.max_pallets;
            if (data.status !== undefined)
                updates.status = data.status;
            const { data: updated, error: updateErr } = await supabase
                .from('vehicles')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (updateErr) {
                throw updateErr;
            }
            logAudit('VEHICLE_UPDATED', req, `Veículo atualizado: ${updates.plate || vehicle.plate}`);
            res.status(200).json({ success: true, message: 'Veículo atualizado com sucesso.', data: updated });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao atualizar veículo: ' + error.message });
        }
    },
    delete: async (req, res) => {
        try {
            const id = req.params.id;
            // Verificar se possui cargas atreladas
            const { data: loads, error: loadErr } = await supabase
                .from('load_assemblies')
                .select('id')
                .eq('vehicle_id', id)
                .limit(1);
            if (loads && loads.length > 0) {
                res.status(400).json({
                    success: false,
                    message: 'Não é possível excluir o veículo pois existem montagens de carga vinculadas a ele.',
                });
                return;
            }
            const { error: deleteErr } = await supabase.from('vehicles').delete().eq('id', id);
            if (deleteErr) {
                throw deleteErr;
            }
            logAudit('VEHICLE_DELETED', req, `Veículo excluído ID: ${id}`);
            res.status(200).json({ success: true, message: 'Veículo excluído com sucesso.' });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao excluir veículo: ' + error.message });
        }
    },
};
