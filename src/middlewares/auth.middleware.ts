import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';

// ─── Tipagem para req.admin ──────────────────────────────────────────────────
export interface AdminPayload {
  id: string;
  role: string;
  source?: 'jwt';
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminPayload;
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
  isAdmin?: boolean;
}

async function tryAuthorizeByJwt(req: Request): Promise<AdminPayload | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, secret) as JwtPayload;
    if (!payload.userId) return null;

    // DB check keeps admin permission revocation immediate.
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isAdmin: true },
    });

    if (!user?.isAdmin) return null;
    return { id: user.id, role: 'admin', source: 'jwt' };
  } catch {
    return null;
  }
}

// JWT+isAdmin is the only accepted admin auth method.
export async function requireAdminAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const jwtAdmin = await tryAuthorizeByJwt(req);
  if (jwtAdmin) {
    req.admin = jwtAdmin;
    next();
    return;
  }

  res.status(401).json({ error: 'Não autorizado.' });
}