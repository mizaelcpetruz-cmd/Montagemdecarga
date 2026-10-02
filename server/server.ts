import express from 'express';
import helmet from 'helmet';
import { ENV } from './config/env.js';
import { corsMiddleware } from './config/cors.js';
import { initDatabase } from './config/database.js';
import { apiRateLimiter, sanitizeInput } from './middlewares/security.js';
import { errorHandler } from './errors/ErrorHandler.js';
import apiRoutes from './routes/index.js';

const app = express();

// 1. Inicializa banco de dados Supabase PostgreSQL Cloud
initDatabase().catch((err) => {
  console.warn('⚠️ Supabase Database Init Warning:', err.message);
});

// 2. Middlewares de Segurança de Cabeçalhos HTTP (Helmet)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Permite streaming de PDFs no frontend
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'http:', 'https:', 'ws:', 'wss:'],
        frameSrc: ["'self'", 'blob:', 'data:'],
        objectSrc: ["'self'", 'blob:', 'data:'],
      },
    },
    referrerPolicy: { policy: 'no-referrer-when-downgrade' },
    xContentTypeOptions: true,
  })
);

// 3. Middleware de CORS Estrito
app.use(corsMiddleware);

// 4. Parser de Requisições com limite seguro contra DoS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Sanitização de Entrada contra caracteres maliciosos
app.use(sanitizeInput);

// 6. Rate Limiter Global da API
app.use('/api', apiRateLimiter);

// 7. Registro Central de Rotas
app.use('/api', apiRoutes);

// 8. Rota raiz e Health check direto
app.get('/', (req, res) => {
  res.json({
    name: 'Petruz Montagem de Carga API',
    version: '1.0.0',
    status: 'healthy',
    documentation: '/api/health',
  });
});

// 9. Middleware de Rota Não Encontrada (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `A rota ${req.method} ${req.originalUrl} não foi encontrada no servidor.`,
  });
});

// 10. Tratamento Global de Exceções e Erros da Aplicação
app.use(errorHandler);

// 11. Inicialização do Servidor HTTP
const server = app.listen(ENV.PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 SERVIDOR BACKEND INICIADO COM SUCESSO!`);
  console.log(`📍 URL LOCAL: http://localhost:${ENV.PORT}`);
  console.log(`🛡️  PADRÕES DE SEGURANÇA: Helmet, CORS Whitelist, RateLimit, Zod, JWT`);
  console.log(`🌐 SAP SERVICE LAYER: ${ENV.SAP_MOCK_MODE ? 'Simulador Ativo (Mock)' : ENV.SAP_SERVICE_LAYER_URL}`);
  console.log(`📦 SUPABASE POSTGRESQL: Conexão Cloud Configurada`);
  console.log(`====================================================`);
});

// Tratamento amigável de porta em uso
server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ [AVISO] A porta ${ENV.PORT} já está ocupada por outro processo.`);
    console.error(`👉 Finalize a instância anterior ou configure uma nova porta na variável PORT do arquivo .env.\n`);
    process.exit(1);
  } else {
    console.error('❌ Erro fatal ao iniciar o servidor:', err);
    process.exit(1);
  }
});

// Tratamento de encerramento gracioso (Graceful Shutdown)
function handleShutdown(signal: string) {
  console.log(`\n🛑 Recebido sinal ${signal}. Encerrando servidor com segurança...`);
  server.close(() => {
    console.log('✅ Servidor backend finalizado com sucesso.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export default app;
