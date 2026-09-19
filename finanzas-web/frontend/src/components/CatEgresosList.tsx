// frontend/src/components/CatEgresosList.tsx
import { useEffect, useRef, useState } from 'react';
import type { CatEgreso } from '../types/catEgresos.types';
import {
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
} from '../api/catEgresos.api';

const PAGE_SIZE = 4;

export default function CatEgresosList() {
  const [categorias, setCategorias] = useState<CatEgreso[]>([]);
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
  const [editingCat, setEditingCat]           = useState<CatEgreso | null>(null);
  const [editNombre, setEditNombre]           = useState('');
  const [guardando, setGuardando]             = useState(false);
  const [editError, setEditError]             = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Modal advertencia de restricción relacional
  const [blockedDeleteMsg, setBlockedDeleteMsg] = useState<string | null>(null);

  /* ── Carga inicial ───────────────────────────── */
  useEffect(() => { cargarCategorias(); }, []);

  // Enfocar input cuando se abre modal de crear
  useEffect(() => {
    if (showCreateModal) {
      setCreateError(null);
      setTimeout(() => createInputRef.current?.focus(), 50);
    }
  }, [showCreateModal]);

  // Enfocar input cuando se abre modal de editar
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
      const data = await getCategorias();
      setCategorias(data);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar las categorías. ¿Está el backend activo?');
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
      const nueva = await createCategoria({ nombre: nuevaNombre.trim() });
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
  function startEdit(cat: CatEgreso) {
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
      await updateCategoria(editingCat.id, { nombre: editNombre.trim() });
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
  async function handleDelete(cat: CatEgreso) {
    if (!confirm(`¿Estás seguro de eliminar la categoría "${cat.nombre}"?`)) return;
    try {
      await deleteCategoria(cat.id);
      setCategorias((prev) => prev.filter((c) => c.id !== cat.id));
      setSuccess(`Categoría "${cat.nombre}" eliminada correctamente.`);
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setBlockedDeleteMsg(err.message || 'No se puede eliminar la categoría porque tiene gastos asociados.');
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
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">
            Categorías de egresos
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organiza tus movimientos con categorías claras y fáciles de identificar.
          </p>
        </div>
        <button
          id="btn-nueva-categoria"
          onClick={() => { setNuevaNombre(''); setShowCreateModal(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-sm whitespace-nowrap shrink-0"
        >
          <span className="text-base leading-none font-normal">+</span>
          Nueva categoría
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

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-danger-soft text-destructive text-sm border border-destructive/20">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-destructive/60 hover:text-destructive">✕</button>
        </div>
      )}

      {/* Tabla / Card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">

        {/* Barra de búsqueda */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              id="input-buscar-categoria"
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
            />
          </div>
          <button
            id="btn-limpiar-busqueda"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-border bg-background text-foreground hover:bg-muted transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Limpiar
          </button>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="flex flex-col gap-0">
            {/* Header skeleton */}
            <div className="grid grid-cols-[2fr_1.2fr_1.2fr_1fr] px-5 py-3 border-b border-border">
              {['NOMBRE','CANTIDAD DE GASTOS','TOTAL GASTADO','ACCIONES'].map((h) => (
                <span key={h} className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{h}</span>
              ))}
            </div>
            {[1,2,3,4].map((n) => (
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
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <span className="text-4xl">🗂️</span>
            <p className="text-sm">
              {search ? `Sin resultados para "${search}"` : 'No hay categorías aún. ¡Agrega la primera!'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">Nombre</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">Cantidad de gastos</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">Total gastado</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((cat) => (
                <tr
                  key={cat.id}
                  className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                >
                  {/* Nombre */}
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-2.5 font-semibold text-foreground">
                      <span className="size-7 rounded-full bg-red-50 dark:bg-muted flex items-center justify-center shrink-0">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                          <line x1="7" y1="7" x2="7.01" y2="7"/>
                        </svg>
                      </span>
                      {cat.nombre}
                    </span>
                  </td>
                  {/* Cantidad */}
                  <td className="px-5 py-3.5 text-foreground">{cat.cantidad_gastos ?? 0}</td>
                  {/* Total */}
                  <td className="px-5 py-3.5 text-expense font-semibold">
                    ${(cat.total_gastado ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  {/* Acciones */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        id={`btn-editar-${cat.id}`}
                        title="Editar"
                        onClick={() => startEdit(cat)}
                        className="size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        id={`btn-eliminar-${cat.id}`}
                        title="Eliminar"
                        onClick={() => handleDelete(cat)}
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
        )}

        {/* Footer paginación */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                id="btn-pag-prev"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="size-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
              >‹</button>
              <button
                id="btn-pag-next"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="size-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
              >›</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Crear categoría ─────────────────── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
          onClick={(e) => { if (e.target === e.currentTarget && !creando) setShowCreateModal(false); }}
        >
          <div className="w-full max-w-lg bg-card rounded-3xl shadow-2xl p-7 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200 border border-border/40">
            {/* Modal header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold font-display text-foreground">
                  Crear en categorías de egresos
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Completa la información. Los campos marcados son obligatorios.
                </p>
              </div>
              <button
                id="btn-cerrar-modal"
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

            {/* Formulario */}
            <form onSubmit={handleCreate} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="modal-nombre" className="text-sm font-bold text-foreground">
                  Nombre
                </label>
                <input
                  ref={createInputRef}
                  id="modal-nombre"
                  type="text"
                  placeholder="Escribe un nombre"
                  value={nuevaNombre}
                  onChange={(e) => setNuevaNombre(e.target.value)}
                  disabled={creando}
                  className="w-full px-4 py-2.5 text-sm rounded-2xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all shadow-xs"
                />
              </div>

              {/* Botones */}
              <div className="flex justify-end items-center gap-3 pt-2">
                <button
                  id="btn-cancelar-modal"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creando}
                  className="px-6 py-2.5 rounded-full text-sm font-semibold border border-border bg-card text-foreground hover:bg-muted transition-colors shadow-xs"
                >
                  Cancelar
                </button>
                <button
                  id="btn-guardar-modal"
                  type="submit"
                  disabled={creando || !nuevaNombre.trim()}
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

      {/* ── Modal: Editar registro ─────────────────── */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
          onClick={(e) => { if (e.target === e.currentTarget && !guardando) closeEditModal(); }}
        >
          <div className="w-full max-w-lg bg-card rounded-3xl shadow-2xl p-7 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200 border border-border/40">
            {/* Modal header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold font-display text-foreground">
                  Editar registro
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Completa la información. Los campos marcados son obligatorios.
                </p>
              </div>
              <button
                id="btn-cerrar-modal-edit"
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

            {/* Formulario */}
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="edit-nombre" className="text-sm font-bold text-foreground">
                  Nombre
                </label>
                <input
                  ref={editInputRef}
                  id="edit-nombre"
                  type="text"
                  placeholder="Escribe un nombre"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  disabled={guardando}
                  className="w-full px-4 py-2.5 text-sm rounded-2xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all shadow-xs"
                />
              </div>

              {/* Botones */}
              <div className="flex justify-end items-center gap-3 pt-2">
                <button
                  id="btn-cancelar-edit-modal"
                  type="button"
                  onClick={closeEditModal}
                  disabled={guardando}
                  className="px-6 py-2.5 rounded-full text-sm font-semibold border border-border bg-card text-foreground hover:bg-muted transition-colors shadow-xs"
                >
                  Cancelar
                </button>
                <button
                  id="btn-guardar-edit-modal"
                  type="submit"
                  disabled={guardando || !editNombre.trim()}
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

      {/* ── Modal: Advertencia de restricción de eliminación ──────── */}
      {blockedDeleteMsg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setBlockedDeleteMsg(null); }}
        >
          <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl p-7 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200 border border-destructive/20">
            <div className="size-12 rounded-2xl bg-danger-soft flex items-center justify-center text-destructive text-2xl mx-auto">
              ⚠️
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold font-display text-foreground">
                No se puede eliminar la categoría
              </h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {blockedDeleteMsg}
              </p>
            </div>
            <button
              onClick={() => setBlockedDeleteMsg(null)}
              className="w-full py-2.5 rounded-full text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-sm"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
