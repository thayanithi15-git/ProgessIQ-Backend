"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const mentorSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    contactNo: { type: String, required: true },
    place: { type: String, required: true },
    department: { type: String, required: true },
    designation: { type: String, required: true }
});
const Mentor = mongoose_1.default.model('Mentor', mentorSchema);
exports.default = Mentor;
