import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { createObjectCsvWriter } from 'csv-writer';
import moment from 'moment';
import Report from '../../models/Report';
import User from '../../models/User';
import Student from '../../models/Student';
import Mentor from '../../models/Mentor';
import Project from '../../models/Project';
import Internship from '../../models/Internship';
import Certification from '../../models/Certification';
import Point from '../../models/Point';

// Types
interface ReportFilter {
  startDate?: string;
  endDate?: string;
  department?: string[];
  year?: string[];
  status?: string;
  minPoints?: number;
  maxPoints?: number;
  designation?: string;
  projectStatus?: string;
  internshipType?: string;
  internshipStatus?: string;
  certificationStatus?: string;
  platform?: string;
  mentorId?: string;
  includeInactive?: boolean;
  sortBy?: string;
  sortOrder?: string;
  limit?: number;
}

type ReportCategory = 'students' | 'mentors' | 'projects' | 'internships' | 'certifications' | 'performance' | 'comprehensive';
type ReportType = 'pdf' | 'excel' | 'csv';

// Helper function to build query based on filters
const buildQuery = (category: ReportCategory, filters: ReportFilter) => {
  const query: any = {};

  // Date filters
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
  }

  // Department filter
  if (filters.department && filters.department.length > 0) {
    query.department = { $in: filters.department };
  }

  // Year filter
  if (filters.year && filters.year.length > 0) {
    query.year = { $in: filters.year };
  }

  // Status filter
  if (filters.status && filters.status !== 'All') {
    if (category === 'students') {
      query.status = filters.status;
    } else if (category === 'projects') {
      query.status = filters.status;
    }
  }

  // Points filter
  if (filters.minPoints !== undefined || filters.maxPoints !== undefined) {
    query.totalPoints = {};
    if (filters.minPoints !== undefined) query.totalPoints.$gte = filters.minPoints;
    if (filters.maxPoints !== undefined) query.totalPoints.$lte = filters.maxPoints;
  }

  // Designation filter
  if (filters.designation && filters.designation !== 'All') {
    query.designation = filters.designation;
  }

  // Project status filter
  if (filters.projectStatus && filters.projectStatus !== 'All') {
    query.status = filters.projectStatus;
  }

  // Internship filters
  if (filters.internshipType && filters.internshipType !== 'All') {
    query.type = filters.internshipType;
  }
  if (filters.internshipStatus && filters.internshipStatus !== 'All') {
    query.status = filters.internshipStatus;
  }

  // Certification filters
  if (filters.certificationStatus && filters.certificationStatus !== 'All') {
    query.status = filters.certificationStatus;
  }
  if (filters.platform) {
    query.platform = filters.platform;
  }

  // Mentor filter
  if (filters.mentorId) {
    query.mentorId = filters.mentorId;
  }

  // Include inactive - only apply if explicitly excluding inactive
  if (filters.includeInactive === false) {
    if (category === 'students' || category === 'mentors') {
      // Only filter by status if not including inactive
      if (!query.status) {
        query.status = 'Active';
      }
    }
  }

  return query;
};

// Helper function to get data based on category
const getReportData = async (category: ReportCategory, filters: ReportFilter) => {
  const query = buildQuery(category, filters);
  
  // Map sort field based on category
  let sortField = filters.sortBy || 'createdAt';
  if ((category === 'students' || category === 'mentors') && sortField === 'name') {
    sortField = 'firstName'; // Sort by firstName for students/mentors
  }
  
  const sort: any = {};
  sort[sortField] = filters.sortOrder === 'desc' ? -1 : 1;

  let data: any[] = [];
  let totalRecords = 0;

  switch (category) {
    case 'students':
      data = await Student.find(query).sort(sort).limit(filters.limit || 1000).populate('userId', 'name email');
      totalRecords = await Student.countDocuments(query);
      break;
    case 'mentors':
      data = await Mentor.find(query).sort(sort).limit(filters.limit || 1000).populate('userId', 'name email');
      totalRecords = await Mentor.countDocuments(query);
      break;
    case 'projects':
      data = await Project.find(query).sort(sort).limit(filters.limit || 1000)
        .populate('studentId', 'name department year')
        .populate('mentorId', 'name');
      totalRecords = await Project.countDocuments(query);
      break;
    case 'internships':
      data = await Internship.find(query).sort(sort).limit(filters.limit || 1000)
        .populate('studentId', 'name department year');
      totalRecords = await Internship.countDocuments(query);
      break;
    case 'certifications':
      data = await Certification.find(query).sort(sort).limit(filters.limit || 1000)
        .populate('studentId', 'name department year');
      totalRecords = await Certification.countDocuments(query);
      break;
    case 'performance':
      // Get students with their points
      const students = await Student.find(query).sort(sort).limit(filters.limit || 1000)
        .populate('userId', 'name email');

      data = await Promise.all(students.map(async (student) => {
        const points = await Point.find({ studentId: student._id });
        const totalPoints = points.reduce((sum, point) => sum + point.points, 0);
        return {
          ...student.toObject(),
          totalPoints,
          pointsBreakdown: points
        };
      }));
      totalRecords = await Student.countDocuments(query);
      break;
    case 'comprehensive':
      // Combine all data
      const [comprehensiveStudents, comprehensiveMentors, comprehensiveProjects, comprehensiveInternships, comprehensiveCertifications] = await Promise.all([
        Student.find(query).limit(500).populate('userId', 'name email'),
        Mentor.find(query).limit(500).populate('userId', 'name email'),
        Project.find(query).limit(500).populate('studentId', 'name').populate('mentorId', 'name'),
        Internship.find(query).limit(500).populate('studentId', 'name'),
        Certification.find(query).limit(500).populate('studentId', 'name')
      ]);

      data = [
        { section: 'Students', data: comprehensiveStudents },
        { section: 'Mentors', data: comprehensiveMentors },
        { section: 'Projects', data: comprehensiveProjects },
        { section: 'Internships', data: comprehensiveInternships },
        { section: 'Certifications', data: comprehensiveCertifications }
      ];
      totalRecords = comprehensiveStudents.length + comprehensiveMentors.length + comprehensiveProjects.length + comprehensiveInternships.length + comprehensiveCertifications.length;
      break;
  }

  return { data, totalRecords };
};

// Generate PDF report
const generatePDF = async (data: any[], category: ReportCategory, filters: ReportFilter): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text(`ProgressIQ ${category.charAt(0).toUpperCase() + category.slice(1)} Report`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated on: ${moment().format('DD-MM-YYYY HH:mm:ss')}`, { align: 'center' });
      doc.moveDown();

      // Filters summary
      if (Object.keys(filters).length > 0) {
        doc.fontSize(14).text('Applied Filters:', { underline: true });
        doc.moveDown();
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '' && value !== 'All') {
            doc.fontSize(10).text(`${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
          }
        });
        doc.moveDown();
      }

      // Data based on category
      if (category === 'comprehensive') {
        // Handle comprehensive report with sections
        data.forEach((section: any) => {
          doc.fontSize(16).text(`${section.section}`, { underline: true });
          doc.moveDown();
          if (section.data && section.data.length > 0) {
            section.data.slice(0, 10).forEach((item: any, index: number) => {
              let name = 'N/A';
              if (section.section === 'Students' || section.section === 'Mentors') {
                name = item.userId?.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'N/A';
              } else if (section.section === 'Projects') {
                name = item.title || 'N/A';
              } else if (section.section === 'Internships') {
                name = `${item.companyName || 'N/A'} - ${item.role || 'N/A'}`;
              } else if (section.section === 'Certifications') {
                name = item.title || 'N/A';
              }
              doc.fontSize(12).text(`${index + 1}. ${name}`);
              doc.moveDown(0.5);
            });
            if (section.data.length > 10) {
              doc.fontSize(10).text(`... and ${section.data.length - 10} more records`);
              doc.moveDown();
            }
          }
          doc.moveDown();
        });
      } else {
        // Regular category data
        data.forEach((item, index) => {
          let name = 'N/A';
          if (category === 'students' || category === 'mentors') {
            name = item.userId?.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'N/A';
          } else if (category === 'projects') {
            name = item.title || 'N/A';
          } else if (category === 'internships') {
            name = `${item.companyName || 'N/A'} - ${item.role || 'N/A'}`;
          } else if (category === 'certifications') {
            name = item.title || 'N/A';
          } else if (category === 'performance') {
            name = item.userId?.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'N/A';
          }
          doc.fontSize(12).text(`${index + 1}. ${name}`);
          if (item.department) doc.fontSize(10).text(`   Department: ${item.department}`);
          if (item.year) doc.fontSize(10).text(`   Year: ${item.year}`);
          if (item.status) doc.fontSize(10).text(`   Status: ${item.status}`);
          if (item.totalPoints) doc.fontSize(10).text(`   Points: ${item.totalPoints}`);
          doc.moveDown();
        });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Generate Excel report
const generateExcel = async (data: any[], category: ReportCategory, filters: ReportFilter): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  // will hold worksheet when not comprehensive
  // let worksheet: ExcelJS.Worksheet | null = null;
  const worksheet = workbook.addWorksheet("Sheet1");

  // Define columns based on category
  let columns: any[] = [];

  if (category === 'comprehensive') {
    // create separate sheet for each section
    for (const section of data) {
      const sheet = workbook.addWorksheet(section.section);
      // reuse the same generation logic by temporarily setting data and category
      const sectionData = section.data;
      // determine columns by inspecting first item in sectionData or default
      let sectionCols: any[] = [];
      if (section.section === 'Students') {
        sectionCols = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Name', key: 'name', width: 30 },
          { header: 'Email', key: 'email', width: 30 },
          { header: 'Department', key: 'department', width: 20 },
          { header: 'Year', key: 'year', width: 10 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Total Points', key: 'totalPoints', width: 15 },
          { header: 'Created At', key: 'createdAt', width: 20 }
        ];
      } else if (section.section === 'Mentors') {
        sectionCols = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Name', key: 'name', width: 30 },
          { header: 'Email', key: 'email', width: 30 },
          { header: 'Department', key: 'department', width: 20 },
          { header: 'Designation', key: 'designation', width: 20 },
          { header: 'Created At', key: 'createdAt', width: 20 }
        ];
      } else if (section.section === 'Projects') {
        sectionCols = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Title', key: 'title', width: 30 },
          { header: 'Student', key: 'studentName', width: 25 },
          { header: 'Mentor', key: 'mentorName', width: 25 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Points', key: 'points', width: 10 },
          { header: 'Created At', key: 'createdAt', width: 20 }
        ];
      } else if (section.section === 'Internships') {
        sectionCols = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Student', key: 'studentName', width: 25 },
          { header: 'Company', key: 'company', width: 25 },
          { header: 'Type', key: 'type', width: 15 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Duration', key: 'duration', width: 15 },
          { header: 'Created At', key: 'createdAt', width: 20 }
        ];
      } else if (section.section === 'Certifications') {
        sectionCols = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Student', key: 'studentName', width: 25 },
          { header: 'Title', key: 'title', width: 30 },
          { header: 'Platform', key: 'platform', width: 20 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Issue Date', key: 'issueDate', width: 20 },
          { header: 'Created At', key: 'createdAt', width: 20 }
        ];
      } else {
        sectionCols = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Name', key: 'name', width: 30 },
          { header: 'Department', key: 'department', width: 20 },
          { header: 'Year', key: 'year', width: 10 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Created At', key: 'createdAt', width: 20 }
        ];
      }
      sheet.columns = sectionCols;
      // add rows to sheet
      sectionData.forEach((item: any, idx: number) => {
        const rowData: any = { id: idx + 1 };
        // reuse the earlier switch logic by copying section assignment above? we'll replicate minimal mapping
        if (section.section === 'Students') {
          rowData.name = item.userId?.name || item.name || 'N/A';
          rowData.email = item.userId?.email || item.email || 'N/A';
          rowData.department = item.department || 'N/A';
          rowData.year = item.year || 'N/A';
          rowData.status = item.isActive ? 'Active' : 'Inactive';
          rowData.totalPoints = item.totalPoints || 0;
          rowData.createdAt = item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A';
        } else if (section.section === 'Mentors') {
          rowData.name = item.userId?.name || item.name || 'N/A';
          rowData.email = item.userId?.email || item.email || 'N/A';
          rowData.department = item.department || 'N/A';
          rowData.designation = item.designation || 'N/A';
          rowData.createdAt = item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A';
        } else if (section.section === 'Projects') {
          rowData.title = item.title || 'N/A';
          rowData.studentName = item.studentId?.name || 'N/A';
          rowData.mentorName = item.mentorId?.name || 'N/A';
          rowData.status = item.status || 'N/A';
          rowData.points = item.points || 0;
          rowData.createdAt = item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A';
        } else if (section.section === 'Internships') {
          rowData.studentName = item.studentId?.name || 'N/A';
          rowData.company = item.companyName || 'N/A';
          rowData.type = item.type || 'N/A';
          rowData.status = item.status || 'N/A';
          rowData.duration = item.from && item.to ? `${moment(item.from).format('DD-MM-YYYY')} to ${moment(item.to).format('DD-MM-YYYY')}` : 'N/A';
          rowData.createdAt = item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A';
        } else if (section.section === 'Certifications') {
          rowData.studentName = item.studentId?.name || 'N/A';
          rowData.title = item.title || 'N/A';
          rowData.platform = item.platform || 'N/A';
          rowData.status = item.status || 'N/A';
          rowData.issueDate = item.from ? moment(item.from).format('DD-MM-YYYY') : 'N/A';
          rowData.createdAt = item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A';
        } else {
          rowData.name = item.name || item.title || 'N/A';
          rowData.department = item.department || 'N/A';
          rowData.year = item.year || 'N/A';
          rowData.status = item.status || item.isActive ? 'Active' : 'Inactive';
          rowData.createdAt = item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A';
        }
        sheet.addRow(rowData);
      });
    }
    // after creating all sheets, finish
    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  switch (category) {
    case 'students':
      columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Year', key: 'year', width: 10 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Total Points', key: 'totalPoints', width: 15 },
        { header: 'Created At', key: 'createdAt', width: 20 }
      ];
      break;
    case 'mentors':
      columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Designation', key: 'designation', width: 20 },
        { header: 'Created At', key: 'createdAt', width: 20 }
      ];
      break;
    case 'projects':
      columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Student', key: 'studentName', width: 25 },
        { header: 'Mentor', key: 'mentorName', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Points', key: 'points', width: 10 },
        { header: 'Created At', key: 'createdAt', width: 20 }
      ];
      break;
    case 'internships':
      columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Student', key: 'studentName', width: 25 },
        { header: 'Company', key: 'company', width: 25 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Duration', key: 'duration', width: 15 },
        { header: 'Created At', key: 'createdAt', width: 20 }
      ];
      break;
    case 'certifications':
      columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Student', key: 'studentName', width: 25 },
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Platform', key: 'platform', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Issue Date', key: 'issueDate', width: 20 },
        { header: 'Created At', key: 'createdAt', width: 20 }
      ];
      break;
    case 'performance':
      columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Year', key: 'year', width: 10 },
        { header: 'Total Points', key: 'totalPoints', width: 15 },
        { header: 'Designation', key: 'designation', width: 20 },
        { header: 'Created At', key: 'createdAt', width: 20 }
      ];
      break;
    default:
      columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Year', key: 'year', width: 10 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Created At', key: 'createdAt', width: 20 }
      ];
  }

  worksheet.columns = columns;
//   if (worksheet) {
//   worksheet.columns = columns;
// }

  // Add data
  data.forEach((item, index) => {
    const rowData: any = { id: index + 1 };

    switch (category) {
      case 'students':
        rowData.name = item.userId?.name || item.name || 'N/A';
        rowData.email = item.userId?.email || item.email || 'N/A';
        rowData.department = item.department || 'N/A';
        rowData.year = item.year || 'N/A';
        rowData.status = item.isActive ? 'Active' : 'Inactive';
        rowData.totalPoints = item.totalPoints || 0;
        rowData.createdAt = item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A';
        break;
      case 'mentors':
        rowData.name = item.userId?.name || item.name || 'N/A';
        rowData.email = item.userId?.email || item.email || 'N/A';
        rowData.department = item.department || 'N/A';
        rowData.designation = item.designation || 'N/A';
        rowData.createdAt = item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A';
        break;
      case 'projects':
        rowData.title = item.title || 'N/A';
        rowData.studentName = item.studentId?.name || 'N/A';
        rowData.mentorName = item.mentorId?.name || 'N/A';
        rowData.status = item.status || 'N/A';
        rowData.points = item.points || 0;
        rowData.createdAt = item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A';
        break;
      case 'internships':
        rowData.studentName = item.studentId?.name || 'N/A';
        rowData.company = item.companyName || 'N/A';
        rowData.type = item.type || 'N/A';
        rowData.status = item.status || 'N/A';
        rowData.duration = item.from && item.to ? `${moment(item.from).format('DD-MM-YYYY')} to ${moment(item.to).format('DD-MM-YYYY')}` : 'N/A';
        rowData.createdAt = item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A';
        break;
      case 'certifications':
        rowData.studentName = item.studentId?.name || 'N/A';
        rowData.title = item.title || 'N/A';
        rowData.platform = item.platform || 'N/A';
        rowData.status = item.status || 'N/A';
        rowData.issueDate = item.from ? moment(item.from).format('DD-MM-YYYY') : 'N/A';
        rowData.createdAt = item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A';
        break;
      case 'performance':
        rowData.name = item.userId?.name || item.name || 'N/A';
        rowData.department = item.department || 'N/A';
        rowData.year = item.year || 'N/A';
        rowData.totalPoints = item.totalPoints || 0;
        rowData.designation = item.designation || 'N/A';
        rowData.createdAt = item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A';
        break;
      default:
        rowData.name = item.name || item.title || 'N/A';
        rowData.department = item.department || 'N/A';
        rowData.year = item.year || 'N/A';
        rowData.status = item.status || item.isActive ? 'Active' : 'Inactive';
        rowData.createdAt = item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A';
    }

    worksheet!=null && worksheet.addRow(rowData);
  });

  return await workbook.xlsx.writeBuffer() as unknown as Buffer;
};

// Generate CSV report
const generateCSV = async (data: any[], category: ReportCategory, filters: ReportFilter): Promise<string> => {
  if (category === 'comprehensive') {
    // build combined CSV as sections
    let content = '';
    for (const section of data) {
      content += `Section: ${section.section}\n`;
      if (section.data && section.data.length > 0) {
        // build header from first item by running same logic as individual category
        let rows: any[] = [];
        let header: any[] = [];
        switch (section.section) {
          case 'Students':
            header = ['ID','Name','Email','Department','Year','Status','Total Points','Created At'];
            rows = section.data.map((item: any, idx: number) => [
              idx+1,
              item.userId?.name || item.name || 'N/A',
              item.userId?.email || item.email || 'N/A',
              item.department || 'N/A',
              item.year || 'N/A',
              item.isActive ? 'Active' : 'Inactive',
              item.totalPoints || 0,
              item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A'
            ]);
            break;
          case 'Mentors':
            header = ['ID','Name','Email','Department','Designation','Created At'];
            rows = section.data.map((item: any, idx: number) => [
              idx+1,
              item.userId?.name || item.name || 'N/A',
              item.userId?.email || item.email || 'N/A',
              item.department || 'N/A',
              item.designation || 'N/A',
              item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A'
            ]);
            break;
          case 'Projects':
            header = ['ID','Title','Student','Mentor','Status','Points','Created At'];
            rows = section.data.map((item: any, idx: number) => [
              idx+1,
              item.title || 'N/A',
              item.studentId?.name || 'N/A',
              item.mentorId?.name || 'N/A',
              item.status || 'N/A',
              item.points || 0,
              item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A'
            ]);
            break;
          case 'Internships':
            header = ['ID','Student','Company','Type','Status','Duration','Created At'];
            rows = section.data.map((item: any, idx: number) => [
              idx+1,
              item.studentId?.name || 'N/A',
              item.companyName || 'N/A',
              item.type || 'N/A',
              item.status || 'N/A',
              item.from && item.to ? `${moment(item.from).format('DD-MM-YYYY')} to ${moment(item.to).format('DD-MM-YYYY')}` : 'N/A',
              item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A'
            ]);
            break;
          case 'Certifications':
            header = ['ID','Student','Title','Platform','Status','Issue Date','Created At'];
            rows = section.data.map((item: any, idx: number) => [
              idx+1,
              item.studentId?.name || 'N/A',
              item.title || 'N/A',
              item.platform || 'N/A',
              item.status || 'N/A',
              item.from ? moment(item.from).format('DD-MM-YYYY') : 'N/A',
              item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A'
            ]);
            break;
          default:
            header = ['ID','Name','Department','Year','Status','Created At'];
            rows = section.data.map((item: any, idx: number) => [
              idx+1,
              item.name || item.title || 'N/A',
              item.department || 'N/A',
              item.year || 'N/A',
              item.status || (item.isActive ? 'Active' : 'Inactive'),
              item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A'
            ]);
        }
        // add header line
        content += header.join(',') + '\n';
        rows.forEach(r => {
          content += r.join(',') + '\n';
        });
      } else {
        content += 'No records\n';
      }
      content += '\n';
    }
    return content;
  }

  // existing non-comprehensive logic below...
  let header: any[] = [];
  let records: any[] = [];

  switch (category) {
    case 'students':
      header = [
        { id: 'id', title: 'ID' },
        { id: 'name', title: 'Name' },
        { id: 'email', title: 'Email' },
        { id: 'department', title: 'Department' },
        { id: 'year', title: 'Year' },
        { id: 'status', title: 'Status' },
        { id: 'totalPoints', title: 'Total Points' },
        { id: 'createdAt', title: 'Created At' }
      ];
      records = data.map((item, index) => ({
        id: index + 1,
        name: item.userId?.name || item.name || 'N/A',
        email: item.userId?.email || item.email || 'N/A',
        department: item.department || 'N/A',
        year: item.year || 'N/A',
        status: item.isActive ? 'Active' : 'Inactive',
        totalPoints: item.totalPoints || 0,
        createdAt: item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A'
      }));
      break;
    case 'mentors':
      header = [
        { id: 'id', title: 'ID' },
        { id: 'name', title: 'Name' },
        { id: 'email', title: 'Email' },
        { id: 'department', title: 'Department' },
        { id: 'designation', title: 'Designation' },
        { id: 'createdAt', title: 'Created At' }
      ];
      records = data.map((item, index) => ({
        id: index + 1,
        name: item.userId?.name || item.name || 'N/A',
        email: item.userId?.email || item.email || 'N/A',
        department: item.department || 'N/A',
        designation: item.designation || 'N/A',
        createdAt: item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A'
      }));
      break;
    case 'projects':
      header = [
        { id: 'id', title: 'ID' },
        { id: 'title', title: 'Title' },
        { id: 'studentName', title: 'Student' },
        { id: 'mentorName', title: 'Mentor' },
        { id: 'status', title: 'Status' },
        { id: 'points', title: 'Points' },
        { id: 'createdAt', title: 'Created At' }
      ];
      records = data.map((item, index) => ({
        id: index + 1,
        title: item.title || 'N/A',
        studentName: item.studentId?.name || 'N/A',
        mentorName: item.mentorId?.name || 'N/A',
        status: item.status || 'N/A',
        points: item.points || 0,
        createdAt: item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A'
      }));
      break;
    case 'internships':
      header = [
        { id: 'id', title: 'ID' },
        { id: 'studentName', title: 'Student' },
        { id: 'company', title: 'Company' },
        { id: 'type', title: 'Type' },
        { id: 'status', title: 'Status' },
        { id: 'duration', title: 'Duration' },
        { id: 'createdAt', title: 'Created At' }
      ];
      records = data.map((item, index) => ({
        id: index + 1,
        studentName: item.studentId?.name || 'N/A',
        company: item.companyName || 'N/A',
        type: item.type || 'N/A',
        status: item.status || 'N/A',
        duration: item.from && item.to ? `${moment(item.from).format('DD-MM-YYYY')} to ${moment(item.to).format('DD-MM-YYYY')}` : 'N/A',
        createdAt: item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A'
      }));
      break;
    case 'certifications':
      header = [
        { id: 'id', title: 'ID' },
        { id: 'studentName', title: 'Student' },
        { id: 'title', title: 'Title' },
        { id: 'platform', title: 'Platform' },
        { id: 'status', title: 'Status' },
        { id: 'issueDate', title: 'Issue Date' },
        { id: 'createdAt', title: 'Created At' }
      ];
      records = data.map((item, index) => ({
        id: index + 1,
        studentName: item.studentId?.name || 'N/A',
        title: item.title || 'N/A',
        platform: item.platform || 'N/A',
        status: item.status || 'N/A',
        issueDate: item.from ? moment(item.from).format('DD-MM-YYYY') : 'N/A',
        createdAt: item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A'
      }));
      break;
    case 'performance':
      header = [
        { id: 'id', title: 'ID' },
        { id: 'name', title: 'Name' },
        { id: 'department', title: 'Department' },
        { id: 'year', title: 'Year' },
        { id: 'totalPoints', title: 'Total Points' },
        { id: 'designation', title: 'Designation' },
        { id: 'createdAt', title: 'Created At' }
      ];
      records = data.map((item, index) => ({
        id: index + 1,
        name: item.userId?.name || item.name || 'N/A',
        department: item.department || 'N/A',
        year: item.year || 'N/A',
        totalPoints: item.totalPoints || 0,
        designation: item.designation || 'N/A',
        createdAt: item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A'
      }));
      break;
    default:
      header = [
        { id: 'id', title: 'ID' },
        { id: 'name', title: 'Name' },
        { id: 'department', title: 'Department' },
        { id: 'year', title: 'Year' },
        { id: 'status', title: 'Status' },
        { id: 'createdAt', title: 'Created At' }
      ];
      records = data.map((item, index) => ({
        id: index + 1,
        name: item.name || item.title || 'N/A',
        department: item.department || 'N/A',
        year: item.year || 'N/A',
        status: item.status || (item.isActive ? 'Active' : 'Inactive'),
        createdAt: item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A'
      }));
  }

  const csvWriter = createObjectCsvWriter({
    path: 'temp.csv',
    header,
  });

  await csvWriter.writeRecords(records);
  const csvContent = fs.readFileSync('temp.csv', 'utf8');
  fs.unlinkSync('temp.csv');
  return csvContent;
};

// Main generate report function
export const generateReport = async (req: Request, res: Response) => {
  try {
    const { type, category, filter = {}, options = {} }: {
      type: ReportType;
      category: ReportCategory;
      filter: ReportFilter;
      options: any
    } = req.body;

    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Create report record
    const report = new Report({
      generatedBy: userId,
      reportType: type,
      category,
      filters: filter,
      status: 'processing'
    });
    await report.save();

    // Get data
    const { data, totalRecords } = await getReportData(category, filter);

    // Generate file based on type
    let fileBuffer: Buffer;
    let fileName: string;
    let mimeType: string;

    switch (type) {
      case 'pdf':
        fileBuffer = await generatePDF(data, category, filter);
        fileName = `${category}_report_${moment().format('DDMMYYYY_HHmmss')}.pdf`;
        mimeType = 'application/pdf';
        break;
      case 'excel':
        fileBuffer = await generateExcel(data, category, filter);
        fileName = `${category}_report_${moment().format('DDMMYYYY_HHmmss')}.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'csv':
        const csvContent = await generateCSV(data, category, filter);
        fileBuffer = Buffer.from(csvContent);
        fileName = `${category}_report_${moment().format('DDMMYYYY_HHmmss')}.csv`;
        mimeType = 'text/csv';
        break;
      default:
        throw new Error('Invalid report type');
    }

    // Save file (in a real app, you'd save to cloud storage)
    const filePath = path.join(__dirname, '../../uploads/reports', fileName);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, fileBuffer);

    // Update report record
    report.status = 'completed';
    report.fileUrl = `/uploads/reports/${fileName}`;
    report.fileSize = fileBuffer.length;
    report.recordCount = totalRecords;
    await report.save();

    res.json({
      success: true,
      message: 'Report generated successfully',
      reportId: report._id,
      downloadUrl: report.fileUrl,
      recordCount: totalRecords
    });

  } catch (error: any) {
    console.error('Error generating report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate report', error: error.message });
  }
};

// Preview report
export const previewReport = async (req: Request, res: Response) => {
  try {
    const { category, filter = {} }: { category: ReportCategory; filter: ReportFilter } = req.body;

    // if no date range provided, default to last 30 days for preview
    const previewFilter: ReportFilter = { ...filter };
    if (!previewFilter.startDate && !previewFilter.endDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      previewFilter.startDate = moment(start).format('YYYY-MM-DD');
      previewFilter.endDate = moment(end).format('YYYY-MM-DD');
    }

    const { data, totalRecords } = await getReportData(category, previewFilter);

    // Prepare sample data
    let sampleData: any;
    if (category === 'comprehensive') {
      sampleData = data.map((section: any) => ({
        section: section.section,
        count: section.data.length,
        sample: section.data.slice(0, 3)
      }));
    } else {
      sampleData = data.slice(0, 5);
    }

    const estimatedFileSize = `${Math.ceil(totalRecords * 0.1)} KB`; // Rough estimate

    res.json({
      success: true,
      data: {
        totalRecords,
        sampleData,
        appliedFilters: previewFilter,
        estimatedFileSize,
        usedDefaultDateRange: !filter.startDate && !filter.endDate
      }
    });

  } catch (error: any) {
    console.error('Error previewing report:', error);
    res.status(500).json({ success: false, message: 'Failed to preview report', error: error.message });
  }
};

// Get report history
export const getReportHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const reports = await Report.find({ generatedBy: userId })
      .sort({ generatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('generatedBy', 'name email');

    const total = await Report.countDocuments({ generatedBy: userId });

    res.json({
      success: true,
      data: reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('Error fetching report history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch report history', error: error.message });
  }
};

// Download report
export const downloadReport = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const userId = (req as any).user?.id;

    const report = await Report.findOne({ _id: reportId, generatedBy: userId });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    if (report.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Report is not ready for download' });
    }

    const filePath = path.join(__dirname, '../../uploads/reports', path.basename(report.fileUrl!));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Report file not found' });
    }

    // expose content-disposition for CORS clients
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    // use res.download to handle headers and streaming automatically
    return res.download(filePath, path.basename(report.fileUrl!), (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Failed to send report file', error: err.message });
        }
      }
    });

  } catch (error: any) {
    console.error('Error downloading report:', error);
    res.status(500).json({ success: false, message: 'Failed to download report', error: error.message });
  }
};

// Delete report
export const deleteReport = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const userId = (req as any).user?.id;

    const report = await Report.findOneAndDelete({ _id: reportId, generatedBy: userId });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Delete file if exists
    if ((report as any)?.fileUrl) {
      const filePath = path.join(__dirname, '../../uploads/reports', path.basename((report as any).fileUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ success: true, message: 'Report deleted successfully' });

  } catch (error: any) {
    console.error('Error deleting report:', error);
    res.status(500).json({ success: false, message: 'Failed to delete report', error: error.message });
  }
};

// Get report statistics
export const getReportStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const totalReports = await Report.countDocuments({ generatedBy: userId });
    const completedReports = await Report.countDocuments({ generatedBy: userId, status: 'completed' });
    const failedReports = await Report.countDocuments({ generatedBy: userId, status: 'failed' });

    // Get reports by type
    const reportsByType = await Report.aggregate([
      { $match: { generatedBy: userId } },
      { $group: { _id: '$reportType', count: { $sum: 1 } } }
    ]);

    // Get reports by category
    const reportsByCategory = await Report.aggregate([
      { $match: { generatedBy: userId } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Get recent reports
    const recentReports = await Report.find({ generatedBy: userId })
      .sort({ generatedAt: -1 })
      .limit(5)
      .select('reportType category status generatedAt fileSize');

    res.json({
      success: true,
      data: {
        totalReports,
        completedReports,
        failedReports,
        reportsByType: reportsByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        reportsByCategory: reportsByCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recentReports
      }
    });

  } catch (error: any) {
    console.error('Error fetching report stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch report stats', error: error.message });
  }
};

export const getDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await Student.distinct('department');
    res.json({ success: true, data: departments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch departments', error: error.message });
  }
};

export const getYears = async (req: Request, res: Response) => {
  try {
    const years = await Student.distinct('year');
    res.json({ success: true, data: years });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch years', error: error.message });
  }
};

export const getMentorsReport = async (req: Request, res: Response) => {
  try {
    const mentors = await Mentor.find();
    const mentorData = mentors.map(mentor => ({
      id: mentor._id,
      name: mentor.name || 'Unknown'
    }));
    res.json({ success: true, data: mentorData });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch mentors', error: error.message });
  }
};

export const getPlatforms = async (req: Request, res: Response) => {
  try {
    const platforms = await Certification.distinct('platform');
    res.json({ success: true, data: platforms });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch platforms', error: error.message });
  }
};
