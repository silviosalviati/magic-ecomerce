import { Router, Request, Response } from 'express';
import { lookupOrders, getCustomerOrders } from './orders.controller';
import { requireCustomerAuth } from '../middlewares/customer-auth.middleware';
import { createRateLimit } from '../middlewares/security.middleware';

const ordersRouter = Router();

const lookupOrdersRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Muitas consultas de pedidos em pouco tempo. Tente novamente em alguns minutos.',
  keyPrefix: 'orders-lookup',
});

ordersRouter.get('/lookup', lookupOrdersRateLimit, (req: Request, res: Response) => lookupOrders(req, res));

ordersRouter.get('/', requireCustomerAuth, (req: Request, res: Response) =>
  getCustomerOrders(req, res)
);

export { ordersRouter };
