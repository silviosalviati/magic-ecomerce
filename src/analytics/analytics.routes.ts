import { Router, Request, Response } from 'express';
import { trackEvent } from './analytics.controller';

const analyticsRouter = Router();

analyticsRouter.post('/event', (req: Request, res: Response) =>
  trackEvent(req, res)
);

export { analyticsRouter };