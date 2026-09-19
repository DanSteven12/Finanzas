// frontend/src/api/ingresos.api.ts
import type {
    Ingreso,
    CreateIngresoDto,
    UpdateIngresoDto,
    IngresoFilters,
    IngresosSummary,
} from '../types/ingresos.types';

const BASE_URL = 'http://localhost:4000/api/ingresos';

export async function getIngresos(filters: IngresoFilters = {}): Promise<Ingreso[]> {
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
        throw new Error(data.error || 'Error al obtener los ingresos');
    }
    return res.json();
}

export async function getIngresoById(id: number): Promise<Ingreso> {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al obtener el ingreso');
    }
    return res.json();
}

export async function createIngreso(dto: CreateIngresoDto): Promise<Ingreso> {
    const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al registrar el ingreso');
    }
    return res.json();
}

export async function updateIngreso(id: number, dto: UpdateIngresoDto): Promise<Ingreso> {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al actualizar el ingreso');
    }
    return res.json();
}

export async function deleteIngreso(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al eliminar el ingreso');
    }
}

export async function getIngresosSummary(): Promise<IngresosSummary> {
    const res = await fetch(`${BASE_URL}/summary`);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al obtener el resumen de ingresos');
    }
    return res.json();
}
