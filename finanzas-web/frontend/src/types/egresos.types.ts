// frontend/src/types/egresos.types.ts

export interface Egreso {
    id: number;
    monto: number;
    concepto: string;
    fecha: string;
    id_cat: number;
    categoria_nombre?: string;
    created_at?: string;
    updated_at?: string;
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

export interface EgresoFilters {
    fecha_inicio?: string;
    fecha_fin?: string;
    id_cat?: number | '';
    search?: string;
}

export interface EgresosSummary {
    total_registros: number;
    total_monto: number;
}
