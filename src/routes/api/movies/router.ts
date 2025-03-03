import { MovieController } from '@/controllers/movieController';
import { authMiddleware } from '@/middlewares/auth';
import { Router } from 'express';

const router = Router();
const controller = new MovieController();

router.get('/search', authMiddleware, controller.searchMovies.bind(controller));
export default router;