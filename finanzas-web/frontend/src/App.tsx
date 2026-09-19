// frontend/src/App.tsx
import { useEffect, useState } from 'react';
import Sidebar, { type PageId } from './components/Sidebar';
import CatEgresosList from './components/CatEgresosList';
import CatIngresosList from './components/CatIngresosList';
import IngresosList from './components/IngresosList';
import { getIngresosSummary } from './api/ingresos.api';

/* ── Dashboard ──────────────────────────────────── */
function Dashboard({
  apiOk,
  apiStatus,
  onNavigate,
}: {
  apiOk: boolean | null;
  apiStatus: string;
  onNavigate: (page: PageId) => void;
}) {
  const [totalIngresos, setTotalIngresos] = useState<number>(0);

  useEffect(() => {
    if (apiOk) {
      getIngresosSummary()
        .then((res) => setTotalIngresos(res.total_monto || 0))
        .catch(() => {});
    }
  }, [apiOk]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Resumen financiero · Septiembre 2026</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
          apiOk === null
            ? 'bg-muted text-muted-foreground'
            : apiOk
              ? 'bg-success-soft text-income'
              : 'bg-danger-soft text-destructive'
        }`}>
          <span className={`size-1.5 rounded-full inline-block ${
            apiOk === null ? 'bg-muted-foreground animate-pulse'
            : apiOk ? 'bg-income' : 'bg-destructive'
          }`} />
          {apiStatus}
        </span>
      </div>

      {/* Balance General */}
      <section className="finance-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Balance General
            </p>
            <p className="text-4xl font-bold font-display text-foreground mt-2">
              ${totalIngresos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-base font-semibold text-muted-foreground ml-2">MXN</span>
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success-soft text-income border border-income/20">
            <span className="size-1.5 rounded-full bg-income inline-block animate-pulse" />
            Activo
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="rounded-xl bg-success-soft px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">Ingresos</p>
            <p className="text-lg font-bold text-income">
              ${totalIngresos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-xl bg-danger-soft px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">Egresos</p>
            <p className="text-lg font-bold text-expense">$0.00</p>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            id="btn-agregar-ingreso"
            onClick={() => onNavigate('ingresos')}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-accent-mint text-primary hover:brightness-105 active:scale-95 transition-all clay-sm"
          >
            + Ir a Ingresos
          </button>
          <button
            id="btn-registrar-gasto"
            onClick={() => onNavigate('egresos')}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all clay-sm"
          >
            − Registrar Gasto
          </button>
        </div>
      </section>
    </div>
  );
}

function PlaceholderPage({ title, subtitle, icon }: { title: string; subtitle: string; icon: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="finance-card flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <span className="text-5xl">{icon}</span>
        <p className="text-sm font-medium">Próximamente</p>
        <p className="text-xs text-muted-foreground/70">Esta sección está en desarrollo.</p>
      </div>
    </div>
  );
}

/* ── App ────────────────────────────────────────── */
export default function App() {
  const [activePage, setActivePage] = useState<PageId>('ingresos');
  const [apiStatus, setApiStatus]   = useState<string>('Verificando...');
  const [apiOk, setApiOk]           = useState<boolean | null>(null);

  useEffect(() => {
    fetch('http://localhost:4000/api/health')
      .then((res) => res.json())
      .then((data) => { setApiStatus(data.message); setApiOk(true); })
      .catch(() => { setApiStatus('Backend no disponible'); setApiOk(false); });
  }, []);

  /* ── Renderiza la página activa ──────────────── */
  function renderPage() {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard apiOk={apiOk} apiStatus={apiStatus} onNavigate={setActivePage} />;
      case 'cat-egresos':
        return <CatEgresosList />;
      case 'egresos':
        return <PlaceholderPage title="Egresos" subtitle="Registro de tus gastos" icon="↙️" />;
      case 'cat-ingresos':
        return <CatIngresosList />;
      case 'ingresos':
        return <IngresosList />;
      case 'limites':
        return <PlaceholderPage title="Límites / Presupuestos" subtitle="Controla tus límites de gasto" icon="💳" />;
      case 'metas':
        return <PlaceholderPage title="Metas de ahorro" subtitle="Alcanza tus objetivos financieros" icon="🎯" />;
      case 'movimientos-ahorro':
        return <PlaceholderPage title="Movimientos de ahorro" subtitle="Historial de tus ahorros" icon="📥" />;
      default:
        return null;
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
