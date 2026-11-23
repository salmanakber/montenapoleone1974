import type { CategoryRecord, Product, RegionCode, RegionConfig } from '../types.ts';

export type StorefrontView =
  | 'home'
  | 'catalog'
  | 'product'
  | 'b2b'
  | 'about'
  | 'checkout'
  | 'account'
  | 'admin';

export interface ParsedRoute {
  region?: RegionCode;
  view: StorefrontView;
  category?: string;
  slug?: string;
}

const VALID_REGIONS = new Set<RegionCode>(['en', 'no', 'it', 'vn']);

export function isValidRegionCode(val: string | undefined | null): val is RegionCode {
  return Boolean(val && VALID_REGIONS.has(val.toLowerCase() as RegionCode));
}

export function parseStorefrontUrl(pathname: string): ParsedRoute {
  const clean = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  if (clean === '/') {
    return { view: 'home' };
  }

  const parts = clean.split('/').filter(Boolean);
  let region: RegionCode | undefined;

  if (parts.length > 0 && isValidRegionCode(parts[0])) {
    region = parts[0].toLowerCase() as RegionCode;
    parts.shift();
  }

  if (parts.length === 0) {
    return { region, view: 'home' };
  }

  const head = parts[0].toLowerCase();
  const tail = parts[1] ? decodeURIComponent(parts[1]) : undefined;

  if (head === 'shop' || head === 'catalog' || head === 'butikk' || head === 'camicie') {
    return {
      region,
      view: 'catalog',
      category: tail || 'all',
    };
  }

  if (head === 'product' || head === 'produkt' || head === 'prodotto' || head === 'san-pham') {
    return {
      region,
      view: 'product',
      slug: tail,
    };
  }

  if (head === 'b2b') {
    return {
      region,
      view: 'b2b',
      slug: tail,
    };
  }

  if (head === 'about' || head === 'about-us' || head === 'om-oss' || head === 'chi-siamo' || head === 've-chung-toi') {
    return {
      region,
      view: 'about',
    };
  }

  if (head === 'checkout') {
    return { region, view: 'checkout' };
  }

  if (head === 'account' || head === 'min-konto') {
    return { region, view: 'account' };
  }

  if (head === 'admin' || head === 'staff-portal') {
    return { region, view: 'admin' };
  }

  return { region, view: 'home' };
}

export function buildStorefrontPath(params: {
  regionCode: RegionCode;
  view: StorefrontView;
  category?: string;
  slug?: string | null;
}): string {
  const rc = params.regionCode || 'en';
  switch (params.view) {
    case 'admin':
      return '/admin';
    case 'catalog': {
      const cat = (params.category || 'all').trim();
      return cat && cat !== 'all' ? `/${rc}/shop/${encodeURIComponent(cat)}` : `/${rc}/shop`;
    }
    case 'product':
      return params.slug ? `/${rc}/product/${encodeURIComponent(params.slug)}` : `/${rc}/shop`;
    case 'b2b':
      return params.slug ? `/${rc}/b2b/${encodeURIComponent(params.slug)}` : `/${rc}/b2b`;
    case 'about':
      return `/${rc}/about-us`;
    case 'checkout':
      return `/${rc}/checkout`;
    case 'account':
      return `/${rc}/account`;
    case 'home':
    default:
      return rc === 'en' ? '/' : `/${rc}`;
  }
}

export function clampSeoText(text: string, minLen: number, maxLen: number, fallbackSuffix: string): string {
  let clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length < minLen && fallbackSuffix) {
    clean = `${clean} ${fallbackSuffix}`.replace(/\s+/g, ' ').trim();
  }
  if (clean.length <= maxLen) return clean;
  const sliced = clean.slice(0, maxLen - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > Math.floor(maxLen * 0.65) ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

export interface SeoMetadataResult {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: 'website' | 'product';
  ogImage: string;
  robots: string;
  hreflangs: Array<{ hreflang: string; href: string }>;
  jsonLd: Array<Record<string, unknown>>;
}

export function buildSeoMetadata(params: {
  view: StorefrontView;
  region: Pick<RegionConfig, 'code' | 'name' | 'currency_code' | 'warehouse_name'>;
  category?: string;
  categoryRecord?: Pick<CategoryRecord, 'slug' | 'name_en' | 'name_no' | 'name_it' | 'name_vn'> | null;
  product?: Pick<
    Product,
    | 'sku'
    | 'slug'
    | 'title'
    | 'description'
    | 'fabric_spec'
    | 'price'
    | 'primary_image'
    | 'stock_qty'
    | 'preorder_allowed'
  > | null;
  origin: string;
}): SeoMetadataResult {
  const baseOrigin = (params.origin || 'https://montenapoleone1974.com').replace(/\/+$/, '');
  const rc = params.region.code;
  const canonicalPath = buildStorefrontPath({
    regionCode: rc,
    view: params.view,
    category: params.category,
    slug: params.product?.slug,
  });
  const canonicalUrl = `${baseOrigin}${canonicalPath}`;

  const resolveImage = (imgPath?: string): string => {
    const clean = (imgPath || '').trim();
    if (!clean) return `${baseOrigin}/assets/aistudio/logo__2__1ee1df15.png`;
    if (/^https?:\/\//i.test(clean)) return clean;
    return `${baseOrigin}${clean.startsWith('/') ? clean : `/${clean}`}`;
  };

  const hreflangs: Array<{ hreflang: string; href: string }> = (['en', 'no', 'it', 'vn'] as const).map(
    (code) => ({
      hreflang: code === 'no' ? 'nb-NO' : code === 'it' ? 'it-IT' : code === 'vn' ? 'vi-VN' : 'en',
      href: `${baseOrigin}${buildStorefrontPath({
        regionCode: code,
        view: params.view,
        category: params.category,
        slug: params.product?.slug,
      })}`,
    })
  );
  hreflangs.push({
    hreflang: 'x-default',
    href: `${baseOrigin}${buildStorefrontPath({
      regionCode: 'en',
      view: params.view,
      category: params.category,
      slug: params.product?.slug,
    })}`,
  });

  const orgSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    name: 'Monte Napoleone 1974',
    url: baseOrigin,
    logo: `${baseOrigin}/assets/aistudio/logo__2__1ee1df15.png`,
    foundingDate: '1974',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Maridalsveien 87',
      addressLocality: 'Oslo',
      postalCode: '0461',
      addressCountry: 'NO',
    },
  };

  if (params.view === 'admin') {
    return {
      title: 'Monte Napoleone 1974 — Operations Admin',
      description: 'Store administration and multi-region inventory portal for Monte Napoleone 1974 bespoke Italian shirts.',
      canonicalUrl,
      ogType: 'website',
      ogImage: resolveImage('/src/assets/images/hero_oxford_olive_1795248294228.jpg'),
      robots: 'noindex, nofollow',
      hreflangs: [],
      jsonLd: [orgSchema],
    };
  }

  if (params.view === 'product' && params.product) {
    const p = params.product;
    const rawTitle = `${p.title} – Monte Napoleone 1974`;
    const title = clampSeoText(rawTitle, 30, 60, `(${params.region.currency_code})`);
    const rawDesc = `${p.title} in ${p.fabric_spec}. Complimentary bespoke sleeve & shirt length tailoring in ${params.region.name} with worldwide DHL dispatch.`;
    const description = clampSeoText(rawDesc, 120, 160, 'Shop Italian bespoke shirting.');
    const availability =
      p.stock_qty > 0
        ? 'https://schema.org/InStock'
        : p.preorder_allowed
        ? 'https://schema.org/PreOrder'
        : 'https://schema.org/OutOfStock';

    const productSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.title,
      sku: p.sku,
      image: [resolveImage(p.primary_image)],
      description: p.description || description,
      brand: {
        '@type': 'Brand',
        name: 'Monte Napoleone 1974',
      },
      offers: {
        '@type': 'Offer',
        url: canonicalUrl,
        priceCurrency: params.region.currency_code,
        price: p.price,
        availability,
      },
    };

    const breadcrumbSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseOrigin}/` },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Shirts',
          item: `${baseOrigin}${buildStorefrontPath({ regionCode: rc, view: 'catalog' })}`,
        },
        { '@type': 'ListItem', position: 3, name: p.title, item: canonicalUrl },
      ],
    };

    return {
      title,
      description,
      canonicalUrl,
      ogType: 'product',
      ogImage: resolveImage(p.primary_image),
      robots: 'index, follow',
      hreflangs,
      jsonLd: [orgSchema, productSchema, breadcrumbSchema],
    };
  }

  if (params.view === 'catalog') {
    const catName = params.categoryRecord
      ? rc === 'no'
        ? params.categoryRecord.name_no
        : rc === 'it'
        ? params.categoryRecord.name_it
        : rc === 'vn'
        ? params.categoryRecord.name_vn
        : params.categoryRecord.name_en
      : params.category && params.category !== 'all'
      ? params.category.replace(/-/g, ' ')
      : 'Italian Shirts';
    const title = clampSeoText(
      `${catName} Collection – Monte Napoleone 1974`,
      30,
      60,
      `${params.region.name}`
    );
    const description = clampSeoText(
      `Explore ${catName} tailored in Treviso with Italian linen, 2-ply cotton, complimentary bespoke tailoring, and ${params.region.warehouse_name} dispatch.`,
      120,
      160,
      'Order today.'
    );
    const collectionSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${catName} – Monte Napoleone 1974`,
      url: canonicalUrl,
      description,
    };
    return {
      title,
      description,
      canonicalUrl,
      ogType: 'website',
      ogImage: resolveImage('/src/assets/images/editorial_casual_linen_1795248294319.jpg'),
      robots: 'index, follow',
      hreflangs,
      jsonLd: [orgSchema, collectionSchema],
    };
  }

  if (params.view === 'b2b') {
    const title = clampSeoText(
      `Corporate B2B Shirts (${params.region.name}) – Monte Napoleone 1974`,
      30,
      60,
      'Wholesale'
    );
    const description = clampSeoText(
      `Wholesale corporate shirts with custom embroidered monograms, MOQ 20 per colour, tiered pricing up to 30% off, and dedicated ${params.region.warehouse_name} logistics.`,
      120,
      160,
      'Request a quote.'
    );
    return {
      title,
      description,
      canonicalUrl,
      ogType: 'website',
      ogImage: resolveImage('/src/assets/images/editorial_corporate_b2b_1795248294517.jpg'),
      robots: 'index, follow',
      hreflangs,
      jsonLd: [orgSchema],
    };
  }

  if (params.view === 'about') {
    const title = clampSeoText('Heritage Since 1974 – Monte Napoleone Treviso', 30, 60, 'Atelier');
    const description = clampSeoText(
      'Discover Monte Napoleone 1974: Italian bespoke shirting craftsmanship founded in Treviso, 2-ply Egyptian cotton, Tuscan linen, and Nordic Oslo showroom.',
      120,
      160,
      'Read our story.'
    );
    return {
      title,
      description,
      canonicalUrl,
      ogType: 'website',
      ogImage: resolveImage('/src/assets/images/editorial_tailoring_guide_1795248294030.jpg'),
      robots: 'index, follow',
      hreflangs,
      jsonLd: [orgSchema],
    };
  }

  const homeTitles: Record<RegionCode, string> = {
    en: 'Monte Napoleone 1974 – Bespoke Italian Shirts',
    no: 'Monte Napoleone 1974 – Skreddersydde Skjorter',
    it: 'Monte Napoleone 1974 – Camicie Sartoriali',
    vn: 'Monte Napoleone 1974 – Áo Sơ Mi May Đo Ý',
  };
  const homeDescs: Record<RegionCode, string> = {
    en: 'Shop bespoke Italian shirts tailored since 1974 in Treviso. Complimentary sleeve and shirt length tailoring, multi-currency pricing, and global DHL Express.',
    no: 'Kjøp skreddersydde italienske skjorter siden 1974. Kostnadsfri erme- og skjortelengde, Vipps og lokal levering fra vårt lager i Oslo.',
    it: 'Acquista camicie sartoriali dal 1974 in lino e cotone doppio ritorto. Lunghezza maniche su misura gratuita e spedizione rapida dall’atelier di Treviso.',
    vn: 'Mua áo sơ mi may đo Ý cao cấp từ năm 1974. Miễn phí điều chỉnh chiều dài tay và thân áo, giá VNĐ và giao hàng nhanh DHL.',
  };

  return {
    title: homeTitles[rc] || homeTitles.en,
    description: homeDescs[rc] || homeDescs.en,
    canonicalUrl,
    ogType: 'website',
    ogImage: resolveImage('/src/assets/images/hero_oxford_olive_1795248294228.jpg'),
    robots: params.view === 'checkout' || params.view === 'account' ? 'noindex, follow' : 'index, follow',
    hreflangs,
    jsonLd: [orgSchema],
  };
}

export function buildRobotsTxt(origin: string): string {
  const baseOrigin = (origin || 'https://montenapoleone1974.com').replace(/\/+$/, '');
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    'Disallow: /checkout',
    '',
    `Sitemap: ${baseOrigin}/sitemap.xml`,
  ].join('\n');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSitemapXml(params: {
  origin: string;
  regions: RegionCode[];
  categories: Array<{ slug: string }>;
  products: Array<{ slug: string }>;
}): string {
  const baseOrigin = (params.origin || 'https://montenapoleone1974.com').replace(/\/+$/, '');
  const nowDate = new Date().toISOString().slice(0, 10);
  const urls: Array<{ loc: string; changefreq: string; priority: string; altPaths?: Record<RegionCode, string> }> = [];

  // Homepages per region
  for (const rc of params.regions) {
    urls.push({
      loc: `${baseOrigin}${buildStorefrontPath({ regionCode: rc, view: 'home' })}`,
      changefreq: 'daily',
      priority: rc === 'en' ? '1.0' : '0.9',
      altPaths: {
        en: `${baseOrigin}/`,
        no: `${baseOrigin}/no`,
        it: `${baseOrigin}/it`,
        vn: `${baseOrigin}/vn`,
      },
    });
    urls.push({
      loc: `${baseOrigin}${buildStorefrontPath({ regionCode: rc, view: 'catalog' })}`,
      changefreq: 'daily',
      priority: '0.8',
    });
    urls.push({
      loc: `${baseOrigin}${buildStorefrontPath({ regionCode: rc, view: 'b2b' })}`,
      changefreq: 'weekly',
      priority: '0.7',
    });
    urls.push({
      loc: `${baseOrigin}${buildStorefrontPath({ regionCode: rc, view: 'about' })}`,
      changefreq: 'monthly',
      priority: '0.6',
    });
  }

  for (const cat of params.categories) {
    if (!cat.slug || cat.slug === 'b2b') continue;
    for (const rc of params.regions) {
      urls.push({
        loc: `${baseOrigin}${buildStorefrontPath({ regionCode: rc, view: 'catalog', category: cat.slug })}`,
        changefreq: 'weekly',
        priority: '0.7',
      });
    }
  }

  for (const prod of params.products) {
    for (const rc of params.regions) {
      urls.push({
        loc: `${baseOrigin}${buildStorefrontPath({ regionCode: rc, view: 'product', slug: prod.slug })}`,
        changefreq: 'weekly',
        priority: '0.8',
      });
    }
  }

  const body = urls
    .map((u) => {
      const altXml = u.altPaths
        ? Object.entries(u.altPaths)
            .map(([rc, href]) => {
              const lang = rc === 'no' ? 'nb-NO' : rc === 'it' ? 'it-IT' : rc === 'vn' ? 'vi-VN' : 'en';
              return `    <xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(href)}" />`;
            })
            .join('\n')
        : '';
      return `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <lastmod>${nowDate}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>${altXml ? `\n${altXml}` : ''}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>`;
}
