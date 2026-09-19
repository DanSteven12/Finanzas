// backend/src/controllers/limites.controller.ts
import { Request, Response } from 'express';
import * as LimitesService from '../services/limites.service';
import * as CatEgresosService from '../services/catEgresos.service';

// GET /api/limites
export async function getAll(req: Request, res: Response): Promise<void> {
    try {
        const { id_cat, mes, year } = req.query;

        const filters = {
            id_cat: id_cat ? Number(id_cat) : undefined,
            mes: typeof mes === 'string' && mes.trim() !== '' ? mes.trim() : undefined,
            year: year ? Number(year) : undefined,
        };

        const limites = await LimitesService.getAll(filters);
        res.json(limites);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al obtener el listado de límites' });
    }
}

// GET /api/limites/summary
export async function getSummary(req: Request, res: Response): Promise<void> {
    try {
        const { id_cat, mes, year } = req.query;

        const filters = {
            id_cat: id_cat ? Number(id_cat) : undefined,
            mes: typeof mes === 'string' && mes.trim() !== '' ? mes.trim() : undefined,
            year: year ? Number(year) : undefined,
        };

        const summary = await LimitesService.getSummary(filters);
        res.json(summary);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al obtener el resumen de límites' });
    }
}

// GET /api/limites/:id
export async function getById(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            res.status(400).json({ error: 'ID de límite inválido' });
            return;
        }

        const limite = await LimitesService.getById(id);
        if (!limite) {
            res.status(404).json({ error: 'Límite no encontrado' });
            return;
        }

        res.json(limite);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al obtener el límite' });
    }
}

// POST /api/limites
export async function create(req: Request, res: Response): Promise<void> {
    try {
        const { monto, mes, id_cat } = req.body;

        // 1. Validar Monto
        const parsedMonto = Number(monto);
        if (monto === undefined || monto === null || isNaN(parsedMonto) || parsedMonto <= 0) {
            res.status(400).json({ error: 'El monto es obligatorio y debe ser un número mayor a 0' });
            return;
        }

        // 2. Validar Mes
        if (!mes || typeof mes !== 'string' || mes.trim() === '') {
            res.status(400).json({ error: 'El mes es obligatorio y debe ser válido (ej. 2026-09)' });
            return;
        }

        let normalizedMes: string;
        try {
            normalizedMes = LimitesService.normalizeMonthToDate(mes);
        } catch {
            res.status(400).json({ error: 'El formato de mes no es válido' });
            return;
        }

        // 3. Validar Categoría
        const parsedIdCat = Number(id_cat);
        if (isNaN(parsedIdCat) || parsedIdCat <= 0) {
            res.status(400).json({ error: 'Debes seleccionar una categoría válida' });
            return;
        }

        const categoriaExiste = await CatEgresosService.getById(parsedIdCat);
        if (!categoriaExiste) {
            res.status(400).json({ error: 'La categoría seleccionada no existe en la base de datos' });
            return;
        }

        // 4. Validar Duplicados (Categoría + Mes)
        const duplicado = await LimitesService.getByCatAndMonth(parsedIdCat, normalizedMes);
        if (duplicado) {
            res.status(409).json({
                error: `Ya existe un límite establecido para la categoría "${categoriaExiste.nombre}" en este mes (${normalizedMes.substring(0, 7)}). Puedes editar el límite existente.`,
                limiteExistenteId: duplicado.id,
            });
            return;
        }

        const nuevo = await LimitesService.create({
            monto: parsedMonto,
            mes: normalizedMes,
            id_cat: parsedIdCat,
        });

        res.status(201).json(nuevo);
    } catch (err: any) {
        // Manejo defensivo de error UNIQUE en MySQL (código 1062)
        if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
            res.status(409).json({
                error: 'Ya existe un límite establecido para esa categoría en el mes seleccionado.',
            });
            return;
        }
        res.status(500).json({ error: 'Error al registrar el límite' });
    }
}

// PUT /api/limites/:id
export async function update(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            res.status(400).json({ error: 'ID de límite inválido' });
            return;
        }

        const actual = await LimitesService.getById(id);
        if (!actual) {
            res.status(404).json({ error: 'El límite a editar no existe' });
            return;
        }

        const { monto, mes, id_cat } = req.body;
        const updateData: any = {};

        // Validar monto si se incluye
        if (monto !== undefined) {
            const parsedMonto = Number(monto);
            if (isNaN(parsedMonto) || parsedMonto <= 0) {
                res.status(400).json({ error: 'El monto debe ser un número mayor a 0' });
                return;
            }
            updateData.monto = parsedMonto;
        }

        // Validar mes si se incluye
        let targetMes = actual.mes;
        if (mes !== undefined) {
            try {
                targetMes = LimitesService.normalizeMonthToDate(mes);
                updateData.mes = targetMes;
            } catch {
                res.status(400).json({ error: 'El formato de mes no es válido' });
                return;
            }
        }

        // Validar categoría si se incluye
        let targetCat = actual.id_cat;
        if (id_cat !== undefined) {
            const parsedIdCat = Number(id_cat);
            if (isNaN(parsedIdCat) || parsedIdCat <= 0) {
                res.status(400).json({ error: 'Categoría inválida' });
                return;
            }
            const categoriaExiste = await CatEgresosService.getById(parsedIdCat);
            if (!categoriaExiste) {
                res.status(400).json({ error: 'La categoría seleccionada no existe' });
                return;
            }
            targetCat = parsedIdCat;
            updateData.id_cat = targetCat;
        }

        // Verificar duplicados contra otros registros (id_cat + mes)
        const duplicado = await LimitesService.getByCatAndMonth(targetCat, targetMes, id);
        if (duplicado) {
            res.status(409).json({
                error: `Ya existe otro límite para esa categoría en el mes seleccionado (${targetMes.substring(0, 7)}).`,
            });
            return;
        }

        const actualizado = await LimitesService.update(id, updateData);
        res.json(actualizado);
    } catch (err: any) {
        if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
            res.status(409).json({
                error: 'Ya existe un límite establecido para esa categoría en el mes seleccionado.',
            });
            return;
        }
        res.status(500).json({ error: 'Error al actualizar el límite' });
    }
}

// DELETE /api/limites/:id
export async function remove(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            res.status(400).json({ error: 'ID de límite inválido' });
            return;
        }

        const actual = await LimitesService.getById(id);
        if (!actual) {
            res.status(404).json({ error: 'El límite no existe o ya fue eliminado' });
            return;
        }

        const eliminado = await LimitesService.remove(id);
        if (!eliminado) {
            res.status(404).json({ error: 'No se pudo eliminar el límite' });
            return;
        }

        res.json({ message: 'Límite eliminado correctamente', id });
    } catch (err: any) {
        res.status(500).json({ error: 'Error al eliminar el límite' });
    }
}
