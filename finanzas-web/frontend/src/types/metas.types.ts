// frontend/src/types/metas.types.ts

export type EstadoMeta = 'no_iniciada' | 'en_progreso' | 'completada';

export interface MetaAhorro {
    id: number;
    nombre: string;
    monto_meta: number;
    saldo: number;
    faltante: number;
    porcentaje: number;
    estado: EstadoMeta;
    cantidad_movimientos?: number;
    created_at?: string;
    updated_at?: string;
}

export interface CreateMetaDto {
    nombre: string;
    monto_meta: number;
}

export interface UpdateMetaDto {
    nombre?: string;
    monto_meta?: number;
}

export interface MetasSummary {
    total_metas: number;
    total_monto_meta: number;
    total_saldo: number;
    total_faltante: number;
    metas_completadas: number;
}
