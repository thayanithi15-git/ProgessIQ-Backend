import { Router } from 'express';
import * as adminController from '../controllers/admin';
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
router.put('/students/:id', adminController.updateStudent);
router.delete('/students/:id', adminController.deleteStudent);

// Mentors
router.post('/mentors', adminController.createMentor);
router.get('/mentors', adminController.getMentors);
router.put('/mentors/:id', adminController.updateMentor);
router.delete('/mentors/:id', adminController.deleteMentor);

// Projects
router.get('/projects', adminController.listProjects);
router.get('/projects/:id', adminController.viewProject);

// Certifications & Tasks
router.get('/certifications', adminController.listCertifications);
router.get('/tasks', adminController.listTasks);

// Logs
router.get('/logs', adminController.listLogs);

// Reports
router.post('/reports', adminController.generateReport);

// Mentor-Student mapping
router.post('/mappings', adminController.mapStudentsToMentor);

export default router;
