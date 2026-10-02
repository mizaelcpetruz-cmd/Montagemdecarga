import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();
const envSchema = z.object({
    PORT: z.coerce.number().default(5000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    JWT_SECRET: z.string().default('super-secure-jwt-secret-key-montagem-de-carga-2026!#$@'),
    JWT_EXPIRES_IN: z.string().default('8h'),
    // Supabase Database Configuration
    SUPABASE_URL: z.string().default(''),
    SUPABASE_KEY: z.string().default(''),
    // SAP Business One Service Layer Configuration
    SAP_SERVICE_LAYER_URL: z.string().default('https://sap-server.local:50000/b1s/v1'),
    SAP_COMPANY_DB: z.string().default('SBO_PETRUZ'),
    SAP_USERNAME: z.string().default('manager'),
    SAP_PASSWORD: z.string().default('1234'),
    SAP_MOCK_MODE: z.preprocess(val => val === true || val === 'true' || val === '1', z.boolean().default(false)),
    // Security & Rate Limiting
    CORS_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().default(300),
    // SMTP Email Server Configuration
    SMTP_HOST: z.string().default(''),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_USER: z.string().default(''),
    SMTP_PASS: z.string().default(''),
    SMTP_FROM: z.string().default('Petruz Cargas <no-reply@petruz.com>'),
    SMTP_SECURE: z.preprocess(val => val === true || val === 'true' || val === '1', z.boolean().default(false)),
});
const parsed = envSchema.safeParse({
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    SAP_SERVICE_LAYER_URL: process.env.SAP_SERVICE_LAYER_URL,
    SAP_COMPANY_DB: process.env.SAP_COMPANY_DB,
    SAP_USERNAME: process.env.SAP_USERNAME,
    SAP_PASSWORD: process.env.SAP_PASSWORD,
    SAP_MOCK_MODE: process.env.SAP_MOCK_MODE,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
    SMTP_SECURE: process.env.SMTP_SECURE,
});
if (!parsed.success) {
    console.error('❌ Erro na validação das variáveis de ambiente (.env):', parsed.error.format());
    process.exit(1);
}
export const ENV = parsed.data;
