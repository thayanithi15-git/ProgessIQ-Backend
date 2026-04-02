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
const mentorController = __importStar(require("../controllers/mentor"));
const roles_1 = require("../middleware/roles");
const router = (0, express_1.Router)();
router.use(roles_1.requireMentor);
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
exports.default = router;
