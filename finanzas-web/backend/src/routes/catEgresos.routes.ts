// backend/src/routes/catEgresos.routes.ts
import { Router } from 'express';
import * as CatEgresosController from '../controllers/catEgresos.controller';

const router = Router();

// GET    /api/cat-egresos          → Listar todas las categorías
// POST   /api/cat-egresos          → Crear nueva categoría
// GET    /api/cat-egresos/:id      → Obtener una categoría por ID
// PUT    /api/cat-egresos/:id      → Actualizar una categoría
// DELETE /api/cat-egresos/:id      → Eliminar una categoría

router.get('/', CatEgresosController.getAll);
router.post('/', CatEgresosController.create);
router.get('/:id', CatEgresosController.getById);
router.put('/:id', CatEgresosController.update);
router.delete('/:id', CatEgresosController.remove);

export default router;
