import React from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  PackageSearch, 
  Boxes, 
  FileText, 
  Settings,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'load-builder', label: 'Montagem de Carga', icon: Boxes },
    { id: 'sap-orders', label: 'Pedidos SAP', icon: PackageSearch },
    { id: 'vehicles', label: 'Veículos & Frota', icon: Truck },
    { id: 'loads-history', label: 'Histórico de Montagens', icon: FileText },
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: 'settings', label: 'Configurações', icon: Settings });
  }

  return (
    <aside
      className={`bg-[#260f33] text-white flex flex-col justify-between shrink-0 min-h-[calc(100vh-3.5rem)] select-none border-r border-[#371549] transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="p-3 pt-4 space-y-2">
        {/* Section Header: MENU PRINCIPAL */}
        {!isCollapsed ? (
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-purple-300/60">
            Menu Principal
          </div>
        ) : (
          <div className="text-center pb-1 text-[9px] font-bold text-purple-300/40">
            •••
          </div>
        )}

        {/* Navigation List - Ajustado para o Topo */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isCollapsed ? 'justify-center px-2' : 'text-left'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-[#6366f1] to-[#7b1fa2] text-white font-bold shadow-md shadow-indigo-950/40'
                    : 'text-purple-200/90 hover:text-white hover:bg-[#371549]/70'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-purple-300'}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Bottom Collapse / Expand Button */}
      <div className={`p-3 border-t border-[#371549] flex items-center ${
        isCollapsed ? 'justify-center' : 'justify-end'
      }`}>
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center p-2 rounded-xl text-purple-300 hover:text-white hover:bg-[#371549] transition-all cursor-pointer shadow-xs"
          title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
};
