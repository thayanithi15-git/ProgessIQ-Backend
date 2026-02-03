import { Request, Response } from 'express';
import User from '../models/User';
import Student from '../models/Student';
import Mentor from '../models/Mentor';
import bcrypt from 'bcrypt';
import MentorStudentMapping from '../models/MentorStudentMapping';

export const createStudent = async (req: Request, res: Response) => {
  const data = req.body;
  const password = data.password || 'ChangeMe123!';
  const existing = await User.findOne({ email: data.email });
  if (existing) return res.status(400).json({ message: 'Email already exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = new User({ role: 'STUDENT', email: data.email, passwordHash });
  await user.save();

  const student = new Student({ ...data, userId: user._id });
  await student.save();
  res.status(201).json({ student, userId: user._id });
};

export const getStudents = async (req: Request, res: Response) => {
  const students = await Student.find().populate('userId', 'email');
  res.json({ students });
};

export const updateStudent = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updated = await Student.findByIdAndUpdate(id, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.json({ student: updated });
};

export const deleteStudent = async (req: Request, res: Response) => {
  const { id } = req.params;
  const student = await Student.findByIdAndDelete(id);
  if (!student) return res.status(404).json({ message: 'Not found' });
  await User.findByIdAndDelete(student.userId);
  res.json({ message: 'Deleted' });
};

// Mentor CRUD
export const createMentor = async (req: Request, res: Response) => {
  const data = req.body;
  const existing = await Mentor.findOne({ email: data.email });
  if (existing) return res.status(400).json({ message: 'Mentor email exists' });

  const mentor = new Mentor(data);
  await mentor.save();
  res.status(201).json({ mentor });
};

export const getMentors = async (req: Request, res: Response) => {
  const mentors = await Mentor.find();
  res.json({ mentors });
};

export const updateMentor = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updated = await Mentor.findByIdAndUpdate(id, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.json({ mentor: updated });
};

export const deleteMentor = async (req: Request, res: Response) => {
  const { id } = req.params;
  const mentor = await Mentor.findByIdAndDelete(id);
  if (!mentor) return res.status(404).json({ message: 'Not found' });
  // optionally reassign mappings
  await MentorStudentMapping.deleteMany({ mentorId: mentor._id });
  res.json({ message: 'Deleted' });
};

export const mapStudentsToMentor = async (req: Request, res: Response) => {
  const { mentorId, studentIds } = req.body; // studentIds: []
  if (!mentorId || !Array.isArray(studentIds)) return res.status(400).json({ message: 'Invalid payload' });

  const mappings = studentIds.map((sId: string) => ({ mentorId, studentId: sId }));
  await MentorStudentMapping.insertMany(mappings);
  res.json({ message: 'Mapped', count: mappings.length });
};