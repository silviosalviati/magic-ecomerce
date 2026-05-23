import { Request, Response } from 'express';
import { prisma } from '../config/database';
import {
  buildProductPhotoObjectPath,
  isAllowedImageMimeType,
  uploadImageBuffer,
} from '../config/storage';

function clientError(error: unknown): string {
  if (process.env.NODE_ENV === 'production') return 'Erro interno.';
  return error instanceof Error ? error.message : String(error);
}

export class AdminController {
  // GET /admin/products/reference/:reference
  async getProductByReference(req: Request, res: Response): Promise<void> {
    try {
      const reference = String(req.params['reference'] || '').trim();
      if (!reference) {
        res.status(400).json({ error: 'Referência obrigatória.' });
        return;
      }

      const variant = await prisma.variant.findFirst({
        where: { barcode: reference },
        include: { product: { include: { variants: true } } },
      });

      if (variant?.product) {
        res.json({
          found: true,
          reference,
          source: 'barcode',
          product: variant.product,
        });
        return;
      }

      const product = await prisma.product.findFirst({
        where: {
          OR: [
            { id: reference },
            { name: { equals: reference, mode: 'insensitive' } },
          ],
        },
        include: { variants: true },
      });

      if (!product) {
        res.status(404).json({
          found: false,
          reference,
          message: 'Produto não encontrado para a referência informada.',
        });
        return;
      }

      res.json({
        found: true,
        reference,
        source: product.id === reference ? 'productId' : 'productName',
        product,
      });
    } catch (error) {
      res.status(500).json({ error: clientError(error) });
    }
  }

  // POST /admin/products/reference/:reference/photos
  async uploadPhotosByReference(req: Request, res: Response): Promise<void> {
    try {
      const reference = String(req.params['reference'] || '').trim();
      if (!reference) {
        res.status(400).json({ error: 'Referência obrigatória.' });
        return;
      }

      const {
        frontBase64,
        backBase64,
        contentTypeFront,
        contentTypeBack,
      } = req.body as {
        frontBase64?: string;
        backBase64?: string;
        contentTypeFront?: string;
        contentTypeBack?: string;
      };

      if (!frontBase64 || !backBase64) {
        res.status(400).json({ error: 'As duas fotos (frente e costas) são obrigatórias.' });
        return;
      }

      const frontContentType = String(contentTypeFront || 'image/png').trim().toLowerCase();
      const backContentType = String(contentTypeBack || 'image/png').trim().toLowerCase();

      if (!isAllowedImageMimeType(frontContentType) || !isAllowedImageMimeType(backContentType)) {
        res.status(400).json({ error: 'Formato de imagem não permitido.' });
        return;
      }

      const variant = await prisma.variant.findFirst({
        where: { barcode: reference },
        include: { product: true },
      });

      const product = variant?.product
        ? variant.product
        : await prisma.product.findFirst({
          where: {
            OR: [
              { id: reference },
              { name: { equals: reference, mode: 'insensitive' } },
            ],
          },
        });

      if (!product) {
        res.status(404).json({ error: 'Produto não encontrado para essa referência.' });
        return;
      }

      const normalizeBase64Payload = (raw: string): string =>
        raw.includes(',') ? String(raw.split(',').pop() || '') : raw;

      const frontBuffer = Buffer.from(normalizeBase64Payload(frontBase64), 'base64');
      const backBuffer = Buffer.from(normalizeBase64Payload(backBase64), 'base64');

      if (!frontBuffer.length || !backBuffer.length) {
        res.status(400).json({ error: 'Arquivo inválido.' });
        return;
      }

      const frontObjectPath = buildProductPhotoObjectPath({
        productId: product.id,
        side: 'frente',
      });

      const backObjectPath = buildProductPhotoObjectPath({
        productId: product.id,
        side: 'costas',
      });

      const [frontUpload, backUpload] = await Promise.all([
        uploadImageBuffer({
          objectPath: frontObjectPath,
          contentType: 'image/png',
          buffer: frontBuffer,
          bucket: 'magic-ecommerce-fotos',
        }),
        uploadImageBuffer({
          objectPath: backObjectPath,
          contentType: 'image/png',
          buffer: backBuffer,
          bucket: 'magic-ecommerce-fotos',
        }),
      ]);

      const existingImages = Array.isArray(product.images) ? product.images : [];
      const cleaned = existingImages.filter(
        (url) => !url.includes(`${product.id}-frente.png`) && !url.includes(`${product.id}-costas.png`)
      );
      const nextImages = [frontUpload.publicUrl, backUpload.publicUrl, ...cleaned];

      const updatedProduct = await prisma.product.update({
        where: { id: product.id },
        data: { images: nextImages },
        include: { variants: true },
      });

      res.status(201).json({
        success: true,
        message: 'Fotos enviadas e vinculadas ao produto com sucesso.',
        product: updatedProduct,
        photos: {
          frontUrl: frontUpload.publicUrl,
          backUrl: backUpload.publicUrl,
          frontObjectPath,
          backObjectPath,
        },
      });
    } catch (error) {
      res.status(500).json({ error: clientError(error) });
    }
  }

  // GET /admin/products
  async listProducts(_req: Request, res: Response): Promise<void> {
    try {
      const products = await prisma.product.findMany({
        include: { variants: true },
        orderBy: { createdAt: 'desc' },
      });
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: clientError(error) });
    }
  }

  // DELETE /admin/products/:id
  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params['id']);

      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) {
        res.status(404).json({ error: 'Produto não encontrado.' });
        return;
      }

      await prisma.variant.deleteMany({ where: { productId: id } });
      await prisma.product.delete({ where: { id } });

      res.json({ message: 'Produto e variantes removidos com sucesso.' });
    } catch (error) {
      res.status(500).json({ error: clientError(error) });
    }
  }

  // PATCH /admin/variants/:id/stock
  async updateStock(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params['id']);
      const { stock } = req.body;

      const variant = await prisma.variant.findUnique({ where: { id } });
      if (!variant) {
        res.status(404).json({ error: 'Variante não encontrada.' });
        return;
      }

      const updated = await prisma.variant.update({
        where: { id },
        data: { stock: Number(stock) },
      });

      res.json({ message: 'Estoque atualizado.', variant: updated });
    } catch (error) {
      res.status(500).json({ error: clientError(error) });
    }
  }

  // GET /admin/dashboard
  async dashboard(_req: Request, res: Response): Promise<void> {
    try {
      const [totalProducts, totalVariants, lowStock] = await Promise.all([
        prisma.product.count(),
        prisma.variant.count(),
        prisma.variant.findMany({
          where: { stock: { lte: 5 } },
          include: { product: { select: { name: true } } },
          orderBy: { stock: 'asc' },
        }),
      ]);

      res.json({
        totalProducts,
        totalVariants,
        lowStockAlerts: lowStock.length,
        lowStockItems: lowStock,
      });
    } catch (error) {
      res.status(500).json({ error: clientError(error) });
    }
  }
}