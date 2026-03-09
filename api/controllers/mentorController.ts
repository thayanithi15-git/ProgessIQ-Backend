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

const getMentorId = (req: Request) => (req as any).user.mentorId || (req as any).user.id;

export const getAssignedStudents = async (req: Request, res: Response) => {
  try {
    const mentorId = getMentorId(req);

    const mappings = await MentorStudentMapping.find({ mentorId, isActive: true }).select('studentId');
    const studentIds = mappings.map(m => m.studentId);

    const students = await Student.find({ _id: { $in: studentIds } }).populate('userId', 'email');
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

    const data = students.map((s: any) => ({
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

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch assigned students', error: error.message });
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
