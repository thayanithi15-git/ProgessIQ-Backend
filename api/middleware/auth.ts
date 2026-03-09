import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import User from '../models/User';
import Student from '../models/Student';
import Mentor from '../models/Mentor';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token) as { id: string; role: string };
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    
    let userData: any = { id: user._id.toString(), role: user.role, email: user.email };
    
    if (user.role === 'STUDENT') {
      const student = await Student.findOne({ userId: user._id });
      if (student) {
        userData.studentId = student._id.toString();
      }
    } else if (user.role === 'MENTOR') {
      const mentor = await Mentor.findOne({ email: user.email });
      if (mentor) {
        userData.mentorId = mentor._id.toString();
      }
    }
    
    (req as any).user = userData;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const authorizeRoles = (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || !roles.includes(user.role)) return res.status(403).json({ message: 'Forbidden' });
  next();
};
