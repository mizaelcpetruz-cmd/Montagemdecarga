import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'operator';
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const queryToken = req.query.token as string | undefined;
  const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null) || queryToken;

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Acesso não autorizado. Token de autenticação ausente.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({
      success: false,
      message: 'Sessão expirada ou token inválido. Faça login novamente.',
    });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
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
