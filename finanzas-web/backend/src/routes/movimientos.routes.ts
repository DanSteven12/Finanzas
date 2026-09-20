// backend/src/routes/movimientos.routes.ts
import { Router } from 'express';
import * as MovimientosController from '../controllers/movimientos.controller';

const router = Router();

// GET /api/movimientos/summary
router.get('/summary', MovimientosController.getSummary);

// GET /api/movimientos
router.get('/', MovimientosController.getAll);

// GET /api/movimientos/:id
router.get('/:id', MovimientosController.getById);

// POST /api/movimientos
router.post('/', MovimientosController.create);

// PUT /api/movimientos/:id
router.put('/:id', MovimientosController.update);

// DELETE /api/movimientos/:id
router.delete('/:id', MovimientosController.remove);

export default router;
