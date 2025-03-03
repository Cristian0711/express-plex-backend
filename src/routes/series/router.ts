import { SeriesController } from '@/controllers/seriesController';
import { authMiddleware } from '@/middlewares/auth';
import { Router } from 'express';

const router = Router();
const controller = new SeriesController();

router.get('/search', authMiddleware, controller.searchSeries.bind(controller));
export default router;