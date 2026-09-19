// backend/src/types/ingresos.types.ts

export interface Ingreso {
    id: number;
    monto: number;
    concepto: string;
    fecha: string | Date;
    id_cat: number;
    created_at?: string | Date;
    updated_at?: string | Date;
}

export interface IngresoConCategoria extends Ingreso {
    categoria_nombre?: string;
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

export interface IngresoFiltersDto {
    fecha_inicio?: string;
    fecha_fin?: string;
    id_cat?: number;
    search?: string;
}
