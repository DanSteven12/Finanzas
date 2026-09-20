// frontend/src/App.tsx
import { useState } from 'react';
import Sidebar, { type PageId } from './components/Sidebar';
import CatEgresosList from './components/CatEgresosList';
import EgresosList from './components/EgresosList';
import CatIngresosList from './components/CatIngresosList';
import IngresosList from './components/IngresosList';
import LimitesList from './components/LimitesList';
import MetasList from './components/MetasList';
import MovimientosList from './components/MovimientosList';
import DashboardView from './components/DashboardView';

const PAGE_TITLES: Record<PageId, string> = {
  'dashboard': 'Dashboard',
  'cat-egresos': 'Categorías de egresos',
  'egresos': 'Egresos',
  'cat-ingresos': 'Categorías de ingresos',
  'ingresos': 'Ingresos',
  'limites': 'Límites / Presupuestos',
  'metas': 'Metas de ahorro',
  'movimientos-ahorro': 'Movimientos de ahorro',
};

function getHeaderSubtitle(): string {
  const now = new Date();
  const monthName = now.toLocaleDateString('es-MX', { month: 'long' });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  return `Resumen financiero · ${capitalizedMonth} ${now.getFullYear()}`;
}

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('finanzas_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('finanzas_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }

  /* ── Renderiza la página activa ──────────────── */
  function renderPage() {
    switch (activePage) {
      case 'dashboard':
        return <DashboardView onNavigate={setActivePage} />;
      case 'cat-egresos':
        return <CatEgresosList />;
      case 'egresos':
        return <EgresosList />;
      case 'cat-ingresos':
        return <CatIngresosList />;
      case 'ingresos':
        return <IngresosList />;
      case 'limites':
        return <LimitesList />;
      case 'metas':
        return <MetasList />;
      case 'movimientos-ahorro':
        return <MovimientosList />;
      default:
        return null;
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Responsive & Colapsable) */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main container */}
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {/* ── Encabezado Superior Global ── */}
        <header className="px-4 sm:px-8 pt-5 pb-4 border-b border-border/50 bg-background/95 backdrop-blur-xs sticky top-0 z-20 shrink-0">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground leading-tight truncate">
                {PAGE_TITLES[activePage]}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5 truncate">
                {getHeaderSubtitle()}
              </p>
            </div>
          </div>
        </header>

        {/* ── Área de contenido del módulo activo ── */}
        <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
