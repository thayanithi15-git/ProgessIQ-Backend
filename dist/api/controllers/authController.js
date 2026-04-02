"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleLogin = exports.login = void 0;
const User_1 = __importDefault(require("../models/User"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwt_1 = require("../utils/jwt");
const google_auth_library_1 = require("google-auth-library");
const SystemLog_1 = __importDefault(require("../models/SystemLog"));
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ message: 'Email and password are required' });
    const user = await User_1.default.findOne({ email });
    if (!user)
        return res.status(401).json({ message: 'Invalid credentials' });
    const match = await bcrypt_1.default.compare(password, user.passwordHash || '');
    if (!match)
        return res.status(401).json({ message: 'Invalid credentials' });
    // Fetch name for log based on role
    let name = user.email;
    try {
        if (user.role === 'Student') {
            const Student = require('../models/Student').default;
            const profile = await Student.findOne({ userId: user._id });
            if (profile)
                name = `${profile.firstName} ${profile.lastName}`;
        }
        else if (user.role === 'Mentor') {
            const Mentor = require('../models/Mentor').default;
            const profile = await Mentor.findOne({ userId: user._id });
            if (profile)
                name = `${profile.firstName} ${profile.lastName}`;
        }
        else if (user.role === 'Admin') {
            const Admin = require('../models/Admin').default;
            const profile = await Admin.findOne({ userId: user._id });
            if (profile)
                name = profile.name || user.email;
        }
    }
    catch (err) {
        console.error('Error fetching name for log:', err);
    }
    // Record System Log
    try {
        await SystemLog_1.default.create({
            userId: user._id,
            name,
            email: user.email,
            role: user.role,
            action: 'LOGIN'
        });
        const logs = await SystemLog_1.default.find().sort({ createdAt: -1 }).skip(50);
        if (logs.length > 0) {
            const idsToDelete = logs.map(log => log._id);
            await SystemLog_1.default.deleteMany({ _id: { $in: idsToDelete } });
        }
    }
    catch (err) {
        console.error('Failed to write SystemLog:', err);
    }
    const token = (0, jwt_1.signToken)({ id: user._id, role: user.role });
    res.json({ token, role: user.role, userId: user._id, picture: user.picture });
};
exports.login = login;
const googleLogin = async (req, res) => {
    const { credential } = req.body;
    if (!credential)
        return res.status(400).json({ message: 'Credential is required' });
    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email)
            return res.status(400).json({ message: 'Invalid ID Token' });
        const { email, sub, picture, name: googleName } = payload;
        // Check if user exists
        let user = await User_1.default.findOne({ email });
        if (!user) {
            return res.status(403).json({ message: 'User not authorized. Please contact administrator.' });
        }
        // Update user with google info if not present
        user.googleId = sub;
        user.picture = picture;
        await user.save();
        let displayName = googleName || user.email;
        try {
            if (user.role === 'Student') {
                const Student = require('../models/Student').default;
                const profile = await Student.findOne({ userId: user._id });
                if (profile)
                    displayName = `${profile.firstName} ${profile.lastName}`;
            }
            else if (user.role === 'Mentor') {
                const Mentor = require('../models/Mentor').default;
                const profile = await Mentor.findOne({ userId: user._id });
                if (profile)
                    displayName = `${profile.firstName} ${profile.lastName}`;
            }
            else if (user.role === 'Admin') {
                const Admin = require('../models/Admin').default;
                const profile = await Admin.findOne({ userId: user._id });
                if (profile)
                    displayName = profile.name || user.email;
            }
        }
        catch (err) {
            console.error('Error fetching profile for google login:', err);
        }
        // Record System Log
        try {
            await SystemLog_1.default.create({
                userId: user._id,
                name: displayName,
                email: user.email,
                role: user.role,
                action: 'GOOGLE_LOGIN'
            });
        }
        catch (err) {
            console.error('Failed to write SystemLog:', err);
        }
        const token = (0, jwt_1.signToken)({ id: user._id, role: user.role });
        res.json({ token, role: user.role, userId: user._id, picture, email, username: displayName });
    }
    catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ message: 'Authentication failed' });
    }
};
exports.googleLogin = googleLogin;
