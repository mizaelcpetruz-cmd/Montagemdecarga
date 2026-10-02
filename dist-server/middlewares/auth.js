import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const queryToken = req.query.token;
    const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null) || queryToken;
    if (!token) {
        res.status(401).json({
            success: false,
            message: 'Acesso não autorizado. Token de autenticação ausente.',
        });
        return;
    }
    try {
        const decoded = jwt.verify(token, ENV.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        res.status(403).json({
            success: false,
            message: 'Sessão expirada ou token inválido. Faça login novamente.',
        });
    }
}
export function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: 'Acesso negado. Seu perfil de usuário não possui permissão para esta operação.',
            });
            return;
        }
        next();
    };
}
