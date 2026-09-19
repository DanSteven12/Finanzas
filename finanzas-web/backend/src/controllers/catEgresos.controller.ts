// backend/src/controllers/catEgresos.controller.ts
import { Request, Response } from 'express';
import * as CatEgresosService from '../services/catEgresos.service';

// GET /api/cat-egresos
export async function getAll(req: Request, res: Response): Promise<void> {
    try {
        const categorias = await CatEgresosService.getAll();
        res.json(categorias);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener categorías de egresos' });
    }
}

// GET /api/cat-egresos/:id
export async function getById(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            res.status(400).json({ error: 'ID de categoría inválido' });
            return;
        }
        const categoria = await CatEgresosService.getById(id);
        if (!categoria) {
            res.status(404).json({ error: 'Categoría no encontrada' });
            return;
        }
        res.json(categoria);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener la categoría' });
    }
}

// POST /api/cat-egresos
export async function create(req: Request, res: Response): Promise<void> {
    try {
        const { nombre } = req.body;
        if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
            res.status(400).json({ error: 'El campo "nombre" es obligatorio y no puede estar vacío' });
            return;
        }

        const trimmed = nombre.trim();

        // Validar duplicado
        const existente = await CatEgresosService.getByNombre(trimmed);
        if (existente) {
            res.status(409).json({ error: `Ya existe una categoría de egresos llamada "${trimmed}"` });
            return;
        }

        const nueva = await CatEgresosService.create({ nombre: trimmed });
        res.status(201).json(nueva);
    } catch (err) {
        res.status(500).json({ error: 'Error al crear la categoría de egreso' });
    }
}

// PUT /api/cat-egresos/:id
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

        const actual = await CatEgresosService.getById(id);
        if (!actual) {
            res.status(404).json({ error: 'La categoría que intentas editar no existe' });
            return;
        }

        const duplicado = await CatEgresosService.getByNombre(trimmed, id);
        if (duplicado) {
            res.status(409).json({ error: `Ya existe otra categoría de egresos llamada "${trimmed}"` });
            return;
        }

        const actualizado = await CatEgresosService.update(id, { nombre: trimmed });
        if (!actualizado) {
            res.status(404).json({ error: 'No se pudo actualizar la categoría' });
            return;
        }
        res.json({ message: 'Categoría actualizada correctamente', id, nombre: trimmed });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar la categoría de egreso' });
    }
}

// DELETE /api/cat-egresos/:id
export async function remove(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            res.status(400).json({ error: 'ID de categoría inválido' });
            return;
        }

        const actual = await CatEgresosService.getById(id);
        if (!actual) {
            res.status(404).json({ error: 'La categoría no existe' });
            return;
        }

        // Verificar si tiene egresos vinculados
        const count = await CatEgresosService.countEgresosByCat(id);
        if (count > 0) {
            res.status(409).json({
                error: `No se puede eliminar la categoría "${actual.nombre}" porque está siendo utilizada en ${count} gasto(s). Primero debes reasignar o eliminar esos gastos.`,
                egresosCount: count,
            });
            return;
        }

        const eliminado = await CatEgresosService.remove(id);
        if (!eliminado) {
            res.status(404).json({ error: 'Categoría no encontrada' });
            return;
        }
        res.json({ message: 'Categoría eliminada correctamente' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar la categoría de egreso' });
    }
}
