// frontend/src/types/limites.types.ts

export type EstadoLimite = 'dentro' | 'cerca' | 'alcanzado' | 'excedido';

export interface Limite {
    id: number;
    monto: number;
    mes: string; // 'YYYY-MM-01'
    id_cat: number;
    categoria_nombre?: string;
    gasto_acumulado: number;
    disponible: number;
    porcentaje: number;
    estado: EstadoLimite;
    excedente: number;
    created_at?: string;
    updated_at?: string;
}

export interface CreateLimiteDto {
    monto: number;
    mes: string; // 'YYYY-MM' o 'YYYY-MM-DD'
    id_cat: number;
}

export interface UpdateLimiteDto {
    monto?: number;
    mes?: string;
    id_cat?: number;
}

export interface LimiteFilters {
    id_cat?: number | '';
    mes?: string; // 'YYYY-MM'
    year?: string | number;
}

export interface LimitesSummary {
    total_limites: number;
    total_presupuestado: number;
    total_gastado: number;
    total_disponible: number;
    limites_excedidos: number;
}
