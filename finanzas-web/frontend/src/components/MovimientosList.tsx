// frontend/src/components/MovimientosList.tsx
import { useEffect, useRef, useState } from 'react';
import type {
  Movimiento,
  CreateMovimientoDto,
  MovimientoFilters,
  TipoMovimiento,
} from '../types/movimientos.types';
import type { MetaAhorro } from '../types/metas.types';
import {
  getMovimientos,
  createMovimiento,
  updateMovimiento,
  deleteMovimiento,
} from '../api/movimientos.api';
import { getMetas } from '../api/metas.api';

const PAGE_SIZE = 6;

// Helper para convertir ISO o MySQL datetime a input datetime-local format (YYYY-MM-DDTHH:mm)
function toLocalDatetimeInput(dateStr?: string | Date): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) {
    const now = new Date();
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
  const pad = (n: number) => (n < 10 ? '0' + n : n);
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
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

// Formateador de moneda compacto (ej. $18,500 o $2,000)
function formatCurrency(val: number): string {
  return `$${Number(val || 0).toLocaleString('es-MX', {
    minimumFractionDigits: val % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function MovimientosList() {
  const [movimientos, setMovimientos]         = useState<Movimiento[]>([]);
  const [metas, setMetas]                     = useState<MetaAhorro[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [success, setSuccess]                 = useState<string | null>(null);

  // Filtros
  const [filters, setFilters] = useState<MovimientoFilters>({
    id_meta: '',
    tipo: '',
    fecha_inicio: '',
    fecha_fin: '',
    search: '',
  });

  // Paginación
  const [page, setPage] = useState(1);

  // Modal: Crear Movimiento (Abonar o Retirar)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateMovimientoDto>({
    id_meta: 0,
    tipo: 'INGRESO',
    monto: '' as any,
    fecha: toLocalDatetimeInput(),
  });
  const [creando, setCreando] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const createMontoInputRef = useRef<HTMLInputElement>(null);

  // Modal: Editar Movimiento
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMov, setEditingMov] = useState<Movimiento | null>(null);
  const [editForm, setEditForm] = useState<CreateMovimientoDto>({
    id_meta: 0,
    tipo: 'INGRESO',
    monto: 0,
    fecha: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const editMontoInputRef = useRef<HTMLInputElement>(null);

  // Modal: Eliminar Movimiento
  const [deletingMov, setDeletingMov] = useState<Movimiento | null>(null);
  const [eliminando, setEliminando]   = useState(false);

  /* ── Carga inicial ───────────────────────────── */
  useEffect(() => {
    cargarMetas();
    cargarMovimientos();
  }, []);

  // Refrescar al cambiar filtros
  useEffect(() => {
    cargarMovimientos();
    setPage(1);
  }, [filters.id_meta, filters.tipo, filters.fecha_inicio, filters.fecha_fin, filters.search]);

  // Autofocus crear
  useEffect(() => {
    if (showCreateModal) {
      setCreateError(null);
      setTimeout(() => createMontoInputRef.current?.focus(), 50);
    }
  }, [showCreateModal]);

  // Autofocus editar
  useEffect(() => {
    if (showEditModal) {
      setEditError(null);
      setTimeout(() => editMontoInputRef.current?.focus(), 50);
    }
  }, [showEditModal]);

  async function cargarMetas() {
    try {
      const data = await getMetas();
      setMetas(data);
    } catch {
      // Silencioso
    }
  }

  async function cargarMovimientos() {
    try {
      setLoading(true);
      setError(null);
      const listData = await getMovimientos(filters);
      setMovimientos(listData);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los movimientos de ahorro.');
    } finally {
      setLoading(false);
    }
  }

  /* ── Abrir modal crear con tipo específico ───── */
  function openCreateModal(tipo: TipoMovimiento = 'INGRESO', defaultMetaId?: number) {
    setCreateForm({
      id_meta: defaultMetaId || (filters.id_meta ? Number(filters.id_meta) : (metas.length > 0 ? metas[0].id : 0)),
      tipo,
      monto: '' as any,
      fecha: toLocalDatetimeInput(),
    });
    setCreateError(null);
    setShowCreateModal(true);
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const idMetaNum = Number(createForm.id_meta);
    if (!idMetaNum || idMetaNum <= 0) {
      setCreateError('Debes seleccionar una meta de ahorro.');
      return;
    }
    const montoNum = Number(createForm.monto);
    if (!createForm.monto || isNaN(montoNum) || montoNum <= 0) {
      setCreateError('El monto debe ser numérico y mayor que $0.');
      return;
    }
    if (!createForm.fecha) {
      setCreateError('La fecha del movimiento es obligatoria.');
      return;
    }

    const metaTarget = metas.find((m) => m.id === idMetaNum);
    if (createForm.tipo === 'EGRESO' && metaTarget && montoNum > metaTarget.saldo) {
      setCreateError(
        `No puedes retirar ${formatCurrency(montoNum)} porque el saldo disponible en "${metaTarget.nombre}" es de ${formatCurrency(metaTarget.saldo)}.`
      );
      return;
    }

    try {
      setCreando(true);
      setCreateError(null);
      await createMovimiento({
        id_meta: idMetaNum,
        tipo: createForm.tipo,
        monto: montoNum,
        fecha: createForm.fecha,
      });

      setShowCreateModal(false);
      setSuccess(
        createForm.tipo === 'INGRESO'
          ? 'Dinero agregado correctamente a la meta.'
          : 'Retiro registrado correctamente de la meta.'
      );
      setTimeout(() => setSuccess(null), 3500);
      await Promise.all([cargarMovimientos(), cargarMetas()]);
    } catch (err: any) {
      setCreateError(err.message || 'Error al registrar el movimiento.');
    } finally {
      setCreando(false);
    }
  }

  /* ── Editar Movimiento ───────────────────────── */
  function startEdit(mov: Movimiento) {
    setEditingMov(mov);
    setEditForm({
      id_meta: mov.id_meta,
      tipo: mov.tipo,
      monto: mov.monto,
      fecha: toLocalDatetimeInput(mov.fecha),
    });
    setEditError(null);
    setShowEditModal(true);
  }

  function closeEditModal() {
    if (guardando) return;
    setShowEditModal(false);
    setEditingMov(null);
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMov) return;

    const idMetaNum = Number(editForm.id_meta);
    if (!idMetaNum || idMetaNum <= 0) {
      setEditError('Debes seleccionar una meta.');
      return;
    }
    const montoNum = Number(editForm.monto);
    if (!editForm.monto || isNaN(montoNum) || montoNum <= 0) {
      setEditError('El monto debe ser numérico y mayor a $0.');
      return;
    }
    if (!editForm.fecha) {
      setEditError('La fecha es obligatoria.');
      return;
    }

    try {
      setGuardando(true);
      setEditError(null);
      await updateMovimiento(editingMov.id, {
        id_meta: idMetaNum,
        tipo: editForm.tipo,
        monto: montoNum,
        fecha: editForm.fecha,
      });

      closeEditModal();
      setSuccess('Movimiento actualizado correctamente y saldo sincronizado.');
      setTimeout(() => setSuccess(null), 3500);
      await Promise.all([cargarMovimientos(), cargarMetas()]);
    } catch (err: any) {
      setEditError(err.message || 'Error al actualizar el movimiento.');
    } finally {
      setGuardando(false);
    }
  }

  /* ── Eliminar Movimiento ─────────────────────── */
  function confirmDelete(mov: Movimiento) {
    setDeletingMov(mov);
  }

  async function handleExecuteDelete() {
    if (!deletingMov) return;
    try {
      setEliminando(true);
      await deleteMovimiento(deletingMov.id);
      setSuccess('Movimiento eliminado correctamente y saldo revertido.');
      setTimeout(() => setSuccess(null), 3500);
      setDeletingMov(null);
      await Promise.all([cargarMovimientos(), cargarMetas()]);
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el movimiento.');
    } finally {
      setEliminando(false);
    }
  }

  /* ── Paginación ──────────────────────────────── */
  const totalItems = movimientos.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const paginatedMovimientos = movimientos.slice(startIndex, startIndex + PAGE_SIZE);

  const hasActiveFilters =
    Boolean(filters.id_meta) ||
    Boolean(filters.tipo) ||
    Boolean(filters.fecha_inicio) ||
    Boolean(filters.fecha_fin) ||
    Boolean(filters.search);

  function resetFilters() {
    setFilters({
      id_meta: '',
      tipo: '',
      fecha_inicio: '',
      fecha_fin: '',
      search: '',
    });
  }

  // Previsualización de saldo para Modal Crear
  const selectedMetaForCreate = metas.find((m) => m.id === Number(createForm.id_meta));
  const createMontoNumber = Number(createForm.monto) || 0;
  let simulatedSaldoCreate: number | null = null;
  if (selectedMetaForCreate && createMontoNumber > 0) {
    simulatedSaldoCreate =
      createForm.tipo === 'INGRESO'
        ? selectedMetaForCreate.saldo + createMontoNumber
        : selectedMetaForCreate.saldo - createMontoNumber;
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* ── Header Principal ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-foreground tracking-tight">
            Movimientos de ahorro
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1.5 font-medium">
            Consulta aportes, retiros y saldos de tus metas.
          </p>
        </div>

        <button
          id="btn-header-agregar-dinero"
          onClick={() => openCreateModal('INGRESO')}
          className="px-6 py-3 rounded-2xl text-sm font-bold bg-[#093539] text-white hover:bg-[#07272a] active:scale-95 transition-all shadow-sm flex items-center gap-2 shrink-0 cursor-pointer w-fit"
        >
          <span className="text-lg leading-none font-normal">+</span>
          <span>Agregar dinero</span>
        </button>
      </div>

      {/* Alertas */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-success-soft text-income text-sm border border-income/20 animate-in fade-in duration-200">
          <span>✓</span>
          <span className="font-medium">{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-income/60 hover:text-income cursor-pointer">✕</button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-danger-soft text-destructive text-sm border border-destructive/20">
          <span>⚠️</span>
          <span className="font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-destructive/60 hover:text-destructive cursor-pointer">✕</button>
        </div>
      )}

      {/* ── Tarjetas de Saldos de Metas (Fila de Resumen) ── */}
      {metas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {metas.slice(0, 3).map((m) => (
            <div
              key={m.id}
              onClick={() => setFilters({ ...filters, id_meta: filters.id_meta === m.id ? '' : m.id })}
              className={`rounded-3xl p-6 border transition-all cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md ${
                filters.id_meta === m.id
                  ? 'bg-card border-[#093539] ring-2 ring-[#093539]/20'
                  : 'bg-card border-border/80 hover:border-border'
              }`}
            >
              <div>
                <p className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  {m.nombre}
                </p>
                <p className="text-2xl sm:text-[28px] font-extrabold font-display text-foreground tracking-tight mt-1">
                  {formatCurrency(m.saldo)}
                  <span className="text-xs sm:text-sm text-muted-foreground ml-1 font-semibold">MXN</span>
                </p>
              </div>
              <p className="text-xs font-semibold text-muted-foreground/80 mt-2">
                Saldo actual
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Contenedor Principal / Filtros y Tabla ── */}
      <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs flex flex-col gap-4">
        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Input de Búsqueda */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              id="input-search-movimientos"
              type="text"
              placeholder="Buscar por meta..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-11 pr-4 py-2.5 text-sm font-medium rounded-2xl border border-border bg-background text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
            />
          </div>

          {/* Select de Metas */}
          <div className="w-full sm:w-56">
            <select
              id="select-filter-meta"
              value={filters.id_meta || ''}
              onChange={(e) => setFilters({ ...filters, id_meta: e.target.value ? Number(e.target.value) : '' })}
              className="w-full px-4 py-2.5 text-sm font-semibold rounded-2xl border border-border bg-background text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all cursor-pointer"
            >
              <option value="">Todas las categorías</option>
              {metas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Fecha */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Desde:</span>
            <input
              id="input-filter-fecha"
              type="date"
              value={filters.fecha_inicio || ''}
              onChange={(e) => setFilters({ ...filters, fecha_inicio: e.target.value })}
              className="px-3.5 py-2 text-sm font-semibold rounded-2xl border border-border bg-background text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all cursor-pointer"
            />
          </div>

          {/* Botón Limpiar */}
          <button
            id="btn-limpiar-filtros"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-sm font-bold border border-border bg-card text-foreground hover:bg-muted transition-colors whitespace-nowrap cursor-pointer shadow-xs"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            <span>Limpiar</span>
          </button>
        </div>
      </div>

      {/* ── Tabla de Movimientos ── */}
      <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs flex flex-col">
        {loading ? (
          <div className="flex flex-col gap-0 p-6">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="py-4 border-b border-border last:border-0">
                <div
                  className="h-6 rounded-xl w-full"
                  style={{
                    background: 'linear-gradient(90deg, var(--muted) 25%, var(--accent) 50%, var(--muted) 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.4s infinite',
                  }}
                />
              </div>
            ))}
          </div>
        ) : movimientos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 gap-3 text-muted-foreground">
            <span className="text-5xl">📥</span>
            <p className="text-base font-bold text-foreground">
              {hasActiveFilters ? 'No se encontraron movimientos con los filtros aplicados' : 'No hay movimientos de ahorro registrados'}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-sm text-center">
              {hasActiveFilters
                ? 'Intenta ajustar los criterios de búsqueda o limpia los filtros para ver otros registros.'
                : 'Registra aportes o retiros de dinero en tus metas para llevar un control exacto.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={resetFilters}
                className="mt-2 px-5 py-2.5 rounded-2xl text-sm font-bold border border-border text-foreground hover:bg-muted transition-all cursor-pointer shadow-xs"
              >
                Limpiar filtros
              </button>
            ) : (
              <button
                onClick={() => openCreateModal('INGRESO')}
                className="mt-2 px-6 py-3 rounded-2xl text-sm font-bold bg-[#093539] text-white hover:bg-[#07272a] transition-all cursor-pointer shadow-sm"
              >
                + Agregar dinero
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-6 py-3.5 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">META</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">TIPO DE MOVIMIENTO</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">MONTO</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">FECHA</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">SALDO RESULTANTE</th>
                  <th className="text-right px-6 py-3.5 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMovimientos.map((mov) => {
                  const isIngreso = mov.tipo === 'INGRESO';
                  const saldoRow = mov.saldo_resultante !== undefined ? mov.saldo_resultante : (mov.saldo_meta || 0);

                  return (
                    <tr key={mov.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/30">
                      {/* Meta */}
                      <td className="px-6 py-4 font-bold text-foreground text-sm sm:text-base">
                        {mov.nombre_meta}
                      </td>

                      {/* Tipo de Movimiento */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            isIngreso
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-income border border-income/20'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-expense border border-expense/20'
                          }`}
                        >
                          <span className={`size-1.5 rounded-full ${isIngreso ? 'bg-income' : 'bg-expense'}`} />
                          {isIngreso ? 'Ingreso a meta' : 'Retiro de meta'}
                        </span>
                      </td>

                      {/* Monto */}
                      <td className={`px-6 py-4 font-extrabold font-display text-base sm:text-lg ${isIngreso ? 'text-income' : 'text-expense'}`}>
                        {isIngreso ? `+${formatCurrency(mov.monto)}` : `-${formatCurrency(mov.monto)}`}
                      </td>

                      {/* Fecha */}
                      <td className="px-6 py-4 text-foreground font-semibold whitespace-nowrap text-xs sm:text-sm">
                        {formatFriendlyDate(mov.fecha)}
                      </td>

                      {/* Saldo Resultante */}
                      <td className="px-6 py-4 font-extrabold font-display text-foreground text-sm sm:text-base">
                        {formatCurrency(saldoRow)}
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`btn-editar-mov-${mov.id}`}
                            title="Editar movimiento"
                            onClick={() => startEdit(mov)}
                            className="size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>

                          <button
                            id={`btn-eliminar-mov-${mov.id}`}
                            title="Eliminar movimiento"
                            onClick={() => confirmDelete(mov)}
                            className="size-9 rounded-xl flex items-center justify-center text-destructive/70 hover:text-destructive hover:bg-danger-soft transition-colors cursor-pointer"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Botones de Acción y Paginación Inferior ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border bg-card/60">
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-bottom-agregar-dinero"
              onClick={() => openCreateModal('INGRESO')}
              className="px-6 py-3 rounded-2xl text-sm font-bold bg-[#093539] text-white hover:bg-[#07272a] active:scale-95 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span className="text-base leading-none font-normal">+</span>
              <span>Agregar dinero</span>
            </button>

            <button
              id="btn-bottom-retirar-dinero"
              onClick={() => openCreateModal('EGRESO')}
              className="px-6 py-3 rounded-2xl text-sm font-bold border border-border bg-card text-foreground hover:bg-muted active:scale-95 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span className="text-base leading-none">↙</span>
              <span>Retirar</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
              Mostrando <strong className="text-foreground">{totalItems > 0 ? `${startIndex + 1}–${Math.min(startIndex + PAGE_SIZE, totalItems)}` : '0'}</strong> de <strong className="text-foreground">{totalItems}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="size-9 rounded-xl border border-border bg-card text-foreground flex items-center justify-center hover:bg-muted disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-all font-bold"
              >
                ‹
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="size-9 rounded-xl border border-border bg-card text-foreground flex items-center justify-center hover:bg-muted disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-all font-bold"
              >
                ›
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Modal: Registrar Movimiento (Abonar / Retirar) ── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget && !creando) setShowCreateModal(false); }}
        >
          <div className="w-full max-w-lg bg-card rounded-3xl border border-border/60 shadow-2xl p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold font-display text-foreground tracking-tight">
                  {createForm.tipo === 'INGRESO' ? 'Agregar Dinero a Meta' : 'Retirar Dinero de Meta'}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground mt-1 font-medium">
                  {createForm.tipo === 'INGRESO' ? 'Abonar fondos para acelerar tu objetivo.' : 'Retirar fondos de una meta existente.'}
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={creando}
                className="size-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors -mt-1 -mr-1 cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {createError && (
              <div className="px-4 py-3 rounded-2xl bg-danger-soft text-destructive text-sm font-semibold border border-destructive/20">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-5">
              {/* Meta destino */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-foreground">
                  Meta de ahorro <span className="text-expense">*</span>
                </label>
                <select
                  id="input-create-mov-meta"
                  value={createForm.id_meta || ''}
                  onChange={(e) => setCreateForm({ ...createForm, id_meta: Number(e.target.value) })}
                  className="w-full px-4 py-3 text-base font-medium rounded-2xl border border-border bg-background text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all cursor-pointer shadow-xs"
                  required
                >
                  <option value="" disabled>Selecciona una meta</option>
                  {metas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} (Saldo actual: {formatCurrency(m.saldo)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Movimiento */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-foreground">
                  Tipo de movimiento <span className="text-expense">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, tipo: 'INGRESO' })}
                    className={`py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      createForm.tipo === 'INGRESO'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-income border-income/30 shadow-xs'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <span>+</span> Ingreso a meta
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, tipo: 'EGRESO' })}
                    className={`py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      createForm.tipo === 'EGRESO'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-expense border-expense/30 shadow-xs'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <span>↙</span> Retiro de meta
                  </button>
                </div>
              </div>

              {/* Monto */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-foreground">
                  Monto (MXN) <span className="text-expense">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-base">$</span>
                  <input
                    ref={createMontoInputRef}
                    id="input-create-mov-monto"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="2000.00"
                    value={createForm.monto || ''}
                    onChange={(e) => setCreateForm({ ...createForm, monto: e.target.value as any })}
                    className="w-full pl-9 pr-4 py-3 rounded-2xl border border-border bg-background text-foreground text-base font-medium outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all shadow-xs"
                    required
                  />
                </div>
              </div>

              {/* Fecha */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-foreground">
                  Fecha y hora <span className="text-expense">*</span>
                </label>
                <input
                  id="input-create-mov-fecha"
                  type="datetime-local"
                  value={createForm.fecha}
                  onChange={(e) => setCreateForm({ ...createForm, fecha: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-base font-medium outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all shadow-xs"
                  required
                />
              </div>

              {/* Previsualización del Saldo Resultante */}
              {selectedMetaForCreate && (
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between font-medium text-muted-foreground">
                    <span>Saldo actual de "{selectedMetaForCreate.nombre}":</span>
                    <span className="font-bold text-foreground">{formatCurrency(selectedMetaForCreate.saldo)}</span>
                  </div>
                  {simulatedSaldoCreate !== null && (
                    <div className="flex justify-between font-bold pt-1 border-t border-border/40">
                      <span>Saldo resultante estimado:</span>
                      <span className={simulatedSaldoCreate < 0 ? 'text-expense font-extrabold' : 'text-income font-extrabold'}>
                        {formatCurrency(simulatedSaldoCreate)}
                      </span>
                    </div>
                  )}
                  {simulatedSaldoCreate !== null && simulatedSaldoCreate < 0 && (
                    <p className="text-expense text-[11px] font-semibold mt-1">
                      ⚠️ Fondos insuficientes. No se permite dejar saldo negativo.
                    </p>
                  )}
                </div>
              )}

              {/* Botones */}
              <div className="flex justify-end items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creando}
                  className="px-6 py-3 rounded-2xl text-sm font-bold border border-border bg-card text-foreground hover:bg-muted transition-colors shadow-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-submit-create-mov"
                  disabled={creando || (simulatedSaldoCreate !== null && simulatedSaldoCreate < 0)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold bg-[#093539] text-white hover:bg-[#07272a] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                >
                  {creando ? (
                    <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                  ) : null}
                  Confirmar movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Editar Movimiento ────────────────── */}
      {showEditModal && editingMov && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget && !guardando) closeEditModal(); }}
        >
          <div className="w-full max-w-lg bg-card rounded-3xl border border-border/60 shadow-2xl p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold font-display text-foreground tracking-tight">
                  Editar Movimiento #{editingMov.id}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground mt-1 font-medium">
                  El saldo de las metas se recalculará de forma segura.
                </p>
              </div>
              <button
                onClick={closeEditModal}
                disabled={guardando}
                className="size-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors -mt-1 -mr-1 cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {editError && (
              <div className="px-4 py-3 rounded-2xl bg-danger-soft text-destructive text-sm font-semibold border border-destructive/20">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-5">
              {/* Meta destino */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-foreground">
                  Meta de ahorro <span className="text-expense">*</span>
                </label>
                <select
                  id="input-edit-mov-meta"
                  value={editForm.id_meta || ''}
                  onChange={(e) => setEditForm({ ...editForm, id_meta: Number(e.target.value) })}
                  className="w-full px-4 py-3 text-base font-medium rounded-2xl border border-border bg-background text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all cursor-pointer shadow-xs"
                  required
                >
                  {metas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} (Saldo actual: {formatCurrency(m.saldo)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Movimiento */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-foreground">
                  Tipo de movimiento <span className="text-expense">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, tipo: 'INGRESO' })}
                    className={`py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      editForm.tipo === 'INGRESO'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-income border-income/30 shadow-xs'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <span>+</span> Ingreso a meta
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, tipo: 'EGRESO' })}
                    className={`py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      editForm.tipo === 'EGRESO'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-expense border-expense/30 shadow-xs'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <span>↙</span> Retiro de meta
                  </button>
                </div>
              </div>

              {/* Monto */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-foreground">
                  Monto (MXN) <span className="text-expense">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-base">$</span>
                  <input
                    ref={editMontoInputRef}
                    id="input-edit-mov-monto"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="2000.00"
                    value={editForm.monto || ''}
                    onChange={(e) => setEditForm({ ...editForm, monto: e.target.value as any })}
                    className="w-full pl-9 pr-4 py-3 rounded-2xl border border-border bg-background text-foreground text-base font-medium outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all shadow-xs"
                    required
                  />
                </div>
              </div>

              {/* Fecha */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-foreground">
                  Fecha y hora <span className="text-expense">*</span>
                </label>
                <input
                  id="input-edit-mov-fecha"
                  type="datetime-local"
                  value={editForm.fecha}
                  onChange={(e) => setEditForm({ ...editForm, fecha: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-base font-medium outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all shadow-xs"
                  required
                />
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 text-xs text-muted-foreground leading-relaxed font-medium">
                ℹ️ Al guardar cambios, el sistema revertirá el efecto del movimiento original sobre el saldo y aplicará los nuevos valores en una única transacción segura.
              </div>

              {/* Botones */}
              <div className="flex justify-end items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={guardando}
                  className="px-6 py-3 rounded-2xl text-sm font-bold border border-border bg-card text-foreground hover:bg-muted transition-colors shadow-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-submit-edit-mov"
                  disabled={guardando}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold bg-[#093539] text-white hover:bg-[#07272a] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                >
                  {guardando ? (
                    <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                  ) : null}
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar Eliminación ───────────── */}
      {deletingMov && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget && !eliminando) setDeletingMov(null); }}
        >
          <div className="w-full max-w-md rounded-3xl bg-card border border-destructive/20 p-8 shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="size-14 rounded-2xl bg-danger-soft flex items-center justify-center text-destructive text-2xl mx-auto">
              🗑️
            </div>
            <div className="text-center">
              <h3 className="text-xl font-extrabold font-display text-foreground tracking-tight">
                ¿Eliminar movimiento de ahorro?
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground mt-2 leading-relaxed font-medium">
                Estás a punto de eliminar el movimiento #{deletingMov.id} de tipo{' '}
                <strong className="text-foreground font-bold">{deletingMov.tipo === 'INGRESO' ? 'Ingreso a meta' : 'Retiro de meta'}</strong> por{' '}
                <strong className="text-foreground font-bold">{formatCurrency(deletingMov.monto)}</strong> vinculado a{' '}
                <strong className="text-foreground font-bold">"{deletingMov.nombre_meta}"</strong>.
              </p>
              <div className="mt-3 p-3.5 rounded-2xl bg-muted/50 text-xs text-muted-foreground border border-border/50 text-left font-medium">
                {deletingMov.tipo === 'INGRESO' ? (
                  <span>
                    ℹ️ Al eliminar este <strong>Ingreso</strong>, se restarán {formatCurrency(deletingMov.monto)} del saldo de la meta.
                  </span>
                ) : (
                  <span>
                    ℹ️ Al eliminar este <strong>Retiro</strong>, se reintegrarán {formatCurrency(deletingMov.monto)} al saldo de la meta.
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMov(null)}
                disabled={eliminando}
                className="flex-1 py-3 rounded-2xl text-sm font-bold border border-border bg-card text-foreground hover:bg-muted transition-colors shadow-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirm-delete-mov"
                onClick={handleExecuteDelete}
                disabled={eliminando}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold bg-destructive text-destructive-foreground hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {eliminando ? (
                  <span className="size-4 rounded-full border-2 border-destructive-foreground/30 border-t-destructive-foreground animate-spin inline-block" />
                ) : null}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
