import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';

interface JwtPayload {
  userId: string;
  email: string;
  sessionId?: string;
}

function getJwtSecret(): string | null {
  const secret = process.env.JWT_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
}

type AuthRequest = Request & { userId?: string; userEmail?: string };

export async function requireCustomerAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token de autenticação necessário.' });
    return;
  }

  const token = header.slice(7);
  const secret = getJwtSecret();
  if (!secret) {
    res.status(500).json({ message: 'Configuração de auth inválida.' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    if (!payload.sessionId) {
      res.status(401).json({ message: 'Sessão inválida ou expirada.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { activeSessionId: true, activeSessionExpiresAt: true },
    });

    if (
      !user ||
      user.activeSessionId !== payload.sessionId ||
      !user.activeSessionExpiresAt ||
      user.activeSessionExpiresAt.getTime() <= Date.now()
    ) {
      res.status(401).json({ message: 'Sessão inválida ou expirada.' });
      return;
    }

    (req as AuthRequest).userId = payload.userId;
    (req as AuthRequest).userEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
}

export function optionalCustomerAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7);
    const secret = getJwtSecret();
    if (secret) {
      try {
        const payload = jwt.verify(token, secret) as JwtPayload;
        (req as AuthRequest).userId = payload.userId;
        (req as AuthRequest).userEmail = payload.email;
      } catch {
        // Optional — ignore invalid tokens silently
      }
    }
  }
  next();
}
