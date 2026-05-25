import { Router, Request, Response } from 'express';
import { lookupOrders, getCustomerOrders } from './orders.controller';
import { optionalCustomerAuth, requireCustomerAuth } from '../middlewares/customer-auth.middleware';

const ordersRouter = Router();

ordersRouter.get('/lookup', (req: Request, res: Response) => lookupOrders(req, res));

ordersRouter.get('/', requireCustomerAuth, (req: Request, res: Response) =>
  getCustomerOrders(req, res)
);

export { ordersRouter };
