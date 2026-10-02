import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { ENV } from '../config/env.js';
import { logAudit } from '../middlewares/security.js';
import { emailService } from '../services/emailService.js';
const loginSchema = z.object({
    email: z.string().email('E-mail em formato inválido'),
    password: z.string().min(1, 'A senha é obrigatória'),
});
// Armazenamento em memória dos tokens de recuperação de senha com validade de 15 minutos
const passwordResetTokens = new Map();
export const authController = {
    login: async (req, res) => {
        try {
            const parsed = loginSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({
                    success: false,
                    message: 'Dados de login inválidos.',
                    errors: parsed.error.format(),
                });
                return;
            }
            const { email, password } = parsed.data;
            const { data: user, error } = await supabase
                .from('users')
                .select('id, name, email, password_hash, role, is_active')
                .eq('email', email.toLowerCase().trim())
                .maybeSingle();
            if (error || !user || !user.is_active) {
                logAudit('LOGIN_FAILED', req, `Tentativa com e-mail inexistente/inativo: ${email}`);
                res.status(401).json({
                    success: false,
                    message: 'Credenciais inválidas ou conta inativa.',
                });
                return;
            }
            const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
            if (!isPasswordValid) {
                logAudit('LOGIN_FAILED', req, `Senha incorreta para o usuário: ${email}`);
                res.status(401).json({
                    success: false,
                    message: 'Credenciais inválidas.',
                });
                return;
            }
            const mustChangePassword = password === '1234';
            const payload = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            };
            const token = jwt.sign(payload, ENV.JWT_SECRET, {
                expiresIn: '8h',
            });
            const authReq = req;
            authReq.user = payload;
            logAudit('LOGIN_SUCCESS', authReq, `Usuário autenticado: ${user.name} (${user.role})`);
            res.status(200).json({
                success: true,
                message: 'Login realizado com sucesso.',
                data: {
                    token,
                    user: payload,
                    mustChangePassword,
                },
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erro interno ao processar autenticação: ' + error.message,
            });
        }
    },
    me: async (req, res) => {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Não autenticado.' });
            return;
        }
        try {
            const { data: user, error } = await supabase
                .from('users')
                .select('id, name, email, role, created_at')
                .eq('id', req.user.id)
                .single();
            if (error || !user) {
                res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
                return;
            }
            res.status(200).json({
                success: true,
                data: user,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao buscar perfil: ' + error.message });
        }
    },
    changePassword: async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Não autenticado.' });
                return;
            }
            const schema = z.object({
                currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
                newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
            });
            const parsed = schema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({
                    success: false,
                    message: 'Dados inválidos.',
                    errors: parsed.error.format(),
                });
                return;
            }
            const { currentPassword, newPassword } = parsed.data;
            const { data: user, error } = await supabase
                .from('users')
                .select('id, password_hash, email, name')
                .eq('id', req.user.id)
                .single();
            if (error || !user) {
                res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
                return;
            }
            const isCurrentValid = bcrypt.compareSync(currentPassword, user.password_hash);
            if (!isCurrentValid) {
                res.status(400).json({ success: false, message: 'A senha atual informada está incorreta.' });
                return;
            }
            const newHash = bcrypt.hashSync(newPassword, 10);
            await supabase
                .from('users')
                .update({
                password_hash: newHash,
                updated_at: new Date().toISOString(),
            })
                .eq('id', req.user.id);
            logAudit('PASSWORD_CHANGED', req, `Senha alterada com sucesso para o usuário: ${user.name}`);
            res.status(200).json({
                success: true,
                message: 'Senha alterada com sucesso!',
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao alterar senha: ' + error.message });
        }
    },
    forgotPassword: async (req, res) => {
        try {
            const { email } = req.body;
            if (!email) {
                res.status(400).json({ success: false, message: 'E-mail é obrigatório.' });
                return;
            }
            const { data: user } = await supabase
                .from('users')
                .select('id, name, email, is_active')
                .eq('email', email.toLowerCase().trim())
                .maybeSingle();
            if (!user) {
                res.status(200).json({
                    success: true,
                    message: 'Se o e-mail informado estiver cadastrado, as instruções e código de redefinição foram enviados.',
                });
                return;
            }
            const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
            // Salva o código com validade de 15 minutos
            passwordResetTokens.set(user.email.toLowerCase().trim(), {
                code: resetCode,
                expiresAt: Date.now() + 15 * 60 * 1000,
            });
            logAudit('PASSWORD_RESET_REQUESTED', req, `Solicitação de redefinição de senha para ${user.name} (${user.email}). Código gerado: ${resetCode}`);
            // Envio de E-mail via Nodemailer / SMTP
            const emailResult = await emailService.sendPasswordResetEmail(user.email, user.name, resetCode);
            res.status(200).json({
                success: true,
                message: emailResult.sent
                    ? `E-mail de recuperação enviado com sucesso para ${user.email}!`
                    : `Instruções enviadas para ${user.email}. ${emailResult.message}`,
                data: {
                    email: user.email,
                    simulatedCode: emailResult.simulated ? resetCode : undefined,
                    sent: emailResult.sent,
                },
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao processar solicitação: ' + error.message });
        }
    },
    /**
     * Valida o código recebido por e-mail e define a nova senha do usuário
     */
    resetPasswordWithCode: async (req, res) => {
        try {
            const { email, code, newPassword } = req.body;
            if (!email || !code || !newPassword) {
                res.status(400).json({ success: false, message: 'E-mail, código e nova senha são obrigatórios.' });
                return;
            }
            if (newPassword.length < 6) {
                res.status(400).json({ success: false, message: 'A nova senha deve ter no mínimo 6 caracteres.' });
                return;
            }
            const emailKey = email.toLowerCase().trim();
            const tokenData = passwordResetTokens.get(emailKey);
            if (!tokenData || tokenData.code !== String(code).trim() || Date.now() > tokenData.expiresAt) {
                res.status(400).json({
                    success: false,
                    message: 'Código de verificação inválido ou expirado. Por favor, solicite um novo código.',
                });
                return;
            }
            const { data: user, error: fetchErr } = await supabase
                .from('users')
                .select('id, name, email')
                .eq('email', emailKey)
                .maybeSingle();
            if (fetchErr || !user) {
                res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
                return;
            }
            const newHash = bcrypt.hashSync(newPassword, 10);
            const { error: updateErr } = await supabase
                .from('users')
                .update({
                password_hash: newHash,
                updated_at: new Date().toISOString(),
            })
                .eq('id', user.id);
            if (updateErr) {
                throw updateErr;
            }
            // Remove o token utilizado
            passwordResetTokens.delete(emailKey);
            logAudit('PASSWORD_RESET_COMPLETED', req, `Senha redefinida com sucesso via código de e-mail para o usuário ${user.name}`);
            res.status(200).json({
                success: true,
                message: 'Senha redefinida com sucesso! Você já pode realizar o login com sua nova senha.',
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao redefinir senha: ' + error.message });
        }
    },
};
