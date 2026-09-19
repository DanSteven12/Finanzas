// frontend/src/components/Sidebar.tsx

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
}

/* ── Íconos SVG — reciben color explícito ────────── */
function NavIcon({ iconId, color }: { iconId: IconId; color: string }) {
  const props = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (iconId) {
    case 'dashboard':
      return (
        <svg {...props} width={18} height={18}>
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

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside
      className="flex flex-col h-screen bg-background border-r border-border shrink-0"
      style={{ width: '240px' }}
    >
      {/* ── Brand ───────────────────────────── */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <div
          className="size-10 rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0"
          style={{ background: 'var(--primary)' }}
        >
          F
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold font-display text-foreground leading-tight">Finanzas</p>
          <p className="text-xs text-muted-foreground">Gestión personal</p>
        </div>
      </div>

      {/* ── Nav ─────────────────────────────── */}
      <nav className="flex flex-col gap-0.5 px-3 mt-3">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2">
          Navegación
        </p>

        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onNavigate(item.id)}
              className={[
                'group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-all duration-150',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-foreground hover:bg-secondary hover:text-foreground',
              ].join(' ')}
            >
              {/* Ícono en círculo — color explícito, sin herencia CSS rota */}
              <span
                className={[
                  'size-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-150',
                  isActive
                    ? 'bg-white/15'
                    : 'bg-background border border-border group-hover:border-aqua-bright group-hover:bg-aqua-soft',
                ].join(' ')}
              >
                <NavIcon
                  iconId={item.iconId}
                  color={isActive ? '#ffffff' : 'var(--muted-foreground)'}
                />
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* ── Spacer ──────────────────────────── */}
      <div className="flex-1" />

      {/* ── Meta del mes ────────────────────── */}
      <div className="mx-3 mb-5 rounded-2xl p-4" style={{ background: 'var(--aqua-soft)' }}>
        <p className="text-sm font-bold text-foreground">Meta del mes</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Ahorra 20% de tus ingresos para tu fondo.
        </p>
        {/* Barra de progreso */}
        <div className="mt-3 h-2 rounded-full bg-white/40 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: '42%', background: 'var(--income)' }}
          />
        </div>
      </div>
    </aside>
  );
}
