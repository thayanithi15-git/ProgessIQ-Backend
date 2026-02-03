import { Router } from 'express';
import { listNotifications, createNotification, markRead } from '../controllers/notifications';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', listNotifications);
router.post('/', createNotification);
router.post('/:id/read', markRead);

export default router;