// backend/src/types/catEgresos.types.ts

export interface CatEgreso {
    id: number;
    nombre: string;
}

export interface CreateCatEgresoDto {
    nombre: string;
}

export interface UpdateCatEgresoDto {
    nombre: string;
}
