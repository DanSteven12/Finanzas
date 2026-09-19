// frontend/src/types/catIngresos.types.ts

export interface CatIngreso {
    id: number;
    nombre: string;
    cantidad_ingresos?: number;
    total_ingresado?: number;
}

export interface CreateCatIngresoDto {
    nombre: string;
}

export interface UpdateCatIngresoDto {
    nombre: string;
}
