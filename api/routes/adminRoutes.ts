import { Router } from 'express';
import * as adminController from '../controllers/admin';
import * as systemLogController from '../controllers/systemLogController';
import { requireAdmin } from '../middleware/roles';

const router = Router();

// All admin endpoints require admin role
router.use(requireAdmin as any);

// Dashboard
router.get('/stats', adminController.getAdminStats);
router.get('/top-students', adminController.getTopStudents);
router.get('/charts/activities', adminController.getActivityChart);
router.get('/charts/points-trend', adminController.getPointsTrendChart);
router.get('/charts/monthly-submissions', adminController.getMonthlySubmissions);

// Pie Charts
router.get('/charts/department-distribution', adminController.getDepartmentDistribution);
router.get('/charts/year-distribution', adminController.getYearDistribution);
router.get('/charts/project-status', adminController.getProjectStatusChart);
router.get('/charts/internship-types', adminController.getInternshipTypesChart);

// Bar Charts
router.get('/charts/points-by-source', adminController.getPointsBySource);

// Users
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.viewUser);
router.post('/users/students', adminController.createStudentUser);
router.post('/users/admins', adminController.createAdminUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Students (legacy)
router.post('/students', adminController.createStudent);
router.get('/students', adminController.getStudents);
router.get('/students/:id', adminController.getStudentById);
router.put('/students/:id', adminController.updateStudent);
router.delete('/students/:id', adminController.deleteStudent);
router.post('/students/bulk', adminController.bulkUploadStudents);

// Mentors
router.post('/mentors', adminController.createMentor);
router.get('/mentors', adminController.getMentors);
router.get('/mentors/:id', adminController.getMentorById);
router.put('/mentors/:id', adminController.updateMentor);
router.delete('/mentors/:id', adminController.deleteMentor);

// Projects
router.get('/projects', adminController.listProjects);
router.get('/projects/:id', adminController.viewProject);

// Certifications & Tasks
router.get('/certifications', adminController.listCertifications);
router.get('/tasks', adminController.listTasks);

// Internships & Surveys
router.get('/internships', adminController.listInternships);
router.get('/internships/:id', adminController.viewInternship);
router.get('/surveys', adminController.listSurveys);
router.get('/surveys/:id/responses', adminController.viewSurveyResponses);

// Logs
router.get('/logs', adminController.listLogs);

// System Logs
router.get('/system-logs', systemLogController.getSystemLogs);

// Reports
router.post('/reports', adminController.generateReport);
router.post('/reports/preview', adminController.previewReport);

// Report Options
router.get('/options/departments', adminController.getDepartments);
router.get('/options/years', adminController.getYears);
router.get('/options/mentors', adminController.getMentors);
router.get('/options/platforms', adminController.getPlatforms);

// Report Statistics (Removed)
// router.get('/reports/stats', adminController.getReportStats);

// Mentor-Student mapping
router.post('/mappings', adminController.mapStudentsToMentor);

export default router;
