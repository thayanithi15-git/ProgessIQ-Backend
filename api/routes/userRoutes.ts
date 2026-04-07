import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/users', authenticate, (req, res) => {
  res.send('User dashboard');
});

export default router;
