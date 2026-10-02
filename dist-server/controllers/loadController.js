import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';
import { logAudit } from '../middlewares/security.js';
import { sapService } from '../services/sapServiceLayer.js';
import { LoadOptimizer } from '../services/loadOptimizer.js';
import { PdfGeneratorService } from '../services/pdfGenerator.js';
const createLoadSchema = z.object({
    vehicleId: z.string().min(1, 'Veículo é obrigatório'),
    docEntries: z.array(z.number()).min(1, 'Selecione ao menos 1 pedido para a carga'),
    branchId: z.number().optional(),
    docNumber: z.number().optional(),
    observations: z.string().optional(),
    orders: z.array(z.any()).optional(),
});
function extractItemDetails(item) {
    let lines = [];
    let salesPersonName = item.sales_person_name;
    let salesPersonCode = item.sales_person_code;
    if (item.items_json) {
        let parsed = item.items_json;
        if (typeof parsed === 'string') {
            try {
                parsed = JSON.parse(parsed);
            }
            catch {
                parsed = null;
            }
        }
        if (Array.isArray(parsed)) {
            lines = parsed;
        }
        else if (parsed && typeof parsed === 'object') {
            lines = Array.isArray(parsed.lines) ? parsed.lines : [];
            if (!salesPersonName && parsed.salesPersonName)
                salesPersonName = parsed.salesPersonName;
            if (!salesPersonCode && parsed.salesPersonCode)
                salesPersonCode = parsed.salesPersonCode;
        }
    }
    return { lines, salesPersonName, salesPersonCode };
}
export const loadController = {
    /**
     * Simula e calcula a ocupação da carga antes de salvar
     */
    calculate: async (req, res) => {
        try {
            const { vehicleId, docEntries } = req.body;
            if (!vehicleId || !Array.isArray(docEntries)) {
                res.status(400).json({ success: false, message: 'Parâmetros inválidos.' });
                return;
            }
            const { data: vehicle, error: vErr } = await supabase
                .from('vehicles')
                .select('*')
                .eq('id', vehicleId)
                .single();
            if (vErr || !vehicle) {
                res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
                return;
            }
            const allOrders = await sapService.getOpenOrders();
            const selectedOrders = allOrders.filter(o => docEntries.includes(o.DocEntry));
            const vehicleCap = {
                id: vehicle.id,
                plate: vehicle.plate,
                model: vehicle.model,
                maxWeightKg: vehicle.max_weight_kg,
                maxVolumeM3: vehicle.max_volume_m3,
                maxPallets: vehicle.max_pallets,
            };
            const result = LoadOptimizer.calculateOccupancy(vehicleCap, selectedOrders);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao calcular ocupação da carga: ' + error.message });
        }
    },
    /**
     * Otimização inteligente automática de carga
     */
    autoOptimize: async (req, res) => {
        try {
            const { vehicleId, targetCity } = req.body;
            if (!vehicleId) {
                res.status(400).json({ success: false, message: 'Veículo é obrigatório para otimização.' });
                return;
            }
            const { data: vehicle, error: vErr } = await supabase
                .from('vehicles')
                .select('*')
                .eq('id', vehicleId)
                .single();
            if (vErr || !vehicle) {
                res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
                return;
            }
            const allOrders = await sapService.getOpenOrders();
            const vehicleCap = {
                id: vehicle.id,
                plate: vehicle.plate,
                model: vehicle.model,
                maxWeightKg: vehicle.max_weight_kg,
                maxVolumeM3: vehicle.max_volume_m3,
                maxPallets: vehicle.max_pallets,
            };
            const result = LoadOptimizer.autoPackLoad(vehicleCap, allOrders, targetCity);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro na auto-otimização: ' + error.message });
        }
    },
    /**
     * Cria e salva a montagem de carga diretamente no Supabase
     */
    create: async (req, res) => {
        try {
            const parsed = createLoadSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ success: false, message: 'Dados inválidos.', errors: parsed.error.format() });
                return;
            }
            const { vehicleId, docEntries, branchId, docNumber: customDocNumber, observations, orders: payloadOrders } = parsed.data;
            const { data: vehicle, error: vErr } = await supabase
                .from('vehicles')
                .select('*')
                .eq('id', vehicleId)
                .single();
            if (vErr || !vehicle) {
                res.status(404).json({ success: false, message: 'Veículo não encontrado.' });
                return;
            }
            // Obtém pedidos com máxima confiabilidade (payload direto ou busca SAP resiliente)
            let selectedOrders = [];
            if (Array.isArray(payloadOrders) && payloadOrders.length > 0) {
                selectedOrders = payloadOrders;
            }
            else {
                const allOrders = await sapService.getOpenOrders();
                selectedOrders = allOrders.filter(o => docEntries.includes(o.DocEntry));
                if (selectedOrders.length < docEntries.length) {
                    const foundEntries = new Set(selectedOrders.map(o => o.DocEntry));
                    for (const docEntry of docEntries) {
                        if (!foundEntries.has(docEntry)) {
                            const singleOrder = await sapService.getOrderByDocEntry(docEntry);
                            if (singleOrder) {
                                selectedOrders.push(singleOrder);
                            }
                        }
                    }
                }
            }
            if (selectedOrders.length === 0) {
                res.status(400).json({ success: false, message: 'Nenhum dos pedidos selecionados foi localizado no SAP.' });
                return;
            }
            // Determina filial
            const targetBranchId = branchId || selectedOrders[0]?.BPLId || 1;
            let { data: branch } = await supabase
                .from('branches')
                .select('*')
                .eq('id', targetBranchId)
                .maybeSingle();
            if (!branch) {
                const { data: firstBranch } = await supabase
                    .from('branches')
                    .select('*')
                    .order('id', { ascending: true })
                    .limit(1)
                    .maybeSingle();
                branch = firstBranch;
            }
            // Nº Documento (customizado ou sequencial da filial)
            const docNumber = customDocNumber !== undefined ? customDocNumber : (branch?.current_doc_number || 7195);
            // Incrementa o sequenciador da filial para a próxima montagem
            if (branch) {
                await supabase
                    .from('branches')
                    .update({ current_doc_number: docNumber + 1 })
                    .eq('id', branch.id);
            }
            // Calcula totais
            let totalWeight = 0;
            let totalVolume = 0;
            let totalPallets = 0;
            let totalValue = 0;
            const citiesSet = new Set();
            selectedOrders.forEach(o => {
                totalWeight += Number(o.TotalWeightKg || 0);
                totalVolume += Number(o.TotalVolumeM3 || 0);
                totalPallets += Number(o.EstimatedPallets || 1);
                totalValue += Number(o.DocTotal || 0);
                citiesSet.add(`${o.ShipToCity || 'Belém'}/${o.ShipToState || 'PA'}`);
            });
            // Gerar número sequencial único da carga (Ex: MC-2026-0001)
            const year = new Date().getFullYear();
            const { data: existingLoads } = await supabase
                .from('load_assemblies')
                .select('load_number')
                .ilike('load_number', `MC-${year}-%`);
            let maxSeq = 0;
            if (existingLoads && existingLoads.length > 0) {
                for (const l of existingLoads) {
                    const match = l.load_number?.match(/^MC-\d{4}-(\d+)$/);
                    if (match) {
                        const seq = parseInt(match[1], 10);
                        if (!isNaN(seq) && seq > maxSeq) {
                            maxSeq = seq;
                        }
                    }
                }
            }
            let nextSeqNum = maxSeq + 1;
            let loadNumber = `MC-${year}-${nextSeqNum.toString().padStart(4, '0')}`;
            let loadId = 'load-' + uuidv4().substring(0, 8);
            const nowIso = new Date().toISOString();
            // 1. Grava montagem de carga no Supabase com retry contra duplicidade
            let loadInsertErr = null;
            for (let attempt = 0; attempt < 5; attempt++) {
                loadNumber = `MC-${year}-${(nextSeqNum + attempt).toString().padStart(4, '0')}`;
                loadId = 'load-' + uuidv4().substring(0, 8);
                const { error: err } = await supabase.from('load_assemblies').insert({
                    id: loadId,
                    load_number: loadNumber,
                    branch_id: branch ? branch.id : null,
                    doc_number: docNumber,
                    vehicle_id: vehicle.id,
                    status: 'closed',
                    closed_at: nowIso,
                    total_weight_kg: Number(totalWeight.toFixed(2)),
                    total_volume_m3: Number(totalVolume.toFixed(2)),
                    total_pallets: totalPallets,
                    total_value: Number(totalValue.toFixed(2)),
                    order_count: selectedOrders.length,
                    destination_cities: Array.from(citiesSet).join(', '),
                    observations: observations || '',
                    created_by: req.user?.name || 'Operador',
                });
                if (!err) {
                    loadInsertErr = null;
                    break;
                }
                loadInsertErr = err;
                if (err.message && (err.message.includes('load_number') || err.code === '23505')) {
                    continue;
                }
                else {
                    break;
                }
            }
            if (loadInsertErr) {
                throw loadInsertErr;
            }
            // 2. Grava itens vinculados no Supabase
            const itemsToInsert = selectedOrders.map((o) => ({
                id: 'item-' + uuidv4().substring(0, 8),
                load_id: loadId,
                doc_entry: o.DocEntry,
                doc_num: o.DocNum,
                card_code: o.CardCode,
                card_name: o.CardName,
                ship_to_city: o.ShipToCity || 'Belém',
                ship_to_state: o.ShipToState || 'PA',
                weight_kg: Number(o.TotalWeightKg || 0),
                volume_m3: Number(o.TotalVolumeM3 || 0),
                pallets: Number(o.EstimatedPallets || 1),
                doc_total: Number(o.DocTotal || 0),
                doc_date: o.DocDate || '',
                num_at_card: o.NumAtCard || '',
                items_json: {
                    lines: o.DocumentLines || [],
                    salesPersonCode: o.SalesPersonCode,
                    salesPersonName: o.SalesPersonName,
                },
            }));
            const { error: itemsInsertErr } = await supabase.from('load_items').insert(itemsToInsert);
            if (itemsInsertErr) {
                throw itemsInsertErr;
            }
            // 3. Atualiza status do veículo para 'loading'
            await supabase.from('vehicles').update({ status: 'loading' }).eq('id', vehicle.id);
            logAudit('LOAD_CREATED', req, `Carga ${loadNumber} (Doc: ${docNumber}) criada com ${selectedOrders.length} pedidos. Veículo: ${vehicle.plate}`);
            const createdLoad = {
                id: loadId,
                load_number: loadNumber,
                branch_id: branch?.id,
                branch_name: branch?.name,
                branch_code: branch?.code,
                doc_number: docNumber,
                vehicle_id: vehicle.id,
                plate: vehicle.plate,
                model: vehicle.model,
                driver_name: vehicle.driver_name,
                carrier: vehicle.carrier,
                status: 'closed',
                total_weight_kg: totalWeight,
                total_volume_m3: totalVolume,
                total_pallets: totalPallets,
                total_value: totalValue,
                order_count: selectedOrders.length,
            };
            res.status(201).json({
                success: true,
                message: `Montagem de Carga ${loadNumber} criada com sucesso!`,
                data: createdLoad,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao criar montagem de carga: ' + error.message });
        }
    },
    /**
     * Lista todas as montagens de carga
     */
    list: async (req, res) => {
        try {
            const { data: loads, error } = await supabase
                .from('load_assemblies')
                .select(`
          *,
          vehicles (
            plate,
            model,
            vehicle_type,
            driver_name,
            carrier,
            max_weight_kg,
            max_volume_m3,
            max_pallets
          ),
          branches (
            id,
            code,
            name,
            logo_url
          )
        `)
                .order('created_at', { ascending: false });
            if (error) {
                throw error;
            }
            // Consulta itens de carga diretamente para garantir 100% de disponibilidade de dados
            const { data: allItems } = await supabase
                .from('load_items')
                .select('*');
            const itemsByLoadId = new Map();
            (allItems || []).forEach((item) => {
                const list = itemsByLoadId.get(item.load_id) || [];
                list.push(item);
                itemsByLoadId.set(item.load_id, list);
            });
            const formattedLoads = (loads || []).map((l) => {
                const rawItems = itemsByLoadId.get(l.id) || [];
                const clientNames = Array.from(new Set(rawItems.map((it) => it.card_name).filter(Boolean)));
                const salesPersons = Array.from(new Set(rawItems.map((it) => {
                    const { salesPersonName } = extractItemDetails(it);
                    return salesPersonName;
                }).filter(Boolean)));
                return {
                    ...l,
                    plate: l.vehicles?.plate,
                    vehicle_model: l.vehicles?.model,
                    vehicle_type: l.vehicles?.vehicle_type,
                    driver_name: l.vehicles?.driver_name,
                    carrier: l.vehicles?.carrier,
                    vehicle_max_weight: l.vehicles?.max_weight_kg,
                    vehicle_max_volume: l.vehicles?.max_volume_m3,
                    vehicle_max_pallets: l.vehicles?.max_pallets,
                    branch_name: l.branches?.name,
                    branch_code: l.branches?.code,
                    branch_logo_url: l.branches?.logo_url,
                    client_names: clientNames,
                    sales_persons: salesPersons,
                    load_items: rawItems,
                };
            });
            res.status(200).json({ success: true, count: formattedLoads.length, data: formattedLoads });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao listar montagens de carga: ' + error.message });
        }
    },
    /**
     * Busca detalhes completos de uma montagem de carga
     */
    getById: async (req, res) => {
        try {
            const { id } = req.params;
            const { data: load, error: loadErr } = await supabase
                .from('load_assemblies')
                .select(`
          *,
          vehicles (
            plate,
            model,
            vehicle_type,
            driver_name,
            driver_cpf,
            driver_phone,
            carrier,
            max_weight_kg,
            max_volume_m3,
            max_pallets
          ),
          branches (
            id,
            code,
            name,
            cnpj,
            logo_url
          )
        `)
                .eq('id', id)
                .single();
            if (loadErr || !load) {
                res.status(404).json({ success: false, message: 'Montagem de carga não encontrada.' });
                return;
            }
            const { data: items } = await supabase
                .from('load_items')
                .select('*')
                .eq('load_id', id)
                .order('doc_num', { ascending: true });
            const formattedLoad = {
                ...load,
                plate: load.vehicles?.plate,
                vehicle_model: load.vehicles?.model,
                vehicle_type: load.vehicles?.vehicle_type,
                driver_name: load.vehicles?.driver_name,
                driver_cpf: load.vehicles?.driver_cpf,
                driver_phone: load.vehicles?.driver_phone,
                carrier: load.vehicles?.carrier,
                vehicle_max_weight: load.vehicles?.max_weight_kg,
                vehicle_max_volume: load.vehicles?.max_volume_m3,
                vehicle_max_pallets: load.vehicles?.max_pallets,
                branch_name: load.branches?.name,
                branch_code: load.branches?.code,
                branch_cnpj: load.branches?.cnpj,
                branch_logo_url: load.branches?.logo_url,
                items: (items || []).map((item) => {
                    const { lines, salesPersonName, salesPersonCode } = extractItemDetails(item);
                    return {
                        ...item,
                        sales_person_name: salesPersonName,
                        sales_person_code: salesPersonCode,
                        items_details: lines,
                    };
                }),
            };
            res.status(200).json({
                success: true,
                data: formattedLoad,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao buscar detalhes da carga: ' + error.message });
        }
    },
    /**
     * Finaliza e fecha uma montagem de carga no sistema Petruz Cargas
     */
    finalizeLoad: async (req, res) => {
        try {
            const { id } = req.params;
            const { data: load, error: fetchErr } = await supabase
                .from('load_assemblies')
                .select('id, load_number, vehicle_id')
                .eq('id', id)
                .single();
            if (fetchErr || !load) {
                res.status(404).json({ success: false, message: 'Carga não encontrada.' });
                return;
            }
            const closedAt = new Date().toISOString();
            await supabase
                .from('load_assemblies')
                .update({ status: 'closed', closed_at: closedAt })
                .eq('id', id);
            await supabase.from('vehicles').update({ status: 'in_transit' }).eq('id', load.vehicle_id);
            logAudit('LOAD_FINALIZED', req, `Carga ${load.load_number} finalizada no sistema Petruz Cargas.`);
            res.status(200).json({
                success: true,
                message: `Montagem ${load.load_number} finalizada e liberada para expedição!`,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao finalizar montagem de carga: ' + error.message });
        }
    },
    /**
     * Status da carga (Processo 100% interno no Petruz Cargas)
     */
    syncWithSap: async (req, res) => {
        res.status(200).json({
            success: true,
            message: 'O processo de carga é gerenciado 100% internamente no Petruz Cargas.',
        });
    },
    /**
     * Gera e transmite o PDF de Conferência de Lotes Lokfrio
     */
    downloadPdf: async (req, res) => {
        try {
            const { id } = req.params;
            const { data: load, error: fetchErr } = await supabase
                .from('load_assemblies')
                .select(`
          *,
          vehicles (
            plate,
            model,
            vehicle_type,
            driver_name,
            driver_cpf,
            driver_phone,
            carrier,
            max_weight_kg,
            max_volume_m3,
            max_pallets
          ),
          branches (
            id,
            code,
            name,
            cnpj,
            logo_url
          )
        `)
                .eq('id', id)
                .single();
            if (fetchErr || !load) {
                res.status(404).json({ success: false, message: 'Carga não encontrada.' });
                return;
            }
            // Título do Layout de Impressão (via query param ?title=..., configuração global ou padrão)
            const queryTitle = typeof req.query.title === 'string' && req.query.title.trim() ? req.query.title.trim() : null;
            // Configurações globais
            const { data: titleSetting } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'pdf_conference_title')
                .maybeSingle();
            const conferenceTitle = queryTitle || titleSetting?.value || 'CONFERÊNCIA DE LOTES LOKFRIO';
            const { data: items } = await supabase
                .from('load_items')
                .select('*')
                .eq('load_id', id)
                .order('doc_num', { ascending: true });
            const loadItems = items || [];
            // Agrupa produtos por ItemCode & ItemDescription com lista de clientes e subtotais
            const productGroupMap = new Map();
            loadItems.forEach((item) => {
                const { lines } = extractItemDetails(item);
                if (lines.length > 0) {
                    lines.forEach((line) => {
                        const key = line.ItemCode || line.ItemDescription || 'PROD-GEN';
                        const itemCode = line.ItemCode || '00000';
                        const itemDesc = line.ItemDescription || 'PRODUTO NÃO ESPECIFICADO';
                        const qty = Number(line.Quantity) || 1;
                        if (!productGroupMap.has(key)) {
                            productGroupMap.set(key, {
                                itemCode,
                                itemDescription: itemDesc,
                                clients: [],
                                totalQuantity: 0,
                            });
                        }
                        const group = productGroupMap.get(key);
                        group.clients.push({
                            cardCode: item.card_code,
                            cardName: item.card_name,
                            quantity: qty,
                            docNum: item.doc_num,
                        });
                        group.totalQuantity += qty;
                    });
                }
                else {
                    const key = 'PEDIDO-' + item.doc_num;
                    productGroupMap.set(key, {
                        itemCode: 'PED-' + item.doc_num,
                        itemDescription: `Pedido #${item.doc_num} - ${item.ship_to_city}/${item.ship_to_state}`,
                        clients: [{
                                cardCode: item.card_code,
                                cardName: item.card_name,
                                quantity: 1,
                                docNum: item.doc_num,
                            }],
                        totalQuantity: 1,
                    });
                }
            });
            const productGroups = Array.from(productGroupMap.values());
            const pdfData = {
                loadNumber: load.load_number,
                docNumber: String(load.doc_number || load.load_number.replace(/\D/g, '') || '7195'),
                createdAt: load.created_at,
                closedAt: load.closed_at,
                createdByName: load.created_by,
                observations: load.observations,
                conferenceTitle,
                branch: {
                    id: load.branches?.id || 1,
                    code: load.branches?.code || '01',
                    name: load.branches?.name || 'Petruz - Matriz Castanhal (PA)',
                    cnpj: load.branches?.cnpj,
                    logoUrl: load.branches?.logo_url,
                },
                vehicle: {
                    plate: load.vehicles?.plate || 'SEM PLACA',
                    model: load.vehicles?.model || 'VEÍCULO',
                    vehicleType: load.vehicles?.vehicle_type || 'Truck',
                    driverName: load.vehicles?.driver_name || 'MOTORISTA',
                    driverCpf: load.vehicles?.driver_cpf,
                    carrier: load.vehicles?.carrier || 'TRANSPORTADORA',
                },
                totalWeightKg: load.total_weight_kg,
                totalVolumeM3: load.total_volume_m3,
                totalPallets: load.total_pallets,
                totalValue: load.total_value,
                orderCount: load.order_count,
                productGroups,
                orders: loadItems.map((item) => ({
                    docNum: item.doc_num,
                    docEntry: item.doc_entry,
                    cardCode: item.card_code,
                    cardName: item.card_name,
                    shipToCity: item.ship_to_city,
                    shipToState: item.ship_to_state,
                    weightKg: item.weight_kg,
                    volumeM3: item.volume_m3,
                    docTotal: item.doc_total,
                })),
            };
            const pdfBuffer = await PdfGeneratorService.generateLoadManifestPdf(pdfData);
            logAudit('PDF_GENERATED', req, `PDF de Conferência de Lotes gerado para a carga ${load.load_number} (Doc: ${pdfData.docNumber})`);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="Conferencia_Lotes_${pdfData.docNumber}.pdf"`);
            res.send(pdfBuffer);
        }
        catch (error) {
            console.error('Erro na geração do PDF:', error);
            res.status(500).json({ success: false, message: 'Erro ao gerar documento PDF: ' + error.message });
        }
    },
    /**
     * Remove um pedido vinculado a uma carga existente e recalcula os totais
     */
    removeOrderItem: async (req, res) => {
        try {
            const { id, itemId } = req.params;
            const { data: load, error: fetchErr } = await supabase
                .from('load_assemblies')
                .select('*')
                .eq('id', id)
                .single();
            if (fetchErr || !load) {
                res.status(404).json({ success: false, message: 'Carga não encontrada.' });
                return;
            }
            const { data: item } = await supabase
                .from('load_items')
                .select('*')
                .eq('id', itemId)
                .eq('load_id', id)
                .single();
            if (!item) {
                res.status(404).json({ success: false, message: 'Item/Pedido não encontrado nesta carga.' });
                return;
            }
            // Remove o item do Supabase
            await supabase.from('load_items').delete().eq('id', itemId);
            // Recalcula totais restantes
            const { data: remainingItems } = await supabase
                .from('load_items')
                .select('*')
                .eq('load_id', id);
            const itemsList = remainingItems || [];
            let newWeight = 0;
            let newVolume = 0;
            let newPallets = 0;
            let newValue = 0;
            const citiesSet = new Set();
            itemsList.forEach((it) => {
                newWeight += it.weight_kg;
                newVolume += it.volume_m3;
                newPallets += it.pallets;
                newValue += it.doc_total;
                citiesSet.add(`${it.ship_to_city}/${it.ship_to_state}`);
            });
            if (itemsList.length === 0) {
                await supabase
                    .from('load_assemblies')
                    .update({
                    status: 'cancelled',
                    order_count: 0,
                    total_weight_kg: 0,
                    total_volume_m3: 0,
                    total_pallets: 0,
                    total_value: 0,
                })
                    .eq('id', id);
                await supabase.from('vehicles').update({ status: 'available' }).eq('id', load.vehicle_id);
            }
            else {
                await supabase
                    .from('load_assemblies')
                    .update({
                    total_weight_kg: Number(newWeight.toFixed(2)),
                    total_volume_m3: Number(newVolume.toFixed(2)),
                    total_pallets: newPallets,
                    total_value: Number(newValue.toFixed(2)),
                    order_count: itemsList.length,
                    destination_cities: Array.from(citiesSet).join(', '),
                })
                    .eq('id', id);
            }
            logAudit('ORDER_REMOVED_FROM_LOAD', req, `Pedido #${item.doc_num} removido da carga ${load.load_number}`);
            res.status(200).json({
                success: true,
                message: `Pedido #${item.doc_num} desvinculado da carga com sucesso.`,
                data: {
                    remainingCount: itemsList.length,
                    totalWeightKg: newWeight,
                    totalVolumeM3: newVolume,
                },
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao desvincular pedido: ' + error.message });
        }
    },
    /**
     * Exclui / Desmonta uma carga existente liberando o veículo (Requer justificativa obrigatória)
     */
    deleteLoad: async (req, res) => {
        try {
            const { id } = req.params;
            const justification = (req.body?.justification || req.query?.justification || '').toString().trim();
            if (!justification || justification.length < 5) {
                res.status(400).json({
                    success: false,
                    message: 'A justificativa para a desmontagem da carga é obrigatória (mínimo 5 caracteres).',
                });
                return;
            }
            const { data: load, error: fetchErr } = await supabase
                .from('load_assemblies')
                .select('*')
                .eq('id', id)
                .single();
            if (fetchErr || !load) {
                res.status(404).json({ success: false, message: 'Carga não encontrada.' });
                return;
            }
            // Remove itens e a montagem de carga no Supabase
            await supabase.from('load_items').delete().eq('load_id', id);
            await supabase.from('load_assemblies').delete().eq('id', id);
            // Libera o veículo para disponível no Supabase
            await supabase.from('vehicles').update({ status: 'available' }).eq('id', load.vehicle_id);
            logAudit('LOAD_DISASSEMBLED', req, `Carga ${load.load_number} desmontada. Justificativa: "${justification}". Veículo liberado.`);
            res.status(200).json({
                success: true,
                message: `Carga ${load.load_number} desmontada com sucesso e registrada na auditoria. Veículo liberado.`,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao desmontar carga: ' + error.message });
        }
    },
};
