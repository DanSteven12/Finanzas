// backend/src/services/catEgresos.service.ts
import { query } from '../bd';
import { CatEgreso, CreateCatEgresoDto, UpdateCatEgresoDto } from '../types/catEgresos.types';

// Obtener todas las categorías de egresos
export async function getAll(): Promise<CatEgreso[]> {
    return query('SELECT id, nombre FROM cat_egresos ORDER BY nombre ASC');
}

// Obtener una categoría por ID
export async function getById(id: number): Promise<CatEgreso | null> {
    const rows: CatEgreso[] = await query(
        'SELECT id, nombre FROM cat_egresos WHERE id = ?',
        [id]
    );
    return rows[0] ?? null;
}

// Crear nueva categoría
export async function create(dto: CreateCatEgresoDto): Promise<CatEgreso> {
    const result: any = await query(
        'INSERT INTO cat_egresos (nombre) VALUES (?)',
        [dto.nombre.trim()]
    );
    return { id: result.insertId, nombre: dto.nombre.trim() };
}

// Actualizar categoría existente
export async function update(id: number, dto: UpdateCatEgresoDto): Promise<boolean> {
    const result: any = await query(
        'UPDATE cat_egresos SET nombre = ? WHERE id = ?',
        [dto.nombre.trim(), id]
    );
    return result.affectedRows > 0;
}

// Eliminar categoría
export async function remove(id: number): Promise<boolean> {
    const result: any = await query(
        'DELETE FROM cat_egresos WHERE id = ?',
        [id]
    );
    return result.affectedRows > 0;
}
