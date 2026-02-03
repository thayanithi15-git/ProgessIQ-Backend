import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET as jwt.Secret;

export const signToken = (payload: object): string => {
  const options = { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any;
  return jwt.sign(payload as any, SECRET, options as jwt.SignOptions);
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, SECRET) as any;
};
