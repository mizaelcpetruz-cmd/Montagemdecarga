import React, { useState, useEffect } from 'react';
import { auditService } from '../services/api';
import { AuditLog } from '../types';
import { RefreshCw } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await auditService.list();
      setLogs(res);
    } catch (err) {
      console.error('Erro ao buscar logs de auditoria:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 w-full pb-16 transition-all duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Trilha de Auditoria & Segurança
          </h1>
          <p className="text-xs text-slate-500 dark:text-purple-300/80 mt-0.5">
            Registro imutável de operações de expedição, acessos e endereços IP.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#361a47] bg-white dark:bg-[#1a0d24] hover:bg-slate-50 dark:hover:bg-[#261536] text-xs font-semibold text-slate-700 dark:text-purple-200 shadow-sm transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#7b1fa2] dark:text-purple-400' : ''}`} />
          <span>Atualizar Logs</span>
        </button>
      </div>

      {/* Logs Table */}
      <div className="petruz-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#1a0d24] text-slate-600 dark:text-purple-300/80 font-semibold border-b border-slate-200 dark:border-[#361a47]">
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Ação</th>
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Detalhes</th>
                <th className="py-3 px-4">Endereço IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#361a47]/60 text-slate-700 dark:text-slate-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                    Nenhum log de auditoria registrado ainda.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-[#261536]/40">
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#7b1fa2] dark:text-purple-400">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {log.user_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
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
    </div>
  );
};
