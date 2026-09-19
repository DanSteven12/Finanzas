// backend/src/controllers/ingresos.controller.ts
import { Request, Response } from 'express';
import * as IngresosService from '../services/ingresos.service';
import * as CatIngresosService from '../services/catIngresos.service';

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

// GET /api/ingresos
export async function getAll(req: Request, res: Response): Promise<void> {
    try {
        const { fecha_inicio, fecha_fin, id_cat, search } = req.query;

        const filters = {
            fecha_inicio: typeof fecha_inicio === 'string' ? fecha_inicio : undefined,
            fecha_fin: typeof fecha_fin === 'string' ? fecha_fin : undefined,
            id_cat: id_cat ? Number(id_cat) : undefined,
            search: typeof search === 'string' ? search : undefined,
        };

        const ingresos = await IngresosService.getAll(filters);
        res.json(ingresos);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al obtener el listado de ingresos' });
    }
}

// GET /api/ingresos/summary
export async function getSummary(req: Request, res: Response): Promise<void> {
    try {
        const summary = await IngresosService.getSummary();
        res.json(summary);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al obtener el resumen de ingresos' });
    }
}

// GET /api/ingresos/:id
export async function getById(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            res.status(400).json({ error: 'ID de ingreso inválido' });
            return;
        }
        const ingreso = await IngresosService.getById(id);
        if (!ingreso) {
            res.status(404).json({ error: 'Ingreso no encontrado' });
            return;
        }
        res.json(ingreso);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al obtener el ingreso' });
    }
}

// POST /api/ingresos
export async function create(req: Request, res: Response): Promise<void> {
    try {
        const { monto, concepto, fecha, id_cat } = req.body;

        // 1. Validar Monto
        const parsedMonto = Number(monto);
        if (monto === undefined || monto === null || isNaN(parsedMonto) || parsedMonto <= 0) {
            res.status(400).json({ error: 'El monto es obligatorio y debe ser un número mayor a 0' });
            return;
        }

        // 2. Validar Concepto
        if (!concepto || typeof concepto !== 'string' || concepto.trim() === '') {
            res.status(400).json({ error: 'El concepto es obligatorio y no puede estar vacío' });
            return;
        }

        // 3. Validar Fecha
        if (!fecha || !isValidDateString(fecha)) {
            res.status(400).json({ error: 'La fecha es obligatoria y debe ser una fecha/hora válida' });
            return;
        }

        // 4. Validar Categoría
        const parsedIdCat = Number(id_cat);
        if (isNaN(parsedIdCat) || parsedIdCat <= 0) {
            res.status(400).json({ error: 'Debes seleccionar una categoría válida' });
            return;
        }

        const categoriaExiste = await CatIngresosService.getById(parsedIdCat);
        if (!categoriaExiste) {
            res.status(400).json({ error: 'La categoría seleccionada no existe en la base de datos' });
            return;
        }

        const mysqlFecha = formatToMySQLDateTime(fecha);

        const nuevo = await IngresosService.create({
            monto: parsedMonto,
            concepto: concepto.trim(),
            fecha: mysqlFecha,
            id_cat: parsedIdCat,
        });

        res.status(201).json(nuevo);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al registrar el ingreso' });
    }
}

// PUT /api/ingresos/:id
export async function update(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            res.status(400).json({ error: 'ID de ingreso inválido' });
            return;
        }

        const actual = await IngresosService.getById(id);
        if (!actual) {
            res.status(404).json({ error: 'El ingreso a editar no existe' });
            return;
        }

        const { monto, concepto, fecha, id_cat } = req.body;
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

        // Validar concepto si se incluye
        if (concepto !== undefined) {
            if (typeof concepto !== 'string' || concepto.trim() === '') {
                res.status(400).json({ error: 'El concepto no puede estar vacío' });
                return;
            }
            updateData.concepto = concepto.trim();
        }

        // Validar fecha si se incluye
        if (fecha !== undefined) {
            if (!isValidDateString(fecha)) {
                res.status(400).json({ error: 'La fecha no es válida' });
                return;
            }
            updateData.fecha = formatToMySQLDateTime(fecha);
        }

        // Validar categoría si se incluye
        if (id_cat !== undefined) {
            const parsedIdCat = Number(id_cat);
            if (isNaN(parsedIdCat) || parsedIdCat <= 0) {
                res.status(400).json({ error: 'Categoría inválida' });
                return;
            }
            const categoriaExiste = await CatIngresosService.getById(parsedIdCat);
            if (!categoriaExiste) {
                res.status(400).json({ error: 'La categoría seleccionada no existe' });
                return;
            }
            updateData.id_cat = parsedIdCat;
        }

        const actualizado = await IngresosService.update(id, updateData);
        res.json(actualizado);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al actualizar el ingreso' });
    }
}

// DELETE /api/ingresos/:id
export async function remove(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            res.status(400).json({ error: 'ID de ingreso inválido' });
            return;
        }

        const actual = await IngresosService.getById(id);
        if (!actual) {
            res.status(404).json({ error: 'El ingreso no existe o ya fue eliminado' });
            return;
        }

        const eliminado = await IngresosService.remove(id);
        if (!eliminado) {
            res.status(404).json({ error: 'No se pudo eliminar el ingreso' });
            return;
        }

        res.json({ message: 'Ingreso eliminado correctamente', id });
    } catch (err: any) {
        res.status(500).json({ error: 'Error al eliminar el ingreso' });
    }
}
