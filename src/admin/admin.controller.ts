import { Request, Response } from 'express';
import { prisma } from '../config/database';

function clientError(error: unknown): string {
  if (process.env.NODE_ENV === 'production') return 'Erro interno.';
  return error instanceof Error ? error.message : String(error);
}

export class AdminController {
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