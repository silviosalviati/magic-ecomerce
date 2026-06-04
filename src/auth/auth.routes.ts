import { Router, Request, Response } from 'express';
import {
  register,
  login,
  me,
  requestVerificationEmail,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
} from './auth.controller';
import { requireCustomerAuth } from '../middlewares/customer-auth.middleware';
import { createRateLimit } from '../middlewares/security.middleware';

const authRouter = Router();

const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
  keyPrefix: 'auth-login',
});

const registerRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  message: 'Muitas tentativas de cadastro. Tente novamente em alguns minutos.',
  keyPrefix: 'auth-register',
});

const emailFlowRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  message: 'Muitas solicitações seguidas. Tente novamente em alguns minutos.',
  keyPrefix: 'auth-email-flow',
});

authRouter.post('/register', registerRateLimit, (req: Request, res: Response) => register(req, res));
authRouter.post('/login', loginRateLimit, (req: Request, res: Response) => login(req, res));
authRouter.post('/request-verification', emailFlowRateLimit, (req: Request, res: Response) => requestVerificationEmail(req, res));
authRouter.get('/verify-email', (req: Request, res: Response) => verifyEmail(req, res));
authRouter.post('/request-password-reset', emailFlowRateLimit, (req: Request, res: Response) => requestPasswordReset(req, res));
authRouter.post('/reset-password', emailFlowRateLimit, (req: Request, res: Response) => resetPassword(req, res));
authRouter.get('/me', requireCustomerAuth, (req: Request, res: Response) => me(req, res));

export { authRouter };
