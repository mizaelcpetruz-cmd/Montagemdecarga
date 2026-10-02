/**
 * Classe customizada para tratamento de erros operacionais da aplicação
 * Permite definir código HTTP, código de erro e detalhes extras
 */
export class AppError extends Error {
    statusCode;
    isOperational;
    code;
    details;
    constructor(message, statusCode = 400, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
    static badRequest(message, code, details) {
        return new AppError(message, 400, code, details);
    }
    static unauthorized(message = 'Acesso não autorizado', code = 'UNAUTHORIZED') {
        return new AppError(message, 401, code);
    }
    static forbidden(message = 'Acesso negado para esta operação', code = 'FORBIDDEN') {
        return new AppError(message, 403, code);
    }
    static notFound(message = 'Recurso não encontrado', code = 'NOT_FOUND') {
        return new AppError(message, 404, code);
    }
    static conflict(message, code = 'CONFLICT') {
        return new AppError(message, 409, code);
    }
    static unprocessable(message, code = 'UNPROCESSABLE_ENTITY', details) {
        return new AppError(message, 422, code, details);
    }
    static internal(message = 'Erro interno do servidor', code = 'INTERNAL_ERROR') {
        return new AppError(message, 500, code);
    }
}
