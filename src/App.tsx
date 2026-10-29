import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AuthPage } from './pages/AuthPage';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { DashboardPage } from './pages/DashboardPage';
import { TrafficPage } from './pages/TrafficPage';
import { AttacksPage } from './pages/AttacksPage';
import { MitigationPage } from './pages/MitigationPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LogsPage } from './pages/LogsPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { DemoAppPage } from './pages/DemoAppPage';
import { NAV_ITEMS, type NavId } from './lib/constants';
import { useEngine } from './hooks/useEngine';

function Shell() {
  const { session, loading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [active, setActive] = useState<NavId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center animate-pulse">
            <svg className="w-6 h-6 text-slate-950" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
          </div>
          <p className="text-sm text-slate-400">Initializing SentinelDDoS...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage mode={authMode} onToggle={() => setAuthMode((m) => (m === 'login' ? 'register' : 'login'))} />;
  }

  return <Dashboard active={active} setActive={setActive} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />;
}

function Dashboard({ active, setActive, sidebarOpen, setSidebarOpen }: { active: NavId; setActive: (id: NavId) => void; sidebarOpen: boolean; setSidebarOpen: (v: boolean) => void }) {
  const engine = useEngine();
  const title = NAV_ITEMS.find((n) => n.id === active)?.label ?? 'Dashboard';

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar active={active} onSelect={(id) => { setActive(id); setSidebarOpen(false); }} open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenu={() => setSidebarOpen(true)} title={title} alerts={engine.alerts} onAckAlert={engine.acknowledgeAlert} />
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          {active === 'dashboard' && <DashboardPage />}
          {active === 'traffic' && <TrafficPage />}
          {active === 'attacks' && <AttacksPage />}
          {active === 'mitigation' && <MitigationPage />}
          {active === 'simulator' && <SimulatorPage />}
          {active === 'analytics' && <AnalyticsPage />}
          {active === 'logs' && <LogsPage />}
          {active === 'reports' && <ReportsPage />}
          {active === 'users' && <UsersPage />}
          {active === 'settings' && <SettingsPage />}
          {active === 'demo' && <DemoAppPage />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </AuthProvider>
  );
}
