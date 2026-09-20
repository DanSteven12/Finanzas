// frontend/src/components/DashboardView.tsx
import { useEffect, useState } from 'react';
import type { PageId } from './Sidebar';
import type { DashboardDataDto } from '../types/dashboard.types';
import { getDashboardData } from '../api/dashboard.api';

interface DashboardViewProps {
  onNavigate: (page: PageId) => void;
}

// Helper de formato monetario
function formatCurrency(val: number): string {
  return `$${Number(val || 0).toLocaleString('es-MX', {
    minimumFractionDigits: val % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

// Helper para formatear fechas estilo imagen: "12 oct 2026"
function formatFriendlyDate(dateStr?: string | Date): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function DashboardView({ onNavigate }: DashboardViewProps) {
  const [data, setData]       = useState<DashboardDataDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);

  // Periodo seleccionado (Mes en formato "YYYY-MM")
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    cargarDashboard(selectedMonth);
  }, [selectedMonth]);

  async function cargarDashboard(mes: string) {
    try {
      setLoading(true);
      setError(null);
      const res = await getDashboardData(`${mes}-01`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos del dashboard.');
    } finally {
      setLoading(false);
    }
  }

  // Navegar al mes anterior o siguiente
  function changeMonth(delta: number) {
    const [y, m] = selectedMonth.split('-').map(Number);
    const targetDate = new Date(y, m - 1 + delta, 1);
    const newY = targetDate.getFullYear();
    const newM = String(targetDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  }

  // Cálculos para Gráfica de Área / Línea (Ingresos vs. Egresos)
  const historico = data?.historico_mensual || [];
  const maxHistoricoVal = Math.max(
    1,
    ...historico.map((h) => Math.max(h.ingresos, h.egresos))
  );

  // Generar puntos para curvas bezier en SVG (ancho 500, alto 160)
  const chartWidth = 500;
  const chartHeight = 160;
  const paddingX = 30;
  const paddingY = 20;
  const stepX = (chartWidth - paddingX * 2) / Math.max(1, historico.length - 1);

  function generatePath(key: 'ingresos' | 'egresos'): { linePath: string; areaPath: string } {
    if (historico.length === 0) return { linePath: '', areaPath: '' };
    
    const points = historico.map((h, i) => {
      const x = paddingX + i * stepX;
      const y = chartHeight - paddingY - (h[key] / maxHistoricoVal) * (chartHeight - paddingY * 2);
      return { x, y };
    });

    if (points.length === 1) {
      const p = points[0];
      return {
        linePath: `M ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y}`,
        areaPath: `M ${p.x - 20} ${chartHeight} L ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y} L ${p.x + 20} ${chartHeight} Z`,
      };
    }

    // Curva bezier suave
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }

    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const area = `${d} L ${lastX} ${chartHeight} L ${firstX} ${chartHeight} Z`;

    return { linePath: d, areaPath: area };
  }

  const ingresosPath = generatePath('ingresos');
  const egresosPath = generatePath('egresos');

  // Valores del mes hovered
  const hoveredItem =
    hoveredMonthIndex !== null && historico[hoveredMonthIndex]
      ? historico[hoveredMonthIndex]
      : null;
  const hoveredX =
    hoveredMonthIndex !== null ? paddingX + hoveredMonthIndex * stepX : 0;
  const hoveredYIngresos = hoveredItem
    ? chartHeight - paddingY - (hoveredItem.ingresos / maxHistoricoVal) * (chartHeight - paddingY * 2)
    : 0;
  const hoveredYEgresos = hoveredItem
    ? chartHeight - paddingY - (hoveredItem.egresos / maxHistoricoVal) * (chartHeight - paddingY * 2)
    : 0;

  // Cálculos para Gráfica de Dona (Gastos por Categoría)
  const gastosCat = data?.gastos_por_categoria || [];
  const radius = 60;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Selector de Periodo */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2 bg-card border border-border/80 p-1.5 px-3 rounded-2xl shadow-xs">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Periodo:</span>
          <button
            onClick={() => changeMonth(-1)}
            title="Mes anterior"
            className="size-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer font-bold"
          >
            ‹
          </button>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
            className="px-2 py-0.5 text-xs font-bold text-foreground bg-transparent outline-none cursor-pointer text-center"
          />
          <button
            onClick={() => changeMonth(1)}
            title="Mes siguiente"
            className="size-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer font-bold"
          >
            ›
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-danger-soft text-destructive text-sm border border-destructive/20">
          <span>⚠️</span>
          <span className="font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-destructive/60 hover:text-destructive cursor-pointer">✕</button>
        </div>
      )}

      {/* ── 1. Tarjetas Principales de Métricas (4 Columnas) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total de ingresos */}
        <div className="bg-card rounded-3xl p-6 border border-border/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="size-11 rounded-full bg-[#d1fae5] text-[#065f46] flex items-center justify-center font-bold text-base">
              ↗
            </div>
            {data?.resumen.ingresos_pct_cambio !== null && data?.resumen.ingresos_pct_cambio !== undefined && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#d1fae5] text-[#065f46]">
                {data.resumen.ingresos_pct_cambio >= 0 ? `+${data.resumen.ingresos_pct_cambio}%` : `${data.resumen.ingresos_pct_cambio}%`}
              </span>
            )}
          </div>
          <div className="mt-4">
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Total de ingresos</span>
            <p className="text-3xl font-extrabold font-display text-foreground tracking-tight mt-1">
              {loading ? '...' : formatCurrency(data?.resumen.total_ingresos || 0)}
            </p>
            <span className="text-xs text-muted-foreground/70 font-medium mt-1 block">vs. mes anterior</span>
          </div>
        </div>

        {/* Total de egresos */}
        <div className="bg-card rounded-3xl p-6 border border-border/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="size-11 rounded-full bg-[#fee2e2] text-[#b91c1c] flex items-center justify-center font-bold text-base">
              ↙
            </div>
            {data?.resumen.egresos_pct_cambio !== null && data?.resumen.egresos_pct_cambio !== undefined && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#d1fae5] text-[#065f46]">
                {data.resumen.egresos_pct_cambio >= 0 ? `+${data.resumen.egresos_pct_cambio}%` : `${data.resumen.egresos_pct_cambio}%`}
              </span>
            )}
          </div>
          <div className="mt-4">
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Total de egresos</span>
            <p className="text-3xl font-extrabold font-display text-foreground tracking-tight mt-1">
              {loading ? '...' : formatCurrency(data?.resumen.total_egresos || 0)}
            </p>
            <span className="text-xs text-muted-foreground/70 font-medium mt-1 block">vs. mes anterior</span>
          </div>
        </div>

        {/* Balance (Tarjeta Destacada en Teal Oscuro #093539) */}
        <div className="bg-[#093539] text-white rounded-3xl p-6 shadow-md flex flex-col justify-between hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="size-11 rounded-full bg-white/15 text-white flex items-center justify-center font-bold text-base">
              📈
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm">
              {data?.resumen.balance_estado || 'Saludable'}
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs sm:text-sm font-semibold text-white/70">Balance</span>
            <p className="text-3xl font-extrabold font-display text-white tracking-tight mt-1">
              {loading ? '...' : formatCurrency(data?.resumen.balance || 0)}
            </p>
            <span className="text-xs text-white/60 font-medium mt-1 block">vs. mes anterior</span>
          </div>
        </div>

        {/* Ahorro acumulado */}
        <div className="bg-card rounded-3xl p-6 border border-border/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="size-11 rounded-full bg-[#fef3c7] text-[#b45309] flex items-center justify-center text-xl">
              🐖
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#d1fae5] text-[#065f46]">
              +{data?.resumen.metas_activas || 0}.0%
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Ahorro acumulado</span>
            <p className="text-3xl font-extrabold font-display text-foreground tracking-tight mt-1">
              {loading ? '...' : formatCurrency(data?.resumen.ahorro_acumulado || 0)}
            </p>
            <span className="text-xs text-muted-foreground/70 font-medium mt-1 block">
              en {data?.resumen.metas_activas || 0} metas activas
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Fila de Gráficas (Ingresos vs Egresos + Gastos por Categoría) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Gráfica 1: Ingresos vs. Egresos (8 Columnas en desktop) */}
        <div className="lg:col-span-8 bg-card rounded-3xl p-6 sm:p-7 border border-border/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-extrabold font-display text-foreground">
              Ingresos vs. egresos
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comparación por mes
            </p>
          </div>

          {/* Gráfico SVG Responsivo con Curvas, Gradientes y Tooltip Interactivo */}
          <div
            className="relative w-full mt-4 flex items-center justify-center"
            onMouseLeave={() => setHoveredMonthIndex(null)}
          >
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight + 25}`}
              className="w-full h-48 overflow-visible select-none"
            >
              <defs>
                <linearGradient id="ingresosGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#093539" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#093539" stopOpacity="0.01" />
                </linearGradient>
                <linearGradient id="egresosGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.20" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Líneas Guía Horizontales */}
              {[0.25, 0.5, 0.75, 1].map((ratio, idx) => (
                <line
                  key={idx}
                  x1={paddingX}
                  y1={chartHeight - paddingY - ratio * (chartHeight - paddingY * 2)}
                  x2={chartWidth - paddingX}
                  y2={chartHeight - paddingY - ratio * (chartHeight - paddingY * 2)}
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Línea Guía Vertical al pasar el cursor */}
              {hoveredItem && (
                <line
                  x1={hoveredX}
                  y1={paddingY / 2}
                  x2={hoveredX}
                  y2={chartHeight}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeOpacity="0.45"
                  className="transition-all duration-150"
                />
              )}

              {/* Área y Línea de Ingresos */}
              {ingresosPath.areaPath && (
                <path d={ingresosPath.areaPath} fill="url(#ingresosGradient)" />
              )}
              {ingresosPath.linePath && (
                <path
                  d={ingresosPath.linePath}
                  fill="none"
                  stroke="#093539"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              )}

              {/* Área y Línea de Egresos */}
              {egresosPath.areaPath && (
                <path d={egresosPath.areaPath} fill="url(#egresosGradient)" />
              )}
              {egresosPath.linePath && (
                <path
                  d={egresosPath.linePath}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              )}

              {/* Indicadores Circulares al pasar el cursor */}
              {hoveredItem && (
                <g className="transition-all duration-150">
                  {/* Punto en Línea de Ingresos */}
                  <circle
                    cx={hoveredX}
                    cy={hoveredYIngresos}
                    r={5}
                    fill="#093539"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                  {/* Punto en Línea de Egresos */}
                  <circle
                    cx={hoveredX}
                    cy={hoveredYEgresos}
                    r={5}
                    fill="#f43f5e"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                </g>
              )}

              {/* Etiquetas del Eje X (Meses) */}
              {historico.map((h, i) => {
                const x = paddingX + i * stepX;
                const isHovered = hoveredMonthIndex === i;
                return (
                  <text
                    key={h.mes_key}
                    x={x}
                    y={chartHeight + 15}
                    textAnchor="middle"
                    fill="currentColor"
                    className={`text-[11px] transition-all duration-150 ${
                      isHovered ? 'font-extrabold opacity-100' : 'font-semibold opacity-60'
                    }`}
                  >
                    {h.mes}
                  </text>
                );
              })}

              {/* Zonas interactivas invisibles para capturar el cursor */}
              {historico.map((_, i) => {
                const colWidth = (chartWidth - paddingX * 2) / Math.max(1, historico.length - 1);
                const colX = paddingX + i * colWidth - colWidth / 2;
                return (
                  <rect
                    key={`hitbox-${i}`}
                    x={Math.max(0, colX)}
                    y={0}
                    width={colWidth}
                    height={chartHeight + 25}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredMonthIndex(i)}
                    onTouchStart={() => setHoveredMonthIndex(i)}
                  />
                );
              })}
            </svg>

            {/* Modal / Tooltip Flotante con Animación */}
            {hoveredItem && hoveredMonthIndex !== null && (
              <div
                className="absolute z-20 pointer-events-none transition-all duration-150 ease-out bg-white dark:bg-card border border-border/90 shadow-xl rounded-xl p-3 sm:p-3.5 min-w-[145px] animate-in fade-in zoom-in-95"
                style={{
                  left: `${(hoveredX / chartWidth) * 100}%`,
                  top: '40%',
                  transform:
                    hoveredMonthIndex >= Math.ceil(historico.length / 2)
                      ? 'translate(calc(-100% - 12px), -50%)'
                      : 'translate(12px, -50%)',
                }}
              >
                <div className="text-sm font-bold text-foreground mb-1.5">
                  {hoveredItem.mes}
                </div>
                <div className="text-xs font-semibold text-[#093539] dark:text-[#2dd4bf] flex items-center justify-between gap-3">
                  <span className="font-normal opacity-90">ingresos :</span>
                  <span className="font-bold">{formatCurrency(hoveredItem.ingresos)}</span>
                </div>
                <div className="text-xs font-semibold text-[#f43f5e] dark:text-rose-400 flex items-center justify-between gap-3 mt-1">
                  <span className="font-normal opacity-90">egresos :</span>
                  <span className="font-bold">{formatCurrency(hoveredItem.egresos)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Leyenda */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <span className="size-2.5 rounded-full bg-[#093539]" />
              <span>Ingresos</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <span className="size-2.5 rounded-full bg-[#f43f5e]" />
              <span>Egresos</span>
            </div>
          </div>
        </div>

        {/* Gráfica 2: Gastos por categoría (4 Columnas en desktop) */}
        <div className="lg:col-span-4 bg-card rounded-3xl p-6 sm:p-7 border border-border/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-extrabold font-display text-foreground">
              Gastos por categoría
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Distribución de egresos
            </p>
          </div>

          {/* Dona SVG */}
          <div className="flex items-center justify-center my-4">
            {gastosCat.length === 0 ? (
              <div className="size-36 rounded-full border-4 border-dashed border-border flex items-center justify-center text-center p-3 text-xs text-muted-foreground">
                Sin egresos en el mes
              </div>
            ) : (
              <svg width="150" height="150" viewBox="0 0 150 150" className="rotate-[-90deg]">
                {gastosCat.map((item) => {
                  const strokeDash = (item.porcentaje / 100) * circumference;
                  const strokeGap = circumference - strokeDash;
                  const currentOffset = -cumulativeOffset;
                  cumulativeOffset += strokeDash;

                  return (
                    <circle
                      key={item.id}
                      cx="75"
                      cy="75"
                      r={radius}
                      fill="transparent"
                      stroke={item.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${strokeDash} ${strokeGap}`}
                      strokeDashoffset={currentOffset}
                      className="transition-all duration-500 hover:opacity-90"
                    />
                  );
                })}
              </svg>
            )}
          </div>

          {/* Leyenda de Categorías */}
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            {gastosCat.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-1.5 p-1">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="truncate text-foreground font-medium">{item.categoria}</span>
                </div>
                <span className="text-muted-foreground font-bold">{item.porcentaje}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. Sección Límites y Metas de Ahorro ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Límites / Presupuestos (7 Columnas) */}
        <div className="lg:col-span-7 bg-card rounded-3xl p-6 sm:p-7 border border-border/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold font-display text-foreground">
                Límites / Presupuestos
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gasto vs. límite mensual
              </p>
            </div>
            <button
              onClick={() => onNavigate('limites')}
              className="px-4 py-2 rounded-2xl text-xs font-bold bg-[#093539] text-white hover:bg-[#07272a] transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>+</span> Nuevo límite
            </button>
          </div>

          {/* Lista de Límites */}
          <div className="flex flex-col gap-4 mt-5">
            {data?.limites.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No hay límites establecidos para {data?.mes_nombre}.
              </div>
            ) : (
              data?.limites.map((lim) => {
                let badgeClass = 'bg-[#d1fae5] text-[#065f46]';
                let barColor = 'bg-[#093539]';

                if (lim.estado === 'excedido') {
                  badgeClass = 'bg-[#fee2e2] text-[#b91c1c]';
                  barColor = 'bg-[#ef4444]';
                } else if (lim.estado === 'cerca') {
                  badgeClass = 'bg-[#fef3c7] text-[#b45309]';
                  barColor = 'bg-[#d97706]';
                }

                return (
                  <div key={lim.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">{lim.categoria_nombre}</span>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${badgeClass}`}>
                        {lim.badge_texto}
                      </span>
                    </div>

                    <div className="w-full h-3 rounded-full bg-[#f1f5f9] dark:bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${Math.min(100, lim.porcentaje)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                      <span>{formatCurrency(lim.gastado)} gastado</span>
                      <span>Límite {formatCurrency(lim.monto_limite)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Metas de Ahorro (5 Columnas) */}
        <div className="lg:col-span-5 bg-card rounded-3xl p-6 sm:p-7 border border-border/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold font-display text-foreground">
                Metas de ahorro
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Progreso de objetivos
              </p>
            </div>
            <button
              onClick={() => onNavigate('metas')}
              className="size-8 rounded-full bg-[#093539] text-white flex items-center justify-center text-sm font-bold hover:bg-[#07272a] transition-all shadow-sm cursor-pointer"
            >
              +
            </button>
          </div>

          {/* Lista de Metas */}
          <div className="flex flex-col gap-3 mt-4">
            {data?.metas.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No hay metas de ahorro registradas aún.
              </div>
            ) : (
              data?.metas.map((m) => (
                <div
                  key={m.id}
                  onClick={() => onNavigate('metas')}
                  className="rounded-2xl p-4 bg-[#f8fafc] dark:bg-muted/30 border border-border/60 hover:bg-muted/50 transition-colors cursor-pointer flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground truncate max-w-[170px]">{m.nombre}</span>
                    <span className="font-extrabold text-foreground">{m.porcentaje}%</span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#093539] transition-all duration-500"
                      style={{ width: `${Math.min(100, m.porcentaje)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                    <span>{formatCurrency(m.saldo)} / {formatCurrency(m.monto_meta)}</span>
                    <span>{m.fecha_display}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Sección Últimos Movimientos (Actividad Reciente) ── */}
      <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/80 shadow-xs flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-extrabold font-display text-foreground">
              Últimos movimientos
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Actividad financiera reciente
            </p>
          </div>
          <button
            onClick={() => onNavigate('movimientos-ahorro')}
            className="px-4 py-2 rounded-2xl border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Ver todo
          </button>
        </div>

        {/* Tabla de Actividad */}
        <div className="overflow-x-auto">
          {data?.ultimos_movimientos.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No hay movimientos registrados recientemente.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4 font-extrabold">CONCEPTO</th>
                  <th className="py-3 px-4 font-extrabold">CATEGORÍA</th>
                  <th className="py-3 px-4 font-extrabold">FECHA</th>
                  <th className="py-3 px-4 text-right font-extrabold">MONTO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {data?.ultimos_movimientos.map((item) => {
                  const isIngreso = item.tipo === 'INGRESO';

                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      {/* Concepto */}
                      <td className="py-4 px-4 font-bold text-foreground">
                        {item.concepto}
                      </td>

                      {/* Categoría */}
                      <td className="py-4 px-4">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#d1fae5] text-[#065f46]">
                          {item.categoria}
                        </span>
                      </td>

                      {/* Fecha */}
                      <td className="py-4 px-4 text-xs font-medium text-muted-foreground">
                        {formatFriendlyDate(item.fecha)}
                      </td>

                      {/* Monto */}
                      <td className="py-4 px-4 text-right font-bold text-sm">
                        <span className={isIngreso ? 'text-income font-bold' : 'text-expense font-bold'}>
                          {isIngreso ? `+ ${formatCurrency(item.monto)}` : `- ${formatCurrency(item.monto)}`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
