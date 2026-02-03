import { Request, Response, NextFunction } from 'express';

export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  // Log basic info for security auditing
  console.log(`[SECURITY] ${req.method} ${req.path} - ${req.ip}`);
  next();
};

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Basic sanitization: trim strings in body
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(k => {
      if (typeof req.body[k] === 'string') req.body[k] = req.body[k].trim();
    });
  }
  next();
};