import { Router, Request, Response } from 'express';
import { AdminController } from './admin.controller';
import { requireAdminAccess } from '../middlewares/auth.middleware';
import { validateUpdateStock } from '../middlewares/validate.middleware';
import { listOrders, getOrder, updateOrder, reconcileOrderPayment } from './orders.controller';
import { updateProductPrice, bulkUpdatePrice, getPriceHistory } from './price.controller';
import {
  getOverview,
  getFunnel,
  getSources,
  getTopProducts,
  getSessions,
} from '../analytics/analytics.admin.controller';

const adminRouter = Router();
const controller = new AdminController();

// 🔒 Todas as rotas admin exigem JWT com isAdmin=true
adminRouter.use(requireAdminAccess);

// ── Dashboard ────────────────────────────────────────────────────────────────
adminRouter.get('/dashboard', (req: Request, res: Response) =>
  controller.dashboard(req, res)
);

// ── Products / photos ────────────────────────────────────────────────────────
adminRouter.get('/products/reference/:reference', (req: Request, res: Response) =>
  controller.getProductByReference(req, res)
);
adminRouter.post('/products/reference/:reference/photos', (req: Request, res: Response) =>
  controller.uploadPhotosByReference(req, res)
);
adminRouter.get('/products', (req: Request, res: Response) =>
  controller.listProducts(req, res)
);
adminRouter.delete('/products/:id', (req: Request, res: Response) =>
  controller.deleteProduct(req, res)
);

// ── Variants ─────────────────────────────────────────────────────────────────
adminRouter.patch(
  '/variants/:id/stock',
  validateUpdateStock,
  (req: Request, res: Response) => controller.updateStock(req, res)
);

// ── Pricing ───────────────────────────────────────────────────────────────────
adminRouter.post('/products/bulk-price', (req: Request, res: Response) => bulkUpdatePrice(req, res));
adminRouter.patch('/products/:id/price', (req: Request, res: Response) => updateProductPrice(req, res));
adminRouter.get('/products/:id/price-history', (req: Request, res: Response) => getPriceHistory(req, res));

// ── Orders ───────────────────────────────────────────────────────────────────
adminRouter.get('/orders', (req: Request, res: Response) => listOrders(req, res));
adminRouter.get('/orders/:id', (req: Request, res: Response) => getOrder(req, res));
adminRouter.patch('/orders/:id', (req: Request, res: Response) => updateOrder(req, res));
adminRouter.post('/orders/:id/reconcile-payment', (req: Request, res: Response) => reconcileOrderPayment(req, res));

// ── Users ────────────────────────────────────────────────────────────────────
adminRouter.get('/users', (req: Request, res: Response) => controller.listUsers(req, res));
adminRouter.get('/users/:id', (req: Request, res: Response) => controller.getUser(req, res));
adminRouter.patch('/users/:id', (req: Request, res: Response) => controller.updateUser(req, res));
adminRouter.delete('/users/:id', (req: Request, res: Response) => controller.deleteUser(req, res));

// ── Coupons ───────────────────────────────────────────────────────────────────
adminRouter.get('/coupons', (req: Request, res: Response) => controller.listCoupons(req, res));
adminRouter.post('/coupons', (req: Request, res: Response) => controller.createCoupon(req, res));
adminRouter.patch('/coupons/:id', (req: Request, res: Response) => controller.updateCoupon(req, res));
adminRouter.delete('/coupons/:id', (req: Request, res: Response) => controller.deleteCoupon(req, res));

// ── Analytics ─────────────────────────────────────────────────────────────────
adminRouter.get('/analytics/overview', (req: Request, res: Response) => getOverview(req, res));
adminRouter.get('/analytics/funnel', (req: Request, res: Response) => getFunnel(req, res));
adminRouter.get('/analytics/sources', (req: Request, res: Response) => getSources(req, res));
adminRouter.get('/analytics/products', (req: Request, res: Response) => getTopProducts(req, res));
adminRouter.get('/analytics/sessions', (req: Request, res: Response) => getSessions(req, res));

export { adminRouter };
