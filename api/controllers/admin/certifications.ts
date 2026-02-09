import { Request, Response } from "express";
import Certification from "../../models/Certification";

export const listCertifications = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      sort,
    } = req.query as any;

    const q: any = {};

    // ───── SEARCH ─────
    if (search) {
      q.title = { $regex: search, $options: "i" };
    }

    // ───── STATUS FILTER ─────
    if (status) {
      q.status = status;
    }

    // ───── BASE QUERY ─────
    let query = Certification.find(q);

    // ───── SORTING ─────
    if (sort) {
      const [field, dir] = sort.split(":");
      const order = dir === "desc" ? -1 : 1;

      query = query.sort({ [field]: order });
    } else {
      // default sort
      query = query.sort({ createdAt: -1 });
    }

    // ───── PAGINATION ─────
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const certs = await query
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Certification.countDocuments(q);

    return res.json({
      certs,
      total,
    });

  } catch (error) {
    console.error("List Certifications Error:", error);

    return res.status(500).json({
      message: "Failed to fetch certifications",
    });
  }
};
