import React, { useState, useEffect } from 'react';
import { branchService, userService, auditService, sapService, settingsService } from '../services/api';
import { Branch, User, AuditLog, SapStatus } from '../types';
import { 
  Building2, 
  Settings, 
  Plus, 
  Minus, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Hash,
  UploadCloud,
  Users,
  Search,
  X,
  ShieldAlert,
  Server,
  Calendar,
  Filter,
  FileSpreadsheet,
  Edit2,
  FileText,
  Type
} from 'lucide-react';
import { UserModal } from '../components/UserModal';

// Componente Seletor Liga/Desliga no estilo iPhone (iOS Switch)
const IosToggleSwitch: React.FC<{
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none shadow-inner ${
        checked ? 'bg-[#34C759]' : 'bg-slate-300 dark:bg-slate-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={checked ? 'Empresa Ativa (Clique para desativar)' : 'Empresa Inativa (Clique para ativar)'}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'branches' | 'users' | 'audit'>('branches');

  // Estados SAP Service Layer
  const [sapStatus, setSapStatus] = useState<SapStatus | null>(null);
  const [isTestingSap, setIsTestingSap] = useState(false);
  const [isSapDiagnosticModalOpen, setIsSapDiagnosticModalOpen] = useState(false);

  // Estados de Filiais
  const [branches, setBranches] = useState<Branch[]>([]);
  const [originalBranches, setOriginalBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [isSavingAllBranches, setIsSavingAllBranches] = useState(false);
  const [isConfirmSaveBranchesModalOpen, setIsConfirmSaveBranchesModalOpen] = useState(false);

  // Estados de Gestão de Usuários
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);

  // Estados do Layout de Impressão (PDF / Romaneio)
  const [pdfLayoutTitle, setPdfLayoutTitle] = useState('CONFERÊNCIA DE LOTES LOKFRIO');
  const [isSavingLayoutTitle, setIsSavingLayoutTitle] = useState(false);

  // Estados de Logs de Auditoria (Consulta Sob Demanda Otimizada)
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultStartStr = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const [auditStartDate, setAuditStartDate] = useState(defaultStartStr);
  const [auditEndDate, setAuditEndDate] = useState(todayStr);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [hasFilteredAudit, setHasFilteredAudit] = useState(false);
  const [isExportingAudit, setIsExportingAudit] = useState(false);

  // Notificações
  const [notification, setNotification] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // Carregar dados
  const fetchSapStatus = async () => {
    try {
      setIsTestingSap(true);
      const data = await sapService.getStatus();
      setSapStatus(data);
      return data;
    } catch (err: any) {
      console.error('Erro ao verificar status SAP:', err);
      const fallbackStatus: SapStatus = {
        connected: false,
        mode: 'real',
        serverUrl: '',
        companyDb: '',
        message: err.response?.data?.message || err.message || 'Falha de comunicação com o servidor.',
        lastChecked: new Date().toISOString(),
      };
      setSapStatus(fallbackStatus);
      return fallbackStatus;
    } finally {
      setIsTestingSap(false);
    }
  };

  const handleTestSapConnection = async () => {
    const status = await fetchSapStatus();
    setIsSapDiagnosticModalOpen(true);
    if (status?.connected) {
      setNotification({
        type: 'success',
        message: `✓ Conexão bem-sucedida com SAP Service Layer! (${status.companyDb})`,
      });
    } else {
      setNotification({
        type: 'error',
        message: `✕ Falha na conexão SAP: ${status?.message || 'Servidor indisponível'}`,
      });
    }
  };

  const fetchBranches = async () => {
    try {
      setLoadingBranches(true);
      const data = await branchService.list();
      setBranches(data);
      setOriginalBranches(JSON.parse(JSON.stringify(data)));
    } catch (err: any) {
      console.error('Erro ao carregar filiais:', err);
      setNotification({ type: 'error', message: 'Erro ao carregar filiais da empresa.' });
    } finally {
      setLoadingBranches(false);
    }
  };

  // Sincroniza filiais ativas diretamente do SAP Service Layer
  const handleSyncBranchesFromSap = async () => {
    try {
      setLoadingBranches(true);
      const res = await branchService.syncFromSap();
      setBranches(res.data);
      setOriginalBranches(JSON.parse(JSON.stringify(res.data)));
      setNotification({
        type: 'success',
        message: res.message || 'Filiais ativas sincronizadas do SAP Service Layer com sucesso!',
      });
    } catch (err: any) {
      console.error('Erro ao sincronizar filiais do SAP:', err);
      setNotification({ type: 'error', message: 'Erro ao sincronizar filiais do SAP Service Layer.' });
    } finally {
      setLoadingBranches(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await userService.list();
      setUsers(data);
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err);
      setNotification({ type: 'error', message: 'Erro ao carregar lista de usuários.' });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Consulta de logs sob demanda acionada pelo usuário
  const handleFilterAuditLogs = async () => {
    try {
      setLoadingAudit(true);
      const data = await auditService.list({
        startDate: auditStartDate,
        endDate: auditEndDate,
        search: auditSearch,
      });
      setAuditLogs(data);
      setHasFilteredAudit(true);
    } catch (err: any) {
      console.error('Erro ao carregar logs de auditoria:', err);
      setNotification({ type: 'error', message: 'Erro ao consultar logs de auditoria.' });
    } finally {
      setLoadingAudit(false);
    }
  };

  // Exportação de logs para CSV formatado
  const handleExportAuditCsv = async () => {
    try {
      setIsExportingAudit(true);
      await auditService.exportCsv({
        startDate: auditStartDate,
        endDate: auditEndDate,
        search: auditSearch,
      });
      setNotification({ type: 'success', message: 'Arquivo CSV de logs exportado com sucesso!' });
    } catch (err: any) {
      console.error('Erro ao exportar logs:', err);
      setNotification({ type: 'error', message: 'Erro ao exportar logs de auditoria.' });
    } finally {
      setIsExportingAudit(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await settingsService.getSettings();
      if ((data as any)?.pdf_conference_title) {
        setPdfLayoutTitle((data as any).pdf_conference_title);
      }
    } catch (err) {
      console.error('Erro ao buscar configurações:', err);
    }
  };

  const handleSaveLayoutTitle = async () => {
    try {
      setIsSavingLayoutTitle(true);
      await settingsService.updateSettings({
        pdf_conference_title: pdfLayoutTitle.trim().toUpperCase() || 'CONFERÊNCIA DE LOTES LOKFRIO',
      });
      setNotification({
        type: 'success',
        message: 'Título padrão do Layout de Impressão salvo com sucesso no Supabase!',
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Erro ao salvar título do layout.',
      });
    } finally {
      setIsSavingLayoutTitle(false);
    }
  };

  useEffect(() => {
    fetchSapStatus();
    fetchBranches();
    fetchUsers();
    fetchSettings();
    // Logs não são carregados na montagem inicial para máxima leveza do sistema
  }, []);

  // Alternar status Liga/Desliga da Filial com o seletor estilo iPhone (em memória até confirmação)
  const handleToggleBranchStatus = (branch: Branch) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === branch.id ? { ...b, is_active: b.is_active ? 0 : 1 } : b))
    );
  };

  // Ajuste do Nº Documento dentro da Filial (+1 / -1)
  const handleAdjustBranchDocNumber = (branchId: number, delta: number) => {
    setBranches((prev) =>
      prev.map((b) => {
        if (b.id === branchId) {
          const next = Math.max(1, Math.min(9999999, b.current_doc_number + delta));
          return { ...b, current_doc_number: next };
        }
        return b;
      })
    );
  };

  // Calcula exatamente as alterações feitas nas filiais em relação ao estado original
  const getBranchesDiff = () => {
    const diffs: {
      branchId: number;
      branchCode: string;
      branchName: string;
      changes: { label: string; oldValue: string; newValue: string }[];
    }[] = [];

    for (const current of branches) {
      const original = originalBranches.find((b) => b.id === current.id);
      if (!original) continue;

      const changes: { label: string; oldValue: string; newValue: string }[] = [];

      // Status Ativa / Inativa
      if (Number(current.is_active) !== Number(original.is_active)) {
        changes.push({
          label: 'Status da Empresa',
          oldValue: original.is_active ? 'Ativa' : 'Inativa',
          newValue: current.is_active ? 'Ativa' : 'Inativa',
        });
      }

      // Nº Documento
      if (Number(current.current_doc_number) !== Number(original.current_doc_number)) {
        changes.push({
          label: 'Sequencial Nº Documento',
          oldValue: `#${original.current_doc_number}`,
          newValue: `#${current.current_doc_number}`,
        });
      }

      // Nome
      if (current.name.trim() !== original.name.trim()) {
        changes.push({
          label: 'Nome da Filial',
          oldValue: original.name,
          newValue: current.name,
        });
      }

      // CNPJ
      if ((current.cnpj || '').trim() !== (original.cnpj || '').trim()) {
        changes.push({
          label: 'CNPJ',
          oldValue: original.cnpj || 'Não informado',
          newValue: current.cnpj || 'Não informado',
        });
      }

      // Logotipo
      if (current.logo_url !== original.logo_url) {
        changes.push({
          label: 'Logotipo Vinculado',
          oldValue: original.logo_url ? 'Logotipo Anterior' : 'Logo Padrão Petruz',
          newValue: 'Novo Logotipo Carregado',
        });
      }

      if (changes.length > 0) {
        diffs.push({
          branchId: current.id,
          branchCode: current.code,
          branchName: current.name,
          changes,
        });
      }
    }

    return diffs;
  };

  // Abre o modal de confirmação APENAS se houver alterações
  const handleOpenConfirmSaveBranches = () => {
    const diffs = getBranchesDiff();
    if (diffs.length === 0) {
      setNotification({
        type: 'warning',
        message: 'Nenhuma alteração foi realizada nas filiais cadastradas para salvar.',
      });
      return;
    }
    setIsConfirmSaveBranchesModalOpen(true);
  };

  // Salva definitivamente todas as alterações das filiais após confirmação no modal
  const handleConfirmSaveBranches = async () => {
    try {
      setIsSavingAllBranches(true);
      const res = await branchService.batchUpdate(branches);
      if (res.data) {
        setBranches(res.data);
        setOriginalBranches(JSON.parse(JSON.stringify(res.data)));
      }
      setIsConfirmSaveBranchesModalOpen(false);
      setNotification({
        type: 'success',
        message: '✓ Alterações confirmadas! As configurações das filiais foram salvas com sucesso no banco de dados.',
      });
    } catch (err: any) {
      console.error('Erro ao salvar filiais:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Erro ao salvar alterações das filiais.',
      });
    } finally {
      setIsSavingAllBranches(false);
    }
  };

  // Upload de Logotipo da Filial
  const handleLogoUpload = (branchId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setNotification({ type: 'error', message: 'Por favor, selecione um arquivo de imagem válido (PNG, JPG, SVG).' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setBranches((prev) =>
        prev.map((b) => (b.id === branchId ? { ...b, logo_url: base64 } : b))
      );
      setNotification({
        type: 'success',
        message: 'Logotipo carregado na pré-visualização. Clique em Salvar Filial para confirmar.',
      });
    };
    reader.readAsDataURL(file);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredAuditLogs = auditLogs.filter(
    (log) =>
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.user_name.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.ip_address.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full pb-16 transition-all duration-300">
      {/* Header Principal */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-[#7b1fa2]" />
            <span>Configurações do Sistema</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-purple-300/80 mt-0.5">
            Gestão de filiais, sequenciador de Nº Documento, cadastro de operadores e logs de auditoria.
          </p>
        </div>

        {/* Abas Superiores de Configurações */}
        <div className="flex items-center bg-slate-200/80 dark:bg-[#1f0e2b] p-1 rounded-xl border border-slate-300/70 dark:border-[#3d1952] text-xs font-bold">
          <button
            onClick={() => setActiveTab('branches')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'branches'
                ? 'bg-white dark:bg-[#7b1fa2] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-purple-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Filiais & Empresas ({branches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white dark:bg-[#7b1fa2] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-purple-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gestão de Usuários ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-white dark:bg-[#7b1fa2] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-purple-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Logs de Auditoria ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Box de Conectividade SAP Business One (Conforme a imagem) */}
      <div className="petruz-card p-4 border border-indigo-200/70 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-[#150a21] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-950/30 shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <span>CONECTIVIDADE SAP BUSINESS ONE</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                sapStatus?.connected
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sapStatus?.connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {sapStatus?.mode === 'mock' ? 'Simulador Ativo' : sapStatus?.connected ? 'Conectado' : 'Offline'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-purple-300/70 mt-0.5">
              Verifique o status do Service Layer da empresa parametrizada ({sapStatus?.companyDb || 'SBO_PETRUZ'}).
            </p>
          </div>
        </div>

        <button
          onClick={handleTestSapConnection}
          disabled={isTestingSap}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold text-xs shadow-md shadow-indigo-950/20 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isTestingSap ? 'animate-spin' : ''}`} />
          <span>Testar Conexão SAP</span>
        </button>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
              : notification.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300'
              : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800/80 text-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* ========================================================
          ABA 1: FILIAIS & SEQUENCIADOR DE Nº DOCUMENTO (DENTRO DA FILIAL)
          ======================================================== */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-purple-200 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#7b1fa2]" />
                <span>Controle das Filiais Cadastradas</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-purple-300/70 mt-0.5">
                Gerencie nomes, CNPJs, sequenciadores de documentos e logotipos vinculados aos romaneios
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <button
                onClick={handleSyncBranchesFromSap}
                disabled={loadingBranches}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-purple-200 dark:border-[#361a47] bg-white dark:bg-[#1a0d24] text-xs font-semibold text-[#7b1fa2] dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-[#261536] shadow-xs cursor-pointer transition-all disabled:opacity-50"
                title="Buscar e sincronizar filiais ativas do SAP Business One"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBranches ? 'animate-spin text-[#7b1fa2]' : ''}`} />
                <span>{loadingBranches ? 'Sincronizando...' : 'Atualizar Filiais (SAP)'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenConfirmSaveBranches}
                disabled={isSavingAllBranches || branches.length === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white text-xs font-bold shadow-md shadow-purple-950/20 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                title="Salvar todas as alterações feitas nas filiais cadastradas"
              >
                <Save className="w-4 h-4" />
                <span>Salvar as Alterações</span>
              </button>
            </div>
          </div>

          {branches.length === 0 ? (
            <div className="petruz-card p-12 text-center text-slate-400 dark:text-purple-300/60 space-y-4 border-dashed border-2">
              <Building2 className="w-12 h-12 mx-auto text-[#7b1fa2] opacity-50" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-700 dark:text-purple-200">
                  Nenhuma filial cadastrada no momento
                </h3>
                <p className="text-xs max-w-md mx-auto">
                  As filiais de teste foram excluídas. Clique no botão abaixo para buscar as filiais ativas diretamente da Service Layer do seu SAP Business One.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSyncBranchesFromSap}
                disabled={loadingBranches}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white text-xs font-bold shadow-md shadow-purple-950/20 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loadingBranches ? 'animate-spin' : ''}`} />
                <span>{loadingBranches ? 'Buscando Filiais do SAP...' : 'Buscar Filiais do SAP'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className={`petruz-card p-5 space-y-4 border transition-all shadow-sm ${
                    branch.is_active
                      ? 'border-purple-200 dark:border-purple-800/60 hover:border-[#7b1fa2]'
                      : 'border-slate-200 dark:border-slate-800 opacity-75 bg-slate-50/50 dark:bg-[#120817]'
                  }`}
                >
                  {/* Branch Header com Seletor Liga/Desliga */}
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-[#361a47] pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl font-mono font-bold flex items-center justify-center text-sm shadow ${
                        branch.is_active
                          ? 'bg-[#7b1fa2] text-white'
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {branch.code}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {branch.name}
                        </h3>
                        <span className="text-[10px] text-slate-500 dark:text-purple-300/70">
                          SAP BPL #{branch.id}
                        </span>
                      </div>
                    </div>

                    {/* Seletor Liga / Desliga estilo iPhone */}
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[11px] font-bold ${
                        branch.is_active
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}>
                        {branch.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                      <IosToggleSwitch
                        checked={Boolean(branch.is_active)}
                        onChange={() => handleToggleBranchStatus(branch)}
                      />
                    </div>
                  </div>

                  {/* Formulário Interno da Filial */}
                  <div className="space-y-3.5 text-xs">
                    {/* Nome da Filial */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-purple-300/80 mb-1">
                        Nome da Filial:
                      </label>
                      <input
                        type="text"
                        value={branch.name}
                        onChange={(e) => {
                          const newName = e.target.value;
                          setBranches((prev) =>
                            prev.map((b) => (b.id === branch.id ? { ...b, name: newName } : b))
                          );
                        }}
                        className="w-full bg-white dark:bg-[#150a1f] border border-slate-200 dark:border-[#361a47] rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-[#7b1fa2]"
                      />
                    </div>

                    {/* CNPJ e Sequenciador de Nº Documento */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-purple-300/80 mb-1">
                          CNPJ:
                        </label>
                        <input
                          type="text"
                          value={branch.cnpj || ''}
                          onChange={(e) => {
                            const newCnpj = e.target.value;
                            setBranches((prev) =>
                              prev.map((b) => (b.id === branch.id ? { ...b, cnpj: newCnpj } : b))
                            );
                          }}
                          placeholder="00.000.000/0000-00"
                          className="w-full bg-white dark:bg-[#150a1f] border border-slate-200 dark:border-[#361a47] rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 dark:text-white outline-none focus:border-[#7b1fa2]"
                        />
                      </div>

                      {/* Nº Documento Sequencial (Até 7 Dígitos com botões + / -) */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-purple-200 mb-1 flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5 text-[#7b1fa2]" />
                          <span>Nº Documento (Sequencial):</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAdjustBranchDocNumber(branch.id, -1)}
                            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#200e30] border border-slate-300 dark:border-[#431f5c] hover:border-red-400 text-red-600 dark:text-red-400 flex items-center justify-center font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                            title="Retroceder 1 número (-1)"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="number"
                            min={1}
                            max={9999999}
                            value={branch.current_doc_number}
                            onChange={(e) => {
                              const val = Math.max(1, Math.min(9999999, Number(e.target.value) || 1));
                              setBranches((prev) =>
                                prev.map((b) => (b.id === branch.id ? { ...b, current_doc_number: val } : b))
                              );
                            }}
                            className="flex-1 text-center font-mono font-bold text-sm bg-white dark:bg-[#150a1f] border border-purple-300 dark:border-purple-700 text-slate-900 dark:text-white rounded-lg py-1 px-2 outline-none focus:border-[#7b1fa2]"
                          />

                          <button
                            type="button"
                            onClick={() => handleAdjustBranchDocNumber(branch.id, 1)}
                            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#200e30] border border-slate-300 dark:border-[#431f5c] hover:border-emerald-400 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                            title="Avançar 1 número (+1)"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Logotipo da Filial */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-purple-300/80 mb-1.5">
                        Logotipo Vinculado ao PDF de Conferência:
                      </label>
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#150a1f] border border-slate-200 dark:border-[#361a47]">
                        <div className="w-20 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-sm">
                          {branch.logo_url ? (
                            <img src={branch.logo_url} alt={branch.name} className="max-h-full max-w-full object-contain" />
                          ) : (
                            <div className="text-[9px] text-purple-700 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#c2185b]" />
                              Petruz
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-1">
                          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#261536] border border-slate-200 dark:border-[#431f5c] hover:border-[#7b1fa2] text-slate-700 dark:text-purple-200 text-[11px] font-semibold cursor-pointer transition-colors w-fit">
                            <UploadCloud className="w-3.5 h-3.5 text-[#7b1fa2]" />
                            <span>Alterar Imagem</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleLogoUpload(branch.id, e)}
                            />
                          </label>
                          <span className="text-[10px] text-slate-400 block">
                            PNG, JPG ou SVG recomendados
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========================================================
              CARD: PERSONALIZAÇÃO DO LAYOUT DE IMPRESSÃO (PDF / ROMANEIO)
              ======================================================== */}
          <div className="petruz-card p-5 border border-purple-200/80 dark:border-[#431f5c] bg-white dark:bg-[#1d1026] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#361a47] pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-[#261536] text-[#7b1fa2] dark:text-purple-300">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Layout de Impressão & Título do Romaneio</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/80 text-[#7b1fa2] dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      Personalizável
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-purple-300/70 mt-0.5">
                    Defina o título padrão que sai centralizado no cabeçalho dos documentos e romaneios PDF emitidos
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveLayoutTitle}
                disabled={isSavingLayoutTitle}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white text-xs font-bold shadow-md shadow-purple-950/20 transition-all cursor-pointer active:scale-98 disabled:opacity-50 self-start sm:self-auto"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingLayoutTitle ? 'Salvando...' : 'Salvar Título do Layout'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              {/* Formulário do Título */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-purple-200 mb-1.5 uppercase tracking-wider">
                    Nome / Título Central do Documento (Letras Maiúsculas)
                  </label>
                  <div className="relative">
                    <Type className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={pdfLayoutTitle}
                      onChange={(e) => setPdfLayoutTitle(e.target.value.toUpperCase())}
                      placeholder="EX: CONFERÊNCIA DE LOTES LOKFRIO"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] focus:border-[#7b1fa2] rounded-xl text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Sugestões Rápidas (Chips) */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-purple-300/60 uppercase tracking-wider block mb-1.5">
                    Sugestões Rápidas:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'CONFERÊNCIA DE LOTES LOKFRIO',
                      'ROMANEIO DE CARGA',
                      'MAPA DE CARREGAMENTO & EXPEDIÇÃO',
                      'CONFERÊNCIA DE EXPEDIÇÃO PETRUZ',
                      'ORDEM DE CARREGAMENTO',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setPdfLayoutTitle(preset)}
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          pdfLayoutTitle === preset
                            ? 'bg-purple-100 dark:bg-purple-950/80 border-purple-300 dark:border-purple-700 text-[#7b1fa2] dark:text-purple-300 font-bold'
                            : 'bg-slate-100 dark:bg-[#1a0d24] border-slate-200 dark:border-[#361a47] text-slate-600 dark:text-purple-200/80 hover:border-purple-300'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pré-visualização ao Vivo do Cabeçalho */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] space-y-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-purple-300/60 uppercase tracking-wider block">
                  Prévia do Cabeçalho no PDF:
                </span>
                <div className="bg-white dark:bg-[#1d1026] border border-slate-200 dark:border-[#361a47] rounded-lg p-3 shadow-xs flex items-center justify-between gap-3">
                  <div className="text-xs font-extrabold text-[#7b1fa2]">
                    Petruz <span className="text-[10px] font-normal text-[#880e4f]">fruity</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide text-center">
                    {pdfLayoutTitle || 'CONFERÊNCIA DE LOTES LOKFRIO'}
                  </div>
                  <div className="text-[9px] text-slate-400 text-right">
                    {new Date().toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ABA 2: GESTÃO DE USUÁRIOS (INTEGRADA NAS CONFIGURAÇÕES)
          ======================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Campo de Busca */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar usuário por nome, e-mail ou perfil..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#361a47] bg-white dark:bg-[#1a0d24] text-xs text-slate-900 dark:text-white outline-none focus:border-[#7b1fa2]"
              />
            </div>

            {/* Ações: Atualizar e Novo Usuário */}
            <div className="flex items-center gap-2">
              <button
                onClick={fetchUsers}
                disabled={loadingUsers}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#361a47] bg-white dark:bg-[#1a0d24] text-xs font-semibold text-slate-700 dark:text-purple-200 hover:bg-slate-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin text-[#7b1fa2]' : ''}`} />
                <span>Atualizar</span>
              </button>

              <button
                onClick={() => {
                  setSelectedUserForEdit(null);
                  setIsNewUserModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Usuário</span>
              </button>
            </div>
          </div>

          {/* Tabela de Usuários */}
          <div className="petruz-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#1a0d24] text-slate-600 dark:text-purple-200 border-b border-slate-200 dark:border-[#361a47] font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Nome</th>
                    <th className="py-3 px-4">E-mail</th>
                    <th className="py-3 px-4">Perfil / Cargo</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#2e133d]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Nenhum usuário encontrado com os termos de busca.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-[#200e30]/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 text-[#7b1fa2] dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{u.name}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-purple-300/80">
                          {u.email}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              u.role === 'admin'
                                ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : u.role === 'supervisor'
                                ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {u.role === 'admin' ? 'Administrador' : u.role === 'supervisor' ? 'Supervisor' : 'Operador'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              u.is_active
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                                : 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300'
                            }`}
                          >
                            {u.is_active ? 'Ativo' : 'Bloqueado'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {/* Botão Editar Usuário */}
                          <button
                            onClick={() => {
                              setSelectedUserForEdit(u);
                              setIsNewUserModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/80 text-[#7b1fa2] dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                            title="Editar Usuário"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ABA 3: LOGS DE AUDITORIA & SEGURANÇA (SOB DEMANDA)
          ======================================================== */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Barra de Filtro de Período Sob Demanda */}
          <div className="petruz-card p-4 space-y-3.5 border border-purple-200 dark:border-[#361a47]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-[#361a47] pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#7b1fa2]" />
                  <span>Trilha de Auditoria & Segurança Operacional</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-purple-300/70 mt-0.5">
                  Consulta sob demanda otimizada por período (Data Inicial / Final) para máxima velocidade e leveza.
                </p>
              </div>

              {hasFilteredAudit && (
                <span className="text-xs font-mono font-bold text-[#7b1fa2] dark:text-purple-300 bg-purple-50 dark:bg-purple-950/80 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800/60 self-start sm:self-auto">
                  {filteredAuditLogs.length} registro(s) encontrado(s)
                </span>
              )}
            </div>

            {/* Controles de Filtro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              {/* Data Inicial */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-purple-300/80 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#7b1fa2]" />
                  <span>Data Inicial:</span>
                </label>
                <input
                  type="date"
                  value={auditStartDate}
                  onChange={(e) => setAuditStartDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#120817] border border-slate-200 dark:border-[#361a47] rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-[#7b1fa2]"
                />
              </div>

              {/* Data Final */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-purple-300/80 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#7b1fa2]" />
                  <span>Data Final:</span>
                </label>
                <input
                  type="date"
                  value={auditEndDate}
                  onChange={(e) => setAuditEndDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#120817] border border-slate-200 dark:border-[#361a47] rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-[#7b1fa2]"
                />
              </div>

              {/* Busca por Palavra-Chave */}
              <div className="lg:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-purple-300/80 mb-1 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <span>Buscar:</span>
                </label>
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Ação, usuário, detalhes..."
                  className="w-full bg-slate-50 dark:bg-[#120817] border border-slate-200 dark:border-[#361a47] rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-[#7b1fa2]"
                />
              </div>

              {/* Botão Filtrar Logs */}
              <div>
                <button
                  type="button"
                  onClick={handleFilterAuditLogs}
                  disabled={loadingAudit}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white text-xs font-bold shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  <Filter className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
                  <span>{loadingAudit ? 'Consultando...' : 'Filtrar Logs'}</span>
                </button>
              </div>

              {/* Botão Exportar CSV */}
              <div>
                <button
                  type="button"
                  onClick={handleExportAuditCsv}
                  disabled={isExportingAudit || !hasFilteredAudit || auditLogs.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Exportar logs filtrados para planilha CSV"
                >
                  <FileSpreadsheet className={`w-3.5 h-3.5 ${isExportingAudit ? 'animate-bounce' : ''}`} />
                  <span>{isExportingAudit ? 'Exportando...' : 'Exportar CSV'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Estado Quando o Usuário Ainda Não Filtrou */}
          {!hasFilteredAudit && !loadingAudit && (
            <div className="petruz-card p-12 text-center border-dashed border-2 border-slate-200 dark:border-[#361a47] flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-[#261536] text-[#7b1fa2] dark:text-purple-400 flex items-center justify-center shadow-xs">
                <Filter className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                Consulta de Logs sob Demanda
              </h4>
              <p className="text-xs text-slate-500 dark:text-purple-300/70 max-w-md">
                Para manter a aplicação sempre rápida e leve, os logs não são carregados automaticamente. Defina o período de datas acima e clique em <strong>Filtrar Logs</strong>.
              </p>
            </div>
          )}

          {/* Tabela de Logs (Exibida após filtrar) */}
          {hasFilteredAudit && (
            <div className="petruz-card overflow-hidden border border-purple-200 dark:border-[#361a47]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#1a0d24] text-slate-600 dark:text-purple-300/80 font-bold border-b border-slate-200 dark:border-[#361a47] uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Data / Hora</th>
                      <th className="py-3 px-4">Ação</th>
                      <th className="py-3 px-4">Usuário</th>
                      <th className="py-3 px-4">Detalhes do Evento</th>
                      <th className="py-3 px-4">Endereço IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#361a47]/60 text-slate-700 dark:text-slate-200">
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          Nenhum evento de auditoria localizado no período especificado.
                        </td>
                      </tr>
                    ) : (
                      filteredAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-[#261536]/40 transition-colors">
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-[#7b1fa2] dark:text-purple-400">
                            {log.action}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                            {log.user_name}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-md break-words">
                            {log.details}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                            {log.ip_address}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Cadastro e Edição de Usuário */}
      {isNewUserModalOpen && (
        <UserModal
          isOpen={isNewUserModalOpen}
          user={selectedUserForEdit}
          onClose={() => setIsNewUserModalOpen(false)}
          onSuccess={() => {
            setIsNewUserModalOpen(false);
            fetchUsers();
          }}
        />
      )}

      {/* Modal de Confirmação de Salvamento das Filiais (Apenas Alterações) */}
      {isConfirmSaveBranchesModalOpen && (() => {
        const diffs = getBranchesDiff();
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a0d24] border border-purple-200 dark:border-[#431f5c] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#361a47] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-[#261536] text-[#7b1fa2]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Confirmar Alterações Realizadas
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-purple-300/80">
                      Revise abaixo <strong>apenas os campos modificados</strong> antes de salvar:
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsConfirmSaveBranchesModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#261536]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lista Apenas do que foi Alterado */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {diffs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Nenhuma alteração detectada.
                  </div>
                ) : (
                  diffs.map((d) => (
                    <div
                      key={d.branchId}
                      className="p-3.5 rounded-xl border border-purple-200 dark:border-[#361a47] bg-slate-50/70 dark:bg-[#130b1a] space-y-2.5"
                    >
                      <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-[#361a47]/60 pb-2">
                        <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-[#7b1fa2] text-white text-[11px]">
                          {d.branchCode}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {d.branchName}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {d.changes.map((c, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs bg-white dark:bg-[#1f0e2b] p-2 rounded-lg border border-slate-100 dark:border-[#361a47]/70"
                          >
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-purple-200">
                              {c.label}:
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 line-through text-[11px] font-mono">
                                {c.oldValue}
                              </span>
                              <span className="text-[#7b1fa2] dark:text-purple-400 font-bold text-xs">➔</span>
                              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold text-[11px] font-mono">
                                {c.newValue}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-[#361a47] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsConfirmSaveBranchesModalOpen(false)}
                  disabled={isSavingAllBranches}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#361a47] text-xs font-semibold text-slate-700 dark:text-purple-300 hover:bg-slate-50 dark:hover:bg-[#261536] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSaveBranches}
                  disabled={isSavingAllBranches || diffs.length === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white text-xs font-bold shadow-md shadow-purple-950/20 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <CheckCircle2 className={`w-4 h-4 ${isSavingAllBranches ? 'animate-spin' : ''}`} />
                  <span>{isSavingAllBranches ? 'Salvando...' : 'Confirmar & Salvar Alterações'}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================
          MODAL DE DIAGNÓSTICO DE CONEXÃO SAP SERVICE LAYER
          ======================================================== */}
      {isSapDiagnosticModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1a0a24] border border-slate-200 dark:border-[#3d1952] rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#361a47] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl text-white ${sapStatus?.connected ? 'bg-emerald-600' : 'bg-red-600'}`}>
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Diagnóstico de Conexão: SAP Service Layer
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-purple-300/70">
                    Resultado da comunicação com o SAP Business One
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSapDiagnosticModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-base font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Banner de Status Principal */}
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              sapStatus?.connected
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-200'
            }`}>
              {sapStatus?.connected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider">
                  {sapStatus?.connected ? 'Comunicação Estabelecida com Sucesso' : 'Falha na Comunicação com a Service Layer'}
                </div>
                <div className="text-xs font-medium opacity-90 leading-relaxed font-mono">
                  {sapStatus?.message || 'Nenhuma resposta obtida do servidor.'}
                </div>
              </div>
            </div>

            {/* Detalhes Técnicos dos Parâmetros */}
            <div className="bg-slate-50 dark:bg-[#15071f] p-3.5 rounded-xl border border-slate-200/80 dark:border-[#361a47] space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-[#361a47]/50">
                <span className="text-slate-500 dark:text-purple-300/70 font-medium">Servidor (URL Service Layer):</span>
                <span className="font-mono font-bold text-slate-800 dark:text-purple-100 text-[11px] truncate max-w-[240px]">
                  {sapStatus?.serverUrl || 'Não configurada'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-[#361a47]/50">
                <span className="text-slate-500 dark:text-purple-300/70 font-medium">Empresa (CompanyDB):</span>
                <span className="font-mono font-bold text-slate-800 dark:text-purple-100">
                  {sapStatus?.companyDb || 'Não configurada'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-[#361a47]/50">
                <span className="text-slate-500 dark:text-purple-300/70 font-medium">Modo de Operação:</span>
                <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                  sapStatus?.mode === 'mock'
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                    : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                }`}>
                  {sapStatus?.mode === 'mock' ? 'Simulador (Mock)' : 'Produção Oficial (Real)'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-purple-300/70 font-medium">Horário da Verificação:</span>
                <span className="text-slate-700 dark:text-purple-200 font-mono text-[11px]">
                  {sapStatus?.lastChecked ? new Date(sapStatus.lastChecked).toLocaleTimeString('pt-BR') : 'Agora'}
                </span>
              </div>
            </div>

            {/* Dicas em caso de erro */}
            {!sapStatus?.connected && (
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> Dicas de Diagnóstico:
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-[10.5px] opacity-90">
                  <li>Verifique se o IP e a porta <code className="font-mono font-bold">50000</code> em <code className="font-mono">backend/.env</code> estão acessíveis.</li>
                  <li>Certifique-se de que o usuário SAP possui licença de acesso à Service Layer.</li>
                  <li>Verifique se o nome do banco da empresa (<code className="font-mono font-bold">{sapStatus?.companyDb || 'CompanyDB'}</code>) está exato.</li>
                </ul>
              </div>
            )}

            {/* Ações do Modal */}
            <div className="pt-3 border-t border-slate-100 dark:border-[#361a47] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleTestSapConnection}
                disabled={isTestingSap}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-bold shadow-md shadow-indigo-950/20 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingSap ? 'animate-spin' : ''}`} />
                <span>{isTestingSap ? 'Testando...' : 'Testar Novamente'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSapDiagnosticModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#361a47] text-xs font-semibold text-slate-700 dark:text-purple-300 hover:bg-slate-50 dark:hover:bg-[#261536] transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
