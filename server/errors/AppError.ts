/**
 * Classe customizada para tratamento de erros operacionais da aplicação
 * Permite definir código HTTP, código de erro e detalhes extras
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly details?: any;

  constructor(message: string, statusCode = 400, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    this.details = details;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code?: string, details?: any): AppError {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message = 'Acesso não autorizado', code = 'UNAUTHORIZED'): AppError {
    return new AppError(message, 401, code);
  }

  static forbidden(message = 'Acesso negado para esta operação', code = 'FORBIDDEN'): AppError {
    return new AppError(message, 403, code);
  }

  static notFound(message = 'Recurso não encontrado', code = 'NOT_FOUND'): AppError {
    return new AppError(message, 404, code);
  }

  static conflict(message: string, code = 'CONFLICT'): AppError {
    return new AppError(message, 409, code);
  }

  static unprocessable(message: string, code = 'UNPROCESSABLE_ENTITY', details?: any): AppError {
    return new AppError(message, 422, code, details);
  }

  static internal(message = 'Erro interno do servidor', code = 'INTERNAL_ERROR'): AppError {
    return new AppError(message, 500, code);
  }
}
