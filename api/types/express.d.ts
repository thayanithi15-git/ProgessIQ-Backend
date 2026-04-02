import { UserDocument } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        email: string;
        studentId?: string;
        mentorId?: string;
      };
    }
  }
}

export {};
