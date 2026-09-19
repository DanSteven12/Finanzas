// frontend/src/types/catEgresos.types.ts

export interface CatEgreso {
    id: number;
    nombre: string;
    cantidad_gastos?: number;
    total_gastado?: number;
}

export interface CreateCatEgresoDto {
    nombre: string;
}

export interface UpdateCatEgresoDto {
    nombre: string;
}
