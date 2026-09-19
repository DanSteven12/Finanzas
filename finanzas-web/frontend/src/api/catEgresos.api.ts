// frontend/src/api/catEgresos.api.ts
import type { CatEgreso, CreateCatEgresoDto } from '../types/catEgresos.types';

const BASE_URL = 'http://localhost:4000/api/cat-egresos';

export async function getCategorias(): Promise<CatEgreso[]> {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error('Error al obtener categorías');
    return res.json();
}

export async function createCategoria(dto: CreateCatEgresoDto): Promise<CatEgreso> {
    const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error('Error al crear categoría');
    return res.json();
}

export async function updateCategoria(id: number, dto: CreateCatEgresoDto): Promise<void> {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error('Error al actualizar categoría');
}

export async function deleteCategoria(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar categoría');
}
