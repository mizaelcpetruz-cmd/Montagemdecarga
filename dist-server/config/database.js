import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { supabase } from './supabase.js';
export { supabase };
/**
 * Inicialização do Banco de Dados Supabase (PostgreSQL Cloud)
 * Remove resquícios de SQLite local e garante o usuário padrão grupo-ti@petruz.com
 */
export async function initDatabase() {
    console.log('⚡ Conectando ao Banco de Dados Supabase PostgreSQL Cloud...');
    // 1. Limpeza do arquivo SQLite local (se existir)
    try {
        const dbDir = path.resolve(process.cwd(), 'data');
        const dbPath = path.join(dbDir, 'montagem_carga.sqlite');
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
            console.log('🗑️ Arquivo local montagem_carga.sqlite excluído com sucesso.');
        }
        if (fs.existsSync(dbDir)) {
            try {
                fs.rmdirSync(dbDir);
            }
            catch (_) { }
        }
    }
    catch (err) {
        console.warn('Aviso na limpeza do SQLite:', err.message);
    }
    // 2. Garantir Administrador Padrão (grupo-ti@petruz.com / senha inicial: 1234) no Supabase
    try {
        const defaultEmail = 'grupo-ti@petruz.com';
        const { data: existingAdmin, error: adminQueryError } = await supabase
            .from('users')
            .select('id, password_hash')
            .eq('email', defaultEmail)
            .maybeSingle();
        if (adminQueryError) {
            console.warn('⚠️ Supabase users check:', adminQueryError.message);
        }
        else if (!existingAdmin) {
            const passwordHash = await bcrypt.hash('1234', 10);
            const { error: insertAdminErr } = await supabase.from('users').insert({
                id: 'usr-grupoti01',
                name: 'GRUPO TI - PETRUZ FRUITY',
                email: defaultEmail,
                password_hash: passwordHash,
                role: 'admin',
                is_active: 1,
            });
            if (insertAdminErr) {
                console.warn('⚠️ Não foi possível criar admin padrão no Supabase:', insertAdminErr.message);
            }
            else {
                console.log(`✅ Usuário Administrador (${defaultEmail}) criado com sucesso no Supabase.`);
            }
        }
    }
    catch (err) {
        console.warn('⚠️ Erro ao verificar admin no Supabase:', err.message);
    }
    // 3. Garantir Configurações Globais Iniciais no Supabase
    try {
        const { error: settingsErr } = await supabase.from('system_settings').upsert([
            { key: 'pdf_conference_title', value: 'CONFERÊNCIA DE LOTES LOKFRIO' },
            { key: 'global_doc_number', value: '7195' },
            { key: 'default_branch_id', value: '1' },
        ]);
        if (!settingsErr) {
            console.log('✅ Configurações do sistema sincronizadas no Supabase.');
        }
    }
    catch (err) {
        console.warn('⚠️ Erro ao inicializar configurações no Supabase:', err.message);
    }
}
