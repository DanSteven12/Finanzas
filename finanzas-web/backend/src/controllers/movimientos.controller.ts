// backend/src/controllers/movimientos.controller.ts
import { Request, Response } from 'express';
import * as MovimientosService from '../services/movimientos.service';
import * as MetasService from '../services/metas.service';

// Helper para validar formato y validez de fecha
function isValidDateString(dStr: any): boolean {
    if (!dStr || typeof dStr !== 'string') return false;
    const d = new Date(dStr);
    return !isNaN(d.getTime());
}

// Helper para normalizar fecha a formato compatible MySQL (YYYY-MM-DD HH:mm:ss)
function formatToMySQLDateTime(dateInput: string): string {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateInput;
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// GET /api/movimientos
export async function getAll(req: Request, res: Response): Promise<void> {
    try {
        const { id_meta, tipo, fecha_inicio, fecha_fin, search } = req.query;

        const filters = {
            id_meta: id_meta ? Number(id_meta) : undefined,
            tipo: (tipo === 'INGRESO' || tipo === 'EGRESO') ? (tipo as 'INGRESO' | 'EGRESO') : undefined,
            fecha_inicio: typeof fecha_inicio === 'string' ? fecha_inicio : undefined,
            fecha_fin: typeof fecha_fin === 'string' ? fecha_fin : undefined,
            search: typeof search === 'string' ? search : undefined,
        };

        const list = await MovimientosService.getAll(filters);
        res.json(list);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al obtener el listado de movimientos de ahorro.' });
    }
}

// GET /api/movimientos/summary
export async function getSummary(req: Request, res: Response): Promise<void> {
    try {
        const { id_meta, tipo, fecha_inicio, fecha_fin, search } = req.query;

        const filters = {
            id_meta: id_meta ? Number(id_meta) : undefined,
            tipo: (tipo === 'INGRESO' || tipo === 'EGRESO') ? (tipo as 'INGRESO' | 'EGRESO') : undefined,
            fecha_inicio: typeof fecha_inicio === 'string' ? fecha_inicio : undefined,
            fecha_fin: typeof fecha_fin === 'string' ? fecha_fin : undefined,
            search: typeof search === 'string' ? search : undefined,
        };

        const summary = await MovimientosService.getSummary(filters);
        res.json(summary);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al obtener el resumen de movimientos.' });
    }
}

// GET /api/movimientos/:id
export async function getById(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            res.status(400).json({ error: 'ID de movimiento inválido.' });
            return;
        }

        const item = await MovimientosService.getById(id);
        if (!item) {
            res.status(404).json({ error: 'Movimiento no encontrado.' });
            return;
        }

        res.json(item);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al obtener el movimiento.' });
    }
}

// POST /api/movimientos
export async function create(req: Request, res: Response): Promise<void> {
    try {
        const { monto, tipo, fecha, id_meta } = req.body;

        // 1. Validar ID de Meta
        const parsedIdMeta = Number(id_meta);
        if (isNaN(parsedIdMeta) || parsedIdMeta <= 0) {
            res.status(400).json({ error: 'Debes seleccionar una meta de ahorro válida.' });
            return;
        }

        const metaExiste = await MetasService.getById(parsedIdMeta);
        if (!metaExiste) {
            res.status(400).json({ error: 'La meta de ahorro seleccionada no existe.' });
            return;
        }

        // 2. Validar Tipo
        if (!tipo || (tipo !== 'INGRESO' && tipo !== 'EGRESO')) {
            res.status(400).json({ error: 'El tipo de movimiento es obligatorio y debe ser INGRESO o EGRESO.' });
            return;
        }

        // 3. Validar Monto
        const parsedMonto = Number(monto);
        if (monto === undefined || monto === null || isNaN(parsedMonto) || parsedMonto <= 0) {
            res.status(400).json({ error: 'El monto es obligatorio, numérico y debe ser mayor que 0.' });
            return;
        }

        // 4. Validar Fecha
        if (!fecha || !isValidDateString(fecha)) {
            res.status(400).json({ error: 'La fecha es obligatoria y debe ser una fecha/hora válida.' });
            return;
        }

        const mysqlFecha = formatToMySQLDateTime(fecha);

        const nuevo = await MovimientosService.create({
            monto: parsedMonto,
            tipo,
            fecha: mysqlFecha,
            id_meta: parsedIdMeta,
        });

        res.status(201).json(nuevo);
    } catch (err: any) {
        // Errores de validación de negocio (ej. saldo insuficiente)
        if (err.message) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.status(500).json({ error: 'Error al registrar el movimiento de ahorro.' });
    }
}

// PUT /api/movimientos/:id
export async function update(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            res.status(400).json({ error: 'ID de movimiento inválido.' });
            return;
        }

        const actual = await MovimientosService.getById(id);
        if (!actual) {
            res.status(404).json({ error: 'El movimiento a editar no existe.' });
            return;
        }

        const { monto, tipo, fecha, id_meta } = req.body;
        const updateData: any = {};

        // Validar monto si se provee
        if (monto !== undefined) {
            const parsedMonto = Number(monto);
            if (isNaN(parsedMonto) || parsedMonto <= 0) {
                res.status(400).json({ error: 'El monto debe ser numérico y mayor que 0.' });
                return;
            }
            updateData.monto = parsedMonto;
        }

        // Validar tipo si se provee
        if (tipo !== undefined) {
            if (tipo !== 'INGRESO' && tipo !== 'EGRESO') {
                res.status(400).json({ error: 'El tipo debe ser INGRESO o EGRESO.' });
                return;
            }
            updateData.tipo = tipo;
        }

        // Validar fecha si se provee
        if (fecha !== undefined) {
            if (!isValidDateString(fecha)) {
                res.status(400).json({ error: 'La fecha proporcionada no es válida.' });
                return;
            }
            updateData.fecha = formatToMySQLDateTime(fecha);
        }

        // Validar id_meta si se provee
        if (id_meta !== undefined) {
            const parsedIdMeta = Number(id_meta);
            if (isNaN(parsedIdMeta) || parsedIdMeta <= 0) {
                res.status(400).json({ error: 'ID de meta inválido.' });
                return;
            }
            const metaExiste = await MetasService.getById(parsedIdMeta);
            if (!metaExiste) {
                res.status(400).json({ error: 'La meta de destino seleccionada no existe.' });
                return;
            }
            updateData.id_meta = parsedIdMeta;
        }

        const actualizado = await MovimientosService.update(id, updateData);
        if (!actualizado) {
            res.status(404).json({ error: 'El movimiento no fue encontrado para actualizar.' });
            return;
        }

        res.json(actualizado);
    } catch (err: any) {
        if (err.message) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.status(500).json({ error: 'Error al actualizar el movimiento de ahorro.' });
    }
}

// DELETE /api/movimientos/:id
export async function remove(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            res.status(400).json({ error: 'ID de movimiento inválido.' });
            return;
        }

        const actual = await MovimientosService.getById(id);
        if (!actual) {
            res.status(404).json({ error: 'El movimiento no existe o ya fue eliminado.' });
            return;
        }

        const eliminado = await MovimientosService.remove(id);
        if (!eliminado) {
            res.status(404).json({ error: 'No se pudo eliminar el movimiento.' });
            return;
        }

        res.json({ message: 'Movimiento eliminado correctamente y saldo actualizado.', id });
    } catch (err: any) {
        if (err.message) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.status(500).json({ error: 'Error al eliminar el movimiento de ahorro.' });
    }
}
