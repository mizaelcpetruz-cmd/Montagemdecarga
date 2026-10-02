import { Response } from 'express';
import { supabase } from '../config/supabase.js';
import { AuthRequest } from '../middlewares/auth.js';

export const auditController = {
  /**
   * Consulta logs de auditoria sob demanda com filtros por data inicial/final e busca
   */
  list: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, search, action, limit = 100, offset = 0 } = req.query;

      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' });

      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`);
      }

      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`);
      }

      if (action) {
        query = query.eq('action', action);
      }

      if (search) {
        query = query.or(
          `action.ilike.%${search}%,user_name.ilike.%${search}%,details.ilike.%${search}%,ip_address.ilike.%${search}%`
        );
      }

      const numLimit = Number(limit) || 100;
      const numOffset = Number(offset) || 0;

      query = query
        .order('created_at', { ascending: false })
        .range(numOffset, numOffset + numLimit - 1);

      const { data: logs, count, error } = await query;

      if (error) {
        throw error;
      }

      res.status(200).json({
        success: true,
        total: count || (logs ? logs.length : 0),
        count: logs ? logs.length : 0,
        data: logs || [],
      });
    } catch (error: any) {
      console.error('Erro ao buscar logs de auditoria:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar logs de auditoria: ' + error.message });
    }
  },

  /**
   * Exporta os logs filtrados para arquivo CSV formatado
   */
  exportCsv: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, search, action } = req.query;

      let query = supabase.from('audit_logs').select('*');

      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`);
      }

      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`);
      }

      if (action) {
        query = query.eq('action', action);
      }

      if (search) {
        query = query.or(
          `action.ilike.%${search}%,user_name.ilike.%${search}%,details.ilike.%${search}%,ip_address.ilike.%${search}%`
        );
      }

      query = query.order('created_at', { ascending: false }).limit(5000);

      const { data: logs, error } = await query;

      if (error) {
        throw error;
      }

      const logsList = logs || [];

      // Cabeçalhos CSV
      const headers = ['Data/Hora', 'Ação', 'Usuário', 'Detalhes do Evento', 'Endereço IP'];

      const csvRows = [
        headers.join(';'),
        ...logsList.map((l: any) => {
          const dateStr = l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : '';
          const actionClean = `"${(l.action || '').replace(/"/g, '""')}"`;
          const userClean = `"${(l.user_name || '').replace(/"/g, '""')}"`;
          const detailsClean = `"${(l.details || '').replace(/"/g, '""')}"`;
          const ipClean = `"${(l.ip_address || '').replace(/"/g, '""')}"`;
          return [dateStr, actionClean, userClean, detailsClean, ipClean].join(';');
        }),
      ];

      // Adiciona BOM UTF-8 (\uFEFF) para compatibilidade nativa com Microsoft Excel
      const csvContent = '\uFEFF' + csvRows.join('\r\n');
      const filename = `Logs_Auditoria_${startDate || 'Inicio'}_a_${endDate || 'Fim'}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csvContent);
    } catch (error: any) {
      console.error('Erro ao exportar logs de auditoria:', error);
      res.status(500).json({ success: false, message: 'Erro ao exportar logs: ' + error.message });
    }
  },
};
