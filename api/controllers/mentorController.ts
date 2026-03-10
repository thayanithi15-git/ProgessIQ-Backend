import { Request, Response } from 'express';
import MentorStudentMapping from '../models/MentorStudentMapping';
import Student from '../models/Student';
import Approval from '../models/Approval';
import Feedback from '../models/Feedback';
import Point from '../models/Point';
import mongoose from 'mongoose';
import Project from '../models/Project';
import Task from '../models/Task';
import Certification from '../models/Certification';
import Internship from '../models/Internship';
import Mentor from '../models/Mentor';

const getMentorId = (req: Request) => (req as any).user.mentorId || (req as any).user.id;

export const getMentorProfile = async (req: Request, res: Response) => {
  try {
    const mentorId = (req as any).user.mentorId;
    const email = (req as any).user.email;

    const mentor = mentorId
      ? await Mentor.findById(mentorId)
      : await Mentor.findOne({ email });

    if (!mentor) {
      return res.status(404).json({ success: false, message: 'Mentor profile not found' });
    }

    res.json({
      success: true,
      data: {
        id: mentor._id,
        name: mentor.name,
        email: mentor.email,
        department: mentor.department,
        designation: mentor.designation,
        contactNo: mentor.contactNo,
        place: mentor.place,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch mentor profile', error: error.message });
  }
};

export const getAssignedStudents = async (req: Request, res: Response) => {
  try {
    const mentorId = getMentorId(req);
    const {
      page = 1,
      limit = 20,
      search = '',
      department,
      year,
      academicYear,
      place,
      status,
      minPoints,
      maxPoints,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query as any;
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (parsedPage - 1) * parsedLimit;

    const mappings = await MentorStudentMapping.find({ mentorId, isActive: true }).select('studentId');
    const studentIds = mappings.map(m => m.studentId);

    const filter: any = { _id: { $in: studentIds } };
    if (department) filter.department = department;
    if (year) filter.year = year;
    if (academicYear) filter.academicYear = academicYear;
    if (place) filter.place = { $regex: String(place), $options: 'i' };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await Student.find(filter).populate('userId', 'email');
    const pointsAgg = await Point.aggregate([
      { $match: { studentId: { $in: studentIds } } },
      { $group: { _id: '$studentId', points: { $sum: '$points' } } }
    ]);
    const pointsMap: Record<string, number> = {};
    pointsAgg.forEach((p) => { pointsMap[p._id.toString()] = p.points; });

    const projectAgg = await Project.aggregate([
      { $match: { studentId: { $in: studentIds }, status: 'APPROVED' } },
      { $group: { _id: '$studentId', total: { $sum: 1 } } }
    ]);
    const taskAgg = await Task.aggregate([
      { $match: { studentId: { $in: studentIds }, status: { $in: ['COMPLETED', 'APPROVED'] } } },
      { $group: { _id: '$studentId', total: { $sum: 1 } } }
    ]);
    const certAgg = await Certification.aggregate([
      { $match: { studentId: { $in: studentIds }, status: 'APPROVED' } },
      { $group: { _id: '$studentId', total: { $sum: 1 } } }
    ]);
    const internshipAgg = await Internship.aggregate([
      { $match: { studentId: { $in: studentIds }, status: 'APPROVED' } },
      { $group: { _id: '$studentId', total: { $sum: 1 } } }
    ]);
    const projectMap: Record<string, number> = {};
    const taskMap: Record<string, number> = {};
    const certMap: Record<string, number> = {};
    const internshipMap: Record<string, number> = {};
    projectAgg.forEach((p) => { projectMap[p._id.toString()] = p.total; });
    taskAgg.forEach((p) => { taskMap[p._id.toString()] = p.total; });
    certAgg.forEach((p) => { certMap[p._id.toString()] = p.total; });
    internshipAgg.forEach((p) => { internshipMap[p._id.toString()] = p.total; });

    let data = students.map((s: any) => ({
      id: s._id,
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.userId?.email || '',
      department: s.department,
      year: s.year,
      academicYear: s.academicYear,
      phone: s.phone,
      place: s.place,
      points: pointsMap[s._id.toString()] || 0,
      projectsCompleted: projectMap[s._id.toString()] || 0,
      tasksCompleted: taskMap[s._id.toString()] || 0,
      certificationsCompleted: certMap[s._id.toString()] || 0,
      internshipsCompleted: internshipMap[s._id.toString()] || 0,
      lastActive: s.createdAt,
      status: s.status === 'Active' ? 'Active' : 'Inactive'
    }));

    if (minPoints !== undefined && minPoints !== null && String(minPoints).trim() !== '') {
      const min = Number(minPoints);
      if (!Number.isNaN(min)) data = data.filter((student) => student.points >= min);
    }
    if (maxPoints !== undefined && maxPoints !== null && String(maxPoints).trim() !== '') {
      const max = Number(maxPoints);
      if (!Number.isNaN(max)) data = data.filter((student) => student.points <= max);
    }

    const sorted = [...data].sort((a: any, b: any) => {
      const dir = sortOrder === 'desc' ? -1 : 1;
      if (sortBy === 'points') return (a.points - b.points) * dir;
      if (sortBy === 'department') return (a.department || '').localeCompare(b.department || '') * dir;
      if (sortBy === 'year') return (a.year || '').localeCompare(b.year || '') * dir;
      const aName = `${a.firstName} ${a.lastName}`.trim();
      const bName = `${b.firstName} ${b.lastName}`.trim();
      return aName.localeCompare(bName) * dir;
    });

    const paginated = sorted.slice(skip, skip + parsedLimit);

    res.json({
      success: true,
      data: paginated,
      pagination: {
        total: sorted.length,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(sorted.length / parsedLimit)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch assigned students', error: error.message });
  }
};

export const getAssignedStudentProfile = async (req: Request, res: Response) => {
  try {
    const mentorId = getMentorId(req);
    const { id } = req.params;

    const isMapped = await MentorStudentMapping.findOne({ mentorId, studentId: id, isActive: true });
    if (!isMapped) {
      return res.status(403).json({ success: false, message: 'Student not mapped to this mentor' });
    }

    const student = await Student.findById(id).populate('userId', 'email');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const [projects, tasks, certifications, internships, points] = await Promise.all([
      Project.find({ studentId: id, mentorId }),
      Task.find({ studentId: id, mentorId }),
      Certification.find({ studentId: id, mentorId }),
      Internship.find({ studentId: id, mentorId }),
      Point.aggregate([
        { $match: { studentId: new mongoose.Types.ObjectId(id) } },
        { $group: { _id: '$studentId', totalPoints: { $sum: '$points' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        profile: {
          id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: (student as any).userId?.email || '',
          department: student.department,
          year: student.year,
          academicYear: student.academicYear,
          phone: student.phone,
          place: student.place,
          status: student.status
        },
        stats: {
          totalPoints: points[0]?.totalPoints || 0,
          projects: { total: projects.length, approved: projects.filter(p => p.status === 'APPROVED').length, pending: projects.filter(p => p.status === 'PENDING').length },
          tasks: { total: tasks.length, approved: tasks.filter(t => t.status === 'APPROVED').length, pending: tasks.filter(t => t.status === 'PENDING').length },
          certifications: { total: certifications.length, approved: certifications.filter(c => c.status === 'APPROVED').length, pending: certifications.filter(c => c.status === 'PENDING').length },
          internships: { total: internships.length, approved: internships.filter(i => i.status === 'APPROVED').length, pending: internships.filter(i => i.status === 'PENDING').length }
        },
        recent: {
          projects: projects.slice(0, 5),
          tasks: tasks.slice(0, 5),
          certifications: certifications.slice(0, 5),
          internships: internships.slice(0, 5)
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch student profile', error: error.message });
  }
};

export const approveEntity = async (req: Request, res: Response) => {
  try {
    const mentorId = getMentorId(req);
    const { entityType, entityId, studentId, status } = req.body;
    if (!entityType || !entityId || !studentId || !status) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const approval = new Approval({ entityType, entityId, studentId, mentorId, status, approvedAt: new Date() });
    await approval.save();
    res.json({ success: true, data: approval });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to approve entity', error: error.message });
  }
};

export const giveFeedback = async (req: Request, res: Response) => {
  try {
    const mentorId = getMentorId(req);
    const { studentId, message, source, sourceId } = req.body;
    if (!studentId || !message) return res.status(400).json({ success: false, message: 'Invalid payload' });
    const feedback = new Feedback({ studentId, mentorId, source, sourceId, message });
    await feedback.save();
    res.json({ success: true, data: feedback });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to save feedback', error: error.message });
  }
};

export const awardPoints = async (req: Request, res: Response) => {
  try {
    const mentorId = getMentorId(req);
    const { studentId, source, points, referenceId, description } = req.body;
    if (!studentId || !source || typeof points !== 'number') {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const point = new Point({ studentId, mentorId, source, referenceId, description, points });
    await point.save();
    await Student.findByIdAndUpdate(studentId, { $inc: { rewardPoints: points } });
    res.json({ success: true, data: point });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to award points', error: error.message });
  }
};
