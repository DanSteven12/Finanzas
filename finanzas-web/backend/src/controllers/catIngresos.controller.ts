// backend/src/controllers/catIngresos.controller.ts
import { Request, Response } from 'express';
import * as CatIngresosService from '../services/catIngresos.service';

// GET /api/cat-ingresos
export async function getAll(req: Request, res: Response): Promise<void> {
    try {
        const categorias = await CatIngresosService.getAll();
        res.json(categorias);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al obtener las categorías de ingresos' });
    }
}

// GET /api/cat-ingresos/:id
export async function getById(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            res.status(400).json({ error: 'ID de categoría inválido' });
            return;
        }
        const categoria = await CatIngresosService.getById(id);
        if (!categoria) {
            res.status(404).json({ error: 'Categoría no encontrada' });
            return;
        }
        res.json(categoria);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al obtener la categoría' });
    }
}

// POST /api/cat-ingresos
export async function create(req: Request, res: Response): Promise<void> {
    try {
        const { nombre } = req.body;
        if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
            res.status(400).json({ error: 'El campo "nombre" es obligatorio y no puede estar vacío' });
            return;
        }

        const trimmed = nombre.trim();

        // Validar si ya existe una categoría con ese nombre
        const existente = await CatIngresosService.getByNombre(trimmed);
        if (existente) {
            res.status(409).json({ error: `Ya existe una categoría llamada "${trimmed}"` });
            return;
        }

        const nueva = await CatIngresosService.create({ nombre: trimmed });
        res.status(201).json(nueva);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al crear la categoría de ingreso' });
    }
}

// PUT /api/cat-ingresos/:id
export async function update(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            res.status(400).json({ error: 'ID de categoría inválido' });
            return;
        }

        const { nombre } = req.body;
        if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
            res.status(400).json({ error: 'El campo "nombre" es obligatorio y no puede estar vacío' });
            return;
        }

        const trimmed = nombre.trim();

        // Validar que la categoría exista
        const actual = await CatIngresosService.getById(id);
        if (!actual) {
            res.status(404).json({ error: 'La categoría que intentas editar no existe' });
            return;
        }

        // Validar que no duplique otra categoría
        const duplicado = await CatIngresosService.getByNombre(trimmed, id);
        if (duplicado) {
            res.status(409).json({ error: `Ya existe otra categoría llamada "${trimmed}"` });
            return;
        }

        const actualizado = await CatIngresosService.update(id, { nombre: trimmed });
        if (!actualizado) {
            res.status(404).json({ error: 'No se pudo actualizar la categoría' });
            return;
        }

        res.json({ message: 'Categoría actualizada correctamente', id, nombre: trimmed });
    } catch (err: any) {
        res.status(500).json({ error: 'Error al actualizar la categoría de ingreso' });
    }
}

// DELETE /api/cat-ingresos/:id
export async function remove(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            res.status(400).json({ error: 'ID de categoría inválido' });
            return;
        }

        const actual = await CatIngresosService.getById(id);
        if (!actual) {
            res.status(404).json({ error: 'La categoría no existe' });
            return;
        }

        // Verificar si tiene ingresos relacionados
        const count = await CatIngresosService.countIngresosByCat(id);
        if (count > 0) {
            res.status(409).json({
                error: `No se puede eliminar la categoría "${actual.nombre}" porque está siendo utilizada en ${count} ingreso(s). Primero debes reasignar o eliminar esos ingresos.`,
                ingresosCount: count,
            });
            return;
        }

        const eliminado = await CatIngresosService.remove(id);
        if (!eliminado) {
            res.status(404).json({ error: 'Categoría no encontrada' });
            return;
        }

        res.json({ message: 'Categoría eliminada correctamente' });
    } catch (err: any) {
        res.status(500).json({ error: 'Error al eliminar la categoría de ingreso' });
    }
}
