import { Request, Response } from 'express';
import Certification from '../../models/Certification';

export const listCertifications = async (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query as any;
  const certs = await Certification.find().skip((page - 1) * limit).limit(Number(limit));
  const total = await Certification.countDocuments();
  res.json({ certs, total });
};
