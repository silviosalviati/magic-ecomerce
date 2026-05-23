import { Router, Request, Response } from 'express';
import { AdminController } from './admin.controller';
import { requireAdminKey } from '../middlewares/auth.middleware';
import { validateUpdateStock } from '../middlewares/validate.middleware';

const adminRouter = Router();
const controller = new AdminController();

// Rotas usadas pela tela /foto (sem header x-admin-key)
adminRouter.get('/products/reference/:reference', (req: Request, res: Response) =>
  controller.getProductByReference(req, res)
);

adminRouter.post('/products/reference/:reference/photos', (req: Request, res: Response) =>
  controller.uploadPhotosByReference(req, res)
);

// 🔒 Todas as rotas admin exigem x-admin-key no header
adminRouter.use(requireAdminKey);

// GET /admin/dashboard
adminRouter.get('/dashboard', (req: Request, res: Response) =>
  controller.dashboard(req, res)
);

// GET /admin/products
adminRouter.get('/products', (req: Request, res: Response) =>
  controller.listProducts(req, res)
);

// DELETE /admin/products/:id
adminRouter.delete('/products/:id', (req: Request, res: Response) =>
  controller.deleteProduct(req, res)
);

// PATCH /admin/variants/:id/stock
adminRouter.patch(
  '/variants/:id/stock',
  validateUpdateStock,
  (req: Request, res: Response) => controller.updateStock(req, res)
);

export { adminRouter };