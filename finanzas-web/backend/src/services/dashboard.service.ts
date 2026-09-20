// backend/src/services/dashboard.service.ts
import { query } from '../bd';
import {
    DashboardDataDto,
    DashboardResumenDto,
    DashboardMesHistoricoDto,
    DashboardGastoCategoriaDto,
    DashboardLimiteDto,
    DashboardMetaDto,
    DashboardActividadRecienteDto,
} from '../types/dashboard.types';
import { EstadoLimite } from '../types/limites.types';
import { EstadoMeta } from '../types/metas.types';

// Normalizar formato de mes al primer día: "YYYY-MM-01"
export function normalizeMonthToDate(mesInput?: string): string {
    if (!mesInput || typeof mesInput !== 'string' || mesInput.trim() === '') {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}-01`;
    }
    const trimmed = mesInput.trim();

    // Formato YYYY-MM
    const matchYm = trimmed.match(/^(\d{4})-(\d{1,2})$/);
    if (matchYm) {
        const y = matchYm[1];
        const m = matchYm[2].padStart(2, '0');
        return `${y}-${m}-01`;
    }

    // Formato YYYY-MM-DD
    const matchFull = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (matchFull) {
        const y = matchFull[1];
        const m = matchFull[2].padStart(2, '0');
        return `${y}-${m}-01`;
    }

    const d = new Date(trimmed);
    if (isNaN(d.getTime())) {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    }
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

// Obtener nombre amigable de mes (ej. "Septiembre 2026")
function getMonthName(dateStr: string): string {
    const [year, month] = dateStr.split('-');
    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const mIdx = Number(month) - 1;
    return `${monthNames[mIdx] || ''} ${year}`;
}

// Obtener abreviatura de mes (ej. "Sep")
function getShortMonthName(monthNum: number): string {
    const shortNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return shortNames[monthNum - 1] || '';
}

// Paleta de colores para el gráfico de dona
const CATEGORY_COLORS = [
    '#093539', // Dark teal principal
    '#f43f5e', // Coral red
    '#f59e0b', // Amber / Orange
    '#475569', // Slate
    '#10b981', // Emerald
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#8b5cf6', // Purple
    '#14b8a6', // Teal light
    '#84cc16', // Lime
];

export async function getDashboardData(mesParam?: string): Promise<DashboardDataDto> {
    const mesDate = normalizeMonthToDate(mesParam);
    const mesNombre = getMonthName(mesDate);

    const [curYear, curMonth] = mesDate.split('-').map(Number);
    const startOfMonth = `${mesDate} 00:00:00`;
    
    // Fin de mes
    const lastDayOfMonth = new Date(curYear, curMonth, 0).getDate();
    const endOfMonth = `${curYear}-${String(curMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')} 23:59:59`;

    // Mes anterior
    const prevDateObj = new Date(curYear, curMonth - 2, 1);
    const prevYear = prevDateObj.getFullYear();
    const prevMonth = prevDateObj.getMonth() + 1;
    const prevMesDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
    const startOfPrevMonth = `${prevMesDate} 00:00:00`;
    const lastDayOfPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
    const endOfPrevMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(lastDayOfPrevMonth).padStart(2, '0')} 23:59:59`;

    // ── 1. Totales de Ingresos y Egresos (Mes actual y mes anterior) ──
    const ingresosRows: any[] = await query(
        'SELECT COALESCE(SUM(monto), 0) AS total FROM ingresos WHERE fecha >= ? AND fecha <= ?',
        [startOfMonth, endOfMonth]
    );
    const egresosRows: any[] = await query(
        'SELECT COALESCE(SUM(monto), 0) AS total FROM egresos WHERE fecha >= ? AND fecha <= ?',
        [startOfMonth, endOfMonth]
    );

    const prevIngresosRows: any[] = await query(
        'SELECT COALESCE(SUM(monto), 0) AS total FROM ingresos WHERE fecha >= ? AND fecha <= ?',
        [startOfPrevMonth, endOfPrevMonth]
    );
    const prevEgresosRows: any[] = await query(
        'SELECT COALESCE(SUM(monto), 0) AS total FROM egresos WHERE fecha >= ? AND fecha <= ?',
        [startOfPrevMonth, endOfPrevMonth]
    );

    const totalIngresos = Number(Number(ingresosRows[0]?.total || 0).toFixed(2));
    const totalEgresos = Number(Number(egresosRows[0]?.total || 0).toFixed(2));
    const balance = Number((totalIngresos - totalEgresos).toFixed(2));

    const prevIngresos = Number(prevIngresosRows[0]?.total || 0);
    const prevEgresos = Number(prevEgresosRows[0]?.total || 0);

    let ingresosPctCambio: number | null = null;
    if (prevIngresos > 0) {
        ingresosPctCambio = Number((((totalIngresos - prevIngresos) / prevIngresos) * 100).toFixed(1));
    }

    let egresosPctCambio: number | null = null;
    if (prevEgresos > 0) {
        egresosPctCambio = Number((((totalEgresos - prevEgresos) / prevEgresos) * 100).toFixed(1));
    }

    // ── 2. Metas de ahorro y Ahorro Acumulado ──────────
    const metasRows: any[] = await query(`
        SELECT 
            id,
            nombre,
            CAST(monto_meta AS DOUBLE) AS monto_meta,
            CAST(saldo AS DOUBLE) AS saldo,
            created_at,
            updated_at
        FROM meta_ahorro
        ORDER BY created_at DESC, id DESC
    `);

    let ahorroAcumulado = 0;
    const metasDto: DashboardMetaDto[] = metasRows.map((m) => {
        const monto_meta = Number(m.monto_meta);
        const saldo = Number(m.saldo || 0);
        ahorroAcumulado += saldo;

        const faltante = Math.max(0, Number((monto_meta - saldo).toFixed(2)));
        const porcentaje = monto_meta > 0 ? Number(((saldo / monto_meta) * 100).toFixed(1)) : 0;

        let estado: EstadoMeta = 'no_iniciada';
        if (saldo >= monto_meta && monto_meta > 0) {
            estado = 'completada';
        } else if (saldo > 0) {
            estado = 'en_progreso';
        }

        const dateObj = new Date(m.created_at);
        const fechaDisplay = isNaN(dateObj.getTime())
            ? '15 dic 2026'
            : dateObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

        return {
            id: Number(m.id),
            nombre: m.nombre,
            monto_meta,
            saldo,
            porcentaje,
            faltante,
            estado,
            fecha_display: fechaDisplay,
        };
    });

    const resumen: DashboardResumenDto = {
        total_ingresos: totalIngresos,
        total_egresos: totalEgresos,
        balance,
        ahorro_acumulado: Number(ahorroAcumulado.toFixed(2)),
        metas_activas: metasDto.length,
        ingresos_pct_cambio: ingresosPctCambio,
        egresos_pct_cambio: egresosPctCambio,
        balance_estado: balance >= 0 ? 'Saludable' : 'En déficit',
    };

    // ── 3. Histórico Mensual (Últimos 5 meses hasta el mes seleccionado) ──
    const historicoMeses: { mes: string; mes_key: string; startDate: string; endDate: string }[] = [];
    for (let i = 4; i >= 0; i--) {
        const targetD = new Date(curYear, curMonth - 1 - i, 1);
        const y = targetD.getFullYear();
        const m = targetD.getMonth() + 1;
        const key = `${y}-${String(m).padStart(2, '0')}`;
        const lastDay = new Date(y, m, 0).getDate();
        historicoMeses.push({
            mes: getShortMonthName(m),
            mes_key: key,
            startDate: `${key}-01 00:00:00`,
            endDate: `${key}-${String(lastDay).padStart(2, '0')} 23:59:59`,
        });
    }

    const minHistStart = historicoMeses[0].startDate;
    const maxHistEnd = historicoMeses[historicoMeses.length - 1].endDate;

    const histIngresosRows: any[] = await query(`
        SELECT DATE_FORMAT(fecha, '%Y-%m') AS mes_key, COALESCE(SUM(monto), 0) AS total
        FROM ingresos
        WHERE fecha >= ? AND fecha <= ?
        GROUP BY DATE_FORMAT(fecha, '%Y-%m')
    `, [minHistStart, maxHistEnd]);

    const histEgresosRows: any[] = await query(`
        SELECT DATE_FORMAT(fecha, '%Y-%m') AS mes_key, COALESCE(SUM(monto), 0) AS total
        FROM egresos
        WHERE fecha >= ? AND fecha <= ?
        GROUP BY DATE_FORMAT(fecha, '%Y-%m')
    `, [minHistStart, maxHistEnd]);

    const histIngresosMap = new Map<string, number>();
    histIngresosRows.forEach((r) => histIngresosMap.set(r.mes_key, Number(r.total)));

    const histEgresosMap = new Map<string, number>();
    histEgresosRows.forEach((r) => histEgresosMap.set(r.mes_key, Number(r.total)));

    const historico_mensual: DashboardMesHistoricoDto[] = historicoMeses.map((h) => ({
        mes: h.mes,
        mes_key: h.mes_key,
        ingresos: Number((histIngresosMap.get(h.mes_key) || 0).toFixed(2)),
        egresos: Number((histEgresosMap.get(h.mes_key) || 0).toFixed(2)),
    }));

    // ── 4. Gastos por Categoría (Mes seleccionado) ────
    const gastosCatRows: any[] = await query(`
        SELECT 
            ce.id,
            ce.nombre AS categoria,
            CAST(COALESCE(SUM(e.monto), 0) AS DOUBLE) AS total
        FROM cat_egresos ce
        INNER JOIN egresos e ON e.id_cat = ce.id AND e.fecha >= ? AND e.fecha <= ?
        GROUP BY ce.id, ce.nombre
        HAVING total > 0
        ORDER BY total DESC
    `, [startOfMonth, endOfMonth]);

    const gastos_por_categoria: DashboardGastoCategoriaDto[] = gastosCatRows.map((g, idx) => {
        const total = Number(g.total);
        const porcentaje = totalEgresos > 0 ? Number(((total / totalEgresos) * 100).toFixed(1)) : 0;
        return {
            id: Number(g.id),
            categoria: g.categoria,
            total,
            porcentaje,
            color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        };
    });

    // ── 5. Límites / Presupuestos del mes ─────────────
    const limitesRows: any[] = await query(`
        SELECT 
            l.id,
            CAST(l.monto AS DOUBLE) AS monto,
            DATE_FORMAT(l.mes, '%Y-%m-%d') AS mes,
            l.id_cat,
            ce.nombre AS categoria_nombre,
            CAST(COALESCE(SUM(e.monto), 0) AS DOUBLE) AS gasto_acumulado
        FROM limite l
        INNER JOIN cat_egresos ce ON l.id_cat = ce.id
        LEFT JOIN egresos e ON e.id_cat = l.id_cat 
            AND e.fecha >= l.mes 
            AND e.fecha <= CONCAT(LAST_DAY(l.mes), ' 23:59:59')
        WHERE l.mes = ?
        GROUP BY l.id, l.monto, l.mes, l.id_cat, ce.nombre
        ORDER BY (gasto_acumulado / l.monto) DESC, l.id ASC
    `, [mesDate]);

    const limites: DashboardLimiteDto[] = limitesRows.map((l) => {
        const monto_limite = Number(l.monto);
        const gastado = Number(l.gasto_acumulado || 0);
        const disponible = Number((monto_limite - gastado).toFixed(2));
        const porcentaje = monto_limite > 0 ? Number(((gastado / monto_limite) * 100).toFixed(1)) : 0;

        let estado: EstadoLimite = 'dentro';
        let badge_texto = `${porcentaje}% · Normal`;

        if (gastado > monto_limite) {
            estado = 'excedido';
            badge_texto = `${porcentaje}% · Presupuesto excedido`;
        } else if (gastado === monto_limite && monto_limite > 0) {
            estado = 'alcanzado';
            badge_texto = `100% · Límite alcanzado`;
        } else if (porcentaje >= 80) {
            estado = 'cerca';
            badge_texto = `${porcentaje}% · Cerca del límite`;
        }

        return {
            id: Number(l.id),
            id_cat: Number(l.id_cat),
            categoria_nombre: l.categoria_nombre,
            monto_limite,
            gastado,
            disponible,
            porcentaje,
            estado,
            badge_texto,
        };
    });

    // ── 6. Últimos Movimientos (Actividad reciente combinada) ──
    const recentEgresos: any[] = await query(`
        SELECT 
            e.id,
            e.concepto,
            CAST(e.monto AS DOUBLE) AS monto,
            e.fecha,
            ce.nombre AS categoria
        FROM egresos e
        INNER JOIN cat_egresos ce ON e.id_cat = ce.id
        ORDER BY e.fecha DESC, e.id DESC
        LIMIT 6
    `);

    const recentIngresos: any[] = await query(`
        SELECT 
            i.id,
            i.concepto,
            CAST(i.monto AS DOUBLE) AS monto,
            i.fecha,
            ci.nombre AS categoria
        FROM ingresos i
        INNER JOIN cat_ingresos ci ON i.id_cat = ci.id
        ORDER BY i.fecha DESC, i.id DESC
        LIMIT 6
    `);

    const recentMovimientosMetas: any[] = await query(`
        SELECT 
            mov.id,
            CONCAT(CASE WHEN mov.tipo = 'INGRESO' THEN 'Aporte a ' ELSE 'Retiro de ' END, m.nombre) AS concepto,
            CAST(mov.monto AS DOUBLE) AS monto,
            mov.fecha,
            mov.tipo,
            'Ahorro' AS categoria
        FROM movimiento mov
        INNER JOIN meta_ahorro m ON m.id = mov.id_meta
        ORDER BY mov.fecha DESC, mov.id DESC
        LIMIT 6
    `);

    const combinedList: DashboardActividadRecienteDto[] = [];

    recentEgresos.forEach((e) => {
        combinedList.push({
            id: `egreso-${e.id}`,
            concepto: e.concepto,
            categoria: e.categoria,
            fecha: e.fecha,
            monto: Number(e.monto),
            tipo: 'EGRESO',
            origen: 'egreso',
        });
    });

    recentIngresos.forEach((i) => {
        combinedList.push({
            id: `ingreso-${i.id}`,
            concepto: i.concepto,
            categoria: i.categoria,
            fecha: i.fecha,
            monto: Number(i.monto),
            tipo: 'INGRESO',
            origen: 'ingreso',
        });
    });

    recentMovimientosMetas.forEach((mv) => {
        combinedList.push({
            id: `mov-${mv.id}`,
            concepto: mv.concepto,
            categoria: mv.categoria,
            fecha: mv.fecha,
            monto: Number(mv.monto),
            tipo: mv.tipo as 'INGRESO' | 'EGRESO',
            origen: 'movimiento',
        });
    });

    // Ordenar cronológicamente descendente
    combinedList.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    const ultimos_movimientos = combinedList.slice(0, 8);

    return {
        mes_seleccionado: mesDate,
        mes_nombre: mesNombre,
        resumen,
        historico_mensual,
        gastos_por_categoria,
        limites,
        metas: metasDto.slice(0, 4),
        ultimos_movimientos,
    };
}
