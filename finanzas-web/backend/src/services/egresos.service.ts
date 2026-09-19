// backend/src/services/egresos.service.ts
import { query } from '../bd';
import {
    EgresoConCategoria,
    CreateEgresoDto,
    UpdateEgresoDto,
    EgresoFiltersDto,
    EgresosSummaryDto,
} from '../types/egresos.types';

// Obtener listado de egresos con filtros y orden descendente
export async function getAll(filters: EgresoFiltersDto = {}): Promise<EgresoConCategoria[]> {
    let sql = `
        SELECT 
            e.id,
            CAST(e.monto AS DOUBLE) AS monto,
            e.concepto,
            e.fecha,
            e.id_cat,
            ce.nombre AS categoria_nombre,
            e.created_at,
            e.updated_at
        FROM egresos e
        INNER JOIN cat_egresos ce ON e.id_cat = ce.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    // Filtro por fecha inicial
    if (filters.fecha_inicio && filters.fecha_inicio.trim() !== '') {
        conditions.push('e.fecha >= ?');
        const fInicio = filters.fecha_inicio.trim();
        params.push(fInicio.length === 10 ? `${fInicio} 00:00:00` : fInicio);
    }

    // Filtro por fecha final
    if (filters.fecha_fin && filters.fecha_fin.trim() !== '') {
        conditions.push('e.fecha <= ?');
        const fFin = filters.fecha_fin.trim();
        params.push(fFin.length === 10 ? `${fFin} 23:59:59` : fFin);
    }

    // Filtro por categoría
    if (filters.id_cat && !isNaN(Number(filters.id_cat))) {
        conditions.push('e.id_cat = ?');
        params.push(Number(filters.id_cat));
    }

    // Filtro por búsqueda de concepto
    if (filters.search && filters.search.trim() !== '') {
        conditions.push('e.concepto LIKE ?');
        params.push(`%${filters.search.trim()}%`);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY e.fecha DESC, e.id DESC';

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

// Obtener un egreso por ID
export async function getById(id: number): Promise<EgresoConCategoria | null> {
    const sql = `
        SELECT 
            e.id,
            CAST(e.monto AS DOUBLE) AS monto,
            e.concepto,
            e.fecha,
            e.id_cat,
            ce.nombre AS categoria_nombre,
            e.created_at,
            e.updated_at
        FROM egresos e
        INNER JOIN cat_egresos ce ON e.id_cat = ce.id
        WHERE e.id = ?
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

// Crear un nuevo egreso
export async function create(dto: CreateEgresoDto): Promise<EgresoConCategoria> {
    const sql = `
        INSERT INTO egresos (monto, concepto, fecha, id_cat)
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
        throw new Error('Error al recuperar el egreso recién creado');
    }
    return nuevo;
}

// Actualizar un egreso existente
export async function update(id: number, dto: UpdateEgresoDto): Promise<EgresoConCategoria | null> {
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
    const sql = `UPDATE egresos SET ${fields.join(', ')} WHERE id = ?`;
    const result: any = await query(sql, params);

    if (result.affectedRows === 0) {
        return null;
    }

    return getById(id);
}

// Eliminar un egreso
export async function remove(id: number): Promise<boolean> {
    const result: any = await query('DELETE FROM egresos WHERE id = ?', [id]);
    return result.affectedRows > 0;
}

// Obtener resumen de egresos (con soporte a filtros)
export async function getSummary(filters: EgresoFiltersDto = {}): Promise<EgresosSummaryDto> {
    let sql = 'SELECT COUNT(*) AS total_registros, COALESCE(SUM(monto), 0) AS total_monto FROM egresos e';
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.fecha_inicio && filters.fecha_inicio.trim() !== '') {
        conditions.push('e.fecha >= ?');
        const fInicio = filters.fecha_inicio.trim();
        params.push(fInicio.length === 10 ? `${fInicio} 00:00:00` : fInicio);
    }
    if (filters.fecha_fin && filters.fecha_fin.trim() !== '') {
        conditions.push('e.fecha <= ?');
        const fFin = filters.fecha_fin.trim();
        params.push(fFin.length === 10 ? `${fFin} 23:59:59` : fFin);
    }
    if (filters.id_cat && !isNaN(Number(filters.id_cat))) {
        conditions.push('e.id_cat = ?');
        params.push(Number(filters.id_cat));
    }
    if (filters.search && filters.search.trim() !== '') {
        conditions.push('e.concepto LIKE ?');
        params.push(`%${filters.search.trim()}%`);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    const rows = await query(sql, params);
    return {
        total_registros: Number(rows[0]?.total_registros || 0),
        total_monto: Number(rows[0]?.total_monto || 0),
    };
}
