"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const User_1 = __importDefault(require("../models/User"));
const Student_1 = __importDefault(require("../models/Student"));
const Mentor_1 = __importDefault(require("../models/Mentor"));
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
        return res.status(401).json({ message: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    try {
        const payload = (0, jwt_1.verifyToken)(token);
        const user = await User_1.default.findById(payload.id);
        if (!user)
            return res.status(401).json({ message: 'Unauthorized' });
        let userData = { id: user._id.toString(), role: user.role, email: user.email };
        if (user.role === 'STUDENT') {
            const student = await Student_1.default.findOne({ userId: user._id });
            if (student) {
                userData.studentId = student._id.toString();
            }
        }
        else if (user.role === 'MENTOR') {
            const mentor = await Mentor_1.default.findOne({ email: user.email });
            if (mentor) {
                userData.mentorId = mentor._id.toString();
            }
        }
        req.user = userData;
        next();
    }
    catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};
exports.authenticate = authenticate;
const authorizeRoles = (...roles) => (req, res, next) => {
    const user = req.user;
    if (!user || !roles.includes(user.role))
        return res.status(403).json({ message: 'Forbidden' });
    next();
};
exports.authorizeRoles = authorizeRoles;
