import { Router } from 'express';
import { login, googleLogin } from '../controllers/authController';

const router = Router();
router.post('/login', login);
router.post('/google', googleLogin);

export default router;
