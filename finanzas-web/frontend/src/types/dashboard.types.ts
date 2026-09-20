// frontend/src/types/dashboard.types.ts
import type { EstadoLimite } from './limites.types';
import type { EstadoMeta } from './metas.types';

export interface DashboardResumenDto {
  total_ingresos: number;
  total_egresos: number;
  balance: number;
  ahorro_acumulado: number;
  metas_activas: number;
  ingresos_pct_cambio: number | null; // e.g. 12.4
  egresos_pct_cambio: number | null;  // e.g. 3.1
  balance_estado: string;             // e.g. "Saludable"
}

export interface DashboardMesHistoricoDto {
  mes: string;        // e.g. "Jun", "Jul", "Ago", "Sep", "Oct"
  mes_key: string;    // e.g. "2026-06"
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
  badge_texto: string;
}

export interface DashboardMetaDto {
  id: number;
  nombre: string;
  monto_meta: number;
  saldo: number;
  porcentaje: number;
  faltante: number;
  estado: EstadoMeta;
  fecha_display: string;
}

export interface DashboardActividadRecienteDto {
  id: string;
  concepto: string;
  categoria: string;
  fecha: string;
  monto: number;
  tipo: 'INGRESO' | 'EGRESO';
  origen: 'egreso' | 'ingreso' | 'movimiento';
}

export interface DashboardDataDto {
  mes_seleccionado: string;
  mes_nombre: string;
  resumen: DashboardResumenDto;
  historico_mensual: DashboardMesHistoricoDto[];
  gastos_por_categoria: DashboardGastoCategoriaDto[];
  limites: DashboardLimiteDto[];
  metas: DashboardMetaDto[];
  ultimos_movimientos: DashboardActividadRecienteDto[];
}
