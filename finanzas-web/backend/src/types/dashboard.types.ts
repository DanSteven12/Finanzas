// backend/src/types/dashboard.types.ts
import { EstadoLimite } from './limites.types';
import { EstadoMeta } from './metas.types';

export interface DashboardResumenDto {
    total_ingresos: number;
    total_egresos: number;
    balance: number;
    ahorro_acumulado: number;
    metas_activas: number;
    ingresos_pct_cambio: number | null; // e.g. 12.4
    egresos_pct_cambio: number | null;  // e.g. 3.1
    balance_estado: string;             // e.g. "Saludable" | "En déficit"
}

export interface DashboardMesHistoricoDto {
    mes: string;        // e.g. "Jun", "Jul", "Ago", "Sep", "Oct"
    mes_key: string;    // e.g. "2026-06", "2026-07"
    ingresos: number;
    egresos: number;
}

export interface DashboardGastoCategoriaDto {
    id: number;
    categoria: string;
    total: number;
    porcentaje: number;
    color: string;
}

export interface DashboardLimiteDto {
    id: number;
    id_cat: number;
    categoria_nombre: string;
    monto_limite: number;
    gastado: number;
    disponible: number;
    porcentaje: number;
    estado: EstadoLimite;
    badge_texto: string; // e.g. "70% · Normal", "88% · Cerca del límite", "110% · Presupuesto excedido"
}

export interface DashboardMetaDto {
    id: number;
    nombre: string;
    monto_meta: number;
    saldo: number;
    porcentaje: number;
    faltante: number;
    estado: EstadoMeta;
    fecha_display: string; // e.g. "15 dic 2026"
}

export interface DashboardActividadRecienteDto {
    id: string; // unique identifier (e.g. "egreso-1", "ingreso-2", "mov-3")
    concepto: string;
    categoria: string;
    fecha: string;
    monto: number;
    tipo: 'INGRESO' | 'EGRESO';
    origen: 'egreso' | 'ingreso' | 'movimiento';
}

export interface DashboardDataDto {
    mes_seleccionado: string; // e.g. "2026-09-01"
    mes_nombre: string;       // e.g. "Septiembre 2026"
    resumen: DashboardResumenDto;
    historico_mensual: DashboardMesHistoricoDto[];
    gastos_por_categoria: DashboardGastoCategoriaDto[];
    limites: DashboardLimiteDto[];
    metas: DashboardMetaDto[];
    ultimos_movimientos: DashboardActividadRecienteDto[];
}
