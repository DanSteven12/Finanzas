// backend/src/services/limites.service.ts
import { query } from '../bd';
import {
    LimiteConDetalle,
    CreateLimiteDto,
    UpdateLimiteDto,
    LimiteFiltersDto,
    LimitesSummaryDto,
    EstadoLimite,
} from '../types/limites.types';

// Normalizar cualquier representación de mes/fecha al primer día del mes (YYYY-MM-01)
export function normalizeMonthToDate(mesInput: string): string {
    if (!mesInput || typeof mesInput !== 'string') {
        throw new Error('Fecha de mes inválida');
    }
    const trimmed = mesInput.trim();
    
    // Formato YYYY-MM
    const yyyyMmRegex = /^(\d{4})-(\d{1,2})$/;
    const matchYm = trimmed.match(yyyyMmRegex);
    if (matchYm) {
        const y = matchYm[1];
        const m = matchYm[2].padStart(2, '0');
        return `${y}-${m}-01`;
    }

    // Formato YYYY-MM-DD
    const fullDateRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})/;
    const matchFull = trimmed.match(fullDateRegex);
    if (matchFull) {
        const y = matchFull[1];
        const m = matchFull[2].padStart(2, '0');
        return `${y}-${m}-01`;
    }

    // Fallback a objeto Date
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) {
        throw new Error('Fecha de mes inválida');
    }
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
}

// Mapear fila SQL a estructura LimiteConDetalle con cálculos dinámicos
function mapRowToLimiteConDetalle(r: any): LimiteConDetalle {
    const monto = Number(r.monto);
    const gasto_acumulado = Number(r.gasto_acumulado || 0);
    const disponible = Number((monto - gasto_acumulado).toFixed(2));
    const porcentaje = monto > 0 ? Number(((gasto_acumulado / monto) * 100).toFixed(2)) : 0;

    let estado: EstadoLimite = 'dentro';
    if (gasto_acumulado > monto) {
        estado = 'excedido';
    } else if (gasto_acumulado === monto && monto > 0) {
        estado = 'alcanzado';
    } else if (porcentaje >= 80) {
        estado = 'cerca';
    } else {
        estado = 'dentro';
    }

    const excedente = gasto_acumulado > monto ? Number((gasto_acumulado - monto).toFixed(2)) : 0;

    return {
        id: Number(r.id),
        monto,
        mes: r.mes,
        id_cat: Number(r.id_cat),
        categoria_nombre: r.categoria_nombre,
        gasto_acumulado,
        disponible,
        porcentaje,
        estado,
        excedente,
        created_at: r.created_at,
        updated_at: r.updated_at,
    };
}

// Base SQL query para obtener límites con su detalle de gastos acumulados
function getBaseSelectSql(): string {
    return `
        SELECT 
            l.id,
            CAST(l.monto AS DOUBLE) AS monto,
            DATE_FORMAT(l.mes, '%Y-%m-%d') AS mes,
            l.id_cat,
            ce.nombre AS categoria_nombre,
            COALESCE(SUM(e.monto), 0) AS gasto_acumulado,
            l.created_at,
            l.updated_at
        FROM limite l
        INNER JOIN cat_egresos ce ON l.id_cat = ce.id
        LEFT JOIN egresos e ON e.id_cat = l.id_cat 
            AND e.fecha >= l.mes 
            AND e.fecha <= CONCAT(LAST_DAY(l.mes), ' 23:59:59')
    `;
}

// Obtener todos los límites con filtros
export async function getAll(filters: LimiteFiltersDto = {}): Promise<LimiteConDetalle[]> {
    let sql = getBaseSelectSql();
    const conditions: string[] = [];
    const params: any[] = [];

    // Filtro por categoría
    if (filters.id_cat && !isNaN(Number(filters.id_cat))) {
        conditions.push('l.id_cat = ?');
        params.push(Number(filters.id_cat));
    }

    // Filtro por mes específico (normalizado a YYYY-MM-01)
    if (filters.mes && filters.mes.trim() !== '') {
        try {
            const normMes = normalizeMonthToDate(filters.mes);
            conditions.push('l.mes = ?');
            params.push(normMes);
        } catch {
            // Si el formato es inválido, no coincidira
        }
    }

    // Filtro por año
    if (filters.year && !isNaN(Number(filters.year))) {
        conditions.push('YEAR(l.mes) = ?');
        params.push(Number(filters.year));
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' GROUP BY l.id, l.monto, l.mes, l.id_cat, ce.nombre, l.created_at, l.updated_at';
    sql += ' ORDER BY l.mes DESC, ce.nombre ASC';

    const rows = await query(sql, params);
    return rows.map(mapRowToLimiteConDetalle);
}

// Obtener límite por ID
export async function getById(id: number): Promise<LimiteConDetalle | null> {
    let sql = getBaseSelectSql();
    sql += ' WHERE l.id = ?';
    sql += ' GROUP BY l.id, l.monto, l.mes, l.id_cat, ce.nombre, l.created_at, l.updated_at';

    const rows = await query(sql, [id]);
    if (!rows || rows.length === 0) return null;
    return mapRowToLimiteConDetalle(rows[0]);
}

// Buscar si ya existe un límite para una categoría y mes (para evitar duplicados)
export async function getByCatAndMonth(id_cat: number, mes: string, excludeId?: number): Promise<LimiteConDetalle | null> {
    const normMes = normalizeMonthToDate(mes);
    let sql = getBaseSelectSql();
    sql += ' WHERE l.id_cat = ? AND l.mes = ?';
    const params: any[] = [Number(id_cat), normMes];

    if (excludeId !== undefined) {
        sql += ' AND l.id != ?';
        params.push(excludeId);
    }

    sql += ' GROUP BY l.id, l.monto, l.mes, l.id_cat, ce.nombre, l.created_at, l.updated_at';

    const rows = await query(sql, params);
    if (!rows || rows.length === 0) return null;
    return mapRowToLimiteConDetalle(rows[0]);
}

// Crear un nuevo límite
export async function create(dto: CreateLimiteDto): Promise<LimiteConDetalle> {
    const normMes = normalizeMonthToDate(dto.mes);
    const sql = `
        INSERT INTO limite (monto, mes, id_cat)
        VALUES (?, ?, ?)
    `;
    const params = [
        Number(dto.monto),
        normMes,
        Number(dto.id_cat),
    ];

    const result: any = await query(sql, params);
    const nuevo = await getById(result.insertId);
    if (!nuevo) {
        throw new Error('Error al recuperar el límite recién creado');
    }
    return nuevo;
}

// Actualizar un límite existente
export async function update(id: number, dto: UpdateLimiteDto): Promise<LimiteConDetalle | null> {
    const fields: string[] = [];
    const params: any[] = [];

    if (dto.monto !== undefined) {
        fields.push('monto = ?');
        params.push(Number(dto.monto));
    }
    if (dto.mes !== undefined) {
        const normMes = normalizeMonthToDate(dto.mes);
        fields.push('mes = ?');
        params.push(normMes);
    }
    if (dto.id_cat !== undefined) {
        fields.push('id_cat = ?');
        params.push(Number(dto.id_cat));
    }

    if (fields.length === 0) {
        return getById(id);
    }

    params.push(id);
    const sql = `UPDATE limite SET ${fields.join(', ')} WHERE id = ?`;
    const result: any = await query(sql, params);

    if (result.affectedRows === 0) {
        return null;
    }

    return getById(id);
}

// Eliminar un límite (los egresos permanecen intactos)
export async function remove(id: number): Promise<boolean> {
    const result: any = await query('DELETE FROM limite WHERE id = ?', [id]);
    return result.affectedRows > 0;
}

// Obtener resumen / métricas de límites (con soporte a filtros)
export async function getSummary(filters: LimiteFiltersDto = {}): Promise<LimitesSummaryDto> {
    const limites = await getAll(filters);

    let total_presupuestado = 0;
    let total_gastado = 0;
    let limites_excedidos = 0;

    for (const l of limites) {
        total_presupuestado += l.monto;
        total_gastado += l.gasto_acumulado;
        if (l.gasto_acumulado > l.monto) {
            limites_excedidos += 1;
        }
    }

    const total_disponible = Number((total_presupuestado - total_gastado).toFixed(2));

    return {
        total_limites: limites.length,
        total_presupuestado: Number(total_presupuestado.toFixed(2)),
        total_gastado: Number(total_gastado.toFixed(2)),
        total_disponible,
        limites_excedidos,
    };
}
