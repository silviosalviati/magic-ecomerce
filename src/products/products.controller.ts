import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import {
  isAllowedImageMimeType,
  createSignedUploadUrl,
  buildPhotoObjectPath,
  uploadImageBuffer,
} from '../config/storage';
const { generateMannequinPreview } = require('../config/vertexai');

function clientError(error: unknown): string {
  if (process.env.NODE_ENV === 'production') return 'Erro interno. Tente novamente.';
  return error instanceof Error ? error.message : String(error);
}

function isUniqueBarcodeError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    String(error.meta?.['target'] ?? '').includes('barcode')
  );
}

export class ProductsController {
  // POST /products
  async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        description,
        category,
        costPrice,
        markup,
        size,
        color,
        barcode,
        stock,
      } = req.body;

      const normalizedName = String(name).trim();
      const normalizedCategory = String(category).trim();
      const normalizedDescription = description ? String(description).trim() : null;
      const normalizedBarcode = String(barcode).trim();
      const normalizedSize = String(size).trim();
      const normalizedColor = String(color).trim();
      const normalizedStock = Number(stock);

      const costPriceDecimal = new Prisma.Decimal(String(costPrice));
      const markupDecimal = new Prisma.Decimal(String(markup));
      const calculatedPrice = costPriceDecimal
        .mul(markupDecimal)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

      const { product, variant } = await prisma.$transaction(async (tx) => {
        const existingVariant = await tx.variant.findUnique({
          where: { barcode: normalizedBarcode },
        });

        if (existingVariant) {
          throw new Error('BARCODE_CONFLICT');
        }

        let product = await tx.product.findFirst({
          where: {
            name: normalizedName,
            category: normalizedCategory,
            costPrice: costPriceDecimal,
            markup: markupDecimal,
          },
        });

        if (!product) {
          product = await tx.product.create({
            data: {
              name: normalizedName,
              description: normalizedDescription,
              category: normalizedCategory,
              costPrice: costPriceDecimal,
              markup: markupDecimal,
              basePrice: calculatedPrice,
            },
          });
        }

        const variant = await tx.variant.create({
          data: {
            productId: product.id,
            size: normalizedSize,
            color: normalizedColor,
            barcode: normalizedBarcode,
            stock: normalizedStock,
          },
        });

        return { product, variant };
      });

      res.status(201).json({
        message: 'Produto e variante registrados com sucesso.',
        product,
        variant,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'BARCODE_CONFLICT') {
        res.status(409).json({ error: 'Barcode já cadastrado para outra variante.' });
        return;
      }

      if (isUniqueBarcodeError(error)) {
        res.status(409).json({ error: 'Barcode já cadastrado para outra variante.' });
        return;
      }

      res.status(500).json({ error: clientError(error) });
    }
  }

  // GET /products
  async listAll(_req: Request, res: Response): Promise<void> {
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

  // GET /products/:id
  async getOne(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params['id']);

      const product = await prisma.product.findUnique({
        where: { id },
        include: { variants: true },
      });

      if (!product) {
        res.status(404).json({ error: 'Produto não encontrado.' });
        return;
      }

      res.json(product);
    } catch (error) {
      res.status(500).json({ error: clientError(error) });
    }
  }

  // GET /products/barcode/:code
  async getByBarcode(req: Request, res: Response): Promise<void> {
    try {
      const code = String(req.params['code']).trim();

      const variant = await prisma.variant.findFirst({
        where: { barcode: code },
        include: {
          product: true,
        },
      });

      if (!variant) {
        res.status(404).json({
          found: false,
          message: 'Produto não cadastrado. Deseja cadastrar?',
          barcode: code,
        });
        return;
      }

      res.json({
        found: true,
        barcode: variant.barcode,
        produto: variant.product.name,
        categoria: variant.product.category,
        tamanho: variant.size,
        cor: variant.color,
        estoque: variant.stock,
        precoVenda: variant.product.basePrice,
        custoProduto: variant.product.costPrice,
        markup: variant.product.markup,
      });
    } catch (error) {
      res.status(500).json({ error: clientError(error) });
    }
  }

  // PATCH /products/barcode/:code/stock
  async updateStock(req: Request, res: Response): Promise<void> {
    try {
      const code = String(req.params['code']).trim();
      const { stock } = req.body;

      const newStock = Number(stock);
      if (!Number.isInteger(newStock) || newStock < 0) {
        res.status(400).json({ error: 'Estoque deve ser um inteiro maior ou igual a zero.' });
        return;
      }

      const variant = await prisma.variant.findFirst({ where: { barcode: code } });
      if (!variant) {
        res.status(404).json({ error: 'Variante não encontrada.' });
        return;
      }

      const updated = await prisma.variant.update({
        where: { id: variant.id },
        data: { stock: newStock },
      });

      res.json({ barcode: code, stock: updated.stock });
    } catch (error) {
      res.status(500).json({ error: clientError(error) });
    }
  }

  // POST /products/images/upload-url
  async createUploadUrl(req: Request, res: Response): Promise<void> {
    try {
      const { fileName, contentType, bucket, productId } = req.body;

      if (!fileName || typeof fileName !== 'string') {
        res.status(400).json({ error: 'fileName é obrigatório' });
        return;
      }

      if (!contentType || typeof contentType !== 'string') {
        res.status(400).json({ error: 'contentType é obrigatório' });
        return;
      }

      if (!isAllowedImageMimeType(contentType)) {
        res.status(400).json({ error: `contentType não permitido: ${contentType}` });
        return;
      }

      const normalizedProductId = String(productId || '').trim();
      if (!normalizedProductId) {
        res.status(400).json({ error: 'productId é obrigatório' });
        return;
      }

      const objectPath = buildPhotoObjectPath({
        barcode: normalizedProductId,
        fileName,
        contentType,
      });

      const uploadData = await createSignedUploadUrl({
        objectPath,
        contentType,
        bucket: bucket ? String(bucket).trim() : undefined,
      });

      res.json(uploadData);
    } catch (error) {
      res.status(500).json({ error: clientError(error) });
    }
  }

  // POST /products/images/upload
  async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      const { fileName, contentType, bucket, productId, fileBase64 } = req.body;

      if (!fileName || typeof fileName !== 'string') {
        res.status(400).json({ error: 'fileName é obrigatório' });
        return;
      }

      if (!contentType || typeof contentType !== 'string') {
        res.status(400).json({ error: 'contentType é obrigatório' });
        return;
      }

      if (!isAllowedImageMimeType(contentType)) {
        res.status(400).json({ error: `contentType não permitido: ${contentType}` });
        return;
      }

      const normalizedProductId = String(productId || '').trim();
      if (!normalizedProductId) {
        res.status(400).json({ error: 'productId é obrigatório' });
        return;
      }

      if (!fileBase64 || typeof fileBase64 !== 'string') {
        res.status(400).json({ error: 'fileBase64 é obrigatório' });
        return;
      }

      const base64Payload = fileBase64.includes(',')
        ? fileBase64.split(',').pop() || ''
        : fileBase64;

      const buffer = Buffer.from(base64Payload, 'base64');
      if (!buffer.length) {
        res.status(400).json({ error: 'Arquivo inválido.' });
        return;
      }

      const objectPath = buildPhotoObjectPath({
        barcode: normalizedProductId,
        fileName,
        contentType,
      });

      const uploaded = await uploadImageBuffer({
        objectPath,
        contentType,
        buffer,
        bucket: bucket ? String(bucket).trim() : undefined,
      });

      res.status(201).json({
        success: true,
        message: 'Upload concluído via backend.',
        objectPath: uploaded.objectPath,
        publicUrl: uploaded.publicUrl,
      });
    } catch (error) {
      res.status(500).json({ error: clientError(error) });
    }
  }

  // POST /products/:barcode/generate-preview
  async generatePreview(req: Request, res: Response): Promise<void> {
    try {
      const barcode = String(req.params['barcode']).trim();

      if (!barcode) {
        res.status(400).json({ error: 'Barcode é obrigatório' });
        return;
      }

      const variant = await prisma.variant.findFirst({
        where: { barcode },
        include: { product: true },
      });

      const bucket = process.env.GCP_BUCKET_NAME || 'magic-ecommerce-fotos';
      const frontImagePath = buildPhotoObjectPath({
        barcode,
        fileName: `${barcode}_Frente.jpg`,
        contentType: 'image/jpeg',
      });
      const backImagePath = buildPhotoObjectPath({
        barcode,
        fileName: `${barcode}_Costas.jpg`,
        contentType: 'image/jpeg',
      });

      const result = await generateMannequinPreview({
        barcode,
        frontImagePath,
        backImagePath,
        bucketName: bucket,
        productContext: {
          name: variant?.product.name,
          category: variant?.product.category,
          description: variant?.product.description || undefined,
          color: variant?.color,
          size: variant?.size,
        },
      });

      res.json({
        success: true,
        message: 'Preview gerado com sucesso!',
        previewUrl: result.previewUrl,
        generatedPath: result.generatedPath,
      });
    } catch (error) {
      res.status(500).json({ error: clientError(error) });
    }
  }
}
