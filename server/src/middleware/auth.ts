import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'stayhaven-super-secret-jwt-key-2026-production-ready';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'TENANT';
  tenantId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      name: string;
      role: 'OWNER' | 'TENANT';
    };

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'OWNER') {
    return res.status(403).json({ error: 'Access restricted to hostel owners' });
  }
  next();
}

export function signToken(user: { id: string; email: string; name: string; role: 'OWNER' | 'TENANT' }): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}
