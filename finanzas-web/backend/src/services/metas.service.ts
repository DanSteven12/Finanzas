import { query, pool } from '../bd';
import {
    MetaAhorroConDetalle,
    CreateMetaDto,
    UpdateMetaDto,
    MetasSummaryDto,
    EstadoMeta,
} from '../types/metas.types';

// Mapear fila SQL a estructura MetaAhorroConDetalle con cálculos dinámicos
function mapRowToMetaConDetalle(r: any): MetaAhorroConDetalle {
    const monto_meta = Number(r.monto_meta);
    const saldo = Number(r.saldo || 0);
    const faltante = Math.max(0, Number((monto_meta - saldo).toFixed(2)));
    const porcentaje = monto_meta > 0 ? Number(((saldo / monto_meta) * 100).toFixed(2)) : 0;

    let estado: EstadoMeta = 'no_iniciada';
    if (saldo >= monto_meta && monto_meta > 0) {
        estado = 'completada';
    } else if (saldo > 0) {
        estado = 'en_progreso';
    } else {
        estado = 'no_iniciada';
    }

    return {
        id: Number(r.id),
        nombre: r.nombre,
        monto_meta,
        saldo,
        faltante,
        porcentaje,
        estado,
        cantidad_movimientos: Number(r.cantidad_movimientos || 0),
        created_at: r.created_at,
        updated_at: r.updated_at,
    };
}

// Obtener listado de todas las metas con conteo de movimientos asociados
export async function getAll(): Promise<MetaAhorroConDetalle[]> {
    const sql = `
        SELECT 
            m.id,
            m.nombre,
            CAST(m.monto_meta AS DOUBLE) AS monto_meta,
            CAST(m.saldo AS DOUBLE) AS saldo,
            m.created_at,
            m.updated_at,
            COUNT(mov.id) AS cantidad_movimientos
        FROM meta_ahorro m
        LEFT JOIN movimiento mov ON mov.id_meta = m.id
        GROUP BY m.id, m.nombre, m.monto_meta, m.saldo, m.created_at, m.updated_at
        ORDER BY m.created_at DESC, m.id DESC
    `;
    const rows = await query(sql);
    return rows.map(mapRowToMetaConDetalle);
}

// Obtener meta por ID
export async function getById(id: number): Promise<MetaAhorroConDetalle | null> {
    const sql = `
        SELECT 
            m.id,
            m.nombre,
            CAST(m.monto_meta AS DOUBLE) AS monto_meta,
            CAST(m.saldo AS DOUBLE) AS saldo,
            m.created_at,
            m.updated_at,
            COUNT(mov.id) AS cantidad_movimientos
        FROM meta_ahorro m
        LEFT JOIN movimiento mov ON mov.id_meta = m.id
        WHERE m.id = ?
        GROUP BY m.id, m.nombre, m.monto_meta, m.saldo, m.created_at, m.updated_at
    `;
    const rows = await query(sql, [id]);
    if (!rows || rows.length === 0) return null;
    return mapRowToMetaConDetalle(rows[0]);
}

// Contar movimientos vinculados a una meta
export async function countMovimientosByMeta(id: number): Promise<number> {
    const rows: any[] = await query(
        'SELECT COUNT(*) AS total FROM movimiento WHERE id_meta = ?',
        [id]
    );
    return Number(rows[0]?.total || 0);
}

// Crear nueva meta (saldo inicial siempre 0.00)
export async function create(dto: CreateMetaDto): Promise<MetaAhorroConDetalle> {
    const trimmedNombre = dto.nombre.trim();
    const sql = `
        INSERT INTO meta_ahorro (nombre, monto_meta, saldo)
        VALUES (?, ?, 0.00)
    `;
    const params = [
        trimmedNombre,
        Number(dto.monto_meta),
    ];

    const result: any = await query(sql, params);
    const nuevo = await getById(result.insertId);
    if (!nuevo) {
        throw new Error('Error al recuperar la meta recién creada');
    }
    return nuevo;
}

// Actualizar una meta (nombre y/o monto_meta; saldo NO se modifica aquí)
export async function update(id: number, dto: UpdateMetaDto): Promise<MetaAhorroConDetalle | null> {
    const fields: string[] = [];
    const params: any[] = [];

    if (dto.nombre !== undefined) {
        fields.push('nombre = ?');
        params.push(dto.nombre.trim());
    }
    if (dto.monto_meta !== undefined) {
        fields.push('monto_meta = ?');
        params.push(Number(dto.monto_meta));
    }

    if (fields.length === 0) {
        return getById(id);
    }

    params.push(id);
    const sql = `UPDATE meta_ahorro SET ${fields.join(', ')} WHERE id = ?`;
    const result: any = await query(sql, params);

    if (result.affectedRows === 0) {
        return null;
    }

    return getById(id);
}

// Eliminar una meta
export async function remove(id: number): Promise<boolean> {
    const result: any = await query('DELETE FROM meta_ahorro WHERE id = ?', [id]);
    return result.affectedRows > 0;
}

// Abonar dinero a una meta (registra movimiento y actualiza saldo de forma atómica)
export async function abonar(id_meta: number, monto: number): Promise<MetaAhorroConDetalle> {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Insertar movimiento de ahorro
        await connection.query(
            'INSERT INTO movimiento (monto, tipo, fecha, id_meta) VALUES (?, "INGRESO", NOW(), ?)',
            [Number(monto), id_meta]
        );

        // 2. Incrementar saldo en meta_ahorro
        await connection.query(
            'UPDATE meta_ahorro SET saldo = saldo + ? WHERE id = ?',
            [Number(monto), id_meta]
        );

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }

    const updated = await getById(id_meta);
    if (!updated) throw new Error('Error al recuperar meta tras el abono');
    return updated;
}

// Resumen / estadísticas globales de metas
export async function getSummary(): Promise<MetasSummaryDto> {
    const metas = await getAll();

    let total_monto_meta = 0;
    let total_saldo = 0;
    let metas_completadas = 0;

    for (const m of metas) {
        total_monto_meta += m.monto_meta;
        total_saldo += m.saldo;
        if (m.saldo >= m.monto_meta && m.monto_meta > 0) {
            metas_completadas += 1;
        }
    }

    const total_faltante = Math.max(0, Number((total_monto_meta - total_saldo).toFixed(2)));

    return {
        total_metas: metas.length,
        total_monto_meta: Number(total_monto_meta.toFixed(2)),
        total_saldo: Number(total_saldo.toFixed(2)),
        total_faltante,
        metas_completadas,
    };
}
