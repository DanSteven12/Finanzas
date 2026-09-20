// backend/src/types/movimientos.types.ts

export type TipoMovimiento = 'INGRESO' | 'EGRESO';

export interface Movimiento {
    id: number;
    monto: number;
    tipo: TipoMovimiento;
    fecha: string;
    id_meta: number;
    created_at: string;
    saldo_resultante?: number;
}

export interface MovimientoConDetalle extends Movimiento {
    nombre_meta: string;
    monto_meta?: number;
    saldo_meta?: number;
    saldo_resultante?: number;
}

export interface CreateMovimientoDto {
    monto: number;
    tipo: TipoMovimiento;
    fecha: string;
    id_meta: number;
}

export interface UpdateMovimientoDto {
    monto?: number;
    tipo?: TipoMovimiento;
    fecha?: string;
    id_meta?: number;
}

export interface MovimientoFilters {
    id_meta?: number;
    tipo?: TipoMovimiento;
    fecha_inicio?: string;
    fecha_fin?: string;
    search?: string;
}

export interface MovimientosSummaryDto {
    total_ingresos: number;
    total_egresos: number;
    balance: number;
    total_movimientos: number;
}
