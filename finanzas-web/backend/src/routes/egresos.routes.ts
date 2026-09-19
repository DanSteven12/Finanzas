// backend/src/routes/egresos.routes.ts
import { Router } from 'express';
import * as EgresosController from '../controllers/egresos.controller';

const router = Router();

// GET    /api/egresos/summary      → Obtener resumen de egresos para métricas (soporta filtros)
// GET    /api/egresos              → Listar egresos (con filtros opcionales)
// POST   /api/egresos              → Registrar nuevo egreso
// GET    /api/egresos/:id          → Obtener un egreso por ID
// PUT    /api/egresos/:id          → Actualizar un egreso
// DELETE /api/egresos/:id          → Eliminar un egreso

router.get('/summary', EgresosController.getSummary);
router.get('/', EgresosController.getAll);
router.post('/', EgresosController.create);
router.get('/:id', EgresosController.getById);
router.put('/:id', EgresosController.update);
router.delete('/:id', EgresosController.remove);

export default router;
