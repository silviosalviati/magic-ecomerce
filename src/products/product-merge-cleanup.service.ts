import { prisma } from '../config/database';
import { buildProductGroupKey } from './product-grouping';

type ProductWithVariants = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  images: string[];
  costPrice: unknown;
  markup: unknown;
  createdAt: Date;
  variants: Array<{ id: string }>;
};

export type ProductMergeCleanupResult = {
  groupsFound: number;
  groupsMerged: number;
  productsDeleted: number;
  variantsMoved: number;
  groupsWithPriceMismatch: number;
};

function groupKey(product: Pick<ProductWithVariants, 'name' | 'category'>): string {
  return buildProductGroupKey(product);
}

function pickCanonicalProduct(products: ProductWithVariants[]): ProductWithVariants {
  return [...products].sort((a, b) => {
    const variantDiff = b.variants.length - a.variants.length;
    if (variantDiff !== 0) return variantDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  })[0];
}

function mergeUniqueImages(target: string[], source: string[]): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const value of [...target, ...source]) {
    const normalized = String(value || '').trim();
    if (!normalized || seen.has(normalized)) continue;
    merged.push(normalized);
    seen.add(normalized);
  }

  return merged;
}

export async function cleanupDuplicateProducts(): Promise<ProductMergeCleanupResult> {
  const products = (await prisma.product.findMany({
    include: { variants: { select: { id: true } } },
    orderBy: { createdAt: 'desc' },
  })) as unknown as ProductWithVariants[];

  const groups = new Map<string, ProductWithVariants[]>();
  for (const product of products) {
    const key = groupKey(product);
    const list = groups.get(key) || [];
    list.push(product);
    groups.set(key, list);
  }

  let groupsFound = 0;
  let groupsMerged = 0;
  let productsDeleted = 0;
  let variantsMoved = 0;
  let groupsWithPriceMismatch = 0;

  for (const groupProducts of groups.values()) {
    if (groupProducts.length <= 1) continue;
    groupsFound += 1;

    const canonical = pickCanonicalProduct(groupProducts);
    const duplicates = groupProducts.filter((product) => product.id !== canonical.id);

    const canonicalCost = Number(canonical.costPrice);
    const canonicalMarkup = Number(canonical.markup);
    const hasPriceMismatch = duplicates.some((product) => {
      const costDiff = Math.abs(Number(product.costPrice) - canonicalCost);
      const markupDiff = Math.abs(Number(product.markup) - canonicalMarkup);
      return costDiff > 0.0001 || markupDiff > 0.0001;
    });
    if (hasPriceMismatch) {
      groupsWithPriceMismatch += 1;
    }

    await prisma.$transaction(async (tx: any) => {
      let mergedImages = Array.isArray(canonical.images) ? [...canonical.images] : [];
      let mergedDescription = canonical.description;

      for (const duplicate of duplicates) {
        const moved = await tx.variant.updateMany({
          where: { productId: duplicate.id },
          data: { productId: canonical.id },
        });
        variantsMoved += moved.count;

        mergedImages = mergeUniqueImages(
          mergedImages,
          Array.isArray(duplicate.images) ? duplicate.images : []
        );

        if ((!mergedDescription || String(mergedDescription).trim().length === 0) && duplicate.description) {
          mergedDescription = duplicate.description;
        }

        await tx.product.delete({ where: { id: duplicate.id } });
        productsDeleted += 1;
      }

      await tx.product.update({
        where: { id: canonical.id },
        data: {
          images: mergedImages,
          description: mergedDescription,
        },
      });
    });

    groupsMerged += 1;
  }

  return {
    groupsFound,
    groupsMerged,
    productsDeleted,
    variantsMoved,
    groupsWithPriceMismatch,
  };
}
