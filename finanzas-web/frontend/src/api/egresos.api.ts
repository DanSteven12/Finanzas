// frontend/src/api/egresos.api.ts
import type {
    Egreso,
    CreateEgresoDto,
    UpdateEgresoDto,
    EgresoFilters,
    EgresosSummary,
} from '../types/egresos.types';

const BASE_URL = 'http://localhost:4000/api/egresos';

export async function getEgresos(filters: EgresoFilters = {}): Promise<Egreso[]> {
    const params = new URLSearchParams();
    if (filters.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio);
    if (filters.fecha_fin) params.append('fecha_fin', filters.fecha_fin);
    if (filters.id_cat) params.append('id_cat', String(filters.id_cat));
    if (filters.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;

    const res = await fetch(url);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al obtener los egresos');
    }
    return res.json();
}

export async function getEgresoById(id: number): Promise<Egreso> {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al obtener el egreso');
    }
    return res.json();
}

export async function createEgreso(dto: CreateEgresoDto): Promise<Egreso> {
    const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al registrar el egreso');
    }
    return res.json();
}

export async function updateEgreso(id: number, dto: UpdateEgresoDto): Promise<Egreso> {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al actualizar el egreso');
    }
    return res.json();
}

export async function deleteEgreso(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al eliminar el egreso');
    }
}

export async function getEgresosSummary(filters: EgresoFilters = {}): Promise<EgresosSummary> {
    const params = new URLSearchParams();
    if (filters.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio);
    if (filters.fecha_fin) params.append('fecha_fin', filters.fecha_fin);
    if (filters.id_cat) params.append('id_cat', String(filters.id_cat));
    if (filters.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}/summary?${queryString}` : `${BASE_URL}/summary`;

    const res = await fetch(url);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al obtener el resumen de egresos');
    }
    return res.json();
}
