"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.myNotifications = exports.updateSurveyResponse = exports.getSurveyResponses = exports.respondToSurvey = exports.getSurveyById = exports.listAvailableSurveys = exports.getDepartmentRankings = exports.getStudentRanking = exports.getAllRankings = exports.getCompleteProfile = exports.updateProfile = exports.getProfile = exports.getInternshipFeedback = exports.deleteInternship = exports.updateInternship = exports.getInternshipById = exports.listInternships = exports.createInternship = exports.getCertificationFeedback = exports.deleteCertification = exports.updateCertification = exports.getCertificationById = exports.listCertifications = exports.createCertification = exports.getTaskFeedback = exports.submitTaskUpdate = exports.deleteTask = exports.updateTask = exports.getTaskById = exports.listStudentTasks = exports.createTask = exports.getProjectFeedback = exports.deleteProject = exports.updateProject = exports.getProjectById = exports.listStudentProjects = exports.createProject = exports.submitActivityLog = exports.getActivityLogs = exports.getTaskCompletionChart = exports.getMonthlyActivityChart = exports.getPointsTrendChart = exports.getHeatmapData = exports.getStudentDashboard = void 0;
// Dashboard
var dashboard_1 = require("./dashboard");
Object.defineProperty(exports, "getStudentDashboard", { enumerable: true, get: function () { return dashboard_1.getStudentDashboard; } });
Object.defineProperty(exports, "getHeatmapData", { enumerable: true, get: function () { return dashboard_1.getHeatmapData; } });
Object.defineProperty(exports, "getPointsTrendChart", { enumerable: true, get: function () { return dashboard_1.getPointsTrendChart; } });
Object.defineProperty(exports, "getMonthlyActivityChart", { enumerable: true, get: function () { return dashboard_1.getMonthlyActivityChart; } });
Object.defineProperty(exports, "getTaskCompletionChart", { enumerable: true, get: function () { return dashboard_1.getTaskCompletionChart; } });
Object.defineProperty(exports, "getActivityLogs", { enumerable: true, get: function () { return dashboard_1.getActivityLogs; } });
Object.defineProperty(exports, "submitActivityLog", { enumerable: true, get: function () { return dashboard_1.submitActivityLog; } });
// Projects
var projects_1 = require("./projects");
Object.defineProperty(exports, "createProject", { enumerable: true, get: function () { return projects_1.createProject; } });
Object.defineProperty(exports, "listStudentProjects", { enumerable: true, get: function () { return projects_1.listStudentProjects; } });
Object.defineProperty(exports, "getProjectById", { enumerable: true, get: function () { return projects_1.getProjectById; } });
Object.defineProperty(exports, "updateProject", { enumerable: true, get: function () { return projects_1.updateProject; } });
Object.defineProperty(exports, "deleteProject", { enumerable: true, get: function () { return projects_1.deleteProject; } });
Object.defineProperty(exports, "getProjectFeedback", { enumerable: true, get: function () { return projects_1.getProjectFeedback; } });
// Tasks
var tasks_1 = require("./tasks");
Object.defineProperty(exports, "createTask", { enumerable: true, get: function () { return tasks_1.createTask; } });
Object.defineProperty(exports, "listStudentTasks", { enumerable: true, get: function () { return tasks_1.listStudentTasks; } });
Object.defineProperty(exports, "getTaskById", { enumerable: true, get: function () { return tasks_1.getTaskById; } });
Object.defineProperty(exports, "updateTask", { enumerable: true, get: function () { return tasks_1.updateTask; } });
Object.defineProperty(exports, "deleteTask", { enumerable: true, get: function () { return tasks_1.deleteTask; } });
Object.defineProperty(exports, "submitTaskUpdate", { enumerable: true, get: function () { return tasks_1.submitTaskUpdate; } });
Object.defineProperty(exports, "getTaskFeedback", { enumerable: true, get: function () { return tasks_1.getTaskFeedback; } });
// Certifications
var certifications_1 = require("./certifications");
Object.defineProperty(exports, "createCertification", { enumerable: true, get: function () { return certifications_1.createCertification; } });
Object.defineProperty(exports, "listCertifications", { enumerable: true, get: function () { return certifications_1.listCertifications; } });
Object.defineProperty(exports, "getCertificationById", { enumerable: true, get: function () { return certifications_1.getCertificationById; } });
Object.defineProperty(exports, "updateCertification", { enumerable: true, get: function () { return certifications_1.updateCertification; } });
Object.defineProperty(exports, "deleteCertification", { enumerable: true, get: function () { return certifications_1.deleteCertification; } });
Object.defineProperty(exports, "getCertificationFeedback", { enumerable: true, get: function () { return certifications_1.getCertificationFeedback; } });
// Internships
var internships_1 = require("./internships");
Object.defineProperty(exports, "createInternship", { enumerable: true, get: function () { return internships_1.createInternship; } });
Object.defineProperty(exports, "listInternships", { enumerable: true, get: function () { return internships_1.listInternships; } });
Object.defineProperty(exports, "getInternshipById", { enumerable: true, get: function () { return internships_1.getInternshipById; } });
Object.defineProperty(exports, "updateInternship", { enumerable: true, get: function () { return internships_1.updateInternship; } });
Object.defineProperty(exports, "deleteInternship", { enumerable: true, get: function () { return internships_1.deleteInternship; } });
Object.defineProperty(exports, "getInternshipFeedback", { enumerable: true, get: function () { return internships_1.getInternshipFeedback; } });
// Profile
var profile_1 = require("./profile");
Object.defineProperty(exports, "getProfile", { enumerable: true, get: function () { return profile_1.getProfile; } });
Object.defineProperty(exports, "updateProfile", { enumerable: true, get: function () { return profile_1.updateProfile; } });
Object.defineProperty(exports, "getCompleteProfile", { enumerable: true, get: function () { return profile_1.getCompleteProfile; } });
// Rankings
var rankings_1 = require("./rankings");
Object.defineProperty(exports, "getAllRankings", { enumerable: true, get: function () { return rankings_1.getAllRankings; } });
Object.defineProperty(exports, "getStudentRanking", { enumerable: true, get: function () { return rankings_1.getStudentRanking; } });
Object.defineProperty(exports, "getDepartmentRankings", { enumerable: true, get: function () { return rankings_1.getDepartmentRankings; } });
// Surveys
var surveys_1 = require("./surveys");
Object.defineProperty(exports, "listAvailableSurveys", { enumerable: true, get: function () { return surveys_1.listAvailableSurveys; } });
Object.defineProperty(exports, "getSurveyById", { enumerable: true, get: function () { return surveys_1.getSurveyById; } });
Object.defineProperty(exports, "respondToSurvey", { enumerable: true, get: function () { return surveys_1.respondToSurvey; } });
Object.defineProperty(exports, "getSurveyResponses", { enumerable: true, get: function () { return surveys_1.getSurveyResponses; } });
Object.defineProperty(exports, "updateSurveyResponse", { enumerable: true, get: function () { return surveys_1.updateSurveyResponse; } });
// Notifications
var notifications_1 = require("../notifications");
Object.defineProperty(exports, "myNotifications", { enumerable: true, get: function () { return notifications_1.listNotifications; } });
