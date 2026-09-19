// frontend/src/components/IngresosList.tsx
import { useEffect, useRef, useState } from 'react';
import type { Ingreso, CreateIngresoDto, IngresoFilters } from '../types/ingresos.types';
import type { CatIngreso } from '../types/catIngresos.types';
import {
  getIngresos,
  createIngreso,
  updateIngreso,
  deleteIngreso,
} from '../api/ingresos.api';
import { getCatIngresos } from '../api/catIngresos.api';

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

export default function IngresosList() {
  const [ingresos, setIngresos]         = useState<Ingreso[]>([]);
  const [categorias, setCategorias]     = useState<CatIngreso[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [success, setSuccess]           = useState<string | null>(null);

  // Filtros
  const [filters, setFilters] = useState<IngresoFilters>({
    fecha_inicio: '',
    fecha_fin: '',
    id_cat: '',
    search: '',
  });

  // Paginación
  const [page, setPage] = useState(1);

  // Modal: Registrar
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateIngresoDto>({
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
  const [editingIngreso, setEditingIngreso] = useState<Ingreso | null>(null);
  const [editForm, setEditForm] = useState<CreateIngresoDto>({
    monto: 0,
    concepto: '',
    fecha: '',
    id_cat: 0,
  });
  const [guardando, setGuardando] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const editMontoInputRef = useRef<HTMLInputElement>(null);

  // Modal: Confirmación de Eliminación
  const [deletingIngreso, setDeletingIngreso] = useState<Ingreso | null>(null);
  const [eliminando, setEliminando] = useState(false);

  /* ── Carga inicial ───────────────────────────── */
  useEffect(() => {
    cargarCategorias();
    cargarIngresos();
  }, []);

  // Refrescar lista cuando cambien los filtros
  useEffect(() => {
    cargarIngresos();
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
      const data = await getCatIngresos();
      setCategorias(data);
    } catch {
      // Manejo silencioso o aviso
    }
  }

  async function cargarIngresos() {
    try {
      setLoading(true);
      setError(null);
      const data = await getIngresos(filters);
      setIngresos(data);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los ingresos.');
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key: keyof IngresoFilters, value: any) {
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

  /* ── Registrar Ingreso ───────────────────────── */
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
      const nuevo = await createIngreso({
        monto: Number(createForm.monto),
        concepto: createForm.concepto.trim(),
        fecha: createForm.fecha,
        id_cat: Number(createForm.id_cat),
      });

      setIngresos((prev) => [nuevo, ...prev]);
      setShowCreateModal(false);
      setSuccess('Ingreso registrado exitosamente.');
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setCreateError(err.message || 'Error al registrar el ingreso.');
    } finally {
      setCreando(false);
    }
  }

  /* ── Editar Ingreso ──────────────────────────── */
  function startEdit(item: Ingreso) {
    setEditingIngreso(item);
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
    setEditingIngreso(null);
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingIngreso) return;
    if (!editForm.monto || Number(editForm.monto) <= 0) {
      setEditError('El monto debe ser mayor a 0.');
      return;
    }
    if (!editForm.concepto.trim()) {
      setEditError('El concepto es obligatorio.');
      return;
    }
    if (!editForm.id_cat) {
      setEditError('Debes seleccionar una categoría.');
      return;
    }

    try {
      setGuardando(true);
      setEditError(null);
      const actualizado = await updateIngreso(editingIngreso.id, {
        monto: Number(editForm.monto),
        concepto: editForm.concepto.trim(),
        fecha: editForm.fecha,
        id_cat: Number(editForm.id_cat),
      });

      setIngresos((prev) =>
        prev.map((i) => (i.id === editingIngreso.id ? actualizado : i))
      );
      closeEditModal();
      setSuccess('Ingreso actualizado correctamente.');
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setEditError(err.message || 'Error al actualizar el ingreso.');
    } finally {
      setGuardando(false);
    }
  }

  /* ── Eliminar Ingreso ────────────────────────── */
  function confirmDelete(item: Ingreso) {
    setDeletingIngreso(item);
  }

  async function handleExecuteDelete() {
    if (!deletingIngreso) return;
    try {
      setEliminando(true);
      await deleteIngreso(deletingIngreso.id);
      setIngresos((prev) => prev.filter((i) => i.id !== deletingIngreso.id));
      setSuccess(`Ingreso "${deletingIngreso.concepto}" eliminado correctamente.`);
      setTimeout(() => setSuccess(null), 3500);
      setDeletingIngreso(null);
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el ingreso.');
    } finally {
      setEliminando(false);
    }
  }

  /* ── Paginación ──────────────────────────────── */
  const totalPages = Math.max(1, Math.ceil(ingresos.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = ingresos.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">
            Ingresos
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registro, filtros y control detallado de todas tus entradas de dinero.
          </p>
        </div>
        <button
          id="btn-nuevo-ingreso"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-sm whitespace-nowrap shrink-0"
        >
          <span className="text-base leading-none font-normal">+</span>
          Registrar ingreso
        </button>
      </div>

      {/* Alerta de éxito */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-success-soft text-income text-sm border border-income/20 animate-in fade-in duration-200">
          <span>✓</span>
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-income/60 hover:text-income">✕</button>
        </div>
      )}

      {/* Alerta de error general */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-danger-soft text-destructive text-sm border border-destructive/20">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-destructive/60 hover:text-destructive">✕</button>
        </div>
      )}

      {/* Tabla / Card Principal */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs flex flex-col">

        {/* Barra de Filtros */}
        <div className="p-4 border-b border-border bg-card/60 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">

            {/* Búsqueda por concepto */}
            <div className="relative flex-1 min-w-[180px]">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                id="input-filtro-search"
                type="text"
                placeholder="Buscar por concepto..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
              />
            </div>

            {/* Filtro por Categoría */}
            <div className="w-full sm:w-48">
              <select
                id="select-filtro-categoria"
                value={filters.id_cat || ''}
                onChange={(e) => handleFilterChange('id_cat', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all cursor-pointer"
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
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Desde:</span>
              <input
                id="input-filtro-fecha-inicio"
                type="date"
                value={filters.fecha_inicio || ''}
                onChange={(e) => handleFilterChange('fecha_inicio', e.target.value)}
                className="px-3 py-1.5 text-sm rounded-xl border border-border bg-background text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
              />
            </div>

            {/* Filtro Fecha Fin */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Hasta:</span>
              <input
                id="input-filtro-fecha-fin"
                type="date"
                value={filters.fecha_fin || ''}
                onChange={(e) => handleFilterChange('fecha_fin', e.target.value)}
                className="px-3 py-1.5 text-sm rounded-xl border border-border bg-background text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
              />
            </div>

            {/* Botón Limpiar */}
            <button
              id="btn-limpiar-filtros-ingresos"
              onClick={handleClearFilters}
              title="Limpiar filtros"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border border-border bg-background text-foreground hover:bg-muted transition-colors whitespace-nowrap"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Limpiar
            </button>

          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="flex flex-col gap-0">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_0.8fr] px-5 py-3 border-b border-border">
              {['CONCEPTO','CATEGORÍA','MONTO','FECHA','REGISTRADO','ACCIONES'].map((h) => (
                <span key={h} className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{h}</span>
              ))}
            </div>
            {[1,2,3,4,5].map((n) => (
              <div key={n} className="px-5 py-4 border-b border-border last:border-0">
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
        ) : filteredEmpty(ingresos) ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <span className="text-4xl">💰</span>
            <p className="text-sm font-medium">
              {filters.search || filters.id_cat || filters.fecha_inicio || filters.fecha_fin
                ? 'No se encontraron ingresos con los filtros seleccionados.'
                : 'No hay ingresos registrados aún. ¡Registra el primero!'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">Concepto</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">Categoría</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">Monto</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">Fecha</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">Registrado</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((ingreso) => (
                  <tr
                    key={ingreso.id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                  >
                    {/* Concepto */}
                    <td className="px-5 py-3.5 font-semibold text-foreground">
                      {ingreso.concepto}
                    </td>
                    {/* Categoría badge */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-income border border-income/20">
                        <span className="size-1.5 rounded-full bg-income inline-block" />
                        {ingreso.categoria_nombre || 'Sin categoría'}
                      </span>
                    </td>
                    {/* Monto */}
                    <td className="px-5 py-3.5 font-bold text-income text-base">
                      +${Number(ingreso.monto).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    {/* Fecha */}
                    <td className="px-5 py-3.5 text-foreground whitespace-nowrap">
                      {formatFriendlyDate(ingreso.fecha)}
                    </td>
                    {/* Registrado */}
                    <td className="px-5 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                      {formatFriendlyDate(ingreso.created_at)}
                    </td>
                    {/* Acciones */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          id={`btn-editar-ingreso-${ingreso.id}`}
                          title="Editar"
                          onClick={() => startEdit(ingreso)}
                          className="size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          id={`btn-eliminar-ingreso-${ingreso.id}`}
                          title="Eliminar"
                          onClick={() => confirmDelete(ingreso)}
                          className="size-8 flex items-center justify-center rounded-lg text-destructive/70 hover:text-destructive hover:bg-danger-soft transition-colors"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        {!loading && ingresos.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, ingresos.length)} de {ingresos.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                id="btn-pag-prev-ingresos"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="size-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
              >‹</button>
              <button
                id="btn-pag-next-ingresos"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="size-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
              >›</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Registrar ingreso ─────────────────── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
          onClick={(e) => { if (e.target === e.currentTarget && !creando) setShowCreateModal(false); }}
        >
          <div className="w-full max-w-lg bg-card rounded-3xl shadow-2xl p-7 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200 border border-border/40">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold font-display text-foreground">
                  Registrar ingreso
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Completa la información. Los campos marcados son obligatorios.
                </p>
              </div>
              <button
                id="btn-cerrar-modal-create-ingreso"
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={creando}
                className="size-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors -mt-1 -mr-1"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {createError && (
              <div className="px-4 py-2.5 rounded-xl bg-danger-soft text-destructive text-sm border border-destructive/20">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
              {/* Monto */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-ingreso-monto" className="text-sm font-bold text-foreground">
                  Monto ($ MXN)
                </label>
                <input
                  ref={createMontoInputRef}
                  id="modal-ingreso-monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={createForm.monto || ''}
                  onChange={(e) => setCreateForm((f) => ({ ...f, monto: e.target.value as any }))}
                  disabled={creando}
                  className="w-full px-4 py-2.5 text-sm rounded-2xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all shadow-xs"
                />
              </div>

              {/* Concepto */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-ingreso-concepto" className="text-sm font-bold text-foreground">
                  Concepto
                </label>
                <input
                  id="modal-ingreso-concepto"
                  type="text"
                  placeholder="Ej. Pago de quincena, Proyecto freelance..."
                  value={createForm.concepto}
                  onChange={(e) => setCreateForm((f) => ({ ...f, concepto: e.target.value }))}
                  disabled={creando}
                  className="w-full px-4 py-2.5 text-sm rounded-2xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all shadow-xs"
                />
              </div>

              {/* Categoría */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-ingreso-cat" className="text-sm font-bold text-foreground">
                  Categoría
                </label>
                <select
                  id="modal-ingreso-cat"
                  value={createForm.id_cat}
                  onChange={(e) => setCreateForm((f) => ({ ...f, id_cat: Number(e.target.value) }))}
                  disabled={creando}
                  className="w-full px-4 py-2.5 text-sm rounded-2xl border border-border bg-background text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all shadow-xs cursor-pointer"
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
              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-ingreso-fecha" className="text-sm font-bold text-foreground">
                  Fecha y hora
                </label>
                <input
                  id="modal-ingreso-fecha"
                  type="datetime-local"
                  value={createForm.fecha}
                  onChange={(e) => setCreateForm((f) => ({ ...f, fecha: e.target.value }))}
                  disabled={creando}
                  className="w-full px-4 py-2.5 text-sm rounded-2xl border border-border bg-background text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all shadow-xs"
                />
              </div>

              <div className="flex justify-end items-center gap-3 pt-3">
                <button
                  id="btn-cancelar-modal-create-ingreso"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creando}
                  className="px-6 py-2.5 rounded-full text-sm font-semibold border border-border bg-card text-foreground hover:bg-muted transition-colors shadow-xs"
                >
                  Cancelar
                </button>
                <button
                  id="btn-guardar-modal-create-ingreso"
                  type="submit"
                  disabled={creando || !createForm.concepto.trim() || !createForm.monto || !createForm.id_cat}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  {creando ? (
                    <span className="size-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin inline-block" />
                  ) : null}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Editar ingreso ───────────────────── */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
          onClick={(e) => { if (e.target === e.currentTarget && !guardando) closeEditModal(); }}
        >
          <div className="w-full max-w-lg bg-card rounded-3xl shadow-2xl p-7 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200 border border-border/40">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold font-display text-foreground">
                  Editar ingreso
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Completa la información. Los campos marcados son obligatorios.
                </p>
              </div>
              <button
                id="btn-cerrar-modal-edit-ingreso"
                type="button"
                onClick={closeEditModal}
                disabled={guardando}
                className="size-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors -mt-1 -mr-1"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {editError && (
              <div className="px-4 py-2.5 rounded-xl bg-danger-soft text-destructive text-sm border border-destructive/20">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              {/* Monto */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-edit-ingreso-monto" className="text-sm font-bold text-foreground">
                  Monto ($ MXN)
                </label>
                <input
                  ref={editMontoInputRef}
                  id="modal-edit-ingreso-monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={editForm.monto || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, monto: e.target.value as any }))}
                  disabled={guardando}
                  className="w-full px-4 py-2.5 text-sm rounded-2xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all shadow-xs"
                />
              </div>

              {/* Concepto */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-edit-ingreso-concepto" className="text-sm font-bold text-foreground">
                  Concepto
                </label>
                <input
                  id="modal-edit-ingreso-concepto"
                  type="text"
                  placeholder="Ej. Pago de quincena"
                  value={editForm.concepto}
                  onChange={(e) => setEditForm((f) => ({ ...f, concepto: e.target.value }))}
                  disabled={guardando}
                  className="w-full px-4 py-2.5 text-sm rounded-2xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all shadow-xs"
                />
              </div>

              {/* Categoría */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-edit-ingreso-cat" className="text-sm font-bold text-foreground">
                  Categoría
                </label>
                <select
                  id="modal-edit-ingreso-cat"
                  value={editForm.id_cat}
                  onChange={(e) => setEditForm((f) => ({ ...f, id_cat: Number(e.target.value) }))}
                  disabled={guardando}
                  className="w-full px-4 py-2.5 text-sm rounded-2xl border border-border bg-background text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all shadow-xs cursor-pointer"
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
              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-edit-ingreso-fecha" className="text-sm font-bold text-foreground">
                  Fecha y hora
                </label>
                <input
                  id="modal-edit-ingreso-fecha"
                  type="datetime-local"
                  value={editForm.fecha}
                  onChange={(e) => setEditForm((f) => ({ ...f, fecha: e.target.value }))}
                  disabled={guardando}
                  className="w-full px-4 py-2.5 text-sm rounded-2xl border border-border bg-background text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all shadow-xs"
                />
              </div>

              <div className="flex justify-end items-center gap-3 pt-3">
                <button
                  id="btn-cancelar-modal-edit-ingreso"
                  type="button"
                  onClick={closeEditModal}
                  disabled={guardando}
                  className="px-6 py-2.5 rounded-full text-sm font-semibold border border-border bg-card text-foreground hover:bg-muted transition-colors shadow-xs"
                >
                  Cancelar
                </button>
                <button
                  id="btn-guardar-modal-edit-ingreso"
                  type="submit"
                  disabled={guardando || !editForm.concepto.trim() || !editForm.monto || !editForm.id_cat}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  {guardando ? (
                    <span className="size-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin inline-block" />
                  ) : null}
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmación de Eliminación ───────── */}
      {deletingIngreso && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
          onClick={(e) => { if (e.target === e.currentTarget && !eliminando) setDeletingIngreso(null); }}
        >
          <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl p-7 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200 border border-destructive/20">
            <div className="size-12 rounded-2xl bg-danger-soft flex items-center justify-center text-destructive text-2xl mx-auto">
              🗑️
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold font-display text-foreground">
                ¿Eliminar este ingreso?
              </h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Estás a punto de eliminar el registro <strong className="text-foreground">"{deletingIngreso.concepto}"</strong> por un monto de <strong className="text-income">${Number(deletingIngreso.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>. Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex justify-end items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingIngreso(null)}
                disabled={eliminando}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold border border-border bg-card text-foreground hover:bg-muted transition-colors shadow-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={eliminando}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold bg-destructive text-destructive-foreground hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
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

function filteredEmpty(items: any[]) {
  return items.length === 0;
}
