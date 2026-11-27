import type { AdminTab, CategoryRecord, Product, RegionCode, RegionConfig } from '../types.ts';

export type StorefrontView =
  | 'home'
  | 'catalog'
  | 'product'
  | 'b2b'
  | 'about'
  | 'info'
  | 'article'
  | 'checkout'
  | 'account'
  | 'admin';

export interface ParsedRoute {
  region?: RegionCode;
  view: StorefrontView;
  category?: string;
  slug?: string;
  infoPage?: string;
  articleSlug?: string;
  adminTab?: AdminTab;
}

const VALID_REGIONS = new Set<RegionCode>(['en', 'no', 'it', 'vn']);

const ADMIN_SLUG_TO_TAB: Record<string, AdminTab> = {
  overview: 'overview',
  products: 'products',
  categories: 'categories',
  variants: 'variants',
  stock: 'stock',
  tailoring: 'tailoring',
  'collar-cuff': 'collar_cuff',
  collar_cuff: 'collar_cuff',
  menu: 'menu',
  hero: 'hero',
  promotions: 'promotions',
  ai: 'ai',
  orders: 'orders',
  emails: 'emails',
  reports: 'reports',
  media: 'media',
  b2b: 'b2b',
  newsletter: 'newsletter',
  staff: 'staff',
  settings: 'settings',
  credentials: 'credentials',
  database: 'database',
};

const ADMIN_TAB_TO_SLUG: Record<AdminTab, string> = {
  overview: 'overview',
  products: 'products',
  categories: 'categories',
  variants: 'variants',
  stock: 'stock',
  tailoring: 'tailoring',
  collar_cuff: 'collar-cuff',
  menu: 'menu',
  hero: 'hero',
  promotions: 'promotions',
  ai: 'ai',
  orders: 'orders',
  emails: 'emails',
  reports: 'reports',
  media: 'media',
  b2b: 'b2b',
  newsletter: 'newsletter',
  staff: 'staff',
  settings: 'settings',
  credentials: 'credentials',
  database: 'database',
};

export function parseAdminTabSegment(segment?: string | null): AdminTab {
  if (!segment) return 'overview';
  const clean = segment.trim().toLowerCase();
  return ADMIN_SLUG_TO_TAB[clean] || 'overview';
}

export function adminTabToSlug(tab: AdminTab): string {
  return ADMIN_TAB_TO_SLUG[tab] || 'overview';
}

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

  if (
    head === 'article' ||
    head === 'articles' ||
    head === 'oversikt-over-skjortestoffer' ||
    head === 'fabric-guide' ||
    head === 'sustainable-fashion'
  ) {
    const articleSlug =
      head === 'article' || head === 'articles'
        ? tail || 'fabric-guide'
        : head;
    return {
      region,
      view: 'article',
      articleSlug,
      slug: articleSlug,
    };
  }

  if (
    head === 'info' ||
    head === 'returns' ||
    head === 'returns-exchanges' ||
    head === 'retur-og-bytte' ||
    head === 'withdrawal' ||
    head === 'withdrawal-form' ||
    head === 'angrefrist-skjema' ||
    head === 'dealers' ||
    head === 'dealers-partners' ||
    head === 'forhandlere-og-partnere' ||
    head === 'careers' ||
    head === 'karrierer' ||
    head === 'faq' ||
    head === 'faqs' ||
    head === 'privacy' ||
    head === 'privacy-policy' ||
    head === 'personvernerklaering'
  ) {
    const infoPage = head === 'info' ? tail || 'returns' : head;
    return {
      region,
      view: 'info',
      infoPage,
      slug: infoPage,
    };
  }

  if (head === 'checkout') {
    return { region, view: 'checkout' };
  }

  if (head === 'account' || head === 'min-konto') {
    return { region, view: 'account' };
  }

  if (head === 'admin' || head === 'staff-portal') {
    return {
      region,
      view: 'admin',
      adminTab: parseAdminTabSegment(tail),
    };
  }

  return { region, view: 'home' };
}

export function buildStorefrontPath(params: {
  regionCode: RegionCode;
  view: StorefrontView;
  category?: string;
  slug?: string | null;
  adminTab?: AdminTab;
}): string {
  const rc = params.regionCode || 'en';
  switch (params.view) {
    case 'admin':
      return params.adminTab && params.adminTab !== 'overview'
        ? `/admin/${adminTabToSlug(params.adminTab)}`
        : '/admin';
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
    case 'article': {
      const page = (params.slug || 'fabric-guide').trim() || 'fabric-guide';
      return `/${rc}/article/${encodeURIComponent(page)}`;
    }
    case 'info': {
      const page = (params.slug || 'returns').trim() || 'returns';
      return `/${rc}/info/${encodeURIComponent(page)}`;
    }
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
  keywords: string;
  canonicalUrl: string;
  ogType: 'website' | 'product';
  ogLocale: string;
  ogSiteName: string;
  ogImage: string;
  ogImageAlt: string;
  robots: string;
  productMeta?: {
    priceAmount: string;
    priceCurrency: string;
    availability: string;
    brand: string;
    retailerItemId: string;
  };
  hreflangs: Array<{ hreflang: string; href: string }>;
  jsonLd: Array<Record<string, unknown>>;
}

export function buildSeoMetadata(params: {
  view: StorefrontView;
  region: Pick<RegionConfig, 'code' | 'name' | 'currency_code' | 'warehouse_name'>;
  category?: string;
  categoryRecord?: Pick<CategoryRecord, 'slug' | 'name_en' | 'name_no' | 'name_it' | 'name_vn'> | null;
  product?: (Pick<
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
    | 'seo_title'
    | 'seo_description'
    | 'seo_keywords'
    | 'review_count'
    | 'average_rating'
    | 'reviews'
  > & {
    category_slug?: string;
    subtitle?: string;
    gallery?: string[];
  }) | null;
  slug?: string | null;
  origin: string;
}): SeoMetadataResult {
  const baseOrigin = (params.origin || 'https://montenapoleone1974.com').replace(/\/+$/, '');
  const rc = params.region.code;
  const pathSlug =
    params.view === 'info' || params.view === 'article'
      ? params.slug
      : params.product?.slug;
  const canonicalPath = buildStorefrontPath({
    regionCode: rc,
    view: params.view,
    category: params.category,
    slug: pathSlug,
  });
  const canonicalUrl = `${baseOrigin}${canonicalPath}`;

  const resolveImage = (imgPath?: string): string => {
    const clean = (imgPath || '').trim();
    if (!clean) return `${baseOrigin}/assets/aistudio/logo__2__1ee1df15.png`;
    if (/^https?:\/\//i.test(clean)) return clean;
    return `${baseOrigin}${clean.startsWith('/') ? clean : `/${clean}`}`;
  };

  const ogLocale =
    rc === 'no' ? 'nb_NO' : rc === 'it' ? 'it_IT' : rc === 'vn' ? 'vi_VN' : 'en_US';

  const hreflangs: Array<{ hreflang: string; href: string }> = (['en', 'no', 'it', 'vn'] as const).map(
    (code) => ({
      hreflang: code === 'no' ? 'nb-NO' : code === 'it' ? 'it-IT' : code === 'vn' ? 'vi-VN' : 'en',
      href: `${baseOrigin}${buildStorefrontPath({
        regionCode: code,
        view: params.view,
        category: params.category,
        slug: pathSlug,
      })}`,
    })
  );
  hreflangs.push({
    hreflang: 'x-default',
    href: `${baseOrigin}${buildStorefrontPath({
      regionCode: 'en',
      view: params.view,
      category: params.category,
      slug: pathSlug,
    })}`,
  });

  const orgSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['ClothingStore', 'Organization'],
    name: 'Monte Napoleone 1974',
    url: baseOrigin,
    logo: `${baseOrigin}/assets/aistudio/logo__2__1ee1df15.png`,
    image: `${baseOrigin}/assets/aistudio/logo__2__1ee1df15.png`,
    foundingDate: '1974',
    email: 'monte@montenapoleone1974.com',
    telephone: '+47 22 00 00 00',
    priceRange: '$$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Maridalsveien 87',
      addressLocality: 'Oslo',
      postalCode: '0461',
      addressCountry: 'NO',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 59.9435,
      longitude: 10.7522,
    },
    areaServed: ['NO', 'IT', 'VN', 'US', 'EU'],
    sameAs: [
      'https://www.facebook.com/MonteNapoleoneShirts',
      'https://www.instagram.com/montenapoleoneshirts/',
    ],
  };

  const websiteSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Monte Napoleone 1974',
    url: baseOrigin,
    inLanguage: ['en', 'nb-NO', 'it-IT', 'vi-VN'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseOrigin}${buildStorefrontPath({ regionCode: rc, view: 'catalog' })}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  if (params.view === 'admin') {
    return {
      title: 'Monte Napoleone 1974 — Operations Admin',
      description: 'Store administration and multi-region inventory portal for Monte Napoleone 1974 bespoke Italian shirts.',
      keywords: 'Monte Napoleone 1974 admin',
      canonicalUrl,
      ogType: 'website',
      ogLocale,
      ogSiteName: 'Monte Napoleone 1974',
      ogImage: resolveImage('/src/assets/images/hero_oxford_olive_1795248294228.jpg'),
      ogImageAlt: 'Monte Napoleone 1974 Atelier',
      robots: 'noindex, nofollow',
      hreflangs: [],
      jsonLd: [orgSchema],
    };
  }

  if (params.view === 'product' && params.product) {
    const p = params.product;
    const rawTitle = (p.seo_title || '').trim() || `${p.title} (${p.fabric_spec}) – Monte Napoleone 1974`;
    const title = clampSeoText(rawTitle, 32, 60, `| Bespoke ${params.region.currency_code}`);
    const rawDesc =
      (p.seo_description || '').trim() ||
      `Shop ${p.title} crafted from ${p.fabric_spec}. Free bespoke sleeve & shirt length tailoring in ${params.region.name} with worldwide DHL Express dispatch.`;
    const description = clampSeoText(rawDesc, 120, 160, 'Monte Napoleone Treviso 1974.');
    const keywords =
      (p.seo_keywords || '').trim() ||
      [
        p.title,
        p.fabric_spec,
        p.category_slug ? `${p.category_slug} shirt` : 'Italian dress shirt',
        'bespoke shirt tailoring',
        'Monte Napoleone 1974',
        p.sku,
        params.region.name,
      ]
        .filter(Boolean)
        .join(', ');

    const schemaAvailability =
      p.stock_qty > 0
        ? 'https://schema.org/InStock'
        : p.preorder_allowed
        ? 'https://schema.org/PreOrder'
        : 'https://schema.org/OutOfStock';
    const ogAvailability = p.stock_qty > 0 ? 'instock' : p.preorder_allowed ? 'available for order' : 'oos';

    const imagesList = Array.from(
      new Set([p.primary_image, ...(p.gallery || [])].filter(Boolean).map(resolveImage))
    );
    const nextYear = `${new Date().getFullYear() + 1}-12-31`;

    const productSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': `${canonicalUrl}#product`,
      name: p.title,
      sku: p.sku,
      mpn: p.sku,
      url: canonicalUrl,
      category: p.category_slug || 'Dress Shirts',
      material: p.fabric_spec,
      image: imagesList,
      description: p.description || description,
      brand: {
        '@type': 'Brand',
        name: 'Monte Napoleone 1974',
      },
      manufacturer: {
        '@type': 'Organization',
        name: 'Monte Napoleone Treviso Sartoria',
      },
      offers: {
        '@type': 'Offer',
        url: canonicalUrl,
        priceCurrency: params.region.currency_code,
        price: p.price,
        priceValidUntil: nextYear,
        itemCondition: 'https://schema.org/NewCondition',
        availability: schemaAvailability,
        seller: {
          '@type': 'Organization',
          name: 'Monte Napoleone 1974',
        },
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: rc === 'no' ? 'NO' : rc === 'it' ? 'IT' : rc === 'vn' ? 'VN' : 'US',
          returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
          merchantReturnDays: 14,
        },
      },
    };

    const reviewCount = Number(p.review_count || (p.reviews ? p.reviews.length : 0));
    const avgRating = Number(p.average_rating || 0);
    if (reviewCount > 0 && avgRating > 0) {
      productSchema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: Number(avgRating.toFixed(1)),
        reviewCount,
        bestRating: 5,
        worstRating: 1,
      };
    }
    if (Array.isArray(p.reviews) && p.reviews.length > 0) {
      productSchema.review = p.reviews.slice(0, 8).map((rev) => ({
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: rev.customer_name,
        },
        datePublished: String(rev.created_at || '').slice(0, 10),
        name: rev.title || `${p.title} verified review`,
        reviewBody: rev.comment,
        reviewRating: {
          '@type': 'Rating',
          ratingValue: rev.rating,
          bestRating: 5,
          worstRating: 1,
        },
      }));
    }

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
      keywords,
      canonicalUrl,
      ogType: 'product',
      ogLocale,
      ogSiteName: 'Monte Napoleone 1974',
      ogImage: resolveImage(p.primary_image),
      ogImageAlt: `${p.title} – ${p.fabric_spec} Italian Bespoke Shirt`,
      robots: 'index, follow, max-image-preview:large, max-snippet:-1',
      productMeta: {
        priceAmount: String(p.price),
        priceCurrency: params.region.currency_code,
        availability: ogAvailability,
        brand: 'Monte Napoleone 1974',
        retailerItemId: p.sku,
      },
      hreflangs,
      jsonLd: [orgSchema, websiteSchema, productSchema, breadcrumbSchema],
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
      62,
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
      keywords: `${catName}, Italian bespoke shirts, tailored shirting, Monte Napoleone 1974, ${params.region.name}`,
      canonicalUrl,
      ogType: 'website',
      ogLocale,
      ogSiteName: 'Monte Napoleone 1974',
      ogImage: resolveImage('/src/assets/images/editorial_casual_linen_1795248294319.jpg'),
      ogImageAlt: `${catName} – Monte Napoleone 1974`,
      robots: 'index, follow, max-image-preview:large',
      hreflangs,
      jsonLd: [orgSchema, websiteSchema, collectionSchema],
    };
  }

  if (params.view === 'b2b') {
    const title = clampSeoText(
      `Corporate B2B Shirts (${params.region.name}) – Monte Napoleone 1974`,
      30,
      62,
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
      keywords: 'corporate uniform shirts, B2B tailored shirts, embroidered company shirts, Monte Napoleone 1974',
      canonicalUrl,
      ogType: 'website',
      ogLocale,
      ogSiteName: 'Monte Napoleone 1974',
      ogImage: resolveImage('/src/assets/images/editorial_corporate_b2b_1795248294517.jpg'),
      ogImageAlt: 'Monte Napoleone 1974 Corporate B2B Tailoring',
      robots: 'index, follow, max-image-preview:large',
      hreflangs,
      jsonLd: [orgSchema, websiteSchema],
    };
  }

  if (params.view === 'about') {
    const title = clampSeoText('Heritage Since 1974 – Monte Napoleone Treviso', 30, 62, 'Atelier');
    const description = clampSeoText(
      'Discover Monte Napoleone 1974: Italian bespoke shirting craftsmanship founded in Treviso, 2-ply Egyptian cotton, Tuscan linen, and Nordic Oslo showroom.',
      120,
      160,
      'Read our story.'
    );
    return {
      title,
      description,
      keywords: 'Monte Napoleone 1974 heritage, Treviso Italy shirtmaker, Oslo Gulbrandsens Agencies showroom',
      canonicalUrl,
      ogType: 'website',
      ogLocale,
      ogSiteName: 'Monte Napoleone 1974',
      ogImage: resolveImage('/src/assets/images/editorial_tailoring_guide_1795248294030.jpg'),
      ogImageAlt: 'Monte Napoleone 1974 Heritage Treviso Atelier',
      robots: 'index, follow, max-image-preview:large',
      hreflangs,
      jsonLd: [orgSchema, websiteSchema],
    };
  }

  if (params.view === 'article') {
    const articleKey = (params.slug || 'fabric-guide').toLowerCase();
    const articleMeta: Record<string, { title: string; description: string; keywords: string; image: string }> = {
      'fabric-guide': {
        title: 'Shirt Fabric Overview – Monte Napoleone 1974',
        description:
          'Broadcloth, twill, oxford, linen and more — a clear guide to the weaves used in Monte Napoleone dress shirts.',
        keywords: 'shirt fabrics, broadcloth, twill, oxford cloth, Monte Napoleone fabric guide',
        image: '/uploads/articles/fabric-guide-hero.jpg',
      },
      'oversikt-over-skjortestoffer': {
        title: 'Oversikt over skjortestoffer – Monte Napoleone 1974',
        description:
          'Broadcloth, twill, oxford, lin og mer — oversikten over vevene i Monte Napoleone dresskjorter.',
        keywords: 'skjortestoffer, broadcloth, twill, oxford, Monte Napoleone stoffguide',
        image: '/uploads/articles/fabric-guide-hero.jpg',
      },
      'sustainable-fashion': {
        title: 'Quality & Sustainability – Monte Napoleone 1974',
        description:
          'Buy less and choose shirts that last. Why timeless quality is kinder to the planet than fast fashion.',
        keywords: 'sustainable fashion, buy less, quality shirts, Monte Napoleone',
        image: '/uploads/articles/sustainable-fashion-hero.jpg',
      },
    };
    const meta = articleMeta[articleKey] || articleMeta['fabric-guide'];
    return {
      title: clampSeoText(meta.title, 28, 62, 'Monte Napoleone'),
      description: clampSeoText(meta.description, 110, 160, 'Monte Napoleone 1974.'),
      keywords: meta.keywords,
      canonicalUrl,
      ogType: 'article',
      ogLocale,
      ogSiteName: 'Monte Napoleone 1974',
      ogImage: resolveImage(meta.image),
      ogImageAlt: meta.title,
      robots: 'index, follow, max-image-preview:large',
      hreflangs,
      jsonLd: [orgSchema, websiteSchema],
    };
  }

  if (params.view === 'info') {
    const pageKey = (params.slug || 'returns').toLowerCase();
    const infoMeta: Record<string, { title: string; description: string; keywords: string }> = {
      returns: {
        title: 'Returns & Exchanges – Monte Napoleone 1974',
        description:
          '14-day ready-to-wear returns, international return customs guidance, and bespoke shirt policy for Monte Napoleone 1974.',
        keywords: 'shirt returns, exchange policy, Monte Napoleone returns',
      },
      withdrawal: {
        title: 'Withdrawal Form – Monte Napoleone 1974',
        description:
          'Statutory withdrawal form and instructions for eligible ready-to-wear orders from Monte Napoleone 1974.',
        keywords: 'withdrawal form, cooling-off period, Monte Napoleone',
      },
      dealers: {
        title: 'Dealers & Partners – Monte Napoleone 1974',
        description:
          'Find Monte Napoleone partner boutiques in Norway and enquire about wholesale partnerships.',
        keywords: 'Monte Napoleone dealers, Oslo showroom, shirt retailers Norway',
      },
      careers: {
        title: 'Careers – Monte Napoleone 1974',
        description:
          'Career opportunities with Monte Napoleone 1974. Introduce yourself to our Italian shirting team.',
        keywords: 'Monte Napoleone careers, jobs, Italian shirt brand careers',
      },
      faq: {
        title: 'FAQ – Monte Napoleone 1974',
        description:
          'Frequently asked questions about shipping, Vipps/PayPal payments, sizing, and order changes.',
        keywords: 'Monte Napoleone FAQ, shipping times, payment methods',
      },
      privacy: {
        title: 'Privacy Policy – Monte Napoleone 1974',
        description:
          'How Monte Napoleone 1974 collects, uses, and protects personal data for orders and newsletters.',
        keywords: 'privacy policy, GDPR, Monte Napoleone data protection',
      },
    };
    const meta = infoMeta[pageKey] || infoMeta.returns;
    return {
      title: clampSeoText(meta.title, 28, 62, 'Monte Napoleone'),
      description: clampSeoText(meta.description, 110, 160, 'Monte Napoleone 1974.'),
      keywords: meta.keywords,
      canonicalUrl,
      ogType: 'website',
      ogLocale,
      ogSiteName: 'Monte Napoleone 1974',
      ogImage: resolveImage('/src/assets/images/editorial_tailoring_guide_1795248294030.jpg'),
      ogImageAlt: meta.title,
      robots: 'index, follow, max-image-preview:large',
      hreflangs,
      jsonLd: [orgSchema, websiteSchema],
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
    keywords: 'Monte Napoleone 1974, Italian dress shirts, bespoke shirting, custom sleeve length, linen shirts, Oslo, Treviso',
    canonicalUrl,
    ogType: 'website',
    ogLocale,
    ogSiteName: 'Monte Napoleone 1974',
    ogImage: resolveImage('/src/assets/images/hero_oxford_olive_1795248294228.jpg'),
    ogImageAlt: 'Monte Napoleone 1974 Bespoke Italian Shirts',
    robots: params.view === 'checkout' || params.view === 'account' ? 'noindex, follow' : 'index, follow, max-image-preview:large',
    hreflangs,
    jsonLd: [orgSchema, websiteSchema],
  };
}

export function buildRobotsTxt(origin: string): string {
  const baseOrigin = (origin || 'https://montenapoleone1974.com').replace(/\/+$/, '');
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /*/admin',
    'Disallow: /api/',
    'Disallow: /checkout',
    'Disallow: /*/checkout',
    'Disallow: /account',
    'Disallow: /*/account',
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
  products: Array<{ slug: string; primary_image?: string; title?: string }>;
}): string {
  const baseOrigin = (params.origin || 'https://montenapoleone1974.com').replace(/\/+$/, '');
  const nowDate = new Date().toISOString().slice(0, 10);
  const urls: Array<{
    loc: string;
    changefreq: string;
    priority: string;
    altPaths?: Record<RegionCode, string>;
    imageLoc?: string;
    imageTitle?: string;
  }> = [];

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
    for (const infoSlug of ['returns', 'withdrawal', 'dealers', 'careers', 'faq', 'privacy']) {
      urls.push({
        loc: `${baseOrigin}${buildStorefrontPath({ regionCode: rc, view: 'info', slug: infoSlug })}`,
        changefreq: 'monthly',
        priority: '0.5',
      });
    }
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
    const imgUrl = prod.primary_image
      ? /^https?:\/\//i.test(prod.primary_image)
        ? prod.primary_image
        : `${baseOrigin}${prod.primary_image.startsWith('/') ? prod.primary_image : `/${prod.primary_image}`}`
      : undefined;
    const altPaths = {
      en: `${baseOrigin}${buildStorefrontPath({ regionCode: 'en', view: 'product', slug: prod.slug })}`,
      no: `${baseOrigin}${buildStorefrontPath({ regionCode: 'no', view: 'product', slug: prod.slug })}`,
      it: `${baseOrigin}${buildStorefrontPath({ regionCode: 'it', view: 'product', slug: prod.slug })}`,
      vn: `${baseOrigin}${buildStorefrontPath({ regionCode: 'vn', view: 'product', slug: prod.slug })}`,
    } as Record<RegionCode, string>;
    for (const rc of params.regions) {
      urls.push({
        loc: `${baseOrigin}${buildStorefrontPath({ regionCode: rc, view: 'product', slug: prod.slug })}`,
        changefreq: 'weekly',
        priority: '0.9',
        altPaths,
        imageLoc: imgUrl,
        imageTitle: prod.title || prod.slug,
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
      const imgXml = u.imageLoc
        ? `    <image:image>\n      <image:loc>${escapeXml(u.imageLoc)}</image:loc>${
            u.imageTitle ? `\n      <image:title>${escapeXml(u.imageTitle)}</image:title>` : ''
          }\n    </image:image>`
        : '';
      return `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <lastmod>${nowDate}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>${altXml ? `\n${altXml}` : ''}${imgXml ? `\n${imgXml}` : ''}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>`;
}

