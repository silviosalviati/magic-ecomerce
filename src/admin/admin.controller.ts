import { Request, Response } from 'express';
import { prisma } from '../config/database';
import {
  buildPhotoObjectPath,
  deleteObjectByPath,
  isAllowedImageMimeType,
  uploadImageBuffer,
} from '../config/storage';

function clientError(error: unknown): string {
  if (process.env.NODE_ENV === 'production') return 'Erro interno.';
  return error instanceof Error ? error.message : String(error);
}

function normalizeReferenceToken(value: string): string {
  return value.trim().replace(/[\s.]+$/g, '');
}

function normalizeStorageToken(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9\-_]/g, '_');
}

function buildReferenceCandidates(reference: string): string[] {
  const normalized = normalizeReferenceToken(reference);
  const parts = normalized
    .split(/[&|,;\/_\-\s]+/g)
    .map((part) => normalizeReferenceToken(part))
    .filter(Boolean);

  const alnum = normalized.replace(/[^a-zA-Z0-9]/g, '');

  return Array.from(new Set([
    normalized,
    ...parts,
    alnum,
  ].filter(Boolean)));
}

function getPublicApiBaseUrl(req?: Request): string {
  const configured = [
    process.env.PUBLIC_API_BASE_URL,
    process.env.API_PUBLIC_BASE_URL,
    process.env.APP_BASE_URL,
  ]
    .map((value) => String(value || '').trim())
    .find((value) => value.length > 0);

  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  if (req) {
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0]?.trim();
    const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0]?.trim();
    const host = forwardedHost || String(req.headers.host || '').trim();
    const proto = forwardedProto || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');

    if (host) {
      return `${proto}://${host}`.replace(/\/+$/, '');
    }
  }

  return 'https://magic-ecomerce-api-731025483706.us-central1.run.app';
}

function buildImageProxyUrl(objectPath: string, req?: Request): string {
  const base = getPublicApiBaseUrl(req);
  return `${base}/products/images/object?path=${encodeURIComponent(objectPath)}`;
}

function extractProductObjectPathFromUrl(imageUrl: string): string | null {
  const raw = String(imageUrl || '').trim();
  if (!raw) {
    return null;
  }

  const sanitizeObjectPath = (value: string): string | null => {
    const normalized = String(value || '').trim().replace(/^\/+/, '');
    if (!normalized.startsWith('produtos/') || normalized.includes('..')) {
      return null;
    }
    return normalized;
  };

  if (raw.startsWith('produtos/')) {
    return sanitizeObjectPath(raw);
  }

  try {
    const parsed = new URL(raw);

    if (parsed.pathname === '/products/images/object') {
      const objectPath = decodeURIComponent(String(parsed.searchParams.get('path') || ''));
      return sanitizeObjectPath(objectPath);
    }

    const decodedPath = decodeURIComponent(parsed.pathname || '');
    const marker = '/produtos/';
    const markerIndex = decodedPath.indexOf(marker);

    if (markerIndex >= 0) {
      return sanitizeObjectPath(decodedPath.slice(markerIndex + 1));
    }
  } catch {
    return null;
  }

  return null;
}

export class AdminController {
  private async resolveProductByReference(reference: string): Promise<{
    product: any;
    source: 'barcode' | 'productId' | 'productName';
    matchedReference: string;
  } | null> {
    const candidates = buildReferenceCandidates(reference);

    for (const candidate of candidates) {
      const variant = await prisma.variant.findFirst({
        where: { barcode: candidate },
        include: { product: { include: { variants: true } } },
      });

      if (variant?.product) {
        return {
          product: variant.product,
          source: 'barcode',
          matchedReference: candidate,
        };
      }
    }

    for (const candidate of candidates) {
      const variant = await prisma.variant.findFirst({
        where: {
          barcode: {
            startsWith: candidate,
            mode: 'insensitive',
          },
        },
        include: { product: { include: { variants: true } } },
      });

      if (variant?.product) {
        return {
          product: variant.product,
          source: 'barcode',
          matchedReference: candidate,
        };
      }
    }

    for (const candidate of candidates) {
      const product = await prisma.product.findFirst({
        where: {
          OR: [
            { id: candidate },
            { name: { equals: candidate, mode: 'insensitive' } },
          ],
        },
        include: { variants: true },
      });

      if (product) {
        return {
          product,
          source: product.id === candidate ? 'productId' : 'productName',
          matchedReference: candidate,
        };
      }
    }

    return null;
  }

  // GET /admin/products/reference/:reference
  async getProductByReference(req: Request, res: Response): Promise<void> {
    try {
      const reference = String(req.params['reference'] || '').trim();
      if (!reference) {
        res.status(400).json({ error: 'Referência obrigatória.' });
        return;
      }

      const resolved = await this.resolveProductByReference(reference);
      if (!resolved) {
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
        source: resolved.source,
        matchedReference: resolved.matchedReference,
        product: resolved.product,
      });
    } catch (error) {
      console.error('[admin][upload-photos]', error);
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
        targetBarcode,
      } = req.body as {
        frontBase64?: string;
        backBase64?: string;
        contentTypeFront?: string;
        contentTypeBack?: string;
        targetBarcode?: string;
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

      const resolved = await this.resolveProductByReference(reference);
      const product = resolved?.product || null;

      if (!product) {
        res.status(404).json({ error: 'Produto não encontrado para essa referência.' });
        return;
      }

      const selectedBarcode = String(targetBarcode || '').trim();
      const productVariants = Array.isArray(product.variants) ? product.variants : [];
      const resolvedBarcode = selectedBarcode || (
        productVariants.length === 1 ? String(productVariants[0]?.barcode || '').trim() : ''
      );

      if (!resolvedBarcode) {
        res.status(400).json({ error: 'Selecione uma variante com código de barras para enviar as fotos.' });
        return;
      }

      const selectedVariant = productVariants.find(
        (variant: { barcode?: string | null }) => String(variant.barcode || '').trim() === resolvedBarcode
      );

      if (!selectedVariant) {
        res.status(400).json({ error: 'Variante selecionada não pertence ao produto informado.' });
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

      const frontObjectPath = buildPhotoObjectPath({
        barcode: resolvedBarcode,
        fileName: `${resolvedBarcode}_Frente.jpg`,
        contentType: 'image/jpeg',
      });

      const backObjectPath = buildPhotoObjectPath({
        barcode: resolvedBarcode,
        fileName: `${resolvedBarcode}_Costas.jpg`,
        contentType: 'image/jpeg',
      });

      const existingImages = Array.isArray(product.images) ? product.images : [];
      const targetFolder = `produtos/${normalizeStorageToken(resolvedBarcode)}/`;
      const objectPathsToDelete = new Set<string>([frontObjectPath, backObjectPath]);

      for (const imageUrl of existingImages) {
        const objectPath = extractProductObjectPathFromUrl(String(imageUrl || ''));
        if (objectPath && objectPath.startsWith(targetFolder)) {
          objectPathsToDelete.add(objectPath);
        }
      }

      await Promise.all(
        Array.from(objectPathsToDelete).map((objectPath) =>
          deleteObjectByPath(objectPath, 'magic-ecommerce-fotos')
        )
      );

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

      const frontCatalogUrl = buildImageProxyUrl(frontObjectPath, req);
      const backCatalogUrl = buildImageProxyUrl(backObjectPath, req);
      const preservedImages = existingImages.filter((imageUrl: string) => {
        const objectPath = extractProductObjectPathFromUrl(String(imageUrl || ''));
        return !objectPath || !objectPath.startsWith(targetFolder);
      });

      const nextImages = [...preservedImages, frontCatalogUrl, backCatalogUrl];

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
          frontUrl: frontCatalogUrl,
          backUrl: backCatalogUrl,
          frontStorageUrl: frontUpload.publicUrl,
          backStorageUrl: backUpload.publicUrl,
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
      const [totalProducts, totalVariants, totalUsers, lowStock] = await Promise.all([
        prisma.product.count(),
        prisma.variant.count(),
        prisma.user.count(),
        prisma.variant.findMany({
          where: { stock: { lte: 5 } },
          include: { product: { select: { name: true } } },
          orderBy: { stock: 'asc' },
        }),
      ]);

      res.json({
        totalProducts,
        totalVariants,
        totalUsers,
        lowStockAlerts: lowStock.length,
        lowStockItems: lowStock,
      });
    } catch (error) {
      res.status(500).json({ error: clientError(error) });
    }
  }

  // GET /admin/users
  async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const page = Math.max(1, Number(req.query['page']) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query['limit']) || 25));
      const search = String(req.query['search'] || '').trim();
      const skip = (page - 1) * limit;

      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {};

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            isAdmin: true,
            emailVerifiedAt: true,
            failedLoginAttempts: true,
            lockedUntil: true,
            createdAt: true,
            _count: { select: { orders: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      res.json({ users, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (error) {
      res.status(500).json({ error: clientError(error) });
    }
  }

  // GET /admin/users/:id
  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params['id']);
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          isAdmin: true,
          emailVerifiedAt: true,
          failedLoginAttempts: true,
          lockedUntil: true,
          createdAt: true,
          orders: {
            select: { id: true, total: true, status: true, createdAt: true, paymentMethod: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado.' });
        return;
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: clientError(error) });
    }
  }

  // PATCH /admin/users/:id
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params['id']);
      const { name, email, isAdmin, unlockAccount } = req.body as {
        name?: string;
        email?: string;
        isAdmin?: boolean;
        unlockAccount?: boolean;
      };

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'Usuário não encontrado.' });
        return;
      }

      const data: Record<string, unknown> = {};
      if (name !== undefined) data['name'] = String(name).trim();
      if (email !== undefined) data['email'] = String(email).trim().toLowerCase();
      if (isAdmin !== undefined) data['isAdmin'] = Boolean(isAdmin);
      if (unlockAccount) {
        data['failedLoginAttempts'] = 0;
        data['lockedUntil'] = null;
      }

      const updated = await prisma.user.update({
        where: { id },
        data,
        select: {
          id: true, name: true, email: true, isAdmin: true,
          failedLoginAttempts: true, lockedUntil: true,
        },
      });

      res.json({ message: 'Usuário atualizado.', user: updated });
    } catch (error) {
      res.status(500).json({ error: clientError(error) });
    }
  }

  // DELETE /admin/users/:id
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params['id']);

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'Usuário não encontrado.' });
        return;
      }

      await prisma.order.updateMany({ where: { userId: id }, data: { userId: null } });
      await prisma.user.delete({ where: { id } });

      res.json({ message: 'Usuário removido com sucesso.' });
    } catch (error) {
      res.status(500).json({ error: clientError(error) });
    }
  }

  // GET /admin/coupons
  async listCoupons(_req: Request, res: Response): Promise<void> {
    try {
      const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
      res.json({ coupons });
    } catch (error) {
      res.status(500).json({ error: clientError(error) });
    }
  }

  // POST /admin/coupons
  async createCoupon(req: Request, res: Response): Promise<void> {
    try {
      const { code, type, discount, expiresAt, maxUses } = req.body as {
        code?: string;
        type?: string;
        discount?: unknown;
        expiresAt?: string;
        maxUses?: unknown;
      };

      if (!code?.trim()) {
        res.status(400).json({ error: 'Código do cupom é obrigatório.' });
        return;
      }
      if (!['PERCENTAGE', 'FIXED'].includes(String(type || ''))) {
        res.status(400).json({ error: 'Tipo deve ser PERCENTAGE ou FIXED.' });
        return;
      }
      const discountNum = Number(discount);
      if (!Number.isFinite(discountNum) || discountNum <= 0) {
        res.status(400).json({ error: 'Desconto deve ser um número positivo.' });
        return;
      }
      if (!expiresAt || isNaN(new Date(expiresAt).getTime())) {
        res.status(400).json({ error: 'Data de expiração inválida.' });
        return;
      }

      const coupon = await prisma.coupon.create({
        data: {
          code: String(code).toUpperCase().trim(),
          type: String(type),
          discount: discountNum,
          expiresAt: new Date(expiresAt),
          maxUses: maxUses != null && Number.isFinite(Number(maxUses)) && Number(maxUses) > 0
            ? Number(maxUses)
            : null,
        },
      });

      res.status(201).json({ coupon });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        res.status(409).json({ error: 'Já existe um cupom com esse código.' });
        return;
      }
      res.status(500).json({ error: clientError(error) });
    }
  }

  // PATCH /admin/coupons/:id
  async updateCoupon(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params['id']);
      const { active, expiresAt, maxUses } = req.body as {
        active?: boolean;
        expiresAt?: string;
        maxUses?: unknown;
      };

      const existing = await prisma.coupon.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'Cupom não encontrado.' });
        return;
      }

      const data: Record<string, unknown> = {};
      if (active !== undefined) data['active'] = Boolean(active);
      if (expiresAt && !isNaN(new Date(expiresAt).getTime())) data['expiresAt'] = new Date(expiresAt);
      if (maxUses !== undefined) {
        data['maxUses'] = maxUses != null && Number.isFinite(Number(maxUses)) && Number(maxUses) > 0
          ? Number(maxUses)
          : null;
      }

      const updated = await prisma.coupon.update({ where: { id }, data });
      res.json({ coupon: updated });
    } catch (error) {
      res.status(500).json({ error: clientError(error) });
    }
  }

  // DELETE /admin/coupons/:id
  async deleteCoupon(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params['id']);
      const existing = await prisma.coupon.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'Cupom não encontrado.' });
        return;
      }
      await prisma.coupon.delete({ where: { id } });
      res.json({ message: 'Cupom removido.' });
    } catch (error) {
      res.status(500).json({ error: clientError(error) });
    }
  }
}