// backend/src/controllers/dashboard.controller.ts
import { Request, Response } from 'express';
import * as DashboardService from '../services/dashboard.service';

// GET /api/dashboard
export async function getDashboard(req: Request, res: Response): Promise<void> {
    try {
        const { mes, year, month } = req.query;

        let mesParam: string | undefined = undefined;
        if (typeof mes === 'string' && mes.trim() !== '') {
            mesParam = mes;
        } else if (year && month) {
            const y = Number(year);
            const m = Number(month);
            if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
                mesParam = `${y}-${String(m).padStart(2, '0')}-01`;
            }
        }

        const data = await DashboardService.getDashboardData(mesParam);
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: 'Error al obtener los datos del dashboard financiero.' });
    }
}
