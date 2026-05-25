import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '30d';

function generateToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não configurado.');
  return jwt.sign({ userId, email }, secret, { expiresIn: TOKEN_EXPIRY });
}

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    res.status(400).json({ message: 'nome, email e senha são obrigatórios.' });
    return;
  }

  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ message: 'E-mail inválido.' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ message: 'Senha deve ter pelo menos 6 caracteres.' });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      res.status(409).json({ message: 'E-mail já cadastrado.' });
      return;
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashed,
        isAdmin: false,
      },
    });

    const token = generateToken(user.id, user.email);
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('[auth/register]', error);
    res.status(500).json({ message: 'Erro ao criar conta.' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email?.trim() || !password?.trim()) {
    res.status(400).json({ message: 'email e senha são obrigatórios.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      res.status(401).json({ message: 'E-mail ou senha incorretos.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ message: 'E-mail ou senha incorretos.' });
      return;
    }

    const token = generateToken(user.id, user.email);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('[auth/login]', error);
    res.status(500).json({ message: 'Erro ao fazer login.' });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  const userId = (req as Request & { userId?: string }).userId;
  if (!userId) {
    res.status(401).json({ message: 'Não autenticado.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ message: 'Usuário não encontrado.' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('[auth/me]', error);
    res.status(500).json({ message: 'Erro ao buscar usuário.' });
  }
}
