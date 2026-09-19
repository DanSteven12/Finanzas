// backend/src/routes/catIngresos.routes.ts
import { Router } from 'express';
import * as CatIngresosController from '../controllers/catIngresos.controller';

const router = Router();

// GET    /api/cat-ingresos          → Listar todas las categorías de ingresos
// POST   /api/cat-ingresos          → Crear nueva categoría
// GET    /api/cat-ingresos/:id      → Obtener una categoría por ID
// PUT    /api/cat-ingresos/:id      → Actualizar una categoría
// DELETE /api/cat-ingresos/:id      → Eliminar una categoría

router.get('/', CatIngresosController.getAll);
router.post('/', CatIngresosController.create);
router.get('/:id', CatIngresosController.getById);
router.put('/:id', CatIngresosController.update);
router.delete('/:id', CatIngresosController.remove);

export default router;
