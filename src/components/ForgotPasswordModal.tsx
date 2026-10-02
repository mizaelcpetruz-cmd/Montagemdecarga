import React, { useState } from 'react';
import { X, Mail, Send, CheckCircle2, AlertCircle, ArrowLeft, KeyRound, Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/api';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'request_code' | 'verify_and_reset' | 'success'>('request_code');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  // Etapa 1: Envia código para o e-mail
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSimulatedCode(null);

    if (!email) {
      setError('Por favor, informe seu e-mail cadastrado.');
      return;
    }

    try {
      setLoading(true);
      const res = await authService.forgotPassword(email);
      setSuccessMessage(res.message);
      if (res.data?.simulatedCode) {
        setSimulatedCode(res.data.simulatedCode);
      }
      setStep('verify_and_reset');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao solicitar código de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  // Etapa 2: Valida código e define a nova senha
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code || code.trim().length < 4) {
      setError('Por favor, digite o código de 6 dígitos recebido por e-mail.');
      return;
    }

    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação de senha não coincide com a nova senha.');
      return;
    }

    try {
      setLoading(true);
      const res = await authService.resetPasswordWithCode(email, code.trim(), newPassword);
      setSuccessMessage(res.message || 'Sua senha foi redefinida com sucesso!');
      setStep('success');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Código inválido ou expirado. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('request_code');
    setEmail('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError(null);
    setSuccessMessage('');
    setSimulatedCode(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-[#1d1026] border border-slate-200 dark:border-[#361a47] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#361a47] bg-slate-50/60 dark:bg-[#1a0d24]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-[#261536] text-[#7b1fa2] dark:text-purple-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {step === 'request_code' && 'Recuperação de Senha'}
                {step === 'verify_and_reset' && 'Inserir Código & Nova Senha'}
                {step === 'success' && 'Senha Redefinida!'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-purple-300/70">
                {step === 'request_code' && 'Enviaremos o código de segurança para seu e-mail'}
                {step === 'verify_and_reset' && `Código enviado para ${email}`}
                {step === 'success' && 'Você já pode acessar com sua nova senha'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#261536] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ETAPA 1: Digitar E-mail */}
          {step === 'request_code' && (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-purple-200 mb-1.5 uppercase tracking-wider">
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="usuario@petruz.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-purple-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#261536] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{loading ? 'Enviando...' : 'Enviar Código'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ETAPA 2: Inserir Código de 6 Dígitos e Nova Senha */}
          {step === 'verify_and_reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 text-xs">
                Verifique sua caixa de entrada no e-mail <strong>{email}</strong> e digite o código de 6 dígitos abaixo.
              </div>

              {simulatedCode && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-center font-mono font-bold text-xs text-amber-800 dark:text-amber-300">
                  Código de Demonstração: <span className="text-purple-700 dark:text-purple-300">{simulatedCode}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-purple-200 mb-1.5 uppercase tracking-wider">
                  Código de 6 Dígitos
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl pl-10 pr-4 py-2.5 text-center font-mono text-base tracking-[6px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-purple-200 mb-1.5 uppercase tracking-wider">
                  Nova Senha (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Digite a nova senha"
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

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('request_code')}
                  className="text-xs text-slate-500 dark:text-purple-300 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar</span>
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{loading ? 'Redefinindo...' : 'Salvar Nova Senha'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ETAPA 3: Sucesso */}
          {step === 'success' && (
            <div className="space-y-4 text-center py-2">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs space-y-2">
                <div className="flex items-center justify-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                  <span>Senha Alterada com Sucesso!</span>
                </div>
                <p>{successMessage}</p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <span>Fazer Login com a Nova Senha</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
