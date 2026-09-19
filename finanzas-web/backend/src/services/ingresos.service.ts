// backend/src/services/ingresos.service.ts
import { query } from '../bd';
import {
    IngresoConCategoria,
    CreateIngresoDto,
    UpdateIngresoDto,
    IngresoFiltersDto,
} from '../types/ingresos.types';

// Obtener listado de ingresos con filtros y orden descendente
export async function getAll(filters: IngresoFiltersDto = {}): Promise<IngresoConCategoria[]> {
    let sql = `
        SELECT 
            i.id,
            CAST(i.monto AS DOUBLE) AS monto,
            i.concepto,
            i.fecha,
            i.id_cat,
            ci.nombre AS categoria_nombre,
            i.created_at,
            i.updated_at
        FROM ingresos i
        INNER JOIN cat_ingresos ci ON i.id_cat = ci.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    // Filtro por fecha inicial
    if (filters.fecha_inicio && filters.fecha_inicio.trim() !== '') {
        conditions.push('i.fecha >= ?');
        const fInicio = filters.fecha_inicio.trim();
        params.push(fInicio.length === 10 ? `${fInicio} 00:00:00` : fInicio);
    }

    // Filtro por fecha final
    if (filters.fecha_fin && filters.fecha_fin.trim() !== '') {
        conditions.push('i.fecha <= ?');
        const fFin = filters.fecha_fin.trim();
        params.push(fFin.length === 10 ? `${fFin} 23:59:59` : fFin);
    }

    // Filtro por categoría
    if (filters.id_cat && !isNaN(Number(filters.id_cat))) {
        conditions.push('i.id_cat = ?');
        params.push(Number(filters.id_cat));
    }

    // Filtro por búsqueda de concepto
    if (filters.search && filters.search.trim() !== '') {
        conditions.push('i.concepto LIKE ?');
        params.push(`%${filters.search.trim()}%`);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY i.fecha DESC, i.id DESC';

    const rows = await query(sql, params);
    return rows.map((r: any) => ({
        id: Number(r.id),
        monto: Number(r.monto),
        concepto: r.concepto,
        fecha: r.fecha,
        id_cat: Number(r.id_cat),
        categoria_nombre: r.categoria_nombre,
        created_at: r.created_at,
        updated_at: r.updated_at,
    }));
}

// Obtener un ingreso por ID
export async function getById(id: number): Promise<IngresoConCategoria | null> {
    const sql = `
        SELECT 
            i.id,
            CAST(i.monto AS DOUBLE) AS monto,
            i.concepto,
            i.fecha,
            i.id_cat,
            ci.nombre AS categoria_nombre,
            i.created_at,
            i.updated_at
        FROM ingresos i
        INNER JOIN cat_ingresos ci ON i.id_cat = ci.id
        WHERE i.id = ?
    `;
    const rows = await query(sql, [id]);
    if (!rows || rows.length === 0) return null;

    const r = rows[0];
    return {
        id: Number(r.id),
        monto: Number(r.monto),
        concepto: r.concepto,
        fecha: r.fecha,
        id_cat: Number(r.id_cat),
        categoria_nombre: r.categoria_nombre,
        created_at: r.created_at,
        updated_at: r.updated_at,
    };
}

// Crear un nuevo ingreso
export async function create(dto: CreateIngresoDto): Promise<IngresoConCategoria> {
    const sql = `
        INSERT INTO ingresos (monto, concepto, fecha, id_cat)
        VALUES (?, ?, ?, ?)
    `;
    const params = [
        Number(dto.monto),
        dto.concepto.trim(),
        dto.fecha,
        Number(dto.id_cat),
    ];

    const result: any = await query(sql, params);
    const nuevo = await getById(result.insertId);
    if (!nuevo) {
        throw new Error('Error al recuperar el ingreso recién creado');
    }
    return nuevo;
}

// Actualizar un ingreso existente
export async function update(id: number, dto: UpdateIngresoDto): Promise<IngresoConCategoria | null> {
    const fields: string[] = [];
    const params: any[] = [];

    if (dto.monto !== undefined) {
        fields.push('monto = ?');
        params.push(Number(dto.monto));
    }
    if (dto.concepto !== undefined) {
        fields.push('concepto = ?');
        params.push(dto.concepto.trim());
    }
    if (dto.fecha !== undefined) {
        fields.push('fecha = ?');
        params.push(dto.fecha);
    }
    if (dto.id_cat !== undefined) {
        fields.push('id_cat = ?');
        params.push(Number(dto.id_cat));
    }

    if (fields.length === 0) {
        return getById(id);
    }

    params.push(id);
    const sql = `UPDATE ingresos SET ${fields.join(', ')} WHERE id = ?`;
    const result: any = await query(sql, params);

    if (result.affectedRows === 0) {
        return null;
    }

    return getById(id);
}

// Eliminar un ingreso
export async function remove(id: number): Promise<boolean> {
    const result: any = await query('DELETE FROM ingresos WHERE id = ?', [id]);
    return result.affectedRows > 0;
}

// Obtener resumen total de ingresos (para dashboard / métricas)
export async function getSummary(): Promise<{ total_registros: number; total_monto: number }> {
    const rows = await query('SELECT COUNT(*) AS total_registros, COALESCE(SUM(monto), 0) AS total_monto FROM ingresos');
    return {
        total_registros: Number(rows[0]?.total_registros || 0),
        total_monto: Number(rows[0]?.total_monto || 0),
    };
}
