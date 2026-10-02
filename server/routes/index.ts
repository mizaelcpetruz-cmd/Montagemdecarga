import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import branchRoutes from './branch.routes.js';
import vehicleRoutes from './vehicle.routes.js';
import sapRoutes from './sap.routes.js';
import loadRoutes from './load.routes.js';
import settingsRoutes from './settings.routes.js';
import auditRoutes from './audit.routes.js';

const router = Router();

// 1. Health Checks e Integridade
router.use('/', healthRoutes);

// 2. Autenticação e Gestão de Sessões
router.use('/auth', authRoutes);

// 3. Usuários e Perfis de Acesso (RBAC)
router.use('/users', userRoutes);

// 4. Filiais e Sequenciador de Documentos
router.use('/branches', branchRoutes);

// 5. Veículos e Gestão de Frotas
router.use('/vehicles', vehicleRoutes);

// 6. Integração SAP Business One Service Layer
router.use('/sap', sapRoutes);

// 7. Montagem e Otimização de Carga
router.use('/loads', loadRoutes);

// 8. Configurações Globais da Aplicação
router.use('/settings', settingsRoutes);

// 9. Auditoria e Logs de Conformidade
router.use('/audit-logs', auditRoutes);

export default router;
