import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { sendEmailVerification, sendPasswordResetEmail } from '../config/mailer';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '30d';
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

function getJwtSecret(): string | null {
  const secret = process.env.JWT_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
}

function generateToken(userId: string, email: string): string {
  const secret = getJwtSecret();
  if (!secret) throw new Error('JWT_SECRET não configurado.');
  return jwt.sign({ userId, email }, secret, { expiresIn: TOKEN_EXPIRY });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createPlainToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function isLocked(lockedUntil: Date | null): boolean {
  return Boolean(lockedUntil && lockedUntil.getTime() > Date.now());
}

async function createVerificationToken(userId: string): Promise<string> {
  const token = createPlainToken();
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationToken: hashToken(token),
      emailVerificationExpires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    },
  });
  return token;
}

async function sendVerificationEmailForUser(user: { id: string; email: string; name: string }): Promise<void> {
  const verificationToken = await createVerificationToken(user.id);

  try {
    await sendEmailVerification({
      email: user.email,
      name: user.name,
      token: verificationToken,
    });
  } catch (mailError) {
    console.error('[auth/register][verify-email]', mailError);
  }
}

async function createPasswordResetToken(userId: string): Promise<string> {
  const token = createPlainToken();
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordResetToken: hashToken(token),
      passwordResetExpires: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
    },
  });
  return token;
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
    const normalizedEmail = normalizeEmail(email);
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      if (!existing.emailVerifiedAt) {
        await sendVerificationEmailForUser(existing);
        res.status(200).json({
          message: 'Já existe uma conta pendente para este e-mail. Enviamos um novo link de verificação.',
          requiresVerification: true,
        });
        return;
      }

      res.status(409).json({ message: 'E-mail já cadastrado. Faça login ou recupere sua senha.' });
      return;
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashed,
        isAdmin: false,
        emailVerifiedAt: null,
      },
    });

    await sendVerificationEmailForUser(user);

    res.status(201).json({
      message: 'Conta criada. Verifique seu e-mail para ativar o acesso.',
      requiresVerification: true,
    });
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

  if (!getJwtSecret()) {
    res.status(503).json({ message: 'Autenticação indisponível no momento.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
    });

    if (!user) {
      res.status(401).json({ message: 'E-mail ou senha incorretos.' });
      return;
    }

    if (isLocked(user.lockedUntil)) {
      res.status(423).json({ message: 'Conta temporariamente bloqueada. Tente novamente em alguns minutos.' });
      return;
    }

    if (!user.emailVerifiedAt) {
      res.status(403).json({ message: 'E-mail não verificado. Verifique sua caixa de entrada antes de entrar.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const nextAttempts = user.failedLoginAttempts + 1;
      const lockedUntil = nextAttempts >= MAX_LOGIN_ATTEMPTS ? new Date(Date.now() + LOGIN_LOCK_MS) : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: lockedUntil ? 0 : nextAttempts,
          lockedUntil,
        },
      });

      if (lockedUntil) {
        res.status(423).json({ message: 'Conta temporariamente bloqueada após várias tentativas inválidas.' });
        return;
      }

      res.status(401).json({ message: 'E-mail ou senha incorretos.' });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    const token = generateToken(user.id, user.email);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('[auth/login]', error);
    res.status(500).json({ message: 'Erro ao fazer login.' });
  }
}

export async function requestVerificationEmail(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email?: string };

  if (!email?.trim()) {
    res.status(400).json({ message: 'E-mail é obrigatório.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });

    if (user && !user.emailVerifiedAt) {
      const token = await createVerificationToken(user.id);
      try {
        await sendEmailVerification({ email: user.email, name: user.name, token });
      } catch (mailError) {
        console.error('[auth/request-verification]', mailError);
      }
    }

    res.json({ message: 'Se houver uma conta pendente, enviaremos o link de verificação.' });
  } catch (error) {
    console.error('[auth/request-verification]', error);
    res.status(500).json({ message: 'Erro ao solicitar verificação.' });
  }
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const token = String(req.query['token'] || '').trim();

  if (!token) {
    res.status(400).json({ message: 'Token é obrigatório.' });
    return;
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: hashToken(token),
        emailVerificationExpires: { gt: new Date() },
      },
    });

    if (!user) {
      res.status(400).json({ message: 'Link inválido ou expirado.' });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    res.json({ message: 'E-mail verificado com sucesso.' });
  } catch (error) {
    console.error('[auth/verify-email]', error);
    res.status(500).json({ message: 'Erro ao verificar e-mail.' });
  }
}

export async function requestPasswordReset(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email?: string };

  if (!email?.trim()) {
    res.status(400).json({ message: 'E-mail é obrigatório.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });

    if (user && user.emailVerifiedAt) {
      const token = await createPasswordResetToken(user.id);
      try {
        await sendPasswordResetEmail({ email: user.email, name: user.name, token });
      } catch (mailError) {
        console.error('[auth/request-reset]', mailError);
      }
    }

    res.json({ message: 'Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.' });
  } catch (error) {
    console.error('[auth/request-reset]', error);
    res.status(500).json({ message: 'Erro ao solicitar recuperação.' });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body as { token?: string; password?: string };

  if (!token?.trim() || !password?.trim()) {
    res.status(400).json({ message: 'Token e nova senha são obrigatórios.' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ message: 'Senha deve ter pelo menos 6 caracteres.' });
    return;
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashToken(token.trim()),
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      res.status(400).json({ message: 'Link inválido ou expirado.' });
      return;
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    res.json({ message: 'Senha atualizada com sucesso.' });
  } catch (error) {
    console.error('[auth/reset-password]', error);
    res.status(500).json({ message: 'Erro ao redefinir senha.' });
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
      select: { id: true, name: true, email: true, createdAt: true, emailVerifiedAt: true },
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
