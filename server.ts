import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import http from 'http';
import multer from 'multer';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer } from 'ws';
import {
  GoogleGenAI,
  Modality,
  ThinkingLevel,
  Type,
  type FunctionDeclaration,
  type LiveServerMessage,
} from '@google/genai';
import { DB_PATH, db, initializeDatabase, UPLOADS_DIR } from './server/db.ts';
import {
  createSession,
  extractBearerToken,
  getUserByToken,
  hashPassword,
  logAudit,
  mapUserRow,
  requireAuth,
  requirePermission,
  requireStaffOrOwner,
  verifyPassword,
  type AuthedRequest,
} from './server/auth.ts';
import {
  buildGoogleAuthorizeUrl,
  buildWixAuthorizeUrl,
  createDhlWaybillNumber,
  dispatchLocalizedOrderEmail,
  exchangeGoogleOAuthCode,
  exchangeWixOAuthCode,
  fetchVippsExpressShippingProfile,
  getCredentialsMaskedStatus,
  getDhlQuotesForRegion,
  getGatewayConfigurationStatus,
  getResolvedSecret,
  initializePaymentSession,
  resolveVisitorGeo,
  sendResendTestEmail,
  syncSubscriberToMailchimp,
  updateStoredCredentials,
  verifyProviderOnboarding,
} from './server/integrations.ts';
import type {
  AiAgentAction,
  AiPublicConfig,
  ApiCredentialKey,
  BespokeTailoring,
  BulkDiscountSettings,
  CsvImportRow,
  CustomerAuthPublicConfig,
  CustomerAuthSettings,
  HeroSlideRecord,
  PaymentMethod,
  PromotionPopupSettings,
  RegionCode,
  RegionConfig,
  ShippingMethod,
  StaffPermissions,
  TopBannerSettings,
  VisitorCountryRollup,
  WooProductImportRow,
} from './src/types.ts';
import {
  buildDeterministicMultilingualCopy,
  calculateCheckoutTotals,
  calculateTailoringSurcharge,
  computeBulkPriceAdjustment,
  convertBasePriceAcrossRegions,
  DEFAULT_BULK_DISCOUNT_SETTINGS,
  DEFAULT_CUSTOMER_AUTH_SETTINGS,
  DEFAULT_PROMO_POPUP_SETTINGS,
  DEFAULT_STAFF_PERMISSIONS,
  DEFAULT_TAILORING_SURCHARGE,
  DEFAULT_TOP_BANNER_SETTINGS,
  estimateB2BUnitRate,
  generateBankReference,
  getAvailablePaymentMethods,
  hasPermission,
  normalizeBillingAddress,
  OWNER_PERMISSIONS,
  parseWooCommerceCsv,
  parseWordPressCategoriesXml,
  resolveOrderDiscounts,
  slugifyCategoryName,
  toCsv,
} from './src/utils/commerce.ts';
import {
  buildRobotsTxt,
  buildSeoMetadata,
  buildSitemapXml,
  parseStorefrontUrl,
} from './src/utils/seo.ts';
import {
  evaluateStorefrontAgentTurn,
  type AgentCatalogProduct,
} from './src/utils/agentLogic.ts';

dotenv.config();
initializeDatabase();

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '4mb' }));

// Static serving for uploaded WordPress-style media files
app.use('/uploads', express.static(UPLOADS_DIR));

// Safe multer configuration for image uploads
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const extMap: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
      };
      const ext = extMap[file.mimetype] || '.jpg';
      const safeName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      cb(null, safeName);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WebP images are permitted.'));
    }
  },
});

function parseRegion(raw: unknown): RegionCode {
  if (raw === 'no' || raw === 'it' || raw === 'vn' || raw === 'en') return raw;
  return 'en';
}

function hydrateRegion(row: Record<string, unknown>): RegionConfig {
  let enabledPayments: PaymentMethod[] = ['stripe', 'paypal', 'bank_transfer'];
  try {
    enabledPayments = JSON.parse(String(row.enabled_payments)) as PaymentMethod[];
  } catch {
    // keep default
  }
  return {
    code: parseRegion(row.code),
    name: String(row.name),
    language_name: String(row.language_name),
    currency_code: String(row.currency_code),
    currency_symbol: String(row.currency_symbol),
    vat_rate: Number(row.vat_rate),
    free_shipping_threshold: Number(row.free_shipping_threshold),
    dhl_base_rate: Number(row.dhl_base_rate),
    dhl_express_rate: Number(row.dhl_express_rate),
    dhl_eta_days: String(row.dhl_eta_days),
    bank_name: String(row.bank_name),
    bank_account_display: String(row.bank_account_display),
    bank_iban: String(row.bank_iban),
    bank_bic: String(row.bank_bic),
    bank_reference_prefix: String(row.bank_reference_prefix),
    enabled_payments: enabledPayments,
    warehouse_name: String(row.warehouse_name),
  };
}

function getAllRegions(): RegionConfig[] {
  const rows = db.prepare('SELECT * FROM regions').all() as Array<Record<string, unknown>>;
  return rows.map(hydrateRegion);
}

function getRegionByCode(code: RegionCode): RegionConfig | null {
  const row = db.prepare('SELECT * FROM regions WHERE code = ?').get(code) as
    | Record<string, unknown>
    | undefined;
  return row ? hydrateRegion(row) : null;
}

interface InternalAiSettings extends AiPublicConfig {
  geminiModel: string;
  openaiModel: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
}

const DEFAULT_AI_INTERNAL_SETTINGS: InternalAiSettings = {
  enabled: true,
  displayMode: 'agent',
  bubblePosition: 'right',
  activeProvider: 'gemini',
  geminiModel: 'gemini-4-hydrogen',
  openaiModel: 'gpt-4o-mini',
  geminiApiKey: '',
  openaiApiKey: '',
  greeting_en: 'Ask our Treviso tailor agent — find your linen fit, check sizes, or add shirts directly to your bag.',
  greeting_no: 'Spør vår skredderagent — finn lin- eller business-skjorter, sjekk størrelser eller legg rett i handleposen.',
  greeting_it: 'Chiedi al nostro sarto digitale — trova la camicia ideale o aggiungila subito al carrello.',
  greeting_vn: 'Hỏi chuyên gia may đo Ý — tìm áo linen, kiểm tra size hoặc thêm trực tiếp vào giỏ hàng.',
};

function getSiteSettingJson<T>(key: string, fallback: T): T {
  const row = db.prepare('SELECT value_json FROM site_settings WHERE key = ?').get(key) as
    | { value_json: string }
    | undefined;
  if (!row) return fallback;
  try {
    return { ...fallback, ...JSON.parse(row.value_json) };
  } catch {
    return fallback;
  }
}

function getPromoRules(): PromotionPopupSettings {
  return getSiteSettingJson<PromotionPopupSettings>('promo_rules', DEFAULT_PROMO_POPUP_SETTINGS);
}

function getBulkDiscountSettings(): BulkDiscountSettings {
  return getSiteSettingJson<BulkDiscountSettings>('bulk_discount', DEFAULT_BULK_DISCOUNT_SETTINGS);
}

function getAiSettingsInternal(): InternalAiSettings {
  return getSiteSettingJson<InternalAiSettings>('ai_settings', DEFAULT_AI_INTERNAL_SETTINGS);
}

function getPublicAiConfig(): AiPublicConfig {
  const s = getAiSettingsInternal();
  return {
    enabled: Boolean(s.enabled),
    displayMode: s.displayMode === 'chatbot' ? 'chatbot' : 'agent',
    bubblePosition: s.bubblePosition === 'left' ? 'left' : 'right',
    activeProvider: s.activeProvider === 'openai' ? 'openai' : 'gemini',
    greeting_en: s.greeting_en,
    greeting_no: s.greeting_no,
    greeting_it: s.greeting_it,
    greeting_vn: s.greeting_vn,
  };
}

function getTopBannerSettings(): TopBannerSettings {
  return getSiteSettingJson<TopBannerSettings>('top_banner', DEFAULT_TOP_BANNER_SETTINGS);
}

function getCustomerAuthSettings(): CustomerAuthSettings {
  return getSiteSettingJson<CustomerAuthSettings>('customer_auth', DEFAULT_CUSTOMER_AUTH_SETTINGS);
}

function getPublicCustomerAuthConfig(req: express.Request): CustomerAuthPublicConfig {
  const s = getCustomerAuthSettings();
  const googleConfigured = getGatewayConfigurationStatus().google.configured;
  const origin = resolveRequestOrigin(req);
  return {
    googleLoginEnabled: Boolean(s.googleLoginEnabled),
    showCornerPopup: Boolean(s.showCornerPopup),
    autoSubscribeMailchimp: Boolean(s.autoSubscribeMailchimp),
    cornerPopupDelaySeconds: Math.max(0, Math.min(30, Number(s.cornerPopupDelaySeconds ?? 3))),
    googleConfigured,
    googleCallbackUrl: `${origin}/api/auth/google/callback`,
  };
}

function parseCategorySlugs(primary: unknown, jsonRaw: unknown): string[] {
  const list: string[] = [];
  if (Array.isArray(jsonRaw)) {
    for (const item of jsonRaw) {
      const s = String(item || '').trim();
      if (s && !list.includes(s)) list.push(s);
    }
  } else if (typeof jsonRaw === 'string' && jsonRaw.trim()) {
    try {
      const parsed = JSON.parse(jsonRaw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const s = String(item || '').trim();
          if (s && !list.includes(s)) list.push(s);
        }
      }
    } catch {
      // ignore invalid json
    }
  }
  const primarySlug = String(primary || '').trim();
  if (primarySlug && !list.includes(primarySlug)) {
    list.unshift(primarySlug);
  }
  return list.length > 0 ? list : ['business'];
}

function maskSecret(val?: string): string {
  const clean = (val || '').trim();
  if (!clean) return '';
  if (clean.length <= 8) return '••••••••';
  return `${clean.slice(0, 4)}••••${clean.slice(-4)}`;
}

function hydrateHeroSlide(row: Record<string, unknown>): HeroSlideRecord {
  return {
    id: Number(row.id),
    sort_order: Number(row.sort_order),
    active: Boolean(row.active),
    image_url: String(row.image_url),
    target_type: row.target_type === 'view' ? 'view' : 'category',
    target_value: String(row.target_value || 'all'),
    show_text: Boolean(row.show_text),
    show_button: Boolean(row.show_button),
    title_en: String(row.title_en || ''),
    title_no: String(row.title_no || ''),
    title_it: String(row.title_it || ''),
    title_vn: String(row.title_vn || ''),
    subtitle_en: String(row.subtitle_en || ''),
    subtitle_no: String(row.subtitle_no || ''),
    subtitle_it: String(row.subtitle_it || ''),
    subtitle_vn: String(row.subtitle_vn || ''),
    cta_en: String(row.cta_en || ''),
    cta_no: String(row.cta_no || ''),
    cta_it: String(row.cta_it || ''),
    cta_vn: String(row.cta_vn || ''),
  };
}

function isCustomerFirstOrder(email: string): boolean {
  const clean = email.trim().toLowerCase();
  if (!clean) return true;
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM orders WHERE LOWER(customer_email) = ? AND order_status != 'cancelled'`
    )
    .get(clean) as { c: number };
  return row.c === 0;
}

// Ephemeral CSRF state stores for OAuth flows
const wixOauthStates = new Map<string, { userId: number; expiresAt: number }>();
const googleOauthStates = new Map<
  string,
  { regionCode: RegionCode; subscribeNewsletter: boolean; redirectUri: string; expiresAt: number }
>();

function hydrateCategoryRow(c: Record<string, unknown>) {
  return {
    id: Number(c.id),
    slug: String(c.slug),
    parent_id: c.parent_id !== null && c.parent_id !== undefined ? Number(c.parent_id) : null,
    scope: c.scope === 'b2c' || c.scope === 'b2b' ? c.scope : 'both',
    active: c.active === undefined ? true : Boolean(c.active),
    sort_order: Number(c.sort_order ?? 0),
    name_en: String(c.name_en || ''),
    name_no: String(c.name_no || ''),
    name_it: String(c.name_it || ''),
    name_vn: String(c.name_vn || ''),
  };
}

function hydrateTailoringOptionRow(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    option_type: row.option_type === 'cuff' ? ('cuff' as const) : ('collar' as const),
    name: String(row.name || ''),
    subtitle: String(row.subtitle || ''),
    detail: String(row.detail || ''),
    stitch_spec: String(row.stitch_spec || ''),
    image_url: String(row.image_url || ''),
    sort_order: Number(row.sort_order ?? 0),
    is_default: Boolean(row.is_default),
    active: row.active === undefined ? true : Boolean(row.active),
  };
}

function getTailoringOptions(includeInactive = false) {
  const sql = includeInactive
    ? 'SELECT * FROM tailoring_options ORDER BY option_type ASC, sort_order ASC, id ASC'
    : 'SELECT * FROM tailoring_options WHERE active = 1 ORDER BY option_type ASC, sort_order ASC, id ASC';
  return (db.prepare(sql).all() as Array<Record<string, unknown>>).map(hydrateTailoringOptionRow);
}

function createOrGetReviewInvitesForOrder(params: {
  orderNumber: string;
  regionCode: RegionCode;
  customerEmail: string;
  customerName: string;
  items: Array<{ productId: number; sku?: string; title?: string; image?: string }>;
  origin: string;
}) {
  const seenProdIds = new Set<number>();
  const links: Array<{
    productId: number;
    slug: string;
    title: string;
    sku: string;
    image: string;
    token: string;
    reviewUrl: string;
  }> = [];

  for (const item of params.items) {
    const pid = Number(item.productId);
    if (!pid || seenProdIds.has(pid)) continue;
    seenProdIds.add(pid);

    const prod = db
      .prepare('SELECT id, slug, sku, primary_image FROM products WHERE id = ?')
      .get(pid) as { id: number; slug: string; sku: string; primary_image: string } | undefined;
    if (!prod) continue;

    let invite = db
      .prepare('SELECT token FROM review_invites WHERE order_number = ? AND product_id = ?')
      .get(params.orderNumber, pid) as { token: string } | undefined;

    if (!invite) {
      const token = crypto.randomBytes(18).toString('hex');
      db.prepare(
        `INSERT INTO review_invites (token, order_number, product_id, customer_email, customer_name, region_code)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        token,
        params.orderNumber,
        pid,
        params.customerEmail.trim().toLowerCase(),
        params.customerName.trim(),
        params.regionCode
      );
      invite = { token };
    }

    const baseOrigin = params.origin.replace(/\/+$/, '');
    links.push({
      productId: pid,
      slug: prod.slug,
      title: String(item.title || prod.sku),
      sku: String(item.sku || prod.sku),
      image: String(item.image || prod.primary_image),
      token: invite.token,
      reviewUrl: `${baseOrigin}/${params.regionCode}/product/${prod.slug}?reviewToken=${invite.token}`,
    });
  }
  return links;
}

function checkUserPurchasedProduct(customerEmail: string, productId: number): { orderNumber: string } | null {
  const cleanEmail = customerEmail.trim().toLowerCase();
  if (!cleanEmail) return null;
  const orders = db
    .prepare(
      `SELECT order_number, items_json FROM orders
       WHERE LOWER(customer_email) = ? AND order_status != 'cancelled'
       ORDER BY id DESC`
    )
    .all(cleanEmail) as Array<{ order_number: string; items_json: string }>;

  for (const ord of orders) {
    try {
      const items = JSON.parse(ord.items_json || '[]') as Array<{ productId?: number }>;
      if (items.some((it) => Number(it.productId) === productId)) {
        return { orderNumber: ord.order_number };
      }
    } catch {
      // skip invalid json
    }
  }
  return null;
}

function buildProductReviewsPayload(params: {
  productId: number;
  reviewToken?: string;
  authUserEmail?: string | null;
  authUserName?: string | null;
}) {
  const reviewRows = db
    .prepare(
      `SELECT id, product_id, order_number, customer_name, rating, title, comment, fit_feedback, region_code, verified_purchase, created_at
       FROM product_reviews
       WHERE product_id = ?
       ORDER BY id DESC`
    )
    .all(params.productId) as Array<Record<string, unknown>>;

  const reviews = reviewRows.map((r) => ({
    id: Number(r.id),
    product_id: Number(r.product_id),
    order_number: String(r.order_number),
    customer_name: String(r.customer_name),
    rating: Number(r.rating),
    title: String(r.title || ''),
    comment: String(r.comment || ''),
    fit_feedback: (r.fit_feedback === 'runs_small' || r.fit_feedback === 'runs_large'
      ? r.fit_feedback
      : 'true_to_size') as 'runs_small' | 'true_to_size' | 'runs_large',
    region_code: parseRegion(r.region_code),
    verified_purchase: Boolean(r.verified_purchase),
    created_at: String(r.created_at),
  }));

  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 10) / 10
      : 0;

  let canReview = false;
  let alreadyReviewed = false;
  let reason: 'invite_verified' | 'order_verified' | 'already_reviewed' | 'purchase_required' = 'purchase_required';
  let orderNumber: string | undefined;
  let customerName: string | undefined;

  const cleanToken = (params.reviewToken || '').trim();
  if (cleanToken) {
    const invite = db
      .prepare('SELECT * FROM review_invites WHERE token = ? AND product_id = ?')
      .get(cleanToken, params.productId) as
      | { order_number: string; customer_email: string; customer_name: string }
      | undefined;
    if (invite) {
      const existing = db
        .prepare('SELECT id FROM product_reviews WHERE product_id = ? AND LOWER(customer_email) = LOWER(?)')
        .get(params.productId, invite.customer_email);
      if (existing) {
        alreadyReviewed = true;
        reason = 'already_reviewed';
      } else {
        canReview = true;
        reason = 'invite_verified';
        orderNumber = invite.order_number;
        customerName = invite.customer_name;
      }
    }
  }

  if (!canReview && !alreadyReviewed && params.authUserEmail) {
    const cleanEmail = params.authUserEmail.trim().toLowerCase();
    const existing = db
      .prepare('SELECT id FROM product_reviews WHERE product_id = ? AND LOWER(customer_email) = ?')
      .get(params.productId, cleanEmail);
    if (existing) {
      alreadyReviewed = true;
      reason = 'already_reviewed';
    } else {
      const matched = checkUserPurchasedProduct(cleanEmail, params.productId);
      if (matched) {
        canReview = true;
        reason = 'order_verified';
        orderNumber = matched.orderNumber;
        customerName = params.authUserName || cleanEmail.split('@')[0];
      }
    }
  }

  return {
    reviews,
    reviewCount,
    averageRating,
    viewer: {
      canReview,
      alreadyReviewed,
      reason,
      orderNumber,
      customerName,
    },
  };
}

// ---------------------------------------------------------------------------
// PUBLIC STOREFRONT ENDPOINTS
// ---------------------------------------------------------------------------

app.post('/api/analytics/visit', async (req, res) => {
  const b = req.body || {};
  const rawSid = String(b.sessionId || '').trim().slice(0, 64);
  const sessionId = rawSid || crypto.randomBytes(12).toString('hex');
  const regionCode = parseRegion(b.regionCode);
  const pathUrl = String(b.path || '/').slice(0, 120);
  const forwarded = String(req.headers['x-forwarded-for'] || req.ip || '');
  const proxyCountryHeader = String(
    req.headers['cf-ipcountry'] ||
      req.headers['x-vercel-ip-country'] ||
      req.headers['x-country-code'] ||
      req.headers['x-appengine-country'] ||
      ''
  ).trim();

  try {
    const geo = await resolveVisitorGeo(forwarded, regionCode, proxyCountryHeader);
    db.prepare(
      `INSERT INTO visitor_sessions (
        session_id, country, country_code, city, region_code, lat, lng, current_path, last_seen_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(session_id) DO UPDATE SET
        country = excluded.country,
        country_code = excluded.country_code,
        city = excluded.city,
        lat = excluded.lat,
        lng = excluded.lng,
        region_code = excluded.region_code,
        current_path = excluded.current_path,
        last_seen_at = datetime('now')`
    ).run(
      sessionId,
      geo.country,
      geo.country_code,
      geo.city,
      regionCode,
      geo.lat,
      geo.lng,
      pathUrl
    );
    res.json({ ok: true, sessionId, geo });
  } catch {
    res.json({ ok: true, sessionId });
  }
});

app.post('/api/payments/vipps/checkout-prefill', async (req, res) => {
  const phone = String(req.body?.phone || '').trim();
  const profile = await fetchVippsExpressShippingProfile(phone);
  res.json(profile);
});

app.get('/api/storefront/bootstrap', (req, res) => {
  const regionCode = parseRegion(req.query.region);
  const regions = getAllRegions();
  const categories = (
    db
      .prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order ASC, id ASC')
      .all() as Array<Record<string, unknown>>
  ).map(hydrateCategoryRow);
  const menuItems = (
    db
      .prepare('SELECT * FROM menu_items WHERE active = 1 ORDER BY sort_order ASC, id ASC')
      .all() as Array<Record<string, unknown>>
  ).map((m) => ({
    ...m,
    active: Boolean(m.active),
  }));

  const productRows = db
    .prepare(
      `SELECT p.*, pl.title, pl.subtitle, pl.description, pl.price, pl.compare_at_price,
              pl.stock_qty, pl.warehouse_location, pl.delivery_note,
              pl.seo_title, pl.seo_description, pl.seo_keywords
       FROM products p
       JOIN product_localizations pl ON pl.product_id = p.id AND pl.region_code = ?
       WHERE p.active = 1
       ORDER BY p.is_featured DESC, p.id ASC`
    )
    .all(regionCode) as Array<Record<string, unknown>>;

  const reviewStatsRows = db
    .prepare(
      `SELECT product_id, COUNT(*) AS review_count, ROUND(AVG(rating), 1) AS average_rating
       FROM product_reviews
       GROUP BY product_id`
    )
    .all() as Array<{ product_id: number; review_count: number; average_rating: number }>;
  const reviewStatsMap = new Map<number, { reviewCount: number; averageRating: number }>();
  for (const rs of reviewStatsRows) {
    reviewStatsMap.set(Number(rs.product_id), {
      reviewCount: Number(rs.review_count || 0),
      averageRating: Number(rs.average_rating || 0),
    });
  }

  const variantsRows = db
    .prepare('SELECT * FROM product_variants WHERE active = 1')
    .all() as Array<Record<string, unknown>>;
  const variantsByProd = new Map<number, Array<Record<string, unknown>>>();
  for (const v of variantsRows) {
    const pid = Number(v.product_id);
    const list = variantsByProd.get(pid) || [];
    list.push({
      id: Number(v.id),
      product_id: pid,
      fit: String(v.fit),
      size_label: String(v.size_label),
      sku_variant: String(v.sku_variant),
      price_en: v.price_en !== null ? Number(v.price_en) : null,
      price_no: v.price_no !== null ? Number(v.price_no) : null,
      price_it: v.price_it !== null ? Number(v.price_it) : null,
      price_vn: v.price_vn !== null ? Number(v.price_vn) : null,
      stock_en: Number(v.stock_en),
      stock_no: Number(v.stock_no),
      stock_it: Number(v.stock_it),
      stock_vn: Number(v.stock_vn),
      active: Boolean(v.active),
    });
    variantsByProd.set(pid, list);
  }

  const tailoringSpecs = db
    .prepare('SELECT * FROM tailoring_size_specs ORDER BY fit ASC, size_label ASC')
    .all();

  const tailoringOptions = getTailoringOptions(false);

  const products = productRows.map((p) => {
    const categorySlugs = parseCategorySlugs(p.category_slug, p.category_slugs_json);
    const pid = Number(p.id);
    const rStats = reviewStatsMap.get(pid);
    return {
      id: pid,
      sku: String(p.sku),
      slug: String(p.slug),
      category_slug: categorySlugs[0] || String(p.category_slug),
      category_slugs: categorySlugs,
      fabric_spec: String(p.fabric_spec),
      is_featured: Boolean(p.is_featured),
      is_b2b_eligible: Boolean(p.is_b2b_eligible),
      is_outlet: Boolean(p.is_outlet),
      preorder_allowed: Boolean(p.preorder_allowed),
      primary_image: String(p.primary_image),
      secondary_image: String(p.secondary_image),
      gallery: JSON.parse(String(p.gallery_json)) as string[],
      collars: JSON.parse(String(p.collars_json)) as string[],
      cuffs: JSON.parse(String(p.cuffs_json)) as string[],
      sizes: JSON.parse(String(p.sizes_json)) as string[],
      active: Boolean(p.active),
      title: String(p.title),
      subtitle: String(p.subtitle),
      description: String(p.description),
      price: Number(p.price),
      compare_at_price: p.compare_at_price !== null ? Number(p.compare_at_price) : null,
      stock_qty: Number(p.stock_qty),
      warehouse_location: String(p.warehouse_location),
      delivery_note: String(p.delivery_note),
      seo_title: String(p.seo_title || ''),
      seo_description: String(p.seo_description || ''),
      seo_keywords: String(p.seo_keywords || ''),
      review_count: rStats?.reviewCount || 0,
      average_rating: rStats?.averageRating || 0,
      variants: variantsByProd.get(pid) || [],
    };
  });

  const heroSlides = (
    db.prepare('SELECT * FROM hero_slides WHERE active = 1 ORDER BY sort_order ASC, id ASC').all() as Array<
      Record<string, unknown>
    >
  ).map(hydrateHeroSlide);

  res.json({
    activeRegion: regionCode,
    regions,
    categories,
    menuItems,
    heroSlides,
    topBanner: getTopBannerSettings(),
    promoRules: getPromoRules(),
    bulkDiscount: getBulkDiscountSettings(),
    aiConfig: getPublicAiConfig(),
    customerAuthConfig: getPublicCustomerAuthConfig(req),
    products,
    tailoringSpecs,
    tailoringOptions,
    tailoringSurcharges: DEFAULT_TAILORING_SURCHARGE,
  });
});

app.get('/api/products/:slug/reviews', (req, res) => {
  const slug = String(req.params.slug || '').trim();
  const product = db
    .prepare('SELECT id, slug FROM products WHERE slug = ? AND active = 1')
    .get(slug) as { id: number; slug: string } | undefined;
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const token = extractBearerToken(req);
  const authUser = getUserByToken(token);
  const reviewToken = String(req.query.reviewToken || '').trim();

  const payload = buildProductReviewsPayload({
    productId: product.id,
    reviewToken,
    authUserEmail: authUser?.email || null,
    authUserName: authUser?.name || null,
  });

  res.json(payload);
});

app.post('/api/products/:slug/reviews', (req, res) => {
  const slug = String(req.params.slug || '').trim();
  const product = db
    .prepare('SELECT id, slug FROM products WHERE slug = ? AND active = 1')
    .get(slug) as { id: number; slug: string } | undefined;
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const body = req.body || {};
  const rating = Math.round(Number(body.rating || 0));
  const title = String(body.title || '').trim().slice(0, 140);
  const comment = String(body.comment || '').trim().slice(0, 1200);
  const fitFeedback =
    body.fitFeedback === 'runs_small' || body.fitFeedback === 'runs_large'
      ? body.fitFeedback
      : 'true_to_size';
  const regionCode = parseRegion(body.regionCode);
  const reviewToken = String(body.reviewToken || '').trim();

  if (rating < 1 || rating > 5) {
    res.status(400).json({ error: 'Please select a star rating from 1 to 5.' });
    return;
  }
  if (comment.length < 5) {
    res.status(400).json({ error: 'Please write a brief review (minimum 5 characters).' });
    return;
  }

  const bearerToken = extractBearerToken(req);
  const authUser = getUserByToken(bearerToken);

  let verifiedEmail = '';
  let verifiedName = '';
  let verifiedOrderNumber = '';

  if (reviewToken) {
    const invite = db
      .prepare('SELECT * FROM review_invites WHERE token = ? AND product_id = ?')
      .get(reviewToken, product.id) as
      | { order_number: string; customer_email: string; customer_name: string }
      | undefined;
    if (invite) {
      verifiedEmail = invite.customer_email.trim().toLowerCase();
      verifiedName = invite.customer_name.trim() || verifiedEmail.split('@')[0];
      verifiedOrderNumber = invite.order_number;
    }
  }

  if (!verifiedEmail && authUser) {
    const matched = checkUserPurchasedProduct(authUser.email, product.id);
    if (matched) {
      verifiedEmail = authUser.email.trim().toLowerCase();
      verifiedName = authUser.name.trim() || verifiedEmail.split('@')[0];
      verifiedOrderNumber = matched.orderNumber;
    }
  }

  if (!verifiedEmail || !verifiedOrderNumber) {
    res.status(403).json({
      error: 'Only customers who have purchased this product can leave a verified review.',
    });
    return;
  }

  const duplicate = db
    .prepare('SELECT id FROM product_reviews WHERE product_id = ? AND LOWER(customer_email) = ?')
    .get(product.id, verifiedEmail);
  if (duplicate) {
    res.status(409).json({
      error: 'You have already submitted a review for this product.',
    });
    return;
  }

  const displayNameInput = String(body.customerName || '').trim().slice(0, 80);
  const finalName = displayNameInput || verifiedName;

  db.transaction(() => {
    db.prepare(
      `INSERT INTO product_reviews (
        product_id, order_number, customer_email, customer_name, rating, title, comment, fit_feedback, region_code, verified_purchase
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    ).run(
      product.id,
      verifiedOrderNumber,
      verifiedEmail,
      finalName,
      rating,
      title,
      comment,
      fitFeedback,
      regionCode
    );

    db.prepare(
      `UPDATE review_invites SET used_at = datetime('now')
       WHERE product_id = ? AND LOWER(customer_email) = ?`
    ).run(product.id, verifiedEmail);
  })();

  const updated = buildProductReviewsPayload({
    productId: product.id,
    reviewToken,
    authUserEmail: authUser?.email || verifiedEmail,
    authUserName: authUser?.name || finalName,
  });

  res.status(201).json(updated);
});

app.post('/api/promo/validate', (req, res) => {
  const b = req.body || {};
  const regionCode = parseRegion(b.regionCode);
  const subtotal = Math.max(0, Number(b.subtotal || 0));
  const totalQty = Math.max(0, Math.floor(Number(b.totalQty || 0)));
  const discountCode = String(b.discountCode || '').trim();
  const customerEmail = String(b.customerEmail || '').trim().toLowerCase();

  const promoSettings = getPromoRules();
  const bulkSettings = getBulkDiscountSettings();
  const firstOrder = isCustomerFirstOrder(customerEmail);

  const resolution = resolveOrderDiscounts({
    subtotal,
    totalQty,
    regionCode,
    discountCode,
    promoSettings,
    bulkSettings,
    isFirstOrder: firstOrder,
  });

  res.json({
    ...resolution,
    isFirstOrder: firstOrder,
  });
});

app.post('/api/shipping/dhl/quote', async (req, res) => {
  const regionCode = parseRegion(req.body?.regionCode);
  const subtotalAfterDiscount = Math.max(0, Number(req.body?.subtotalAfterDiscount || 0));
  const itemCount = Math.max(1, Number(req.body?.itemCount || 1));

  const region = getRegionByCode(regionCode);
  if (!region) {
    res.status(404).json({ error: 'Region not found' });
    return;
  }

  const quotes = await getDhlQuotesForRegion({ region, subtotalAfterDiscount, itemCount });
  res.json({ quotes });
});

app.post('/api/checkout/orders', async (req, res) => {
  const body = req.body || {};
  const regionCode = parseRegion(body.regionCode);
  const region = getRegionByCode(regionCode);
  if (!region) {
    res.status(400).json({ error: 'Invalid region' });
    return;
  }

  const customerName = String(body.customerName || '').trim();
  const customerEmail = String(body.customerEmail || '').trim();
  const customerPhone = String(body.customerPhone || '').trim();
  const shippingAddress = String(body.shippingAddress || '').trim();
  const shippingCity = String(body.shippingCity || '').trim();
  const shippingPostalCode = String(body.shippingPostalCode || '').trim();
  const shippingCountry = String(body.shippingCountry || region.name).trim();
  const billingSameAsShipping = body.billingSameAsShipping !== false;
  const billingResolved = normalizeBillingAddress(
    {
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      address: shippingAddress,
      city: shippingCity,
      postalCode: shippingPostalCode,
      country: shippingCountry,
    },
    billingSameAsShipping,
    {
      name: body.billingName ? String(body.billingName) : undefined,
      email: body.billingEmail ? String(body.billingEmail) : undefined,
      phone: body.billingPhone ? String(body.billingPhone) : undefined,
      address: body.billingAddress ? String(body.billingAddress) : undefined,
      city: body.billingCity ? String(body.billingCity) : undefined,
      postalCode: body.billingPostalCode ? String(body.billingPostalCode) : undefined,
      country: body.billingCountry ? String(body.billingCountry) : undefined,
    }
  );
  const isB2B = Boolean(body.isB2B);
  const companyName = isB2B ? String(body.companyName || '').trim() || null : null;
  const orgNumber = isB2B ? String(body.orgNumber || '').trim() || null : null;
  const discountCode = String(body.discountCode || '').trim();
  const notes = String(body.notes || '').trim() || null;

  if (!customerName || !customerEmail || !shippingAddress || !shippingCity || !shippingPostalCode) {
    res.status(400).json({ error: 'Please complete all required customer and shipping fields.' });
    return;
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0) {
    res.status(400).json({ error: 'Shopping bag is empty.' });
    return;
  }

  const shippingMethod: ShippingMethod =
    body.shippingMethod === 'dhl_express' ? 'dhl_express' : 'dhl_economy';

  const allowedMethods = getAvailablePaymentMethods(region);
  const requestedPayment = String(body.paymentMethod || '') as PaymentMethod;
  if (!allowedMethods.includes(requestedPayment)) {
    res.status(400).json({ error: `Payment method "${requestedPayment}" is not enabled for ${region.name}.` });
    return;
  }

  const transaction = db.transaction(() => {
    const seqRow = db.prepare('SELECT COALESCE(MAX(id), 0) + 1001 AS nextNum FROM orders').get() as {
      nextNum: number;
    };
    const orderNumber = `MN-2026-${seqRow.nextNum}`;

    const validatedItems: Array<{
      productId: number;
      sku: string;
      title: string;
      image: string;
      unitPrice: number;
      quantity: number;
      tailoring: BespokeTailoring;
    }> = [];

    for (const item of rawItems) {
      const productId = Number(item.productId);
      const qty = Math.max(1, Math.min(50, Math.floor(Number(item.quantity || 1))));

      const row = db
        .prepare(
          `SELECT p.id, p.sku, p.primary_image, p.preorder_allowed,
                  pl.title, pl.price, pl.stock_qty
           FROM products p
           JOIN product_localizations pl ON pl.product_id = p.id AND pl.region_code = ?
           WHERE p.id = ? AND p.active = 1`
        )
        .get(regionCode, productId) as
        | {
            id: number;
            sku: string;
            primary_image: string;
            preorder_allowed: number;
            title: string;
            price: number;
            stock_qty: number;
          }
        | undefined;

      if (!row) {
        throw new Error(`Product ID ${productId} is unavailable in ${region.name}.`);
      }

      if (row.stock_qty < qty && !row.preorder_allowed) {
        throw new Error(
          `Insufficient stock for "${row.title}" in ${region.warehouse_name} (${row.stock_qty} remaining).`
        );
      }

      const tailoring: BespokeTailoring = {
        fit: item.tailoring?.fit || 'Slim Fit',
        size: String(item.tailoring?.size || '40 / M'),
        collar: String(item.tailoring?.collar || 'Spread'),
        cuff: String(item.tailoring?.cuff || 'Modern'),
        sleeveAdjustmentCm: Number(item.tailoring?.sleeveAdjustmentCm || 0),
        lengthAdjustmentCm: Number(item.tailoring?.lengthAdjustmentCm || 0),
        waistAdjustmentCm: Number(item.tailoring?.waistAdjustmentCm || 0),
        chestAdjustmentCm: Number(item.tailoring?.chestAdjustmentCm || 0),
        bottomHemAdjustmentCm: Number(item.tailoring?.bottomHemAdjustmentCm || 0),
        shoulderAdjustmentCm: Number(item.tailoring?.shoulderAdjustmentCm || 0),
        monogram: item.tailoring?.monogram ? String(item.tailoring.monogram).slice(0, 6) : undefined,
      };

      const variantRow = db
        .prepare(
          'SELECT * FROM product_variants WHERE product_id = ? AND fit = ? AND size_label = ? AND active = 1'
        )
        .get(productId, tailoring.fit, tailoring.size) as Record<string, unknown> | undefined;

      const variantStockCol = `stock_${regionCode}`;
      const variantPriceCol = `price_${regionCode}`;
      const effectiveBasePrice =
        variantRow && typeof variantRow[variantPriceCol] === 'number' && Number(variantRow[variantPriceCol]) > 0
          ? Number(variantRow[variantPriceCol])
          : Number(row.price);

      const tailoringFee = calculateTailoringSurcharge(tailoring, regionCode);
      tailoring.tailoringSurcharge = tailoringFee;

      const effectiveUnitPrice = effectiveBasePrice + tailoringFee;

      const prevStock = Number(row.stock_qty);
      const deductQty = prevStock > 0 ? Math.min(prevStock, qty) : 0;
      if (deductQty > 0) {
        db.prepare(
          'UPDATE product_localizations SET stock_qty = stock_qty - ? WHERE product_id = ? AND region_code = ?'
        ).run(deductQty, productId, regionCode);

        db.prepare(
          `INSERT INTO stock_movements (
            product_id, sku, variant_label, region_code, delta_qty, previous_qty, new_qty, reason, reference_id, actor_email
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'order_capture', ?, ?)`
        ).run(
          productId,
          row.sku,
          `${tailoring.fit} · ${tailoring.size}`,
          regionCode,
          -deductQty,
          prevStock,
          prevStock - deductQty,
          orderNumber,
          customerEmail
        );
      }

      if (variantRow) {
        const prevVStock = Number(variantRow[variantStockCol] ?? 0);
        const nextVStock = Math.max(0, prevVStock - qty);
        db.prepare(`UPDATE product_variants SET ${variantStockCol} = ? WHERE id = ?`).run(
          nextVStock,
          variantRow.id
        );
      }

      validatedItems.push({
        productId: row.id,
        sku: variantRow ? String(variantRow.sku_variant) : row.sku,
        title: row.title,
        image: row.primary_image,
        unitPrice: effectiveUnitPrice,
        quantity: qty,
        tailoring,
      });
    }

    const promoSettings = getPromoRules();
    const bulkSettings = getBulkDiscountSettings();
    const firstOrder = isCustomerFirstOrder(customerEmail);

    const totals = calculateCheckoutTotals({
      items: validatedItems,
      region,
      shippingMethod,
      discountCode,
      promoSettings,
      bulkSettings,
      isFirstOrder: firstOrder,
    });

    const payInit = initializePaymentSession({
      method: requestedPayment,
      orderNumber,
      region,
      total: totals.total,
    });

    const insertRes = db
      .prepare(
        `INSERT INTO orders (
          order_number, region_code, currency_code, customer_name, customer_email, customer_phone,
          shipping_address, shipping_city, shipping_postal_code, shipping_country,
          billing_same_as_shipping, billing_name, billing_email, billing_phone,
          billing_address, billing_city, billing_postal_code, billing_country,
          is_b2b, company_name, org_number,
          subtotal, shipping_cost, discount_amount, vat_amount, total, payment_method, payment_status,
          payment_reference, shipping_method, dhl_tracking_number, dhl_status, order_status, items_json, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        orderNumber,
        regionCode,
        region.currency_code,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        shippingCity,
        shippingPostalCode,
        shippingCountry,
        billingSameAsShipping ? 1 : 0,
        billingResolved.name,
        billingResolved.email,
        billingResolved.phone,
        billingResolved.address,
        billingResolved.city,
        billingResolved.postalCode,
        billingResolved.country,
        isB2B ? 1 : 0,
        companyName,
        orgNumber,
        totals.subtotal,
        totals.shippingCost,
        totals.discountAmount,
        totals.vatAmount,
        totals.total,
        requestedPayment,
        payInit.paymentStatus,
        payInit.paymentReference,
        shippingMethod,
        null,
        'pending_label',
        'pending',
        JSON.stringify(validatedItems),
        notes
      );

    return {
      orderId: Number(insertRes.lastInsertRowid),
      orderNumber,
      payInit,
      totals,
    };
  });

  try {
    const result = transaction();
    const orderRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.orderId) as Record<
      string,
      unknown
    >;
    const hydratedOrder = {
      ...orderRow,
      is_b2b: Boolean(orderRow.is_b2b),
      billing_same_as_shipping:
        orderRow.billing_same_as_shipping === undefined ? true : Boolean(orderRow.billing_same_as_shipping),
      items: JSON.parse(String(orderRow.items_json)),
    };

    const origin = resolveRequestOrigin(req);
    const reviewLinks = createOrGetReviewInvitesForOrder({
      orderNumber: result.orderNumber,
      regionCode,
      customerEmail,
      customerName,
      items: hydratedOrder.items,
      origin,
    });

    const emailLog = await dispatchLocalizedOrderEmail({
      type: 'order_confirmation',
      order: hydratedOrder as unknown as Parameters<typeof dispatchLocalizedOrderEmail>[0]['order'],
      region,
    }).catch(() => null);

    await dispatchLocalizedOrderEmail({
      type: 'review_request',
      order: hydratedOrder as unknown as Parameters<typeof dispatchLocalizedOrderEmail>[0]['order'],
      region,
      reviewLinks,
    }).catch(() => null);

    res.status(201).json({
      order: hydratedOrder,
      payment: result.payInit,
      emailStatus: emailLog?.status || 'logged',
      reviewInvites: reviewLinks,
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Checkout failed' });
  }
});

app.post('/api/payments/:provider/confirm', (req, res) => {
  const orderNumber = String(req.body?.orderNumber || '').trim();
  const provider = String(req.params.provider || '').trim();

  const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber) as
    | Record<string, unknown>
    | undefined;
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  if (order.payment_method !== provider) {
    res.status(400).json({ error: 'Payment provider mismatch' });
    return;
  }

  db.prepare(
    `UPDATE orders SET payment_status = 'paid', order_status = 'processing' WHERE order_number = ?`
  ).run(orderNumber);

  const updated = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber) as Record<
    string,
    unknown
  >;
  res.json({
    order: {
      ...updated,
      is_b2b: Boolean(updated.is_b2b),
      items: JSON.parse(String(updated.items_json)),
    },
  });
});

app.get('/api/orders/lookup', (req, res) => {
  const orderNumber = String(req.query.orderNumber || '').trim();
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!orderNumber || !email) {
    res.status(400).json({ error: 'Provide both orderNumber and email' });
    return;
  }
  const row = db
    .prepare('SELECT * FROM orders WHERE LOWER(order_number) = LOWER(?) AND LOWER(customer_email) = ?')
    .get(orderNumber, email) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json({ error: 'No matching order found' });
    return;
  }
  res.json({
    order: {
      ...row,
      is_b2b: Boolean(row.is_b2b),
      items: JSON.parse(String(row.items_json)),
    },
  });
});

app.post('/api/b2b/inquiries', (req, res) => {
  const b = req.body || {};
  const companyName = String(b.companyName || '').trim();
  const contactName = String(b.contactName || '').trim();
  const email = String(b.email || '').trim();
  const phone = String(b.phone || '').trim();
  const regionCode = parseRegion(b.regionCode);
  const rawItems = Array.isArray(b.items) ? b.items : [];
  const computedQtyFromItems = rawItems.reduce(
    (sum: number, item: Record<string, unknown>) => sum + Math.max(0, Number(item?.totalPieces || 0)),
    0
  );
  const estimatedQty = Math.max(5, computedQtyFromItems || Number(b.estimatedQty || 20));
  const embroideryRequested = Boolean(b.embroideryRequested);
  const notes = String(b.notes || '').trim();

  if (!companyName || !contactName || !email) {
    res.status(400).json({ error: 'Company name, contact name, and email are required.' });
    return;
  }

  const info = db
    .prepare(
      `INSERT INTO b2b_inquiries (company_name, contact_name, email, phone, region_code, estimated_qty, embroidery_requested, notes, items_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      companyName,
      contactName,
      email,
      phone,
      regionCode,
      estimatedQty,
      embroideryRequested ? 1 : 0,
      notes,
      JSON.stringify(rawItems)
    );

  res.status(201).json({ id: Number(info.lastInsertRowid), status: 'new', estimatedQty });
});

app.post('/api/newsletter', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const regionCode = parseRegion(req.body?.regionCode);
  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }

  const promoRules = getPromoRules();
  const activeCode = (promoRules.discountCode || 'MONTE10').trim().toUpperCase();

  db.prepare(
    `INSERT INTO newsletter_subscribers (email, region_code, discount_code, status, mailchimp_status)
     VALUES (?, ?, ?, 'subscribed', 'pending_sync')
     ON CONFLICT(email) DO UPDATE SET region_code = excluded.region_code, discount_code = excluded.discount_code, status = 'subscribed'`
  ).run(email, regionCode, activeCode);

  const mcResult = await syncSubscriberToMailchimp({ email, regionCode });
  db.prepare(
    `UPDATE newsletter_subscribers
     SET mailchimp_status = ?, mailchimp_member_id = ?, synced_at = CASE WHEN ? = 'synced' THEN datetime('now') ELSE synced_at END
     WHERE email = ?`
  ).run(mcResult.status, mcResult.memberId, mcResult.status, email);

  const firstOrderEligible = !promoRules.firstOrderOnly || isCustomerFirstOrder(email);

  res.json({
    subscribed: true,
    discountCode: activeCode,
    discountPct: promoRules.discountPct,
    firstOrderOnly: promoRules.firstOrderOnly,
    firstOrderEligible,
    alreadyClaimedOrUsed: promoRules.firstOrderOnly && !firstOrderEligible,
    mailchimpStatus: mcResult.status,
  });
});

// ---------------------------------------------------------------------------
// AI SHOPPING CONCIERGE & AUTONOMOUS AGENT (GEMINI / OPENAI)
// ---------------------------------------------------------------------------

app.post('/api/ai/chat', async (req, res) => {
  const aiSettings = getAiSettingsInternal();
  if (!aiSettings.enabled) {
    res.status(403).json({ error: 'AI concierge & shopping agent is currently disabled by store administration.' });
    return;
  }

  const body = req.body || {};
  const regionCode = parseRegion(body.regionCode);
  const message = String(body.message || '').trim();
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
  const cartQty = Math.max(0, Math.floor(Number(body.cartQty || 0)));
  const cartSubtotal = Math.max(0, Number(body.cartSubtotal || 0));
  const firstOrderEligible = body.firstOrderEligible !== undefined ? Boolean(body.firstOrderEligible) : true;
  const activePromoCode = body.activePromoCode ? String(body.activePromoCode).trim() : '';
  const pendingOffer = body.pendingOffer && typeof body.pendingOffer === 'object' ? body.pendingOffer : null;
  const currentProductSlug = body.currentProductSlug ? String(body.currentProductSlug).trim() : null;

  if (!message) {
    res.status(400).json({ error: 'Please provide a message or shopping request.' });
    return;
  }

  const region = getRegionByCode(regionCode);
  const products = db
    .prepare(
      `SELECT p.id, p.sku, p.slug, p.category_slug, p.category_slugs_json, p.fabric_spec, p.preorder_allowed, p.primary_image, p.sizes_json,
              pl.title, pl.subtitle, pl.price, pl.stock_qty
       FROM products p
       JOIN product_localizations pl ON pl.product_id = p.id AND pl.region_code = ?
       WHERE p.active = 1
       ORDER BY p.is_featured DESC, p.id ASC`
    )
    .all(regionCode) as Array<Record<string, unknown>>;

  const promoRules = getPromoRules();
  const bulkRules = getBulkDiscountSettings();

  const agentProducts: AgentCatalogProduct[] = products.map((p) => {
    const categorySlugs = parseCategorySlugs(p.category_slug, p.category_slugs_json);
    return {
      id: Number(p.id),
      slug: String(p.slug),
      sku: String(p.sku),
      title: String(p.title),
      category_slug: categorySlugs[0] || String(p.category_slug),
      category_slugs: categorySlugs,
      fabric_spec: String(p.fabric_spec),
      price: Number(p.price),
      primary_image: String(p.primary_image),
      stock_qty: Number(p.stock_qty),
      preorder_allowed: Boolean(p.preorder_allowed),
      sizes: JSON.parse(String(p.sizes_json || '[]')) as string[],
    };
  });

  const catalogDigest = agentProducts.map((p) => ({
    slug: p.slug,
    sku: p.sku,
    title: p.title,
    categories: p.category_slugs || [p.category_slug],
    fabric: p.fabric_spec,
    price: p.price,
    currency: region?.currency_code || 'USD',
    stock: p.stock_qty,
    preorder: p.preorder_allowed,
    sizes: p.sizes,
  }));

  const openaiKey = (aiSettings.openaiApiKey || getResolvedSecret('OPENAI_API_KEY') || '').trim();
  const geminiKey = (aiSettings.geminiApiKey || getResolvedSecret('GEMINI_API_KEY') || '').trim();
  const hasProviderKey = aiSettings.activeProvider === 'openai' ? Boolean(openaiKey) : Boolean(geminiKey);

  const mapRecommendedProducts = (slugs: string[]) => {
    const slugSet = new Set(slugs.map((s) => String(s).trim()));
    return agentProducts
      .filter((p) => slugSet.has(p.slug))
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        sku: p.sku,
        title: p.title,
        price: p.price,
        primary_image: p.primary_image,
        stock_qty: p.stock_qty,
        preorder_allowed: p.preorder_allowed,
        sizes: p.sizes,
      }));
  };

  if (!hasProviderKey) {
    const decision = evaluateStorefrontAgentTurn({
      message,
      regionCode,
      products: agentProducts,
      cartQty,
      cartSubtotal,
      firstOrderEligible,
      activePromoCode,
      promoRules,
      bulkRules,
      pendingOffer,
      currentProductSlug,
    });
    res.json({
      provider: 'storefront_router',
      reply: decision.reply,
      recommendedProducts: mapRecommendedProducts(decision.recommendedSlugs),
      agentAction: decision.agentAction,
      pendingOffer: decision.pendingOffer,
      suggestedReplies: decision.suggestedReplies,
    });
    return;
  }

  const languageName =
    regionCode === 'no' ? 'Norwegian' : regionCode === 'it' ? 'Italian' : regionCode === 'vn' ? 'Vietnamese' : 'English';

  const systemInstruction = `You are the warm, knowledgeable Italian shirt tailor & personal shopping agent for MONTE NAPOLEONE 1974 (founded in Treviso, Italy in 1974, Nordic showroom at Gulbrandsens Agencies AS, Maridalsveien 87, 0461 Oslo, Norway).
Respond naturally like a human atelier tailor in ${languageName}.
Active storefront region: ${region?.name || 'International'} (${region?.currency_code || 'USD'}, ${region?.warehouse_name || 'Treviso Hub'}).
Live shopper bag state: ${cartQty} item(s), subtotal ${cartSubtotal} ${region?.currency_code || 'USD'}, active promo: ${activePromoCode || 'none'}, first-order eligible: ${firstOrderEligible ? 'yes' : 'no'}.
Pending proposal from previous turn: ${pendingOffer ? JSON.stringify(pendingOffer) : 'none'}.
Currently viewed product slug: ${currentProductSlug || 'none'}.
Free shirt length & sleeve tailoring on every shirt; waist/chest/hem/shoulder alterations cost a small optional fee.
First-order promo code: ${promoRules.popupEnabled ? `${promoRules.discountCode} (${promoRules.discountPct}% off${promoRules.firstOrderOnly ? ', first order only' : ''})` : 'currently disabled'}.
Bulk discounts: ${bulkRules.enabled ? bulkRules.tiers.map((t) => `${t.minQty}+ shirts = ${t.discountPct}% off`).join(', ') : 'currently disabled'}.
B2B corporate uniforms minimum: 20 pieces per color.
Available live regional catalog:
${JSON.stringify(catalogDigest)}

Interactive Shopping Agent Rules:
1. When recommending a product, end with a friendly prompt like "Do you like this? Say 'yes' and I'll add it to your bag" and set pendingOffer={kind:"product", productSlug, size, fit}.
2. When pendingOffer is active and the user confirms ("yes", "ja", "sì", "có", "add it", etc.):
   - If pendingOffer.kind === "product": emit agentAction={type:"add_to_cart", productSlug, size, fit}, and offer applicable first-order discount (${promoRules.discountCode}) or bulk savings, asking to apply & proceed to checkout (set pendingOffer={kind:"discount", couponCode} or {kind:"checkout"}).
   - If pendingOffer.kind === "discount": emit agentAction={type:"apply_coupon", couponCode} and set pendingOffer={kind:"checkout"} or tell them they're ready for checkout.
   - If pendingOffer.kind === "checkout": emit agentAction={type:"open_checkout"}.
3. When the user wants to browse a section/page, use agentAction types: "open_category", "open_product", "open_b2b", "open_about", "open_checkout", "switch_region", "apply_coupon", or "add_to_cart".

Return ONLY valid JSON with:
- "reply": friendly, concise conversational answer (no markdown headings)
- "recommendedSlugs": array of up to 3 matching product "slug" values from the catalog above (only real slugs!)
- "agentAction": optional object with "type" in ["add_to_cart", "open_product", "switch_region", "apply_coupon", "open_category", "open_about", "open_b2b", "open_checkout"], plus optional "productSlug", "size", "fit", "categorySlug", "regionCode", "couponCode".
- "pendingOffer": optional object { "kind": "product" | "discount" | "checkout", "productSlug"?: string, "size"?: string, "fit"?: string, "couponCode"?: string }
- "suggestedReplies": array of 1 to 3 short quick-reply button labels for the shopper.`;

  const conversationLines = history
    .map((m: Record<string, unknown>) => `${m.role === 'user' ? 'Shopper' : 'Tailor'}: ${String(m.content || '')}`)
    .join('\n');
  const fullUserPrompt = conversationLines ? `${conversationLines}\nShopper: ${message}` : message;

  try {
    let parsed: {
      reply?: string;
      recommendedSlugs?: string[];
      agentAction?: AiAgentAction | null;
      pendingOffer?: Record<string, unknown> | null;
      suggestedReplies?: string[];
    } = {};

    if (aiSettings.activeProvider === 'openai') {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: aiSettings.openaiModel || 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: fullUserPrompt },
          ],
        }),
      });

      const openaiData = (await openaiRes.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      };
      if (!openaiRes.ok) {
        res.status(502).json({
          error: openaiData.error?.message || `OpenAI API returned HTTP ${openaiRes.status}`,
        });
        return;
      }

      const rawText = openaiData.choices?.[0]?.message?.content || '{}';
      parsed = JSON.parse(rawText);
    } else {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        apiVersion: 'v1beta',
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const primaryModel = aiSettings.geminiModel || 'gemini-4-hydrogen';
      const invokeGemini = (modelName: string) =>
        ai.models.generateContent({
          model: modelName,
          contents: fullUserPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: { type: Type.STRING },
                recommendedSlugs: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                agentAction: {
                  type: Type.OBJECT,
                  nullable: true,
                  properties: {
                    type: { type: Type.STRING },
                    productSlug: { type: Type.STRING, nullable: true },
                    size: { type: Type.STRING, nullable: true },
                    fit: { type: Type.STRING, nullable: true },
                    categorySlug: { type: Type.STRING, nullable: true },
                    regionCode: { type: Type.STRING, nullable: true },
                    couponCode: { type: Type.STRING, nullable: true },
                  },
                },
                pendingOffer: {
                  type: Type.OBJECT,
                  nullable: true,
                  properties: {
                    kind: { type: Type.STRING },
                    productSlug: { type: Type.STRING, nullable: true },
                    size: { type: Type.STRING, nullable: true },
                    fit: { type: Type.STRING, nullable: true },
                    couponCode: { type: Type.STRING, nullable: true },
                  },
                },
                suggestedReplies: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['reply', 'recommendedSlugs'],
            },
          },
        });

      let response;
      try {
        response = await invokeGemini(primaryModel);
      } catch (primaryErr) {
        const msg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
        const isTransient = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand');
        if (isTransient && primaryModel !== 'gemini-3.1-flash-lite') {
          response = await invokeGemini('gemini-3.1-flash-lite');
        } else {
          throw primaryErr;
        }
      }

      const rawText = response.text || '{}';
      parsed = JSON.parse(rawText);
    }

    const recommendedProducts = mapRecommendedProducts(
      Array.isArray(parsed.recommendedSlugs) ? parsed.recommendedSlugs : []
    );

    const fallbackSlug =
      String(
        parsed.agentAction?.productSlug ||
          pendingOffer?.productSlug ||
          parsed.pendingOffer?.productSlug ||
          recommendedProducts[0]?.slug ||
          currentProductSlug ||
          ''
      ).trim() || undefined;

    let normalizedAction: AiAgentAction | null = parsed.agentAction ? { ...parsed.agentAction } : null;
    if (normalizedAction) {
      if (normalizedAction.type === 'add_to_cart') {
        if (!normalizedAction.productSlug && fallbackSlug) {
          normalizedAction.productSlug = fallbackSlug;
        }
        if (!normalizedAction.size && (pendingOffer?.size || parsed.pendingOffer?.size)) {
          normalizedAction.size = String(pendingOffer?.size || parsed.pendingOffer?.size);
        }
        if (!normalizedAction.fit && (pendingOffer?.fit || parsed.pendingOffer?.fit)) {
          const rawFit = String(pendingOffer?.fit || parsed.pendingOffer?.fit);
          if (rawFit === 'Regular Fit' || rawFit === 'Slim Fit' || rawFit === 'Contemporary Fit') {
            normalizedAction.fit = rawFit;
          }
        }
      } else if (normalizedAction.type === 'open_product') {
        if (!normalizedAction.productSlug && fallbackSlug) {
          normalizedAction.productSlug = fallbackSlug;
        }
      } else if (normalizedAction.type === 'apply_coupon') {
        if (!normalizedAction.couponCode) {
          normalizedAction.couponCode = String(
            pendingOffer?.couponCode || parsed.pendingOffer?.couponCode || promoRules.discountCode || 'MONTE10'
          )
            .trim()
            .toUpperCase();
        }
      }
    }

    const normalizedPendingOffer = parsed.pendingOffer ? { ...parsed.pendingOffer } : null;
    if (normalizedPendingOffer?.kind === 'product' && !normalizedPendingOffer.productSlug && fallbackSlug) {
      normalizedPendingOffer.productSlug = fallbackSlug;
    }
    if (normalizedPendingOffer?.kind === 'discount' && !normalizedPendingOffer.couponCode) {
      normalizedPendingOffer.couponCode = (promoRules.discountCode || 'MONTE10').trim().toUpperCase();
    }

    res.json({
      provider: aiSettings.activeProvider,
      reply: String(parsed.reply || ''),
      recommendedProducts,
      agentAction: normalizedAction,
      pendingOffer: normalizedPendingOffer,
      suggestedReplies: Array.isArray(parsed.suggestedReplies) ? parsed.suggestedReplies.slice(0, 3) : [],
    });
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'AI provider request failed.',
    });
  }
});

// Human Voice Text-to-Speech via Gemini TTS (returns complete audio/wav)
app.post('/api/ai/tts', async (req, res) => {
  const aiSettings = getAiSettingsInternal();
  if (!aiSettings.enabled) {
    res.status(403).json({ error: 'AI concierge is disabled.' });
    return;
  }

  const body = req.body || {};
  const text = String(body.text || '').trim().slice(0, 1400);
  const regionCode = parseRegion(body.regionCode);
  if (!text) {
    res.status(400).json({ error: 'Text is required for voice synthesis.' });
    return;
  }

  const geminiKey = (aiSettings.geminiApiKey || getResolvedSecret('GEMINI_API_KEY') || '').trim();
  if (!geminiKey) {
    res.json({
      audioBase64: null,
      mimeType: null,
      fallbackBrowserSpeech: true,
    });
    return;
  }

  const voiceStyle =
    regionCode === 'no'
      ? 'Warm, calm luxury Norwegian-speaking menswear tailor in Oslo speaking naturally and reassuringly'
      : regionCode === 'it'
      ? 'Warm, refined Italian master shirtmaker in Treviso speaking naturally with understated elegance'
      : regionCode === 'vn'
      ? 'Warm, courteous Vietnamese bespoke tailor speaking clearly, politely, and naturally'
      : 'Warm, articulate Italian master shirt tailor speaking conversational English naturally like an in-atelier stylist';

  try {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      apiVersion: 'v1beta',
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text,
              speechMetadata: {
                style: voiceStyle,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Charon' },
          },
        },
      },
    });

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioBase64) {
      res.status(502).json({ error: 'Voice synthesis returned empty audio.' });
      return;
    }

    res.json({
      audioBase64,
      mimeType: 'audio/wav',
      fallbackBrowserSpeech: false,
    });
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Gemini voice synthesis failed.',
    });
  }
});

// Speech-to-Text Transcription via Gemini Audio Transcription
app.post('/api/ai/transcribe', async (req, res) => {
  const aiSettings = getAiSettingsInternal();
  if (!aiSettings.enabled) {
    res.status(403).json({ error: 'AI concierge is disabled.' });
    return;
  }

  const body = req.body || {};
  const audioBase64 = String(body.audioBase64 || '').trim();
  const mimeType = String(body.mimeType || 'audio/webm').trim();
  const regionCode = parseRegion(body.regionCode);

  if (!audioBase64) {
    res.status(400).json({ error: 'Audio recording payload is required.' });
    return;
  }

  const geminiKey = (aiSettings.geminiApiKey || getResolvedSecret('GEMINI_API_KEY') || '').trim();
  if (!geminiKey) {
    res.status(503).json({
      error: 'Gemini API key is not configured for server audio transcription.',
      noGeminiKey: true,
    });
    return;
  }

  const languageHint =
    regionCode === 'no' ? 'Norwegian' : regionCode === 'it' ? 'Italian' : regionCode === 'vn' ? 'Vietnamese' : 'English';

  try {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      apiVersion: 'v1beta',
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: audioBase64,
            },
          },
          {
            text: `Transcribe the spoken shopper message accurately (primary storefront language hint: ${languageHint}). Return ONLY the plain spoken transcript without quotes or commentary.`,
          },
        ],
      },
    });

    res.json({
      transcript: String(response.text || '').trim(),
    });
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Speech transcription failed.',
    });
  }
});

// ---------------------------------------------------------------------------
// AUTH & FIRST-RUN OWNER CLAIM ROUTES
// ---------------------------------------------------------------------------

app.get('/api/auth/status', (req, res) => {
  const ownerRow = db.prepare(`SELECT id FROM users WHERE role = 'owner' AND active = 1 LIMIT 1`).get();
  const hasEnvPasscode = Boolean(process.env.ADMIN_PASSCODE?.trim());
  const token = extractBearerToken(req);
  const user = getUserByToken(token);

  res.json({
    needsOwnerClaim: !ownerRow && !hasEnvPasscode,
    hasEnvPasscode,
    user,
  });
});

app.post('/api/auth/claim-owner', (req, res) => {
  const existingOwner = db.prepare(`SELECT id FROM users WHERE role = 'owner' LIMIT 1`).get();
  if (existingOwner || process.env.ADMIN_PASSCODE?.trim()) {
    res.status(409).json({ error: 'Owner account is already configured.' });
    return;
  }

  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!name || !email || !email.includes('@') || password.length < 6) {
    res.status(400).json({ error: 'Provide owner name, valid email, and password (min 6 chars).' });
    return;
  }

  const hash = hashPassword(password);
  const info = db
    .prepare(
      `INSERT INTO users (email, name, password_hash, role, permissions_json, assigned_regions_json, active)
       VALUES (?, ?, ?, 'owner', ?, ?, 1)`
    )
    .run(email, name, hash, JSON.stringify(OWNER_PERMISSIONS), JSON.stringify(['en', 'no', 'it', 'vn']));

  const userId = Number(info.lastInsertRowid);
  const token = createSession(userId);
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Parameters<typeof mapUserRow>[0];
  const user = mapUserRow(userRow);
  logAudit(user, 'OWNER_CLAIMED', 'system', 'Initial owner account claimed');

  res.status(201).json({ token, user });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!password) {
    res.status(400).json({ error: 'Password is required.' });
    return;
  }

  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  if (envPasscode && password === envPasscode) {
    let ownerRow = db.prepare(`SELECT * FROM users WHERE role = 'owner' LIMIT 1`).get() as
      | Parameters<typeof mapUserRow>[0]
      | undefined;
    if (!ownerRow) {
      const ownerEmail = email || 'owner@montenapoleone1974.com';
      const hash = hashPassword(envPasscode);
      const info = db
        .prepare(
          `INSERT INTO users (email, name, password_hash, role, permissions_json, assigned_regions_json, active)
           VALUES (?, 'Owner', ?, 'owner', ?, ?, 1)`
        )
        .run(ownerEmail, hash, JSON.stringify(OWNER_PERMISSIONS), JSON.stringify(['en', 'no', 'it', 'vn']));
      ownerRow = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid) as Parameters<
        typeof mapUserRow
      >[0];
    }
    const token = createSession(ownerRow.id);
    res.json({ token, user: mapUserRow(ownerRow) });
    return;
  }

  if (!email) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const row = db.prepare('SELECT * FROM users WHERE LOWER(email) = ? AND active = 1').get(email) as
    | Parameters<typeof mapUserRow>[0]
    | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = createSession(row.id);
  res.json({ token, user: mapUserRow(row) });
});

app.post('/api/auth/register', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const regionCode = parseRegion(req.body?.regionCode);
  const subscribeRequested = req.body?.subscribeNewsletter !== false;

  if (!name || !email || !email.includes('@') || password.length < 6) {
    res.status(400).json({ error: 'Provide name, valid email, and password (min 6 chars).' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const hash = hashPassword(password);
  const info = db
    .prepare(
      `INSERT INTO users (email, name, password_hash, role, permissions_json, assigned_regions_json, active)
       VALUES (?, ?, ?, 'customer', '{}', '["en","no","it","vn"]', 1)`
    )
    .run(email, name, hash);

  const userId = Number(info.lastInsertRowid);
  const token = createSession(userId);
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Parameters<typeof mapUserRow>[0];

  let mailchimpStatus: string | null = null;
  let discountCode: string | null = null;
  const authSettings = getCustomerAuthSettings();
  if (authSettings.autoSubscribeMailchimp && subscribeRequested) {
    const promoRules = getPromoRules();
    const activeCode = (promoRules.discountCode || 'MONTE10').trim().toUpperCase();
    db.prepare(
      `INSERT INTO newsletter_subscribers (email, region_code, discount_code, status, mailchimp_status)
       VALUES (?, ?, ?, 'subscribed', 'pending_sync')
       ON CONFLICT(email) DO UPDATE SET region_code = excluded.region_code, status = 'subscribed'`
    ).run(email, regionCode, activeCode);
    const mcResult = await syncSubscriberToMailchimp({ email, regionCode });
    db.prepare(
      `UPDATE newsletter_subscribers
       SET mailchimp_status = ?, mailchimp_member_id = ?, synced_at = CASE WHEN ? = 'synced' THEN datetime('now') ELSE synced_at END
       WHERE email = ?`
    ).run(mcResult.status, mcResult.memberId, mcResult.status, email);
    mailchimpStatus = mcResult.status;
    discountCode = activeCode;
  }

  res.status(201).json({
    token,
    user: mapUserRow(userRow),
    mailchimpStatus,
    discountCode,
  });
});

app.get('/api/auth/google/url', (req, res) => {
  const settings = getCustomerAuthSettings();
  const origin = resolveRequestOrigin(req);
  const redirectUri = `${origin}/api/auth/google/callback`;
  if (!settings.googleLoginEnabled) {
    res.status(403).json({ error: 'Customer Gmail login is currently disabled in Store Settings.', callbackUrl: redirectUri });
    return;
  }
  const regionCode = parseRegion(req.query.region);
  const subscribeNewsletter = req.query.subscribe !== '0';
  const state = crypto.randomBytes(20).toString('hex');
  googleOauthStates.set(state, {
    regionCode,
    subscribeNewsletter,
    redirectUri,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  const built = buildGoogleAuthorizeUrl(redirectUri, state);
  if (!built.url) {
    googleOauthStates.delete(state);
    res.status(400).json({ error: built.error || 'Google OAuth keys missing.', callbackUrl: redirectUri });
    return;
  }
  res.json({ url: built.url, callbackUrl: redirectUri });
});

app.get(['/api/auth/google/callback', '/api/auth/google/callback/'], async (req, res) => {
  const renderPopupError = (message: string) => {
    const safePayload = JSON.stringify({ type: 'MN_GOOGLE_AUTH_ERROR', error: message }).replace(/</g, '\\u003c');
    res
      .status(400)
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .send(
        `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;padding:36px;background:#F7F7F7;color:#1A1A1A;">
          <div style="max-width:440px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:24px;">
            <h1 style="font-size:15px;margin:0 0 8px;text-transform:uppercase;color:#142B4E;">Gmail Sign-In</h1>
            <p style="font-size:13px;line-height:1.6;">${escapeHtmlAttr(message)}</p>
          </div>
          <script>
            try { if (window.opener) window.opener.postMessage(${safePayload}, '*'); } catch (e) {}
          </script>
        </body></html>`
      );
  };

  const oauthError = String(req.query.error || '').trim();
  if (oauthError) {
    renderPopupError(`Google authentication cancelled (${oauthError}).`);
    return;
  }

  const code = String(req.query.code || '').trim();
  const state = String(req.query.state || '').trim();
  const stateEntry = googleOauthStates.get(state);
  if (!state || !stateEntry || stateEntry.expiresAt < Date.now()) {
    renderPopupError('OAuth session expired or invalid CSRF state. Please try signing in again.');
    return;
  }
  googleOauthStates.delete(state);
  if (!code) {
    renderPopupError('Missing Google authorization code.');
    return;
  }

  const profile = await exchangeGoogleOAuthCode(code, stateEntry.redirectUri);
  if (!profile.ok || !profile.email) {
    renderPopupError(profile.error || 'Could not authenticate Gmail account.');
    return;
  }

  let userRow = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(profile.email) as
    | (Parameters<typeof mapUserRow>[0] & { active: number })
    | undefined;

  if (!userRow) {
    const randomHash = hashPassword(crypto.randomBytes(24).toString('hex'));
    const ins = db
      .prepare(
        `INSERT INTO users (email, name, password_hash, role, permissions_json, assigned_regions_json, active)
         VALUES (?, ?, ?, 'customer', '{}', '["en","no","it","vn"]', 1)`
      )
      .run(profile.email, profile.name || profile.email, randomHash);
    userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(ins.lastInsertRowid) as
      | (Parameters<typeof mapUserRow>[0] & { active: number })
      | undefined;
  } else if (!userRow.active) {
    renderPopupError('This account is suspended.');
    return;
  }

  if (!userRow) {
    renderPopupError('Failed to create customer session.');
    return;
  }

  const token = createSession(userRow.id);
  const authUser = mapUserRow(userRow);

  let mailchimpStatus: string | null = null;
  let discountCode: string | null = null;
  const authSettings = getCustomerAuthSettings();
  if (authSettings.autoSubscribeMailchimp && stateEntry.subscribeNewsletter) {
    const promoRules = getPromoRules();
    const activeCode = (promoRules.discountCode || 'MONTE10').trim().toUpperCase();
    db.prepare(
      `INSERT INTO newsletter_subscribers (email, region_code, discount_code, status, mailchimp_status)
       VALUES (?, ?, ?, 'subscribed', 'pending_sync')
       ON CONFLICT(email) DO UPDATE SET region_code = excluded.region_code, status = 'subscribed'`
    ).run(profile.email, stateEntry.regionCode, activeCode);
    const mcResult = await syncSubscriberToMailchimp({
      email: profile.email,
      regionCode: stateEntry.regionCode,
    });
    db.prepare(
      `UPDATE newsletter_subscribers
       SET mailchimp_status = ?, mailchimp_member_id = ?, synced_at = CASE WHEN ? = 'synced' THEN datetime('now') ELSE synced_at END
       WHERE email = ?`
    ).run(mcResult.status, mcResult.memberId, mcResult.status, profile.email);
    mailchimpStatus = mcResult.status;
    discountCode = activeCode;
  }

  const safePayload = JSON.stringify({
    type: 'MN_GOOGLE_AUTH_SUCCESS',
    token,
    user: authUser,
    mailchimpStatus,
    discountCode,
  }).replace(/</g, '\\u003c');

  res
    .status(200)
    .setHeader('Content-Type', 'text/html; charset=utf-8')
    .send(
      `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;padding:40px;background:#F7F7F7;color:#1A1A1A;text-align:center;">
        <div style="max-width:420px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:28px;">
          <h1 style="font-size:15px;margin:0 0 8px;text-transform:uppercase;color:#142B4E;">Monte Napoleone 1974</h1>
          <p style="font-size:13px;line-height:1.6;">Signed in as ${escapeHtmlAttr(authUser.email)}. Closing window...</p>
        </div>
        <script>
          (function() {
            var payload = ${safePayload};
            if (window.opener) {
              window.opener.postMessage(payload, '*');
              window.close();
            } else {
              window.location.href = '/en/account';
            }
          })();
        </script>
      </body></html>`
    );
});

app.get('/api/account/orders', requireAuth, (req: AuthedRequest, res) => {
  const email = String(req.authUser?.email || '').trim().toLowerCase();
  if (!email) {
    res.json({ orders: [] });
    return;
  }
  const rows = db
    .prepare('SELECT * FROM orders WHERE LOWER(customer_email) = ? ORDER BY id DESC LIMIT 30')
    .all(email) as Array<Record<string, unknown>>;
  const reviewedRows = db
    .prepare('SELECT product_id FROM product_reviews WHERE LOWER(customer_email) = ?')
    .all(email) as Array<{ product_id: number }>;
  const reviewedProdSet = new Set<number>(reviewedRows.map((r) => Number(r.product_id)));
  const origin = resolveRequestOrigin(req);

  res.json({
    orders: rows.map((r) => {
      const items = JSON.parse(String(r.items_json || '[]')) as Array<{
        productId: number;
        sku?: string;
        title?: string;
        image?: string;
      }>;
      const rc = parseRegion(r.region_code);
      const invites = createOrGetReviewInvitesForOrder({
        orderNumber: String(r.order_number),
        regionCode: rc,
        customerEmail: email,
        customerName: String(r.customer_name || req.authUser?.name || ''),
        items,
        origin,
      }).map((inv) => ({
        ...inv,
        alreadyReviewed: reviewedProdSet.has(inv.productId),
      }));
      return {
        ...r,
        is_b2b: Boolean(r.is_b2b),
        items,
        reviewInvites: invites,
      };
    }),
  });
});

app.post('/api/auth/logout', (req, res) => {
  const token = extractBearerToken(req);
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// PROTECTED STAFF & OWNER ADMIN ROUTES
// ---------------------------------------------------------------------------

app.get('/api/admin/overview', requireStaffOrOwner, (_req, res) => {
  const regionStats = db
    .prepare(
      `SELECT r.code AS region_code, r.currency_code, COUNT(o.id) AS order_count,
              COALESCE(SUM(CASE WHEN o.order_status != 'cancelled' THEN o.total ELSE 0 END), 0) AS revenue
       FROM regions r
       LEFT JOIN orders o ON o.region_code = r.code
       GROUP BY r.code, r.currency_code
       ORDER BY CASE r.code WHEN 'en' THEN 1 WHEN 'no' THEN 2 WHEN 'it' THEN 3 ELSE 4 END`
    )
    .all();

  const lowStock = db
    .prepare(
      `SELECT p.sku, pl.title, pl.region_code, pl.stock_qty, pl.warehouse_location
       FROM product_localizations pl
       JOIN products p ON p.id = pl.product_id
       WHERE pl.stock_qty <= 5 AND p.active = 1
       ORDER BY pl.stock_qty ASC LIMIT 12`
    )
    .all();

  const totalProducts = (db.prepare('SELECT COUNT(*) AS c FROM products WHERE active = 1').get() as { c: number }).c;
  const totalOrders = (db.prepare('SELECT COUNT(*) AS c FROM orders').get() as { c: number }).c;
  const totalMedia = (db.prepare('SELECT COUNT(*) AS c FROM media').get() as { c: number }).c;
  const pendingB2B = (db.prepare(`SELECT COUNT(*) AS c FROM b2b_inquiries WHERE status = 'new'`).get() as { c: number }).c;
  const activeVisitorsCount = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM visitor_sessions WHERE datetime(last_seen_at) >= datetime('now', '-10 minutes')`
      )
      .get() as { c: number }
  ).c;

  const toUsdRate: Record<RegionCode, number> = {
    en: 1,
    no: 0.095,
    it: 1.09,
    vn: 0.00004,
  };

  const allOrders = db
    .prepare(`SELECT region_code, total, is_b2b, order_status, created_at FROM orders WHERE order_status != 'cancelled'`)
    .all() as Array<{ region_code: string; total: number; is_b2b: number; order_status: string; created_at: string }>;

  let totalRevenueUsdEquiv = 0;
  const dailyMap = new Map<string, { date: string; orders: number; revenue_usd_equiv: number; b2c_orders: number; b2b_orders: number }>();

  for (const o of allOrders) {
    const rc = parseRegion(o.region_code);
    const usd = Math.round(Number(o.total || 0) * toUsdRate[rc]);
    totalRevenueUsdEquiv += usd;
    const dateKey = String(o.created_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
    const entry = dailyMap.get(dateKey) || {
      date: dateKey,
      orders: 0,
      revenue_usd_equiv: 0,
      b2c_orders: 0,
      b2b_orders: 0,
    };
    entry.orders++;
    entry.revenue_usd_equiv += usd;
    if (o.is_b2b) entry.b2b_orders++;
    else entry.b2c_orders++;
    dailyMap.set(dateKey, entry);
  }

  const dailySeries = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const recentAudit = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 12').all();

  res.json({
    summary: {
      totalProducts,
      totalOrders,
      totalMedia,
      pendingB2B,
      activeVisitorsCount,
      totalRevenueUsdEquiv,
    },
    regionStats,
    dailySeries,
    lowStock,
    recentAudit,
  });
});

app.get('/api/admin/products', requireStaffOrOwner, (_req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY id DESC').all() as Array<Record<string, unknown>>;
  const locs = db.prepare('SELECT * FROM product_localizations').all() as Array<Record<string, unknown>>;

  const byProduct = new Map<number, Record<string, unknown>>();
  for (const loc of locs) {
    const pid = Number(loc.product_id);
    const map = byProduct.get(pid) || {};
    map[String(loc.region_code)] = loc;
    byProduct.set(pid, map);
  }

  res.json({
    products: products.map((p) => {
      const categorySlugs = parseCategorySlugs(p.category_slug, p.category_slugs_json);
      return {
        ...p,
        category_slug: categorySlugs[0] || String(p.category_slug),
        category_slugs: categorySlugs,
        is_featured: Boolean(p.is_featured),
        is_b2b_eligible: Boolean(p.is_b2b_eligible),
        is_outlet: Boolean(p.is_outlet),
        preorder_allowed: Boolean(p.preorder_allowed),
        active: Boolean(p.active),
        gallery: JSON.parse(String(p.gallery_json)),
        collars: JSON.parse(String(p.collars_json)),
        cuffs: JSON.parse(String(p.cuffs_json)),
        sizes: JSON.parse(String(p.sizes_json)),
        localizations: byProduct.get(Number(p.id)) || {},
      };
    }),
  });
});

app.post('/api/admin/products', requirePermission('manage_products'), (req: AuthedRequest, res) => {
  const b = req.body || {};
  const sku = String(b.sku || '').trim();
  const slug = String(b.slug || sku.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
  const categorySlugs = parseCategorySlugs(b.category_slug, b.category_slugs);
  const categorySlug = categorySlugs[0] || 'business';
  const fabricSpec = String(b.fabric_spec || '100% Italian Cotton');
  const primaryImage = String(b.primary_image || '/src/assets/images/shirt_white_signature_1795248293653.jpg');
  const secondaryImage = String(b.secondary_image || primaryImage);

  if (!sku || !slug) {
    res.status(400).json({ error: 'SKU and slug are required.' });
    return;
  }

  try {
    const tx = db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO products (
            sku, slug, category_slug, category_slugs_json, fabric_spec, is_featured, is_b2b_eligible, is_outlet,
            preorder_allowed, primary_image, secondary_image, gallery_json, collars_json, cuffs_json, sizes_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          sku,
          slug,
          categorySlug,
          JSON.stringify(categorySlugs),
          fabricSpec,
          b.is_featured ? 1 : 0,
          b.is_b2b_eligible ? 1 : 0,
          b.is_outlet ? 1 : 0,
          b.preorder_allowed ? 1 : 0,
          primaryImage,
          secondaryImage,
          JSON.stringify([primaryImage, secondaryImage]),
          JSON.stringify(['Spread', 'Semi Spread', 'Button Down', 'Cutaway']),
          JSON.stringify(['Angle', 'Modern', 'Rounded', 'Single French']),
          JSON.stringify(['37 / XS', '38 / S', '39 / M', '40 / M', '41 / L', '42 / L', '43 / XL', '44 / XXL'])
        );

      const productId = Number(info.lastInsertRowid);
      const locs = b.localizations || {};
      const insertLoc = db.prepare(
        `INSERT INTO product_localizations (
          product_id, region_code, title, subtitle, description, price, compare_at_price,
          stock_qty, warehouse_location, delivery_note, seo_title, seo_description, seo_keywords
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      for (const rc of ['en', 'no', 'it', 'vn'] as const) {
        const l = locs[rc] || {};
        insertLoc.run(
          productId,
          rc,
          String(l.title || `${sku} (${rc.toUpperCase()})`),
          String(l.subtitle || fabricSpec),
          String(l.description || 'Tailored Italian shirting from Treviso.'),
          Number(l.price || (rc === 'vn' ? 3990000 : rc === 'no' ? 1499 : 165)),
          l.compare_at_price ? Number(l.compare_at_price) : null,
          Math.max(0, Number(l.stock_qty ?? 10)),
          String(l.warehouse_location || rc.toUpperCase()),
          String(l.delivery_note || 'Ships via DHL Express'),
          String(l.seo_title || ''),
          String(l.seo_description || ''),
          String(l.seo_keywords || '')
        );
      }
      return productId;
    });

    const id = tx();
    if (req.authUser) {
      logAudit(req.authUser, 'PRODUCT_CREATED', sku, `Created product #${id} (${categorySlugs.join(', ')})`);
    }
    res.status(201).json({ id });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create product' });
  }
});

app.put('/api/admin/products/:id', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const productId = Number(req.params.id);
  const user = req.authUser!;
  if (!user.permissions.manage_products && !user.permissions.manage_pricing && !user.permissions.manage_inventory && user.role !== 'owner') {
    res.status(403).json({ error: 'Insufficient permissions to update product' });
    return;
  }

  const b = req.body || {};
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const tx = db.transaction(() => {
    if (user.role === 'owner' || user.permissions.manage_products) {
      const nextCatSlugs =
        Array.isArray(b.category_slugs) && b.category_slugs.length > 0
          ? parseCategorySlugs(b.category_slug || b.category_slugs[0], b.category_slugs)
          : parseCategorySlugs(b.category_slug || existing.category_slug, existing.category_slugs_json);
      const nextPrimaryCat = nextCatSlugs[0] || String(existing.category_slug);

      db.prepare(
        `UPDATE products SET category_slug = ?, category_slugs_json = ?, fabric_spec = ?, is_featured = ?, is_b2b_eligible = ?,
         is_outlet = ?, preorder_allowed = ?, primary_image = ?, secondary_image = ?, gallery_json = ?
         WHERE id = ?`
      ).run(
        nextPrimaryCat,
        JSON.stringify(nextCatSlugs),
        String(b.fabric_spec || existing.fabric_spec),
        b.is_featured !== undefined ? (b.is_featured ? 1 : 0) : Number(existing.is_featured),
        b.is_b2b_eligible !== undefined ? (b.is_b2b_eligible ? 1 : 0) : Number(existing.is_b2b_eligible),
        b.is_outlet !== undefined ? (b.is_outlet ? 1 : 0) : Number(existing.is_outlet),
        b.preorder_allowed !== undefined ? (b.preorder_allowed ? 1 : 0) : Number(existing.preorder_allowed),
        String(b.primary_image || existing.primary_image),
        String(b.secondary_image || existing.secondary_image),
        Array.isArray(b.gallery) && b.gallery.length > 0
          ? JSON.stringify(b.gallery)
          : String(existing.gallery_json),
        productId
      );
    }

    const locs = b.localizations || {};
    for (const rc of ['en', 'no', 'it', 'vn'] as const) {
      if (!locs[rc]) continue;
      const cur = db
        .prepare('SELECT * FROM product_localizations WHERE product_id = ? AND region_code = ?')
        .get(productId, rc) as Record<string, unknown> | undefined;
      if (!cur) continue;
      const canEditContent = user.role === 'owner' || user.permissions.manage_products;
      const nextTitle = canEditContent ? String(locs[rc].title ?? cur.title) : String(cur.title);
      const nextDesc = canEditContent ? String(locs[rc].description ?? cur.description) : String(cur.description);
      const nextSeoTitle = canEditContent ? String(locs[rc].seo_title ?? cur.seo_title ?? '') : String(cur.seo_title ?? '');
      const nextSeoDesc = canEditContent
        ? String(locs[rc].seo_description ?? cur.seo_description ?? '')
        : String(cur.seo_description ?? '');
      const nextSeoKeywords = canEditContent
        ? String(locs[rc].seo_keywords ?? cur.seo_keywords ?? '')
        : String(cur.seo_keywords ?? '');
      const nextPrice =
        user.role === 'owner' || user.permissions.manage_pricing ? Number(locs[rc].price ?? cur.price) : Number(cur.price);
      const nextStock =
        user.role === 'owner' || user.permissions.manage_inventory
          ? Math.max(0, Number(locs[rc].stock_qty ?? cur.stock_qty))
          : Number(cur.stock_qty);

      db.prepare(
        `UPDATE product_localizations
         SET title = ?, description = ?, seo_title = ?, seo_description = ?, seo_keywords = ?, price = ?, stock_qty = ?
         WHERE product_id = ? AND region_code = ?`
      ).run(nextTitle, nextDesc, nextSeoTitle, nextSeoDesc, nextSeoKeywords, nextPrice, nextStock, productId, rc);
    }
  });

  tx();
  logAudit(user, 'PRODUCT_UPDATED', String(existing.sku), 'Updated regional localization, SEO metadata, pricing & stock');
  res.json({ ok: true });
});

app.patch('/api/admin/inventory', requirePermission('manage_inventory'), (req: AuthedRequest, res) => {
  const productId = Number(req.body?.productId);
  const regionCode = parseRegion(req.body?.regionCode);
  const stockQty = Math.max(0, Math.floor(Number(req.body?.stockQty ?? 0)));

  db.prepare(
    'UPDATE product_localizations SET stock_qty = ? WHERE product_id = ? AND region_code = ?'
  ).run(stockQty, productId, regionCode);

  if (req.authUser) {
    logAudit(req.authUser, 'INVENTORY_ADJUSTED', `Product #${productId} (${regionCode})`, `Stock set to ${stockQty}`);
  }
  res.json({ ok: true, stockQty });
});

app.get('/api/admin/orders', requirePermission('manage_orders'), (_req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY id DESC').all() as Array<Record<string, unknown>>;
  res.json({
    orders: rows.map((r) => ({
      ...r,
      is_b2b: Boolean(r.is_b2b),
      items: JSON.parse(String(r.items_json)),
    })),
  });
});

app.patch('/api/admin/orders/bulk', requirePermission('manage_orders'), async (req: AuthedRequest, res) => {
  const rawIds = Array.isArray(req.body?.orderIds) ? req.body.orderIds : [];
  const orderIds: number[] = Array.from(
    new Set(rawIds.map((v: unknown) => Number(v)).filter((n: number) => Number.isInteger(n) && n > 0))
  );
  if (orderIds.length === 0) {
    res.status(400).json({ error: 'Select at least one order for bulk update.' });
    return;
  }

  const nextOrderStatusRaw = req.body?.order_status ? String(req.body.order_status).trim() : '';
  const nextPayStatusRaw = req.body?.payment_status ? String(req.body.payment_status).trim() : '';
  const allowedOrderStatuses = new Set(['pending', 'processing', 'tailoring', 'shipped', 'delivered', 'cancelled']);
  const allowedPayStatuses = new Set(['pending', 'awaiting_transfer', 'paid', 'refunded']);

  if (nextOrderStatusRaw && !allowedOrderStatuses.has(nextOrderStatusRaw)) {
    res.status(400).json({ error: 'Invalid order_status.' });
    return;
  }
  if (nextPayStatusRaw && !allowedPayStatuses.has(nextPayStatusRaw)) {
    res.status(400).json({ error: 'Invalid payment_status.' });
    return;
  }
  if (!nextOrderStatusRaw && !nextPayStatusRaw) {
    res.status(400).json({ error: 'Provide order_status or payment_status to update.' });
    return;
  }

  const placeholders = orderIds.map(() => '?').join(', ');
  const existingRows = db
    .prepare(`SELECT * FROM orders WHERE id IN (${placeholders})`)
    .all(...orderIds) as Array<Record<string, unknown>>;

  const transitionedForEmail: Array<{ id: number; order_status: string }> = [];
  let updatedCount = 0;

  db.transaction(() => {
    for (const existing of existingRows) {
      const id = Number(existing.id);
      const paymentStatus = nextPayStatusRaw || String(existing.payment_status);
      const orderStatus = nextOrderStatusRaw || String(existing.order_status);
      const shouldRestock = orderStatus === 'cancelled' && existing.order_status !== 'cancelled';

      db.prepare('UPDATE orders SET payment_status = ?, order_status = ? WHERE id = ?').run(
        paymentStatus,
        orderStatus,
        id
      );

      if (shouldRestock) {
        const regionCode = parseRegion(existing.region_code);
        const stockCol = `stock_${regionCode}`;
        let orderItems: Array<{ productId: number; sku: string; quantity: number; tailoring?: BespokeTailoring }> = [];
        try {
          orderItems = JSON.parse(String(existing.items_json || '[]'));
        } catch {
          orderItems = [];
        }
        for (const item of orderItems) {
          const pid = Number(item.productId);
          const qty = Math.max(1, Number(item.quantity || 1));
          const locRow = db
            .prepare('SELECT stock_qty FROM product_localizations WHERE product_id = ? AND region_code = ?')
            .get(pid, regionCode) as { stock_qty: number } | undefined;
          if (locRow) {
            const nextQty = locRow.stock_qty + qty;
            db.prepare('UPDATE product_localizations SET stock_qty = ? WHERE product_id = ? AND region_code = ?').run(
              nextQty,
              pid,
              regionCode
            );
            db.prepare(
              `INSERT INTO stock_movements (
                product_id, sku, variant_label, region_code, delta_qty, previous_qty, new_qty, reason, reference_id, actor_email
              ) VALUES (?, ?, ?, ?, ?, ?, ?, 'order_cancelled_restock', ?, ?)`
            ).run(
              pid,
              String(item.sku || `PRD-${pid}`),
              item.tailoring ? `${item.tailoring.fit} · ${item.tailoring.size}` : null,
              regionCode,
              qty,
              locRow.stock_qty,
              nextQty,
              String(existing.order_number),
              req.authUser?.email || 'staff'
            );
          }
          if (item.tailoring?.fit && item.tailoring?.size) {
            db.prepare(
              `UPDATE product_variants SET ${stockCol} = ${stockCol} + ? WHERE product_id = ? AND fit = ? AND size_label = ?`
            ).run(qty, pid, item.tailoring.fit, item.tailoring.size);
          }
        }
      }

      if ((orderStatus === 'shipped' || orderStatus === 'delivered') && existing.order_status !== orderStatus) {
        transitionedForEmail.push({ id, order_status: orderStatus });
      }
      updatedCount++;
    }
  })();

  for (const item of transitionedForEmail) {
    const updatedRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(item.id) as Record<string, unknown> | undefined;
    if (!updatedRow) continue;
    const reg = getRegionByCode(parseRegion(updatedRow.region_code));
    if (!reg) continue;
    const hydrated = {
      ...updatedRow,
      is_b2b: Boolean(updatedRow.is_b2b),
      items: JSON.parse(String(updatedRow.items_json || '[]')),
    };
    if (item.order_status === 'shipped') {
      await dispatchLocalizedOrderEmail({
        type: 'shipping_tracking',
        order: hydrated as unknown as Parameters<typeof dispatchLocalizedOrderEmail>[0]['order'],
        region: reg,
      }).catch(() => {});
    } else if (item.order_status === 'delivered') {
      const reviewLinks = createOrGetReviewInvitesForOrder({
        orderNumber: String(updatedRow.order_number),
        regionCode: reg.code,
        customerEmail: String(updatedRow.customer_email),
        customerName: String(updatedRow.customer_name),
        items: hydrated.items,
        origin: resolveRequestOrigin(req),
      });
      await dispatchLocalizedOrderEmail({
        type: 'review_request',
        order: hydrated as unknown as Parameters<typeof dispatchLocalizedOrderEmail>[0]['order'],
        region: reg,
        reviewLinks,
      }).catch(() => {});
    }
  }

  if (req.authUser) {
    logAudit(
      req.authUser,
      'ORDERS_BULK_UPDATED',
      `${updatedCount} orders`,
      `${nextOrderStatusRaw ? `Status: ${nextOrderStatusRaw} ` : ''}${nextPayStatusRaw ? `Payment: ${nextPayStatusRaw}` : ''}`.trim()
    );
  }
  res.json({ ok: true, updatedCount });
});

app.patch('/api/admin/orders/:id', requirePermission('manage_orders'), async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  const paymentStatus = String(req.body?.payment_status || existing.payment_status);
  const orderStatus = String(req.body?.order_status || existing.order_status);
  const notes = req.body?.notes !== undefined ? String(req.body.notes) : existing.notes;
  const shouldRestock =
    (orderStatus === 'cancelled' && existing.order_status !== 'cancelled') || Boolean(req.body?.restock);

  const tx = db.transaction(() => {
    db.prepare('UPDATE orders SET payment_status = ?, order_status = ?, notes = ? WHERE id = ?').run(
      paymentStatus,
      orderStatus,
      notes,
      id
    );

    if (shouldRestock) {
      const regionCode = parseRegion(existing.region_code);
      const stockCol = `stock_${regionCode}`;
      let orderItems: Array<{ productId: number; sku: string; quantity: number; tailoring?: BespokeTailoring }> = [];
      try {
        orderItems = JSON.parse(String(existing.items_json || '[]'));
      } catch {
        orderItems = [];
      }
      for (const item of orderItems) {
        const pid = Number(item.productId);
        const qty = Math.max(1, Number(item.quantity || 1));
        const locRow = db
          .prepare('SELECT stock_qty FROM product_localizations WHERE product_id = ? AND region_code = ?')
          .get(pid, regionCode) as { stock_qty: number } | undefined;
        if (locRow) {
          const nextQty = locRow.stock_qty + qty;
          db.prepare(
            'UPDATE product_localizations SET stock_qty = ? WHERE product_id = ? AND region_code = ?'
          ).run(nextQty, pid, regionCode);

          db.prepare(
            `INSERT INTO stock_movements (
              product_id, sku, variant_label, region_code, delta_qty, previous_qty, new_qty, reason, reference_id, actor_email
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'order_cancelled_restock', ?, ?)`
          ).run(
            pid,
            String(item.sku || `PRD-${pid}`),
            item.tailoring ? `${item.tailoring.fit} · ${item.tailoring.size}` : null,
            regionCode,
            qty,
            locRow.stock_qty,
            nextQty,
            String(existing.order_number),
            req.authUser?.email || 'staff'
          );
        }
        if (item.tailoring?.fit && item.tailoring?.size) {
          db.prepare(
            `UPDATE product_variants SET ${stockCol} = ${stockCol} + ? WHERE product_id = ? AND fit = ? AND size_label = ?`
          ).run(qty, pid, item.tailoring.fit, item.tailoring.size);
        }
      }
    }
  });

  tx();

  if ((orderStatus === 'shipped' || orderStatus === 'delivered') && existing.order_status !== orderStatus) {
    const updatedRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, unknown>;
    const reg = getRegionByCode(parseRegion(updatedRow.region_code));
    if (reg) {
      const hydrated = {
        ...updatedRow,
        is_b2b: Boolean(updatedRow.is_b2b),
        items: JSON.parse(String(updatedRow.items_json || '[]')),
      };
      if (orderStatus === 'shipped') {
        await dispatchLocalizedOrderEmail({
          type: 'shipping_tracking',
          order: hydrated as unknown as Parameters<typeof dispatchLocalizedOrderEmail>[0]['order'],
          region: reg,
        }).catch(() => {});
      } else if (orderStatus === 'delivered') {
        const reviewLinks = createOrGetReviewInvitesForOrder({
          orderNumber: String(updatedRow.order_number),
          regionCode: reg.code,
          customerEmail: String(updatedRow.customer_email),
          customerName: String(updatedRow.customer_name),
          items: hydrated.items,
          origin: resolveRequestOrigin(req),
        });
        await dispatchLocalizedOrderEmail({
          type: 'review_request',
          order: hydrated as unknown as Parameters<typeof dispatchLocalizedOrderEmail>[0]['order'],
          region: reg,
          reviewLinks,
        }).catch(() => {});
      }
    }
  }

  if (req.authUser) {
    logAudit(
      req.authUser,
      'ORDER_UPDATED',
      String(existing.order_number),
      `Payment: ${paymentStatus} · Status: ${orderStatus}${shouldRestock ? ' · Stock Restored' : ''}`
    );
  }
  res.json({ ok: true, restocked: shouldRestock });
});

app.post('/api/admin/orders/:id/dhl-dispatch', requirePermission('manage_orders'), async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const trackingNumber =
    String(existing.dhl_tracking_number || '').trim() ||
    createDhlWaybillNumber(String(existing.region_code));

  db.prepare(
    `UPDATE orders SET dhl_tracking_number = ?, dhl_status = 'in_transit', order_status = 'shipped' WHERE id = ?`
  ).run(trackingNumber, id);

  const updatedRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, unknown>;
  const reg = getRegionByCode(parseRegion(updatedRow.region_code));
  if (reg) {
    const hydrated = {
      ...updatedRow,
      is_b2b: Boolean(updatedRow.is_b2b),
      items: JSON.parse(String(updatedRow.items_json || '[]')),
    };
    await dispatchLocalizedOrderEmail({
      type: 'shipping_tracking',
      order: hydrated as unknown as Parameters<typeof dispatchLocalizedOrderEmail>[0]['order'],
      region: reg,
    }).catch(() => {});
  }

  if (req.authUser) {
    logAudit(
      req.authUser,
      'DHL_WAYBILL_DISPATCHED',
      String(existing.order_number),
      `Tracking ${trackingNumber}`
    );
  }

  res.json({ ok: true, dhl_tracking_number: trackingNumber, dhl_status: 'in_transit', order_status: 'shipped' });
});

app.post('/api/admin/orders/:id/resend-email', requirePermission('manage_orders'), async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  const rawEmailType = req.body?.templateType || req.body?.type;
  const emailType =
    rawEmailType === 'shipping_tracking'
      ? 'shipping_tracking'
      : rawEmailType === 'review_request'
      ? 'review_request'
      : 'order_confirmation';
  const reg = getRegionByCode(parseRegion(existing.region_code));
  if (!reg) {
    res.status(400).json({ error: 'Region configuration missing for order' });
    return;
  }
  const hydrated = {
    ...existing,
    is_b2b: Boolean(existing.is_b2b),
    items: JSON.parse(String(existing.items_json || '[]')),
  };
  const reviewLinks =
    emailType === 'review_request'
      ? createOrGetReviewInvitesForOrder({
          orderNumber: String(existing.order_number),
          regionCode: reg.code,
          customerEmail: String(existing.customer_email),
          customerName: String(existing.customer_name),
          items: hydrated.items,
          origin: resolveRequestOrigin(req),
        })
      : undefined;
  const emailResult = await dispatchLocalizedOrderEmail({
    type: emailType,
    order: hydrated as unknown as Parameters<typeof dispatchLocalizedOrderEmail>[0]['order'],
    region: reg,
    reviewLinks,
  });
  if (req.authUser) {
    logAudit(req.authUser, 'ORDER_EMAIL_SENT', String(existing.order_number), `${emailType} (${emailResult.status})`);
  }
  res.json({ ok: true, emailLog: emailResult });
});

// WordPress-Style Media Library Routes
app.get('/api/admin/media', requirePermission('manage_media'), (_req, res) => {
  const media = db.prepare('SELECT * FROM media ORDER BY id DESC').all();
  res.json({ media });
});

app.post(
  '/api/admin/media/upload',
  requirePermission('manage_media'),
  upload.single('file'),
  (req: AuthedRequest, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided.' });
      return;
    }

    const folderRaw = String(req.body?.folder || 'uploads');
    const folder = ['products', 'editorial', 'hero', 'tailoring', 'uploads'].includes(folderRaw)
      ? folderRaw
      : 'uploads';
    const altText = String(req.body?.alt_text || req.file.originalname);
    const caption = String(req.body?.caption || '');
    const url = `/uploads/${req.file.filename}`;

    const info = db
      .prepare(
        `INSERT INTO media (filename, original_name, url, mime_type, size_bytes, width, height, folder, alt_text, caption, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.file.filename,
        req.file.originalname,
        url,
        req.file.mimetype,
        req.file.size,
        1200,
        1200,
        folder,
        altText,
        caption,
        req.authUser?.email || 'staff'
      );

    const created = db.prepare('SELECT * FROM media WHERE id = ?').get(info.lastInsertRowid);
    if (req.authUser) {
      logAudit(req.authUser, 'MEDIA_UPLOADED', req.file.originalname, `Folder: ${folder}`);
    }
    res.status(201).json({ media: created });
  }
);

app.patch('/api/admin/media/:id', requirePermission('manage_media'), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM media WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Media item not found' });
    return;
  }
  const altText = String(req.body?.alt_text ?? existing.alt_text);
  const caption = String(req.body?.caption ?? existing.caption);
  const folder = String(req.body?.folder ?? existing.folder);

  db.prepare('UPDATE media SET alt_text = ?, caption = ?, folder = ? WHERE id = ?').run(
    altText,
    caption,
    folder,
    id
  );
  res.json({ media: db.prepare('SELECT * FROM media WHERE id = ?').get(id) });
});

app.delete('/api/admin/media/:id', requirePermission('manage_media'), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM media WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Media item not found' });
    return;
  }

  // Only remove physical file if it lives inside UPLOADS_DIR (never delete seeded assets in src/assets)
  if (String(existing.url).startsWith('/uploads/')) {
    const resolved = path.resolve(UPLOADS_DIR, String(existing.filename));
    if (resolved.startsWith(UPLOADS_DIR + path.sep) && fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
    }
  }

  db.prepare('DELETE FROM media WHERE id = ?').run(id);
  if (req.authUser) {
    logAudit(req.authUser, 'MEDIA_DELETED', String(existing.original_name), `Media #${id}`);
  }
  res.json({ ok: true });
});

// Staff & RBAC Management (Owner Only)
app.get('/api/admin/staff', requirePermission('manage_staff'), (_req, res) => {
  const rows = db
    .prepare(`SELECT * FROM users WHERE role IN ('owner', 'staff') ORDER BY id ASC`)
    .all() as Array<Parameters<typeof mapUserRow>[0]>;
  res.json({ staff: rows.map(mapUserRow) });
});

app.post('/api/admin/staff', requirePermission('manage_staff'), (req: AuthedRequest, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const permissions: StaffPermissions = {
    ...DEFAULT_STAFF_PERMISSIONS,
    ...(req.body?.permissions || {}),
  };
  const assignedRegions = Array.isArray(req.body?.assigned_regions)
    ? req.body.assigned_regions
    : ['en', 'no', 'it', 'vn'];

  if (!name || !email || !email.includes('@') || password.length < 6) {
    res.status(400).json({ error: 'Name, valid email, and password (min 6 chars) required.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'Email already registered.' });
    return;
  }

  const hash = hashPassword(password);
  const info = db
    .prepare(
      `INSERT INTO users (email, name, password_hash, role, permissions_json, assigned_regions_json, active)
       VALUES (?, ?, ?, 'staff', ?, ?, 1)`
    )
    .run(email, name, hash, JSON.stringify(permissions), JSON.stringify(assignedRegions));

  const created = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid) as Parameters<
    typeof mapUserRow
  >[0];
  if (req.authUser) {
    logAudit(req.authUser, 'STAFF_CREATED', email, `Role: staff`);
  }
  res.status(201).json({ user: mapUserRow(created) });
});

app.patch('/api/admin/staff/:id', requirePermission('manage_staff'), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as
    | Parameters<typeof mapUserRow>[0]
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (existing.role === 'owner') {
    res.status(400).json({ error: 'Owner permissions cannot be restricted.' });
    return;
  }

  const nextActive = req.body?.active !== undefined ? (req.body.active ? 1 : 0) : existing.active;
  const nextPerms = req.body?.permissions
    ? JSON.stringify({ ...DEFAULT_STAFF_PERMISSIONS, ...req.body.permissions })
    : existing.permissions_json;
  const nextRegions = Array.isArray(req.body?.assigned_regions)
    ? JSON.stringify(req.body.assigned_regions)
    : existing.assigned_regions_json;

  db.prepare(
    'UPDATE users SET active = ?, permissions_json = ?, assigned_regions_json = ? WHERE id = ?'
  ).run(nextActive, nextPerms, nextRegions, id);

  if (req.authUser) {
    logAudit(req.authUser, 'STAFF_UPDATED', existing.email, `Active: ${Boolean(nextActive)}`);
  }
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Parameters<typeof mapUserRow>[0];
  res.json({ user: mapUserRow(updated) });
});

// Regional & Gateway Settings (Owner Only)
app.get('/api/admin/regions', requirePermission('manage_settings'), (_req, res) => {
  res.json({
    regions: getAllRegions(),
    gateways: getGatewayConfigurationStatus(),
  });
});

app.patch('/api/admin/regions/:code', requirePermission('manage_settings'), (req: AuthedRequest, res) => {
  const code = parseRegion(req.params.code);
  const existing = getRegionByCode(code);
  if (!existing) {
    res.status(404).json({ error: 'Region not found' });
    return;
  }

  const b = req.body || {};
  const enabledPayments = Array.isArray(b.enabled_payments)
    ? JSON.stringify(b.enabled_payments)
    : JSON.stringify(existing.enabled_payments);

  db.prepare(
    `UPDATE regions SET
      vat_rate = ?, free_shipping_threshold = ?, dhl_base_rate = ?, dhl_express_rate = ?,
      bank_name = ?, bank_account_display = ?, bank_iban = ?, enabled_payments = ?
     WHERE code = ?`
  ).run(
    Number(b.vat_rate ?? existing.vat_rate),
    Number(b.free_shipping_threshold ?? existing.free_shipping_threshold),
    Number(b.dhl_base_rate ?? existing.dhl_base_rate),
    Number(b.dhl_express_rate ?? existing.dhl_express_rate),
    String(b.bank_name ?? existing.bank_name),
    String(b.bank_account_display ?? existing.bank_account_display),
    String(b.bank_iban ?? existing.bank_iban),
    enabledPayments,
    code
  );

  if (req.authUser) {
    logAudit(req.authUser, 'REGION_SETTINGS_UPDATED', code.toUpperCase(), 'Updated VAT/DHL/Payments');
  }
  res.json({ region: getRegionByCode(code) });
});

app.get('/api/admin/b2b', requirePermission('manage_b2b'), (_req, res) => {
  const inquiries = db.prepare('SELECT * FROM b2b_inquiries ORDER BY id DESC').all() as Array<
    Record<string, unknown>
  >;
  res.json({
    inquiries: inquiries.map((i) => {
      let items = [];
      try {
        items = JSON.parse(String(i.items_json || '[]'));
      } catch {
        items = [];
      }
      return {
        ...i,
        embroidery_requested: Boolean(i.embroidery_requested),
        items,
      };
    }),
  });
});

app.patch('/api/admin/b2b/:id', requirePermission('manage_b2b'), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM b2b_inquiries WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'B2B inquiry not found' });
    return;
  }
  const status = String(req.body?.status ?? existing.status);
  const quotedUnitPrice =
    req.body?.quoted_unit_price !== undefined && req.body?.quoted_unit_price !== null && req.body?.quoted_unit_price !== ''
      ? Number(req.body.quoted_unit_price)
      : (existing.quoted_unit_price as number | null);
  const notes = req.body?.notes !== undefined ? String(req.body.notes) : String(existing.notes || '');

  db.prepare('UPDATE b2b_inquiries SET status = ?, quoted_unit_price = ?, notes = ? WHERE id = ?').run(
    status,
    quotedUnitPrice,
    notes,
    id
  );
  if (req.authUser) {
    logAudit(req.authUser, 'B2B_STATUS_UPDATED', `B2B #${id}`, `Status -> ${status}`);
  }
  res.json({ ok: true });
});

app.post('/api/admin/b2b/:id/convert-order', requirePermission('manage_b2b'), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const inq = db.prepare('SELECT * FROM b2b_inquiries WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!inq) {
    res.status(404).json({ error: 'B2B inquiry not found' });
    return;
  }
  if (inq.converted_order_number) {
    res.status(409).json({
      error: `B2B Inquiry #${id} already converted to Order ${inq.converted_order_number}.`,
    });
    return;
  }

  const regionCode = parseRegion(inq.region_code);
  const region = getRegionByCode(regionCode);
  if (!region) {
    res.status(400).json({ error: 'Invalid region for B2B inquiry.' });
    return;
  }

  let rawItems: Array<Record<string, unknown>> = [];
  try {
    rawItems = JSON.parse(String(inq.items_json || '[]'));
  } catch {
    rawItems = [];
  }

  const requestedUnitPrice =
    req.body?.quotedUnitPrice !== undefined && Number(req.body.quotedUnitPrice) > 0
      ? Number(req.body.quotedUnitPrice)
      : Number(inq.quoted_unit_price || 0);

  const tx = db.transaction(() => {
    const seqRow = db.prepare('SELECT COALESCE(MAX(id), 0) + 1001 AS nextNum FROM orders').get() as {
      nextNum: number;
    };
    const orderNumber = `MN-B2B-${seqRow.nextNum}`;

    const totalQty = Math.max(5, Number(inq.estimated_qty || 20));
    const fallbackRetail = regionCode === 'vn' ? 4290000 : regionCode === 'no' ? 1599 : 169;
    const defaultB2BRate =
      requestedUnitPrice > 0
        ? requestedUnitPrice
        : estimateB2BUnitRate(fallbackRetail, totalQty, regionCode);

    const orderItems =
      rawItems.length > 0
        ? rawItems.map((it) => {
            const pcs = Math.max(1, Number(it.totalPieces || totalQty));
            const breakdownEntries = Object.entries((it.sizeBreakdown as Record<string, number>) || {})
              .filter(([, q]) => Number(q) > 0)
              .map(([sz, q]) => `${sz}:${q}`)
              .join(', ');
            return {
              productId: Number(it.productId || 1),
              sku: String(it.sku || 'MN-B2B'),
              title: `${String(it.title || 'B2B Corporate Shirt')} [${breakdownEntries || `${pcs} pcs`}]`,
              image: String(it.image || '/src/assets/images/shirt_white_signature_1795248293653.jpg'),
              unitPrice: defaultB2BRate,
              quantity: pcs,
              tailoring: {
                fit: String(it.fit || 'Regular Fit') as BespokeTailoring['fit'],
                size: breakdownEntries ? 'B2B Matrix' : '40 / M',
                collar: String(it.collar || 'Spread'),
                cuff: String(it.cuff || 'Modern'),
                sleeveAdjustmentCm: 0,
                lengthAdjustmentCm: 0,
              },
            };
          })
        : [
            {
              productId: 4,
              sku: 'MN-B2B1',
              title: `B2B Uniform Batch (${totalQty} pcs)`,
              image: '/src/assets/images/editorial_corporate_b2b_1795248294517.jpg',
              unitPrice: defaultB2BRate,
              quantity: totalQty,
              tailoring: {
                fit: 'Regular Fit' as const,
                size: 'B2B Matrix',
                collar: 'Spread',
                cuff: 'Modern',
                sleeveAdjustmentCm: 0,
                lengthAdjustmentCm: 0,
              },
            },
          ];

    const subtotal = orderItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    const total = regionCode === 'no' || regionCode === 'vn' ? Math.round(subtotal) : Number(subtotal.toFixed(2));
    const vatAmount =
      region.vat_rate > 0
        ? regionCode === 'no' || regionCode === 'vn'
          ? Math.round(total - total / (1 + region.vat_rate))
          : Number((total - total / (1 + region.vat_rate)).toFixed(2))
        : 0;
    const payRef = generateBankReference(region.bank_reference_prefix, orderNumber);

    db.prepare(
      `INSERT INTO orders (
        order_number, region_code, currency_code, customer_name, customer_email, customer_phone,
        shipping_address, shipping_city, shipping_postal_code, shipping_country, is_b2b, company_name, org_number,
        subtotal, shipping_cost, discount_amount, vat_amount, total, payment_method, payment_status,
        payment_reference, shipping_method, dhl_tracking_number, dhl_status, order_status, items_json, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 0, 0, ?, ?, 'bank_transfer', 'awaiting_transfer', ?, 'dhl_express', NULL, 'pending_label', 'processing', ?, ?)`
    ).run(
      orderNumber,
      regionCode,
      region.currency_code,
      String(inq.contact_name),
      String(inq.email),
      String(inq.phone || 'Corporate Desk'),
      'Corporate Delivery Address (On Invoice)',
      region.warehouse_name.split(' ')[0] || 'Oslo',
      '0150',
      region.name,
      String(inq.company_name),
      `B2B-${id}`,
      subtotal,
      vatAmount,
      total,
      payRef,
      JSON.stringify(orderItems),
      `Converted from B2B Inquiry #${id}${inq.embroidery_requested ? ' · Logo Embroidery' : ''}. ${String(inq.notes || '')}`
    );

    db.prepare(
      `UPDATE b2b_inquiries SET status = 'approved', quoted_unit_price = ?, converted_order_number = ? WHERE id = ?`
    ).run(defaultB2BRate, orderNumber, id);

    return { orderNumber, total, defaultB2BRate };
  });

  const result = tx();
  if (req.authUser) {
    logAudit(
      req.authUser,
      'B2B_CONVERTED_TO_ORDER',
      result.orderNumber,
      `From B2B Inquiry #${id} (${String(inq.company_name)})`
    );
  }
  res.status(201).json({ ok: true, ...result });
});

// Mailchimp & Newsletter Audience Endpoints
app.get('/api/admin/newsletter', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_settings') && !hasPermission(user, 'manage_b2b')) {
    res.status(403).json({ error: 'Missing permission to access audience subscribers' });
    return;
  }
  const subscribers = db
    .prepare('SELECT * FROM newsletter_subscribers ORDER BY id DESC')
    .all() as Array<Record<string, unknown>>;
  res.json({
    subscribers,
    mailchimp: getGatewayConfigurationStatus().mailchimp,
  });
});

app.post('/api/admin/newsletter/sync-mailchimp', requireStaffOrOwner, async (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_settings') && !hasPermission(user, 'manage_b2b')) {
    res.status(403).json({ error: 'Missing permission to sync Mailchimp audience' });
    return;
  }
  const subscribers = db
    .prepare("SELECT id, email, region_code FROM newsletter_subscribers WHERE status = 'subscribed'")
    .all() as Array<{ id: number; email: string; region_code: string }>;

  let syncedCount = 0;
  let queuedCount = 0;
  let errorCount = 0;

  for (const sub of subscribers) {
    const result = await syncSubscriberToMailchimp({
      email: sub.email,
      regionCode: sub.region_code,
    });
    db.prepare(
      `UPDATE newsletter_subscribers
       SET mailchimp_status = ?, mailchimp_member_id = ?, synced_at = CASE WHEN ? = 'synced' THEN datetime('now') ELSE synced_at END
       WHERE id = ?`
    ).run(result.status, result.memberId, result.status, sub.id);

    if (result.status === 'synced') syncedCount++;
    else if (result.status === 'sandbox_queued') queuedCount++;
    else errorCount++;
  }

  logAudit(
    user,
    'MAILCHIMP_SYNC',
    'newsletter_subscribers',
    `Synced: ${syncedCount}, Sandbox queued: ${queuedCount}, Errors: ${errorCount}`
  );
  res.json({
    total: subscribers.length,
    syncedCount,
    queuedCount,
    errorCount,
    configured: getGatewayConfigurationStatus().mailchimp.configured,
  });
});

// CSV Export Endpoints (Products, Orders, Newsletter, B2B)
app.get('/api/admin/export/:resource', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  const resource = String(req.params.resource || '').toLowerCase();

  let csv = '';
  let filename = `montenapoleone-${resource}.csv`;

  if (resource === 'products') {
    if (
      !hasPermission(user, 'manage_products') &&
      !hasPermission(user, 'manage_pricing') &&
      !hasPermission(user, 'manage_inventory')
    ) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    const rows = db
      .prepare(
        `SELECT p.sku, p.category_slug, pl.region_code, pl.title, pl.price, pl.compare_at_price, pl.stock_qty, pl.warehouse_location
         FROM products p
         JOIN product_localizations pl ON pl.product_id = p.id
         ORDER BY p.id ASC, pl.region_code ASC`
      )
      .all() as Array<Record<string, unknown>>;

    csv = toCsv(
      ['sku', 'category_slug', 'region_code', 'title', 'price', 'compare_at_price', 'stock_qty', 'warehouse_location'],
      rows.map((r) => [
        r.sku,
        r.category_slug,
        r.region_code,
        r.title,
        r.price,
        r.compare_at_price ?? '',
        r.stock_qty,
        r.warehouse_location,
      ])
    );
    filename = 'montenapoleone-products-multiregion.csv';
  } else if (resource === 'orders') {
    if (!hasPermission(user, 'manage_orders')) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    const rows = db.prepare('SELECT * FROM orders ORDER BY id DESC').all() as Array<Record<string, unknown>>;
    csv = toCsv(
      [
        'order_number',
        'region_code',
        'currency_code',
        'customer_name',
        'customer_email',
        'shipping_city',
        'shipping_country',
        'payment_method',
        'payment_status',
        'order_status',
        'dhl_tracking_number',
        'total',
        'created_at',
      ],
      rows.map((r) => [
        r.order_number,
        r.region_code,
        r.currency_code,
        r.customer_name,
        r.customer_email,
        r.shipping_city,
        r.shipping_country,
        r.payment_method,
        r.payment_status,
        r.order_status,
        r.dhl_tracking_number ?? '',
        r.total,
        r.created_at,
      ])
    );
    filename = 'montenapoleone-orders.csv';
  } else if (resource === 'newsletter') {
    if (!hasPermission(user, 'manage_settings') && !hasPermission(user, 'manage_b2b')) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    const rows = db
      .prepare('SELECT email, region_code, discount_code, status, mailchimp_status, synced_at, created_at FROM newsletter_subscribers ORDER BY id DESC')
      .all() as Array<Record<string, unknown>>;
    csv = toCsv(
      ['email', 'region_code', 'discount_code', 'status', 'mailchimp_status', 'synced_at', 'created_at'],
      rows.map((r) => [
        r.email,
        r.region_code,
        r.discount_code,
        r.status,
        r.mailchimp_status,
        r.synced_at ?? '',
        r.created_at,
      ])
    );
    filename = 'montenapoleone-mailchimp-subscribers.csv';
  } else if (resource === 'b2b') {
    if (!hasPermission(user, 'manage_b2b')) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    const rows = db.prepare('SELECT * FROM b2b_inquiries ORDER BY id DESC').all() as Array<Record<string, unknown>>;
    csv = toCsv(
      ['id', 'company_name', 'contact_name', 'email', 'phone', 'region_code', 'estimated_qty', 'embroidery_requested', 'status', 'notes', 'created_at'],
      rows.map((r) => [
        r.id,
        r.company_name,
        r.contact_name,
        r.email,
        r.phone,
        r.region_code,
        r.estimated_qty,
        Boolean(r.embroidery_requested),
        r.status,
        r.notes,
        r.created_at,
      ])
    );
    filename = 'montenapoleone-b2b-inquiries.csv';
  } else {
    res.status(400).json({ error: 'Unknown export resource' });
    return;
  }

  logAudit(user, 'CSV_EXPORTED', resource, `Exported ${filename}`);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csv);
});

// Bulk CSV Product Import (Updates existing SKU localizations or creates new SKU entries)
app.post('/api/admin/import/products', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  const canEditProduct = hasPermission(user, 'manage_products');
  const canEditPrice = hasPermission(user, 'manage_pricing');
  const canEditStock = hasPermission(user, 'manage_inventory');

  if (!canEditProduct && !canEditPrice && !canEditStock) {
    res.status(403).json({ error: 'Insufficient permissions to import product data.' });
    return;
  }

  const rows = Array.isArray(req.body?.rows) ? (req.body.rows as CsvImportRow[]) : [];
  if (rows.length === 0) {
    res.status(400).json({ error: 'No valid CSV rows supplied.' });
    return;
  }

  let updatedCount = 0;
  let skippedCount = 0;

  const tx = db.transaction(() => {
    for (const row of rows) {
      const sku = String(row.sku || '').trim();
      const regionCode = parseRegion(row.region_code);
      const product = db.prepare('SELECT id, category_slug FROM products WHERE sku = ?').get(sku) as
        | { id: number; category_slug: string }
        | undefined;

      if (!product) {
        skippedCount++;
        continue;
      }

      if (canEditProduct && row.category_slug) {
        db.prepare('UPDATE products SET category_slug = ? WHERE id = ?').run(row.category_slug, product.id);
      }

      const loc = db
        .prepare('SELECT * FROM product_localizations WHERE product_id = ? AND region_code = ?')
        .get(product.id, regionCode) as Record<string, unknown> | undefined;

      if (!loc) {
        skippedCount++;
        continue;
      }

      const nextTitle = canEditProduct && row.title ? row.title : String(loc.title);
      const nextPrice =
        canEditPrice && typeof row.price === 'number' && Number.isFinite(row.price)
          ? row.price
          : Number(loc.price);
      const nextCompare =
        canEditPrice && row.compare_at_price !== undefined
          ? row.compare_at_price
          : (loc.compare_at_price as number | null);
      const nextStock =
        canEditStock && typeof row.stock_qty === 'number' && Number.isFinite(row.stock_qty)
          ? Math.max(0, Math.floor(row.stock_qty))
          : Number(loc.stock_qty);

      db.prepare(
        `UPDATE product_localizations
         SET title = ?, price = ?, compare_at_price = ?, stock_qty = ?
         WHERE product_id = ? AND region_code = ?`
      ).run(nextTitle, nextPrice, nextCompare, nextStock, product.id, regionCode);

      updatedCount++;
    }
  });

  tx();
  logAudit(user, 'CSV_IMPORTED', 'products', `Updated ${updatedCount} rows, skipped ${skippedCount}`);
  res.json({ ok: true, updatedCount, skippedCount });
});

// Full WooCommerce CSV Product + Variations + Hierarchical Category + Multi-Language Rewriter
app.post('/api/admin/import/woocommerce', requireStaffOrOwner, async (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products')) {
    res.status(403).json({ error: 'Product import requires manage_products permission.' });
    return;
  }

  const baseRegion = parseRegion(req.body?.baseRegion || 'en');
  const translateLanguages = req.body?.translateLanguages !== false;
  let rows: WooProductImportRow[] = [];
  let parseErrors: string[] = [];

  if (Array.isArray(req.body?.rows) && req.body.rows.length > 0) {
    rows = req.body.rows as WooProductImportRow[];
  } else {
    const csvText = String(req.body?.csvText || '').trim();
    if (!csvText) {
      res.status(400).json({ error: 'Provide WooCommerce CSV text or parsed rows.' });
      return;
    }
    const parsed = parseWooCommerceCsv(csvText, baseRegion);
    rows = parsed.rows;
    parseErrors = parsed.errors;
  }

  if (rows.length === 0) {
    res.status(400).json({ error: parseErrors[0] || 'No valid WooCommerce product rows detected.' });
    return;
  }

  // Prepare localized copies (EN, NO, IT, VN) using Gemini AI when configured, falling back to deterministic multi-language builder
  const resolvedTranslationsMap = new Map<
    number,
    Record<RegionCode, { title: string; subtitle: string; description: string }>
  >();

  let translatedWithAi = false;
  const aiSettings = getAiSettingsInternal();
  const geminiKey = getResolvedSecret('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || process.env.API_KEY;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const deterministic = buildDeterministicMultilingualCopy({
      title: row.title,
      shortDescription: row.shortDescription,
      description: row.description,
      fabricSpec: row.fabricSpec,
      sourceRegion: parseRegion(row.sourceRegion || baseRegion),
    });
    if (row.translations) {
      resolvedTranslationsMap.set(i, {
        en: row.translations.en || deterministic.en,
        no: row.translations.no || deterministic.no,
        it: row.translations.it || deterministic.it,
        vn: row.translations.vn || deterministic.vn,
      });
    } else {
      resolvedTranslationsMap.set(i, deterministic);
    }
  }

  if (translateLanguages && geminiKey && rows.length <= 25) {
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        apiVersion: 'v1beta',
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const promptItems = rows.map((r, idx) => ({
        index: idx,
        title: r.title,
        shortDescription: r.shortDescription,
        description: r.description,
        fabricSpec: r.fabricSpec,
      }));
      const modelId = aiSettings.geminiModel || 'gemini-4-hydrogen';
      const resp = await ai.models.generateContent({
        model: modelId,
        contents: `Rewrite and localize these luxury menswear shirt product descriptions from Monte Napoleone 1974 into refined, natural English (en), Norwegian Bokmal (no), Italian (it), and Vietnamese (vn). Preserve fabric details accurately.\nInput JSON:\n${JSON.stringify(promptItems)}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                index: { type: Type.INTEGER },
                en: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    subtitle: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                  required: ['title', 'subtitle', 'description'],
                },
                no: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    subtitle: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                  required: ['title', 'subtitle', 'description'],
                },
                it: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    subtitle: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                  required: ['title', 'subtitle', 'description'],
                },
                vn: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    subtitle: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                  required: ['title', 'subtitle', 'description'],
                },
              },
              required: ['index', 'en', 'no', 'it', 'vn'],
            },
          },
        },
      });
      const textOut = resp.text;
      if (textOut) {
        const parsedArr = JSON.parse(textOut) as Array<{
          index: number;
          en: { title: string; subtitle: string; description: string };
          no: { title: string; subtitle: string; description: string };
          it: { title: string; subtitle: string; description: string };
          vn: { title: string; subtitle: string; description: string };
        }>;
        for (const item of parsedArr) {
          if (typeof item.index === 'number' && resolvedTranslationsMap.has(item.index)) {
            resolvedTranslationsMap.set(item.index, {
              en: item.en,
              no: item.no,
              it: item.it,
              vn: item.vn,
            });
          }
        }
        translatedWithAi = parsedArr.length > 0;
      }
    } catch {
      // Deterministic translations already populated cleanly
    }
  }

  let createdProducts = 0;
  let updatedProducts = 0;
  let createdCategories = 0;
  let variantsSynced = 0;

  const ensureCategoryChain = (chain: string[]): { leafSlug: string; chainSlugs: string[] } => {
    let parentId: number | null = null;
    let leafSlug = 'business';
    const chainSlugs: string[] = [];
    for (const rawName of chain) {
      const slug = slugifyCategoryName(rawName);
      if (!slug) continue;
      const existing = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug) as
        | { id: number }
        | undefined;
      if (existing) {
        parentId = existing.id;
        leafSlug = slug;
      } else {
        const info = db
          .prepare(
            `INSERT INTO categories (slug, parent_id, scope, active, sort_order, name_en, name_no, name_it, name_vn)
             VALUES (?, ?, 'both', 1, ?, ?, ?, ?, ?)`
          )
          .run(slug, parentId, 50 + createdCategories, rawName, rawName, rawName, rawName);
        parentId = Number(info.lastInsertRowid);
        leafSlug = slug;
        createdCategories++;
      }
      if (!chainSlugs.includes(slug)) chainSlugs.push(slug);
    }
    return { leafSlug, chainSlugs };
  };

  const tx = db.transaction(() => {
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const rawPaths = Array.isArray(row.categoryPaths) ? row.categoryPaths.filter(Boolean) : [];
      const collectedLeafSlugs: string[] = [];
      const collectedAllSlugs: string[] = [];
      for (const pathStr of rawPaths) {
        const chain = String(pathStr)
          .split('>')
          .map((s) => s.trim())
          .filter(Boolean);
        if (chain.length > 0) {
          const { leafSlug, chainSlugs } = ensureCategoryChain(chain);
          if (leafSlug && !collectedLeafSlugs.includes(leafSlug)) collectedLeafSlugs.push(leafSlug);
          for (const cs of chainSlugs) {
            if (!collectedAllSlugs.includes(cs)) collectedAllSlugs.push(cs);
          }
        }
      }
      const leafCategorySlug = collectedLeafSlugs[0] || 'business';
      const allCategorySlugs = collectedAllSlugs.length > 0 ? collectedAllSlugs : [leafCategorySlug];
      const sourceRc = parseRegion(row.sourceRegion || baseRegion);
      const basePrice = row.salePrice && row.salePrice > 0 ? row.salePrice : row.regularPrice;
      const compareAt = row.salePrice && row.salePrice > 0 && row.regularPrice > row.salePrice ? row.regularPrice : null;
      const regionPrices = convertBasePriceAcrossRegions(basePrice, sourceRc);
      const regionCompare = compareAt ? convertBasePriceAcrossRegions(compareAt, sourceRc) : null;

      const primaryImg = row.images?.[0] || '/src/assets/images/shirt_white_signature_1795248293653.jpg';
      const secondaryImg = row.images?.[1] || primaryImg;
      const galleryArr = row.images && row.images.length > 0 ? row.images : [primaryImg];
      const sizes =
        Array.isArray(row.sizes) && row.sizes.length > 0
          ? row.sizes
          : ['38 / S', '39 / M', '40 / M', '41 / L', '42 / L', '43 / XL'];
      const stockQty = Math.max(0, Number(row.stockQty || 0));
      const locCopies = resolvedTranslationsMap.get(idx)!;

      const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(row.sku) as
        | { id: number }
        | undefined;

      let productId: number;
      if (existing) {
        productId = existing.id;
        db.prepare(
          `UPDATE products SET category_slug = ?, category_slugs_json = ?, fabric_spec = ?, primary_image = ?, secondary_image = ?, gallery_json = ?, sizes_json = ?, active = 1
           WHERE id = ?`
        ).run(
          leafCategorySlug,
          JSON.stringify(allCategorySlugs),
          row.fabricSpec || row.shortDescription || '100% Italian Two-Ply Cotton',
          primaryImg,
          secondaryImg,
          JSON.stringify(galleryArr),
          JSON.stringify(sizes),
          productId
        );

        for (const rc of ['en', 'no', 'it', 'vn'] as const) {
          const lc = locCopies[rc];
          const seoTitle = `${lc.title} | Monte Napoleone 1974`.slice(0, 68);
          const seoDesc = lc.description.slice(0, 156);
          const seoKeywords = `${lc.title}, ${row.fabricSpec || 'Italian shirt'}, Monte Napoleone 1974`;
          db.prepare(
            `INSERT INTO product_localizations (
              product_id, region_code, title, subtitle, description, price, compare_at_price, stock_qty, warehouse_location, delivery_note, seo_title, seo_description, seo_keywords
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(product_id, region_code) DO UPDATE SET
              title = excluded.title,
              subtitle = excluded.subtitle,
              description = excluded.description,
              price = excluded.price,
              compare_at_price = excluded.compare_at_price,
              stock_qty = excluded.stock_qty,
              seo_title = excluded.seo_title,
              seo_description = excluded.seo_description,
              seo_keywords = excluded.seo_keywords`
          ).run(
            productId,
            rc,
            lc.title,
            lc.subtitle || 'Imported Italian Shirting',
            lc.description,
            regionPrices[rc],
            regionCompare ? regionCompare[rc] : null,
            stockQty,
            rc === 'no' ? 'Oslo Hub' : rc === 'vn' ? 'HCMC Hub' : 'Treviso HQ',
            'Ships via DHL Express',
            seoTitle,
            seoDesc,
            seoKeywords
          );
        }
        updatedProducts++;
      } else {
        const safeSlug = `${slugifyCategoryName(row.title) || slugifyCategoryName(row.sku)}-${row.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        const info = db
          .prepare(
            `INSERT INTO products (
              sku, slug, category_slug, category_slugs_json, fabric_spec, is_featured, is_b2b_eligible, is_outlet,
              preorder_allowed, primary_image, secondary_image, gallery_json, collars_json, cuffs_json, sizes_json
            ) VALUES (?, ?, ?, ?, ?, 0, 1, ?, 1, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            row.sku,
            safeSlug,
            leafCategorySlug,
            JSON.stringify(allCategorySlugs),
            row.fabricSpec || row.shortDescription || '100% Italian Two-Ply Cotton',
            compareAt ? 1 : 0,
            primaryImg,
            secondaryImg,
            JSON.stringify(galleryArr),
            JSON.stringify(['Spread', 'Semi Spread', 'Button Down', 'Cutaway']),
            JSON.stringify(['Angle', 'Modern', 'Rounded', 'Single French']),
            JSON.stringify(sizes)
          );

        productId = Number(info.lastInsertRowid);
        for (const rc of ['en', 'no', 'it', 'vn'] as const) {
          const lc = locCopies[rc];
          const seoTitle = `${lc.title} | Monte Napoleone 1974`.slice(0, 68);
          const seoDesc = lc.description.slice(0, 156);
          const seoKeywords = `${lc.title}, ${row.fabricSpec || 'Italian shirt'}, Monte Napoleone 1974`;
          db.prepare(
            `INSERT INTO product_localizations (
              product_id, region_code, title, subtitle, description, price, compare_at_price, stock_qty, warehouse_location, delivery_note, seo_title, seo_description, seo_keywords
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            productId,
            rc,
            lc.title,
            lc.subtitle || 'Imported Italian Shirting',
            lc.description,
            regionPrices[rc],
            regionCompare ? regionCompare[rc] : null,
            stockQty,
            rc === 'no' ? 'Oslo Hub' : rc === 'vn' ? 'HCMC Hub' : 'Treviso HQ',
            'Ships via DHL Express',
            seoTitle,
            seoDesc,
            seoKeywords
          );
        }
        createdProducts++;
      }

      // Sync WooCommerce variations (or generate from parsed fits & sizes)
      const upsertVar = db.prepare(
        `INSERT INTO product_variants (
          product_id, fit, size_label, sku_variant, price_en, price_no, price_it, price_vn,
          stock_en, stock_no, stock_it, stock_vn, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(product_id, fit, size_label) DO UPDATE SET
          sku_variant = excluded.sku_variant,
          price_en = excluded.price_en,
          price_no = excluded.price_no,
          price_it = excluded.price_it,
          price_vn = excluded.price_vn,
          stock_en = excluded.stock_en,
          stock_no = excluded.stock_no,
          stock_it = excluded.stock_it,
          stock_vn = excluded.stock_vn,
          active = 1`
      );

      if (Array.isArray(row.variations) && row.variations.length > 0) {
        for (const v of row.variations) {
          const varBase = v.salePrice && v.salePrice > 0 ? v.salePrice : v.regularPrice;
          const vPrices = varBase > 0 ? convertBasePriceAcrossRegions(varBase, sourceRc) : regionPrices;
          const vStock = Math.max(0, Number(v.stockQty || 0));
          upsertVar.run(
            productId,
            v.fit || 'Regular Fit',
            v.sizeLabel || sizes[0],
            v.skuVariant || `${row.sku}-${slugifyCategoryName(v.sizeLabel || 'M').toUpperCase()}`,
            vPrices.en,
            vPrices.no,
            vPrices.it,
            vPrices.vn,
            vStock,
            vStock,
            vStock,
            vStock
          );
          variantsSynced++;
        }
      } else {
        const fitList =
          Array.isArray(row.fits) && row.fits.length > 0
            ? row.fits
            : (['Regular Fit'] as const);
        for (const fit of fitList) {
          for (const sz of sizes) {
            const num = (sz.match(/\d{2}/) || [slugifyCategoryName(sz).toUpperCase()])[0];
            const fitTag = fit === 'Slim Fit' ? 'SLM' : fit === 'Contemporary Fit' ? 'CTM' : 'REG';
            upsertVar.run(
              productId,
              fit,
              sz,
              `${row.sku}-${fitTag}-${num}`,
              regionPrices.en,
              regionPrices.no,
              regionPrices.it,
              regionPrices.vn,
              stockQty,
              stockQty,
              stockQty,
              stockQty
            );
            variantsSynced++;
          }
        }
      }
    }
  });

  tx();
  logAudit(
    user,
    'WOOCOMMERCE_CSV_IMPORTED',
    `${rows.length} SKUs`,
    `Created ${createdProducts}, updated ${updatedProducts}, categories ${createdCategories}, variants ${variantsSynced}${translatedWithAi ? ' (AI multilingual)' : ''}`
  );
  res.json({
    ok: true,
    importedCount: rows.length,
    createdCount: createdProducts,
    updatedCount: updatedProducts,
    categoriesCreated: createdCategories,
    variantsSynced,
    translatedWithAi,
    createdProducts,
    updatedProducts,
    createdCategories,
    errors: parseErrors,
  });
});

// ---------------------------------------------------------------------------
// BULK PRODUCT EDITOR, VARIANT MATRIX, STOCK LEDGER, TAILORING SPECS & REPORTS
// ---------------------------------------------------------------------------

app.post('/api/admin/products/bulk-update', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  const canEditProduct = hasPermission(user, 'manage_products');
  const canEditPrice = hasPermission(user, 'manage_pricing');
  const canEditStock = hasPermission(user, 'manage_inventory');

  if (!canEditProduct && !canEditPrice && !canEditStock) {
    res.status(403).json({ error: 'Insufficient permissions for bulk product update.' });
    return;
  }

  const b = req.body || {};
  const productIds = Array.isArray(b.productIds)
    ? b.productIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
    : [];
  if (productIds.length === 0) {
    res.status(400).json({ error: 'Select at least one product for bulk update.' });
    return;
  }

  const targetRegions: RegionCode[] =
    b.regionCode === 'all' || !b.regionCode
      ? ['en', 'no', 'it', 'vn']
      : [parseRegion(b.regionCode)];

  const priceMode =
    b.priceMode === 'percent' || b.priceMode === 'fixed_delta' || b.priceMode === 'set_exact'
      ? b.priceMode
      : null;
  const priceValue = Number(b.priceValue ?? 0);

  const stockMode = b.stockMode === 'delta' || b.stockMode === 'set_exact' ? b.stockMode : null;
  const stockValue = Math.floor(Number(b.stockValue ?? 0));

  let updatedCount = 0;

  const tx = db.transaction(() => {
    for (const pid of productIds) {
      const prod = db.prepare('SELECT id, sku, category_slug FROM products WHERE id = ?').get(pid) as
        | { id: number; sku: string; category_slug: string }
        | undefined;
      if (!prod) continue;

      if (canEditProduct) {
        if (typeof b.categorySlug === 'string' && b.categorySlug) {
          db.prepare('UPDATE products SET category_slug = ? WHERE id = ?').run(b.categorySlug, pid);
        }
        if (typeof b.preorderAllowed === 'boolean') {
          db.prepare('UPDATE products SET preorder_allowed = ? WHERE id = ?').run(b.preorderAllowed ? 1 : 0, pid);
        }
        if (typeof b.isOutlet === 'boolean') {
          db.prepare('UPDATE products SET is_outlet = ? WHERE id = ?').run(b.isOutlet ? 1 : 0, pid);
        }
        if (typeof b.isFeatured === 'boolean') {
          db.prepare('UPDATE products SET is_featured = ? WHERE id = ?').run(b.isFeatured ? 1 : 0, pid);
        }
        if (typeof b.isB2BEligible === 'boolean') {
          db.prepare('UPDATE products SET is_b2b_eligible = ? WHERE id = ?').run(b.isB2BEligible ? 1 : 0, pid);
        }
      }

      for (const rc of targetRegions) {
        const loc = db
          .prepare('SELECT price, stock_qty FROM product_localizations WHERE product_id = ? AND region_code = ?')
          .get(pid, rc) as { price: number; stock_qty: number } | undefined;
        if (!loc) continue;

        const nextPrice =
          canEditPrice && priceMode && Number.isFinite(priceValue)
            ? computeBulkPriceAdjustment(loc.price, priceMode, priceValue, rc)
            : loc.price;

        let nextStock = loc.stock_qty;
        if (canEditStock && stockMode && Number.isFinite(stockValue)) {
          nextStock =
            stockMode === 'set_exact'
              ? Math.max(0, stockValue)
              : Math.max(0, loc.stock_qty + stockValue);

          if (nextStock !== loc.stock_qty) {
            db.prepare(
              `INSERT INTO stock_movements (
                product_id, sku, variant_label, region_code, delta_qty, previous_qty, new_qty, reason, reference_id, actor_email
              ) VALUES (?, ?, NULL, ?, ?, ?, ?, 'bulk_product_editor', 'BULK-PROD', ?)`
            ).run(pid, prod.sku, rc, nextStock - loc.stock_qty, loc.stock_qty, nextStock, user.email);
          }
        }

        db.prepare(
          'UPDATE product_localizations SET price = ?, stock_qty = ? WHERE product_id = ? AND region_code = ?'
        ).run(nextPrice, nextStock, pid, rc);
      }

      updatedCount++;
    }
  });

  tx();
  logAudit(user, 'PRODUCTS_BULK_UPDATED', `${updatedCount} SKUs`, `Regions: ${targetRegions.join(',')}`);
  res.json({ ok: true, updatedCount });
});

app.get('/api/admin/variants', requireStaffOrOwner, (req, res) => {
  const productId = req.query.productId ? Number(req.query.productId) : null;
  const rows = productId
    ? db.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY fit ASC, size_label ASC').all(productId)
    : db.prepare('SELECT * FROM product_variants ORDER BY product_id ASC, fit ASC, size_label ASC').all();
  res.json({
    variants: (rows as Array<Record<string, unknown>>).map((v) => ({
      ...v,
      active: Boolean(v.active),
    })),
  });
});

app.post('/api/admin/variants/bulk', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_pricing') && !hasPermission(user, 'manage_inventory')) {
    res.status(403).json({ error: 'Insufficient permissions to update variations.' });
    return;
  }

  const b = req.body || {};
  const productIds: number[] = Array.isArray(b.productIds)
    ? b.productIds.map((x: unknown) => Number(x)).filter((n: number) => Number.isFinite(n) && n > 0)
    : [];
  const fits: string[] = Array.isArray(b.fits) && b.fits.length > 0 ? b.fits.map(String) : ['Regular Fit'];
  const sizes: string[] = Array.isArray(b.sizes) && b.sizes.length > 0 ? b.sizes.map(String) : ['40 / M'];

  if (productIds.length === 0) {
    res.status(400).json({ error: 'Select at least one product to update variations.' });
    return;
  }

  const canPrice = hasPermission(user, 'manage_pricing');
  const canStock = hasPermission(user, 'manage_inventory');

  let affected = 0;
  const tx = db.transaction(() => {
    for (const pid of productIds) {
      const prod = db.prepare('SELECT id, sku, sizes_json FROM products WHERE id = ?').get(pid) as
        | { id: number; sku: string; sizes_json: string }
        | undefined;
      if (!prod) continue;

      let existingSizes: string[] = [];
      try {
        existingSizes = JSON.parse(prod.sizes_json);
      } catch {
        existingSizes = [];
      }
      const mergedSizes = Array.from(new Set([...existingSizes, ...sizes]));
      if (mergedSizes.length !== existingSizes.length) {
        db.prepare('UPDATE products SET sizes_json = ? WHERE id = ?').run(JSON.stringify(mergedSizes), pid);
      }

      for (const fit of fits) {
        const fitCode = fit === 'Slim Fit' ? 'SLM' : fit === 'Contemporary Fit' ? 'CNT' : 'REG';
        for (const sizeLabel of sizes) {
          const num = (sizeLabel.match(/\d{2}/) || ['40'])[0];
          const skuVariant = `${prod.sku}-${fitCode}-${num}`;
          const existing = db
            .prepare('SELECT * FROM product_variants WHERE product_id = ? AND fit = ? AND size_label = ?')
            .get(pid, fit, sizeLabel) as Record<string, unknown> | undefined;

          const pEn = canPrice && b.price_en !== undefined && b.price_en !== '' && b.price_en !== null ? Number(b.price_en) : existing ? (existing.price_en as number | null) : null;
          const pNo = canPrice && b.price_no !== undefined && b.price_no !== '' && b.price_no !== null ? Number(b.price_no) : existing ? (existing.price_no as number | null) : null;
          const pIt = canPrice && b.price_it !== undefined && b.price_it !== '' && b.price_it !== null ? Number(b.price_it) : existing ? (existing.price_it as number | null) : null;
          const pVn = canPrice && b.price_vn !== undefined && b.price_vn !== '' && b.price_vn !== null ? Number(b.price_vn) : existing ? (existing.price_vn as number | null) : null;

          const sEn = canStock && b.stock_en !== undefined && b.stock_en !== '' ? Math.max(0, Math.floor(Number(b.stock_en))) : existing ? Number(existing.stock_en) : 10;
          const sNo = canStock && b.stock_no !== undefined && b.stock_no !== '' ? Math.max(0, Math.floor(Number(b.stock_no))) : existing ? Number(existing.stock_no) : 10;
          const sIt = canStock && b.stock_it !== undefined && b.stock_it !== '' ? Math.max(0, Math.floor(Number(b.stock_it))) : existing ? Number(existing.stock_it) : 10;
          const sVn = canStock && b.stock_vn !== undefined && b.stock_vn !== '' ? Math.max(0, Math.floor(Number(b.stock_vn))) : existing ? Number(existing.stock_vn) : 10;
          const isActive = b.active !== undefined ? (b.active ? 1 : 0) : existing ? Number(existing.active) : 1;

          db.prepare(
            `INSERT INTO product_variants (
              product_id, fit, size_label, sku_variant, price_en, price_no, price_it, price_vn,
              stock_en, stock_no, stock_it, stock_vn, active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(product_id, fit, size_label) DO UPDATE SET
              price_en = excluded.price_en,
              price_no = excluded.price_no,
              price_it = excluded.price_it,
              price_vn = excluded.price_vn,
              stock_en = excluded.stock_en,
              stock_no = excluded.stock_no,
              stock_it = excluded.stock_it,
              stock_vn = excluded.stock_vn,
              active = excluded.active`
          ).run(pid, fit, sizeLabel, skuVariant, pEn, pNo, pIt, pVn, sEn, sNo, sIt, sVn, isActive);

          affected++;
        }
      }
    }
  });

  tx();
  logAudit(user, 'VARIANTS_BULK_UPDATED', `${affected} variants`, `Fits: ${fits.join(', ')} · Sizes: ${sizes.join(', ')}`);
  res.json({ ok: true, affected });
});

app.get('/api/admin/stock/movements', requirePermission('manage_inventory'), (_req, res) => {
  const movements = db.prepare('SELECT * FROM stock_movements ORDER BY id DESC LIMIT 120').all();
  res.json({ movements });
});

app.post('/api/admin/stock/adjust', requirePermission('manage_inventory'), (req: AuthedRequest, res) => {
  const user = req.authUser!;
  const productId = Number(req.body?.productId);
  const regionCode = parseRegion(req.body?.regionCode);
  const mode = req.body?.mode === 'delta' ? 'delta' : 'set';
  const rawQty = Math.floor(Number(req.body?.qty ?? 0));
  const reason = String(req.body?.reason || 'manual_warehouse_count').trim();

  const prod = db.prepare('SELECT id, sku FROM products WHERE id = ?').get(productId) as
    | { id: number; sku: string }
    | undefined;
  const loc = db
    .prepare('SELECT stock_qty FROM product_localizations WHERE product_id = ? AND region_code = ?')
    .get(productId, regionCode) as { stock_qty: number } | undefined;

  if (!prod || !loc) {
    res.status(404).json({ error: 'Product localization not found' });
    return;
  }

  const prevQty = loc.stock_qty;
  const newQty = mode === 'delta' ? Math.max(0, prevQty + rawQty) : Math.max(0, rawQty);
  const deltaQty = newQty - prevQty;

  const tx = db.transaction(() => {
    db.prepare('UPDATE product_localizations SET stock_qty = ? WHERE product_id = ? AND region_code = ?').run(
      newQty,
      productId,
      regionCode
    );
    db.prepare(
      `INSERT INTO stock_movements (
        product_id, sku, variant_label, region_code, delta_qty, previous_qty, new_qty, reason, reference_id, actor_email
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'MANUAL', ?)`
    ).run(productId, prod.sku, regionCode, deltaQty, prevQty, newQty, reason, user.email);
  });

  tx();
  logAudit(user, 'STOCK_ADJUSTED', `${prod.sku} (${regionCode})`, `${prevQty} -> ${newQty} (${reason})`);
  res.json({ ok: true, previous_qty: prevQty, new_qty: newQty });
});

app.get('/api/admin/tailoring-specs', requireStaffOrOwner, (_req, res) => {
  const specs = db
    .prepare('SELECT * FROM tailoring_size_specs ORDER BY fit ASC, size_label ASC')
    .all();
  res.json({ specs });
});

app.post('/api/admin/tailoring-specs/bulk', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions to edit tailoring size matrix.' });
    return;
  }

  const b = req.body || {};
  const fits: string[] = Array.isArray(b.fits) && b.fits.length > 0 ? b.fits.map(String) : ['Regular Fit'];
  const sizes: string[] = Array.isArray(b.sizes) && b.sizes.length > 0 ? b.sizes.map(String) : [];
  if (sizes.length === 0) {
    res.status(400).json({ error: 'Select at least one size (e.g. 34 / 2XS, 40 / M) for bulk assignment.' });
    return;
  }

  const measurements = b.measurements || {};
  const sketches = b.sketches || {};

  let updated = 0;
  const tx = db.transaction(() => {
    for (const fit of fits) {
      for (const sz of sizes) {
        const existing = db
          .prepare('SELECT * FROM tailoring_size_specs WHERE fit = ? AND size_label = ?')
          .get(fit, sz) as Record<string, unknown> | undefined;

        const num = Number((sz.match(/\d{2}/) || ['40'])[0]);
        const offset = num - 40;
        const base = existing || {
          shirt_length_cm: Math.round((77 + offset * 0.5) * 10) / 10,
          sleeve_length_cm: Math.round((65 + offset * 0.5) * 10) / 10,
          waist_cm: Math.round((102 + offset * 3) * 10) / 10,
          chest_cm: Math.round((110 + offset * 3) * 10) / 10,
          bottom_hem_cm: Math.round((106 + offset * 3) * 10) / 10,
          shoulder_cm: Math.round((46 + offset * 0.7) * 10) / 10,
          sketch_shirt_length: '',
          sketch_sleeve_length: '',
          sketch_waist: '',
          sketch_chest: '',
          sketch_bottom_hem: '',
          sketch_shoulder: '',
        };

        const pickVal = (field: string) =>
          measurements[field] !== undefined && measurements[field] !== '' && measurements[field] !== null
            ? Number(measurements[field])
            : Number(base[field]);

        const pickSketch = (field: string) =>
          sketches[field] !== undefined && sketches[field] !== ''
            ? String(sketches[field])
            : String(base[field] || '');

        db.prepare(
          `INSERT INTO tailoring_size_specs (
            fit, size_label, shirt_length_cm, sleeve_length_cm, waist_cm, chest_cm, bottom_hem_cm, shoulder_cm,
            sketch_shirt_length, sketch_sleeve_length, sketch_waist, sketch_chest, sketch_bottom_hem, sketch_shoulder, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(fit, size_label) DO UPDATE SET
            shirt_length_cm = excluded.shirt_length_cm,
            sleeve_length_cm = excluded.sleeve_length_cm,
            waist_cm = excluded.waist_cm,
            chest_cm = excluded.chest_cm,
            bottom_hem_cm = excluded.bottom_hem_cm,
            shoulder_cm = excluded.shoulder_cm,
            sketch_shirt_length = excluded.sketch_shirt_length,
            sketch_sleeve_length = excluded.sketch_sleeve_length,
            sketch_waist = excluded.sketch_waist,
            sketch_chest = excluded.sketch_chest,
            sketch_bottom_hem = excluded.sketch_bottom_hem,
            sketch_shoulder = excluded.sketch_shoulder,
            updated_at = datetime('now')`
        ).run(
          fit,
          sz,
          pickVal('shirt_length_cm'),
          pickVal('sleeve_length_cm'),
          pickVal('waist_cm'),
          pickVal('chest_cm'),
          pickVal('bottom_hem_cm'),
          pickVal('shoulder_cm'),
          pickSketch('sketch_shirt_length'),
          pickSketch('sketch_sleeve_length'),
          pickSketch('sketch_waist'),
          pickSketch('sketch_chest'),
          pickSketch('sketch_bottom_hem'),
          pickSketch('sketch_shoulder')
        );
        updated++;
      }
    }
  });

  tx();
  logAudit(user, 'TAILORING_SPECS_BULK_UPDATED', `${updated} fit/size rows`, `Sizes: ${sizes.join(', ')}`);
  res.json({ ok: true, updated });
});

// Backend-Editable Collar & Cuff Studio Routes
app.get('/api/admin/tailoring-options', requireStaffOrOwner, (_req, res) => {
  res.json({ options: getTailoringOptions(true) });
});

app.post('/api/admin/tailoring-options', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions to add collar/cuff option.' });
    return;
  }
  const b = req.body || {};
  const optionType = b.option_type === 'cuff' ? 'cuff' : 'collar';
  const name = String(b.name || '').trim();
  const subtitle = String(b.subtitle || '').trim();
  const detail = String(b.detail || '').trim();
  const stitchSpec = String(b.stitch_spec || '').trim();
  const imageUrl = String(b.image_url || '').trim();
  const isDefault = Boolean(b.is_default);
  const active = b.active !== false;

  if (!name) {
    res.status(400).json({ error: 'Option name is required.' });
    return;
  }

  try {
    const id = db.transaction(() => {
      const maxSort = db
        .prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM tailoring_options WHERE option_type = ?')
        .get(optionType) as { m: number };
      if (isDefault) {
        db.prepare('UPDATE tailoring_options SET is_default = 0 WHERE option_type = ?').run(optionType);
      }
      const info = db
        .prepare(
          `INSERT INTO tailoring_options (option_type, name, subtitle, detail, stitch_spec, image_url, sort_order, is_default, active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          optionType,
          name,
          subtitle,
          detail,
          stitchSpec,
          imageUrl,
          Number(maxSort.m) + 1,
          isDefault ? 1 : 0,
          active ? 1 : 0
        );
      return Number(info.lastInsertRowid);
    })();
    logAudit(user, 'TAILORING_OPTION_CREATED', `${optionType}:${name}`, `Created option #${id}`);
    res.status(201).json({ ok: true, id, options: getTailoringOptions(true) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not add option (check duplicate name).' });
  }
});

app.patch('/api/admin/tailoring-options/reorder', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions to reorder tailoring options.' });
    return;
  }
  const optionType = req.body?.optionType === 'cuff' ? 'cuff' : 'collar';
  const orderedIds: number[] = Array.isArray(req.body?.orderedIds)
    ? req.body.orderedIds.map((v: unknown) => Number(v)).filter((n: number) => Number.isFinite(n) && n > 0)
    : [];
  if (orderedIds.length === 0) {
    res.status(400).json({ error: 'orderedIds array is required.' });
    return;
  }

  db.transaction(() => {
    const stmt = db.prepare('UPDATE tailoring_options SET sort_order = ?, updated_at = datetime(\'now\') WHERE id = ? AND option_type = ?');
    orderedIds.forEach((optId, idx) => {
      stmt.run(idx + 1, optId, optionType);
    });
  })();

  logAudit(user, 'TAILORING_OPTIONS_REORDERED', optionType, `Order: ${orderedIds.join(',')}`);
  res.json({ ok: true, options: getTailoringOptions(true) });
});

app.post('/api/admin/tailoring-options/sync-products', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions.' });
    return;
  }
  const activeOpts = getTailoringOptions(false);
  const collarNames = activeOpts.filter((o) => o.option_type === 'collar').map((o) => o.name);
  const cuffNames = activeOpts.filter((o) => o.option_type === 'cuff').map((o) => o.name);
  const info = db
    .prepare('UPDATE products SET collars_json = ?, cuffs_json = ?')
    .run(JSON.stringify(collarNames), JSON.stringify(cuffNames));
  logAudit(user, 'TAILORING_OPTIONS_SYNCED', `${info.changes} products`, `${collarNames.length} collars, ${cuffNames.length} cuffs`);
  res.json({ ok: true, updatedProducts: info.changes });
});

app.patch('/api/admin/tailoring-options/bulk', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions to bulk save collar/cuff options.' });
    return;
  }

  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length === 0) {
    res.status(400).json({ error: 'Provide items array to save.' });
    return;
  }

  let updatedCount = 0;
  try {
    db.transaction(() => {
      const updateStmt = db.prepare(
        `UPDATE tailoring_options
         SET name = ?, subtitle = ?, detail = ?, stitch_spec = ?, image_url = ?, sort_order = ?, is_default = ?, active = ?, updated_at = datetime('now')
         WHERE id = ?`
      );
      const defaultWinners = new Map<string, number>();

      for (const raw of items) {
        const id = Number(raw?.id);
        if (!Number.isInteger(id) || id <= 0) continue;
        const existing = db.prepare('SELECT * FROM tailoring_options WHERE id = ?').get(id) as
          | Record<string, unknown>
          | undefined;
        if (!existing) continue;

        const nextName = raw.name !== undefined ? String(raw.name).trim() || String(existing.name) : String(existing.name);
        const nextSubtitle = raw.subtitle !== undefined ? String(raw.subtitle).trim() : String(existing.subtitle || '');
        const nextDetail = raw.detail !== undefined ? String(raw.detail).trim() : String(existing.detail || '');
        const nextStitch = raw.stitch_spec !== undefined ? String(raw.stitch_spec).trim() : String(existing.stitch_spec || '');
        const nextImage = raw.image_url !== undefined ? String(raw.image_url).trim() : String(existing.image_url || '');
        const nextSort = raw.sort_order !== undefined && Number.isFinite(Number(raw.sort_order))
          ? Number(raw.sort_order)
          : Number(existing.sort_order);
        const nextActive = raw.active !== undefined ? (raw.active ? 1 : 0) : Number(existing.active);
        const nextIsDefault = raw.is_default !== undefined ? (raw.is_default ? 1 : 0) : Number(existing.is_default);

        updateStmt.run(
          nextName,
          nextSubtitle,
          nextDetail,
          nextStitch,
          nextImage,
          nextSort,
          nextIsDefault,
          nextActive,
          id
        );
        if (nextIsDefault === 1) {
          defaultWinners.set(String(existing.option_type), id);
        }
        updatedCount++;
      }

      for (const [optType, winnerId] of defaultWinners.entries()) {
        db.prepare('UPDATE tailoring_options SET is_default = 0 WHERE option_type = ? AND id != ?').run(
          optType,
          winnerId
        );
        db.prepare('UPDATE tailoring_options SET is_default = 1 WHERE id = ?').run(winnerId);
      }
    })();

    logAudit(user, 'TAILORING_OPTIONS_BULK_SAVED', `${updatedCount} items`, 'Atomic bulk studio update');
    res.json({ ok: true, updatedCount, options: getTailoringOptions(true) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save collar & cuff options.' });
  }
});

app.patch('/api/admin/tailoring-options/:id', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions to edit collar/cuff option.' });
    return;
  }
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM tailoring_options WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Tailoring option not found.' });
    return;
  }

  const b = req.body || {};
  const nextName = b.name !== undefined ? String(b.name).trim() || String(existing.name) : String(existing.name);
  const nextSubtitle = b.subtitle !== undefined ? String(b.subtitle).trim() : String(existing.subtitle || '');
  const nextDetail = b.detail !== undefined ? String(b.detail).trim() : String(existing.detail || '');
  const nextStitch = b.stitch_spec !== undefined ? String(b.stitch_spec).trim() : String(existing.stitch_spec || '');
  const nextImage = b.image_url !== undefined ? String(b.image_url).trim() : String(existing.image_url || '');
  const nextSort = b.sort_order !== undefined ? Number(b.sort_order) : Number(existing.sort_order);
  const nextActive = b.active !== undefined ? (b.active ? 1 : 0) : Number(existing.active);
  const nextIsDefault = b.is_default !== undefined ? (b.is_default ? 1 : 0) : Number(existing.is_default);

  try {
    db.transaction(() => {
      if (nextIsDefault === 1) {
        db.prepare('UPDATE tailoring_options SET is_default = 0 WHERE option_type = ? AND id != ?').run(
          String(existing.option_type),
          id
        );
      }
      db.prepare(
        `UPDATE tailoring_options
         SET name = ?, subtitle = ?, detail = ?, stitch_spec = ?, image_url = ?, sort_order = ?, is_default = ?, active = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(nextName, nextSubtitle, nextDetail, nextStitch, nextImage, nextSort, nextIsDefault, nextActive, id);
    })();
    logAudit(user, 'TAILORING_OPTION_UPDATED', `${existing.option_type}:${nextName}`, `Default: ${Boolean(nextIsDefault)}`);
    res.json({ ok: true, options: getTailoringOptions(true) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update option.' });
  }
});

app.delete('/api/admin/tailoring-options/:id', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions.' });
    return;
  }
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM tailoring_options WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Option not found.' });
    return;
  }
  const optionType = String(existing.option_type);
  const countSame = (
    db.prepare('SELECT COUNT(*) AS c FROM tailoring_options WHERE option_type = ?').get(optionType) as { c: number }
  ).c;
  if (countSame <= 1) {
    res.status(400).json({ error: `At least one ${optionType} option must remain active.` });
    return;
  }

  db.transaction(() => {
    db.prepare('DELETE FROM tailoring_options WHERE id = ?').run(id);
    if (existing.is_default) {
      db.prepare(
        `UPDATE tailoring_options SET is_default = 1
         WHERE id = (SELECT id FROM tailoring_options WHERE option_type = ? ORDER BY active DESC, sort_order ASC, id ASC LIMIT 1)`
      ).run(optionType);
    }
  })();

  logAudit(user, 'TAILORING_OPTION_DELETED', `${optionType}:${existing.name}`, `Removed option #${id}`);
  res.json({ ok: true, options: getTailoringOptions(true) });
});

app.get('/api/admin/reports', requireStaffOrOwner, (_req, res) => {
  const orderRows = db.prepare('SELECT * FROM orders').all() as Array<Record<string, unknown>>;
  const byRegionMap = new Map<string, { region_code: RegionCode; currency_code: string; orders: number; paid_revenue: number; total_revenue: number; items_sold: number }>();

  const regionCurrencies: Array<{ code: RegionCode; currency: string }> = [
    { code: 'en', currency: 'USD' },
    { code: 'no', currency: 'NOK' },
    { code: 'it', currency: 'EUR' },
    { code: 'vn', currency: 'VND' },
  ];
  for (const rc of regionCurrencies) {
    byRegionMap.set(rc.code, {
      region_code: rc.code,
      currency_code: rc.currency,
      orders: 0,
      paid_revenue: 0,
      total_revenue: 0,
      items_sold: 0,
    });
  }

  const payMap = new Map<string, { payment_method: string; count: number; total_amount: number }>();
  const statusMap = new Map<string, number>();
  const skuMap = new Map<string, { sku: string; title: string; units_sold: number; revenue: number }>();

  for (const o of orderRows) {
    const rc = parseRegion(o.region_code);
    const total = Number(o.total || 0);
    const ordStatus = String(o.order_status || 'pending');
    const payStatus = String(o.payment_status || 'pending');
    const payMethod = String(o.payment_method || 'stripe');

    statusMap.set(ordStatus, (statusMap.get(ordStatus) || 0) + 1);
    const pEntry = payMap.get(payMethod) || { payment_method: payMethod, count: 0, total_amount: 0 };
    pEntry.count++;
    if (ordStatus !== 'cancelled') pEntry.total_amount += total;
    payMap.set(payMethod, pEntry);

    let items: Array<{ sku?: string; title?: string; quantity?: number; unitPrice?: number }> = [];
    try {
      items = JSON.parse(String(o.items_json || '[]'));
    } catch {
      items = [];
    }
    const qtySum = items.reduce((s, it) => s + Number(it.quantity || 1), 0);

    const regStat = byRegionMap.get(rc);
    if (regStat) {
      regStat.orders++;
      if (ordStatus !== 'cancelled') {
        regStat.total_revenue += total;
        regStat.items_sold += qtySum;
      }
      if (payStatus === 'paid') {
        regStat.paid_revenue += total;
      }
    }

    if (ordStatus !== 'cancelled') {
      for (const it of items) {
        const key = String(it.sku || 'UNKNOWN').split('-')[0] === 'MN' && String(it.sku).includes('-', 3)
          ? String(it.sku).split('-').slice(0, 2).join('-')
          : String(it.sku || 'UNKNOWN');
        const cur = skuMap.get(key) || {
          sku: key,
          title: String(it.title || key),
          units_sold: 0,
          revenue: 0,
        };
        const q = Number(it.quantity || 1);
        cur.units_sold += q;
        cur.revenue += q * Number(it.unitPrice || 0);
        skuMap.set(key, cur);
      }
    }
  }

  const totalSkus = (db.prepare('SELECT COUNT(*) AS c FROM products WHERE active = 1').get() as { c: number }).c;
  const lowStockAlerts = (db.prepare('SELECT COUNT(*) AS c FROM product_localizations WHERE stock_qty > 0 AND stock_qty <= 5').get() as { c: number }).c;
  const outOfStock = (db.prepare('SELECT COUNT(*) AS c FROM product_localizations WHERE stock_qty = 0').get() as { c: number }).c;
  const totalMovements = (db.prepare('SELECT COUNT(*) AS c FROM stock_movements').get() as { c: number }).c;

  // Approximate USD conversion rates strictly for cross-currency analytical chart comparison
  const toUsdRate: Record<RegionCode, number> = {
    en: 1,
    no: 0.095,
    it: 1.09,
    vn: 0.00004,
  };

  const countryGeo: Record<RegionCode, { country: string; lat: number; lng: number; hub_label: string }> = {
    en: { country: 'United States & Global', lat: 40.71, lng: -74.0, hub_label: 'Treviso -> Global Air' },
    no: { country: 'Norway', lat: 59.91, lng: 10.75, hub_label: 'Oslo Showroom Hub' },
    it: { country: 'Italy', lat: 45.67, lng: 12.24, hub_label: 'Treviso Atelier HQ' },
    vn: { country: 'Việt Nam', lat: 10.78, lng: 106.7, hub_label: 'Ho Chi Minh City Hub' },
  };

  const countryMap = new Map<RegionCode, {
    country: string;
    region_code: RegionCode;
    lat: number;
    lng: number;
    orders: number;
    revenue_usd_equiv: number;
    units_sold: number;
    hub_label: string;
  }>();
  for (const rc of ['it', 'no', 'vn', 'en'] as const) {
    countryMap.set(rc, {
      ...countryGeo[rc],
      region_code: rc,
      orders: 0,
      revenue_usd_equiv: 0,
      units_sold: 0,
    });
  }

  const dailyMap = new Map<string, { date: string; orders: number; revenue_usd_equiv: number; b2c_orders: number; b2b_orders: number }>();
  const productCatRows = db.prepare('SELECT id, sku, category_slug FROM products').all() as Array<{
    id: number;
    sku: string;
    category_slug: string;
  }>;
  const catByProductId = new Map<number, string>();
  const catBySkuPrefix = new Map<string, string>();
  for (const p of productCatRows) {
    catByProductId.set(p.id, p.category_slug);
    catBySkuPrefix.set(p.sku, p.category_slug);
  }
  const categoryMap = new Map<string, { category_slug: string; units_sold: number; revenue_usd_equiv: number }>();

  for (const o of orderRows) {
    const rc = parseRegion(o.region_code);
    const totalUsd = Number(o.total || 0) * toUsdRate[rc];
    const ordStatus = String(o.order_status || 'pending');
    if (ordStatus === 'cancelled') continue;

    let items: Array<{ productId?: number; sku?: string; quantity?: number; unitPrice?: number }> = [];
    try {
      items = JSON.parse(String(o.items_json || '[]'));
    } catch {
      items = [];
    }
    const qtySum = items.reduce((s, it) => s + Number(it.quantity || 1), 0);

    const cm = countryMap.get(rc);
    if (cm) {
      cm.orders++;
      cm.revenue_usd_equiv += Math.round(totalUsd);
      cm.units_sold += qtySum;
    }

    const dateKey = String(o.created_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
    const dEntry = dailyMap.get(dateKey) || {
      date: dateKey,
      orders: 0,
      revenue_usd_equiv: 0,
      b2c_orders: 0,
      b2b_orders: 0,
    };
    dEntry.orders++;
    dEntry.revenue_usd_equiv += Math.round(totalUsd);
    if (Boolean(o.is_b2b)) dEntry.b2b_orders++;
    else dEntry.b2c_orders++;
    dailyMap.set(dateKey, dEntry);

    for (const it of items) {
      const cat =
        (it.productId ? catByProductId.get(Number(it.productId)) : undefined) ||
        catBySkuPrefix.get(String(it.sku || '').split('-').slice(0, 2).join('-')) ||
        'linen';
      const cEntry = categoryMap.get(cat) || { category_slug: cat, units_sold: 0, revenue_usd_equiv: 0 };
      const q = Number(it.quantity || 1);
      cEntry.units_sold += q;
      cEntry.revenue_usd_equiv += Math.round(q * Number(it.unitPrice || 0) * toUsdRate[rc]);
      categoryMap.set(cat, cEntry);
    }
  }

  const visitorRows = db
    .prepare(
      `SELECT id, session_id, country, country_code, city, region_code, lat, lng, current_path, last_seen_at,
              CASE WHEN datetime(last_seen_at) >= datetime('now', '-10 minutes') THEN 1 ELSE 0 END AS is_active
       FROM visitor_sessions ORDER BY last_seen_at DESC LIMIT 100`
    )
    .all() as Array<Record<string, unknown>>;
  const visitorLocations = visitorRows.map((v) => ({
    ...v,
    is_active: Boolean(v.is_active),
  }));

  const visitorCountryMap = new Map<
    string,
    VisitorCountryRollup & { _cities: Set<string> }
  >();
  for (const v of visitorLocations as Array<{
    country?: unknown;
    country_code?: unknown;
    city?: unknown;
    lat?: unknown;
    lng?: unknown;
    is_active?: boolean;
  }>) {
    const cc = String(v.country_code || 'US').toUpperCase();
    const countryName = String(v.country || cc);
    const cityName = String(v.city || '').trim();
    const existing = visitorCountryMap.get(cc) || {
      country: countryName,
      country_code: cc,
      lat: Number(v.lat || 0),
      lng: Number(v.lng || 0),
      active_count: 0,
      total_count: 0,
      sample_cities: [],
      _cities: new Set<string>(),
    };
    existing.total_count++;
    if (v.is_active) existing.active_count++;
    if (cityName) existing._cities.add(cityName);
    visitorCountryMap.set(cc, existing);
  }
  const byVisitorCountry: VisitorCountryRollup[] = Array.from(visitorCountryMap.values())
    .map(({ _cities, ...rest }) => ({
      ...rest,
      sample_cities: Array.from(_cities).slice(0, 4),
    }))
    .sort((a, b) => b.active_count - a.active_count || b.total_count - a.total_count);

  res.json({
    byRegion: Array.from(byRegionMap.values()),
    byPaymentMethod: Array.from(payMap.values()),
    byStatus: Array.from(statusMap.entries()).map(([order_status, count]) => ({ order_status, count })),
    topSkus: Array.from(skuMap.values()).sort((a, b) => b.units_sold - a.units_sold).slice(0, 8),
    stockHealth: {
      total_skus: totalSkus,
      low_stock_alerts: lowStockAlerts,
      out_of_stock: outOfStock,
      total_movements: totalMovements,
    },
    byCountry: Array.from(countryMap.values()),
    visitorLocations,
    byVisitorCountry,
    activeVisitorsCount: visitorLocations.filter((v) => v.is_active).length,
    dailySeries: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    byCategory: Array.from(categoryMap.values()).sort((a, b) => b.units_sold - a.units_sold),
  });
});

// ---------------------------------------------------------------------------
// HERO SLIDER & SITE SETTINGS (PROMO POPUP, BULK TIERS, AI AGENT) MANAGEMENT
// ---------------------------------------------------------------------------

app.get('/api/admin/hero-slides', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions.' });
    return;
  }
  const slides = (
    db.prepare('SELECT * FROM hero_slides ORDER BY sort_order ASC, id ASC').all() as Array<
      Record<string, unknown>
    >
  ).map(hydrateHeroSlide);
  res.json({ slides });
});

app.post('/api/admin/hero-slides', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions.' });
    return;
  }
  const b = req.body || {};
  const info = db
    .prepare(
      `INSERT INTO hero_slides (
        sort_order, active, image_url, target_type, target_value, show_text, show_button,
        title_en, title_no, title_it, title_vn,
        subtitle_en, subtitle_no, subtitle_it, subtitle_vn,
        cta_en, cta_no, cta_it, cta_vn
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      Number(b.sort_order ?? 10),
      b.active === false ? 0 : 1,
      String(b.image_url || '/src/assets/images/hero_oxford_olive_1795248294228.jpg').trim(),
      b.target_type === 'view' ? 'view' : 'category',
      String(b.target_value || 'all').trim(),
      b.show_text === false ? 0 : 1,
      b.show_button === false ? 0 : 1,
      String(b.title_en || 'ITALIAN HERITAGE COLLECTION').trim(),
      String(b.title_no || b.title_en || 'ITALIENSK KOLLEKSJON').trim(),
      String(b.title_it || b.title_en || 'COLLEZIONE ITALIANA').trim(),
      String(b.title_vn || b.title_en || 'BỘ SƯU TẬP Ý').trim(),
      String(b.subtitle_en || '').trim(),
      String(b.subtitle_no || b.subtitle_en || '').trim(),
      String(b.subtitle_it || b.subtitle_en || '').trim(),
      String(b.subtitle_vn || b.subtitle_en || '').trim(),
      String(b.cta_en || 'Explore Collection').trim(),
      String(b.cta_no || 'Se Kolleksjonen').trim(),
      String(b.cta_it || 'Scopri la Collezione').trim(),
      String(b.cta_vn || 'Khám phá ngay').trim()
    );

  logAudit(user, 'HERO_SLIDE_CREATED', String(b.title_en || 'Hero Slide'), `ID #${info.lastInsertRowid}`);
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

app.patch('/api/admin/hero-slides/:id', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions.' });
    return;
  }
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM hero_slides WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Hero slide not found' });
    return;
  }
  const b = req.body || {};
  db.prepare(
    `UPDATE hero_slides SET
      sort_order = ?, active = ?, image_url = ?, target_type = ?, target_value = ?,
      show_text = ?, show_button = ?,
      title_en = ?, title_no = ?, title_it = ?, title_vn = ?,
      subtitle_en = ?, subtitle_no = ?, subtitle_it = ?, subtitle_vn = ?,
      cta_en = ?, cta_no = ?, cta_it = ?, cta_vn = ?
     WHERE id = ?`
  ).run(
    Number(b.sort_order ?? existing.sort_order),
    b.active !== undefined ? (b.active ? 1 : 0) : Number(existing.active),
    String(b.image_url ?? existing.image_url).trim(),
    b.target_type === 'view' ? 'view' : b.target_type === 'category' ? 'category' : String(existing.target_type),
    String(b.target_value ?? existing.target_value).trim(),
    b.show_text !== undefined ? (b.show_text ? 1 : 0) : Number(existing.show_text),
    b.show_button !== undefined ? (b.show_button ? 1 : 0) : Number(existing.show_button),
    String(b.title_en ?? existing.title_en).trim(),
    String(b.title_no ?? existing.title_no).trim(),
    String(b.title_it ?? existing.title_it).trim(),
    String(b.title_vn ?? existing.title_vn).trim(),
    String(b.subtitle_en ?? existing.subtitle_en).trim(),
    String(b.subtitle_no ?? existing.subtitle_no).trim(),
    String(b.subtitle_it ?? existing.subtitle_it).trim(),
    String(b.subtitle_vn ?? existing.subtitle_vn).trim(),
    String(b.cta_en ?? existing.cta_en).trim(),
    String(b.cta_no ?? existing.cta_no).trim(),
    String(b.cta_it ?? existing.cta_it).trim(),
    String(b.cta_vn ?? existing.cta_vn).trim(),
    id
  );
  logAudit(user, 'HERO_SLIDE_UPDATED', `Hero Slide #${id}`, `Show text=${Boolean(b.show_text ?? existing.show_text)}, btn=${Boolean(b.show_button ?? existing.show_button)}`);
  res.json({ ok: true });
});

app.delete('/api/admin/hero-slides/:id', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions.' });
    return;
  }
  const id = Number(req.params.id);
  db.prepare('DELETE FROM hero_slides WHERE id = ?').run(id);
  logAudit(user, 'HERO_SLIDE_DELETED', `Hero #${id}`, 'Deleted hero slide');
  res.json({ ok: true });
});

app.get('/api/admin/site-settings', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions to inspect storefront settings.' });
    return;
  }
  const ai = getAiSettingsInternal();
  const origin = resolveRequestOrigin(req);
  res.json({
    topBanner: getTopBannerSettings(),
    promoRules: getPromoRules(),
    bulkDiscount: getBulkDiscountSettings(),
    customerAuth: getCustomerAuthSettings(),
    googleCallbackUrl: `${origin}/api/auth/google/callback`,
    aiSettings: {
      enabled: Boolean(ai.enabled),
      displayMode: ai.displayMode === 'chatbot' ? 'chatbot' : 'agent',
      bubblePosition: ai.bubblePosition === 'left' ? 'left' : 'right',
      activeProvider: ai.activeProvider === 'openai' ? 'openai' : 'gemini',
      geminiModel: ai.geminiModel || 'gemini-4-hydrogen',
      openaiModel: ai.openaiModel || 'gpt-4o-mini',
      greeting_en: ai.greeting_en,
      greeting_no: ai.greeting_no,
      greeting_it: ai.greeting_it,
      greeting_vn: ai.greeting_vn,
      hasEnvGeminiKey: Boolean(process.env.GEMINI_API_KEY?.trim()),
      hasEnvOpenaiKey: Boolean(process.env.OPENAI_API_KEY?.trim()),
      hasStoredGeminiKey: Boolean(ai.geminiApiKey?.trim()),
      hasStoredOpenaiKey: Boolean(ai.openaiApiKey?.trim()),
      geminiKeyMasked: maskSecret(ai.geminiApiKey),
      openaiKeyMasked: maskSecret(ai.openaiApiKey),
    },
  });
});

app.patch('/api/admin/site-settings/:key', requirePermission('manage_settings'), (req: AuthedRequest, res) => {
  const key = String(req.params.key || '').trim();
  const body = req.body || {};

  if (key === 'promo_rules') {
    const cur = getPromoRules();
    const updated: PromotionPopupSettings = {
      ...cur,
      popupEnabled: body.popupEnabled !== undefined ? Boolean(body.popupEnabled) : cur.popupEnabled,
      showFloatingButton:
        body.showFloatingButton !== undefined ? Boolean(body.showFloatingButton) : cur.showFloatingButton,
      discountCode: String(body.discountCode ?? cur.discountCode).trim().toUpperCase() || 'MONTE10',
      discountPct: Math.max(0, Math.min(90, Number(body.discountPct ?? cur.discountPct))),
      firstOrderOnly: body.firstOrderOnly !== undefined ? Boolean(body.firstOrderOnly) : cur.firstOrderOnly,
      delaySeconds: Math.max(0, Math.min(60, Number(body.delaySeconds ?? cur.delaySeconds))),
      title_en: String(body.title_en ?? cur.title_en),
      title_no: String(body.title_no ?? cur.title_no),
      title_it: String(body.title_it ?? cur.title_it),
      title_vn: String(body.title_vn ?? cur.title_vn),
      subtitle_en: String(body.subtitle_en ?? cur.subtitle_en),
      subtitle_no: String(body.subtitle_no ?? cur.subtitle_no),
      subtitle_it: String(body.subtitle_it ?? cur.subtitle_it),
      subtitle_vn: String(body.subtitle_vn ?? cur.subtitle_vn),
      button_en: String(body.button_en ?? cur.button_en),
      button_no: String(body.button_no ?? cur.button_no),
      button_it: String(body.button_it ?? cur.button_it),
      button_vn: String(body.button_vn ?? cur.button_vn),
    };
    db.prepare(
      `INSERT INTO site_settings (key, value_json, updated_at) VALUES ('promo_rules', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')`
    ).run(JSON.stringify(updated));
    logAudit(req.authUser!, 'PROMO_RULES_UPDATED', updated.discountCode, `${updated.discountPct}% enabled=${updated.popupEnabled}`);
    res.json({ ok: true, promoRules: updated });
    return;
  }

  if (key === 'bulk_discount') {
    const cur = getBulkDiscountSettings();
    const tiers = Array.isArray(body.tiers)
      ? body.tiers
          .map((t: Record<string, unknown>) => ({
            minQty: Math.max(2, Math.floor(Number(t.minQty || 2))),
            discountPct: Math.max(1, Math.min(90, Number(t.discountPct || 5))),
          }))
          .sort((a: { minQty: number }, b: { minQty: number }) => a.minQty - b.minQty)
      : cur.tiers;
    const updated: BulkDiscountSettings = {
      enabled: body.enabled !== undefined ? Boolean(body.enabled) : cur.enabled,
      stackWithCoupon: body.stackWithCoupon !== undefined ? Boolean(body.stackWithCoupon) : cur.stackWithCoupon,
      tiers,
    };
    db.prepare(
      `INSERT INTO site_settings (key, value_json, updated_at) VALUES ('bulk_discount', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')`
    ).run(JSON.stringify(updated));
    logAudit(req.authUser!, 'BULK_DISCOUNT_UPDATED', 'tiers', `enabled=${updated.enabled}, stack=${updated.stackWithCoupon}`);
    res.json({ ok: true, bulkDiscount: updated });
    return;
  }

  if (key === 'ai_settings') {
    const cur = getAiSettingsInternal();
    const nextGeminiKey = body.clearGeminiKey
      ? ''
      : typeof body.geminiApiKey === 'string' && body.geminiApiKey.trim() && !body.geminiApiKey.includes('••••')
      ? body.geminiApiKey.trim()
      : cur.geminiApiKey || '';

    const nextOpenaiKey = body.clearOpenaiKey
      ? ''
      : typeof body.openaiApiKey === 'string' && body.openaiApiKey.trim() && !body.openaiApiKey.includes('••••')
      ? body.openaiApiKey.trim()
      : cur.openaiApiKey || '';

    const updated: InternalAiSettings = {
      enabled: body.enabled !== undefined ? Boolean(body.enabled) : cur.enabled,
      displayMode: body.displayMode === 'chatbot' ? 'chatbot' : body.displayMode === 'agent' ? 'agent' : cur.displayMode,
      bubblePosition: body.bubblePosition === 'left' ? 'left' : body.bubblePosition === 'right' ? 'right' : cur.bubblePosition,
      activeProvider: body.activeProvider === 'openai' ? 'openai' : body.activeProvider === 'gemini' ? 'gemini' : cur.activeProvider,
      geminiModel: String(body.geminiModel ?? cur.geminiModel).trim() || 'gemini-4-hydrogen',
      openaiModel: String(body.openaiModel ?? cur.openaiModel).trim() || 'gpt-4o-mini',
      geminiApiKey: nextGeminiKey,
      openaiApiKey: nextOpenaiKey,
      greeting_en: String(body.greeting_en ?? cur.greeting_en),
      greeting_no: String(body.greeting_no ?? cur.greeting_no),
      greeting_it: String(body.greeting_it ?? cur.greeting_it),
      greeting_vn: String(body.greeting_vn ?? cur.greeting_vn),
    };

    db.prepare(
      `INSERT INTO site_settings (key, value_json, updated_at) VALUES ('ai_settings', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')`
    ).run(JSON.stringify(updated));
    logAudit(req.authUser!, 'AI_SETTINGS_UPDATED', updated.activeProvider, `mode=${updated.displayMode}, enabled=${updated.enabled}`);
    res.json({
      ok: true,
      aiSettings: {
        enabled: updated.enabled,
        displayMode: updated.displayMode,
        bubblePosition: updated.bubblePosition,
        activeProvider: updated.activeProvider,
        geminiModel: updated.geminiModel,
        openaiModel: updated.openaiModel,
        greeting_en: updated.greeting_en,
        greeting_no: updated.greeting_no,
        greeting_it: updated.greeting_it,
        greeting_vn: updated.greeting_vn,
        hasEnvGeminiKey: Boolean(process.env.GEMINI_API_KEY?.trim()),
        hasEnvOpenaiKey: Boolean(process.env.OPENAI_API_KEY?.trim()),
        hasStoredGeminiKey: Boolean(updated.geminiApiKey?.trim()),
        hasStoredOpenaiKey: Boolean(updated.openaiApiKey?.trim()),
        geminiKeyMasked: maskSecret(updated.geminiApiKey),
        openaiKeyMasked: maskSecret(updated.openaiApiKey),
      },
    });
    return;
  }

  if (key === 'top_banner') {
    const cur = getTopBannerSettings();
    const nextVis =
      body.visibility === 'desktop_only' || body.visibility === 'mobile_only' || body.visibility === 'both'
        ? body.visibility
        : cur.visibility;
    const updated: TopBannerSettings = {
      enabled: body.enabled !== undefined ? Boolean(body.enabled) : cur.enabled,
      visibility: nextVis,
      text_en: String(body.text_en ?? cur.text_en).trim(),
      text_no: String(body.text_no ?? cur.text_no).trim(),
      text_it: String(body.text_it ?? cur.text_it).trim(),
      text_vn: String(body.text_vn ?? cur.text_vn).trim(),
      linkView:
        body.linkView === 'catalog' || body.linkView === 'b2b' || body.linkView === 'about' || body.linkView === 'none'
          ? body.linkView
          : cur.linkView,
      linkCategory: String(body.linkCategory ?? cur.linkCategory ?? 'all').trim() || 'all',
      bgColor: String(body.bgColor ?? cur.bgColor ?? '#142B4E').trim(),
      textColor: String(body.textColor ?? cur.textColor ?? '#FFFFFF').trim(),
    };
    db.prepare(
      `INSERT INTO site_settings (key, value_json, updated_at) VALUES ('top_banner', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')`
    ).run(JSON.stringify(updated));
    logAudit(req.authUser!, 'TOP_BANNER_UPDATED', updated.visibility, `enabled=${updated.enabled}`);
    res.json({ ok: true, topBanner: updated });
    return;
  }

  if (key === 'customer_auth') {
    const cur = getCustomerAuthSettings();
    const updated: CustomerAuthSettings = {
      googleLoginEnabled:
        body.googleLoginEnabled !== undefined ? Boolean(body.googleLoginEnabled) : cur.googleLoginEnabled,
      showCornerPopup:
        body.showCornerPopup !== undefined ? Boolean(body.showCornerPopup) : cur.showCornerPopup,
      autoSubscribeMailchimp:
        body.autoSubscribeMailchimp !== undefined ? Boolean(body.autoSubscribeMailchimp) : cur.autoSubscribeMailchimp,
      cornerPopupDelaySeconds: Math.max(
        0,
        Math.min(30, Number(body.cornerPopupDelaySeconds ?? cur.cornerPopupDelaySeconds))
      ),
    };
    db.prepare(
      `INSERT INTO site_settings (key, value_json, updated_at) VALUES ('customer_auth', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')`
    ).run(JSON.stringify(updated));
    logAudit(
      req.authUser!,
      'CUSTOMER_AUTH_UPDATED',
      'google_oauth',
      `enabled=${updated.googleLoginEnabled}, cornerPopup=${updated.showCornerPopup}, autoMailchimp=${updated.autoSubscribeMailchimp}`
    );
    res.json({ ok: true, customerAuth: updated });
    return;
  }

  res.status(400).json({ error: 'Unknown site settings key.' });
});

// ---------------------------------------------------------------------------
// STOREFRONT NAVIGATION & MEGA-MENU MANAGEMENT (ADMIN)
// ---------------------------------------------------------------------------

app.get('/api/admin/menu', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions to manage navigation.' });
    return;
  }
  const categories = (
    db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC').all() as Array<
      Record<string, unknown>
    >
  ).map(hydrateCategoryRow);
  const menuItems = (
    db.prepare('SELECT * FROM menu_items ORDER BY sort_order ASC, id ASC').all() as Array<
      Record<string, unknown>
    >
  ).map((m) => ({
    ...m,
    active: Boolean(m.active),
  }));
  res.json({ categories, menuItems });
});

app.get('/api/admin/categories', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions to inspect categories.' });
    return;
  }
  const categories = (
    db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC').all() as Array<
      Record<string, unknown>
    >
  ).map(hydrateCategoryRow);
  res.json({ categories });
});

app.post('/api/admin/menu/items', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions.' });
    return;
  }
  const b = req.body || {};
  const slot = b.slot === 'nav_link' ? 'nav_link' : 'mega_card';
  const targetType = b.target_type === 'view' ? 'view' : 'category';
  const targetValue = String(b.target_value || 'all').trim();
  const sortOrder = Number(b.sort_order ?? 10);
  const active = b.active === false ? 0 : 1;
  const titleEn = String(b.title_en || 'NEW COLLECTION').trim();
  const titleNo = String(b.title_no || titleEn).trim();
  const titleIt = String(b.title_it || titleEn).trim();
  const titleVn = String(b.title_vn || titleEn).trim();
  const imageUrl = String(b.image_url || '/src/assets/images/shirt_beige_linen_1795248293982.jpg').trim();

  const info = db
    .prepare(
      `INSERT INTO menu_items (slot, target_type, target_value, sort_order, active, title_en, title_no, title_it, title_vn, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(slot, targetType, targetValue, sortOrder, active, titleEn, titleNo, titleIt, titleVn, imageUrl);

  logAudit(user, 'MENU_ITEM_CREATED', titleEn, `Target: ${targetType}:${targetValue}`);
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

app.patch('/api/admin/menu/items/:id', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions.' });
    return;
  }
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Menu item not found' });
    return;
  }
  const b = req.body || {};
  const slot = b.slot === 'nav_link' ? 'nav_link' : b.slot === 'mega_card' ? 'mega_card' : String(existing.slot);
  const targetType =
    b.target_type === 'view' ? 'view' : b.target_type === 'category' ? 'category' : String(existing.target_type);
  const targetValue = String(b.target_value ?? existing.target_value).trim();
  const sortOrder = Number(b.sort_order ?? existing.sort_order);
  const active = b.active !== undefined ? (b.active ? 1 : 0) : Number(existing.active);
  const titleEn = String(b.title_en ?? existing.title_en).trim();
  const titleNo = String(b.title_no ?? existing.title_no).trim();
  const titleIt = String(b.title_it ?? existing.title_it).trim();
  const titleVn = String(b.title_vn ?? existing.title_vn).trim();
  const imageUrl = String(b.image_url ?? existing.image_url).trim();

  db.prepare(
    `UPDATE menu_items SET
      slot = ?, target_type = ?, target_value = ?, sort_order = ?, active = ?,
      title_en = ?, title_no = ?, title_it = ?, title_vn = ?, image_url = ?
     WHERE id = ?`
  ).run(slot, targetType, targetValue, sortOrder, active, titleEn, titleNo, titleIt, titleVn, imageUrl, id);

  logAudit(user, 'MENU_ITEM_UPDATED', titleEn, `Menu item #${id}`);
  res.json({ ok: true });
});

app.delete('/api/admin/menu/items/:id', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions.' });
    return;
  }
  const id = Number(req.params.id);
  db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
  logAudit(user, 'MENU_ITEM_DELETED', `Menu #${id}`, 'Removed mega-menu item');
  res.json({ ok: true });
});

app.post('/api/admin/categories', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions.' });
    return;
  }
  const b = req.body || {};
  const slug = slugifyCategoryName(String(b.slug || b.name_en || ''));
  if (!slug) {
    res.status(400).json({ error: 'Valid category slug is required.' });
    return;
  }
  const parentId =
    b.parent_id !== undefined && b.parent_id !== null && b.parent_id !== ''
      ? Number(b.parent_id)
      : null;
  const scope = b.scope === 'b2c' || b.scope === 'b2b' ? b.scope : 'both';
  const active = b.active === false ? 0 : 1;
  const sortOrder = Number(b.sort_order ?? 10);
  const nameEn = String(b.name_en || slug).trim();
  const nameNo = String(b.name_no || nameEn).trim();
  const nameIt = String(b.name_it || nameEn).trim();
  const nameVn = String(b.name_vn || nameEn).trim();

  try {
    const info = db
      .prepare(
        `INSERT INTO categories (slug, parent_id, scope, active, sort_order, name_en, name_no, name_it, name_vn)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(slug, parentId, scope, active, sortOrder, nameEn, nameNo, nameIt, nameVn);
    logAudit(user, 'CATEGORY_CREATED', slug, `${nameEn} (${scope})`);
    res.status(201).json({ id: Number(info.lastInsertRowid) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not create category' });
  }
});

app.patch('/api/admin/categories/:id', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions.' });
    return;
  }
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  const b = req.body || {};
  const nextParent =
    b.parent_id === undefined
      ? (existing.parent_id as number | null)
      : b.parent_id === null || b.parent_id === '' || Number(b.parent_id) === id
      ? null
      : Number(b.parent_id);
  const nextScope = b.scope === 'b2c' || b.scope === 'b2b' || b.scope === 'both' ? b.scope : String(existing.scope || 'both');
  const nextActive = b.active !== undefined ? (b.active ? 1 : 0) : Number(existing.active ?? 1);

  db.prepare(
    `UPDATE categories SET parent_id = ?, scope = ?, active = ?, sort_order = ?, name_en = ?, name_no = ?, name_it = ?, name_vn = ? WHERE id = ?`
  ).run(
    nextParent,
    nextScope,
    nextActive,
    Number(b.sort_order ?? existing.sort_order),
    String(b.name_en ?? existing.name_en).trim(),
    String(b.name_no ?? existing.name_no).trim(),
    String(b.name_it ?? existing.name_it).trim(),
    String(b.name_vn ?? existing.name_vn).trim(),
    id
  );
  logAudit(user, 'CATEGORY_UPDATED', String(existing.slug), `Updated scope=${nextScope}, active=${Boolean(nextActive)}`);
  res.json({ ok: true });
});

app.post('/api/admin/categories/reorder', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions.' });
    return;
  }
  const orderedIds: number[] = Array.isArray(req.body?.orderedIds)
    ? req.body.orderedIds.map((x: unknown) => Number(x)).filter((n: number) => Number.isFinite(n) && n > 0)
    : [];
  if (orderedIds.length === 0) {
    res.status(400).json({ error: 'orderedIds array is required.' });
    return;
  }
  const tx = db.transaction(() => {
    orderedIds.forEach((cid: number, idx: number) => {
      db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?').run((idx + 1) * 10, cid);
    });
  });
  tx();
  logAudit(user, 'CATEGORIES_REORDERED', `${orderedIds.length} categories`, 'Drag-and-drop sort updated');
  res.json({ ok: true });
});

app.post('/api/admin/categories/import-wp', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions.' });
    return;
  }
  const xmlText = String(req.body?.xmlText || '').trim();
  const defaultScope = req.body?.scope === 'b2c' || req.body?.scope === 'b2b' ? req.body.scope : 'both';
  if (!xmlText) {
    res.status(400).json({ error: 'Provide WordPress WXR XML or WooCommerce XML export content.' });
    return;
  }
  const { categories: parsed, errors } = parseWordPressCategoriesXml(xmlText);
  if (parsed.length === 0) {
    res.status(400).json({ error: errors[0] || 'No <wp:term> or <wp:category> entries detected in XML.' });
    return;
  }

  let importedCount = 0;
  let updatedCount = 0;

  const tx = db.transaction(() => {
    // Pass 1: insert or update all categories with sort_order
    parsed.forEach((item, idx: number) => {
      const itemScope = defaultScope;
      const existing = db.prepare('SELECT id FROM categories WHERE slug = ?').get(item.slug) as
        | { id: number }
        | undefined;
      if (existing) {
        db.prepare(
          `UPDATE categories SET name_en = ?, name_no = ?, name_it = ?, name_vn = ?, scope = ? WHERE id = ?`
        ).run(item.name, item.name, item.name, item.name, itemScope, existing.id);
        updatedCount++;
      } else {
        db.prepare(
          `INSERT INTO categories (slug, parent_id, scope, active, sort_order, name_en, name_no, name_it, name_vn)
           VALUES (?, NULL, ?, 1, ?, ?, ?, ?, ?)`
        ).run(item.slug, itemScope, 100 + idx * 10, item.name, item.name, item.name, item.name);
        importedCount++;
      }
    });

    // Pass 2: link parent_slug -> parent_id
    for (const item of parsed) {
      if (!item.parentSlug) continue;
      const parentRow = db.prepare('SELECT id FROM categories WHERE slug = ?').get(item.parentSlug) as
        | { id: number }
        | undefined;
      if (parentRow) {
        db.prepare('UPDATE categories SET parent_id = ? WHERE slug = ? AND id != ?').run(
          parentRow.id,
          item.slug,
          parentRow.id
        );
      }
    }
  });

  tx();
  logAudit(
    user,
    'WP_CATEGORIES_IMPORTED',
    `${parsed.length} WP terms`,
    `Inserted ${importedCount}, updated ${updatedCount}`
  );
  res.json({ ok: true, importedCount, updatedCount, total: parsed.length, errors });
});

app.delete('/api/admin/categories/:id', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_products') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions.' });
    return;
  }
  const id = Number(req.params.id);
  db.prepare('UPDATE categories SET parent_id = NULL WHERE parent_id = ?').run(id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  logAudit(user, 'CATEGORY_DELETED', `Category #${id}`, 'Deleted navigation category');
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// MULTI-LANGUAGE RESEND EMAIL LOGS & TEST SENDER
// ---------------------------------------------------------------------------

app.get('/api/admin/emails', requireStaffOrOwner, (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_orders') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions to inspect email delivery logs.' });
    return;
  }
  const emails = db.prepare('SELECT * FROM email_logs ORDER BY id DESC LIMIT 80').all();
  res.json({
    emails,
    resend: getGatewayConfigurationStatus().resend,
  });
});

app.post('/api/admin/emails/test', requireStaffOrOwner, async (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (!hasPermission(user, 'manage_orders') && !hasPermission(user, 'manage_settings')) {
    res.status(403).json({ error: 'Insufficient permissions.' });
    return;
  }
  const to = String(req.body?.to || user.email || '').trim();
  const regionCode = parseRegion(req.body?.regionCode);
  const templateType = req.body?.templateType === 'shipping_tracking' ? 'shipping_tracking' : 'order_confirmation';
  if (!to || !to.includes('@')) {
    res.status(400).json({ error: 'Valid recipient email address is required.' });
    return;
  }
  const region = getRegionByCode(regionCode) || getAllRegions()[0];
  const emailLog = await sendResendTestEmail({ recipientEmail: to, region, templateType });
  logAudit(user, 'TEST_EMAIL_SENT', to, `${templateType} (${regionCode.toUpperCase()}) -> ${emailLog.status}`);
  res.json({ ok: true, emailLog });
});

// ---------------------------------------------------------------------------
// OWNER-ONLY API CREDENTIALS VAULT & GATEWAY ONBOARDING (PAYPAL, STRIPE, WIX)
// ---------------------------------------------------------------------------

app.get('/api/admin/credentials', requirePermission('manage_settings'), (req: AuthedRequest, res) => {
  if (req.authUser?.role !== 'owner') {
    res.status(403).json({ error: 'API Credentials Vault is restricted to Owner accounts.' });
    return;
  }
  res.json({
    credentials: getCredentialsMaskedStatus(),
    gateways: getGatewayConfigurationStatus(),
  });
});

app.patch('/api/admin/credentials', requirePermission('manage_settings'), (req: AuthedRequest, res) => {
  if (req.authUser?.role !== 'owner') {
    res.status(403).json({ error: 'API Credentials Vault is restricted to Owner accounts.' });
    return;
  }
  const updates = (req.body?.credentials || {}) as Partial<Record<ApiCredentialKey, string | null>>;
  updateStoredCredentials(updates);
  const credentials = getCredentialsMaskedStatus();
  const changedCount = Object.keys(updates).length;
  logAudit(req.authUser, 'API_CREDENTIALS_UPDATED', `${changedCount} key(s)`, 'Owner API Vault saved');
  res.json({
    ok: true,
    credentials,
    gateways: getGatewayConfigurationStatus(),
  });
});

app.post('/api/admin/integrations/:provider/verify', requirePermission('manage_settings'), async (req: AuthedRequest, res) => {
  if (req.authUser?.role !== 'owner') {
    res.status(403).json({ error: 'Gateway verification is restricted to Owner accounts.' });
    return;
  }
  const rawProvider = String(req.params.provider || '').toLowerCase();
  const validProviders = ['google', 'paypal', 'stripe', 'wix', 'vipps', 'resend'] as const;
  const provider = validProviders.find((p) => p === rawProvider);
  if (!provider) {
    res.status(400).json({ error: `Unsupported integration provider: ${rawProvider}` });
    return;
  }
  const result = await verifyProviderOnboarding(provider);
  logAudit(req.authUser, 'INTEGRATION_VERIFIED', provider.toUpperCase(), `${result.mode}: ${result.message}`);
  res.json({ result, gateways: getGatewayConfigurationStatus() });
});

app.get('/api/admin/integrations/wix/auth-url', requirePermission('manage_settings'), (req: AuthedRequest, res) => {
  if (req.authUser?.role !== 'owner') {
    res.status(403).json({ error: 'Wix onboarding is restricted to Owner accounts.' });
    return;
  }
  const state = crypto.randomBytes(16).toString('hex');
  wixOauthStates.set(state, { userId: req.authUser.id, expiresAt: Date.now() + 10 * 60 * 1000 });
  const appUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
  const redirectUri = `${appUrl}/api/integrations/wix/callback`;
  const authInfo = buildWixAuthorizeUrl(redirectUri, state);
  res.json({ ...authInfo, authUrl: authInfo.url });
});

app.get('/api/integrations/wix/callback', async (req, res) => {
  const code = String(req.query.code || '').trim();
  const state = String(req.query.state || '').trim();
  const stateEntry = wixOauthStates.get(state);
  if (!state || !stateEntry || stateEntry.expiresAt < Date.now()) {
    res.status(400).send('Invalid or expired Wix OAuth state token. Return to Admin -> API Vault & Onboarding to restart.');
    return;
  }
  wixOauthStates.delete(state);
  if (!code) {
    res.status(400).send('Missing Wix authorization code.');
    return;
  }
  const exchange = await exchangeWixOAuthCode(code);
  const statusMsg = exchange.ok
    ? 'Wix OAuth access token obtained successfully.'
    : exchange.error || 'Wix OAuth failed.';
  res
    .status(exchange.ok ? 200 : 400)
    .setHeader('Content-Type', 'text/html; charset=utf-8')
    .send(
      `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;padding:40px;color:#1A1A1A;background:#F7F7F7;">
        <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:28px;">
          <h1 style="font-size:16px;margin:0 0 8px;text-transform:uppercase;color:#142B4E;">Wix OAuth Onboarding</h1>
          <p style="font-size:13px;line-height:1.6;">${statusMsg.replace(/</g, '&lt;')}</p>
          <p style="font-size:12px;color:#666;">You can close this tab and refresh API Vault & Onboarding in the Admin panel.</p>
        </div>
      </body></html>`
    );
});

// ---------------------------------------------------------------------------
// OWNER-ONLY SQLITE DATABASE INSPECTOR & LIVE BACKUP DOWNLOAD
// ---------------------------------------------------------------------------

const INSPECTABLE_TABLES = [
  'regions',
  'categories',
  'menu_items',
  'hero_slides',
  'site_settings',
  'products',
  'product_localizations',
  'product_variants',
  'orders',
  'b2b_inquiries',
  'newsletter_subscribers',
  'media',
  'tailoring_size_specs',
  'stock_movements',
  'visitor_sessions',
  'email_logs',
  'users',
  'audit_logs',
] as const;

app.get('/api/admin/database/overview', requirePermission('manage_settings'), (req: AuthedRequest, res) => {
  if (req.authUser?.role !== 'owner') {
    res.status(403).json({ error: 'Database inspection is restricted to Owner accounts.' });
    return;
  }

  let fileSizeBytes = 0;
  try {
    if (fs.existsSync(DB_PATH)) {
      fileSizeBytes = fs.statSync(DB_PATH).size;
    }
  } catch {
    fileSizeBytes = 0;
  }

  const journalRow = db.pragma('journal_mode', { simple: true });
  const tables = INSPECTABLE_TABLES.map((tableName) => {
    const countRow = db.prepare(`SELECT COUNT(*) AS c FROM ${tableName}`).get() as { c: number };
    const infoRows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
    const columns = infoRows
      .map((c) => c.name)
      .filter((col) => !(tableName === 'users' && col === 'password_hash'));
    return {
      name: tableName,
      rowCount: countRow.c,
      columns,
    };
  });

  res.json({
    engine: 'SQLite 3 (better-sqlite3)',
    dbPath: DB_PATH,
    relativePath: 'data/montenapoleone.db',
    uploadsPath: UPLOADS_DIR,
    journalMode: String(journalRow || 'wal'),
    fileSizeBytes,
    tables,
  });
});

app.get('/api/admin/database/table/:name', requirePermission('manage_settings'), (req: AuthedRequest, res) => {
  if (req.authUser?.role !== 'owner') {
    res.status(403).json({ error: 'Database inspection is restricted to Owner accounts.' });
    return;
  }

  const tableName = String(req.params.name || '').trim();
  if (!(INSPECTABLE_TABLES as readonly string[]).includes(tableName)) {
    res.status(400).json({ error: 'Invalid or non-inspectable table name.' });
    return;
  }

  const infoRows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  const safeColumns = infoRows
    .map((c) => c.name)
    .filter((col) => !(tableName === 'users' && col === 'password_hash'));

  const rawRows = db
    .prepare(`SELECT ${safeColumns.join(', ')} FROM ${tableName} ORDER BY 1 DESC LIMIT 25`)
    .all() as Array<Record<string, unknown>>;

  const rows =
    tableName === 'site_settings'
      ? rawRows.map((r) => {
          if (r.key === 'ai_settings') {
            return {
              ...r,
              value_json: JSON.stringify(getPublicAiConfig()),
            };
          }
          return r;
        })
      : rawRows;

  res.json({ table: tableName, columns: safeColumns, rows });
});

app.get('/api/admin/database/download', requirePermission('manage_settings'), async (req: AuthedRequest, res) => {
  if (req.authUser?.role !== 'owner') {
    res.status(403).json({ error: 'Database backup download is restricted to Owner accounts.' });
    return;
  }

  const format = String(req.query.format || 'json').toLowerCase();
  if (format === 'sqlite' || format === 'db') {
    const tmpBackup = path.join(path.dirname(DB_PATH), `backup-${Date.now()}.db`);
    try {
      await db.backup(tmpBackup);
      logAudit(req.authUser, 'DB_SNAPSHOT_DOWNLOADED', 'montenapoleone.db', 'SQLite binary snapshot');
      res.download(tmpBackup, 'montenapoleone-backup.db', () => {
        if (fs.existsSync(tmpBackup)) {
          try {
            fs.unlinkSync(tmpBackup);
          } catch {
            // ignore cleanup error
          }
        }
      });
    } catch (err) {
      if (fs.existsSync(tmpBackup)) fs.unlinkSync(tmpBackup);
      res.status(500).json({ error: err instanceof Error ? err.message : 'Backup failed' });
    }
    return;
  }

  const snapshot: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    engine: 'SQLite 3 (better-sqlite3)',
    tables: {},
  };
  const tablesObj: Record<string, unknown> = {};
  for (const tableName of INSPECTABLE_TABLES) {
    const infoRows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
    const safeColumns = infoRows
      .map((c) => c.name)
      .filter((col) => !(tableName === 'users' && col === 'password_hash'));
    const rawTableRows = db.prepare(`SELECT ${safeColumns.join(', ')} FROM ${tableName}`).all() as Array<
      Record<string, unknown>
    >;
    tablesObj[tableName] =
      tableName === 'site_settings'
        ? rawTableRows.map((r) => (r.key === 'ai_settings' ? { ...r, value_json: JSON.stringify(getPublicAiConfig()) } : r))
        : rawTableRows;
  }
  snapshot.tables = tablesObj;

  logAudit(req.authUser, 'DB_JSON_EXPORTED', 'montenapoleone-backup.json', 'Full database JSON snapshot');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="montenapoleone-backup.json"');
  res.send(JSON.stringify(snapshot, null, 2));
});

// ---------------------------------------------------------------------------
// SEO: ROBOTS.TXT, DYNAMIC SITEMAP.XML & SERVER-SIDE META INJECTION
// ---------------------------------------------------------------------------

function resolveRequestOrigin(req: express.Request): string {
  const vaultDomain = (getResolvedSecret('PUBLIC_DOMAIN_URL') || '').trim().replace(/\/+$/, '');
  if (vaultDomain && /^https?:\/\//i.test(vaultDomain)) {
    return vaultDomain;
  }

  const forwardedHost = String(req.get('x-forwarded-host') || '').split(',')[0].trim();
  const rawHost = (forwardedHost || req.get('host') || '').trim();
  const isLocalHost =
    !rawHost ||
    rawHost.startsWith('localhost') ||
    rawHost.startsWith('127.0.0.1') ||
    rawHost.startsWith('0.0.0.0');

  if (!isLocalHost) {
    const proto =
      String(req.get('x-forwarded-proto') || '').split(',')[0].trim() || req.protocol || 'https';
    return `${proto}://${rawHost}`;
  }

  const configured = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (configured && configured !== 'MY_APP_URL') return configured;

  const fallbackHost = rawHost || 'localhost:3000';
  const fallbackProto =
    String(req.get('x-forwarded-proto') || '').split(',')[0].trim() || req.protocol || 'http';
  return `${fallbackProto}://${fallbackHost}`;
}

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function injectSeoIntoHtml(html: string, req: express.Request): string {
  const parsed = parseStorefrontUrl(req.path || '/');
  const rc: RegionCode = parsed.region || parseRegion(req.query.region);
  const region = getRegionByCode(rc) || {
    code: rc,
    name: 'International',
    currency_code: 'USD',
    warehouse_name: 'Treviso Global Hub',
  };

  let productRecord: {
    sku: string;
    slug: string;
    title: string;
    subtitle?: string;
    description: string;
    fabric_spec: string;
    price: number;
    primary_image: string;
    gallery?: string[];
    stock_qty: number;
    preorder_allowed: boolean;
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string;
    average_rating?: number;
    review_count?: number;
    reviews?: Array<{ customer_name: string; rating: number; title: string; comment: string; created_at: string }>;
  } | null = null;

  if (parsed.view === 'product' && parsed.slug) {
    const pRow = db
      .prepare(
        `SELECT p.id, p.sku, p.slug, p.fabric_spec, p.primary_image, p.gallery_json, p.preorder_allowed,
                pl.title, pl.subtitle, pl.description, pl.price, pl.stock_qty,
                pl.seo_title, pl.seo_description, pl.seo_keywords
         FROM products p
         JOIN product_localizations pl ON pl.product_id = p.id AND pl.region_code = ?
         WHERE p.slug = ? AND p.active = 1
         LIMIT 1`
      )
      .get(rc, parsed.slug) as Record<string, unknown> | undefined;
    if (pRow) {
      let gallery: string[] = [];
      try {
        gallery = JSON.parse(String(pRow.gallery_json || '[]'));
      } catch {
        gallery = [];
      }
      const reviewRows = db
        .prepare(
          `SELECT customer_name, rating, title, comment, created_at
           FROM product_reviews
           WHERE product_id = ?
           ORDER BY id DESC LIMIT 10`
        )
        .all(Number(pRow.id)) as Array<{
        customer_name: string;
        rating: number;
        title: string;
        comment: string;
        created_at: string;
      }>;
      const statsRow = db
        .prepare('SELECT COUNT(*) AS c, ROUND(AVG(rating), 1) AS avg_r FROM product_reviews WHERE product_id = ?')
        .get(Number(pRow.id)) as { c: number; avg_r: number | null };

      productRecord = {
        sku: String(pRow.sku),
        slug: String(pRow.slug),
        title: String(pRow.title),
        subtitle: String(pRow.subtitle || ''),
        description: String(pRow.description),
        fabric_spec: String(pRow.fabric_spec),
        price: Number(pRow.price),
        primary_image: String(pRow.primary_image),
        gallery,
        stock_qty: Number(pRow.stock_qty),
        preorder_allowed: Boolean(pRow.preorder_allowed),
        seo_title: String(pRow.seo_title || ''),
        seo_description: String(pRow.seo_description || ''),
        seo_keywords: String(pRow.seo_keywords || ''),
        review_count: Number(statsRow?.c || 0),
        average_rating: Number(statsRow?.avg_r || 0),
        reviews: reviewRows,
      };
    }
  }

  let categoryRecord: {
    slug: string;
    name_en: string;
    name_no: string;
    name_it: string;
    name_vn: string;
  } | null = null;
  if (parsed.view === 'catalog' && parsed.category && parsed.category !== 'all') {
    const cRow = db
      .prepare('SELECT slug, name_en, name_no, name_it, name_vn FROM categories WHERE slug = ? LIMIT 1')
      .get(parsed.category) as Record<string, unknown> | undefined;
    if (cRow) {
      categoryRecord = {
        slug: String(cRow.slug),
        name_en: String(cRow.name_en),
        name_no: String(cRow.name_no),
        name_it: String(cRow.name_it),
        name_vn: String(cRow.name_vn),
      };
    }
  }

  const origin = resolveRequestOrigin(req);
  const seo = buildSeoMetadata({
    view: parsed.view,
    region,
    category: parsed.category,
    categoryRecord,
    product: productRecord,
    origin,
  });

  const htmlLang = rc === 'no' ? 'nb' : rc === 'vn' ? 'vi' : rc;
  const hreflangTags = seo.hreflangs
    .map((h) => `<link rel="alternate" hreflang="${escapeHtmlAttr(h.hreflang)}" href="${escapeHtmlAttr(h.href)}" />`)
    .join('\n    ');

  const productOpenGraphTags = seo.productMeta
    ? `\n    <meta property="product:price:amount" content="${escapeHtmlAttr(String(seo.productMeta.priceAmount))}" />` +
      `\n    <meta property="product:price:currency" content="${escapeHtmlAttr(seo.productMeta.priceCurrency)}" />` +
      `\n    <meta property="product:availability" content="${escapeHtmlAttr(seo.productMeta.availability)}" />` +
      `\n    <meta property="product:retailer_item_id" content="${escapeHtmlAttr(seo.productMeta.retailerItemId)}" />`
    : '';

  let out = html;
  out = out.replace(/<html lang="[^"]*">/, `<html lang="${htmlLang}">`);
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtmlAttr(seo.title)}</title>`);
  out = out.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapeHtmlAttr(seo.description)}" />`
  );
  if (out.includes('<meta name="keywords"')) {
    out = out.replace(
      /<meta name="keywords" content="[^"]*"\s*\/?>/,
      `<meta name="keywords" content="${escapeHtmlAttr(seo.keywords)}" />`
    );
  }
  out = out.replace(
    /<meta name="robots" content="[^"]*"\s*\/?>/,
    `<meta name="robots" content="${escapeHtmlAttr(seo.robots)}" />`
  );
  out = out.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${escapeHtmlAttr(seo.canonicalUrl)}" />`
  );
  out = out.replace(
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${escapeHtmlAttr(seo.title)}" />`
  );
  out = out.replace(
    /<meta property="og:description" content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${escapeHtmlAttr(seo.description)}" />`
  );
  out = out.replace(
    /<meta property="og:type" content="[^"]*"\s*\/?>/,
    `<meta property="og:type" content="${escapeHtmlAttr(seo.ogType)}" />\n    <meta property="og:site_name" content="${escapeHtmlAttr(seo.ogSiteName)}" />\n    <meta property="og:locale" content="${escapeHtmlAttr(seo.ogLocale)}" />\n    <meta property="og:url" content="${escapeHtmlAttr(seo.canonicalUrl)}" />\n    <meta property="og:image" content="${escapeHtmlAttr(seo.ogImage)}" />\n    <meta property="og:image:alt" content="${escapeHtmlAttr(seo.ogImageAlt)}" />${productOpenGraphTags}${hreflangTags ? `\n    ${hreflangTags}` : ''}`
  );
  out = out.replace(
    /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${escapeHtmlAttr(seo.title)}" />`
  );
  out = out.replace(
    /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${escapeHtmlAttr(seo.description)}" />`
  );
  out = out.replace(
    /<meta name="twitter:image" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:image" content="${escapeHtmlAttr(seo.ogImage)}" />`
  );
  out = out.replace(
    /<script id="mn-structured-data" type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script id="mn-structured-data" type="application/ld+json">${JSON.stringify(seo.jsonLd).replace(/</g, '\\u003c')}</script>`
  );
  return out;
}

app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(buildRobotsTxt(resolveRequestOrigin(req)));
});

app.get('/sitemap.xml', (req, res) => {
  const categories = db
    .prepare('SELECT slug FROM categories WHERE active = 1 ORDER BY sort_order ASC, id ASC')
    .all() as Array<{ slug: string }>;
  const products = db
    .prepare(
      `SELECT p.slug, p.primary_image, pl.title
       FROM products p
       LEFT JOIN product_localizations pl ON pl.product_id = p.id AND pl.region_code = 'en'
       WHERE p.active = 1
       ORDER BY p.id ASC`
    )
    .all() as Array<{ slug: string; primary_image: string; title: string | null }>;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.send(
    buildSitemapXml({
      origin: resolveRequestOrigin(req),
      regions: ['en', 'no', 'it', 'vn'],
      categories,
      products: products.map((p) => ({
        slug: p.slug,
        primary_image: p.primary_image,
        title: p.title || undefined,
      })),
    })
  );
});

// ---------------------------------------------------------------------------
// VITE MIDDLEWARE & STATIC PRODUCTION SERVING
// ---------------------------------------------------------------------------

async function startServer() {
  const PORT = 3000;
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir, { index: false }));
    app.get('*', (req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      const rawHtml = fs.readFileSync(indexPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(injectSeoIntoHtml(rawHtml, req));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(async (req, res, next) => {
      if (
        req.method !== 'GET' ||
        req.path.startsWith('/api') ||
        req.path.startsWith('/uploads') ||
        req.path.startsWith('/assets') ||
        req.path.startsWith('/src/') ||
        req.path.startsWith('/@') ||
        req.path.startsWith('/node_modules/') ||
        path.extname(req.path)
      ) {
        next();
        return;
      }
      const accept = String(req.headers.accept || '');
      if (accept && !accept.includes('text/html') && !accept.includes('*/*')) {
        next();
        return;
      }
      try {
        const rawTemplate = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        const transformed = await vite.transformIndexHtml(req.originalUrl, rawTemplate);
        const enriched = injectSeoIntoHtml(transformed, req);
        res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(enriched);
      } catch (err) {
        next(err);
      }
    });

    app.use(vite.middlewares);
  }

  const httpServer = http.createServer(app);
  const liveWss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    try {
      const reqUrl = new URL(req.url || '/', 'http://localhost');
      if (reqUrl.pathname === '/api/ai/live') {
        liveWss.handleUpgrade(req, socket, head, (ws) => {
          liveWss.emit('connection', ws, req);
        });
      }
    } catch {
      // ignore non-live upgrades
    }
  });

  liveWss.on('connection', async (clientWs, req) => {
    const reqUrl = new URL(req.url || '/', 'http://localhost');
    const regionCode = parseRegion(reqUrl.searchParams.get('region'));
    const aiSettings = getAiSettingsInternal();
    const geminiKey = (aiSettings.geminiApiKey || getResolvedSecret('GEMINI_API_KEY') || '').trim();

    if (!aiSettings.enabled) {
      clientWs.send(JSON.stringify({ error: 'AI Concierge is disabled by administration.' }));
      clientWs.close(1008);
      return;
    }
    if (!geminiKey) {
      clientWs.send(
        JSON.stringify({
          error: 'No GEMINI_API_KEY configured for Gemini Live Voice streaming.',
          code: 'NO_GEMINI_KEY',
        })
      );
      clientWs.close(1008);
      return;
    }

    const region = getRegionByCode(regionCode);
    const languageName =
      regionCode === 'no' ? 'Norwegian' : regionCode === 'it' ? 'Italian' : regionCode === 'vn' ? 'Vietnamese' : 'English';
    const liveProducts = db
      .prepare(
        `SELECT p.slug, p.sku, pl.title, pl.price, pl.stock_qty, p.fabric_spec
         FROM products p
         JOIN product_localizations pl ON pl.product_id = p.id AND pl.region_code = ?
         WHERE p.active = 1
         ORDER BY p.is_featured DESC, p.id ASC
         LIMIT 24`
      )
      .all(regionCode) as Array<Record<string, unknown>>;

    const liveCatalogLine = liveProducts
      .map((p) => `${p.title} (slug:${p.slug}, ${p.price} ${region?.currency_code || 'USD'}, ${p.fabric_spec})`)
      .join('; ');

    const storefrontActionTool: FunctionDeclaration = {
      name: 'executeStorefrontAction',
      description:
        'Navigates or performs a storefront shopping action for the customer during the voice conversation.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            description:
              'One of: open_product, add_to_cart, apply_coupon, open_checkout, open_category, open_b2b, open_about, switch_region',
          },
          productSlug: { type: Type.STRING },
          size: { type: Type.STRING },
          fit: { type: Type.STRING },
          categorySlug: { type: Type.STRING },
          regionCode: { type: Type.STRING },
          couponCode: { type: Type.STRING },
        },
        required: ['type'],
      },
    };

    let session: Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null = null;
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        apiVersion: 'v1beta',
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: [storefrontActionTool] }],
          systemInstruction: `You are the warm, human master tailor speaking live with a boutique client at MONTE NAPOLEONE 1974 (Treviso, Italy & Oslo showroom).
Speak naturally, warmly, and concisely in ${languageName}, like a real bespoke shirt tailor on a friendly voice call.
Active region: ${region?.name || 'International'} (${region?.currency_code || 'USD'}).
Every shirt includes free bespoke sleeve & shirt length adjustments (+/- 4 cm).
Catalog highlights: ${liveCatalogLine}.
When the customer confirms they want to view a shirt, add a shirt to their bag, apply MONTE10 for 10% off first order, or open checkout, call executeStorefrontAction immediately while speaking naturally.`,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== 1) return;
            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              clientWs.send(JSON.stringify({ inputTranscript: content.inputTranscription.text }));
            }
            if (content?.outputTranscription?.text) {
              clientWs.send(JSON.stringify({ outputTranscript: content.outputTranscription.text }));
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
            }
            if (content?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
            if (content?.turnComplete) {
              clientWs.send(JSON.stringify({ turnComplete: true }));
            }
            for (const call of message.toolCall?.functionCalls ?? []) {
              if (call.name === 'executeStorefrontAction' && call.args) {
                clientWs.send(JSON.stringify({ agentAction: call.args }));
                session?.sendToolResponse({
                  functionResponses: [
                    {
                      id: call.id,
                      name: call.name,
                      response: { ok: true },
                    },
                  ],
                });
              }
            }
          },
          onerror: (err: unknown) => {
            if (clientWs.readyState === 1) {
              clientWs.send(
                JSON.stringify({
                  error: err instanceof Error ? err.message : 'Live voice stream interrupted.',
                })
              );
            }
          },
          onclose: () => {
            if (clientWs.readyState === 1) {
              clientWs.close();
            }
          },
        },
      });

      if (clientWs.readyState === 1) {
        clientWs.send(JSON.stringify({ ready: true }));
      }
    } catch (err) {
      if (clientWs.readyState === 1) {
        clientWs.send(
          JSON.stringify({
            error: err instanceof Error ? err.message : 'Failed to start Gemini Live voice session.',
          })
        );
        clientWs.close(1011);
      }
      return;
    }

    clientWs.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { audio?: string; text?: string };
        if (msg.audio && session) {
          session.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (msg.text && session) {
          session.sendRealtimeInput({ text: msg.text });
        }
      } catch {
        // ignore malformed frames
      }
    });

    clientWs.on('close', () => {
      try {
        session?.close();
      } catch {
        // ignore
      }
      session = null;
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Monte Napoleone 1974 server listening on http://localhost:${PORT}`);
  });
}

startServer();
