// Dashboard
export {
  getStudentDashboard,
  getHeatmapData,
  getPointsTrendChart,
  getMonthlyActivityChart,
  getTaskCompletionChart,
  getActivityLogs,
  submitActivityLog
} from './dashboard';

// Projects
export { 
  createProject, 
  listStudentProjects, 
  getProjectById, 
  updateProject, 
  deleteProject, 
  getProjectFeedback,
  submitProjectUpdate,
  startProject
} from './projects';

// Tasks
export { 
  createTask,
  listStudentTasks, 
  getTaskById,
  updateTask,
  deleteTask,
  submitTaskUpdate,
  startTask,
  getTaskFeedback 
} from './tasks';

// Certifications
export {
  createCertification,
  listCertifications,
  getCertificationById,
  updateCertification,
  deleteCertification,
  getCertificationFeedback
} from './certifications';

// Internships
export {
  createInternship,
  listInternships,
  getInternshipById,
  updateInternship,
  deleteInternship,
  getInternshipFeedback
} from './internships';

// Profile
export {
  getProfile,
  updateProfile,
  getCompleteProfile,
  getSocialLinks,
  updateSocialLinks
} from './profile';

// Rankings
export {
  getAllRankings,
  getStudentRanking,
  getDepartmentRankings
} from './rankings';

// Surveys
export { 
  listAvailableSurveys, 
  getSurveyById,
  respondToSurvey,
  getSurveyResponses,
  updateSurveyResponse
} from './surveys';

// Notifications
export { listNotifications as myNotifications } from '../notifications';
