import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Encapsula funções assíncronas de rotas e controllers do Express,
 * repassando automaticamente qualquer exceção para o middleware global de erros.
 */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as T, res, next)).catch(next);
  };
}
