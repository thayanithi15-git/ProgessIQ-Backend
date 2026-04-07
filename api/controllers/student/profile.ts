import Student from '../../models/Student';
import Mentor from '../../models/Mentor';
import MentorStudentMapping from '../../models/MentorStudentMapping';
import OnlineProfile from '../../models/OnlineProfile';
import Point from '../../models/Point';
import { Request, Response } from 'express';

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

    const mapping = await MentorStudentMapping.findOne({ studentId, isActive: true }).populate('mentorId');
    const mentor = mapping?.mentorId as any;

    const pointsData = await Point.find({ studentId });
    const calculatedPoints = pointsData.reduce((sum: number, p: any) => sum + p.points, 0);

    if (student.rewardPoints !== calculatedPoints) {
      await Student.findByIdAndUpdate(studentId, { rewardPoints: calculatedPoints });
      student.rewardPoints = calculatedPoints;
    }

    res.json({
      success: true,
      data: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: (student.userId as any)?.email,
        gender: student.gender,
        dob: student.dob,
        phone: student.phone,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        place: student.place,
        department: student.department,
        year: student.year,
        academicYear: student.academicYear,
        rollNo: student.rollNo,
        cgpa: student.cgpa,
        arrearCount: student.arrearCount,
        familyIncome: student.familyIncome,
        goodAt: student.goodAt,
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

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;

    const restrictedFields = ['firstName', 'lastName', 'email', 'userId', 'createdAt'];

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

    const mapping = await MentorStudentMapping.findOne({ studentId, isActive: true }).populate('mentorId');
    const mentor = mapping?.mentorId as any;

    const pointsData = await Point.find({ studentId });
    const calculatedPoints = pointsData.reduce((sum: number, p: any) => sum + p.points, 0);

    if (student.rewardPoints !== calculatedPoints) {
      await Student.findByIdAndUpdate(studentId, { rewardPoints: calculatedPoints });
      student.rewardPoints = calculatedPoints;
    }

    res.json({
      success: true,
      data: {

        personalInfo: {
          id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: (student.userId as any)?.email,
          gender: student.gender,
          dob: student.dob,
          phone: student.phone,
          place: student.place,
          status: student.status,
          rollNo: student.rollNo,
          rewardPoints: student.rewardPoints
        },

        familyInfo: {
          parentName: student.parentName,
          parentPhone: student.parentPhone,
          familyIncome: student.familyIncome
        },

        academicInfo: {
          department: student.department,
          year: student.year,
          academicYear: student.academicYear,
          cgpa: student.cgpa,
          arrearCount: student.arrearCount,
          goodAt: student.goodAt
        },

        achievementInfo: {
          rewardPoints: student.rewardPoints
        },

        mentorInfo: mentor ? {
          id: mentor._id,
          name: mentor.name,
          email: mentor.email,
          department: mentor.department,
          expertise: mentor.expertise || [],
          phone: mentor.contactNo || null,
          experience: mentor.experience || mentor.designation || null
        } : null,

        accountInfo: {
          createdAt: student.createdAt,
          lastUpdated: (student as any).updatedAt || student.createdAt
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching complete profile', error });
  }
};

export const getSocialLinks = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    let profile = await OnlineProfile.findOne({ studentId });
    if (!profile) return res.json({ success: true, data: null });
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching social links', error });
  }
};

export const updateSocialLinks = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { github, linkedin, leetcode, portfolio, codechef } = req.body;
    let profile = await OnlineProfile.findOne({ studentId });
    if (profile) {
      if (github !== undefined) profile.github = github;
      if (linkedin !== undefined) profile.linkedin = linkedin;
      if (leetcode !== undefined) profile.leetcode = leetcode;
      if (portfolio !== undefined) profile.portfolio = portfolio;
      if (codechef !== undefined) profile.codechef = codechef;
      await profile.save();
    } else {
      profile = new OnlineProfile({ studentId, github, linkedin, leetcode, portfolio, codechef });
      await profile.save();
    }
    res.json({ success: true, message: 'Social links updated', data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating social links', error });
  }
};
