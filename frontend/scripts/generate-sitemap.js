import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SITE_URL = 'https://www.vistamagic.com.br';
const API_BASE = (process.env.VITE_API_BASE_URL || 'https://magic-ecomerce-api-731025483706.us-central1.run.app').replace(/\/+$/, '');
const TODAY = new Date().toISOString().split('T')[0];

const staticPages = [
  { loc: '/', changefreq: 'daily', priority: '1.0' },
  { loc: '/sobre', changefreq: 'monthly', priority: '0.6' },
  { loc: '/rastrear-pedido', changefreq: 'yearly', priority: '0.4' },
];

function buildUrlEntry({ loc, changefreq, priority, lastmod }) {
  const lastmodLine = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  return `  <url>\n    <loc>${SITE_URL}${loc}</loc>${lastmodLine}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

async function fetchProducts() {
  const res = await fetch(`${API_BASE}/products`, {
    signal: AbortSignal.timeout(12000),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`API responded with status ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data?.data ?? []);
}

async function main() {
  let productPages = [];

  try {
    const products = await fetchProducts();
    productPages = products
      .filter((p) => p && (p.productId || p.id))
      .map((p) => ({
        loc: `/produto/${p.productId ?? p.id}`,
        changefreq: 'weekly',
        priority: '0.8',
        lastmod: TODAY,
      }));
    console.log(`[sitemap] ${productPages.length} product URLs added.`);
  } catch (err) {
    console.warn(`[sitemap] WARNING: Could not fetch products (${err.message}). Writing static-only sitemap.`);
  }

  const allPages = [...staticPages, ...productPages];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(buildUrlEntry).join('\n')}
</urlset>\n`;

  const outPath = join(__dirname, '../public/sitemap.xml');
  writeFileSync(outPath, xml, 'utf8');
  console.log(`[sitemap] Written ${allPages.length} URLs → public/sitemap.xml`);
}

main().catch((err) => {
  console.error('[sitemap] Fatal error:', err);
  process.exit(1);
});
