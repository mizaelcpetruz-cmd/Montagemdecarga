import { ZodError } from 'zod';
/**
 * Middleware para validação rigorosa de schemas Zod em rotas
 */
export function validateRequest(schemas) {
    return async (req, res, next) => {
        try {
            if (schemas.body) {
                req.body = await schemas.body.parseAsync(req.body);
            }
            if (schemas.query) {
                req.query = await schemas.query.parseAsync(req.query);
            }
            if (schemas.params) {
                req.params = await schemas.params.parseAsync(req.params);
            }
            next();
        }
        catch (error) {
            if (error instanceof ZodError) {
                res.status(400).json({
                    success: false,
                    code: 'VALIDATION_ERROR',
                    message: 'Falha na validação dos dados de entrada.',
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
                return;
            }
            next(error);
        }
    };
}
