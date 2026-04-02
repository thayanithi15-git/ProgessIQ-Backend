"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController = __importStar(require("../controllers/admin"));
const systemLogController = __importStar(require("../controllers/systemLogController"));
const roles_1 = require("../middleware/roles");
const router = (0, express_1.Router)();
// All admin endpoints require admin role
router.use(roles_1.requireAdmin);
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
exports.default = router;
