
export {
  getStudentDashboard,
  getHeatmapData,
  getPointsTrendChart,
  getMonthlyActivityChart,
  getTaskCompletionChart,
  getActivityLogs,
  submitActivityLog
} from './dashboard';

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

export {
  createCertification,
  listCertifications,
  getCertificationById,
  updateCertification,
  deleteCertification,
  getCertificationFeedback
} from './certifications';

export {
  createInternship,
  listInternships,
  getInternshipById,
  updateInternship,
  deleteInternship,
  getInternshipFeedback
} from './internships';

export {
  getProfile,
  updateProfile,
  getCompleteProfile,
  getSocialLinks,
  updateSocialLinks
} from './profile';

export {
  getAllRankings,
  getStudentRanking,
  getDepartmentRankings
} from './rankings';

export {
  listAvailableSurveys,
  getSurveyById,
  respondToSurvey,
  getSurveyResponses,
  updateSurveyResponse
} from './surveys';

export { listNotifications as myNotifications } from '../notifications';
