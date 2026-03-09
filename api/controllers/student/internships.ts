import Internship from '../../models/Internship';
import Feedback from '../../models/Feedback';
import Student from '../../models/Student';
import { Request, Response } from 'express';

/**
 * CREATE INTERNSHIP
 * POST /api/student/internships
 */
export const createInternship = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const studentId = student._id.toString();
    const { mentorId, companyName, companyUrl, role, type, paid, from, to, description } = req.body;

    if (!mentorId || !companyName || !role || !type || !from || !to) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const internship = new Internship({
      studentId,
      mentorId,
      companyName,
      companyUrl,
      role,
      type,
      paid: paid || false,
      from: new Date(from),
      to: new Date(to),
      description,
      status: 'PENDING'
    });

    await internship.save();

    res.status(201).json({
      success: true,
      message: 'Internship created',
      data: internship
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating internship', error });
  }
};

/**
 * GET ALL INTERNSHIPS
 * GET /api/student/internships
 */
export const listInternships = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { status, type, limit = 20, skip = 0 } = req.query;

    const filter: any = { studentId };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const internships = await Internship.find(filter)
      .populate('mentorId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip as string))
      .limit(parseInt(limit as string));

    const total = await Internship.countDocuments(filter);

    const internshipsWithFeedback = await Promise.all(
      internships.map(async (internship) => {
        const feedback = await Feedback.findOne({
          studentId,
          source: 'INTERNSHIP',
          sourceId: internship._id
        });
        const duration = Math.ceil(
          (new Date(internship.to).getTime() - new Date(internship.from).getTime()) /
          (1000 * 60 * 60 * 24)
        );
        return {
          ...internship.toObject(),
          feedback: feedback?.message || null,
          durationDays: duration
        };
      })
    );

    res.json({
      success: true,
      data: {
        internships: internshipsWithFeedback,
        pagination: {
          total,
          limit: parseInt(limit as string),
          skip: parseInt(skip as string)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching internships', error });
  }
};

/**
 * GET SINGLE INTERNSHIP
 * GET /api/student/internships/:id
 */
export const getInternshipById = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;

    const internship = await Internship.findOne({ _id: id, studentId }).populate('mentorId', 'firstName lastName');

    if (!internship) {
      return res.status(404).json({ success: false, message: 'Internship not found' });
    }

    const feedback = await Feedback.findOne({
      studentId,
      source: 'INTERNSHIP',
      sourceId: id
    }).populate('mentorId', 'firstName lastName email');

    const duration = Math.ceil(
      (new Date(internship.to).getTime() - new Date(internship.from).getTime()) /
      (1000 * 60 * 60 * 24)
    );

    const mentor = feedback?.mentorId as any;

    res.json({
      success: true,
      data: {
        ...internship.toObject(),
        durationDays: duration,
        feedback: feedback ? {
          id: feedback._id,
          mentorName: `${mentor?.firstName} ${mentor?.lastName}`,
          message: feedback.message,
          createdAt: feedback.createdAt
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching internship', error });
  }
};

/**
 * UPDATE INTERNSHIP
 * PUT /api/student/internships/:id
 */
export const updateInternship = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;

    const internship = await Internship.findOne({ _id: id, studentId });

    if (!internship) {
      return res.status(404).json({ success: false, message: 'Internship not found' });
    }

    if (internship.status === 'APPROVED' || internship.status === 'REJECTED') {
      return res.status(400).json({ success: false, message: 'Cannot update this internship' });
    }

    const updated = await Internship.findByIdAndUpdate(
      id,
      { ...req.body, status: 'PENDING' },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Internship updated',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating internship', error });
  }
};

/**
 * DELETE INTERNSHIP
 * DELETE /api/student/internships/:id
 */
export const deleteInternship = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;

    const internship = await Internship.findOne({ _id: id, studentId });

    if (!internship) {
      return res.status(404).json({ success: false, message: 'Internship not found' });
    }

    if (internship.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Cannot delete this internship' });
    }

    await Internship.findByIdAndDelete(id);
    await Feedback.deleteOne({ sourceId: id, source: 'INTERNSHIP' });

    res.json({
      success: true,
      message: 'Internship deleted'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting internship', error });
  }
};

/**
 * GET INTERNSHIP FEEDBACK
 * GET /api/student/internships/:id/feedback
 */
export const getInternshipFeedback = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;

    const feedback = await Feedback.findOne({
      studentId,
      source: 'INTERNSHIP',
      sourceId: id
    }).populate('mentorId', 'firstName lastName email');

    if (!feedback) {
      return res.status(404).json({ success: false, message: 'No feedback found' });
    }

    const mentor = feedback.mentorId as any;
    res.json({
      success: true,
      data: {
        id: feedback._id,
        mentor: `${mentor?.firstName} ${mentor?.lastName}`,
        mentorEmail: mentor?.email,
        message: feedback.message,
        createdAt: feedback.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching feedback', error });
  }
};
