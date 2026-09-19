// frontend/src/api/limites.api.ts
import type {
    Limite,
    CreateLimiteDto,
    UpdateLimiteDto,
    LimiteFilters,
    LimitesSummary,
} from '../types/limites.types';

const BASE_URL = 'http://localhost:4000/api/limites';

export async function getLimites(filters: LimiteFilters = {}): Promise<Limite[]> {
    const params = new URLSearchParams();
    if (filters.id_cat) params.append('id_cat', String(filters.id_cat));
    if (filters.mes) params.append('mes', filters.mes);
    if (filters.year) params.append('year', String(filters.year));

    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;

    const res = await fetch(url);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al obtener los límites');
    }
    return res.json();
}

export async function getLimiteById(id: number): Promise<Limite> {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al obtener el límite');
    }
    return res.json();
}

export async function createLimite(dto: CreateLimiteDto): Promise<Limite> {
    const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.error || 'Error al registrar el límite');
        (err as any).statusCode = res.status;
        (err as any).data = data;
        throw err;
    }
    return res.json();
}

export async function updateLimite(id: number, dto: UpdateLimiteDto): Promise<Limite> {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.error || 'Error al actualizar el límite');
        (err as any).statusCode = res.status;
        (err as any).data = data;
        throw err;
    }
    return res.json();
}

export async function deleteLimite(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al eliminar el límite');
    }
}

export async function getLimitesSummary(filters: LimiteFilters = {}): Promise<LimitesSummary> {
    const params = new URLSearchParams();
    if (filters.id_cat) params.append('id_cat', String(filters.id_cat));
    if (filters.mes) params.append('mes', filters.mes);
    if (filters.year) params.append('year', String(filters.year));

    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}/summary?${queryString}` : `${BASE_URL}/summary`;

    const res = await fetch(url);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al obtener el resumen de presupuestos');
    }
    return res.json();
}
