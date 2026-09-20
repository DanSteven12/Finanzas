// frontend/src/components/CatIngresosList.tsx
import { useEffect, useRef, useState } from 'react';
import type { CatIngreso } from '../types/catIngresos.types';
import {
  getCatIngresos,
  createCatIngreso,
  updateCatIngreso,
  deleteCatIngreso,
} from '../api/catIngresos.api';

const PAGE_SIZE = 4;

export default function CatIngresosList() {
  const [categorias, setCategorias] = useState<CatIngreso[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);

  // Búsqueda
  const [search, setSearch] = useState('');

  // Paginación
  const [page, setPage] = useState(1);

  // Modal crear
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [nuevaNombre, setNuevaNombre]         = useState('');
  const [creando, setCreando]                 = useState(false);
  const [createError, setCreateError]         = useState<string | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  // Modal editar
  const [showEditModal, setShowEditModal]     = useState(false);
  const [editingCat, setEditingCat]           = useState<CatIngreso | null>(null);
  const [editNombre, setEditNombre]           = useState('');
  const [guardando, setGuardando]             = useState(false);
  const [editError, setEditError]             = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Modal advertencia de restricción relacional
  const [blockedDeleteMsg, setBlockedDeleteMsg] = useState<string | null>(null);

  /* ── Carga inicial ───────────────────────────── */
  useEffect(() => { cargarCategorias(); }, []);

  // Enfocar input al abrir modal de crear
  useEffect(() => {
    if (showCreateModal) {
      setCreateError(null);
      setTimeout(() => createInputRef.current?.focus(), 50);
    }
  }, [showCreateModal]);

  // Enfocar input al abrir modal de editar
  useEffect(() => {
    if (showEditModal) {
      setEditError(null);
      setTimeout(() => editInputRef.current?.focus(), 50);
    }
  }, [showEditModal]);

  async function cargarCategorias() {
    try {
      setLoading(true);
      setError(null);
      const data = await getCatIngresos();
      setCategorias(data);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar las categorías de ingresos.');
    } finally {
      setLoading(false);
    }
  }

  /* ── Crear ───────────────────────────────────── */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaNombre.trim()) {
      setCreateError('El nombre no puede estar vacío.');
      return;
    }
    try {
      setCreando(true);
      setCreateError(null);
      const nueva = await createCatIngreso({ nombre: nuevaNombre.trim() });
      setCategorias((prev) => [...prev, nueva]);
      setNuevaNombre('');
      setShowCreateModal(false);
      setSuccess('Categoría creada exitosamente');
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setCreateError(err.message || 'Error al crear la categoría.');
    } finally {
      setCreando(false);
    }
  }

  /* ── Editar ──────────────────────────────────── */
  function startEdit(cat: CatIngreso) {
    setEditingCat(cat);
    setEditNombre(cat.nombre);
    setEditError(null);
    setShowEditModal(true);
  }

  function closeEditModal() {
    if (guardando) return;
    setShowEditModal(false);
    setEditingCat(null);
    setEditNombre('');
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editNombre.trim() || !editingCat) {
      setEditError('El nombre no puede estar vacío.');
      return;
    }
    try {
      setGuardando(true);
      setEditError(null);
      await updateCatIngreso(editingCat.id, { nombre: editNombre.trim() });
      setCategorias((prev) =>
        prev.map((c) => (c.id === editingCat.id ? { ...c, nombre: editNombre.trim() } : c))
      );
      closeEditModal();
      setSuccess('Categoría actualizada exitosamente');
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setEditError(err.message || 'Error al actualizar la categoría.');
    } finally {
      setGuardando(false);
    }
  }

  /* ── Eliminar con protección relacional ──────── */
  async function handleDelete(cat: CatIngreso) {
    if (!confirm(`¿Estás seguro de eliminar la categoría "${cat.nombre}"?`)) return;
    try {
      await deleteCatIngreso(cat.id);
      setCategorias((prev) => prev.filter((c) => c.id !== cat.id));
      setSuccess(`Categoría "${cat.nombre}" eliminada correctamente.`);
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      // Si el backend advierte que tiene ingresos asociados
      setBlockedDeleteMsg(err.message || 'No se puede eliminar la categoría porque tiene ingresos asociados.');
    }
  }

  /* ── Filtrado y paginación ───────────────────── */
  const filtered = categorias.filter((c) =>
    c.nombre.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleClear() { setSearch(''); setPage(1); }

  /* ── Render ──────────────────────────────────── */
  return (
    <div className="flex flex-col gap-6 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-foreground tracking-tight">
            Categorías de ingresos
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1.5 font-medium">
            Organiza tus fuentes de ingreso con categorías claras y fáciles de identificar.
          </p>
        </div>
        <button
          id="btn-nueva-cat-ingreso"
          onClick={() => { setNuevaNombre(''); setShowCreateModal(true); }}
          className="px-6 py-3 rounded-2xl text-sm font-bold bg-[#093539] text-white hover:bg-[#07272a] active:scale-95 transition-all shadow-sm flex items-center gap-2 shrink-0 cursor-pointer w-fit"
        >
          <span className="text-lg leading-none font-normal">+</span>
          <span>Nueva categoría</span>
        </button>
      </div>

      {/* Alerta de éxito */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-success-soft text-income text-sm border border-income/20 animate-in fade-in duration-200">
          <span>✓</span>
          <span className="font-medium">{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-income/60 hover:text-income cursor-pointer">✕</button>
        </div>
      )}

      {/* Alerta de error general */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-danger-soft text-destructive text-sm border border-destructive/20">
          <span>⚠️</span>
          <span className="font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-destructive/60 hover:text-destructive cursor-pointer">✕</button>
        </div>
      )}

      {/* Tabla / Card */}
      <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs">

        {/* Barra de búsqueda */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/80">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              id="input-buscar-cat-ingreso"
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm font-medium rounded-2xl border border-border bg-background text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring transition-all"
            />
          </div>
          <button
            id="btn-limpiar-cat-ingreso"
            onClick={handleClear}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold border border-border bg-background text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Limpiar</span>
          </button>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="flex flex-col gap-0">
            <div className="grid grid-cols-[2fr_1.2fr_1.2fr_1.2fr_1fr] px-6 py-3.5 border-b border-border/80">
              {['NOMBRE','CANTIDAD DE INGRESOS','TOTAL INGRESADO','FECHA DE CREACIÓN','ACCIONES'].map((h) => (
                <span key={h} className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{h}</span>
              ))}
            </div>
            {[1,2,3,4].map((n) => (
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
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <span className="text-4xl">🏷️</span>
            <p className="text-sm font-medium">
              {search ? `Sin resultados para "${search}"` : 'No hay categorías de ingresos registradas. ¡Agrega la primera!'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/80">
                  <th className="px-6 py-3.5 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">NOMBRE</th>
                  <th className="px-6 py-3.5 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">CANTIDAD DE INGRESOS</th>
                  <th className="px-6 py-3.5 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">TOTAL INGRESADO</th>
                  <th className="px-6 py-3.5 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">FECHA DE CREACIÓN</th>
                  <th className="px-6 py-3.5 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginated.map((cat) => (
                  <tr
                    key={cat.id}
                    className="transition-colors hover:bg-muted/20"
                  >
                    {/* Nombre */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-3 font-bold text-foreground text-sm sm:text-base">
                        <span className="size-8 rounded-full bg-emerald-50 dark:bg-muted flex items-center justify-center shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                            <line x1="7" y1="7" x2="7.01" y2="7"/>
                          </svg>
                        </span>
                        {cat.nombre}
                      </span>
                    </td>
                    {/* Cantidad */}
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">{cat.cantidad_ingresos ?? 0}</td>
                    {/* Total */}
                    <td className="px-6 py-4 text-sm sm:text-base font-extrabold font-display text-income">
                      ${(cat.total_ingresado ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    {/* Fecha de creación */}
                    <td className="px-6 py-4 text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap">
                      14 ene 2026
                    </td>
                    {/* Acciones */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          id={`btn-editar-cat-ingreso-${cat.id}`}
                          title="Editar"
                          onClick={() => startEdit(cat)}
                          className="size-8 flex items-center justify-center rounded-xl text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          id={`btn-eliminar-cat-ingreso-${cat.id}`}
                          title="Eliminar"
                          onClick={() => handleDelete(cat)}
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
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/80">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                id="btn-pag-prev-cat-ingresos"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="size-8 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors cursor-pointer"
              >‹</button>
              <button
                id="btn-pag-next-cat-ingresos"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="size-8 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors cursor-pointer"
              >›</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Crear categoría ─────────────────── */}
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
                  Crear categoría de ingresos
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Completa la información. Los campos marcados son obligatorios.
                </p>
              </div>
              <button
                id="btn-cerrar-modal-create-cat-ingreso"
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
              <div className="px-4 py-3 rounded-2xl bg-danger-soft text-destructive text-sm border border-destructive/20">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreate} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="modal-cat-ingreso-nombre" className="text-sm font-bold text-foreground">
                  Nombre
                </label>
                <input
                  ref={createInputRef}
                  id="modal-cat-ingreso-nombre"
                  type="text"
                  placeholder="Ej. Salario, Freelance, Negocio..."
                  value={nuevaNombre}
                  onChange={(e) => setNuevaNombre(e.target.value)}
                  disabled={creando}
                  className="w-full px-4 py-3 text-base font-medium rounded-2xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring transition-all shadow-xs"
                />
              </div>

              <div className="flex justify-end items-center gap-3 pt-2">
                <button
                  id="btn-cancelar-modal-create-cat-ingreso"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creando}
                  className="px-6 py-3 rounded-2xl text-sm font-bold border border-border bg-card text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-guardar-modal-create-cat-ingreso"
                  type="submit"
                  disabled={creando || !nuevaNombre.trim()}
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

      {/* ── Modal: Editar registro ─────────────────── */}
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
                  Editar registro
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Completa la información. Los campos marcados son obligatorios.
                </p>
              </div>
              <button
                id="btn-cerrar-modal-edit-cat-ingreso"
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
              <div className="px-4 py-3 rounded-2xl bg-danger-soft text-destructive text-sm border border-destructive/20">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="edit-cat-ingreso-nombre" className="text-sm font-bold text-foreground">
                  Nombre
                </label>
                <input
                  ref={editInputRef}
                  id="edit-cat-ingreso-nombre"
                  type="text"
                  placeholder="Escribe un nombre"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  disabled={guardando}
                  className="w-full px-4 py-3 text-base font-medium rounded-2xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring transition-all shadow-xs"
                />
              </div>

              <div className="flex justify-end items-center gap-3 pt-2">
                <button
                  id="btn-cancelar-edit-cat-ingreso-modal"
                  type="button"
                  onClick={closeEditModal}
                  disabled={guardando}
                  className="px-6 py-3 rounded-2xl text-sm font-bold border border-border bg-card text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-guardar-edit-cat-ingreso-modal"
                  type="submit"
                  disabled={guardando || !editNombre.trim()}
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

      {/* ── Modal: Advertencia de restricción de eliminación ──────── */}
      {blockedDeleteMsg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setBlockedDeleteMsg(null); }}
        >
          <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl p-7 sm:p-8 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200 border border-destructive/20">
            <div className="size-14 rounded-2xl bg-danger-soft flex items-center justify-center text-destructive text-3xl mx-auto">
              ⚠️
            </div>
            <div className="text-center">
              <h3 className="text-xl font-extrabold font-display text-foreground">
                No se puede eliminar la categoría
              </h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed font-medium">
                {blockedDeleteMsg}
              </p>
            </div>
            <button
              onClick={() => setBlockedDeleteMsg(null)}
              className="w-full py-3.5 rounded-2xl text-sm font-bold bg-[#093539] text-white hover:bg-[#07272a] active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
