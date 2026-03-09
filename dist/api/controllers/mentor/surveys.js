"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSurveys = exports.createSurvey = void 0;
const Survey_1 = __importDefault(require("../../models/Survey"));
const createSurvey = async (req, res) => {
    const survey = new Survey_1.default({ ...req.body, mentorId: req.user.id });
    await survey.save();
    res.status(201).json({ survey });
};
exports.createSurvey = createSurvey;
const listSurveys = async (req, res) => {
    const mentorId = req.user.id;
    const surveys = await Survey_1.default.find({ mentorId });
    res.json({ surveys });
};
exports.listSurveys = listSurveys;
