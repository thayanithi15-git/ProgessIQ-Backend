import { Router } from 'express';
import * as studentController from '../controllers/student';
import { requireStudent } from '../middleware/roles';

const router = Router();

router.use(requireStudent as any);
router.get('/dashboard', studentController.getStudentDashboard);
router.post('/daily-log', studentController.submitDailyLog);
router.post('/projects', studentController.createProject);
router.get('/projects', studentController.listStudentProjects);
router.get('/tasks', studentController.listStudentTasks);
router.put('/tasks/:id', studentController.submitTaskUpdate);

// Surveys
router.get('/surveys', studentController.listAvailableSurveys);
router.post('/surveys/:id/respond', studentController.respondToSurvey);

export default router;