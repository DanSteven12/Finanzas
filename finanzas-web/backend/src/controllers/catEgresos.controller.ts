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
        if (isNaN(id)) {
            res.status(400).json({ error: 'ID inválido' });
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
            res.status(400).json({ error: 'El campo "nombre" es requerido' });
            return;
        }
        const nueva = await CatEgresosService.create({ nombre });
        res.status(201).json(nueva);
    } catch (err) {
        res.status(500).json({ error: 'Error al crear la categoría' });
    }
}

// PUT /api/cat-egresos/:id
export async function update(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }
        const { nombre } = req.body;
        if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
            res.status(400).json({ error: 'El campo "nombre" es requerido' });
            return;
        }
        const actualizado = await CatEgresosService.update(id, { nombre });
        if (!actualizado) {
            res.status(404).json({ error: 'Categoría no encontrada' });
            return;
        }
        res.json({ message: 'Categoría actualizada correctamente' });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar la categoría' });
    }
}

// DELETE /api/cat-egresos/:id
export async function remove(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }
        const eliminado = await CatEgresosService.remove(id);
        if (!eliminado) {
            res.status(404).json({ error: 'Categoría no encontrada' });
            return;
        }
        res.json({ message: 'Categoría eliminada correctamente' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar la categoría' });
    }
}
