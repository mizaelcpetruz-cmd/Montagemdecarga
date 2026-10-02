import { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';

export const branchController = {
  list: async (req: Request, res: Response) => {
    try {
      const { data: branches, error } = await supabase
        .from('branches')
        .select('id, code, name, cnpj, logo_url, current_doc_number, is_active, created_at')
        .order('id', { ascending: true });

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        data: branches || [],
      });
    } catch (err: any) {
      console.error('Erro ao listar filiais:', err);
      return res.status(500).json({ success: false, message: 'Erro ao listar filiais: ' + err.message });
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { data: branch, error } = await supabase
        .from('branches')
        .select('id, code, name, cnpj, logo_url, current_doc_number, is_active, created_at')
        .eq('id', Number(id))
        .single();

      if (error || !branch) {
        return res.status(404).json({ success: false, message: 'Filial não encontrada.' });
      }

      return res.json({ success: true, data: branch });
    } catch (err: any) {
      console.error('Erro ao buscar filial:', err);
      return res.status(500).json({ success: false, message: 'Erro ao buscar filial: ' + err.message });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, cnpj, logo_url, current_doc_number, is_active } = req.body;

      // Validação do número de documento (até 7 dígitos: 1 a 9999999)
      let docNumber = current_doc_number !== undefined ? Number(current_doc_number) : undefined;
      if (docNumber !== undefined && (isNaN(docNumber) || docNumber < 1 || docNumber > 9999999)) {
        return res.status(400).json({
          success: false,
          message: 'O Nº Documento deve ser um valor numérico entre 1 e 9.999.999 (até 7 dígitos).',
        });
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name ? name.toUpperCase().trim() : null;
      if (cnpj !== undefined) updates.cnpj = cnpj;
      if (logo_url !== undefined) updates.logo_url = logo_url;
      if (docNumber !== undefined) updates.current_doc_number = docNumber;
      if (is_active !== undefined) updates.is_active = is_active ? 1 : 0;

      const { data: updated, error } = await supabase
        .from('branches')
        .update(updates)
        .eq('id', Number(id))
        .select()
        .single();

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        message: 'Dados da filial atualizados com sucesso.',
        data: updated,
      });
    } catch (err: any) {
      console.error('Erro ao atualizar filial:', err);
      return res.status(500).json({ success: false, message: 'Erro ao atualizar filial: ' + err.message });
    }
  },

  adjustDocNumber: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { action, value } = req.body; // action: 'increment' | 'decrement' | 'set'

      const { data: branch, error: fetchErr } = await supabase
        .from('branches')
        .select('id, current_doc_number')
        .eq('id', Number(id))
        .single();

      if (fetchErr || !branch) {
        return res.status(404).json({ success: false, message: 'Filial não encontrada.' });
      }

      let newNumber = branch.current_doc_number;

      if (action === 'increment') {
        newNumber = Math.min(9999999, newNumber + 1);
      } else if (action === 'decrement') {
        newNumber = Math.max(1, newNumber - 1);
      } else if (action === 'set' && value !== undefined) {
        const parsed = Number(value);
        if (isNaN(parsed) || parsed < 1 || parsed > 9999999) {
          return res.status(400).json({
            success: false,
            message: 'O Nº Documento deve ser um número entre 1 e 9.999.999.',
          });
        }
        newNumber = parsed;
      }

      const { error: updateErr } = await supabase
        .from('branches')
        .update({ current_doc_number: newNumber })
        .eq('id', Number(id));

      if (updateErr) {
        throw updateErr;
      }

      return res.json({
        success: true,
        message: `Nº Documento da filial ajustado para ${newNumber}.`,
        data: { id: branch.id, current_doc_number: newNumber },
      });
    } catch (err: any) {
      console.error('Erro ao ajustar Nº Documento:', err);
      return res.status(500).json({ success: false, message: 'Erro ao ajustar Nº Documento: ' + err.message });
    }
  },

  toggleStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { data: branch, error: fetchErr } = await supabase
        .from('branches')
        .select('id, code, is_active')
        .eq('id', Number(id))
        .single();

      if (fetchErr || !branch) {
        return res.status(404).json({ success: false, message: 'Filial não encontrada.' });
      }

      const newStatus = branch.is_active ? 0 : 1;
      const { error: updateErr } = await supabase
        .from('branches')
        .update({ is_active: newStatus })
        .eq('id', Number(id));

      if (updateErr) {
        throw updateErr;
      }

      return res.json({
        success: true,
        message: `Filial ${branch.code} ${newStatus ? 'ativada' : 'desativada'} com sucesso.`,
        data: { id: branch.id, is_active: newStatus },
      });
    } catch (err: any) {
      console.error('Erro ao alternar status da filial:', err);
      return res.status(500).json({ success: false, message: 'Erro ao alternar status da filial: ' + err.message });
    }
  },

  /**
   * Sincroniza filiais ativas do SAP Business One Service Layer diretamente com o Supabase
   */
  syncFromSap: async (req: Request, res: Response) => {
    try {
      const { sapService } = await import('../services/sapServiceLayer.js');
      const sapBranches = await sapService.getActiveBranches();

      for (const b of sapBranches) {
        const code = String(b.BPLID).padStart(2, '0');
        const { data: existing } = await supabase
          .from('branches')
          .select('id')
          .eq('id', b.BPLID)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('branches')
            .update({
              code,
              name: (b.BPLName || '').toUpperCase().trim(),
              cnpj: b.FederalTaxID || null,
            })
            .eq('id', b.BPLID);
        } else {
          await supabase.from('branches').insert({
            id: b.BPLID,
            code,
            name: (b.BPLName || '').toUpperCase().trim(),
            cnpj: b.FederalTaxID || '',
            current_doc_number: 7195,
            is_active: 1,
          });
        }
      }

      const { data: allBranches } = await supabase
        .from('branches')
        .select('*')
        .order('id', { ascending: true });

      return res.json({
        success: true,
        message: `${sapBranches.length} filiais sincronizadas do SAP Service Layer com sucesso.`,
        data: allBranches || [],
      });
    } catch (err: any) {
      console.error('Erro ao sincronizar filiais do SAP:', err);
      return res.status(500).json({ success: false, message: 'Erro ao sincronizar filiais do SAP: ' + err.message });
    }
  },

  /**
   * Salva todas as filiais modificadas em lote diretamente no Supabase
   */
  batchUpdate: async (req: Request, res: Response) => {
    try {
      const { branches } = req.body;
      if (!Array.isArray(branches)) {
        return res.status(400).json({ success: false, message: 'Dados inválidos. O corpo deve conter uma lista de filiais.' });
      }

      for (const b of branches) {
        let docNumber = b.current_doc_number !== undefined ? Number(b.current_doc_number) : undefined;
        if (docNumber !== undefined && (isNaN(docNumber) || docNumber < 1 || docNumber > 9999999)) {
          docNumber = 7195;
        }

        const updates: any = {};
        if (b.name !== undefined) updates.name = b.name ? b.name.toUpperCase().trim() : null;
        if (b.cnpj !== undefined) updates.cnpj = b.cnpj;
        if (b.logo_url !== undefined) updates.logo_url = b.logo_url;
        if (docNumber !== undefined) updates.current_doc_number = docNumber;
        if (b.is_active !== undefined) updates.is_active = b.is_active ? 1 : 0;

        await supabase.from('branches').update(updates).eq('id', b.id);
      }

      const { data: updated } = await supabase
        .from('branches')
        .select('*')
        .order('id', { ascending: true });

      return res.json({
        success: true,
        message: 'Todas as alterações das filiais foram salvas com sucesso no Supabase!',
        data: updated || [],
      });
    } catch (err: any) {
      console.error('Erro ao salvar filiais em lote:', err);
      return res.status(500).json({ success: false, message: 'Erro ao salvar filiais: ' + err.message });
    }
  },
};
