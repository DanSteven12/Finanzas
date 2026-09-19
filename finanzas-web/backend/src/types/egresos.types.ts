// backend/src/types/egresos.types.ts

export interface Egreso {
    id: number;
    monto: number;
    concepto: string;
    fecha: string | Date;
    id_cat: number;
    created_at?: string | Date;
    updated_at?: string | Date;
}

export interface EgresoConCategoria extends Egreso {
    categoria_nombre?: string;
}

export interface CreateEgresoDto {
    monto: number;
    concepto: string;
    fecha: string;
    id_cat: number;
}

export interface UpdateEgresoDto {
    monto?: number;
    concepto?: string;
    fecha?: string;
    id_cat?: number;
}

export interface EgresoFiltersDto {
    fecha_inicio?: string;
    fecha_fin?: string;
    id_cat?: number;
    search?: string;
}

export interface EgresosSummaryDto {
    total_registros: number;
    total_monto: number;
}
