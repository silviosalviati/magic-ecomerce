import { Router } from 'express';
import { createCheckout, handleWebhook } from './checkout.controller';
import { optionalCustomerAuth } from '../middlewares/customer-auth.middleware';

export const checkoutRouter = Router();

checkoutRouter.post('/', optionalCustomerAuth, createCheckout);
checkoutRouter.post('/webhook', handleWebhook);
