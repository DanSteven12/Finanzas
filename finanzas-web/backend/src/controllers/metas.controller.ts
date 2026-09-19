// backend/src/controllers/metas.controller.ts
import { Request, Response } from 'express';
import * as MetasService from '../services/metas.service';

// GET /api/metas
export async function getAll(req: Request, res: Response): Promise<void> {
    try {
        const metas = await MetasService.getAll();
        res.json(metas);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al obtener las metas de ahorro' });
    }
}

// GET /api/metas/summary
export async function getSummary(req: Request, res: Response): Promise<void> {
    try {
        const summary = await MetasService.getSummary();
        res.json(summary);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al obtener el resumen de metas' });
    }
}

// GET /api/metas/:id
export async function getById(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            res.status(400).json({ error: 'ID de meta inválido' });
            return;
        }

        const meta = await MetasService.getById(id);
        if (!meta) {
            res.status(404).json({ error: 'Meta de ahorro no encontrada' });
            return;
        }

        res.json(meta);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al obtener la meta de ahorro' });
    }
}

// POST /api/metas
export async function create(req: Request, res: Response): Promise<void> {
    try {
        const { nombre, monto_meta } = req.body;

        // 1. Validar Nombre
        if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
            res.status(400).json({ error: 'El nombre de la meta es obligatorio y no puede estar vacío' });
            return;
        }

        if (nombre.trim().length > 255) {
            res.status(400).json({ error: 'El nombre de la meta no puede superar los 255 caracteres' });
            return;
        }

        // 2. Validar Monto Meta
        const parsedMonto = Number(monto_meta);
        if (monto_meta === undefined || monto_meta === null || isNaN(parsedMonto) || parsedMonto <= 0) {
            res.status(400).json({ error: 'El monto de la meta es obligatorio y debe ser un número mayor a 0' });
            return;
        }

        const nueva = await MetasService.create({
            nombre: nombre.trim(),
            monto_meta: parsedMonto,
        });

        res.status(201).json(nueva);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al registrar la meta de ahorro' });
    }
}

// PUT /api/metas/:id
export async function update(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            res.status(400).json({ error: 'ID de meta inválido' });
            return;
        }

        const actual = await MetasService.getById(id);
        if (!actual) {
            res.status(404).json({ error: 'La meta a editar no existe' });
            return;
        }

        const { nombre, monto_meta } = req.body;
        const updateData: any = {};

        // Validar nombre si se incluye
        if (nombre !== undefined) {
            if (typeof nombre !== 'string' || nombre.trim() === '') {
                res.status(400).json({ error: 'El nombre de la meta no puede estar vacío' });
                return;
            }
            if (nombre.trim().length > 255) {
                res.status(400).json({ error: 'El nombre no puede superar los 255 caracteres' });
                return;
            }
            updateData.nombre = nombre.trim();
        }

        // Validar monto_meta si se incluye
        if (monto_meta !== undefined) {
            const parsedMonto = Number(monto_meta);
            if (isNaN(parsedMonto) || parsedMonto <= 0) {
                res.status(400).json({ error: 'El monto de la meta debe ser un número mayor a 0' });
                return;
            }

            // No permitir reducir el monto_meta por debajo del saldo actual
            if (actual.saldo > 0 && parsedMonto < actual.saldo) {
                res.status(400).json({
                    error: `El monto de la meta no puede ser menor que el saldo ahorrado actual ($${actual.saldo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}).`,
                });
                return;
            }

            updateData.monto_meta = parsedMonto;
        }

        const actualizado = await MetasService.update(id, updateData);
        res.json(actualizado);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al actualizar la meta de ahorro' });
    }
}

// DELETE /api/metas/:id
export async function remove(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            res.status(400).json({ error: 'ID de meta inválido' });
            return;
        }

        const actual = await MetasService.getById(id);
        if (!actual) {
            res.status(404).json({ error: 'La meta de ahorro no existe o ya fue eliminada' });
            return;
        }

        // Validar si tiene movimientos asociados en la tabla movimiento
        const countMovimientos = await MetasService.countMovimientosByMeta(id);
        if (countMovimientos > 0) {
            res.status(409).json({
                error: `No se puede eliminar la meta "${actual.nombre}" porque tiene ${countMovimientos} movimiento(s) asociado(s). Primero debes gestionar los movimientos relacionados.`,
                movimientosCount: countMovimientos,
            });
            return;
        }

        const eliminado = await MetasService.remove(id);
        if (!eliminado) {
            res.status(404).json({ error: 'No se pudo eliminar la meta de ahorro' });
            return;
        }

        res.json({ message: 'Meta de ahorro eliminada correctamente', id });
    } catch (err: any) {
        res.status(500).json({ error: 'Error al eliminar la meta de ahorro' });
    }
}

// POST /api/metas/:id/abonar
export async function abonar(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            res.status(400).json({ error: 'ID de meta inválido' });
            return;
        }

        const actual = await MetasService.getById(id);
        if (!actual) {
            res.status(404).json({ error: 'La meta de ahorro no existe' });
            return;
        }

        const { monto } = req.body;
        const parsedMonto = Number(monto);
        if (monto === undefined || monto === null || isNaN(parsedMonto) || parsedMonto <= 0) {
            res.status(400).json({ error: 'El monto a abonar debe ser un número mayor a 0' });
            return;
        }

        const actualizado = await MetasService.abonar(id, parsedMonto);
        res.status(201).json(actualizado);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al registrar el abono a la meta' });
    }
}
