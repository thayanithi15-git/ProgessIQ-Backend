import { Router } from 'express';
import * as mentorController from '../controllers/mentor';
import { requireMentor } from '../middleware/roles';

const router = Router();

router.use(requireMentor as any);

router.get('/profile', mentorController.getMentorProfile);
router.get('/stats', mentorController.getMentorStats);
router.get('/assigned-students', mentorController.getAssignedStudents);
router.get('/assigned-students/:id/profile', mentorController.getAssignedStudentProfile);
router.get('/approvals', mentorController.listApprovals);
router.get('/approvals/stats', mentorController.getApprovalStats);
router.put('/approvals/:id', mentorController.updateApproval);
router.get('/submissions', mentorController.listSubmissions);
router.get('/submissions/:entityType/:id', mentorController.getSubmissionDetail);
router.put('/submissions/:entityType/:id/review', mentorController.reviewSubmission);
router.post('/approve', mentorController.approveEntity);
router.post('/feedback', mentorController.giveFeedback);
router.post('/points', mentorController.awardPoints);
router.post('/surveys', mentorController.createSurvey);
router.get('/surveys', mentorController.listSurveys);
router.get('/surveys/:id/responses', mentorController.getSurveyResponses);
router.post('/notify', mentorController.notifyStudents);

// ========== PROJECTS ==========
router.get('/projects', mentorController.listMentorProjects);
router.post('/projects', mentorController.createMentorProject);
router.get('/projects/:id', mentorController.getMentorProjectById);
router.put('/projects/:id', mentorController.updateMentorProject);
router.delete('/projects/:id', mentorController.deleteMentorProject);
router.put('/projects/:id/verify', mentorController.verifyMentorProject);

// ========== TASKS ==========
router.get('/tasks', mentorController.listMentorTasks);
router.post('/tasks/assign', mentorController.createMentorTask);
router.get('/tasks/:id', mentorController.getMentorTaskById);
router.put('/tasks/:id', mentorController.updateMentorTask);
router.delete('/tasks/:id', mentorController.deleteMentorTask);
router.put('/tasks/:id/verify', mentorController.verifyMentorTask);

// ========== CERTIFICATIONS ==========
router.get('/certifications', mentorController.listMentorCertifications);
router.get('/certifications/:id', mentorController.getMentorCertificationById);

// ========== INTERNSHIPS ==========
router.get('/internships', mentorController.listMentorInternships);
router.get('/internships/:id', mentorController.getMentorInternshipById);

export default router;
