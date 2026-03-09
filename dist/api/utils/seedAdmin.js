"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const User_1 = __importDefault(require("../models/User"));
dotenv_1.default.config();
const seed = async () => {
    await mongoose_1.default.connect(process.env.MONGODB_URI);
    const existing = await User_1.default.findOne({ email: process.env.ADMIN_EMAIL });
    if (existing) {
        console.log('Admin already exists');
        process.exit(0);
    }
    const passwordHash = await bcrypt_1.default.hash(process.env.ADMIN_PASSWORD || 'ChangeMe123!', 10);
    const admin = new User_1.default({ role: 'ADMIN', email: process.env.ADMIN_EMAIL, passwordHash });
    await admin.save();
    console.log('Admin seeded', admin.email);
    process.exit(0);
};
seed().catch(err => {
    console.error(err);
    process.exit(1);
});
