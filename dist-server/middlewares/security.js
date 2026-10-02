import rateLimit from 'express-rate-limit';
import { supabase } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';
// Rate Limiter estrito para Login e Autenticação (proteção contra força bruta)
export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 15, // Máximo 15 tentativas por IP por janela
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: {
        success: false,
        code: 'TOO_MANY_REQUESTS',
        message: 'Muitas tentativas de login a partir deste IP. Por segurança, aguarde 15 minutos antes de tentar novamente.',
    },
});
// Rate Limiter para Recuperação de Senha
export const passwordResetRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Máximo 5 solicitações de código por IP
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: {
        success: false,
        code: 'TOO_MANY_REQUESTS',
        message: 'Limite de solicitações de recuperação de senha excedido. Aguarde 15 minutos.',
    },
});
// Rate Limiter Geral para a API
export const apiRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 300, // 300 requisições por minuto por IP
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: {
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Limite de requisições excedido. Por favor, reduza a frequência das requisições.',
    },
});
/**
 * Middleware para sanitização de strings contra caracteres nulos e perigosos
 */
export function sanitizeInput(req, _res, next) {
    if (req.body && typeof req.body === 'object') {
        sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        sanitizeObject(req.query);
    }
    next();
}
function sanitizeObject(obj) {
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === 'string') {
            obj[key] = val.replace(/\0/g, '');
        }
        else if (val && typeof val === 'object') {
            sanitizeObject(val);
        }
    }
}
/**
 * Logger de Auditoria seguro no Supabase Cloud (execução assíncrona não bloqueante)
 */
export async function logAudit(action, req, details) {
    // Dispara assincronamente sem travar a thread principal
    (async () => {
        try {
            const logId = 'log-' + uuidv4().substring(0, 12);
            const userId = req.user?.id || 'anonymous';
            const userName = req.user?.name || req.body?.email || 'Desconhecido';
            const ip = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '127.0.0.1';
            const { error } = await supabase
                .from('audit_logs')
                .insert({
                id: logId,
                user_id: userId,
                user_name: userName,
                action,
                details: details ? details.substring(0, 2000) : '',
                ip_address: typeof ip === 'string' ? ip.split(',')[0].trim() : '127.0.0.1',
            });
            if (error) {
                console.warn('⚠️ Falha ao registrar log de auditoria no Supabase:', error.message);
            }
        }
        catch (err) {
            console.warn('⚠️ Erro no logAudit:', err?.message);
        }
    })();
}
