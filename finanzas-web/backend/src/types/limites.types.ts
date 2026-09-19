// backend/src/types/limites.types.ts

export type EstadoLimite = 'dentro' | 'cerca' | 'alcanzado' | 'excedido';

export interface Limite {
    id: number;
    monto: number;
    mes: string; // 'YYYY-MM-01'
    id_cat: number;
    created_at: string;
    updated_at: string;
}

export interface LimiteConDetalle extends Limite {
    categoria_nombre: string;
    gasto_acumulado: number;
    disponible: number;
    porcentaje: number;
    estado: EstadoLimite;
    excedente: number;
}

export interface CreateLimiteDto {
    monto: number;
    mes: string; // e.g., '2026-09' or '2026-09-01'
    id_cat: number;
}

export interface UpdateLimiteDto {
    monto?: number;
    mes?: string;
    id_cat?: number;
}

export interface LimiteFiltersDto {
    id_cat?: number;
    mes?: string; // e.g., '2026-09' or '2026-09-01'
    year?: string | number;
}

export interface LimitesSummaryDto {
    total_limites: number;
    total_presupuestado: number;
    total_gastado: number;
    total_disponible: number;
    limites_excedidos: number;
}
