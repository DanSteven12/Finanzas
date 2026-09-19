// backend/src/routes/index.ts
// Enrutador principal: agrupa todas las rutas de la API
import { Router } from 'express';
import catEgresosRoutes from './catEgresos.routes';
import catIngresosRoutes from './catIngresos.routes';
import ingresosRoutes from './ingresos.routes';

const router = Router();

router.use('/cat-egresos', catEgresosRoutes);
router.use('/cat-ingresos', catIngresosRoutes);
router.use('/ingresos', ingresosRoutes);

export default router;
