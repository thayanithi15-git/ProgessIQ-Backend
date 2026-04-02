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
const studentController = __importStar(require("../controllers/student"));
const roles_1 = require("../middleware/roles");
const router = (0, express_1.Router)();
router.use(roles_1.requireStudent);
// ========== DASHBOARD ==========
router.get('/dashboard', studentController.getStudentDashboard);
router.get('/heatmap', studentController.getHeatmapData);
router.get('/charts/points-trend', studentController.getPointsTrendChart);
router.get('/charts/monthly-activity', studentController.getMonthlyActivityChart);
router.get('/charts/task-completion', studentController.getTaskCompletionChart);
router.get('/activity-logs', studentController.getActivityLogs);
router.post('/activity-logs', studentController.submitActivityLog);
// ========== PROJECTS ==========
router.post('/projects', studentController.createProject);
router.get('/projects', studentController.listStudentProjects);
router.get('/projects/:id', studentController.getProjectById);
router.put('/projects/:id', studentController.updateProject);
router.delete('/projects/:id', studentController.deleteProject);
router.get('/projects/:id/feedback', studentController.getProjectFeedback);
router.put('/projects/:id/start', studentController.startProject);
router.put('/projects/:id/complete', studentController.submitProjectUpdate);
// ========== TASKS ==========
router.post('/tasks', studentController.createTask);
router.get('/tasks', studentController.listStudentTasks);
router.get('/tasks/:id', studentController.getTaskById);
router.put('/tasks/:id', studentController.updateTask);
router.delete('/tasks/:id', studentController.deleteTask);
router.put('/tasks/:id/start', studentController.startTask);
router.put('/tasks/:id/complete', studentController.submitTaskUpdate);
router.get('/tasks/:id/feedback', studentController.getTaskFeedback);
// ========== CERTIFICATIONS ==========
router.post('/certifications', studentController.createCertification);
router.get('/certifications', studentController.listCertifications);
router.get('/certifications/:id', studentController.getCertificationById);
router.put('/certifications/:id', studentController.updateCertification);
router.delete('/certifications/:id', studentController.deleteCertification);
router.get('/certifications/:id/feedback', studentController.getCertificationFeedback);
// ========== INTERNSHIPS ==========
router.post('/internships', studentController.createInternship);
router.get('/internships', studentController.listInternships);
router.get('/internships/:id', studentController.getInternshipById);
router.put('/internships/:id', studentController.updateInternship);
router.delete('/internships/:id', studentController.deleteInternship);
router.get('/internships/:id/feedback', studentController.getInternshipFeedback);
// ========== SURVEYS ==========
router.get('/surveys', studentController.listAvailableSurveys);
router.get('/surveys/:id', studentController.getSurveyById);
router.post('/surveys/:id/respond', studentController.respondToSurvey);
router.get('/surveys/:id/responses', studentController.getSurveyResponses);
router.put('/surveys/:id/respond', studentController.updateSurveyResponse);
// ========== PROFILE ==========
router.get('/profile', studentController.getProfile);
router.put('/profile', studentController.updateProfile);
router.get('/profile/complete', studentController.getCompleteProfile);
router.get('/profile/socials', studentController.getSocialLinks);
router.post('/profile/socials', studentController.updateSocialLinks);
// ========== RANKINGS ==========
router.get('/rankings', studentController.getAllRankings);
router.get('/rankings/position', studentController.getStudentRanking);
router.get('/rankings/department', studentController.getDepartmentRankings);
// ========== NOTIFICATIONS ==========
router.get('/notifications', studentController.myNotifications);
exports.default = router;
