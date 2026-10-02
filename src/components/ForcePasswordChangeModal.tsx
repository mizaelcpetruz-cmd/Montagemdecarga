import React, { useState } from 'react';
import { Lock, KeyRound, CheckCircle2, AlertCircle, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/api';

interface ForcePasswordChangeModalProps {
  isOpen: boolean;
  currentPasswordUsed: string;
  onSuccess: () => void;
}

export const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({
  isOpen,
  currentPasswordUsed,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword === '1234') {
      setError('A nova senha não pode ser a senha padrão (1234). Crie uma senha mais segura.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação de senha não coincide com a nova senha.');
      return;
    }

    try {
      setLoading(true);
      await authService.changePassword(currentPasswordUsed, newPassword);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao redefinir senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#1d1026] rounded-2xl max-w-md w-full p-6 sm:p-8 border border-purple-200 dark:border-[#361a47] shadow-2xl relative">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 mb-3 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Primeiro Acesso ao Sistema
          </h2>
          <p className="text-xs text-slate-500 dark:text-purple-300/80 mt-1">
            Por segurança, você deve definir sua nova senha pessoal antes de continuar.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-purple-200 mb-1.5 uppercase tracking-wider">
              Nova Senha (mínimo 6 caracteres)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Digite a nova senha segura"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-purple-300 transition-colors cursor-pointer"
                title={showNewPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-purple-200 mb-1.5 uppercase tracking-wider">
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-purple-300 transition-colors cursor-pointer"
                title={showConfirmPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Salvando Senha...' : 'Salvar Nova Senha & Acessar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
