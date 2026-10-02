import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';
import { logAudit } from '../middlewares/security.js';
const createUserSchema = z.object({
    name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
    email: z.string().email('E-mail em formato inválido'),
    password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
    role: z.enum(['admin', 'supervisor', 'operator']).default('operator'),
});
export const userController = {
    /**
     * Lista todos os usuários do sistema (Apenas Admin)
     */
    list: async (req, res) => {
        try {
            const { data: users, error } = await supabase
                .from('users')
                .select('id, name, email, role, is_active, created_at, updated_at')
                .order('created_at', { ascending: false });
            if (error) {
                throw error;
            }
            res.status(200).json({
                success: true,
                data: users || [],
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao listar usuários: ' + error.message });
        }
    },
    /**
     * Cadastra um novo usuário no sistema (Apenas Admin)
     */
    create: async (req, res) => {
        try {
            const parsed = createUserSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({
                    success: false,
                    message: 'Dados de usuário inválidos.',
                    errors: parsed.error.format(),
                });
                return;
            }
            const { name, email, password, role } = parsed.data;
            // Verifica duplicidade de e-mail
            const { data: existing } = await supabase
                .from('users')
                .select('id')
                .eq('email', email.toLowerCase().trim())
                .maybeSingle();
            if (existing) {
                res.status(400).json({ success: false, message: 'Já existe um usuário com este e-mail cadastrado.' });
                return;
            }
            const id = 'usr-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
            const passwordHash = bcrypt.hashSync(password, 10);
            const formattedName = name.toUpperCase().trim();
            const formattedEmail = email.toLowerCase().trim();
            const { error: insertError } = await supabase.from('users').insert({
                id,
                name: formattedName,
                email: formattedEmail,
                password_hash: passwordHash,
                role,
                is_active: 1,
            });
            if (insertError) {
                throw insertError;
            }
            logAudit('USER_CREATED', req, `Novo usuário cadastrado: ${formattedName} (${formattedEmail}) com perfil ${role}`);
            res.status(201).json({
                success: true,
                message: 'Usuário cadastrado com sucesso!',
                data: { id, name: formattedName, email: formattedEmail, role, is_active: 1 },
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao criar usuário: ' + error.message });
        }
    },
    /**
     * Atualiza os dados de um usuário (Nome, E-mail, Perfil, Senha opcional)
     */
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, email, role, password, is_active } = req.body;
            if (!name || !email) {
                res.status(400).json({ success: false, message: 'Nome e e-mail são obrigatórios.' });
                return;
            }
            const formattedName = String(name).toUpperCase().trim();
            const formattedEmail = String(email).toLowerCase().trim();
            // Verifica duplicidade de e-mail com outro usuário
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', formattedEmail)
                .neq('id', id)
                .maybeSingle();
            if (existingUser) {
                res.status(400).json({ success: false, message: 'Este e-mail já está sendo utilizado por outro usuário.' });
                return;
            }
            const updatePayload = {
                name: formattedName,
                email: formattedEmail,
                updated_at: new Date().toISOString(),
            };
            if (role && ['admin', 'supervisor', 'operator'].includes(role)) {
                updatePayload.role = role;
            }
            if (typeof is_active === 'number' || typeof is_active === 'boolean') {
                updatePayload.is_active = Number(is_active);
            }
            if (password && String(password).trim().length >= 6) {
                updatePayload.password_hash = bcrypt.hashSync(String(password).trim(), 10);
            }
            const { data: updated, error: updateErr } = await supabase
                .from('users')
                .update(updatePayload)
                .eq('id', id)
                .select('id, name, email, role, is_active, updated_at')
                .single();
            if (updateErr) {
                throw updateErr;
            }
            logAudit('USER_UPDATED', req, `Usuário ${formattedName} (${formattedEmail}) atualizado com sucesso`);
            res.status(200).json({
                success: true,
                message: 'Usuário atualizado com sucesso!',
                data: updated,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao atualizar usuário: ' + error.message });
        }
    },
    /**
     * Bloqueia ou Desbloqueia o acesso de um usuário (Apenas Admin)
     */
    toggleStatus: async (req, res) => {
        try {
            const { id } = req.params;
            if (req.user?.id === id) {
                res.status(400).json({ success: false, message: 'Você não pode bloquear o seu próprio usuário.' });
                return;
            }
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, name, email, is_active, role')
                .eq('id', id)
                .single();
            if (userError || !user) {
                res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
                return;
            }
            const newStatus = user.is_active === 1 ? 0 : 1;
            const { error: updateError } = await supabase
                .from('users')
                .update({ is_active: newStatus, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (updateError) {
                throw updateError;
            }
            const actionDesc = newStatus === 1 ? 'desbloqueado' : 'bloqueado';
            logAudit('USER_STATUS_TOGGLED', req, `Usuário ${user.name} (${user.email}) foi ${actionDesc}`);
            res.status(200).json({
                success: true,
                message: `Usuário ${user.name} foi ${actionDesc} com sucesso.`,
                data: { id, is_active: newStatus },
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao alterar status do usuário: ' + error.message });
        }
    },
    /**
     * Administrador altera a senha de um usuário
     */
    resetPassword: async (req, res) => {
        try {
            const { id } = req.params;
            const { newPassword } = req.body;
            if (!newPassword || newPassword.length < 6) {
                res.status(400).json({ success: false, message: 'A nova senha deve ter no mínimo 6 caracteres.' });
                return;
            }
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, name, email')
                .eq('id', id)
                .single();
            if (userError || !user) {
                res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
                return;
            }
            const passwordHash = bcrypt.hashSync(newPassword, 10);
            const { error: updateError } = await supabase
                .from('users')
                .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (updateError) {
                throw updateError;
            }
            logAudit('ADMIN_RESET_PASSWORD', req, `Senha redefinida pelo admin para o usuário: ${user.name}`);
            res.status(200).json({
                success: true,
                message: `Senha do usuário ${user.name} alterada com sucesso!`,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao redefinir senha: ' + error.message });
        }
    },
};
