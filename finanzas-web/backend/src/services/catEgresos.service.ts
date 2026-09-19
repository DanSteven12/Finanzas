// backend/src/services/catEgresos.service.ts
import { query } from '../bd';
import { CatEgreso, CreateCatEgresoDto, UpdateCatEgresoDto } from '../types/catEgresos.types';

// Obtener todas las categorías de egresos con metadatos calculados
export async function getAll(): Promise<CatEgreso[]> {
    const sql = `
        SELECT 
            ce.id, 
            ce.nombre,
            COUNT(e.id) AS cantidad_gastos,
            COALESCE(SUM(e.monto), 0) AS total_gastado
        FROM cat_egresos ce
        LEFT JOIN egresos e ON ce.id = e.id_cat
        GROUP BY ce.id, ce.nombre
        ORDER BY ce.nombre ASC
    `;
    const rows = await query(sql);
    return rows.map((r: any) => ({
        id: Number(r.id),
        nombre: r.nombre,
        cantidad_gastos: Number(r.cantidad_gastos || 0),
        total_gastado: Number(r.total_gastado || 0),
    }));
}

// Obtener una categoría por ID
export async function getById(id: number): Promise<CatEgreso | null> {
    const rows: CatEgreso[] = await query(
        'SELECT id, nombre FROM cat_egresos WHERE id = ?',
        [id]
    );
    return rows[0] ?? null;
}

// Buscar por nombre (para validar duplicados)
export async function getByNombre(nombre: string, excludeId?: number): Promise<CatEgreso | null> {
    const trimmed = nombre.trim();
    let sql = 'SELECT id, nombre FROM cat_egresos WHERE LOWER(TRIM(nombre)) = LOWER(?)';
    const params: any[] = [trimmed];

    if (excludeId !== undefined) {
        sql += ' AND id != ?';
        params.push(excludeId);
    }

    const rows: CatEgreso[] = await query(sql, params);
    return rows[0] ?? null;
}

// Contar cantidad de egresos vinculados a una categoría
export async function countEgresosByCat(id: number): Promise<number> {
    const rows: any[] = await query(
        'SELECT COUNT(*) AS total FROM egresos WHERE id_cat = ?',
        [id]
    );
    return Number(rows[0]?.total || 0);
}

// Crear nueva categoría
export async function create(dto: CreateCatEgresoDto): Promise<CatEgreso> {
    const trimmed = dto.nombre.trim();
    const result: any = await query(
        'INSERT INTO cat_egresos (nombre) VALUES (?)',
        [trimmed]
    );
    return {
        id: result.insertId,
        nombre: trimmed,
        cantidad_gastos: 0,
        total_gastado: 0,
    };
}

// Actualizar categoría existente
export async function update(id: number, dto: UpdateCatEgresoDto): Promise<boolean> {
    const trimmed = dto.nombre.trim();
    const result: any = await query(
        'UPDATE cat_egresos SET nombre = ? WHERE id = ?',
        [trimmed, id]
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
