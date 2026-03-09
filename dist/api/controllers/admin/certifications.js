"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCertifications = void 0;
const Certification_1 = __importDefault(require("../../models/Certification"));
const listCertifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status, sort, } = req.query;
        const q = {};
        // ───── SEARCH ─────
        if (search) {
            q.title = { $regex: search, $options: "i" };
        }
        // ───── STATUS FILTER ─────
        if (status) {
            q.status = status;
        }
        // ───── BASE QUERY ─────
        let query = Certification_1.default.find(q);
        // ───── SORTING ─────
        if (sort) {
            const [field, dir] = sort.split(":");
            const order = dir === "desc" ? -1 : 1;
            query = query.sort({ [field]: order });
        }
        else {
            // default sort
            query = query.sort({ createdAt: -1 });
        }
        // ───── PAGINATION ─────
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const certs = await query
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);
        const total = await Certification_1.default.countDocuments(q);
        return res.json({
            certs,
            total,
        });
    }
    catch (error) {
        console.error("List Certifications Error:", error);
        return res.status(500).json({
            message: "Failed to fetch certifications",
        });
    }
};
exports.listCertifications = listCertifications;
