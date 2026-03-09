"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminUser = exports.deleteUser = exports.updateUser = exports.createStudentUser = exports.viewUser = exports.listUsers = void 0;
const User_1 = __importDefault(require("../../models/User"));
const Student_1 = __importDefault(require("../../models/Student"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const listUsers = async (req, res) => {
    const { page = 1, limit = 20, search } = req.query;
    const q = {};
    if (search)
        q.email = { $regex: search, $options: 'i' };
    const users = await User_1.default.find(q).skip((page - 1) * limit).limit(Number(limit));
    const total = await User_1.default.countDocuments(q);
    res.json({ users, total });
};
exports.listUsers = listUsers;
const viewUser = async (req, res) => {
    const { id } = req.params;
    const user = await User_1.default.findById(id);
    if (!user)
        return res.status(404).json({ message: 'Not found' });
    res.json({ user });
};
exports.viewUser = viewUser;
const createStudentUser = async (req, res) => {
    const data = req.body;
    const password = data.password || 'ChangeMe123!';
    const existing = await User_1.default.findOne({ email: data.email });
    if (existing)
        return res.status(400).json({ message: 'Email exists' });
    const passwordHash = await bcrypt_1.default.hash(password, 10);
    const user = new User_1.default({ role: 'STUDENT', email: data.email, passwordHash });
    await user.save();
    const student = new Student_1.default({ ...data, userId: user._id });
    await student.save();
    res.status(201).json({ student, userId: user._id });
};
exports.createStudentUser = createStudentUser;
const updateUser = async (req, res) => {
    const { id } = req.params;
    const updated = await User_1.default.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated)
        return res.status(404).json({ message: 'Not found' });
    res.json({ user: updated });
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    const { id } = req.params;
    const user = await User_1.default.findByIdAndDelete(id);
    if (!user)
        return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
};
exports.deleteUser = deleteUser;
const createAdminUser = async (req, res) => {
    const data = req.body;
    const password = data.password || 'ChangeMeAdmin!';
    const existing = await User_1.default.findOne({ email: data.email });
    if (existing)
        return res.status(400).json({ message: 'Email exists' });
    const passwordHash = await bcrypt_1.default.hash(password, 10);
    const user = new User_1.default({ role: 'ADMIN', email: data.email, passwordHash });
    await user.save();
    res.status(201).json({ user });
};
exports.createAdminUser = createAdminUser;
