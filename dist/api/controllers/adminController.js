"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapStudentsToMentor = exports.deleteMentor = exports.updateMentor = exports.getMentorById = exports.getMentors = exports.createMentor = exports.deleteStudent = exports.updateStudent = exports.getStudentById = exports.getStudents = exports.createStudent = void 0;
const User_1 = __importDefault(require("../models/User"));
const Student_1 = __importDefault(require("../models/Student"));
const Mentor_1 = __importDefault(require("../models/Mentor"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const MentorStudentMapping_1 = __importDefault(require("../models/MentorStudentMapping"));
const createStudent = async (req, res) => {
    const data = req.body;
    const password = data.password || 'ChangeMe123!';
    const existing = await User_1.default.findOne({ email: data.email });
    if (existing)
        return res.status(400).json({ message: 'Email already exists' });
    const passwordHash = await bcrypt_1.default.hash(password, 10);
    const user = new User_1.default({ role: 'STUDENT', email: data.email, passwordHash });
    await user.save();
    const student = new Student_1.default({ ...data, userId: user._id });
    await student.save();
    res.status(201).json({ student, userId: user._id });
};
exports.createStudent = createStudent;
const getStudents = async (req, res) => {
    const { page = "1", limit = "20", department, year, status, name, email, } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const filter = {};
    if (department)
        filter.department = department;
    if (year)
        filter.year = year;
    if (status)
        filter.status = status;
    // ----- Name search -----
    if (name) {
        filter.name = { $regex: name, $options: "i" };
    }
    // ----- Email search from User collection -----
    if (email) {
        const users = await User_1.default.find({
            email: { $regex: email, $options: "i" },
        }).select("_id");
        const userIds = users.map((u) => u._id);
        filter.userId = { $in: userIds };
    }
    const students = await Student_1.default.find(filter)
        .populate("userId", "email")
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);
    const total = await Student_1.default.countDocuments(filter);
    res.json({
        students,
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        },
    });
};
exports.getStudents = getStudents;
const getStudentById = async (req, res) => {
    const { id } = req.params;
    const student = await Student_1.default.findById(id).populate('userId', 'email');
    if (!student)
        return res.status(404).json({ message: 'Not found' });
    res.json({ student });
};
exports.getStudentById = getStudentById;
const updateStudent = async (req, res) => {
    const { id } = req.params;
    const updated = await Student_1.default.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated)
        return res.status(404).json({ message: 'Not found' });
    res.json({ student: updated });
};
exports.updateStudent = updateStudent;
const deleteStudent = async (req, res) => {
    const { id } = req.params;
    const student = await Student_1.default.findByIdAndDelete(id);
    if (!student)
        return res.status(404).json({ message: 'Not found' });
    await User_1.default.findByIdAndDelete(student.userId);
    res.json({ message: 'Deleted' });
};
exports.deleteStudent = deleteStudent;
// Mentor CRUD
const createMentor = async (req, res) => {
    const data = req.body;
    const existing = await Mentor_1.default.findOne({ email: data.email });
    if (existing)
        return res.status(400).json({ message: 'Mentor email exists' });
    const mentor = new Mentor_1.default(data);
    await mentor.save();
    res.status(201).json({ mentor });
};
exports.createMentor = createMentor;
const getMentors = async (req, res) => {
    const mentors = await Mentor_1.default.find();
    res.json({ mentors });
};
exports.getMentors = getMentors;
const getMentorById = async (req, res) => {
    const { id } = req.params;
    const mentor = await Mentor_1.default.findById(id);
    if (!mentor)
        return res.status(404).json({ message: 'Not found' });
    res.json({ mentor });
};
exports.getMentorById = getMentorById;
const updateMentor = async (req, res) => {
    const { id } = req.params;
    const updated = await Mentor_1.default.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated)
        return res.status(404).json({ message: 'Not found' });
    res.json({ mentor: updated });
};
exports.updateMentor = updateMentor;
const deleteMentor = async (req, res) => {
    const { id } = req.params;
    const mentor = await Mentor_1.default.findByIdAndDelete(id);
    if (!mentor)
        return res.status(404).json({ message: 'Not found' });
    // optionally reassign mappings
    await MentorStudentMapping_1.default.deleteMany({ mentorId: mentor._id });
    res.json({ message: 'Deleted' });
};
exports.deleteMentor = deleteMentor;
const mapStudentsToMentor = async (req, res) => {
    const { mentorId, studentIds } = req.body; // studentIds: []
    if (!mentorId || !Array.isArray(studentIds))
        return res.status(400).json({ message: 'Invalid payload' });
    const mappings = studentIds.map((sId) => ({ mentorId, studentId: sId }));
    await MentorStudentMapping_1.default.insertMany(mappings);
    res.json({ message: 'Mapped', count: mappings.length });
};
exports.mapStudentsToMentor = mapStudentsToMentor;
