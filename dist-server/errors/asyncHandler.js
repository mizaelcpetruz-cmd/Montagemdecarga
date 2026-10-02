/**
 * Encapsula funções assíncronas de rotas e controllers do Express,
 * repassando automaticamente qualquer exceção para o middleware global de erros.
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
