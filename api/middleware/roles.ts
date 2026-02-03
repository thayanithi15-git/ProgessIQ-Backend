import { authenticate, authorizeRoles } from './auth';

export const requireStudent = [authenticate, authorizeRoles('STUDENT') as any];
export const requireMentor = [authenticate, authorizeRoles('MENTOR') as any];
export const requireAdmin = [authenticate, authorizeRoles('ADMIN') as any];
