// backend/src/routes/dashboard.routes.ts
import { Router } from 'express';
import * as DashboardController from '../controllers/dashboard.controller';

const router = Router();

// GET /api/dashboard
router.get('/', DashboardController.getDashboard);

export default router;
