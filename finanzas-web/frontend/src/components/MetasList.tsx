// frontend/src/components/MetasList.tsx
import { useEffect, useRef, useState } from 'react';
import type {
  MetaAhorro,
  CreateMetaDto,
} from '../types/metas.types';
import {
  getMetas,
  createMeta,
  updateMeta,
  deleteMeta,
  abonarMeta,
} from '../api/metas.api';

// Helper para formatear fecha amigable (ej. "15 dic 2026")
function formatFriendlyDate(dateStr?: string | Date): string {
  if (!dateStr) return '15 dic 2026';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Formateador de moneda compacto (ej. $18,500 o $30,000)
function formatCurrency(val: number): string {
  return `$${Number(val || 0).toLocaleString('es-MX', {
    minimumFractionDigits: val % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function MetasList() {
  const [metas, setMetas]                   = useState<MetaAhorro[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [success, setSuccess]               = useState<string | null>(null);

  // Modal: Crear Meta
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateMetaDto>({
    nombre: '',
    monto_meta: 0,
  });
  const [creando, setCreando] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const createNombreInputRef = useRef<HTMLInputElement>(null);

  // Modal: Editar Meta
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMeta, setEditingMeta] = useState<MetaAhorro | null>(null);
  const [editForm, setEditForm] = useState<CreateMetaDto>({
    nombre: '',
    monto_meta: 0,
  });
  const [guardando, setGuardando] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const editNombreInputRef = useRef<HTMLInputElement>(null);

  // Modal: Confirmación de Eliminación
  const [deletingMeta, setDeletingMeta] = useState<MetaAhorro | null>(null);
  const [eliminando, setEliminando] = useState(false);

  // Modal: Agregar Dinero (Abonar)
  const [abonarTarget, setAbonarTarget] = useState<MetaAhorro | null>(null);
  const [montoAbonar, setMontoAbonar] = useState<string>('');
  const [abonando, setAbonando] = useState(false);
  const [abonarError, setAbonarError] = useState<string | null>(null);
  const abonarInputRef = useRef<HTMLInputElement>(null);

  /* ── Carga inicial ───────────────────────────── */
  useEffect(() => {
    cargarMetas();
  }, []);

  // Autofocus en modal de crear
  useEffect(() => {
    if (showCreateModal) {
      setCreateError(null);
      setTimeout(() => createNombreInputRef.current?.focus(), 50);
    }
  }, [showCreateModal]);

  // Autofocus en modal de editar
  useEffect(() => {
    if (showEditModal) {
      setEditError(null);
      setTimeout(() => editNombreInputRef.current?.focus(), 50);
    }
  }, [showEditModal]);

  // Autofocus en modal de abonar
  useEffect(() => {
    if (abonarTarget) {
      setAbonarError(null);
      setMontoAbonar('');
      setTimeout(() => abonarInputRef.current?.focus(), 50);
    }
  }, [abonarTarget]);

  async function cargarMetas() {
    try {
      setLoading(true);
      setError(null);
      const data = await getMetas();
      setMetas(data);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar las metas de ahorro.');
    } finally {
      setLoading(false);
    }
  }

  /* ── Crear Meta ──────────────────────────────── */
  function openCreateModal() {
    setCreateForm({
      nombre: '',
      monto_meta: '' as any,
    });
    setCreateError(null);
    setShowCreateModal(true);
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.nombre || createForm.nombre.trim() === '') {
      setCreateError('El nombre de la meta es obligatorio.');
      return;
    }
    if (createForm.nombre.trim().length > 255) {
      setCreateError('El nombre no puede superar los 255 caracteres.');
      return;
    }
    if (!createForm.monto_meta || Number(createForm.monto_meta) <= 0) {
      setCreateError('El monto objetivo debe ser numérico y mayor a 0.');
      return;
    }

    try {
      setCreando(true);
      setCreateError(null);
      await createMeta({
        nombre: createForm.nombre.trim(),
        monto_meta: Number(createForm.monto_meta),
      });

      setShowCreateModal(false);
      setSuccess('Meta de ahorro creada exitosamente.');
      setTimeout(() => setSuccess(null), 3500);
      await cargarMetas();
    } catch (err: any) {
      setCreateError(err.message || 'Error al registrar la meta.');
    } finally {
      setCreando(false);
    }
  }

  /* ── Editar Meta ─────────────────────────────── */
  function startEdit(item: MetaAhorro) {
    setEditingMeta(item);
    setEditForm({
      nombre: item.nombre,
      monto_meta: item.monto_meta,
    });
    setEditError(null);
    setShowEditModal(true);
  }

  function closeEditModal() {
    if (guardando) return;
    setShowEditModal(false);
    setEditingMeta(null);
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMeta) return;
    if (!editForm.nombre || editForm.nombre.trim() === '') {
      setEditError('El nombre de la meta es obligatorio.');
      return;
    }
    if (editForm.nombre.trim().length > 255) {
      setEditError('El nombre no puede superar los 255 caracteres.');
      return;
    }
    const nuevoMonto = Number(editForm.monto_meta);
    if (!nuevoMonto || nuevoMonto <= 0) {
      setEditError('El monto objetivo debe ser mayor a 0.');
      return;
    }
    if (editingMeta.saldo > 0 && nuevoMonto < editingMeta.saldo) {
      setEditError(`El monto no puede ser menor al saldo actual ahorrado (${formatCurrency(editingMeta.saldo)}).`);
      return;
    }

    try {
      setGuardando(true);
      setEditError(null);
      await updateMeta(editingMeta.id, {
        nombre: editForm.nombre.trim(),
        monto_meta: nuevoMonto,
      });

      closeEditModal();
      setSuccess('Meta de ahorro actualizada correctamente.');
      setTimeout(() => setSuccess(null), 3500);
      await cargarMetas();
    } catch (err: any) {
      setEditError(err.message || 'Error al actualizar la meta.');
    } finally {
      setGuardando(false);
    }
  }

  /* ── Eliminar Meta ───────────────────────────── */
  function confirmDelete(item: MetaAhorro) {
    setDeletingMeta(item);
  }

  async function handleExecuteDelete() {
    if (!deletingMeta) return;
    try {
      setEliminando(true);
      await deleteMeta(deletingMeta.id);
      setSuccess(`Meta "${deletingMeta.nombre}" eliminada correctamente.`);
      setTimeout(() => setSuccess(null), 4000);
      setDeletingMeta(null);
      await cargarMetas();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la meta de ahorro.');
    } finally {
      setEliminando(false);
    }
  }

  /* ── Agregar Dinero (Abonar a la Meta) ────────── */
  function openAbonarModal(meta: MetaAhorro) {
    setAbonarTarget(meta);
  }

  async function handleAbonarSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!abonarTarget) return;

    const montoNum = Number(montoAbonar);
    if (!montoAbonar || isNaN(montoNum) || montoNum <= 0) {
      setAbonarError('Ingresa un monto válido mayor a $0.');
      return;
    }

    try {
      setAbonando(true);
      setAbonarError(null);
      await abonarMeta(abonarTarget.id, montoNum);
      setSuccess(`Se agregaron ${formatCurrency(montoNum)} a "${abonarTarget.nombre}".`);
      setTimeout(() => setSuccess(null), 3500);
      setAbonarTarget(null);
      await cargarMetas();
    } catch (err: any) {
      setAbonarError(err.message || 'Error al abonar dinero a la meta.');
    } finally {
      setAbonando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-12">

      {/* ── Header Principal ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-foreground tracking-tight">
            Metas de ahorro
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1.5 font-medium">
            Convierte tus planes en objetivos medibles.
          </p>
        </div>

        <button
          id="btn-nueva-meta"
          onClick={openCreateModal}
          className="px-6 py-3 rounded-2xl text-sm font-bold bg-[#093539] text-white hover:bg-[#07272a] active:scale-95 transition-all shadow-sm flex items-center gap-2 shrink-0 cursor-pointer w-fit"
        >
          <span className="text-lg leading-none font-normal">+</span>
          <span>Nueva meta</span>
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

      {/* ── Cuadrícula de Tarjetas de Metas (Diseño Fiel a la Imagen) ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-card rounded-3xl p-7 sm:p-8 border border-border/80 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="size-12 rounded-full bg-muted/60 animate-pulse" />
                <div className="flex gap-2">
                  <div className="size-8 rounded bg-muted/40 animate-pulse" />
                  <div className="size-8 rounded bg-muted/40 animate-pulse" />
                </div>
              </div>
              <div className="h-7 rounded-lg w-3/4 bg-muted/60 animate-pulse mt-2" />
              <div className="h-4 rounded w-1/2 bg-muted/40 animate-pulse" />
              <div className="h-12 rounded-lg w-full bg-muted/30 animate-pulse mt-4" />
              <div className="h-3 rounded-full bg-muted/40 animate-pulse" />
              <div className="h-12 rounded-2xl bg-muted/50 animate-pulse mt-4" />
            </div>
          ))}
        </div>
      ) : metas.length === 0 ? (
        <div className="finance-card flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground mt-3">
          <span className="text-5xl">🎯</span>
          <p className="text-lg font-bold font-display text-foreground">
            No tienes metas de ahorro registradas aún
          </p>
          <p className="text-sm text-muted-foreground max-w-sm text-center">
            Crea tu primera meta para definir tus propósitos financieros y dar seguimiento a tus ahorros.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-3 px-6 py-3 rounded-2xl text-sm font-bold bg-[#093539] text-white hover:bg-[#07272a] transition-all cursor-pointer"
          >
            + Nueva meta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-3">
          {metas.map((meta) => {
            const barWidth = Math.min(100, Math.max(0, meta.porcentaje));

            return (
              <div
                key={meta.id}
                className="bg-card rounded-3xl p-7 sm:p-8 border border-border/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow duration-200"
              >
                <div>
                  {/* Top Row: Ícono en círculo menta y acciones */}
                  <div className="flex items-center justify-between">
                    <div className="size-12 rounded-full bg-[#d1fae5] text-[#065f46] flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="6" />
                        <circle cx="12" cy="12" r="2" />
                      </svg>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Editar */}
                      <button
                        id={`btn-editar-meta-${meta.id}`}
                        title="Editar meta"
                        onClick={() => startEdit(meta)}
                        className="size-8 flex items-center justify-center rounded-xl text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>

                      {/* Eliminar */}
                      <button
                        id={`btn-eliminar-meta-${meta.id}`}
                        title="Eliminar meta"
                        onClick={() => confirmDelete(meta)}
                        className="size-8 flex items-center justify-center rounded-xl text-rose-500/80 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Título de la meta (Texto más grande y destacado) */}
                  <h3 className="text-2xl font-extrabold font-display text-foreground mt-5 leading-tight tracking-tight">
                    {meta.nombre}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1.5 font-normal">
                    Ahorro para cumplir un objetivo personal.
                  </p>

                  {/* Fila de Ahorrado y Porcentaje (Texto más grande) */}
                  <div className="flex items-end justify-between mt-7">
                    <div>
                      <span className="text-xs sm:text-sm text-muted-foreground font-medium">Ahorrado</span>
                      <p className="text-3xl sm:text-[34px] font-extrabold font-display text-foreground tracking-tight leading-none mt-1">
                        {formatCurrency(meta.saldo)}
                      </p>
                    </div>
                    <span className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight mb-0.5">
                      {meta.porcentaje % 1 !== 0 ? meta.porcentaje.toFixed(1) : meta.porcentaje.toFixed(0)}%
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full h-3 rounded-full bg-[#f1f5f9] dark:bg-muted overflow-hidden mt-3.5">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-[#064e3b]"
                      style={{
                        width: `${barWidth}%`,
                      }}
                    />
                  </div>

                  {/* Fila inferior: Meta y Fecha */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground font-medium mt-3.5">
                    <span>Meta {formatCurrency(meta.monto_meta)}</span>
                    <span>{formatFriendlyDate(meta.created_at)}</span>
                  </div>
                </div>

                {/* Botón: + Agregar dinero (Texto y padding más amplio) */}
                <button
                  id={`btn-agregar-dinero-${meta.id}`}
                  onClick={() => openAbonarModal(meta)}
                  className="w-full py-3.5 mt-6 rounded-2xl text-sm sm:text-base font-bold bg-[#093539] text-white hover:bg-[#07272a] active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="text-base font-normal leading-none">+</span>
                  <span>Agregar dinero</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Agregar Dinero ─────────────────────── */}
      {abonarTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
        >
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-7 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold font-display text-foreground">
                  Agregar Dinero a Meta
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Abonar a "{abonarTarget.nombre}"
                </p>
              </div>
              <button
                onClick={() => setAbonarTarget(null)}
                className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {abonarError && (
              <div className="p-3.5 rounded-2xl bg-danger-soft text-destructive text-sm border border-destructive/20 leading-relaxed font-medium">
                ⚠️ {abonarError}
              </div>
            )}

            {/* Estado actual */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#f8fafc] dark:bg-muted/30 border border-border/60">
              <div>
                <span className="text-xs text-muted-foreground font-medium">Ahorrado actual</span>
                <p className="text-base font-bold font-display text-foreground mt-0.5">{formatCurrency(abonarTarget.saldo)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-medium">Monto meta</span>
                <p className="text-base font-bold font-display text-foreground mt-0.5">{formatCurrency(abonarTarget.monto_meta)}</p>
              </div>
            </div>

            <form onSubmit={handleAbonarSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-bold text-foreground">
                  Monto a abonar (MXN) <span className="text-expense">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-base">$</span>
                  <input
                    ref={abonarInputRef}
                    id="input-abonar-monto"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="1000.00"
                    value={montoAbonar}
                    onChange={(e) => setMontoAbonar(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-2xl border border-border bg-background text-foreground text-base font-semibold outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                    required
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  ℹ️ Se registrará un movimiento de ingreso asociado a esta meta y su saldo se incrementará automáticamente.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAbonarTarget(null)}
                  className="flex-1 py-3 rounded-2xl border border-border text-sm font-bold text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-submit-abonar"
                  disabled={abonando}
                  className="flex-1 py-3 rounded-2xl bg-[#093539] text-white text-sm font-bold hover:bg-[#07272a] active:scale-95 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {abonando ? 'Abonando...' : 'Confirmar abono'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Crear Meta ───────────────────────── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
        >
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-7 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold font-display text-foreground">
                  Crear Meta de Ahorro
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Establece el objetivo que deseas alcanzar.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3.5 rounded-2xl bg-danger-soft text-destructive text-sm border border-destructive/20 leading-relaxed font-medium">
                ⚠️ {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
              {/* Nombre de la Meta */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-bold text-foreground">
                  Nombre de la meta <span className="text-expense">*</span>
                </label>
                <input
                  ref={createNombreInputRef}
                  id="input-create-meta-nombre"
                  type="text"
                  placeholder="Ej. Comprar computadora, Fondo de emergencia, Viaje a la playa"
                  value={createForm.nombre}
                  onChange={(e) => setCreateForm({ ...createForm, nombre: e.target.value })}
                  maxLength={255}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm font-semibold outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                  required
                />
              </div>

              {/* Monto Objetivo */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-bold text-foreground">
                  Monto objetivo (MXN) <span className="text-expense">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-base">$</span>
                  <input
                    id="input-create-meta-monto"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="30000.00"
                    value={createForm.monto_meta || ''}
                    onChange={(e) => setCreateForm({ ...createForm, monto_meta: e.target.value as any })}
                    className="w-full pl-9 pr-4 py-3 rounded-2xl border border-border bg-background text-foreground text-base font-semibold outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                    required
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  ℹ️ El saldo inicial comenzará en $0.00 y se incrementará mediante abonos y movimientos.
                </span>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-border text-sm font-bold text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-submit-create-meta"
                  disabled={creando}
                  className="flex-1 py-3 rounded-2xl bg-[#093539] text-white text-sm font-bold hover:bg-[#07272a] active:scale-95 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {creando ? 'Guardando...' : 'Crear meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Editar Meta ──────────────────────── */}
      {showEditModal && editingMeta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
        >
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-7 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold font-display text-foreground">
                  Editar Meta de Ahorro
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Modifica los datos del objetivo.
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3.5 rounded-2xl bg-danger-soft text-destructive text-sm border border-destructive/20 leading-relaxed font-medium">
                ⚠️ {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              {/* Nombre de la Meta */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-bold text-foreground">
                  Nombre de la meta <span className="text-expense">*</span>
                </label>
                <input
                  ref={editNombreInputRef}
                  id="input-edit-meta-nombre"
                  type="text"
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                  maxLength={255}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm font-semibold outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                  required
                />
              </div>

              {/* Monto Objetivo */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-bold text-foreground">
                  Monto objetivo (MXN) <span className="text-expense">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-base">$</span>
                  <input
                    id="input-edit-meta-monto"
                    type="number"
                    step="0.01"
                    min={editingMeta.saldo > 0 ? editingMeta.saldo : 0.01}
                    placeholder="30000.00"
                    value={editForm.monto_meta || ''}
                    onChange={(e) => setEditForm({ ...editForm, monto_meta: e.target.value as any })}
                    className="w-full pl-9 pr-4 py-3 rounded-2xl border border-border bg-background text-foreground text-base font-semibold outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                    required
                  />
                </div>
                {editingMeta.saldo > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ℹ️ Saldo actual acumulado: <strong>{formatCurrency(editingMeta.saldo)}</strong>. El monto meta no puede ser menor a esta cantidad.
                  </span>
                )}
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 py-3 rounded-2xl border border-border text-sm font-bold text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-submit-edit-meta"
                  disabled={guardando}
                  className="flex-1 py-3 rounded-2xl bg-[#093539] text-white text-sm font-bold hover:bg-[#07272a] active:scale-95 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar Eliminación ───────────── */}
      {deletingMeta && (
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
                ¿Eliminar meta de ahorro?
              </h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Estás a punto de eliminar la meta <strong className="text-foreground">"{deletingMeta.nombre}"</strong> con objetivo de{' '}
                <strong className="text-foreground">{formatCurrency(deletingMeta.monto_meta)}</strong> y saldo acumulado de{' '}
                <strong className="text-foreground">{formatCurrency(deletingMeta.saldo)}</strong>.
              </p>
              {deletingMeta.cantidad_movimientos !== undefined && deletingMeta.cantidad_movimientos > 0 ? (
                <div className="mt-3 p-2.5 rounded-2xl bg-danger-soft text-xs text-destructive border border-destructive/30 text-left">
                  🛑 <strong>Bloqueo de seguridad:</strong> Esta meta tiene {deletingMeta.cantidad_movimientos} movimiento(s) asociado(s). No se puede eliminar hasta que se gestionen sus movimientos.
                </div>
              ) : (
                <div className="mt-3 p-2.5 rounded-2xl bg-muted/60 text-xs text-muted-foreground border border-border/50 text-left">
                  ℹ️ Esta acción no se puede deshacer.
                </div>
              )}
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeletingMeta(null)}
                disabled={eliminando}
                className="flex-1 py-2.5 rounded-2xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirm-delete-meta"
                onClick={handleExecuteDelete}
                disabled={eliminando || (deletingMeta.cantidad_movimientos !== undefined && deletingMeta.cantidad_movimientos > 0)}
                className="flex-1 py-2.5 rounded-2xl bg-destructive text-destructive-foreground text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-40 cursor-pointer"
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
