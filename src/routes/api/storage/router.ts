import { MediaController } from '@/controllers/mediaController';
import { authMiddleware } from '@/middlewares/auth';
import { Request, Response, Router } from 'express';

const router = Router();
const controller = new MediaController();

router.get('/get', authMiddleware, controller.getMediaList.bind(controller));
router.post('/remove', authMiddleware, controller.deleteFolder.bind(controller));

export default router;