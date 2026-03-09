import { Router } from 'express';
import * as mentorController from '../controllers/mentor';
import { requireMentor } from '../middleware/roles';

const router = Router();

router.use(requireMentor as any);

router.get('/stats', mentorController.getMentorStats);
router.get('/assigned-students', mentorController.getAssignedStudents);
router.get('/approvals', mentorController.listApprovals);
router.put('/approvals/:id', mentorController.updateApproval);
router.post('/approve', mentorController.approveEntity);
router.post('/feedback', mentorController.giveFeedback);
router.post('/points', mentorController.awardPoints);
router.post('/surveys', mentorController.createSurvey);
router.get('/surveys', mentorController.listSurveys);
router.get('/surveys/:id/responses', mentorController.getSurveyResponses);
router.get('/projects', mentorController.listMentorProjects);
router.get('/tasks', mentorController.listMentorTasks);
router.get('/certifications', mentorController.listMentorCertifications);
router.get('/internships', mentorController.listMentorInternships);

export default router;
