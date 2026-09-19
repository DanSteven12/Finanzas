// backend/src/routes/metas.routes.ts
import { Router } from 'express';
import * as MetasController from '../controllers/metas.controller';

const router = Router();

// GET /api/metas -> Listar metas
router.get('/', MetasController.getAll);

// GET /api/metas/summary -> Resumen agregado
router.get('/summary', MetasController.getSummary);

// GET /api/metas/:id -> Detalle de una meta
router.get('/:id', MetasController.getById);

// POST /api/metas -> Registrar nueva meta
router.post('/', MetasController.create);

// POST /api/metas/:id/abonar -> Abonar dinero a la meta
router.post('/:id/abonar', MetasController.abonar);

// PUT /api/metas/:id -> Actualizar meta
router.put('/:id', MetasController.update);

// DELETE /api/metas/:id -> Eliminar meta
router.delete('/:id', MetasController.remove);

export default router;
