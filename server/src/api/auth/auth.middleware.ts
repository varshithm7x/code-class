import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const bearer = req.headers.authorization;

  if (!bearer || !bearer.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const token = bearer.split(' ')[1];
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET!);
    // @ts-ignore
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
};

export const isTeacher = (req: Request, res: Response, next: NextFunction): void => {
  // @ts-ignore
  if (req.user.role !== 'TEACHER') {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  next();
};

export const isStudent = (req: Request, res: Response, next: NextFunction): void => {
  // @ts-ignore
  if (req.user.role !== 'STUDENT') {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  next();
}; 