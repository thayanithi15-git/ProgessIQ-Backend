import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import moment from 'moment';
import Student from '../../models/Student';
import Mentor from '../../models/Mentor';
import Project from '../../models/Project';
import Internship from '../../models/Internship';
import Certification from '../../models/Certification';
import Point from '../../models/Point';

interface ReportFilter {
  startDate?: string;
  endDate?: string;
  department?: string | string[];
  year?: string | string[];
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

  minProjects?: number;
  minInternships?: number;
  certificationName?: string;
  topNPoints?: number;
}

type ReportCategory =
  | 'students'
  | 'mentors'
  | 'projects'
  | 'internships'
  | 'certifications'
  | 'performance'
  | 'comprehensive';

type ReportType = 'pdf' | 'excel' | 'csv';

const buildBaseQuery = (category: ReportCategory, filters: ReportFilter): any => {
  const query: any = {};

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  if (filters.department) {
    const depts = Array.isArray(filters.department) ? filters.department : [filters.department];
    if (depts.length > 0) query.department = { $in: depts };
  }

  if (filters.year) {
    const yrs = Array.isArray(filters.year) ? filters.year : [filters.year];
    if (yrs.length > 0) query.year = { $in: yrs };
  }

  if (filters.status && filters.status !== 'All') {
    if (category === 'students') query.status = filters.status;
    else if (category === 'projects') query.status = filters.status;
  }

  if (filters.designation && filters.designation !== 'All') {
    query.designation = filters.designation;
  }

  if (filters.projectStatus && filters.projectStatus !== 'All') {
    query.status = filters.projectStatus;
  }

  if (filters.internshipType && filters.internshipType !== 'All') {
    query.type = filters.internshipType;
  }
  if (filters.internshipStatus && filters.internshipStatus !== 'All') {
    query.status = filters.internshipStatus;
  }

  if (filters.certificationStatus && filters.certificationStatus !== 'All') {
    query.status = filters.certificationStatus;
  }
  if (filters.platform) {
    query.platform = filters.platform;
  }

  if (filters.mentorId) {
    query.mentorId = filters.mentorId;
  }

  return query;
};

const getAdvancedStudentIds = async (filters: ReportFilter): Promise<any[] | null> => {
  let filteredIds: Set<string> | null = null;

  const intersect = (newIds: any[]) => {
    const newSet = new Set(newIds.map((id: any) => id.toString()));
    if (filteredIds === null) {
      filteredIds = newSet;
    } else {
      for (const id of filteredIds) {
        if (!newSet.has(id)) filteredIds.delete(id);
      }
    }
  };

  if (filters.minProjects && filters.minProjects > 0) {
    const agg = await Project.aggregate([
      { $match: { status: 'Completed' } },
      { $group: { _id: '$studentId', count: { $sum: 1 } } },
      { $match: { count: { $gte: filters.minProjects } } },
    ]);
    intersect(agg.map((a) => a._id));
  }

  if (filters.minInternships && filters.minInternships > 0) {
    const agg = await Internship.aggregate([
      { $match: { status: 'Approved' } },
      { $group: { _id: '$studentId', count: { $sum: 1 } } },
      { $match: { count: { $gte: filters.minInternships } } },
    ]);
    intersect(agg.map((a) => a._id));
  }

  if (filters.certificationName && filters.certificationName.trim()) {
    const regex = new RegExp(filters.certificationName.trim(), 'i');
    const certs = await Certification.find({
      $or: [{ title: regex }, { platform: regex }],
    }).select('studentId');
    const ids = [...new Set(certs.map((c) => c.studentId?.toString()))].filter(Boolean);
    intersect(ids);
  }

  if (filters.topNPoints && filters.topNPoints > 0) {
    const agg = await Point.aggregate([
      { $group: { _id: '$studentId', total: { $sum: '$points' } } },
      { $sort: { total: -1 } },
      { $limit: filters.topNPoints },
    ]);
    intersect(agg.map((a) => a._id));
  }

  if (filteredIds === null) return null;
  return [...filteredIds];
};

const getReportData = async (category: ReportCategory, filters: ReportFilter) => {
  const baseQuery = buildBaseQuery(category, filters);

  const studentRelated =
    category === 'students' ||
    category === 'performance' ||
    category === 'comprehensive';

  if (studentRelated) {
    const hasAdvanced =
      (filters.minProjects && filters.minProjects > 0) ||
      (filters.minInternships && filters.minInternships > 0) ||
      (filters.certificationName && filters.certificationName.trim()) ||
      (filters.topNPoints && filters.topNPoints > 0);

    if (hasAdvanced) {
      const advancedIds = await getAdvancedStudentIds(filters);
      if (advancedIds !== null) {
        baseQuery._id = { $in: advancedIds };
      }
    }
  }

  let sortField = filters.sortBy || 'createdAt';
  if ((category === 'students' || category === 'mentors') && sortField === 'name') {
    sortField = 'firstName';
  }
  const sort: any = { [sortField]: filters.sortOrder === 'desc' ? -1 : 1 };
  const lim = filters.limit || 1000;

  let data: any[] = [];
  let totalRecords = 0;

  switch (category) {
    case 'students':
      data = await Student.find(baseQuery)
        .sort(sort)
        .limit(lim)
        .populate('userId', 'name email');
      totalRecords = await Student.countDocuments(baseQuery);
      break;

    case 'mentors':
      data = await Mentor.find(baseQuery)
        .sort(sort)
        .limit(lim)
        .populate('userId', 'name email');
      totalRecords = await Mentor.countDocuments(baseQuery);
      break;

    case 'projects':
      data = await Project.find(baseQuery)
        .sort(sort)
        .limit(lim)
        .populate('studentId', 'name department year')
        .populate('mentorId', 'name');
      totalRecords = await Project.countDocuments(baseQuery);
      break;

    case 'internships':
      data = await Internship.find(baseQuery)
        .sort(sort)
        .limit(lim)
        .populate('studentId', 'name department year');
      totalRecords = await Internship.countDocuments(baseQuery);
      break;

    case 'certifications':
      data = await Certification.find(baseQuery)
        .sort(sort)
        .limit(lim)
        .populate('studentId', 'name department year');
      totalRecords = await Certification.countDocuments(baseQuery);
      break;

    case 'performance': {
      const perfStudents = await Student.find(baseQuery)
        .sort(sort)
        .limit(lim)
        .populate('userId', 'name email');

      data = await Promise.all(
        perfStudents.map(async (student) => {
          const pts = await Point.find({ studentId: student._id });
          const totalPoints = pts.reduce((sum, p) => sum + p.points, 0);
          return { ...student.toObject(), totalPoints, pointsBreakdown: pts };
        })
      );
      totalRecords = await Student.countDocuments(baseQuery);
      break;
    }

    case 'comprehensive': {
      const [compStudents, compMentors, compProjects, compInternships, compCerts] =
        await Promise.all([
          Student.find(baseQuery).limit(500).populate('userId', 'name email'),
          Mentor.find({}).limit(500).populate('userId', 'name email'),
          Project.find({}).limit(500).populate('studentId', 'name').populate('mentorId', 'name'),
          Internship.find({}).limit(500).populate('studentId', 'name'),
          Certification.find({}).limit(500).populate('studentId', 'name'),
        ]);

      data = [
        { section: 'Students', data: compStudents },
        { section: 'Mentors', data: compMentors },
        { section: 'Projects', data: compProjects },
        { section: 'Internships', data: compInternships },
        { section: 'Certifications', data: compCerts },
      ];
      totalRecords =
        compStudents.length +
        compMentors.length +
        compProjects.length +
        compInternships.length +
        compCerts.length;
      break;
    }
  }

  return { data, totalRecords };
};

const generatePDF = (data: any[], category: ReportCategory, filters: ReportFilter): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    doc.fontSize(22).font('Helvetica-Bold').text('ProgressIQ Report', { align: 'center' });
    doc.fontSize(14).font('Helvetica').text(`Category: ${category.toUpperCase()}`, { align: 'center' });
    doc.fontSize(11).text(`Generated: ${moment().format('DD MMM YYYY, HH:mm')}`, { align: 'center' });
    doc.moveDown(2);

    const activeFilters = Object.entries(filters).filter(
      ([, v]) => v !== undefined && v !== null && v !== '' && v !== 'All' && v !== false
    );
    if (activeFilters.length > 0) {
      doc.fontSize(13).font('Helvetica-Bold').text('Applied Filters:', { underline: true });
      doc.moveDown(0.5);
      activeFilters.forEach(([key, value]) => {
        doc.fontSize(10).font('Helvetica').text(`• ${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
      });
      doc.moveDown(1.5);
    }

    if (category === 'comprehensive') {
      data.forEach((section: any) => {
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').text(`— ${section.section} (${section.data.length} records) —`, { align: 'center' });
        doc.moveDown();
        section.data.slice(0, 50).forEach((item: any, i: number) => {
          let label = item.userId?.name || item.name || item.title || item.companyName || 'N/A';
          doc.fontSize(11).font('Helvetica').text(`${i + 1}. ${label}`);
        });
        if (section.data.length > 50) {
          doc.moveDown(0.5).fontSize(10).fillColor('gray').text(`...and ${section.data.length - 50} more records`).fillColor('black');
        }
      });
    } else {
      doc.fontSize(14).font('Helvetica-Bold').text(`${category.charAt(0).toUpperCase() + category.slice(1)} Records (${data.length})`, { underline: true });
      doc.moveDown();
      data.forEach((item: any, i: number) => {
        let label = 'N/A';
        if (category === 'students' || category === 'performance' || category === 'mentors') {
          label = item.userId?.name || `${item.firstName || ''} ${item.lastName || ''}`.trim();
          if (category === 'performance') label += ` — ${item.totalPoints || 0} pts`;
        } else if (category === 'projects') {
          label = `${item.title || 'N/A'} | ${item.studentId?.name || 'N/A'} | ${item.status || 'N/A'}`;
        } else if (category === 'internships') {
          label = `${item.companyName || 'N/A'} | ${item.studentId?.name || 'N/A'} | ${item.status || 'N/A'}`;
        } else if (category === 'certifications') {
          label = `${item.title || 'N/A'} | ${item.platform || 'N/A'} | ${item.studentId?.name || 'N/A'}`;
        }
        doc.fontSize(11).font('Helvetica').text(`${i + 1}. ${label || 'N/A'}`);
      });
    }

    doc.end();
  });
};

const generateExcel = async (data: any[], category: ReportCategory, filters: ReportFilter): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ProgressIQ';

  const metaSheet = workbook.addWorksheet('Report Info');
  metaSheet.addRow(['ProgressIQ Report']);
  metaSheet.addRow(['Category', category]);
  metaSheet.addRow(['Generated', moment().format('DD-MM-YYYY HH:mm:ss')]);
  metaSheet.addRow([]);
  metaSheet.addRow(['Applied Filters']);
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'All' && value !== false) {
      metaSheet.addRow([key, Array.isArray(value) ? value.join(', ') : String(value)]);
    }
  });

  const addStyledHeader = (ws: ExcelJS.Worksheet, columns: string[]) => {
    const headerRow = ws.addRow(columns);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.columns = columns.map((h) => ({ header: h, width: Math.max(h.length + 4, 18) }));
  };

  if (category === 'comprehensive') {
    for (const section of data) {
      const ws = workbook.addWorksheet(section.section);
      if (section.data.length === 0) continue;
      const sample = section.data[0];
      const keys = Object.keys(sample?.toObject ? sample.toObject() : sample).filter(
        (k) => !['__v', 'passwordHash'].includes(k)
      );
      addStyledHeader(ws, keys);
      section.data.forEach((item: any) => {
        const obj = item.toObject ? item.toObject() : item;
        ws.addRow(keys.map((k) => {
          const v = obj[k];
          if (v instanceof Date) return moment(v).format('DD-MM-YYYY');
          if (typeof v === 'object' && v !== null) return JSON.stringify(v);
          return v ?? '';
        }));
      });
    }
  } else {
    const ws = workbook.addWorksheet(category.charAt(0).toUpperCase() + category.slice(1));

    if (category === 'students') {
      addStyledHeader(ws, ['#', 'Name', 'Email', 'Department', 'Year', 'Status', 'Created At']);
      data.forEach((item, i) => {
        ws.addRow([
          i + 1,
          item.userId?.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'N/A',
          item.userId?.email || item.email || 'N/A',
          item.department || 'N/A',
          item.year || 'N/A',
          item.status || 'N/A',
          item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A',
        ]);
      });
    } else if (category === 'mentors') {
      addStyledHeader(ws, ['#', 'Name', 'Email', 'Department', 'Designation', 'Created At']);
      data.forEach((item, i) => {
        ws.addRow([
          i + 1,
          item.userId?.name || item.name || 'N/A',
          item.userId?.email || item.email || 'N/A',
          item.department || 'N/A',
          item.designation || 'N/A',
          item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A',
        ]);
      });
    } else if (category === 'projects') {
      addStyledHeader(ws, ['#', 'Title', 'Student', 'Mentor', 'Status', 'Points', 'Created At']);
      data.forEach((item, i) => {
        ws.addRow([
          i + 1,
          item.title || 'N/A',
          item.studentId?.name || 'N/A',
          item.mentorId?.name || 'N/A',
          item.status || 'N/A',
          item.points || 0,
          item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A',
        ]);
      });
    } else if (category === 'internships') {
      addStyledHeader(ws, ['#', 'Student', 'Company', 'Role', 'Type', 'Status', 'Duration', 'Created At']);
      data.forEach((item, i) => {
        ws.addRow([
          i + 1,
          item.studentId?.name || 'N/A',
          item.companyName || 'N/A',
          item.role || 'N/A',
          item.type || 'N/A',
          item.status || 'N/A',
          item.from && item.to ? `${moment(item.from).format('DD-MM-YYYY')} to ${moment(item.to).format('DD-MM-YYYY')}` : 'N/A',
          item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A',
        ]);
      });
    } else if (category === 'certifications') {
      addStyledHeader(ws, ['#', 'Student', 'Title', 'Platform', 'Status', 'Issue Date', 'Created At']);
      data.forEach((item, i) => {
        ws.addRow([
          i + 1,
          item.studentId?.name || 'N/A',
          item.title || 'N/A',
          item.platform || 'N/A',
          item.status || 'N/A',
          item.from ? moment(item.from).format('DD-MM-YYYY') : 'N/A',
          item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : 'N/A',
        ]);
      });
    } else if (category === 'performance') {
      addStyledHeader(ws, ['#', 'Name', 'Email', 'Department', 'Year', 'Total Points', 'Designation']);
      data.forEach((item, i) => {
        ws.addRow([
          i + 1,
          item.userId?.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'N/A',
          item.userId?.email || item.email || 'N/A',
          item.department || 'N/A',
          item.year || 'N/A',
          item.totalPoints || 0,
          item.designation || 'N/A',
        ]);
      });
    }

    ws.columns.forEach((col) => {
      let maxLen = 10;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen + 4, 50);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

const generateCSV = (data: any[], category: ReportCategory): string => {
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const row = (cells: any[]) => cells.map(escape).join(',');

  const lines: string[] = [];

  if (category === 'students' || category === 'performance' || category === 'mentors') {
    if (category === 'performance') {
      lines.push(row(['#', 'Name', 'Email', 'Department', 'Year', 'Total Points', 'Designation']));
      data.forEach((item, i) => {
        lines.push(row([i + 1, item.userId?.name || '', item.userId?.email || '', item.department || '', item.year || '', item.totalPoints || 0, item.designation || '']));
      });
    } else if (category === 'mentors') {
      lines.push(row(['#', 'Name', 'Email', 'Department', 'Designation', 'Created At']));
      data.forEach((item, i) => {
        lines.push(row([i + 1, item.userId?.name || '', item.userId?.email || '', item.department || '', item.designation || '', item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : '']));
      });
    } else {
      lines.push(row(['#', 'Name', 'Email', 'Department', 'Year', 'Status', 'Created At']));
      data.forEach((item, i) => {
        lines.push(row([i + 1, item.userId?.name || '', item.userId?.email || '', item.department || '', item.year || '', item.status || '', item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : '']));
      });
    }
  } else if (category === 'projects') {
    lines.push(row(['#', 'Title', 'Student', 'Mentor', 'Status', 'Points', 'Created At']));
    data.forEach((item, i) => {
      lines.push(row([i + 1, item.title || '', item.studentId?.name || '', item.mentorId?.name || '', item.status || '', item.points || 0, item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : '']));
    });
  } else if (category === 'internships') {
    lines.push(row(['#', 'Student', 'Company', 'Role', 'Type', 'Status', 'Created At']));
    data.forEach((item, i) => {
      lines.push(row([i + 1, item.studentId?.name || '', item.companyName || '', item.role || '', item.type || '', item.status || '', item.createdAt ? moment(item.createdAt).format('DD-MM-YYYY') : '']));
    });
  } else if (category === 'certifications') {
    lines.push(row(['#', 'Student', 'Title', 'Platform', 'Status', 'Issue Date']));
    data.forEach((item, i) => {
      lines.push(row([i + 1, item.studentId?.name || '', item.title || '', item.platform || '', item.status || '', item.from ? moment(item.from).format('DD-MM-YYYY') : '']));
    });
  } else if (category === 'comprehensive') {
    for (const section of data) {
      lines.push(`\n"=== ${section.section} (${section.data.length} records) ==="`);
      if (section.data.length > 0) {
        const obj = section.data[0]?.toObject ? section.data[0].toObject() : section.data[0];
        const keys = Object.keys(obj).filter((k) => !['__v'].includes(k));
        lines.push(row(keys));
        section.data.forEach((item: any) => {
          const o = item.toObject ? item.toObject() : item;
          lines.push(row(keys.map((k) => {
            const v = o[k];
            if (v instanceof Date) return moment(v).format('DD-MM-YYYY');
            if (typeof v === 'object' && v !== null) return JSON.stringify(v);
            return v;
          })));
        });
      }
    }
  }

  return lines.join('\n');
};

export const generateReport = async (req: Request, res: Response) => {
  try {
    const { type, category, filter = {}, options = {} }: {
      type: ReportType;
      category: ReportCategory;
      filter: ReportFilter;
      options: any;
    } = req.body;

    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!type || !category) {
      return res.status(400).json({ success: false, message: 'type and category are required' });
    }

    const { data, totalRecords } = await getReportData(category, filter);

    let fileBuffer: Buffer;
    let fileName: string;
    let mimeType: string;
    const timestamp = moment().format('DDMMYYYY_HHmmss');

    switch (type) {
      case 'pdf':
        fileBuffer = await generatePDF(data, category, filter);
        fileName = `${category}_report_${timestamp}.pdf`;
        mimeType = 'application/pdf';
        break;
      case 'excel':
        fileBuffer = await generateExcel(data, category, filter);
        fileName = `${category}_report_${timestamp}.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'csv':
        const csvContent = generateCSV(data, category);
        fileBuffer = Buffer.from(csvContent, 'utf8');
        fileName = `${category}_report_${timestamp}.csv`;
        mimeType = 'text/csv';
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid report type' });
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('X-Record-Count', String(totalRecords));
    return res.send(fileBuffer);

  } catch (error: any) {
    console.error('Error generating report:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate report', error: error.message });
    }
  }
};

export const previewReport = async (req: Request, res: Response) => {
  try {
    const { category, filter = {} }: { category: ReportCategory; filter: ReportFilter } = req.body;

    const previewFilter: ReportFilter = { ...filter };

    const { data, totalRecords } = await getReportData(category, previewFilter);

    let sampleData: any;
    if (category === 'comprehensive') {
      sampleData = data.map((section: any) => ({
        section: section.section,
        count: section.data.length,
        sample: section.data.slice(0, 3).map((d: any) => d.toObject ? d.toObject() : d),
      }));
    } else {
      sampleData = data.slice(0, 5).map((d: any) => d.toObject ? d.toObject() : d);
    }

    const estimatedFileSize = `${Math.max(1, Math.ceil(totalRecords * 0.5))} KB`;

    res.json({
      success: true,
      data: {
        totalRecords,
        sampleData,
        appliedFilters: previewFilter,
        estimatedFileSize,
        usedDefaultDateRange: !filter.startDate && !filter.endDate,
      },
    });
  } catch (error: any) {
    console.error('Error previewing report:', error);
    res.status(500).json({ success: false, message: 'Failed to preview report', error: error.message });
  }
};

export const getDepartments = async (_req: Request, res: Response) => {
  try {
    const departments = await Student.distinct('department');
    res.json({ success: true, data: departments.filter(Boolean) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch departments', error: error.message });
  }
};

export const getYears = async (_req: Request, res: Response) => {
  try {
    const years = await Student.distinct('year');
    res.json({ success: true, data: years.filter(Boolean) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch years', error: error.message });
  }
};

export const getMentorsReport = async (_req: Request, res: Response) => {
  try {
    const mentors = await Mentor.find().populate('userId', 'name').lean();
    const result = mentors.map((m: any) => ({
      id: m._id,
      name: m.userId?.name || m.name || 'Unknown',
    }));
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch mentors', error: error.message });
  }
};

export const getPlatforms = async (_req: Request, res: Response) => {
  try {
    const platforms = await Certification.distinct('platform');
    res.json({ success: true, data: platforms.filter(Boolean) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch platforms', error: error.message });
  }
};
