// frontend/src/api/catIngresos.api.ts
import type { CatIngreso, CreateCatIngresoDto, UpdateCatIngresoDto } from '../types/catIngresos.types';

const BASE_URL = 'http://localhost:4000/api/cat-ingresos';

export async function getCatIngresos(): Promise<CatIngreso[]> {
    const res = await fetch(BASE_URL);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al obtener categorías de ingresos');
    }
    return res.json();
}

export async function createCatIngreso(dto: CreateCatIngresoDto): Promise<CatIngreso> {
    const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al crear la categoría de ingreso');
    }
    return res.json();
}

export async function updateCatIngreso(id: number, dto: UpdateCatIngresoDto): Promise<void> {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al actualizar la categoría de ingreso');
    }
}

export async function deleteCatIngreso(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al eliminar la categoría de ingreso');
    }
}
