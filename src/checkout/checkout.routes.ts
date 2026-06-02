import { Router } from 'express';
import { createCheckout, getCheckoutInstallments, getShippingRates, handleWebhook, validateCouponEndpoint } from './checkout.controller';
import { optionalCustomerAuth } from '../middlewares/customer-auth.middleware';

export const checkoutRouter = Router();

checkoutRouter.get('/installments', getCheckoutInstallments);
checkoutRouter.get('/shipping-rates', getShippingRates);
checkoutRouter.post('/validate-coupon', validateCouponEndpoint);
checkoutRouter.post('/', optionalCustomerAuth, createCheckout);
checkoutRouter.post('/webhook', handleWebhook);
