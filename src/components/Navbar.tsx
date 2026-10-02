import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Key, LogOut, Boxes } from 'lucide-react';
import { ChangePasswordModal } from './ChangePasswordModal';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extrai iniciais do nome (ex: Admin Logística -> AD)
  const getInitials = (name?: string) => {
    if (!name) return 'AD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="h-14 bg-[#260f33] border-b border-[#371549] px-5 flex items-center justify-between sticky top-0 z-30 shadow-sm select-none transition-colors duration-200">
      {/* Top Left: Ícone e Título Petruz Cargas */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7b1fa2] to-[#c2185b] flex items-center justify-center shadow-md shrink-0 border border-purple-400/30">
          <Boxes className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-extrabold text-white tracking-tight leading-tight flex items-center gap-1.5">
            Petruz Cargas
          </span>
          <span className="text-[11px] text-purple-300/80 font-medium">
            Portal de Expedição e Montagem de Carga
          </span>
        </div>
      </div>

      {/* Top Right: User Badge, Theme Toggle & Logout */}
      <div className="flex items-center gap-3">
        {/* User Info Badge */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-[#371549]/80 transition-colors cursor-pointer"
            aria-expanded={isUserMenuOpen}
          >
            {/* Avatar Circle */}
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {getInitials(user?.name)}
            </div>

            {/* Email and Role */}
            <div className="text-left hidden sm:block leading-tight">
              <div className="text-xs font-bold text-white tracking-tight">
                {user?.email || 'admin@montagem.com'}
              </div>
              <div className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider">
                {user?.role === 'admin' ? 'ADMINISTRADOR' : user?.role === 'supervisor' ? 'SUPERVISOR' : 'OPERADOR'}
              </div>
            </div>
          </button>

          {/* User Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-[#1f0b29] border border-[#3d1852] rounded-xl shadow-xl py-1.5 z-50 text-xs animate-in fade-in">
              <div className="px-3 py-2 border-b border-[#371549]">
                <p className="font-bold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-purple-300/70 truncate">{user?.email}</p>
              </div>

              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setIsPasswordModalOpen(true);
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-2 text-purple-200 hover:bg-[#371549] hover:text-white transition-colors cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-purple-300" />
                <span>Alterar Minha Senha</span>
              </button>

              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  logout();
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-2 text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors cursor-pointer border-t border-[#371549]/60"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair do Sistema</span>
              </button>
            </div>
          )}
        </div>

        {/* Botão de Tema (Sol) */}
        <button
          onClick={toggleTheme}
          className="p-2 text-purple-300 hover:text-white hover:bg-[#371549] rounded-lg transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
          aria-label="Alternar tema claro/escuro"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round transition-transform duration-300 hover:rotate-45"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        </button>

        {/* Botão Sair Rápido */}
        <button
          onClick={logout}
          className="p-2 text-purple-300 hover:text-red-400 hover:bg-[#371549] rounded-lg transition-colors cursor-pointer"
          title="Sair da Conta"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Modal de Alteração de Senha */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </header>
  );
};
