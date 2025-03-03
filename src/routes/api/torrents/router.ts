import { TorrentController } from '@/controllers/torrentController';
import { authMiddleware } from '@/middlewares/auth';
import { Request, Response, Router } from 'express';
const router = Router();

const controller = new TorrentController();

router.get('/get', authMiddleware, controller.getTorrents.bind(controller));
router.get('/search', authMiddleware, controller.searchTorrents.bind(controller));
router.post('/download', authMiddleware, controller.downloadTorrent.bind(controller));
router.post('/delete', authMiddleware, controller.deleteTorrent.bind(controller));

export default router;