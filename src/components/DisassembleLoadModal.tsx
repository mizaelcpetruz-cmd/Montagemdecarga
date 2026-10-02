import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, AlertCircle } from 'lucide-react';

interface DisassembleLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  loadNumber: string;
  onConfirm: (justification: string) => Promise<void>;
}

const COMMON_REASONS = [
  'Problema mecânico / indisponibilidade do caminhão',
  'Cancelamento ou alteração de pedido pelo cliente',
  'Troca emergencial de veículo para rota diferente',
  'Excesso de cubagem / divergência de peso real na doca',
  'Repriorização de expedição pelo setor de faturamento',
];

export const DisassembleLoadModal: React.FC<DisassembleLoadModalProps> = ({
  isOpen,
  onClose,
  loadNumber,
  onConfirm,
}) => {
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = justification.trim();
    if (!trimmed || trimmed.length < 5) {
      setError('Por favor, informe uma justificativa válida com no mínimo 5 caracteres.');
      return;
    }

    try {
      setLoading(true);
      await onConfirm(trimmed);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao desmontar carga.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1d1026] border border-slate-200 dark:border-[#361a47] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#361a47] bg-red-50/50 dark:bg-[#26101c]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Desmontar Carga {loadNumber}
              </h2>
              <p className="text-xs text-slate-500 dark:text-purple-300/70">
                A justificativa é obrigatória para registro de auditoria
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#261536] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Select Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-purple-200 mb-2 uppercase tracking-wider">
              Motivos Frequentes (Clique para preencher)
            </label>
            <div className="space-y-1.5">
              {COMMON_REASONS.map((reason) => (
                <button
                  type="button"
                  key={reason}
                  onClick={() => setJustification(reason)}
                  className={`w-full text-left px-3 py-1.5 rounded-xl border text-[11px] transition-colors ${
                    justification === reason
                      ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 font-semibold'
                      : 'bg-slate-50 dark:bg-[#130b1a] border-slate-200 dark:border-[#361a47] text-slate-600 dark:text-purple-300/80 hover:border-slate-300 dark:hover:border-purple-600'
                  }`}
                >
                  • {reason}
                </button>
              ))}
            </div>
          </div>

          {/* Text Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-purple-200 mb-1.5 uppercase tracking-wider">
              Justificativa Detalhada *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Descreva detalhadamente o motivo da desmontagem da carga para o registro de auditoria..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500 resize-none transition-all"
            />
            <div className="text-[10px] text-slate-400 dark:text-purple-300/60 mt-1 flex justify-between">
              <span>Mínimo de 5 caracteres</span>
              <span>{justification.length} caracteres</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-[#361a47]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-purple-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#261536] transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading || justification.trim().length < 5}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{loading ? 'Processando Desmonte...' : 'Confirmar & Desmontar Carga'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
