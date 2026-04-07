import Certification from '../../models/Certification';
import Feedback from '../../models/Feedback';
import { Request, Response } from 'express';

export const createCertification = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { mentorId, title, platform, platformLink, from, to } = req.body;

    if (!mentorId || !title || !platform || !platformLink || !from || !to) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const certification = new Certification({
      studentId,
      mentorId,
      title,
      platform,
      platformLink,
      from: new Date(from),
      to: new Date(to),
      status: 'PENDING'
    });

    await certification.save();

    res.status(201).json({
      success: true,
      message: 'Certification created',
      data: certification
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating certification', error });
  }
};

export const listCertifications = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { status, limit = 20, skip = 0 } = req.query;

    const filter: any = { studentId };
    if (status) filter.status = status;

    const certifications = await Certification.find(filter)
      .populate('mentorId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip as string))
      .limit(parseInt(limit as string));

    const total = await Certification.countDocuments(filter);

    const certificationsWithFeedback = await Promise.all(
      certifications.map(async (cert) => {
        const feedback = await Feedback.findOne({
          studentId,
          source: 'CERTIFICATION',
          sourceId: cert._id
        });
        return {
          ...cert.toObject(),
          feedback: feedback?.message || null
        };
      })
    );

    res.json({
      success: true,
      data: {
        certifications: certificationsWithFeedback,
        pagination: {
          total,
          limit: parseInt(limit as string),
          skip: parseInt(skip as string)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching certifications', error });
  }
};

export const getCertificationById = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;

    const certification = await Certification.findOne({ _id: id, studentId }).populate('mentorId', 'firstName lastName');

    if (!certification) {
      return res.status(404).json({ success: false, message: 'Certification not found' });
    }

    const feedback = await Feedback.findOne({
      studentId,
      source: 'CERTIFICATION',
      sourceId: id
    }).populate('mentorId', 'firstName lastName') as any;

    res.json({
      success: true,
      data: {
        ...certification.toObject(),
        feedback: feedback ? {
          id: feedback._id,
          mentorName: `${feedback.mentorId?.firstName} ${feedback.mentorId?.lastName}`,
          message: feedback.message,
          createdAt: feedback.createdAt
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching certification', error });
  }
};

export const updateCertification = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;

    const certification = await Certification.findOne({ _id: id, studentId });

    if (!certification) {
      return res.status(404).json({ success: false, message: 'Certification not found' });
    }

    if (certification.status === 'APPROVED' || certification.status === 'REJECTED') {
      return res.status(400).json({ success: false, message: 'Cannot update this certification' });
    }

    const updated = await Certification.findByIdAndUpdate(
      id,
      { ...req.body, status: 'PENDING' },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Certification updated',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating certification', error });
  }
};

export const deleteCertification = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;

    const certification = await Certification.findOne({ _id: id, studentId });

    if (!certification) {
      return res.status(404).json({ success: false, message: 'Certification not found' });
    }

    if (certification.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Cannot delete this certification' });
    }

    await Certification.findByIdAndDelete(id);
    await Feedback.deleteOne({ sourceId: id, source: 'CERTIFICATION' });

    res.json({
      success: true,
      message: 'Certification deleted'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting certification', error });
  }
};

export const getCertificationFeedback = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;

    const feedback = await Feedback.findOne({
      studentId,
      source: 'CERTIFICATION',
      sourceId: id
    }).populate('mentorId', 'firstName lastName email') as any;

    if (!feedback) {
      return res.status(404).json({ success: false, message: 'No feedback found' });
    }

    res.json({
      success: true,
      data: {
        id: feedback._id,
        mentor: `${feedback.mentorId?.firstName} ${feedback.mentorId?.lastName}`,
        mentorEmail: feedback.mentorId?.email,
        message: feedback.message,
        createdAt: feedback.createdAt,
        type: feedback.feedbackType || 'REJECTION'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching feedback', error });
  }
};
