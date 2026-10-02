import React, { useState, useEffect } from 'react';
import { userService } from '../services/api';
import { User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Edit2,
  Users as UsersIcon
} from 'lucide-react';
import { UserModal } from '../components/UserModal';

export const UsersManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal de Cadastro / Edição
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.list();
      setUsers(data);
    } catch (err: any) {
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenNewUser = () => {
    setSelectedUser(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (userToEdit: User) => {
    setSelectedUser(userToEdit);
    setIsUserModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-widest text-[#7b1fa2] dark:text-purple-400 uppercase bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
              Segurança & Acesso
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-[#7b1fa2] dark:text-purple-400" />
            <span>Gestão de Usuários</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-purple-300/80 mt-0.5">
            Cadastre, edite informações corporativas e controle permissões de acesso ao sistema
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="petruz-button-secondary flex items-center gap-1.5 text-xs py-2 px-3"
            title="Atualizar Lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleOpenNewUser}
            className="petruz-button-primary flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between shadow-sm animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs underline hover:opacity-80 font-medium"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#1d1026] p-3 rounded-2xl border border-slate-200 dark:border-[#361a47] shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou perfil..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] transition-all"
          />
        </div>

        <div className="text-xs text-slate-500 dark:text-purple-300/80 font-medium">
          Total: <strong className="text-slate-900 dark:text-white font-bold">{users.length}</strong> usuários ({filteredUsers.length} exibidos)
        </div>
      </div>

      {/* Users Table */}
      <div className="petruz-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#1a0d24] text-slate-600 dark:text-purple-300/80 font-semibold border-b border-slate-200 dark:border-[#361a47]">
              <tr>
                <th className="py-3 px-4">Usuário / Nome</th>
                <th className="py-3 px-4">E-mail Corporativo</th>
                <th className="py-3 px-4 text-center">Perfil de Acesso</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Cadastrado em</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#361a47]/60 text-slate-700 dark:text-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                    Nenhum usuário localizado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  const isBlocked = !u.is_active;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-[#261536]/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#6b21a8] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                          {u.name ? u.name.substring(0, 2).toUpperCase() : 'US'}
                        </div>
                        <div>
                          <span>{u.name}</span>
                          {isCurrent && (
                            <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/80 text-[#7b1fa2] dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              Você
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-purple-300/80 font-mono">
                        {u.email}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            u.role === 'admin'
                              ? 'bg-purple-100 dark:bg-purple-950/80 text-[#7b1fa2] dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : u.role === 'supervisor'
                              ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {u.role === 'admin' ? 'Administrador' : u.role === 'supervisor' ? 'Supervisor' : 'Operador'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            !isBlocked
                              ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                          }`}
                        >
                          {!isBlocked ? 'Ativo' : 'Bloqueado'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '-'}
                      </td>

                      {/* Ações: Apenas Botão Editar */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/80 text-[#7b1fa2] dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                          title="Editar Usuário"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Reutilizável: Novo Usuário e Edição */}
      {isUserModalOpen && (
        <UserModal
          isOpen={isUserModalOpen}
          user={selectedUser}
          onClose={() => setIsUserModalOpen(false)}
          onSuccess={() => {
            setIsUserModalOpen(false);
            setNotification({
              type: 'success',
              message: selectedUser ? 'Dados do usuário atualizados com sucesso!' : 'Novo usuário cadastrado com sucesso!',
            });
            fetchUsers();
          }}
        />
      )}
    </div>
  );
};
