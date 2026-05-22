import { Router } from 'express';
import { createCheckout, handleWebhook } from './checkout.controller';

export const checkoutRouter = Router();

checkoutRouter.post('/', createCheckout);
checkoutRouter.post('/webhook', handleWebhook);
