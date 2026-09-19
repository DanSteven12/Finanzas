// backend/src/services/catIngresos.service.ts
import { query } from '../bd';
import { CatIngreso, CreateCatIngresoDto, UpdateCatIngresoDto } from '../types/catIngresos.types';

// Obtener todas las categorías de ingresos con metadatos calculados
export async function getAll(): Promise<CatIngreso[]> {
    const sql = `
        SELECT 
            ci.id, 
            ci.nombre,
            COUNT(i.id) AS cantidad_ingresos,
            COALESCE(SUM(i.monto), 0) AS total_ingresado
        FROM cat_ingresos ci
        LEFT JOIN ingresos i ON ci.id = i.id_cat
        GROUP BY ci.id, ci.nombre
        ORDER BY ci.nombre ASC
    `;
    const rows = await query(sql);
    return rows.map((r: any) => ({
        id: Number(r.id),
        nombre: r.nombre,
        cantidad_ingresos: Number(r.cantidad_ingresos || 0),
        total_ingresado: Number(r.total_ingresado || 0),
    }));
}

// Obtener una categoría por ID
export async function getById(id: number): Promise<CatIngreso | null> {
    const rows: CatIngreso[] = await query(
        'SELECT id, nombre FROM cat_ingresos WHERE id = ?',
        [id]
    );
    return rows[0] ?? null;
}

// Buscar por nombre (para validar duplicados)
export async function getByNombre(nombre: string, excludeId?: number): Promise<CatIngreso | null> {
    const trimmed = nombre.trim();
    let sql = 'SELECT id, nombre FROM cat_ingresos WHERE LOWER(TRIM(nombre)) = LOWER(?)';
    const params: any[] = [trimmed];

    if (excludeId !== undefined) {
        sql += ' AND id != ?';
        params.push(excludeId);
    }

    const rows: CatIngreso[] = await query(sql, params);
    return rows[0] ?? null;
}

// Contar cantidad de ingresos vinculados a una categoría
export async function countIngresosByCat(id: number): Promise<number> {
    const rows: any[] = await query(
        'SELECT COUNT(*) AS total FROM ingresos WHERE id_cat = ?',
        [id]
    );
    return Number(rows[0]?.total || 0);
}

// Crear nueva categoría
export async function create(dto: CreateCatIngresoDto): Promise<CatIngreso> {
    const trimmed = dto.nombre.trim();
    const result: any = await query(
        'INSERT INTO cat_ingresos (nombre) VALUES (?)',
        [trimmed]
    );
    return {
        id: result.insertId,
        nombre: trimmed,
        cantidad_ingresos: 0,
        total_ingresado: 0,
    };
}

// Actualizar categoría existente
export async function update(id: number, dto: UpdateCatIngresoDto): Promise<boolean> {
    const trimmed = dto.nombre.trim();
    const result: any = await query(
        'UPDATE cat_ingresos SET nombre = ? WHERE id = ?',
        [trimmed, id]
    );
    return result.affectedRows > 0;
}

// Eliminar categoría
export async function remove(id: number): Promise<boolean> {
    const result: any = await query(
        'DELETE FROM cat_ingresos WHERE id = ?',
        [id]
    );
    return result.affectedRows > 0;
}
