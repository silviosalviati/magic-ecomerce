import { Router } from 'express';
import { createCheckout, getCheckoutInstallments, handleWebhook, validateCouponEndpoint } from './checkout.controller';
import { optionalCustomerAuth } from '../middlewares/customer-auth.middleware';

export const checkoutRouter = Router();

checkoutRouter.get('/installments', getCheckoutInstallments);
checkoutRouter.post('/validate-coupon', validateCouponEndpoint);
checkoutRouter.post('/', optionalCustomerAuth, createCheckout);
checkoutRouter.post('/webhook', handleWebhook);
