// frontend/src/components/EgresosList.tsx
import { useEffect, useRef, useState } from 'react';
import type { Egreso, CreateEgresoDto, EgresoFilters } from '../types/egresos.types';
import type { CatEgreso } from '../types/catEgresos.types';
import {
  getEgresos,
  createEgreso,
  updateEgreso,
  deleteEgreso,
  getEgresosSummary,
} from '../api/egresos.api';
import { getCategorias } from '../api/catEgresos.api';

const PAGE_SIZE = 5;

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

// Helper para formatear fechas amigables
function formatFriendlyDate(dateStr?: string | Date): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EgresosList() {
  const [egresos, setEgresos]           = useState<Egreso[]>([]);
  const [categorias, setCategorias]     = useState<CatEgreso[]>([]);
  const [totalGastado, setTotalGastado] = useState<number>(0);
  const [totalCount, setTotalCount]     = useState<number>(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [success, setSuccess]           = useState<string | null>(null);

  // Filtros
  const [filters, setFilters] = useState<EgresoFilters>({
    fecha_inicio: '',
    fecha_fin: '',
    id_cat: '',
    search: '',
  });

  // Paginación
  const [page, setPage] = useState(1);

  // Modal: Registrar
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateEgresoDto>({
    monto: 0,
    concepto: '',
    fecha: toLocalDatetimeInput(),
    id_cat: 0,
  });
  const [creando, setCreando] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const createMontoInputRef = useRef<HTMLInputElement>(null);

  // Modal: Editar
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEgreso, setEditingEgreso] = useState<Egreso | null>(null);
  const [editForm, setEditForm] = useState<CreateEgresoDto>({
    monto: 0,
    concepto: '',
    fecha: '',
    id_cat: 0,
  });
  const [guardando, setGuardando] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const editMontoInputRef = useRef<HTMLInputElement>(null);

  // Modal: Confirmación de Eliminación
  const [deletingEgreso, setDeletingEgreso] = useState<Egreso | null>(null);
  const [eliminando, setEliminando] = useState(false);

  /* ── Carga inicial ───────────────────────────── */
  useEffect(() => {
    cargarCategorias();
    cargarEgresos();
  }, []);

  // Refrescar lista cuando cambien los filtros
  useEffect(() => {
    cargarEgresos();
    setPage(1);
  }, [filters.fecha_inicio, filters.fecha_fin, filters.id_cat, filters.search]);

  // Enfocar input en modal de crear
  useEffect(() => {
    if (showCreateModal) {
      setCreateError(null);
      setTimeout(() => createMontoInputRef.current?.focus(), 50);
    }
  }, [showCreateModal]);

  // Enfocar input en modal de editar
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

  async function cargarEgresos() {
    try {
      setLoading(true);
      setError(null);
      const [data, summary] = await Promise.all([
        getEgresos(filters),
        getEgresosSummary(filters),
      ]);
      setEgresos(data);
      setTotalGastado(summary.total_monto || 0);
      setTotalCount(summary.total_registros || 0);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los egresos.');
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key: keyof EgresoFilters, value: any) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleClearFilters() {
    setFilters({
      fecha_inicio: '',
      fecha_fin: '',
      id_cat: '',
      search: '',
    });
  }

  /* ── Registrar Egreso ────────────────────────── */
  function openCreateModal() {
    const defaultCatId = categorias.length > 0 ? categorias[0].id : 0;
    setCreateForm({
      monto: '' as any,
      concepto: '',
      fecha: toLocalDatetimeInput(),
      id_cat: defaultCatId,
    });
    setCreateError(null);
    setShowCreateModal(true);
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.monto || Number(createForm.monto) <= 0) {
      setCreateError('El monto debe ser mayor a 0.');
      return;
    }
    if (!createForm.concepto.trim()) {
      setCreateError('El concepto es obligatorio.');
      return;
    }
    if (createForm.concepto.trim().length > 255) {
      setCreateError('El concepto no puede superar los 255 caracteres.');
      return;
    }
    if (!createForm.id_cat) {
      setCreateError('Debes seleccionar una categoría.');
      return;
    }
    if (!createForm.fecha) {
      setCreateError('La fecha es obligatoria.');
      return;
    }

    try {
      setCreando(true);
      setCreateError(null);
      const nuevo = await createEgreso({
        monto: Number(createForm.monto),
        concepto: createForm.concepto.trim(),
        fecha: createForm.fecha,
        id_cat: Number(createForm.id_cat),
      });

      setEgresos((prev) => [nuevo, ...prev]);
      setTotalGastado((prev) => prev + Number(nuevo.monto));
      setTotalCount((prev) => prev + 1);
      setShowCreateModal(false);
      setSuccess('Gasto registrado exitosamente.');
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setCreateError(err.message || 'Error al registrar el gasto.');
    } finally {
      setCreando(false);
    }
  }

  /* ── Editar Egreso ───────────────────────────── */
  function startEdit(item: Egreso) {
    setEditingEgreso(item);
    setEditForm({
      monto: item.monto,
      concepto: item.concepto,
      fecha: toLocalDatetimeInput(item.fecha),
      id_cat: item.id_cat,
    });
    setEditError(null);
    setShowEditModal(true);
  }

  function closeEditModal() {
    if (guardando) return;
    setShowEditModal(false);
    setEditingEgreso(null);
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEgreso) return;
    if (!editForm.monto || Number(editForm.monto) <= 0) {
      setEditError('El monto debe ser mayor a 0.');
      return;
    }
    if (!editForm.concepto.trim()) {
      setEditError('El concepto es obligatorio.');
      return;
    }
    if (editForm.concepto.trim().length > 255) {
      setEditError('El concepto no puede superar los 255 caracteres.');
      return;
    }
    if (!editForm.id_cat) {
      setEditError('Debes seleccionar una categoría.');
      return;
    }

    try {
      setGuardando(true);
      setEditError(null);
      const actualizado = await updateEgreso(editingEgreso.id, {
        monto: Number(editForm.monto),
        concepto: editForm.concepto.trim(),
        fecha: editForm.fecha,
        id_cat: Number(editForm.id_cat),
      });

      setEgresos((prev) =>
        prev.map((i) => (i.id === editingEgreso.id ? actualizado : i))
      );
      closeEditModal();
      setSuccess('Gasto actualizado correctamente.');
      setTimeout(() => setSuccess(null), 3500);
      cargarEgresos();
    } catch (err: any) {
      setEditError(err.message || 'Error al actualizar el gasto.');
    } finally {
      setGuardando(false);
    }
  }

  /* ── Eliminar Egreso ─────────────────────────── */
  function confirmDelete(item: Egreso) {
    setDeletingEgreso(item);
  }

  async function handleExecuteDelete() {
    if (!deletingEgreso) return;
    try {
      setEliminando(true);
      await deleteEgreso(deletingEgreso.id);
      setEgresos((prev) => prev.filter((i) => i.id !== deletingEgreso.id));
      setTotalGastado((prev) => Math.max(0, prev - Number(deletingEgreso.monto)));
      setTotalCount((prev) => Math.max(0, prev - 1));
      setSuccess(`Gasto "${deletingEgreso.concepto}" eliminado correctamente.`);
      setTimeout(() => setSuccess(null), 3500);
      setDeletingEgreso(null);
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el gasto.');
    } finally {
      setEliminando(false);
    }
  }

  /* ── Paginación ──────────────────────────────── */
  const totalPages = Math.max(1, Math.ceil(egresos.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = egresos.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-foreground tracking-tight">
            Egresos
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1.5 font-medium">
            Registro, filtros y control detallado de todos tus gastos.
          </p>
        </div>
        <button
          id="btn-nuevo-egreso"
          onClick={openCreateModal}
          className="px-6 py-3 rounded-2xl text-sm font-bold bg-[#093539] text-white hover:bg-[#07272a] active:scale-95 transition-all shadow-sm flex items-center gap-2 shrink-0 cursor-pointer w-fit"
        >
          <span className="text-lg leading-none font-normal">+</span>
          <span>Registrar gasto</span>
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

      {/* Mini Resumen de Egresos Filtrados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="rounded-3xl border border-border/80 bg-card p-6 flex items-center justify-between shadow-xs hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Gastado</p>
            <p className="text-2xl sm:text-[28px] font-extrabold font-display text-expense tracking-tight mt-1">
              ${totalGastado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs sm:text-sm text-muted-foreground ml-1 font-semibold">MXN</span>
            </p>
          </div>
          <span className="size-11 rounded-full bg-[#fee2e2] text-[#b91c1c] flex items-center justify-center text-xl font-bold">
            −
          </span>
        </div>

        <div className="rounded-3xl border border-border/80 bg-card p-6 flex items-center justify-between shadow-xs hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Gastos Registrados</p>
            <p className="text-2xl sm:text-[28px] font-extrabold font-display text-foreground tracking-tight mt-1">
              {totalCount}
              <span className="text-xs sm:text-sm text-muted-foreground ml-1.5 font-semibold">movimientos</span>
            </p>
          </div>
          <span className="size-11 rounded-full bg-[#f1f5f9] dark:bg-muted flex items-center justify-center text-muted-foreground text-lg">
            🧾
          </span>
        </div>
      </div>

      {/* Tabla / Card Principal */}
      <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs flex flex-col">

        {/* Barra de Filtros */}
        <div className="p-5 sm:p-6 border-b border-border/80 bg-card/60 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">

            {/* Búsqueda por concepto */}
            <div className="relative flex-1 min-w-[200px]">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                id="input-filtro-egresos-search"
                type="text"
                placeholder="Buscar..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm font-medium rounded-2xl border border-border bg-background text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring transition-all"
              />
            </div>

            {/* Filtro por Categoría */}
            <div className="w-full sm:w-52">
              <select
                id="select-filtro-egresos-categoria"
                value={filters.id_cat || ''}
                onChange={(e) => handleFilterChange('id_cat', e.target.value)}
                className="w-full px-4 py-2.5 text-sm font-semibold rounded-2xl border border-border bg-background text-foreground outline-none focus:border-ring transition-all cursor-pointer"
              >
                <option value="">Todas las categorías</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Fecha Inicio */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap">Desde:</span>
              <input
                id="input-filtro-egresos-fecha-inicio"
                type="date"
                value={filters.fecha_inicio || ''}
                onChange={(e) => handleFilterChange('fecha_inicio', e.target.value)}
                className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-2xl border border-border bg-background text-foreground outline-none focus:border-ring transition-all"
              />
            </div>

            {/* Filtro Fecha Fin */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap">Hasta:</span>
              <input
                id="input-filtro-egresos-fecha-fin"
                type="date"
                value={filters.fecha_fin || ''}
                onChange={(e) => handleFilterChange('fecha_fin', e.target.value)}
                className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-2xl border border-border bg-background text-foreground outline-none focus:border-ring transition-all"
              />
            </div>

            {/* Botón Limpiar */}
            <button
              id="btn-limpiar-filtros-egresos"
              onClick={handleClearFilters}
              title="Limpiar filtros"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold border border-border bg-background text-foreground hover:bg-muted active:scale-95 transition-all whitespace-nowrap cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span>Limpiar</span>
            </button>

          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="flex flex-col gap-0">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_0.8fr] px-6 py-3.5 border-b border-border/80">
              {['CONCEPTO','CATEGORÍA','MONTO','FECHA','REGISTRADO','ACCIONES'].map((h) => (
                <span key={h} className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{h}</span>
              ))}
            </div>
            {[1,2,3,4,5].map((n) => (
              <div key={n} className="px-6 py-4 border-b border-border/60 last:border-0">
                <div
                  className="h-5 rounded-lg w-3/4"
                  style={{
                    background: 'linear-gradient(90deg, var(--muted) 25%, var(--accent) 50%, var(--muted) 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.4s infinite',
                  }}
                />
              </div>
            ))}
          </div>
        ) : egresos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <span className="text-4xl">💸</span>
            <p className="text-sm font-medium">
              {filters.search || filters.id_cat || filters.fecha_inicio || filters.fecha_fin
                ? 'No se encontraron egresos con los filtros seleccionados.'
                : 'No hay egresos registrados aún. ¡Registra el primero!'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/80 bg-card">
                  <th className="px-6 py-3.5 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Concepto</th>
                  <th className="px-6 py-3.5 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-3.5 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Monto</th>
                  <th className="px-6 py-3.5 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3.5 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Registrado</th>
                  <th className="px-6 py-3.5 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginated.map((egreso) => (
                  <tr
                    key={egreso.id}
                    className="transition-colors hover:bg-muted/20"
                  >
                    {/* Concepto */}
                    <td className="px-6 py-4 font-bold text-foreground text-sm sm:text-base">
                      {egreso.concepto}
                    </td>
                    {/* Categoría badge */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-danger-soft text-expense border border-expense/20">
                        <span className="size-1.5 rounded-full bg-expense inline-block" />
                        {egreso.categoria_nombre || 'Sin categoría'}
                      </span>
                    </td>
                    {/* Monto */}
                    <td className="px-6 py-4 font-extrabold font-display text-expense text-sm sm:text-base">
                      -${Number(egreso.monto).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    {/* Fecha */}
                    <td className="px-6 py-4 text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">
                      {formatFriendlyDate(egreso.fecha)}
                    </td>
                    {/* Registrado */}
                    <td className="px-6 py-4 text-muted-foreground text-xs font-medium whitespace-nowrap">
                      {formatFriendlyDate(egreso.created_at)}
                    </td>
                    {/* Acciones */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          id={`btn-editar-egreso-${egreso.id}`}
                          title="Editar"
                          onClick={() => startEdit(egreso)}
                          className="size-8 flex items-center justify-center rounded-xl text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          id={`btn-eliminar-egreso-${egreso.id}`}
                          title="Eliminar"
                          onClick={() => confirmDelete(egreso)}
                          className="size-8 flex items-center justify-center rounded-xl text-rose-500/80 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer paginación */}
        {!loading && egresos.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/80">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, egresos.length)} de {egresos.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                id="btn-pag-prev-egresos"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="size-8 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors cursor-pointer"
              >‹</button>
              <button
                id="btn-pag-next-egresos"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="size-8 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors cursor-pointer"
              >›</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Registrar gasto ──────────────────── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
          onClick={(e) => { if (e.target === e.currentTarget && !creando) setShowCreateModal(false); }}
        >
          <div className="w-full max-w-lg bg-card rounded-3xl shadow-2xl p-7 sm:p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200 border border-border/60">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold font-display text-foreground tracking-tight">
                  Registrar gasto
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Completa la información. Los campos marcados son obligatorios.
                </p>
              </div>
              <button
                id="btn-cerrar-modal-create-egreso"
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={creando}
                className="size-8 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors -mt-1 -mr-1 cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {createError && (
              <div className="px-4 py-3 rounded-2xl bg-danger-soft text-destructive text-sm border border-destructive/20 font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-5">
              {/* Monto */}
              <div className="flex flex-col gap-2">
                <label htmlFor="modal-egreso-monto" className="text-sm font-bold text-foreground">
                  Monto ($ MXN)
                </label>
                <input
                  ref={createMontoInputRef}
                  id="modal-egreso-monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={createForm.monto || ''}
                  onChange={(e) => setCreateForm((f) => ({ ...f, monto: e.target.value as any }))}
                  disabled={creando}
                  className="w-full px-4 py-3 text-base font-bold rounded-2xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring transition-all shadow-xs"
                />
              </div>

              {/* Concepto */}
              <div className="flex flex-col gap-2">
                <label htmlFor="modal-egreso-concepto" className="text-sm font-bold text-foreground">
                  Concepto
                </label>
                <input
                  id="modal-egreso-concepto"
                  type="text"
                  placeholder="Ej. Compra de despensa, Pago de luz, Gasolina..."
                  value={createForm.concepto}
                  onChange={(e) => setCreateForm((f) => ({ ...f, concepto: e.target.value }))}
                  disabled={creando}
                  maxLength={255}
                  className="w-full px-4 py-3 text-base font-medium rounded-2xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring transition-all shadow-xs"
                />
              </div>

              {/* Categoría */}
              <div className="flex flex-col gap-2">
                <label htmlFor="modal-egreso-cat" className="text-sm font-bold text-foreground">
                  Categoría
                </label>
                <select
                  id="modal-egreso-cat"
                  value={createForm.id_cat}
                  onChange={(e) => setCreateForm((f) => ({ ...f, id_cat: Number(e.target.value) }))}
                  disabled={creando}
                  className="w-full px-4 py-3 text-base font-medium rounded-2xl border border-border bg-background text-foreground outline-none focus:border-ring transition-all shadow-xs cursor-pointer"
                >
                  <option value={0} disabled>Selecciona una categoría...</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha y hora */}
              <div className="flex flex-col gap-2">
                <label htmlFor="modal-egreso-fecha" className="text-sm font-bold text-foreground">
                  Fecha y hora del gasto
                </label>
                <input
                  id="modal-egreso-fecha"
                  type="datetime-local"
                  value={createForm.fecha}
                  onChange={(e) => setCreateForm((f) => ({ ...f, fecha: e.target.value }))}
                  disabled={creando}
                  className="w-full px-4 py-3 text-base font-medium rounded-2xl border border-border bg-background text-foreground outline-none focus:border-ring transition-all shadow-xs"
                />
              </div>

              <div className="flex justify-end items-center gap-3 pt-3">
                <button
                  id="btn-cancelar-modal-create-egreso"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creando}
                  className="px-6 py-3 rounded-2xl text-sm font-bold border border-border bg-card text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-guardar-modal-create-egreso"
                  type="submit"
                  disabled={creando || !createForm.concepto.trim() || !createForm.monto || !createForm.id_cat}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold bg-[#093539] text-white hover:bg-[#07272a] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                >
                  {creando ? (
                    <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                  ) : null}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Editar gasto ────────────────────── */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
          onClick={(e) => { if (e.target === e.currentTarget && !guardando) closeEditModal(); }}
        >
          <div className="w-full max-w-lg bg-card rounded-3xl shadow-2xl p-7 sm:p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200 border border-border/60">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold font-display text-foreground tracking-tight">
                  Editar gasto
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Completa la información. Los campos marcados son obligatorios.
                </p>
              </div>
              <button
                id="btn-cerrar-modal-edit-egreso"
                type="button"
                onClick={closeEditModal}
                disabled={guardando}
                className="size-8 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors -mt-1 -mr-1 cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {editError && (
              <div className="px-4 py-3 rounded-2xl bg-danger-soft text-destructive text-sm border border-destructive/20 font-medium">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-5">
              {/* Monto */}
              <div className="flex flex-col gap-2">
                <label htmlFor="modal-edit-egreso-monto" className="text-sm font-bold text-foreground">
                  Monto ($ MXN)
                </label>
                <input
                  ref={editMontoInputRef}
                  id="modal-edit-egreso-monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={editForm.monto || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, monto: e.target.value as any }))}
                  disabled={guardando}
                  className="w-full px-4 py-3 text-base font-bold rounded-2xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring transition-all shadow-xs"
                />
              </div>

              {/* Concepto */}
              <div className="flex flex-col gap-2">
                <label htmlFor="modal-edit-egreso-concepto" className="text-sm font-bold text-foreground">
                  Concepto
                </label>
                <input
                  id="modal-edit-egreso-concepto"
                  type="text"
                  placeholder="Ej. Compra de despensa"
                  value={editForm.concepto}
                  onChange={(e) => setEditForm((f) => ({ ...f, concepto: e.target.value }))}
                  disabled={guardando}
                  maxLength={255}
                  className="w-full px-4 py-3 text-base font-medium rounded-2xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring transition-all shadow-xs"
                />
              </div>

              {/* Categoría */}
              <div className="flex flex-col gap-2">
                <label htmlFor="modal-edit-egreso-cat" className="text-sm font-bold text-foreground">
                  Categoría
                </label>
                <select
                  id="modal-edit-egreso-cat"
                  value={editForm.id_cat}
                  onChange={(e) => setEditForm((f) => ({ ...f, id_cat: Number(e.target.value) }))}
                  disabled={guardando}
                  className="w-full px-4 py-3 text-base font-medium rounded-2xl border border-border bg-background text-foreground outline-none focus:border-ring transition-all shadow-xs cursor-pointer"
                >
                  <option value={0} disabled>Selecciona una categoría...</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha y hora */}
              <div className="flex flex-col gap-2">
                <label htmlFor="modal-edit-egreso-fecha" className="text-sm font-bold text-foreground">
                  Fecha y hora del gasto
                </label>
                <input
                  id="modal-edit-egreso-fecha"
                  type="datetime-local"
                  value={editForm.fecha}
                  onChange={(e) => setEditForm((f) => ({ ...f, fecha: e.target.value }))}
                  disabled={guardando}
                  className="w-full px-4 py-3 text-base font-medium rounded-2xl border border-border bg-background text-foreground outline-none focus:border-ring transition-all shadow-xs"
                />
              </div>

              <div className="flex justify-end items-center gap-3 pt-3">
                <button
                  id="btn-cancelar-modal-edit-egreso"
                  type="button"
                  onClick={closeEditModal}
                  disabled={guardando}
                  className="px-6 py-3 rounded-2xl text-sm font-bold border border-border bg-card text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-guardar-modal-edit-egreso"
                  type="submit"
                  disabled={guardando || !editForm.concepto.trim() || !editForm.monto || !editForm.id_cat}
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

      {/* ── Modal: Confirmación de Eliminación ───────── */}
      {deletingEgreso && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
          onClick={(e) => { if (e.target === e.currentTarget && !eliminando) setDeletingEgreso(null); }}
        >
          <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl p-7 sm:p-8 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200 border border-destructive/20">
            <div className="size-14 rounded-2xl bg-danger-soft flex items-center justify-center text-destructive text-3xl mx-auto">
              🗑️
            </div>
            <div className="text-center">
              <h3 className="text-xl font-extrabold font-display text-foreground">
                ¿Eliminar este gasto?
              </h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed font-medium">
                Estás a punto de eliminar el gasto <strong className="text-foreground">"{deletingEgreso.concepto}"</strong> por un monto de <strong className="text-expense">${Number(deletingEgreso.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>. Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingEgreso(null)}
                disabled={eliminando}
                className="flex-1 py-3 rounded-2xl text-sm font-bold border border-border bg-card text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={eliminando}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold bg-destructive text-destructive-foreground hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {eliminando ? (
                  <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
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
