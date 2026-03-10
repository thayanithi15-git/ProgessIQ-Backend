import Student from '../../models/Student';
import Mentor from '../../models/Mentor';
import MentorStudentMapping from '../../models/MentorStudentMapping';
import { Request, Response } from 'express';

/**
 * GET COMPLETE PROFILE
 * GET /api/student/profile
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;

    const student = await Student.findById(studentId).populate({
      path: 'userId',
      select: 'email'
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get mentor info via mapping
    const mapping = await MentorStudentMapping.findOne({ studentId, isActive: true }).populate('mentorId');
    const mentor = mapping?.mentorId as any;

    res.json({
      success: true,
      data: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.userId?.email,
        gender: student.gender,
        dob: student.dob,
        phone: student.phone,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        place: student.place,
        department: student.department,
        year: student.year,
        academicYear: student.academicYear,
        status: student.status,
        rewardPoints: student.rewardPoints,
        createdAt: student.createdAt,
        mentor: mentor ? {
          id: mentor._id,
          name: mentor.name,
          email: mentor.email,
          department: mentor.department,
          expertise: mentor.expertise || [],
          phone: mentor.contactNo || null
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching profile', error });
  }
};

/**
 * UPDATE PROFILE (not name, email, password)
 * PUT /api/student/profile
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;

    // Fields that cannot be updated
    const restrictedFields = ['firstName', 'lastName', 'email', 'userId', 'createdAt'];

    // Remove restricted fields from request
    const updateData: any = {};
    Object.keys(req.body).forEach(key => {
      if (!restrictedFields.includes(key)) {
        updateData[key] = req.body[key];
      }
    });

    const updated = await Student.findByIdAndUpdate(studentId, updateData, { new: true });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating profile', error });
  }
};

/**
 * GET ALL PROFILE DETAILS (Complete Profile)
 * GET /api/student/profile/complete
 */
export const getCompleteProfile = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;

    const student = await Student.findById(studentId).populate({
      path: 'userId',
      select: 'email'
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get mentor with all details via mapping
    const mapping = await MentorStudentMapping.findOne({ studentId, isActive: true }).populate('mentorId');
    const mentor = mapping?.mentorId as any;

    res.json({
      success: true,
      data: {
        // Personal Information
        personalInfo: {
          id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.userId?.email,
          gender: student.gender,
          dob: student.dob,
          phone: student.phone,
          place: student.place,
          status: student.status
        },

        // Family Information
        familyInfo: {
          parentName: student.parentName,
          parentPhone: student.parentPhone
        },

        // Academic Information
        academicInfo: {
          department: student.department,
          year: student.year,
          academicYear: student.academicYear
        },

        // Achievement Information
        achievementInfo: {
          rewardPoints: student.rewardPoints
        },

        // Mentor Information
        mentorInfo: mentor ? {
          id: mentor._id,
          name: mentor.name,
          email: mentor.email,
          department: mentor.department,
          expertise: mentor.expertise || [],
          phone: mentor.contactNo || null,
          experience: mentor.experience || mentor.designation || null
        } : null,

        // Account Information
        accountInfo: {
          createdAt: student.createdAt,
          lastUpdated: student.createdAt
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching complete profile', error });
  }
};
