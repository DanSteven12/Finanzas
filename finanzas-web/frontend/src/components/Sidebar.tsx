import { useEffect, useState } from 'react';
import type { MetaAhorro } from '../types/metas.types';
import { getMetas } from '../api/metas.api';
import logoImg from '../assets/logo.png';

export type PageId =
  | 'dashboard'
  | 'cat-egresos'
  | 'egresos'
  | 'cat-ingresos'
  | 'ingresos'
  | 'limites'
  | 'metas'
  | 'movimientos-ahorro';

type IconId = 'dashboard' | 'tag' | 'arrow-down' | 'arrow-up' | 'card' | 'target' | 'inbox';

interface NavItem {
  id: PageId;
  label: string;
  iconId: IconId;
}

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

/* ── Íconos SVG — reciben color explícito ────────── */
function NavIcon({ iconId, color }: { iconId: IconId; color: string }) {
  const props = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (iconId) {
    case 'dashboard':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1.5"/>
          <rect x="14" y="14" width="7" height="7" rx="1.5"/>
        </svg>
      );
    case 'tag':
      return (
        <svg {...props}>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
      );
    case 'arrow-down':
      return (
        <svg {...props} strokeWidth={2.5}>
          <line x1="7" y1="17" x2="17" y2="7"/>
          <polyline points="17 17 17 7 7 7"/>
        </svg>
      );
    case 'arrow-up':
      return (
        <svg {...props} strokeWidth={2.5}>
          <line x1="17" y1="7" x2="7" y2="17"/>
          <polyline points="7 7 7 17 17 17"/>
        </svg>
      );
    case 'card':
      return (
        <svg {...props}>
          <rect x="1" y="4" width="22" height="16" rx="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
      );
    case 'target':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
      );
    case 'inbox':
      return (
        <svg {...props}>
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
          <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
        </svg>
      );
    default:
      return null;
  }
}

/* ── Datos del menú ─────────────────────────────── */
const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',          label: 'Dashboard',               iconId: 'dashboard'  },
  { id: 'cat-egresos',        label: 'Categorías de egresos',   iconId: 'tag'        },
  { id: 'egresos',            label: 'Egresos',                 iconId: 'arrow-down' },
  { id: 'cat-ingresos',       label: 'Categorías de ingresos',  iconId: 'tag'        },
  { id: 'ingresos',           label: 'Ingresos',                iconId: 'arrow-up'   },
  { id: 'limites',            label: 'Límites / Presupuestos',  iconId: 'card'       },
  { id: 'metas',              label: 'Metas de ahorro',         iconId: 'target'     },
  { id: 'movimientos-ahorro', label: 'Movimientos de ahorro',   iconId: 'inbox'      },
];

export default function Sidebar({
  activePage,
  onNavigate,
  collapsed = true,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const [metas, setMetas] = useState<MetaAhorro[]>([]);

  useEffect(() => {
    getMetas()
      .then((data) => setMetas(data))
      .catch(() => {});
  }, [activePage]);

  // Meta activa principal
  const activeMeta = metas.find((m) => m.estado !== 'completada') || metas[0];
  const metaPct = activeMeta ? Math.min(100, Math.max(0, activeMeta.porcentaje)) : 0;

  // Si mobileOpen está activo en móvil, forzamos vista expandida
  const isExpandedMobile = mobileOpen;
  const isCollapsed = collapsed && !isExpandedMobile;

  function handleSelect(id: PageId) {
    onNavigate(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  }

  return (
    <>
      <aside
        className={[
          'flex flex-col h-screen bg-background border-r border-border shrink-0 transition-all duration-300 ease-in-out select-none',
          // En móvil expandido: drawer overlay
          isExpandedMobile
            ? 'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl bg-background'
            : isCollapsed
            ? 'w-14 sm:w-16 md:w-20 relative z-30'
            : 'w-60 relative z-30',
        ].join(' ')}
      >
        {/* ── Brand & Toggle / Close Header ─────────────────── */}
        <div className={`flex items-center pt-5 pb-3 ${isCollapsed ? 'flex-col gap-2.5 px-2' : 'justify-between px-5'}`}>
          <div className="flex items-center gap-3 min-w-0">
            {/* Contenedor del Logo (Puedes cambiar su tamaño aquí con size-11, size-12, size-14, etc.) */}
            <div
              className={`${isCollapsed ? 'size-11 sm:size-12' : 'size-12 sm:size-14'} rounded-full flex items-center justify-center shrink-0 shadow-sm cursor-pointer hover:scale-105 transition-transform overflow-hidden`}
              onClick={() => handleSelect('dashboard')}
              title="Finanzas personales"
            >
              <img
                src={logoImg}
                alt="Finanzas"
                className="w-full h-full object-cover"
              />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-base font-bold font-display text-foreground leading-tight truncate">Finanzas</p>
                <p className="text-xs text-muted-foreground truncate">Gestión personal</p>
              </div>
            )}
          </div>

          {/* Botón de Cerrar cuando el drawer móvil está expandido */}
          {isExpandedMobile && onCloseMobile && (
            <button
              id="btn-close-sidebar-mobile"
              onClick={onCloseMobile}
              title="Cerrar menú"
              className="md:hidden size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}

          {/* Botón de Colapsar / Expandir (Siempre visible en el rail) */}
          {onToggleCollapse && !isExpandedMobile && (
            <button
              id="btn-toggle-sidebar"
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
              className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <line x1="9" y1="3" x2="9" y2="21" />
                {isCollapsed ? (
                  <polyline points="13 9 16 12 13 15" />
                ) : (
                  <polyline points="16 9 13 12 16 15" />
                )}
              </svg>
            </button>
          )}
        </div>

        {/* ── Nav Items ─────────────────────────────── */}
        <nav className={`flex flex-col gap-1.5 mt-2 overflow-y-auto flex-1 ${isCollapsed ? 'px-1.5 sm:px-2 items-center' : 'px-3'}`}>
          {!isCollapsed && (
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-1">
              Navegación
            </p>
          )}

          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleSelect(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={[
                  'group transition-all duration-150 cursor-pointer relative',
                  isCollapsed
                    ? 'size-10 sm:size-11 rounded-2xl flex items-center justify-center'
                    : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground hover:bg-secondary hover:text-foreground',
                ].join(' ')}
              >
                {/* Ícono */}
                <span
                  className={[
                    'flex items-center justify-center shrink-0 transition-colors duration-150',
                    isCollapsed
                      ? 'size-8 sm:size-9 rounded-xl'
                      : 'size-8 rounded-full',
                    isActive
                      ? (isCollapsed ? 'text-primary-foreground' : 'bg-white/15')
                      : 'bg-background border border-border group-hover:border-aqua-bright group-hover:bg-aqua-soft',
                  ].join(' ')}
                >
                  <NavIcon
                    iconId={item.iconId}
                    color={isActive ? '#ffffff' : 'var(--muted-foreground)'}
                  />
                </span>

                {/* Texto expandido */}
                {!isCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}

                {/* Floating Tooltip en modo colapsado */}
                {isCollapsed && (
                  <span className="hidden md:group-hover:block absolute left-full ml-3 px-3 py-1.5 bg-card text-foreground text-xs font-bold rounded-xl shadow-lg border border-border whitespace-nowrap z-50 pointer-events-none animate-in fade-in duration-150">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Widget Meta del mes (Expandido vs. Colapsado) ── */}
        {!isCollapsed ? (
          <div
            id="widget-meta-del-mes"
            onClick={() => handleSelect('metas')}
            title="Clic para gestionar tus metas de ahorro"
            className="mx-3 mb-5 rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] group select-none border border-emerald-500/10"
            style={{ background: 'var(--aqua-soft)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground truncate">
                {activeMeta ? activeMeta.nombre : 'Meta del mes'}
              </p>
              <span className="text-[11px] font-extrabold text-[#065f46] font-display ml-1">
                {metaPct.toFixed(0)}%
              </span>
            </div>

            <p className="text-xs text-muted-foreground mt-1 leading-relaxed truncate">
              {activeMeta
                ? `Ahorrado $${Number(activeMeta.saldo).toLocaleString('es-MX')} de $${Number(activeMeta.monto_meta).toLocaleString('es-MX')}`
                : 'Ahorra 20% de tus ingresos para tu fondo.'}
            </p>

            {/* Barra de progreso */}
            <div className="mt-3 h-2 rounded-full bg-white/60 dark:bg-muted/60 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${metaPct}%`,
                  background: '#064e3b',
                }}
              />
            </div>
          </div>
        ) : (
          <div className="py-4 flex justify-center">
            <button
              onClick={() => handleSelect('metas')}
              title={`Meta de ahorro: ${activeMeta ? activeMeta.nombre : 'Sin metas'} (${metaPct.toFixed(0)}%)`}
              className="size-10 sm:size-11 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-all shadow-xs group relative border border-emerald-500/20"
              style={{ background: 'var(--aqua-soft)' }}
            >
              <span className="text-sm sm:text-base leading-none">🎯</span>
              <span className="text-[9px] font-extrabold text-[#065f46] font-display leading-tight mt-0.5">
                {metaPct.toFixed(0)}%
              </span>

              {/* Tooltip flotante */}
              <span className="hidden md:group-hover:block absolute left-full ml-3 px-3 py-1.5 bg-card text-foreground text-xs font-bold rounded-xl shadow-lg border border-border whitespace-nowrap z-50 pointer-events-none">
                {activeMeta ? `${activeMeta.nombre}: ${metaPct.toFixed(0)}%` : 'Metas de ahorro'}
              </span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
