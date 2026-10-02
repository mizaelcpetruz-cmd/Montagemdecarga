import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from './AppError.js';
import { ENV } from '../config/env.js';

export function errorHandler(
  err: Error | AppError | ZodError | any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Tratamento de Erros Operacionais (AppError)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      details: err.details,
    });
    return;
  }

  // 2. Tratamento de Erros de Validação do Zod
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Os dados fornecidos são inválidos.',
      errors: formattedErrors,
    });
    return;
  }

  // 3. Erro de Payload JSON Malformado
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      code: 'INVALID_JSON',
      message: 'O corpo da requisição contém um JSON inválido.',
    });
    return;
  }

  // 4. Log do erro não tratado no servidor
  console.error(`❌ [SERVER ERROR] ${req.method} ${req.originalUrl}:`, err);

  // 5. Resposta segura para o cliente (sem vazamento de dados internos)
  const isDev = ENV.NODE_ENV === 'development';
  res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.',
    error: isDev ? err.message : undefined,
    stack: isDev ? err.stack : undefined,
  });
}
