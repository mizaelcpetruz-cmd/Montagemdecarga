import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Mail, Lock, Shield, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { User } from '../types';
import { userService } from '../services/api';

interface UserModalProps {
  isOpen: boolean;
  user?: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({ isOpen, user, onClose, onSuccess }) => {
  const isEditing = Boolean(user?.id);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'supervisor' | 'operator'>('operator');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState<number>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || '');
      setEmail(user.email || '');
      setRole(user.role || 'operator');
      setIsActive(typeof user.is_active === 'number' ? user.is_active : 1);
      setPassword('');
      setError(null);
    } else if (isOpen) {
      setName('');
      setEmail('');
      setRole('operator');
      setIsActive(1);
      setPassword('');
      setError(null);
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Por favor, informe o nome do usuário.');
      return;
    }

    if (!email.trim()) {
      setError('Por favor, informe o e-mail corporativo.');
      return;
    }

    if (!isEditing && (!password || password.length < 6)) {
      setError('A senha inicial é obrigatória e deve ter no mínimo 6 caracteres.');
      return;
    }

    if (isEditing && password && password.length < 6) {
      setError('Se deseja alterar a senha, ela deve ter no mínimo 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      if (isEditing && user) {
        await userService.update(user.id, {
          name: name.toUpperCase().trim(),
          email: email.toLowerCase().trim(),
          role,
          is_active: isActive,
          password: password.trim() ? password.trim() : undefined,
        });
      } else {
        await userService.create({
          name: name.toUpperCase().trim(),
          email: email.toLowerCase().trim(),
          role,
          password: password.trim(),
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar dados do usuário.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-[#1d1026] border border-slate-200 dark:border-[#361a47] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#361a47] bg-slate-50/60 dark:bg-[#1a0d24]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-[#261536] text-[#7b1fa2] dark:text-purple-400">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Editar Usuário' : 'Novo Usuário do Sistema'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-purple-300/70">
                {isEditing ? 'Atualize as credenciais e permissões' : 'Preencha os dados de acesso corporativo'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#261536] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Nome do Usuário */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-purple-200 mb-1.5 uppercase tracking-wider">
              Nome Completo (Letras Maiúsculas)
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="EX: MIZAEL SILVA"
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 uppercase focus:outline-none focus:border-[#7b1fa2] transition-all"
              />
            </div>
          </div>

          {/* E-mail Corporativo */}
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

          {/* Perfil de Acesso & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-purple-200 mb-1.5 uppercase tracking-wider">
                Perfil de Acesso
              </label>
              <div className="relative">
                <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] transition-all cursor-pointer"
                >
                  <option value="operator">Operador</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-purple-200 mb-1.5 uppercase tracking-wider">
                Status do Acesso
              </label>
              <select
                value={isActive}
                onChange={(e) => setIsActive(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] transition-all cursor-pointer"
              >
                <option value={1}>Ativo (Liberado)</option>
                <option value={0}>Bloqueado (Suspenso)</option>
              </select>
            </div>
          </div>

          {/* Senha */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-purple-200 uppercase tracking-wider">
                {isEditing ? 'Nova Senha (Opcional)' : 'Senha de Acesso (Mínimo 6 caracteres)'}
              </label>
              {isEditing && (
                <span className="text-[10px] text-slate-400">Deixe em branco para manter a atual</span>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required={!isEditing}
                minLength={6}
                placeholder={isEditing ? '•••••••• (manter senha atual)' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] transition-all"
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

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#361a47]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-purple-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#261536] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Salvando...' : isEditing ? 'Atualizar Usuário' : 'Cadastrar Usuário'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
