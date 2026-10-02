import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { LoadBuilderPage } from './pages/LoadBuilderPage';
import { SapOrdersPage } from './pages/SapOrdersPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { LoadHistoryPage } from './pages/LoadHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Garante que ao autenticar/iniciar sessão sempre abra no Painel
  React.useEffect(() => {
    if (isAuthenticated) {
      setCurrentTab('dashboard');
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#130b1a] flex flex-col items-center justify-center text-slate-500 dark:text-purple-300 gap-3">
        <div className="w-8 h-8 border-2 border-[#7b1fa2] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          Carregando Sistema Petruz Cargas...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentTab} />;
      case 'load-builder':
        return <LoadBuilderPage />;
      case 'sap-orders':
        return <SapOrdersPage />;
      case 'vehicles':
        return <VehiclesPage />;
      case 'loads-history':
        return <LoadHistoryPage />;
      case 'settings':
        return <SettingsPage />;
      case 'audit-logs':
        return <AuditLogsPage />;
      default:
        return <DashboardPage onNavigate={setCurrentTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#130b1a] text-slate-800 dark:text-slate-100 flex flex-col selection:bg-[#7b1fa2] selection:text-white transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar />

      {/* Body Layout: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto max-h-[calc(100vh-3rem)] flex justify-center">
          <div className="w-full max-w-7xl transition-all duration-300">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
