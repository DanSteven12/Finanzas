// backend/src/routes/index.ts
// Enrutador principal: agrupa todas las rutas de la API
import { Router } from 'express';
import catEgresosRoutes from './catEgresos.routes';
import egresosRoutes from './egresos.routes';
import catIngresosRoutes from './catIngresos.routes';
import ingresosRoutes from './ingresos.routes';
import limitesRoutes from './limites.routes';
import metasRoutes from './metas.routes';

const router = Router();

router.use('/cat-egresos', catEgresosRoutes);
router.use('/egresos', egresosRoutes);
router.use('/cat-ingresos', catIngresosRoutes);
router.use('/ingresos', ingresosRoutes);
router.use('/limites', limitesRoutes);
router.use('/metas', metasRoutes);

export default router;
