import { prisma } from '../config/database';
import { deleteObjectByPath } from '../config/storage';

type CleanupResult = {
  affectedProducts: number;
  removedImageRefs: number;
  deletedObjects: number;
  failedDeletes: string[];
};

function normalizeBarcode(value: string | null | undefined): string {
  return String(value || '').trim().replace(/[^a-zA-Z0-9\-_]/g, '_');
}

function extractObjectPath(imageUrl: string): string | null {
  const raw = String(imageUrl || '').trim();
  if (!raw) return null;

  const sanitize = (value: string): string | null => {
    const normalized = String(value || '').trim().replace(/^\/+/, '');
    if (!normalized.startsWith('produtos/') || normalized.includes('..')) return null;
    return normalized;
  };

  if (raw.startsWith('produtos/')) return sanitize(raw);

  try {
    const parsed = new URL(raw);

    if (parsed.pathname === '/products/images/object') {
      return sanitize(decodeURIComponent(String(parsed.searchParams.get('path') || '')));
    }

    const decodedPath = decodeURIComponent(parsed.pathname || '');
    const marker = '/produtos/';
    const markerIndex = decodedPath.indexOf(marker);
    if (markerIndex >= 0) {
      return sanitize(decodedPath.slice(markerIndex + 1));
    }
  } catch {
    return null;
  }

  return null;
}

export async function cleanupNonVariantPhotos(): Promise<CleanupResult> {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      images: true,
      variants: { select: { barcode: true } },
    },
  });

  const removedObjectPaths = new Set<string>();
  let affectedProducts = 0;
  let removedImageRefs = 0;

  for (const product of products) {
    const allowedBarcodes = new Set(
      (product.variants || [])
        .map((variant) => normalizeBarcode(variant.barcode))
        .filter((barcode) => barcode.length > 0)
    );

    const currentImages = Array.isArray(product.images) ? product.images : [];
    const kept: string[] = [];

    for (const imageUrl of currentImages) {
      const objectPath = extractObjectPath(imageUrl);

      if (!objectPath) {
        removedImageRefs += 1;
        continue;
      }

      const parts = objectPath.split('/').filter(Boolean);
      const folderToken = parts.length >= 2 ? parts[1] : '';

      if (allowedBarcodes.has(folderToken)) {
        kept.push(imageUrl);
      } else {
        removedImageRefs += 1;
        removedObjectPaths.add(objectPath);
      }
    }

    if (kept.length !== currentImages.length) {
      affectedProducts += 1;
      await prisma.product.update({
        where: { id: product.id },
        data: { images: kept },
      });
    }
  }

  const failedDeletes: string[] = [];
  for (const objectPath of removedObjectPaths) {
    try {
      await deleteObjectByPath(objectPath, 'magic-ecommerce-fotos');
    } catch {
      failedDeletes.push(objectPath);
    }
  }

  return {
    affectedProducts,
    removedImageRefs,
    deletedObjects: removedObjectPaths.size - failedDeletes.length,
    failedDeletes,
  };
}
