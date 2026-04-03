import { Request, Response } from 'express';
import Internship from '../../models/Internship';
import Student from '../../models/Student';
import Mentor from '../../models/Mentor';

export const listInternships = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      search = '',
      status = '',
      type = '',
      paid = '',
      department = '',
      year = ''
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const filter: any = {};

    if (status) filter.status = status;
    if (type && type !== 'all') filter.type = type;
    if (paid && paid !== 'all') filter.paid = paid === 'true';

    // Advanced search across company and role
    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } }
      ];
    }

    // Student filter (dept, year)
    const studentFilter: any = {};
    if (department && department !== 'all') studentFilter.department = department;
    if (year && year !== 'all') studentFilter.year = year;

    let studentIds: any[] = [];
    if (Object.keys(studentFilter).length > 0) {
      const students = await Student.find(studentFilter).select('_id');
      studentIds = students.map(s => s._id);
      filter.studentId = { $in: studentIds };
    }

    const internships = await Internship.find(filter)
      .populate('studentId', 'firstName lastName department year email')
      .populate('mentorId', 'firstName lastName email')
      .sort({ _id: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Internship.countDocuments(filter);

    const mapped = internships.map((intern: any) => ({
      id: intern._id,
      companyName: intern.companyName,
      companyUrl: intern.companyUrl,
      role: intern.role,
      type: intern.type,
      paid: intern.paid,
      from: intern.from,
      to: intern.to,
      description: intern.description,
      status: intern.status,
      student: intern.studentId ? {
        name: `${intern.studentId.firstName} ${intern.studentId.lastName}`,
        department: intern.studentId.department,
        year: intern.studentId.year,
        email: intern.studentId.email
      } : null,
      mentor: intern.mentorId ? {
        name: `${intern.mentorId.firstName} ${intern.mentorId.lastName}`,
        email: intern.mentorId.email
      } : null
    }));

    res.json({
      internships: mapped,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const viewInternship = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const intern: any = await Internship.findById(id)
      .populate('studentId', 'firstName lastName department year email rollNo place academicYear familyIncome cgpa arrearCount goodAt')
      .populate('mentorId', 'firstName lastName email');

    if (!intern) return res.status(404).json({ message: 'Internship not found' });

    res.json({
      internship: {
        id: intern._id,
        companyName: intern.companyName,
        companyUrl: intern.companyUrl,
        role: intern.role,
        type: intern.type,
        paid: intern.paid,
        from: intern.from,
        to: intern.to,
        description: intern.description,
        status: intern.status,
        student: intern.studentId ? {
          name: `${intern.studentId.firstName} ${intern.studentId.lastName}`,
          firstName: intern.studentId.firstName,
          lastName: intern.studentId.lastName,
          department: intern.studentId.department,
          year: intern.studentId.year,
          email: intern.studentId.email,
          rollNo: intern.studentId.rollNo,
          place: intern.studentId.place,
          academicYear: intern.studentId.academicYear,
          familyIncome: intern.studentId.familyIncome,
          cgpa: intern.studentId.cgpa,
          arrearCount: intern.studentId.arrearCount,
          goodAt: intern.studentId.goodAt
        } : null,
        mentor: intern.mentorId ? {
          name: `${intern.mentorId.firstName} ${intern.mentorId.lastName}`,
          email: intern.mentorId.email
        } : null
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
