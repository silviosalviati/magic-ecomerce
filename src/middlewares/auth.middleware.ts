import { Request, Response, NextFunction } from 'express';

// ─── Tipagem para req.admin ──────────────────────────────────────────────────
export interface AdminPayload {
  id: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminPayload;
    }
  }
}

// ─── Auth por API Key (simples, sem dep extra) ───────────────────────────────
// Para JWT completo: instale jsonwebtoken e substitua esta lógica.
export function requireAdminKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const key = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_SECRET_KEY;

  if (!expectedKey) {
    res.status(500).json({ error: 'Configuração de segurança ausente no servidor.' });
    return;
  }

  if (!key || key !== expectedKey) {
    res.status(401).json({ error: 'Não autorizado.' });
    return;
  }

  // Injeta payload mínimo para uso nos controllers
  req.admin = { id: 'admin', role: 'admin' };
  next();
}