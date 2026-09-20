// frontend/src/types/movimientos.types.ts

export type TipoMovimiento = 'INGRESO' | 'EGRESO';

export interface Movimiento {
  id: number;
  monto: number;
  tipo: TipoMovimiento;
  fecha: string;
  id_meta: number;
  nombre_meta: string;
  monto_meta?: number;
  saldo_meta?: number;
  saldo_resultante?: number;
  created_at: string;
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
  id_meta?: number | string;
  tipo?: TipoMovimiento | '';
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
