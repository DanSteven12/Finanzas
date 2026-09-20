// frontend/src/api/movimientos.api.ts
import type {
  Movimiento,
  CreateMovimientoDto,
  UpdateMovimientoDto,
  MovimientoFilters,
  MovimientosSummaryDto,
} from '../types/movimientos.types';

const BASE_URL = 'http://localhost:4000/api/movimientos';

export async function getMovimientos(filters: MovimientoFilters = {}): Promise<Movimiento[]> {
  const params = new URLSearchParams();
  if (filters.id_meta) params.append('id_meta', String(filters.id_meta));
  if (filters.tipo) params.append('tipo', filters.tipo);
  if (filters.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio);
  if (filters.fecha_fin) params.append('fecha_fin', filters.fecha_fin);
  if (filters.search) params.append('search', filters.search);

  const queryString = params.toString();
  const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;

  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Error al obtener los movimientos');
  }
  return res.json();
}

export async function getMovimientosSummary(filters: MovimientoFilters = {}): Promise<MovimientosSummaryDto> {
  const params = new URLSearchParams();
  if (filters.id_meta) params.append('id_meta', String(filters.id_meta));
  if (filters.tipo) params.append('tipo', filters.tipo);
  if (filters.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio);
  if (filters.fecha_fin) params.append('fecha_fin', filters.fecha_fin);
  if (filters.search) params.append('search', filters.search);

  const queryString = params.toString();
  const url = queryString ? `${BASE_URL}/summary?${queryString}` : `${BASE_URL}/summary`;

  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Error al obtener el resumen de movimientos');
  }
  return res.json();
}

export async function getMovimientoById(id: number): Promise<Movimiento> {
  const res = await fetch(`${BASE_URL}/${id}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Error al obtener el movimiento');
  }
  return res.json();
}

export async function createMovimiento(dto: CreateMovimientoDto): Promise<Movimiento> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Error al registrar el movimiento');
  }
  return res.json();
}

export async function updateMovimiento(id: number, dto: UpdateMovimientoDto): Promise<Movimiento> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Error al actualizar el movimiento');
  }
  return res.json();
}

export async function deleteMovimiento(id: number): Promise<{ message: string; id: number }> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Error al eliminar el movimiento');
  }
  return res.json();
}
