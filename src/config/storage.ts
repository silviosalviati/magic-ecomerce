import { randomUUID } from 'crypto';
import path from 'path';
import { Storage } from '@google-cloud/storage';
import { Readable } from 'stream';

const SIGNED_UPLOAD_TTL_MS = 5 * 60 * 1000;

const allowedImageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

let storageClient: Storage | null = null;

function getStorageClient(): Storage {
  if (!storageClient) {
    storageClient = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
    });
  }
  return storageClient;
}

function normalizePath(value: string): string {
  return value.replace(/[^a-zA-Z0-9\-_\/]/g, '_').slice(0, 200);
}

function normalizeFileToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9\-_]/g, '_').slice(0, 120);
}

function detectExtension(fileName: string, contentType: string): string {
  const ext = path.extname(fileName).replace('.', '').toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'jpg';
  if (ext === 'png') return 'png';
  if (ext === 'webp') return 'webp';
  
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  
  return ext || 'jpg';
}

function buildPhotoObjectPath(params: {
  barcode: string;
  fileName: string;
  contentType: string;
}): string {
  const { barcode, fileName, contentType } = params;
  const safeBarcode = normalizePath(barcode);
  const extension = detectExtension(fileName, contentType);
  
  return `produtos/${safeBarcode}/${fileName.replace(/\.[^.]+$/, '')}.${extension}`;
}

export function isAllowedImageMimeType(contentType: string): boolean {
  return allowedImageMimeTypes.has(contentType);
}

export async function createSignedUploadUrl(params: {
  objectPath: string;
  contentType: string;
  bucket?: string;
}): Promise<{ signedUrl: string; expiresAt: string; publicUrl: string }> {
  const { objectPath, contentType } = params;
  const bucketName = params.bucket || process.env.GCP_BUCKET_NAME || 'magic-ecommerce-fotos';
  
  if (!bucketName) {
    throw new Error('Bucket não configurado (GCP_BUCKET_NAME).');
  }

  const storage = getStorageClient();
  const expires = Date.now() + SIGNED_UPLOAD_TTL_MS;

  const [signedUrl] = await storage
    .bucket(bucketName)
    .file(objectPath)
    .getSignedUrl({
      version: 'v4',
      action: 'write',
      expires,
      contentType,
    });

  const configuredBaseUrl = process.env.GCP_PUBLIC_BASE_URL?.trim();
  const publicBaseUrl = configuredBaseUrl && configuredBaseUrl.length > 0
    ? configuredBaseUrl.replace(/\/$/, '')
    : `https://storage.googleapis.com/${bucketName}`;

  return {
    signedUrl,
    expiresAt: new Date(expires).toISOString(),
    publicUrl: `${publicBaseUrl}/${encodeURIComponent(objectPath)}`,
  };
}

export async function uploadImageBuffer(params: {
  objectPath: string;
  contentType: string;
  buffer: Buffer;
  bucket?: string;
}): Promise<{ publicUrl: string; objectPath: string }> {
  const { objectPath, contentType, buffer } = params;
  const bucketName = params.bucket || process.env.GCP_BUCKET_NAME || 'magic-ecommerce-fotos';

  const storage = getStorageClient();
  await storage
    .bucket(bucketName)
    .file(objectPath)
    .save(buffer, {
      metadata: { contentType },
    });

  const configuredBaseUrl = process.env.GCP_PUBLIC_BASE_URL?.trim();
  const publicBaseUrl = configuredBaseUrl && configuredBaseUrl.length > 0
    ? configuredBaseUrl.replace(/\/$/, '')
    : `https://storage.googleapis.com/${bucketName}`;

  return {
    publicUrl: `${publicBaseUrl}/${encodeURIComponent(objectPath)}`,
    objectPath,
  };
}

export async function deleteObjectByPath(
  objectPath: string,
  bucket?: string
): Promise<void> {
  const bucketName = bucket || process.env.GCP_BUCKET_NAME || 'magic-ecommerce-fotos';
  const storage = getStorageClient();

  await storage
    .bucket(bucketName)
    .file(objectPath)
    .delete({ ignoreNotFound: true });
}

export async function getObjectBufferByPath(params: {
  objectPath: string;
  bucket?: string;
}): Promise<{ buffer: Buffer; contentType: string }> {
  const bucketName = params.bucket || process.env.GCP_BUCKET_NAME || 'magic-ecommerce-fotos';
  const storage = getStorageClient();
  const file = storage.bucket(bucketName).file(params.objectPath);

  const [exists] = await file.exists();
  if (!exists) {
    const notFound = new Error('Objeto não encontrado.');
    (notFound as { code?: number }).code = 404;
    throw notFound;
  }

  const [metadata] = await file.getMetadata();
  const [buffer] = await file.download();

  return {
    buffer,
    contentType: String(metadata.contentType || 'application/octet-stream'),
  };
}

export async function getObjectStreamByPath(params: {
  objectPath: string;
  bucket?: string;
}): Promise<{ stream: Readable; contentType: string; contentLength?: number }> {
  const bucketName = params.bucket || process.env.GCP_BUCKET_NAME || 'magic-ecommerce-fotos';
  const storage = getStorageClient();
  const file = storage.bucket(bucketName).file(params.objectPath);

  const [exists] = await file.exists();
  if (!exists) {
    const notFound = new Error('Objeto não encontrado.');
    (notFound as { code?: number }).code = 404;
    throw notFound;
  }

  const [metadata] = await file.getMetadata();
  const size = Number(metadata.size);

  return {
    stream: file.createReadStream(),
    contentType: String(metadata.contentType || 'application/octet-stream'),
    contentLength: Number.isFinite(size) ? size : undefined,
  };
}

export function buildProductPhotoObjectPath(params: {
  productId: string;
  side: 'frente' | 'costas';
}): string {
  const safeProductId = normalizeFileToken(params.productId);
  return `produtos/${safeProductId}-${params.side}.png`;
}

export { buildPhotoObjectPath };
