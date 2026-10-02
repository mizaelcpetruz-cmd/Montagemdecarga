import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, Boxes, Eye, EyeOff } from 'lucide-react';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';
import { ForcePasswordChangeModal } from '../components/ForcePasswordChangeModal';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [isForcePasswordOpen, setIsForcePasswordOpen] = useState(false);
  const [savedPasswordUsed, setSavedPasswordUsed] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      const res = await login(email, password);
      if (res?.mustChangePassword) {
        setSavedPasswordUsed(password);
        setIsForcePasswordOpen(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao autenticar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8f9fa] dark:bg-[#130b1a] p-4 relative overflow-hidden transition-colors duration-200">
      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-tr from-[#7b1fa2] to-[#c2185b] border border-purple-400/30 text-white shadow-xl shadow-purple-950/30 mb-3">
            <Boxes className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Petruz Cargas
          </h1>
          <p className="text-xs text-slate-500 dark:text-purple-300/80 mt-1">
            Portal de Expedição e Montagem de Carga
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-[#1d1026] rounded-2xl p-8 border border-[#e9ecef] dark:border-[#361a47] shadow-sm">
          <div className="mb-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Acesso ao Sistema</h2>
            <p className="text-xs text-slate-500 dark:text-purple-300/70 mt-0.5">
              Entre com seu e-mail corporativo para continuar
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
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="usuario@petruz.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] focus:bg-white dark:focus:bg-[#1a0d24] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-purple-200 uppercase tracking-wider">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(true)}
                  className="text-xs text-[#7b1fa2] dark:text-purple-400 hover:underline font-medium cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] focus:bg-white dark:focus:bg-[#1a0d24] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-purple-300 transition-colors cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 mt-2 cursor-pointer"
            >
              <span>{loading ? 'Validando...' : 'Entrar no Sistema'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Security Features Info */}
        <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-slate-400 dark:text-purple-300/70">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>JWT & Bcrypt</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Supabase Cloud</span>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
      />

      <ForcePasswordChangeModal
        isOpen={isForcePasswordOpen}
        currentPasswordUsed={savedPasswordUsed}
        onSuccess={() => {
          setIsForcePasswordOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
};
