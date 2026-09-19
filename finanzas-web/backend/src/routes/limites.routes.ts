// backend/src/routes/limites.routes.ts
import { Router } from 'express';
import * as LimitesController from '../controllers/limites.controller';

const router = Router();

// GET /api/limites -> Listar límites con filtros
router.get('/', LimitesController.getAll);

// GET /api/limites/summary -> Resumen agregado
router.get('/summary', LimitesController.getSummary);

// GET /api/limites/:id -> Detalle de un límite
router.get('/:id', LimitesController.getById);

// POST /api/limites -> Registrar nuevo límite
router.post('/', LimitesController.create);

// PUT /api/limites/:id -> Actualizar límite
router.put('/:id', LimitesController.update);

// DELETE /api/limites/:id -> Eliminar límite
router.delete('/:id', LimitesController.remove);

export default router;
