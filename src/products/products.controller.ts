import { Request, Response } from 'express';
import sharp from 'sharp';
import { prisma } from '../config/database';
import {
  isAllowedImageMimeType,
  createSignedUploadUrl,
  buildPhotoObjectPath,
  uploadImageBuffer,
  getObjectBufferByPath,
  getObjectStreamByPath,
} from '../config/storage';
import { buildProductGroupKey } from './product-grouping';
const { generateMannequinPreview } = require('../config/vertexai');

type ImageFormat = 'jpeg' | 'png' | 'webp';

type ImageTransformOptions = {
  width?: number;
  quality?: number;
  format?: ImageFormat;
};

function parseIntegerQuery(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function resolveImageTransformOptions(req: Request): ImageTransformOptions | null {
  const rawWidth = parseIntegerQuery(req.query['w']);
  const rawQuality = parseIntegerQuery(req.query['q']);
  const rawFormat = String(req.query['fm'] || '')
    .trim()
    .toLowerCase();

  if (rawWidth !== null && (rawWidth < 200 || rawWidth > 2400)) {
    throw new Error('Parâmetro w inválido. Use entre 200 e 2400.');
  }

  if (rawQuality !== null && (rawQuality < 45 || rawQuality > 90)) {
    throw new Error('Parâmetro q inválido. Use entre 45 e 90.');
  }

  let format: ImageFormat | undefined;
  if (rawFormat) {
    if (rawFormat !== 'jpeg' && rawFormat !== 'png' && rawFormat !== 'webp') {
      throw new Error('Parâmetro fm inválido. Use jpeg, png ou webp.');
    }
    format = rawFormat;
  }

  if (rawWidth === null && rawQuality === null && !format) {
    return null;
  }

  return {
    width: rawWidth === null ? undefined : rawWidth,
    quality: rawQuality === null ? undefined : rawQuality,
    format,
  };
}

async function transformImageBuffer(params: {
  buffer: Buffer;
  contentType: string;
  options: ImageTransformOptions;
}): Promise<{ buffer: Buffer; contentType: string }> {
  const { buffer, contentType, options } = params;

  let pipeline = sharp(buffer, { failOn: 'none' }).rotate();

  if (options.width) {
    pipeline = pipeline.resize({
      width: options.width,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  const normalizedSource = contentType.toLowerCase();
  const targetFormat: ImageFormat =
    options.format || (normalizedSource.includes('png') ? 'webp' : 'jpeg');
  const quality = options.quality || (targetFormat === 'png' ? 80 : 72);

  if (targetFormat === 'webp') {
    pipeline = pipeline.webp({ quality });
    return {
      buffer: await pipeline.toBuffer(),
      contentType: 'image/webp',
    };
  }

  if (targetFormat === 'png') {
    pipeline = pipeline.png({ quality, compressionLevel: 9, adaptiveFiltering: true });
    return {
      buffer: await pipeline.toBuffer(),
      contentType: 'image/png',
    };
  }

  pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  return {
    buffer: await pipeline.toBuffer(),
    contentType: 'image/jpeg',
  };
}

function clientError(error: unknown): string {
  if (process.env.NODE_ENV === 'production') return 'Erro interno. Tente novamente.';
  return error instanceof Error ? error.message : String(error);
}

function isUniqueBarcodeError(error: unknown): boolean {
  const prismaError = error as { code?: string; meta?: { target?: unknown } };
  return (
    prismaError.code === 'P2002' &&
    String(prismaError.meta?.target ?? '').includes('barcode')
  );
}

function logServerError(scope: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(`[${scope}]`, error.message, error.stack);
    return;
  }
  console.error(`[${scope}]`, error);
}

function mergeDuplicateProductsByNameAndCategory(products: any[]): any[] {
  const grouped = new Map<string, any>();

  for (const product of products) {
    const key = buildProductGroupKey(product);
    const current = grouped.get(key);

    if (!current) {
      grouped.set(key, {
        ...product,
        variants: [...(product.variants || [])],
      });
      continue;
    }

    const seenVariantIds = new Set((current.variants || []).map((variant: any) => variant.id));
    for (const variant of product.variants || []) {
      if (!seenVariantIds.has(variant.id)) {
        current.variants.push(variant);
        seenVariantIds.add(variant.id);
      }
    }

    if ((!current.images || current.images.length === 0) && product.images?.length) {
      current.images = product.images;
    }

    if ((!current.description || current.description.trim().length === 0) && product.description) {
      current.description = product.description;
    }
  }

  return Array.from(grouped.values());
}

export class ProductsController {
  // GET /products/images/object?path=produtos/...
  async getImageObject(req: Request, res: Response): Promise<void> {
    try {
      const objectPath = String(req.query['path'] || '').trim();
      const transformOptions = resolveImageTransformOptions(req);

      if (!objectPath) {
        res.status(400).json({ error: 'path é obrigatório.' });
        return;
      }

      if (!objectPath.startsWith('produtos/') || objectPath.includes('..')) {
        res.status(400).json({ error: 'path inválido.' });
        return;
      }

      if (transformOptions) {
        const file = await getObjectBufferByPath({ objectPath });
        const transformed = await transformImageBuffer({
          buffer: file.buffer,
          contentType: file.contentType,
          options: transformOptions,
        });

        res.setHeader('Content-Type', transformed.contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Content-Length', transformed.buffer.length);

        if (req.method === 'HEAD') {
          res.status(200).end();
          return;
        }

        res.send(transformed.buffer);
        return;
      }

      const file = await getObjectStreamByPath({ objectPath });
      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      if (file.contentLength) {
        res.setHeader('Content-Length', file.contentLength);
      }

      if (req.method === 'HEAD') {
        res.status(200).end();
        return;
      }

      file.stream.on('error', () => {
        if (!res.headersSent) {
          res.status(500).json({ error: 'Falha ao ler imagem.' });
          return;
        }
        res.end();
      });
      file.stream.pipe(res);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Parâmetro')) {
        res.status(400).json({ error: error.message });
        return;
      }

      const code = Number((error as { code?: unknown })?.code || 0);
      if (code === 404) {
        res.status(404).json({ error: 'Imagem não encontrada.' });
        return;
      }

      res.status(500).json({ error: clientError(error) });
    }
  }

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

      const costPriceNumber = Number(costPrice);
      const markupNumber = Number(markup);
      const calculatedPriceNumber = Number((costPriceNumber * markupNumber).toFixed(2));

      if (!Number.isFinite(costPriceNumber) || costPriceNumber <= 0) {
        res.status(400).json({ error: 'Custo inválido.' });
        return;
      }

      if (!Number.isFinite(markupNumber) || markupNumber <= 0) {
        res.status(400).json({ error: 'Markup inválido.' });
        return;
      }

      if (!Number.isFinite(normalizedStock) || normalizedStock < 0) {
        res.status(400).json({ error: 'Estoque inválido.' });
        return;
      }

      const { product, variant } = await prisma.$transaction(async (tx: any) => {
        const existingVariant = await tx.variant.findUnique({
          where: { barcode: normalizedBarcode },
        });

        if (existingVariant) {
          throw new Error('BARCODE_CONFLICT');
        }

        const existingProduct = await tx.product.findFirst({
          where: {
            name: {
              equals: normalizedName,
              mode: 'insensitive',
            },
            category: {
              equals: normalizedCategory,
              mode: 'insensitive',
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        const product = existingProduct
          ? existingProduct
          : await tx.product.create({
              data: {
                name: normalizedName,
                description: normalizedDescription,
                category: normalizedCategory,
                costPrice: costPriceNumber,
                markup: markupNumber,
                basePrice: calculatedPriceNumber,
              },
            });

        if (existingProduct) {
          const existingCost = Number(existingProduct.costPrice);
          const existingMarkup = Number(existingProduct.markup);
          const costDiff = Math.abs(existingCost - costPriceNumber);
          const markupDiff = Math.abs(existingMarkup - markupNumber);

          if (costDiff > 0.0001 || markupDiff > 0.0001) {
            throw new Error('PRODUCT_PRICE_MISMATCH');
          }

          if (
            (!existingProduct.description || String(existingProduct.description).trim().length === 0) &&
            normalizedDescription
          ) {
            await tx.product.update({
              where: { id: existingProduct.id },
              data: { description: normalizedDescription },
            });
          }
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

      if (error instanceof Error && error.message === 'PRODUCT_PRICE_MISMATCH') {
        res.status(409).json({ error: 'Já existe produto com este nome/categoria e custo ou markup diferente.' });
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
      const groupedProducts = mergeDuplicateProductsByNameAndCategory(products);
      res.json(groupedProducts);
    } catch (error) {
      logServerError('products.listAll', error);
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
      if (!code) {
        res.status(400).json({ error: 'Barcode inválido.' });
        return;
      }

      const variant = await prisma.variant.findFirst({
        where: { barcode: code },
      });

      if (!variant) {
        res.status(404).json({
          found: false,
          message: 'Produto não cadastrado. Deseja cadastrar?',
          barcode: code,
        });
        return;
      }

      let product = await prisma.product.findUnique({
        where: { id: variant.productId },
      });

      // Autocorreção: se a variante existir sem product associado no banco,
      // recria o product com o mesmo id referenciado pela variante.
      if (!product) {
        const orphanProductId = variant.productId;

        await prisma.$transaction(async (tx: any) => {
          const existingProduct = await tx.product.findUnique({
            where: { id: orphanProductId },
          });

          if (!existingProduct) {
            await tx.product.create({
              data: {
                id: orphanProductId,
                name: `Produto ${code}`,
                description: `Registro recriado automaticamente a partir da variante ${code}.`,
                category: 'GERAL',
                costPrice: 0.01,
                markup: 1,
                basePrice: 0.01,
              },
            });
          }
        });

        product = await prisma.product.findUnique({
          where: { id: orphanProductId },
        });

        if (!product) {
          res.status(500).json({ error: 'Não foi possível reconstruir o produto associado à variante.' });
          return;
        }
      }

      res.json({
        found: true,
        barcode: variant.barcode,
        produto: product.name,
        categoria: product.category,
        tamanho: variant.size,
        cor: variant.color,
        estoque: variant.stock,
        precoVenda: product.basePrice,
        custoProduto: product.costPrice,
        markup: product.markup,
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
