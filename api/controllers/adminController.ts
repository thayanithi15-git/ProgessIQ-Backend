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
  const {
    page = "1",
    limit = "20",
    department,
    year,
    status,
    name,
    email,
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);

  const filter: any = {};

  if (department) filter.department = department;
  if (year) filter.year = year;
  if (status) filter.status = status;
  if (req.query.rollNo) filter.rollNo = { $regex: req.query.rollNo, $options: 'i' };
  if (req.query.familyIncome) filter.familyIncome = { $regex: req.query.familyIncome, $options: 'i' };
  if (req.query.minCgpa) filter.cgpa = { $gte: parseFloat(req.query.minCgpa as string) };
  if (req.query.maxArrears) filter.arrearCount = { $lte: parseInt(req.query.maxArrears as string) };
  if (req.query.goodAt) filter.goodAt = { $in: (req.query.goodAt as string).split(',').map(s => s.trim()) };

  // ----- Name search (across firstName and lastName) -----
  if (name) {
    filter.$or = [
      { firstName: { $regex: name, $options: "i" } },
      { lastName: { $regex: name, $options: "i" } }
    ];
  }

  // ----- Email search from User collection -----
  if (email) {
    const users = await User.find({
      email: { $regex: email, $options: "i" },
    }).select("_id");

    const userIds = users.map((u) => u._id);
    filter.userId = { $in: userIds };
  }

  const students = await Student.find(filter)
    .populate("userId", "email")
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  const total = await Student.countDocuments(filter);

  const studentIds = students.map((s) => s._id);

  // Grouped points for real-time accuracy
  const pointsAgg = await require('../models/Point').default.aggregate([
    { $match: { studentId: { $in: studentIds } } },
    { $group: { _id: '$studentId', points: { $sum: '$points' } } }
  ]);
  const pointsMap: Record<string, number> = {};
  pointsAgg.forEach((p: any) => { pointsMap[p._id.toString()] = p.points; });

  const profiles = await require('../models/OnlineProfile').default.find({ studentId: { $in: studentIds } });
  const profileMap: Record<string, any> = {};
  profiles.forEach((p: any) => { profileMap[p.studentId.toString()] = { github: p.github, linkedin: p.linkedin, leetcode: p.leetcode, portfolio: p.portfolio, codechef: p.codechef }; });

  const mappedStudents = students.map((s: any) => {
    const studentData = s.toJSON ? s.toJSON() : s;
    return {
      ...studentData,
      rewardPoints: pointsMap[s._id.toString()] || 0,
      socials: profileMap[s._id.toString()] || null
    };
  });

  res.json({
    students: mappedStudents,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum)
  });
};

export const getStudentById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const student = await Student.findById(id).populate('userId', 'email');
  if (!student) return res.status(404).json({ message: 'Not found' });
  res.json({ student });
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

export const createMentor = async (req: Request, res: Response) => {
  const data = req.body;
  const existing = await Mentor.findOne({ email: data.email });
  if (existing) return res.status(400).json({ message: 'Mentor email exists' });

  const mentor = new Mentor(data);
  await mentor.save();
  res.status(201).json({ mentor });
};


export const getMentors = async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "10",
      department,
      designation,
      place,
      name,
      email,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const filter: any = {};
    if (department && department !== 'all') filter.department = department;
    if (designation && designation !== 'all') filter.designation = designation;
    if (place && place !== 'all') filter.place = place;
    if (name) filter.name = { $regex: name, $options: "i" };
    if (email) filter.email = { $regex: email, $options: "i" };

    const mentors = await Mentor.find(filter)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Mentor.countDocuments(filter);

    res.json({
      mentors,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching mentors', error: error.message });
  }
};

export const getMentorById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const mentor = await Mentor.findById(id);
  if (!mentor) return res.status(404).json({ message: 'Not found' });
  res.json({ mentor });
}

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

export const bulkUploadStudents = async (req: Request, res: Response) => {
  try {
    const { students } = req.body; // Array of student objects from frontend
    if (!Array.isArray(students)) return res.status(400).json({ message: 'Invalid payload' });

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const data of students) {
      try {
        const password = data.password || 'ChangeMe123!';
        const existing = await User.findOne({ email: data.email });
        if (existing) {
          results.failed++;
          results.errors.push({ email: data.email, error: 'Email already exists' });
          continue;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = new User({ role: 'STUDENT', email: data.email, passwordHash });
        await user.save();

        const student = new Student({ ...data, userId: user._id });
        await student.save();
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push({ email: data.email, error: err.message });
      }
    }

    res.status(200).json({ message: 'Bulk upload completed', results });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};