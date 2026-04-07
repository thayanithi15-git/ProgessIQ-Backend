import { Request, Response } from 'express';
import Task from '../../models/Task';

export const listTasks = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      status,
      sort,
      from,
      to,
    } = req.query as any;

    const q: any = {};

    if (search) {
      q.title = { $regex: search, $options: 'i' };
    }

    if (status) {
      q.status = status;
    }

    if (from || to) {
      q.dueDate = {} as any;

      if (from) {
        q.dueDate.$gte = new Date(from);
      }

      if (to) {
        q.dueDate.$lte = new Date(to);
      }
    }

    let query = Task.find(q).populate([
      { path: 'studentId', select: 'name email' },
      { path: 'mentorId', select: 'name email department' },
    ]);

    if (sort) {
      const [field, dir] = sort.split(':');
      const order = dir === 'desc' ? -1 : 1;
      query = query.sort({ [field]: order });
    } else {
      query = query.sort({ createdAt: -1 });
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const tasks = await query
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Task.countDocuments(q);

    res.json({ tasks, total });
  } catch (err: any) {
    res.status(500).json({
      message: err.message || 'Failed to fetch tasks',
    });
  }
};
