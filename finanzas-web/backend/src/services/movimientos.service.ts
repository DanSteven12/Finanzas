// backend/src/services/movimientos.service.ts
import { query, pool } from '../bd';
import {
    MovimientoConDetalle,
    CreateMovimientoDto,
    UpdateMovimientoDto,
    MovimientoFilters,
    MovimientosSummaryDto,
} from '../types/movimientos.types';

function formatCurrency(val: number): string {
    return `$${Number(val || 0).toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

// Mapear fila SQL a estructura MovimientoConDetalle
function mapRowToMovimientoConDetalle(r: any): MovimientoConDetalle {
    return {
        id: Number(r.id),
        monto: Number(r.monto),
        tipo: r.tipo,
        fecha: r.fecha,
        id_meta: Number(r.id_meta),
        nombre_meta: r.nombre_meta || '',
        monto_meta: r.monto_meta !== undefined ? Number(r.monto_meta) : undefined,
        saldo_meta: r.saldo_meta !== undefined ? Number(r.saldo_meta) : undefined,
        saldo_resultante: r.saldo_resultante !== undefined ? Number(r.saldo_resultante) : undefined,
        created_at: r.created_at,
    };
}

// Obtener listado de movimientos con filtros combinados, JOIN con meta_ahorro y saldo resultante
export async function getAll(filters?: MovimientoFilters): Promise<MovimientoConDetalle[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.id_meta) {
        conditions.push('id_meta = ?');
        params.push(Number(filters.id_meta));
    }

    if (filters?.tipo && (filters.tipo === 'INGRESO' || filters.tipo === 'EGRESO')) {
        conditions.push('tipo = ?');
        params.push(filters.tipo);
    }

    if (filters?.fecha_inicio) {
        conditions.push('fecha >= ?');
        params.push(filters.fecha_inicio);
    }

    if (filters?.fecha_fin) {
        conditions.push('fecha <= ?');
        params.push(filters.fecha_fin);
    }

    if (filters?.search && filters.search.trim() !== '') {
        conditions.push('(nombre_meta LIKE ?)');
        params.push(`%${filters.search.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
        WITH mov_con_saldo AS (
            SELECT 
                mov.id,
                CAST(mov.monto AS DOUBLE) AS monto,
                mov.tipo,
                mov.fecha,
                mov.id_meta,
                mov.created_at,
                m.nombre AS nombre_meta,
                CAST(m.monto_meta AS DOUBLE) AS monto_meta,
                CAST(m.saldo AS DOUBLE) AS saldo_meta,
                CAST(
                    SUM(CASE WHEN mov.tipo = 'INGRESO' THEN mov.monto ELSE -mov.monto END)
                    OVER (PARTITION BY mov.id_meta ORDER BY mov.fecha ASC, mov.id ASC)
                AS DOUBLE) AS saldo_resultante
            FROM movimiento mov
            INNER JOIN meta_ahorro m ON m.id = mov.id_meta
        )
        SELECT * FROM mov_con_saldo
        ${whereClause}
        ORDER BY fecha DESC, id DESC
    `;

    const rows = await query(sql, params);
    return rows.map(mapRowToMovimientoConDetalle);
}

// Obtener movimiento por ID con detalle de meta y saldo resultante
export async function getById(id: number): Promise<MovimientoConDetalle | null> {
    const sql = `
        WITH mov_con_saldo AS (
            SELECT 
                mov.id,
                CAST(mov.monto AS DOUBLE) AS monto,
                mov.tipo,
                mov.fecha,
                mov.id_meta,
                mov.created_at,
                m.nombre AS nombre_meta,
                CAST(m.monto_meta AS DOUBLE) AS monto_meta,
                CAST(m.saldo AS DOUBLE) AS saldo_meta,
                CAST(
                    SUM(CASE WHEN mov.tipo = 'INGRESO' THEN mov.monto ELSE -mov.monto END)
                    OVER (PARTITION BY mov.id_meta ORDER BY mov.fecha ASC, mov.id ASC)
                AS DOUBLE) AS saldo_resultante
            FROM movimiento mov
            INNER JOIN meta_ahorro m ON m.id = mov.id_meta
        )
        SELECT * FROM mov_con_saldo
        WHERE id = ?
    `;
    const rows = await query(sql, [id]);
    if (!rows || rows.length === 0) return null;
    return mapRowToMovimientoConDetalle(rows[0]);
}

// Obtener resumen de movimientos (ingresos, egresos, balance, conteo)
export async function getSummary(filters?: MovimientoFilters): Promise<MovimientosSummaryDto> {
    const movimientos = await getAll(filters);

    let total_ingresos = 0;
    let total_egresos = 0;

    for (const mov of movimientos) {
        if (mov.tipo === 'INGRESO') {
            total_ingresos += mov.monto;
        } else if (mov.tipo === 'EGRESO') {
            total_egresos += mov.monto;
        }
    }

    const balance = Number((total_ingresos - total_egresos).toFixed(2));

    return {
        total_ingresos: Number(total_ingresos.toFixed(2)),
        total_egresos: Number(total_egresos.toFixed(2)),
        balance,
        total_movimientos: movimientos.length,
    };
}

// Crear movimiento dentro de una transacción SQL con bloqueo de fila
export async function create(dto: CreateMovimientoDto): Promise<MovimientoConDetalle> {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Obtener y bloquear la meta correspondiente
        const [metaRows]: any = await connection.query(
            'SELECT id, nombre, CAST(monto_meta AS DOUBLE) AS monto_meta, CAST(saldo AS DOUBLE) AS saldo FROM meta_ahorro WHERE id = ? FOR UPDATE',
            [dto.id_meta]
        );

        if (!metaRows || metaRows.length === 0) {
            throw new Error('La meta de ahorro seleccionada no existe en el sistema.');
        }

        const meta = metaRows[0];
        const saldoActual = Number(meta.saldo || 0);
        const montoMov = Number(dto.monto);

        // 2. Validar saldo disponible para EGRESO
        let nuevoSaldo: number;
        if (dto.tipo === 'INGRESO') {
            nuevoSaldo = Number((saldoActual + montoMov).toFixed(2));
        } else if (dto.tipo === 'EGRESO') {
            nuevoSaldo = Number((saldoActual - montoMov).toFixed(2));
            if (nuevoSaldo < 0) {
                throw new Error(
                    `No puedes retirar ${formatCurrency(montoMov)} porque el saldo disponible en "${meta.nombre}" es de ${formatCurrency(saldoActual)}.`
                );
            }
        } else {
            throw new Error('Tipo de movimiento no válido. Solo se permite INGRESO o EGRESO.');
        }

        // 3. Insertar el movimiento
        const [insertResult]: any = await connection.query(
            'INSERT INTO movimiento (monto, tipo, fecha, id_meta) VALUES (?, ?, ?, ?)',
            [montoMov, dto.tipo, dto.fecha, dto.id_meta]
        );

        // 4. Actualizar saldo en meta_ahorro
        await connection.query(
            'UPDATE meta_ahorro SET saldo = ? WHERE id = ?',
            [nuevoSaldo, dto.id_meta]
        );

        await connection.commit();

        const insertId = insertResult.insertId;
        const nuevo = await getById(insertId);
        if (!nuevo) throw new Error('Error al recuperar el movimiento recién creado.');
        return nuevo;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

// Editar movimiento dentro de una transacción SQL con bloqueo de filas
export async function update(id: number, dto: UpdateMovimientoDto): Promise<MovimientoConDetalle | null> {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Obtener y bloquear el movimiento actual
        const [movRows]: any = await connection.query(
            'SELECT * FROM movimiento WHERE id = ? FOR UPDATE',
            [id]
        );

        if (!movRows || movRows.length === 0) {
            await connection.rollback();
            return null;
        }

        const currentMov = movRows[0];
        const oldMetaId = Number(currentMov.id_meta);
        const newMetaId = dto.id_meta !== undefined ? Number(dto.id_meta) : oldMetaId;

        const oldTipo = currentMov.tipo as 'INGRESO' | 'EGRESO';
        const newTipo = dto.tipo !== undefined ? dto.tipo : oldTipo;

        const oldMonto = Number(currentMov.monto);
        const newMonto = dto.monto !== undefined ? Number(dto.monto) : oldMonto;

        const newFecha = dto.fecha !== undefined ? dto.fecha : currentMov.fecha;

        // 2. Manejo de saldos según si cambia de meta o permanece en la misma
        if (oldMetaId === newMetaId) {
            // Mismo id_meta: Bloquear la meta
            const [metaRows]: any = await connection.query(
                'SELECT id, nombre, CAST(saldo AS DOUBLE) AS saldo FROM meta_ahorro WHERE id = ? FOR UPDATE',
                [oldMetaId]
            );

            if (!metaRows || metaRows.length === 0) {
                throw new Error('La meta asociada al movimiento no existe.');
            }

            const meta = metaRows[0];
            const saldoActual = Number(meta.saldo || 0);

            // Revertir efecto anterior
            const saldoSinMovimiento = oldTipo === 'INGRESO'
                ? saldoActual - oldMonto
                : saldoActual + oldMonto;

            // Aplicar nuevo efecto
            const nuevoSaldoFinal = newTipo === 'INGRESO'
                ? saldoSinMovimiento + newMonto
                : saldoSinMovimiento - newMonto;

            const nuevoSaldoRedondeado = Number(nuevoSaldoFinal.toFixed(2));

            if (nuevoSaldoRedondeado < 0) {
                throw new Error(
                    `La modificación no puede completarse porque dejaría el saldo de la meta "${meta.nombre}" en negativo (${formatCurrency(nuevoSaldoRedondeado)}).`
                );
            }

            // Actualizar saldo de la meta
            await connection.query(
                'UPDATE meta_ahorro SET saldo = ? WHERE id = ?',
                [nuevoSaldoRedondeado, oldMetaId]
            );
        } else {
            // Cambio de meta: Bloquear ambas metas en orden determinista de ID para evitar deadlocks
            const idsOrdenados = [oldMetaId, newMetaId].sort((a, b) => a - b);
            const [metasRows]: any = await connection.query(
                'SELECT id, nombre, CAST(saldo AS DOUBLE) AS saldo FROM meta_ahorro WHERE id IN (?, ?) ORDER BY id FOR UPDATE',
                idsOrdenados
            );

            const oldMeta = metasRows.find((m: any) => m.id === oldMetaId);
            const newMeta = metasRows.find((m: any) => m.id === newMetaId);

            if (!oldMeta) throw new Error('La meta original no existe.');
            if (!newMeta) throw new Error('La nueva meta de destino seleccionada no existe.');

            // Revertir en meta anterior
            const oldMetaSaldo = Number(oldMeta.saldo || 0);
            const oldMetaNuevoSaldo = Number(
                (oldTipo === 'INGRESO' ? oldMetaSaldo - oldMonto : oldMetaSaldo + oldMonto).toFixed(2)
            );

            if (oldMetaNuevoSaldo < 0) {
                throw new Error(
                    `No se puede transferir el movimiento porque dejaría a la meta original "${oldMeta.nombre}" con saldo negativo (${formatCurrency(oldMetaNuevoSaldo)}).`
                );
            }

            // Aplicar en nueva meta
            const newMetaSaldo = Number(newMeta.saldo || 0);
            const newMetaNuevoSaldo = Number(
                (newTipo === 'INGRESO' ? newMetaSaldo + newMonto : newMetaSaldo - newMonto).toFixed(2)
            );

            if (newMetaNuevoSaldo < 0) {
                throw new Error(
                    `No se puede transferir el egreso a la meta "${newMeta.nombre}" porque su saldo disponible es de ${formatCurrency(newMetaSaldo)}.`
                );
            }

            // Actualizar saldos de ambas metas
            await connection.query(
                'UPDATE meta_ahorro SET saldo = ? WHERE id = ?',
                [oldMetaNuevoSaldo, oldMetaId]
            );
            await connection.query(
                'UPDATE meta_ahorro SET saldo = ? WHERE id = ?',
                [newMetaNuevoSaldo, newMetaId]
            );
        }

        // 3. Actualizar registro de movimiento
        await connection.query(
            'UPDATE movimiento SET monto = ?, tipo = ?, fecha = ?, id_meta = ? WHERE id = ?',
            [newMonto, newTipo, newFecha, newMetaId, id]
        );

        await connection.commit();

        return getById(id);
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

// Eliminar movimiento dentro de una transacción SQL con reversión de saldo
export async function remove(id: number): Promise<boolean> {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Obtener y bloquear el movimiento
        const [movRows]: any = await connection.query(
            'SELECT * FROM movimiento WHERE id = ? FOR UPDATE',
            [id]
        );

        if (!movRows || movRows.length === 0) {
            await connection.rollback();
            return false;
        }

        const currentMov = movRows[0];
        const metaId = Number(currentMov.id_meta);
        const tipo = currentMov.tipo as 'INGRESO' | 'EGRESO';
        const monto = Number(currentMov.monto);

        // 2. Obtener y bloquear la meta
        const [metaRows]: any = await connection.query(
            'SELECT id, nombre, CAST(saldo AS DOUBLE) AS saldo FROM meta_ahorro WHERE id = ? FOR UPDATE',
            [metaId]
        );

        if (metaRows && metaRows.length > 0) {
            const meta = metaRows[0];
            const saldoActual = Number(meta.saldo || 0);

            // Revertir efecto del movimiento sobre el saldo
            const nuevoSaldo = Number(
                (tipo === 'INGRESO' ? saldoActual - monto : saldoActual + monto).toFixed(2)
            );

            if (nuevoSaldo < 0) {
                throw new Error(
                    `No se puede eliminar este ingreso porque dejaría a la meta "${meta.nombre}" con saldo negativo (${formatCurrency(nuevoSaldo)}).`
                );
            }

            await connection.query(
                'UPDATE meta_ahorro SET saldo = ? WHERE id = ?',
                [nuevoSaldo, metaId]
            );
        }

        // 3. Eliminar el movimiento
        const [deleteResult]: any = await connection.query(
            'DELETE FROM movimiento WHERE id = ?',
            [id]
        );

        await connection.commit();
        return deleteResult.affectedRows > 0;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}
