// frontend/src/types/ingresos.types.ts

export interface Ingreso {
    id: number;
    monto: number;
    concepto: string;
    fecha: string;
    id_cat: number;
    categoria_nombre?: string;
    created_at?: string;
    updated_at?: string;
}

export interface CreateIngresoDto {
    monto: number;
    concepto: string;
    fecha: string;
    id_cat: number;
}

export interface UpdateIngresoDto {
    monto?: number;
    concepto?: string;
    fecha?: string;
    id_cat?: number;
}

export interface IngresoFilters {
    fecha_inicio?: string;
    fecha_fin?: string;
    id_cat?: number | '';
    search?: string;
}

export interface IngresosSummary {
    total_registros: number;
    total_monto: number;
}
