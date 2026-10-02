import cors, { CorsOptions } from 'cors';
import { ENV } from './env.js';

/**
 * Lista de origens permitidas em desenvolvimento e produção
 */
const allowedOrigins = ENV.CORS_ORIGIN
  ? ENV.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5000'];

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Permite chamadas server-to-server ou ferramentas locais (curl, postman) sem origin
    if (!origin) return callback(null, true);

    // Em modo de desenvolvimento, permite origens localhost e rede local
    if (ENV.NODE_ENV === 'development') {
      if (
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
    } else {
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
    }

    callback(new Error(`Origem não permitida pela política CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Disposition'],
  maxAge: 86400, // 24 horas de cache para preflight requests
};

export const corsMiddleware = cors(corsOptions);
