import { Router, Request, Response } from 'express';
import { ProductsController } from './products.controller';
import { validateCreateProduct, validateUpdateStock } from '../middlewares/validate.middleware';
import { requireAdminAccess } from '../middlewares/auth.middleware';

const productsRouter = Router();
const controller = new ProductsController();

// POST /products — cria produto + variante
productsRouter.post(
  '/',
  requireAdminAccess,
  validateCreateProduct,
  (req: Request, res: Response) => controller.create(req, res)
);

// GET /products — lista todos os produtos com variantes
productsRouter.get('/', (req: Request, res: Response) =>
  controller.listAll(req, res)
);

// POST /products/images/upload-url — gera URL assinada para upload
productsRouter.post('/images/upload-url', requireAdminAccess, (req: Request, res: Response) =>
  controller.createUploadUrl(req, res)
);

// POST /products/images/upload — fallback de upload via backend
productsRouter.post('/images/upload', requireAdminAccess, (req: Request, res: Response) =>
  controller.uploadImage(req, res)
);

// GET /products/images/object?path=produtos/... — proxy público para imagem no bucket
productsRouter.get('/images/object', (req: Request, res: Response) =>
  controller.getImageObject(req, res)
);

productsRouter.get('/barcode/:code', (req: Request, res: Response) =>
  controller.getByBarcode(req, res)
);

productsRouter.patch(
  '/barcode/:code/stock',
  requireAdminAccess,
  validateUpdateStock,
  (req: Request, res: Response) => controller.updateStock(req, res)
);

// POST /products/:barcode/generate-preview — gera preview com manequim
productsRouter.post('/:barcode/generate-preview', requireAdminAccess, (req: Request, res: Response) =>
  controller.generatePreview(req, res)
);
// GET /products/:id — detalhe de um produto
productsRouter.get('/:id', (req: Request, res: Response) =>
  controller.getOne(req, res)
);

export { productsRouter };