import { sapService } from '../services/sapServiceLayer.js';
import { logAudit } from '../middlewares/security.js';
export const sapController = {
    getOrders: async (req, res) => {
        try {
            const { city, state, search, startDate, endDate, branchId, salesPerson } = req.query;
            const parsedBranchId = branchId && !isNaN(Number(branchId)) ? Number(branchId) : undefined;
            const orders = await sapService.getOpenOrders({
                branchId: parsedBranchId,
                city,
                state,
                search,
                startDate,
                endDate,
                salesPerson,
            });
            res.status(200).json({
                success: true,
                count: orders.length,
                data: orders,
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar pedidos no SAP Service Layer: ' + error.message,
            });
        }
    },
    getOrderDetails: async (req, res) => {
        try {
            const docEntry = Number(req.params.docEntry);
            if (isNaN(docEntry)) {
                res.status(400).json({ success: false, message: 'DocEntry inválido.' });
                return;
            }
            const order = await sapService.getOrderByDocEntry(docEntry);
            if (!order) {
                res.status(404).json({ success: false, message: 'Pedido não encontrado no SAP.' });
                return;
            }
            res.status(200).json({ success: true, data: order });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao buscar detalhes do pedido no SAP.' });
        }
    },
    getStatus: async (req, res) => {
        try {
            const status = await sapService.getStatus();
            res.status(200).json({
                success: true,
                data: status,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao consultar status da Service Layer.' });
        }
    },
    toggleMockMode: async (req, res) => {
        try {
            const { enabled } = req.body;
            sapService.setMockMode(Boolean(enabled));
            logAudit('SAP_MODE_TOGGLED', req, `Modo Mock alterado para: ${Boolean(enabled)}`);
            const status = await sapService.getStatus();
            res.status(200).json({
                success: true,
                message: `Modo SAP alterado para: ${status.mode.toUpperCase()}`,
                data: status,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao alterar modo SAP.' });
        }
    },
};
