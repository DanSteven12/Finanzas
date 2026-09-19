// frontend/src/components/LimitesList.tsx
import { useEffect, useRef, useState } from 'react';
import type {
  Limite,
  CreateLimiteDto,
  LimiteFilters,
  EstadoLimite,
} from '../types/limites.types';
import type { CatEgreso } from '../types/catEgresos.types';
import {
  getLimites,
  createLimite,
  updateLimite,
  deleteLimite,
  getLimitesSummary,
} from '../api/limites.api';
import { getCategorias } from '../api/catEgresos.api';

// Helper para convertir fecha a formato mes legible en español (ej. "Octubre 2026")
function formatMonthDisplay(dateStr?: string | Date): string {
  if (!dateStr) return 'Octubre 2026';
  const str = String(dateStr);
  const parts = str.substring(0, 10).split('-');
  if (parts.length >= 2) {
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const date = new Date(year, monthIndex, 1);
    const monthName = date.toLocaleDateString('es-MX', { month: 'long' });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
  }
  return str;
}

// Helper para obtener el mes actual en formato YYYY-MM
function getCurrentMonthInput(): string {
  const now = new Date();
  const pad = (n: number) => (n < 10 ? '0' + n : n);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

// Helper para convertir fecha YYYY-MM-DD a YYYY-MM para input type="month"
function toMonthInputValue(dateStr?: string): string {
  if (!dateStr) return getCurrentMonthInput();
  return dateStr.substring(0, 7);
}

// Badge de Estado visual según diseño exacto
function EstadoBadge({ estado }: { estado: EstadoLimite }) {
  switch (estado) {
    case 'dentro':
      return (
        <span className="inline-block px-3 py-0.5 rounded-full text-xs font-semibold bg-[#e6f7f2] text-[#059669]">
          Normal
        </span>
      );
    case 'cerca':
      return (
        <span className="inline-block px-3 py-0.5 rounded-full text-xs font-semibold bg-[#fef3c7] text-[#b45309]">
          Cerca del límite
        </span>
      );
    case 'alcanzado':
      return (
        <span className="inline-block px-3 py-0.5 rounded-full text-xs font-semibold bg-[#ffedd5] text-[#c2410c]">
          Límite alcanzado
        </span>
      );
    case 'excedido':
      return (
        <span className="inline-block px-3 py-0.5 rounded-full text-xs font-semibold bg-[#ffe4e6] text-[#e11d48]">
          Presupuesto excedido
        </span>
      );
    default:
      return null;
  }
}

// Color de la barra de progreso inferior según estado
function getProgressBarColor(estado: EstadoLimite): string {
  switch (estado) {
    case 'dentro':
      return '#064e3b'; // Deep emerald green
    case 'cerca':
      return '#d97706'; // Amber / Orange
    case 'alcanzado':
    case 'excedido':
      return '#e11d48'; // Rose / Coral red
    default:
      return '#064e3b';
  }
}

// Formateador de moneda compacto (ej. $13,200)
function formatCurrency(val: number): string {
  return `$${Number(val || 0).toLocaleString('es-MX', {
    minimumFractionDigits: val % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function LimitesList() {
  const [limites, setLimites]               = useState<Limite[]>([]);
  const [categorias, setCategorias]         = useState<CatEgreso[]>([]);
  const [totalPresupuestado, setTotalPres]  = useState<number>(0);
  const [totalGastado, setTotalGastado]     = useState<number>(0);
  const [totalDisponible, setTotalDisp]     = useState<number>(0);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [success, setSuccess]               = useState<string | null>(null);

  // Filtros
  const [filters, setFilters] = useState<LimiteFilters>({
    id_cat: '',
    mes: '',
  });

  // Modal: Crear Límite
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateLimiteDto>({
    monto: 0,
    mes: getCurrentMonthInput(),
    id_cat: 0,
  });
  const [creando, setCreando] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const createMontoInputRef = useRef<HTMLInputElement>(null);

  // Modal: Editar Límite
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLimite, setEditingLimite] = useState<Limite | null>(null);
  const [editForm, setEditForm] = useState<CreateLimiteDto>({
    monto: 0,
    mes: '',
    id_cat: 0,
  });
  const [guardando, setGuardando] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const editMontoInputRef = useRef<HTMLInputElement>(null);

  // Modal: Confirmación de Eliminación
  const [deletingLimite, setDeletingLimite] = useState<Limite | null>(null);
  const [eliminando, setEliminando] = useState(false);

  /* ── Carga inicial ───────────────────────────── */
  useEffect(() => {
    cargarCategorias();
    cargarLimites();
  }, []);

  // Refrescar lista cuando cambien los filtros
  useEffect(() => {
    cargarLimites();
  }, [filters.id_cat, filters.mes]);

  // Autofocus en modal de crear
  useEffect(() => {
    if (showCreateModal) {
      setCreateError(null);
      setTimeout(() => createMontoInputRef.current?.focus(), 50);
    }
  }, [showCreateModal]);

  // Autofocus en modal de editar
  useEffect(() => {
    if (showEditModal) {
      setEditError(null);
      setTimeout(() => editMontoInputRef.current?.focus(), 50);
    }
  }, [showEditModal]);

  async function cargarCategorias() {
    try {
      const data = await getCategorias();
      setCategorias(data);
    } catch {
      // Silencioso
    }
  }

  async function cargarLimites() {
    try {
      setLoading(true);
      setError(null);
      const [data, summary] = await Promise.all([
        getLimites(filters),
        getLimitesSummary(filters),
      ]);
      setLimites(data);
      setTotalPres(summary.total_presupuestado || 0);
      setTotalGastado(summary.total_gastado || 0);
      setTotalDisp(summary.total_disponible || 0);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los límites de presupuesto.');
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key: keyof LimiteFilters, value: any) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleClearFilters() {
    setFilters({
      id_cat: '',
      mes: '',
    });
  }

  /* ── Crear Límite ────────────────────────────── */
  function openCreateModal() {
    const defaultCatId = categorias.length > 0 ? categorias[0].id : 0;
    setCreateForm({
      monto: '' as any,
      mes: filters.mes || getCurrentMonthInput(),
      id_cat: defaultCatId,
    });
    setCreateError(null);
    setShowCreateModal(true);
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.monto || Number(createForm.monto) <= 0) {
      setCreateError('El monto debe ser numérico y mayor a 0.');
      return;
    }
    if (!createForm.id_cat) {
      setCreateError('Debes seleccionar una categoría.');
      return;
    }
    if (!createForm.mes || createForm.mes.trim() === '') {
      setCreateError('Debes seleccionar el mes correspondiente.');
      return;
    }

    try {
      setCreando(true);
      setCreateError(null);
      await createLimite({
        monto: Number(createForm.monto),
        mes: createForm.mes.trim(),
        id_cat: Number(createForm.id_cat),
      });

      setShowCreateModal(false);
      setSuccess('Presupuesto establecido exitosamente.');
      setTimeout(() => setSuccess(null), 3500);
      await cargarLimites();
    } catch (err: any) {
      setCreateError(err.message || 'Error al crear el límite.');
    } finally {
      setCreando(false);
    }
  }

  /* ── Editar Límite ───────────────────────────── */
  function startEdit(item: Limite) {
    setEditingLimite(item);
    setEditForm({
      monto: item.monto,
      mes: toMonthInputValue(item.mes),
      id_cat: item.id_cat,
    });
    setEditError(null);
    setShowEditModal(true);
  }

  function closeEditModal() {
    if (guardando) return;
    setShowEditModal(false);
    setEditingLimite(null);
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLimite) return;
    if (!editForm.monto || Number(editForm.monto) <= 0) {
      setEditError('El monto debe ser numérico y mayor a 0.');
      return;
    }
    if (!editForm.id_cat) {
      setEditError('Debes seleccionar una categoría.');
      return;
    }
    if (!editForm.mes || editForm.mes.trim() === '') {
      setEditError('Debes seleccionar el mes.');
      return;
    }

    try {
      setGuardando(true);
      setEditError(null);
      await updateLimite(editingLimite.id, {
        monto: Number(editForm.monto),
        mes: editForm.mes.trim(),
        id_cat: Number(editForm.id_cat),
      });

      closeEditModal();
      setSuccess('Presupuesto actualizado correctamente.');
      setTimeout(() => setSuccess(null), 3500);
      await cargarLimites();
    } catch (err: any) {
      setEditError(err.message || 'Error al actualizar el límite.');
    } finally {
      setGuardando(false);
    }
  }

  /* ── Eliminar Límite ─────────────────────────── */
  function confirmDelete(item: Limite) {
    setDeletingLimite(item);
  }

  async function handleExecuteDelete() {
    if (!deletingLimite) return;
    try {
      setEliminando(true);
      await deleteLimite(deletingLimite.id);
      setSuccess(`Límite de "${deletingLimite.categoria_nombre}" eliminado. Tus egresos registrados permanecen intactos.`);
      setTimeout(() => setSuccess(null), 4000);
      setDeletingLimite(null);
      await cargarLimites();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el límite.');
    } finally {
      setEliminando(false);
    }
  }

  // Porcentaje global utilizado
  const porcentajeGlobal = totalPresupuestado > 0
    ? Math.round((totalGastado / totalPresupuestado) * 100)
    : 0;

  const currentMonthFormatted = formatMonthDisplay(filters.mes || getCurrentMonthInput());

  return (
    <div className="flex flex-col gap-6 pb-12">

      {/* ── Sección Principal: Título y Botón Crear ──── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-display text-foreground tracking-tight">
            Límites / Presupuestos
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Controla cuánto puedes gastar cada mes por categoría.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Selector de Mes */}
          <div className="flex items-center gap-1.5 bg-card border border-border/70 rounded-xl px-3 py-1.5 shadow-xs">
            <span className="text-xs text-muted-foreground font-medium">📅</span>
            <input
              id="input-filtro-limites-mes"
              type="month"
              value={filters.mes || ''}
              onChange={(e) => handleFilterChange('mes', e.target.value)}
              className="text-xs font-semibold bg-transparent text-foreground outline-none cursor-pointer"
            />
            {filters.mes && (
              <button
                onClick={handleClearFilters}
                title="Restablecer mes actual"
                className="text-[10px] text-muted-foreground hover:text-foreground ml-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Botón Crear Límite */}
          <button
            id="btn-nuevo-limite"
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#093539] text-white hover:bg-[#07272a] active:scale-95 transition-all shadow-sm flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <span className="text-base leading-none font-normal">+</span>
            <span>Crear límite</span>
          </button>
        </div>
      </div>

      {/* Alertas */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-success-soft text-income text-sm border border-income/20 animate-in fade-in duration-200">
          <span>✓</span>
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-income/60 hover:text-income">✕</button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-danger-soft text-destructive text-sm border border-destructive/20">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-destructive/60 hover:text-destructive">✕</button>
        </div>
      )}

      {/* ── 4 Tarjetas Superiores de Resumen ─────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* 1. Presupuesto Total */}
        <div className="bg-card rounded-3xl p-5 border border-border/70 shadow-xs flex flex-col justify-between">
          <div className="size-10 rounded-xl bg-[#e6f7f5] text-[#0d9488] flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Presupuesto total</p>
            <p className="text-2xl sm:text-[26px] font-bold font-display text-foreground tracking-tight">
              {formatCurrency(totalPresupuestado)}
            </p>
          </div>
        </div>

        {/* 2. Total Gastado */}
        <div className="bg-card rounded-3xl p-5 border border-border/70 shadow-xs flex flex-col justify-between">
          <div className="size-10 rounded-xl bg-[#e6f7f5] text-[#0d9488] flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="17" y1="7" x2="7" y2="17" />
              <polyline points="17 17 7 17 7 7" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Total gastado</p>
            <p className="text-2xl sm:text-[26px] font-bold font-display text-foreground tracking-tight">
              {formatCurrency(totalGastado)}
            </p>
          </div>
        </div>

        {/* 3. Disponible */}
        <div className="bg-card rounded-3xl p-5 border border-border/70 shadow-xs flex flex-col justify-between">
          <div className="size-10 rounded-xl bg-[#e6f7f5] text-[#0d9488] flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v12M15 9.5a2.5 2.5 0 0 0-5 0c0 3 5 2 5 5a2.5 2.5 0 0 1-5 0" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Disponible</p>
            <p className="text-2xl sm:text-[26px] font-bold font-display text-foreground tracking-tight">
              {formatCurrency(Math.max(0, totalDisponible))}
            </p>
          </div>
        </div>

        {/* 4. Porcentaje Utilizado */}
        <div className="bg-card rounded-3xl p-5 border border-border/70 shadow-xs flex flex-col justify-between">
          <div className="size-10 rounded-xl bg-[#e6f7f5] text-[#0d9488] flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Porcentaje utilizado</p>
            <p className="text-2xl sm:text-[26px] font-bold font-display text-foreground tracking-tight">
              {porcentajeGlobal}%
            </p>
          </div>
        </div>

      </div>

      {/* ── Cuadrícula de Tarjetas de Presupuesto ─────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-card rounded-3xl p-6 border border-border/70 shadow-xs flex flex-col gap-4">
              <div className="h-6 rounded-lg w-1/2 bg-muted/60 animate-pulse" />
              <div className="h-4 rounded-full w-1/3 bg-muted/40 animate-pulse" />
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 rounded-2xl bg-muted/30 animate-pulse" />
                ))}
              </div>
              <div className="h-2.5 rounded-full bg-muted/40 animate-pulse mt-2" />
            </div>
          ))}
        </div>
      ) : limites.length === 0 ? (
        <div className="finance-card flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground mt-2">
          <span className="text-5xl">💳</span>
          <p className="text-base font-bold font-display text-foreground">
            No hay presupuestos configurados para {currentMonthFormatted}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm text-center">
            Crea tu primer límite de gasto mensual para mantener tus finanzas bajo control.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#093539] text-white hover:bg-[#07272a] transition-all"
          >
            + Crear límite
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-2">
          {limites.map((limite) => {
            const barWidth = Math.min(100, Math.max(0, limite.porcentaje));
            const barColor = getProgressBarColor(limite.estado);

            return (
              <div
                key={limite.id}
                className="bg-card rounded-3xl p-6 border border-border/70 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow duration-200"
              >
                {/* Cabecera de la tarjeta */}
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold font-display text-foreground leading-snug">
                        {limite.categoria_nombre || 'Categoría'}
                      </h3>
                      <div className="mt-1">
                        <EstadoBadge estado={limite.estado} />
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1">
                      <button
                        id={`btn-editar-limite-${limite.id}`}
                        title="Editar"
                        onClick={() => startEdit(limite)}
                        className="size-7 flex items-center justify-center rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        id={`btn-eliminar-limite-${limite.id}`}
                        title="Eliminar"
                        onClick={() => confirmDelete(limite)}
                        className="size-7 flex items-center justify-center rounded-lg text-rose-500/80 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Cuadrícula 2x2 de métricas */}
                  <div className="grid grid-cols-2 gap-2.5 mt-5 mb-4">
                    {/* Límite mensual */}
                    <div className="rounded-2xl bg-[#f8fafc] dark:bg-muted/30 p-3.5 flex flex-col justify-center">
                      <span className="text-xs font-medium text-muted-foreground">Límite mensual</span>
                      <span className="text-base font-bold font-display text-foreground mt-0.5">
                        {formatCurrency(limite.monto)}
                      </span>
                    </div>

                    {/* Gastado */}
                    <div className="rounded-2xl bg-[#f8fafc] dark:bg-muted/30 p-3.5 flex flex-col justify-center">
                      <span className="text-xs font-medium text-muted-foreground">Gastado</span>
                      <span className="text-base font-bold font-display text-foreground mt-0.5">
                        {formatCurrency(limite.gasto_acumulado)}
                      </span>
                    </div>

                    {/* Disponible */}
                    <div className="rounded-2xl bg-[#f8fafc] dark:bg-muted/30 p-3.5 flex flex-col justify-center">
                      <span className="text-xs font-medium text-muted-foreground">Disponible</span>
                      <span className="text-base font-bold font-display text-foreground mt-0.5">
                        {formatCurrency(Math.max(0, limite.disponible))}
                      </span>
                    </div>

                    {/* Utilizado */}
                    <div className="rounded-2xl bg-[#f8fafc] dark:bg-muted/30 p-3.5 flex flex-col justify-center">
                      <span className="text-xs font-medium text-muted-foreground">Utilizado</span>
                      <span className="text-base font-bold font-display text-foreground mt-0.5">
                        {limite.porcentaje.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Barra de progreso inferior */}
                <div className="w-full h-2.5 rounded-full bg-[#f1f5f9] dark:bg-muted overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Registrar Límite ─────────────────── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
        >
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-display text-foreground">
                  Establecer Límite Mensual
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Define el presupuesto máximo para una categoría en un mes.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-2xl bg-danger-soft text-destructive text-xs border border-destructive/20 leading-relaxed">
                ⚠️ {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
              {/* Categoría */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Categoría de egreso <span className="text-expense">*</span>
                </label>
                <select
                  id="input-create-limite-cat"
                  value={createForm.id_cat}
                  onChange={(e) => setCreateForm({ ...createForm, id_cat: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-foreground text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all cursor-pointer"
                  required
                >
                  <option value={0} disabled>Selecciona una categoría...</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Mes del presupuesto <span className="text-expense">*</span>
                </label>
                <input
                  id="input-create-limite-mes"
                  type="month"
                  value={createForm.mes}
                  onChange={(e) => setCreateForm({ ...createForm, mes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-foreground text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                  required
                />
              </div>

              {/* Monto */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Monto límite (MXN) <span className="text-expense">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">$</span>
                  <input
                    ref={createMontoInputRef}
                    id="input-create-limite-monto"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="3000.00"
                    value={createForm.monto || ''}
                    onChange={(e) => setCreateForm({ ...createForm, monto: e.target.value as any })}
                    className="w-full pl-8 pr-4 py-2.5 rounded-2xl border border-border bg-background text-foreground text-sm font-semibold outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-2xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-submit-create-limite"
                  disabled={creando}
                  className="flex-1 py-2.5 rounded-2xl bg-[#093539] text-white text-sm font-bold hover:bg-[#07272a] active:scale-95 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {creando ? 'Guardando...' : 'Crear límite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Editar Límite ────────────────────── */}
      {showEditModal && editingLimite && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
        >
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-display text-foreground">
                  Editar Límite Mensual
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Modifica el límite asignado para la categoría seleccionada.
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-2xl bg-danger-soft text-destructive text-xs border border-destructive/20 leading-relaxed">
                ⚠️ {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              {/* Categoría */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Categoría de egreso <span className="text-expense">*</span>
                </label>
                <select
                  id="input-edit-limite-cat"
                  value={editForm.id_cat}
                  onChange={(e) => setEditForm({ ...editForm, id_cat: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-foreground text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all cursor-pointer"
                  required
                >
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Mes del presupuesto <span className="text-expense">*</span>
                </label>
                <input
                  id="input-edit-limite-mes"
                  type="month"
                  value={editForm.mes}
                  onChange={(e) => setEditForm({ ...editForm, mes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-foreground text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                  required
                />
              </div>

              {/* Monto */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Monto límite (MXN) <span className="text-expense">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">$</span>
                  <input
                    ref={editMontoInputRef}
                    id="input-edit-limite-monto"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="3000.00"
                    value={editForm.monto || ''}
                    onChange={(e) => setEditForm({ ...editForm, monto: e.target.value as any })}
                    className="w-full pl-8 pr-4 py-2.5 rounded-2xl border border-border bg-background text-foreground text-sm font-semibold outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 py-2.5 rounded-2xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-submit-edit-limite"
                  disabled={guardando}
                  className="flex-1 py-2.5 rounded-2xl bg-[#093539] text-white text-sm font-bold hover:bg-[#07272a] active:scale-95 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar Eliminación ───────────── */}
      {deletingLimite && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
        >
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="size-12 rounded-full bg-danger-soft flex items-center justify-center text-destructive text-xl mx-auto">
              ⚠️
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold font-display text-foreground">
                ¿Eliminar límite mensual?
              </h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Estás a punto de eliminar el presupuesto de{' '}
                <strong className="text-foreground">${Number(deletingLimite.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong> para la categoría{' '}
                <strong className="text-foreground">{deletingLimite.categoria_nombre}</strong> correspondiente a{' '}
                <strong className="text-foreground">{formatMonthDisplay(deletingLimite.mes)}</strong>.
              </p>
              <div className="mt-3 p-2.5 rounded-2xl bg-muted/60 text-xs text-muted-foreground border border-border/50 text-left">
                ℹ️ <strong>Importante:</strong> Tus gastos registrados en esta categoría permanecerán totalmente intactos.
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeletingLimite(null)}
                disabled={eliminando}
                className="flex-1 py-2.5 rounded-2xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirm-delete-limite"
                onClick={handleExecuteDelete}
                disabled={eliminando}
                className="flex-1 py-2.5 rounded-2xl bg-destructive text-destructive-foreground text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
