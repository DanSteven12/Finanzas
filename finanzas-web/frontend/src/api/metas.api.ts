// frontend/src/api/metas.api.ts
import type {
    MetaAhorro,
    CreateMetaDto,
    UpdateMetaDto,
    MetasSummary,
} from '../types/metas.types';

const BASE_URL = 'http://localhost:4000/api/metas';

export async function getMetas(): Promise<MetaAhorro[]> {
    const res = await fetch(BASE_URL);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al obtener las metas de ahorro');
    }
    return res.json();
}

export async function getMetaById(id: number): Promise<MetaAhorro> {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al obtener la meta de ahorro');
    }
    return res.json();
}

export async function createMeta(dto: CreateMetaDto): Promise<MetaAhorro> {
    const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.error || 'Error al registrar la meta de ahorro');
        (err as any).statusCode = res.status;
        (err as any).data = data;
        throw err;
    }
    return res.json();
}

export async function updateMeta(id: number, dto: UpdateMetaDto): Promise<MetaAhorro> {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.error || 'Error al actualizar la meta de ahorro');
        (err as any).statusCode = res.status;
        (err as any).data = data;
        throw err;
    }
    return res.json();
}

export async function abonarMeta(id: number, monto: number): Promise<MetaAhorro> {
    const res = await fetch(`${BASE_URL}/${id}/abonar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.error || 'Error al abonar a la meta');
        (err as any).statusCode = res.status;
        (err as any).data = data;
        throw err;
    }
    return res.json();
}

export async function deleteMeta(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.error || 'Error al eliminar la meta de ahorro');
        (err as any).statusCode = res.status;
        (err as any).data = data;
        throw err;
    }
}

export async function getMetasSummary(): Promise<MetasSummary> {
    const res = await fetch(`${BASE_URL}/summary`);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al obtener el resumen de metas');
    }
    return res.json();
}
