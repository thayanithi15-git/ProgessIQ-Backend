"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const User_1 = __importDefault(require("../models/User"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwt_1 = require("../utils/jwt");
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ message: 'Email and password are required' });
    const user = await User_1.default.findOne({ email });
    console.log('User found:', user);
    if (!user)
        return res.status(401).json({ message: 'Invalid credentials' });
    // Direct comparison instead of bcrypt
    const match = await bcrypt_1.default.compare(password, user.passwordHash);
    if (!match)
        return res.status(401).json({ message: 'Invalid credentials' });
    const token = (0, jwt_1.signToken)({ id: user._id, role: user.role });
    res.json({ token, role: user.role, userId: user._id });
};
exports.login = login;
