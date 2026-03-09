import { Request, Response } from 'express';
import Approval from '../../models/Approval';
import Project from '../../models/Project';
import Task from '../../models/Task';
import Internship from '../../models/Internship';
import Certification from '../../models/Certification';
import Student from '../../models/Student';
import Feedback from '../../models/Feedback';
import Point from '../../models/Point';

const toUiStatus = (status: string) => {
  if (status === 'APPROVED') return 'Approved';
  if (status === 'REJECTED') return 'Rejected';
  return 'Pending';
};

const toEntityStatus = (status: string) => (status === 'Approved' ? 'APPROVED' : status === 'Rejected' ? 'REJECTED' : 'PENDING');

async function buildApprovalsFromEntities(mentorId: string) {
  const [projects, tasks, internships, certifications] = await Promise.all([
    Project.find({ mentorId }).populate('studentId', 'firstName lastName'),
    Task.find({ mentorId }).populate('studentId', 'firstName lastName'),
    Internship.find({ mentorId }).populate('studentId', 'firstName lastName'),
    Certification.find({ mentorId }).populate('studentId', 'firstName lastName')
  ]);

  const mapEntity = (entity: any, entityType: 'PROJECT' | 'TASK' | 'INTERNSHIP' | 'CERTIFICATION', title: string, submittedDate: Date) => ({
    id: entity._id.toString(),
    entityId: entity._id.toString(),
    studentId: entity.studentId?._id?.toString(),
    studentName: `${entity.studentId?.firstName || ''} ${entity.studentId?.lastName || ''}`.trim(),
    entityType,
    entityTitle: title,
    submittedDate,
    status: toUiStatus(entity.status || 'PENDING')
  });

  return [
    ...projects.map((p: any) => mapEntity(p, 'PROJECT', p.title, p.completedAt || p.createdAt || new Date())),
    ...tasks.map((t: any) => mapEntity(t, 'TASK', t.title, t.dueDate || t.createdAt || new Date())),
    ...internships.map((i: any) => mapEntity(i, 'INTERNSHIP', `${i.companyName} - ${i.role}`, i.from || i.createdAt || new Date())),
    ...certifications.map((c: any) => mapEntity(c, 'CERTIFICATION', c.title, c.to || c.createdAt || new Date()))
  ].sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime());
}

export const listApprovals = async (req: Request, res: Response) => {
  try {
    const mentorId = (req as any).user.mentorId || (req as any).user.id;
    const data = await buildApprovalsFromEntities(mentorId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch approvals', error: error.message });
  }
};

export const updateApproval = async (req: Request, res: Response) => {
  try {
    const mentorId = (req as any).user.mentorId || (req as any).user.id;
    const { id } = req.params;
    const { entityType, status, points = 0, feedback = '' } = req.body;

    if (!entityType || !status) {
      return res.status(400).json({ success: false, message: 'entityType and status are required' });
    }

    const normalizedStatus = toEntityStatus(status);
    const modelMap: Record<string, any> = {
      PROJECT: Project,
      TASK: Task,
      INTERNSHIP: Internship,
      CERTIFICATION: Certification
    };
    const targetModel = modelMap[entityType];
    if (!targetModel) {
      return res.status(400).json({ success: false, message: 'Invalid entityType' });
    }

    const entity = await targetModel.findById(id);
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }
    if (entity.mentorId.toString() !== mentorId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    entity.status = normalizedStatus;
    await entity.save();

    const studentId = entity.studentId?.toString();

    if (feedback && studentId) {
      await Feedback.findOneAndUpdate(
        { studentId, mentorId, source: entityType, sourceId: entity._id },
        { studentId, mentorId, source: entityType, sourceId: entity._id, message: feedback, createdAt: new Date() },
        { upsert: true, new: true }
      );
    }

    let awardedPoint = null;
    if (normalizedStatus === 'APPROVED' && Number(points) > 0 && studentId) {
      awardedPoint = await Point.create({
        studentId,
        mentorId,
        source: entityType,
        referenceId: entity._id,
        points: Number(points),
        description: feedback || `${entityType} approved by mentor`,
        awardedOn: new Date()
      });

      await Student.findByIdAndUpdate(studentId, { $inc: { rewardPoints: Number(points) } });
    }

    const approval = await Approval.findOneAndUpdate(
      { entityType, entityId: entity._id, studentId, mentorId },
      {
        entityType,
        entityId: entity._id,
        studentId,
        mentorId,
        status,
        approvedAt: new Date(),
        feedback,
        pointsAwarded: normalizedStatus === 'APPROVED' ? Number(points) : 0
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Approval updated successfully',
      data: {
        approval,
        entityStatus: entity.status,
        point: awardedPoint
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update approval', error: error.message });
  }
};
