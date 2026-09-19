// backend/src/routes/ingresos.routes.ts
import { Router } from 'express';
import * as IngresosController from '../controllers/ingresos.controller';

const router = Router();

// GET    /api/ingresos/summary      → Obtener resumen de ingresos para métricas
// GET    /api/ingresos              → Listar ingresos (con filtros opcionales)
// POST   /api/ingresos              → Registrar nuevo ingreso
// GET    /api/ingresos/:id          → Obtener un ingreso por ID
// PUT    /api/ingresos/:id          → Actualizar un ingreso
// DELETE /api/ingresos/:id          → Eliminar un ingreso

router.get('/summary', IngresosController.getSummary);
router.get('/', IngresosController.getAll);
router.post('/', IngresosController.create);
router.get('/:id', IngresosController.getById);
router.put('/:id', IngresosController.update);
router.delete('/:id', IngresosController.remove);

export default router;
