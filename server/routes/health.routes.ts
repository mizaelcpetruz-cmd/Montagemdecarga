import { Router } from 'express';
import { checkSupabaseHealth } from '../config/supabase.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'Petruz Montagem de Carga API',
  });
});

router.get('/system/health', async (req, res) => {
  const health = await checkSupabaseHealth();
  res.status(200).json({ success: true, ...health });
});

export default router;
