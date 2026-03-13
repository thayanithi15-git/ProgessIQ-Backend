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
      status: 'PENDING',
      createdByMentor: false
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
    
    // Status mapping equivalent to front-end for students
    if (status) {
      if (status === 'ALL') {
        // no filter
      } else {
        filter.status = status;
      }
    }

    const projects = await Project.find(filter)
      .populate('mentorId', 'firstName lastName department')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip as string))
      .limit(parseInt(limit as string));

    const total = await Project.countDocuments(filter);

    res.json({
      success: true,
      data: {
        projects,
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

    res.json({
      success: true,
      data: project
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

    // Allow update only if not approved or rejected or submitted
    if (['APPROVED', 'REJECTED', 'SUBMITTED'].includes(project.status)) {
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

    // Allow delete only if pending and not mentor created
    if (project.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Cannot delete project after it has been worked on' });
    }

    if (project.createdByMentor) {
      return res.status(403).json({ success: false, message: 'Cannot delete a project assigned by a mentor' });
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
 * SUBMIT PROJECT UPDATE
 * PUT /api/student/projects/:id/complete
 */
export const submitProjectUpdate = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;
    const { completedAt, submissionNote, githubLink, websiteLink } = req.body;

    const project = await Project.findOne({ _id: id, studentId });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (['APPROVED', 'SUBMITTED'].includes(project.status)) {
      return res.status(400).json({ success: false, message: 'Project already submitted or approved' });
    }

    const updated = await Project.findByIdAndUpdate(
      id,
      {
        status: 'SUBMITTED',
        completedAt: completedAt || new Date(),
        submissionNote: submissionNote || project.submissionNote || '',
        githubLink: githubLink !== undefined ? githubLink : project.githubLink,
        websiteLink: websiteLink !== undefined ? websiteLink : project.websiteLink,
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Project submitted for review',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error submitting project', error });
  }
};

/**
 * START PROJECT (mark In Progress)
 * PUT /api/student/projects/:id/start
 */
export const startProject = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;

    const project = await Project.findOne({ _id: id, studentId });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Project can only be started when PENDING' });
    }

    const updated = await Project.findByIdAndUpdate(id, { status: 'IN_PROGRESS' }, { new: true });

    res.json({
      success: true,
      message: 'Project started',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error starting project', error });
  }
};

/**
 * GET PROJECT FEEDBACK/REJECTION REASON (Legacy/Compatibility)
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
