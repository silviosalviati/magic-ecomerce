import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://www.vistamagic.com.br';
const DEFAULT_DESCRIPTION =
  'Vista Magic — moda com caimento impecável. Compra segura, troca grátis em até 7 dias e entrega rápida para todo o Brasil.';
const DEFAULT_IMAGE = `${BASE_URL}/logo/logo-transparent.png`;

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  ogImage?: string;
  ogType?: 'website' | 'product';
  jsonLd?: object | object[];
}

export function SEO({
  title,
  description,
  canonical,
  noindex = false,
  ogImage,
  ogType = 'website',
  jsonLd,
}: SEOProps) {
  const fullTitle = title
    ? `${title} | MAGI.C — Vista Magic`
    : 'MAGI.C — Moda Feminina e Masculina | Vista Magic';
  const metaDesc = description ?? DEFAULT_DESCRIPTION;
  const image = ogImage ?? DEFAULT_IMAGE;
  const url = canonical ? `${BASE_URL}${canonical}` : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDesc} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      {url && <link rel="canonical" href={url} />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:type" content={ogType} />
      {url && <meta property="og:url" content={url} />}
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:image" content={image} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? { '@context': 'https://schema.org', '@graph': jsonLd } : jsonLd)}
        </script>
      )}
    </Helmet>
  );
}