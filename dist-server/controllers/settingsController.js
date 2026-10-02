import { supabase } from '../config/supabase.js';
export const settingsController = {
    getSettings: async (req, res) => {
        try {
            const { data: rows, error } = await supabase
                .from('system_settings')
                .select('key, value, updated_at');
            if (error) {
                throw error;
            }
            const settingsMap = {};
            for (const row of rows || []) {
                settingsMap[row.key] = row.value;
            }
            return res.json({
                success: true,
                data: settingsMap,
            });
        }
        catch (err) {
            console.error('Erro ao buscar configurações:', err);
            return res.status(500).json({ success: false, message: 'Erro ao carregar configurações: ' + err.message });
        }
    },
    updateSettings: async (req, res) => {
        try {
            const { settings } = req.body; // { key: value }
            if (!settings || typeof settings !== 'object') {
                return res.status(400).json({ success: false, message: 'Configurações inválidas.' });
            }
            const upsertData = Object.entries(settings).map(([key, val]) => ({
                key,
                value: String(val),
                updated_at: new Date().toISOString(),
            }));
            const { error } = await supabase
                .from('system_settings')
                .upsert(upsertData, { onConflict: 'key' });
            if (error) {
                throw error;
            }
            return res.json({
                success: true,
                message: 'Configurações salvas com sucesso no Supabase.',
            });
        }
        catch (err) {
            console.error('Erro ao salvar configurações:', err);
            return res.status(500).json({ success: false, message: 'Erro ao salvar configurações: ' + err.message });
        }
    },
};
