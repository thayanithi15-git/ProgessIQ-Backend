import { Request, Response, NextFunction } from 'express';

export const securityLogger = (req: Request, res: Response, next: NextFunction) => {

  console.log(`[SECURITY] ${req.method} ${req.path} - ${req.ip}`);
  next();
};

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {

  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(k => {
      if (typeof req.body[k] === 'string') req.body[k] = req.body[k].trim();
    });
  }
  next();
};