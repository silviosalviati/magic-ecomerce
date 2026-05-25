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

const authRouter = Router();

authRouter.post('/register', (req: Request, res: Response) => register(req, res));
authRouter.post('/login', (req: Request, res: Response) => login(req, res));
authRouter.post('/request-verification', (req: Request, res: Response) => requestVerificationEmail(req, res));
authRouter.get('/verify-email', (req: Request, res: Response) => verifyEmail(req, res));
authRouter.post('/request-password-reset', (req: Request, res: Response) => requestPasswordReset(req, res));
authRouter.post('/reset-password', (req: Request, res: Response) => resetPassword(req, res));
authRouter.get('/me', requireCustomerAuth, (req: Request, res: Response) => me(req, res));

export { authRouter };
