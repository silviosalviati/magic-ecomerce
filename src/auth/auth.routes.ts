import { Router, Request, Response } from 'express';
import { register, login, me } from './auth.controller';
import { requireCustomerAuth } from '../middlewares/customer-auth.middleware';

const authRouter = Router();

authRouter.post('/register', (req: Request, res: Response) => register(req, res));
authRouter.post('/login', (req: Request, res: Response) => login(req, res));
authRouter.get('/me', requireCustomerAuth, (req: Request, res: Response) => me(req, res));

export { authRouter };
