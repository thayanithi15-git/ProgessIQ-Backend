import Project from '../../models/Project';
import Feedback from '../../models/Feedback';
import { Request, Response } from 'express';

/**
 * CREATE PROJECT
 * POST /api/student/projects
 */
export const createProject = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { mentorId, title, description, githubLink, websiteLink, completedAt } = req.body;

    if (!mentorId || !title || !description) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const project = new Project({
      studentId,
      mentorId,
      title,
      description,
      githubLink,
      websiteLink,
      completedAt: new Date(completedAt),
      status: 'PENDING'
    });

    await project.save();

    res.status(201).json({
      success: true,
      message: 'Project created',
      data: project
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating project', error });
  }
};

/**
 * GET ALL PROJECTS
 * GET /api/student/projects
 */
export const listStudentProjects = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { status, limit = 20, skip = 0 } = req.query;

    const filter: any = { studentId };
    if (status) filter.status = status;

    const projects = await Project.find(filter)
      .populate('mentorId', 'firstName lastName department')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip as string))
      .limit(parseInt(limit as string));

    const total = await Project.countDocuments(filter);

    // Get feedback for each project
    const projectsWithFeedback = await Promise.all(
      projects.map(async (project) => {
        const feedback = await Feedback.findOne({
          studentId,
          source: 'PROJECT',
          sourceId: project._id
        });
        return {
          ...project.toObject(),
          feedback: feedback?.message || null
        };
      })
    );

    res.json({
      success: true,
      data: {
        projects: projectsWithFeedback,
        pagination: {
          total,
          limit: parseInt(limit as string),
          skip: parseInt(skip as string)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching projects', error });
  }
};

/**
 * GET SINGLE PROJECT
 * GET /api/student/projects/:id
 */
export const getProjectById = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;

    const project = await Project.findOne({ _id: id, studentId }).populate('mentorId', 'firstName lastName');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Get feedback
    const feedback = await Feedback.findOne({
      studentId,
      source: 'PROJECT',
      sourceId: id
    }).populate('mentorId', 'firstName lastName');

    res.json({
      success: true,
      data: {
        ...project.toObject(),
        feedback: feedback ? {
          id: feedback._id,
          mentorName: `${(feedback.mentorId as any)?.firstName} ${(feedback.mentorId as any)?.lastName}`,
          message: feedback.message,
          createdAt: feedback.createdAt
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching project', error });
  }
};

/**
 * UPDATE PROJECT
 * PUT /api/student/projects/:id
 */
export const updateProject = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;

    const project = await Project.findOne({ _id: id, studentId });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Allow update only if not approved or rejected
    if (project.status === 'APPROVED' || project.status === 'REJECTED') {
      return res.status(400).json({ success: false, message: 'Cannot update project with this status' });
    }

    const updated = await Project.findByIdAndUpdate(
      id,
      { ...req.body, status: 'PENDING' }, // Reset to pending on edit
      { new: true }
    );

    res.json({
      success: true,
      message: 'Project updated',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating project', error });
  }
};

/**
 * DELETE PROJECT
 * DELETE /api/student/projects/:id
 */
export const deleteProject = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;

    const project = await Project.findOne({ _id: id, studentId });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Allow delete only if pending
    if (project.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Cannot delete project with this status' });
    }

    await Project.findByIdAndDelete(id);
    await Feedback.deleteOne({ sourceId: id, source: 'PROJECT' });

    res.json({
      success: true,
      message: 'Project deleted'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting project', error });
  }
};

/**
 * GET PROJECT FEEDBACK/REJECTION REASON
 * GET /api/student/projects/:id/feedback
 */
export const getProjectFeedback = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;

    const feedback = await Feedback.findOne({
      studentId,
      source: 'PROJECT',
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
        createdAt: feedback.createdAt,
        type: 'REJECTION'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching feedback', error });
  }
};
