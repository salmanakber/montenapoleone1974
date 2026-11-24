import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateB2BMoqSummary,
  calculateBulkPurchaseDiscount,
  calculateCheckoutTotals,
  DEFAULT_BULK_DISCOUNT_SETTINGS,
  DEFAULT_PROMO_POPUP_SETTINGS,
  evaluateStockState,
  formatRegionalPrice,
  generateBankReference,
  getAvailablePaymentMethods,
  hasPermission,
  OWNER_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
  parseProductImportCsv,
  resolveOrderDiscounts,
  toCsv,
  calculateTailoringSurcharge,
  resolveVariantPriceAndStock,
  computeBulkPriceAdjustment,
  computeDefaultSizeMeasurements,
  calculateB2BTierDiscount,
  estimateB2BUnitRate,
  isWooCommerceCsvHeader,
  normalizeBillingAddress,
  parseWooCommerceCsv,
  parseWordPressCategoriesXml,
  productMatchesCategories,
  resolveOrderedTailoringOptions,
  isTopBannerVisibleOnViewport,
  DEFAULT_TOP_BANNER_SETTINGS,
  buildDeterministicMultilingualCopy,
} from './commerce.ts';
import {
  buildRobotsTxt,
  buildSeoMetadata,
  buildSitemapXml,
  buildStorefrontPath,
  parseStorefrontUrl,
} from './seo.ts';
import { evaluateStorefrontAgentTurn } from './agentLogic.ts';
import { buildOrderEmailTemplate } from './emailTemplates.ts';
import type { OrderRecord } from '../types.ts';

test('formats prices cleanly per regional currency rules', () => {
  assert.equal(formatRegionalPrice(200, 'en'), '$200.00');
  assert.match(formatRegionalPrice(1699, 'no'), /1\s?699 kr/);
  assert.match(formatRegionalPrice(179, 'it'), /€179,00/);
  assert.match(formatRegionalPrice(4890000, 'vn'), /4\.890\.000\s?₫/);
});

test('evaluates regional inventory states accurately including pre-order', () => {
  assert.equal(evaluateStockState(18, false), 'in_stock');
  assert.equal(evaluateStockState(3, false), 'low_stock');
  assert.equal(evaluateStockState(0, true), 'preorder');
  assert.equal(evaluateStockState(0, false), 'out_of_stock');
});

test('calculates checkout totals with MONTE10 discount and free DHL economy threshold', () => {
  const noRegion = {
    code: 'no' as const,
    vat_rate: 0.25,
    free_shipping_threshold: 2500,
    dhl_base_rate: 149,
    dhl_express_rate: 299,
  };

  // Below threshold
  const res1 = calculateCheckoutTotals({
    items: [{ unitPrice: 1699, quantity: 1 }],
    region: noRegion,
    shippingMethod: 'dhl_economy',
    discountCode: 'MONTE10',
  });
  assert.equal(res1.subtotal, 1699);
  assert.equal(res1.discountAmount, 170);
  assert.equal(res1.shippingCost, 149);
  assert.equal(res1.freeShippingApplied, false);
  assert.equal(res1.total, 1699 - 170 + 149);

  // Above threshold -> free DHL economy
  const res2 = calculateCheckoutTotals({
    items: [{ unitPrice: 1699, quantity: 2 }],
    region: noRegion,
    shippingMethod: 'dhl_economy',
  });
  assert.equal(res2.shippingCost, 0);
  assert.equal(res2.freeShippingApplied, true);
  assert.equal(res2.total, 3398);
});

test('restricts Vipps strictly to Norway region', () => {
  const norwayMethods = getAvailablePaymentMethods({
    code: 'no',
    enabled_payments: ['vipps', 'stripe', 'paypal', 'bank_transfer'],
  });
  assert.equal(norwayMethods.includes('vipps'), true);

  const italyMethods = getAvailablePaymentMethods({
    code: 'it',
    enabled_payments: ['vipps', 'stripe', 'paypal', 'bank_transfer'],
  });
  assert.equal(italyMethods.includes('vipps'), false);
  assert.deepEqual(italyMethods, ['stripe', 'paypal', 'bank_transfer']);
});

test('generates deterministic bank KID reference numbers', () => {
  const ref = generateBankReference('MN', 'MN-2026-10042');
  assert.equal(ref.startsWith('MN'), true);
  assert.equal(ref.length, 9);
});

test('enforces Owner vs Staff RBAC permissions accurately', () => {
  const owner = { role: 'owner' as const, permissions: OWNER_PERMISSIONS, active: true };
  const staff = { role: 'staff' as const, permissions: DEFAULT_STAFF_PERMISSIONS, active: true };
  const inactiveStaff = { role: 'staff' as const, permissions: OWNER_PERMISSIONS, active: false };

  assert.equal(hasPermission(owner, 'manage_staff'), true);
  assert.equal(hasPermission(staff, 'manage_orders'), true);
  assert.equal(hasPermission(staff, 'manage_staff'), false);
  assert.equal(hasPermission(staff, 'manage_pricing'), false);
  assert.equal(hasPermission(inactiveStaff, 'manage_orders'), false);
});

test('calculates B2B MOQ totals per color accurately', () => {
  const below = calculateB2BMoqSummary({ 'S / 37': 4, 'M / 39': 8 }, 20);
  assert.equal(below.totalPieces, 12);
  assert.equal(below.meetsMoq, false);
  assert.equal(below.remainingForMoq, 8);

  const meets = calculateB2BMoqSummary({ 'S / 37': 5, 'M / 39': 10, 'L / 41': 10 }, 20);
  assert.equal(meets.totalPieces, 25);
  assert.equal(meets.meetsMoq, true);
  assert.equal(meets.remainingForMoq, 0);
});

test('serializes and parses multi-region product CSV with escaping', () => {
  const csv = toCsv(
    ['sku', 'region_code', 'title', 'price', 'stock_qty'],
    [
      ['MN-L3', 'no', 'BEIGE Linskjorte #L3, Sommerskjorte', 1699, 18],
      ['MN-B1', 'it', 'Camicia "Bianca" 100/2-Ply', 159, 50],
    ]
  );

  const parsed = parseProductImportCsv(csv);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].title, 'BEIGE Linskjorte #L3, Sommerskjorte');
  assert.equal(parsed.rows[0].price, 1699);
  assert.equal(parsed.rows[1].title, 'Camicia "Bianca" 100/2-Ply');
  assert.equal(parsed.rows[1].stock_qty, 50);

  const badParsed = parseProductImportCsv('sku,region_code,price\nMN-L3,fr,120');
  assert.equal(badParsed.errors.length, 1);
  assert.equal(badParsed.rows.length, 0);
});

test('calculates bespoke tailoring surcharges keeping shirt & sleeve length free', () => {
  assert.equal(
    calculateTailoringSurcharge({ waistAdjustmentCm: 0, chestAdjustmentCm: 0 }, 'en'),
    0
  );
  assert.equal(
    calculateTailoringSurcharge({ waistAdjustmentCm: -2, chestAdjustmentCm: 2 }, 'en'),
    20
  );
  assert.equal(
    calculateTailoringSurcharge({ waistAdjustmentCm: -2, shoulderAdjustmentCm: 1, bottomHemAdjustmentCm: -1 }, 'no'),
    300
  );
});

test('resolves variant pricing and stock overrides per fit and size', () => {
  const product = {
    sku: 'MN-L3',
    price: 185,
    stock_qty: 18,
    variants: [
      {
        product_id: 1,
        fit: 'Slim Fit' as const,
        size_label: '45 / 3XL',
        sku_variant: 'MN-L3-SLIM-45',
        price_en: 205,
        price_no: 1899,
        price_it: 189,
        price_vn: 4990000,
        stock_en: 4,
        stock_no: 2,
        stock_it: 5,
        stock_vn: 1,
        active: true,
      },
    ],
  };

  const matched = resolveVariantPriceAndStock(product, 'en', 'Slim Fit', '45 / 3XL');
  assert.equal(matched.price, 205);
  assert.equal(matched.stockQty, 4);
  assert.equal(matched.variantSku, 'MN-L3-SLIM-45');

  const fallback = resolveVariantPriceAndStock(product, 'en', 'Regular Fit', '40 / M');
  assert.equal(fallback.price, 185);
  assert.equal(fallback.stockQty, 18);
});

test('computes bulk price adjustments and distinct size measurements cleanly', () => {
  assert.equal(computeBulkPriceAdjustment(100, 'percent', 10, 'en'), 110);
  assert.equal(computeBulkPriceAdjustment(1699, 'percent', 10, 'no'), 1869);

  const m34 = computeDefaultSizeMeasurements('Slim Fit', '34 / 2XS');
  const m40 = computeDefaultSizeMeasurements('Regular Fit', '40 / M');
  const m45 = computeDefaultSizeMeasurements('Regular Fit', '45 / 3XL');
  assert.ok(m34.chest_cm < m40.chest_cm && m40.chest_cm < m45.chest_cm);
  assert.ok(m34.waist_cm < m40.waist_cm && m40.waist_cm < m45.waist_cm);
});

test('calculates B2B corporate tier discounts and localized unit prices', () => {
  assert.deepEqual(calculateB2BTierDiscount(10), { tierLabel: 'Sample / Under MOQ (<20)', discountPct: 0 });
  assert.deepEqual(calculateB2BTierDiscount(25), { tierLabel: 'Standard MOQ 20–49', discountPct: 15 });
  assert.deepEqual(calculateB2BTierDiscount(60), { tierLabel: 'Corporate 50–99', discountPct: 22 });
  assert.deepEqual(calculateB2BTierDiscount(120), { tierLabel: 'Enterprise 100+', discountPct: 30 });

  assert.equal(estimateB2BUnitRate(185, 20, 'en'), 157.25);
  assert.equal(estimateB2BUnitRate(1599, 100, 'no'), 1119);
});

test('calculates retail bulk tiers, disable toggles, stacking vs best-discount, and first-order restriction', () => {
  // 2 units -> no bulk discount yet, next tier is 3
  const q2 = calculateBulkPurchaseDiscount(2, 400, DEFAULT_BULK_DISCOUNT_SETTINGS, 'en');
  assert.equal(q2.discountPct, 0);
  assert.equal(q2.discountAmount, 0);
  assert.equal(q2.unitsNeededForNext, 1);
  assert.equal(q2.nextTier?.minQty, 3);

  // 5 units -> 15% bulk tier
  const q5 = calculateBulkPurchaseDiscount(5, 1000, DEFAULT_BULK_DISCOUNT_SETTINGS, 'en');
  assert.equal(q5.discountPct, 15);
  assert.equal(q5.discountAmount, 150);

  // Disabled bulk setting -> 0 discount
  const disabledBulk = calculateBulkPurchaseDiscount(
    5,
    1000,
    { ...DEFAULT_BULK_DISCOUNT_SETTINGS, enabled: false },
    'en'
  );
  assert.equal(disabledBulk.discountAmount, 0);

  // Best-discount vs stacking with MONTE10
  const nonStacked = resolveOrderDiscounts({
    subtotal: 1000,
    totalQty: 5,
    regionCode: 'en',
    discountCode: 'MONTE10',
    promoSettings: DEFAULT_PROMO_POPUP_SETTINGS,
    bulkSettings: { ...DEFAULT_BULK_DISCOUNT_SETTINGS, stackWithCoupon: false },
    isFirstOrder: true,
  });
  assert.equal(nonStacked.bulkDiscountAmount, 150);
  assert.equal(nonStacked.couponDiscountAmount, 0);
  assert.equal(nonStacked.totalDiscountAmount, 150);

  const stacked = resolveOrderDiscounts({
    subtotal: 1000,
    totalQty: 5,
    regionCode: 'en',
    discountCode: 'MONTE10',
    promoSettings: DEFAULT_PROMO_POPUP_SETTINGS,
    bulkSettings: { ...DEFAULT_BULK_DISCOUNT_SETTINGS, stackWithCoupon: true },
    isFirstOrder: true,
  });
  assert.equal(stacked.bulkDiscountAmount, 150);
  assert.equal(stacked.couponDiscountAmount, 100);
  assert.equal(stacked.totalDiscountAmount, 250);

  // Repeat customer rejected when firstOrderOnly is true
  const repeatOrder = resolveOrderDiscounts({
    subtotal: 200,
    totalQty: 1,
    regionCode: 'en',
    discountCode: 'MONTE10',
    promoSettings: { ...DEFAULT_PROMO_POPUP_SETTINGS, firstOrderOnly: true },
    bulkSettings: DEFAULT_BULK_DISCOUNT_SETTINGS,
    isFirstOrder: false,
  });
  assert.equal(repeatOrder.couponDiscountAmount, 0);
  assert.ok(repeatOrder.promoRejectedReason);
});

test('parses WooCommerce product export CSV including Parent > Child categories and sale prices', () => {
  const wooCsv = [
    'ID,Type,SKU,Name,Published,Short description,Description,"Regular price","Sale price",Categories,Images,Stock,"Attribute 1 name","Attribute 1 value(s)"',
    '101,simple,MN-WOO-1,"Veneto Sea Island Poplin",1,"Crisp dress shirt","Woven in Italy",210,185,"Business > Dress Shirts, Linen","https://example.com/a.jpg, https://example.com/b.jpg",24,Fabric,"100% Sea Island Cotton"',
  ].join('\n');

  assert.equal(isWooCommerceCsvHeader(wooCsv), true);
  const parsed = parseWooCommerceCsv(wooCsv, 'en');
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].sku, 'MN-WOO-1');
  assert.equal(parsed.rows[0].regularPrice, 210);
  assert.equal(parsed.rows[0].salePrice, 185);
  assert.equal(parsed.rows[0].stockQty, 24);
  assert.equal(parsed.rows[0].images.length, 2);

  const slugs = parsed.categories.map((c) => c.slug);
  assert.equal(slugs.includes('business'), true);
  assert.equal(slugs.includes('dress-shirts'), true);
  const dressChild = parsed.categories.find((c) => c.slug === 'dress-shirts');
  assert.equal(dressChild?.parentSlug, 'business');
});

test('parses WordPress WXR XML taxonomy categories preserving parent hierarchy', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
  <rss version="2.0" xmlns:wp="http://wordpress.org/export/1.2/">
    <channel>
      <wp:term>
        <wp:term_taxonomy>product_cat</wp:term_taxonomy>
        <wp:term_slug>menswear</wp:term_slug>
        <wp:term_parent></wp:term_parent>
        <wp:term_name><![CDATA[Menswear]]></wp:term_name>
      </wp:term>
      <wp:term>
        <wp:term_taxonomy>product_cat</wp:term_taxonomy>
        <wp:term_slug>italian-linen</wp:term_slug>
        <wp:term_parent>menswear</wp:term_parent>
        <wp:term_name><![CDATA[Italian Linen]]></wp:term_name>
      </wp:term>
    </channel>
  </rss>`;

  const res = parseWordPressCategoriesXml(xml);
  assert.equal(res.errors.length, 0);
  assert.equal(res.categories.length, 2);
  assert.equal(res.categories[0].slug, 'menswear');
  assert.equal(res.categories[1].slug, 'italian-linen');
  assert.equal(res.categories[1].parentSlug, 'menswear');
});

test('normalizes shipping vs billing addresses cleanly', () => {
  const ship = {
    name: 'Henrik Solberg',
    email: 'henrik@oslo.no',
    phone: '+47 90000001',
    address: 'Karl Johans gate 12',
    city: 'Oslo',
    postalCode: '0154',
    country: 'Norway',
  };
  const same = normalizeBillingAddress(ship, true, { name: 'Ignored' });
  assert.equal(same.address, 'Karl Johans gate 12');

  const separate = normalizeBillingAddress(ship, false, {
    name: 'Nordic Finance AS',
    address: 'Aker Brygge 4',
    city: 'Oslo',
    postalCode: '0250',
  });
  assert.equal(separate.name, 'Nordic Finance AS');
  assert.equal(separate.address, 'Aker Brygge 4');
  assert.equal(separate.country, 'Norway');
});

test('builds localized Resend order confirmation and DHL tracking emails across all 4 regions', () => {
  const baseOrder: OrderRecord = {
    id: 1,
    order_number: 'MN-2026-88412',
    region_code: 'no',
    currency_code: 'NOK',
    customer_name: 'Olav Lind',
    customer_email: 'olav@example.no',
    customer_phone: '+47 91234567',
    shipping_address: 'Bogstadveien 15',
    shipping_city: 'Oslo',
    shipping_postal_code: '0355',
    shipping_country: 'Norway',
    billing_name: 'Olav Billing AS',
    billing_address: 'Storgata 9',
    billing_city: 'Oslo',
    billing_postal_code: '0155',
    billing_country: 'Norway',
    is_b2b: false,
    company_name: null,
    org_number: null,
    subtotal: 1699,
    shipping_cost: 0,
    discount_amount: 0,
    vat_amount: 340,
    total: 1699,
    payment_method: 'bank_transfer',
    payment_status: 'awaiting_transfer',
    payment_reference: 'MN884127',
    shipping_method: 'dhl_economy',
    dhl_tracking_number: 'DHL-NO-449911223',
    dhl_status: 'in_transit',
    order_status: 'shipped',
    items: [
      {
        productId: 1,
        sku: 'MN-L3',
        title: 'BEIGE Linskjorte',
        image: '/img.jpg',
        unitPrice: 1699,
        quantity: 1,
        tailoring: {
          fit: 'Slim Fit',
          size: '40 / M',
          collar: 'Cutaway',
          cuff: 'Single Cuff (Round)',
          sleeveAdjustmentCm: -1,
          lengthAdjustmentCm: 0,
        },
      },
    ],
    notes: null,
    created_at: '2026-11-22T10:00:00Z',
  };

  const regionMock = {
    code: 'no' as const,
    name: 'Norway',
    warehouse_name: 'Oslo Distribusjonslager',
    bank_name: 'DNB Bank ASA Norway',
    bank_account_display: '1506.88.41920',
    bank_iban: 'NO9315068841920',
    bank_bic: 'DNBANOKKXXX',
  };

  const confirmNo = buildOrderEmailTemplate({ type: 'order_confirmation', order: baseOrder, region: regionMock });
  assert.match(confirmNo.subject, /Ordrebekreftelse/);
  assert.match(confirmNo.html, /KID/);
  assert.match(confirmNo.html, /Olav Billing AS/);

  const trackNo = buildOrderEmailTemplate({ type: 'shipping_tracking', order: baseOrder, region: regionMock });
  assert.match(trackNo.subject, /sendt med DHL/);
  assert.match(trackNo.html, /DHL-NO-449911223/);

  const trackIt = buildOrderEmailTemplate({
    type: 'shipping_tracking',
    order: { ...baseOrder, region_code: 'it', currency_code: 'EUR' },
    region: { ...regionMock, code: 'it', name: 'Italy' },
  });
  assert.match(trackIt.subject, /spedito con DHL/);

  const confirmVn = buildOrderEmailTemplate({
    type: 'order_confirmation',
    order: { ...baseOrder, region_code: 'vn', currency_code: 'VND' },
    region: { ...regionMock, code: 'vn', name: 'Việt Nam' },
  });
  assert.match(confirmVn.subject, /Xác nhận đơn hàng/);
});

test('matches products assigned to multiple parent and child categories', () => {
  const multiProd = {
    category_slug: 'linen',
    category_slugs: ['linen', 'business', 'italian-linen'],
  };
  assert.equal(productMatchesCategories(multiProd, new Set(['linen'])), true);
  assert.equal(productMatchesCategories(multiProd, new Set(['business'])), true);
  assert.equal(productMatchesCategories(multiProd, new Set(['italian-linen'])), true);
  assert.equal(productMatchesCategories(multiProd, new Set(['flannel'])), false);
  assert.equal(productMatchesCategories(multiProd, null), true);
});

test('enforces top banner device visibility settings (both, desktop_only, mobile_only)', () => {
  assert.equal(isTopBannerVisibleOnViewport({ enabled: false, visibility: 'both' }, 1440), false);
  assert.equal(isTopBannerVisibleOnViewport({ enabled: true, visibility: 'both' }, 390), true);
  assert.equal(isTopBannerVisibleOnViewport({ enabled: true, visibility: 'desktop_only' }, 1440), true);
  assert.equal(isTopBannerVisibleOnViewport({ enabled: true, visibility: 'desktop_only' }, 390), false);
  assert.equal(isTopBannerVisibleOnViewport({ enabled: true, visibility: 'mobile_only' }, 390), true);
  assert.equal(isTopBannerVisibleOnViewport({ enabled: true, visibility: 'mobile_only' }, 1440), false);
  assert.equal(DEFAULT_TOP_BANNER_SETTINGS.enabled, true);
});

test('parses and builds clean localized SEO URLs, Schema.org metadata, robots.txt, and sitemap.xml', () => {
  assert.deepEqual(parseStorefrontUrl('/'), { view: 'home' });
  assert.deepEqual(parseStorefrontUrl('/no'), { region: 'no', view: 'home' });
  assert.deepEqual(parseStorefrontUrl('/no/shop/linen'), {
    region: 'no',
    view: 'catalog',
    category: 'linen',
  });
  assert.deepEqual(parseStorefrontUrl('/it/product/beige-linen-shirt-l3'), {
    region: 'it',
    view: 'product',
    slug: 'beige-linen-shirt-l3',
  });
  assert.deepEqual(parseStorefrontUrl('/b2b/navy-oxford-shirt'), {
    region: undefined,
    view: 'b2b',
    slug: 'navy-oxford-shirt',
  });
  assert.deepEqual(parseStorefrontUrl('/en/about-us'), {
    region: 'en',
    view: 'about',
  });

  assert.equal(buildStorefrontPath({ regionCode: 'en', view: 'home' }), '/');
  assert.equal(buildStorefrontPath({ regionCode: 'no', view: 'catalog', category: 'linen' }), '/no/shop/linen');
  assert.equal(
    buildStorefrontPath({ regionCode: 'it', view: 'product', slug: 'beige-linen-shirt-l3' }),
    '/it/product/beige-linen-shirt-l3'
  );

  const seoProd = buildSeoMetadata({
    view: 'product',
    region: { code: 'no', name: 'Norway', currency_code: 'NOK', warehouse_name: 'Oslo Warehouse' },
    product: {
      sku: 'MN-L3',
      slug: 'beige-linen-shirt-l3',
      title: 'BEIGE LINEN SHIRT #L3',
      description: 'Breathable 100% Tuscan linen summer shirt.',
      fabric_spec: '100% Tuscan Linen',
      price: 1699,
      primary_image: '/src/assets/images/shirt_beige_linen_1795248293982.jpg',
      stock_qty: 18,
      preorder_allowed: true,
    },
    origin: 'https://montenapoleone1974.com',
  });

  assert.ok(seoProd.title.length >= 20 && seoProd.title.length <= 60);
  assert.ok(seoProd.description.length >= 90 && seoProd.description.length <= 160);
  assert.equal(seoProd.canonicalUrl, 'https://montenapoleone1974.com/no/product/beige-linen-shirt-l3');
  assert.equal(seoProd.ogType, 'product');
  assert.equal(seoProd.hreflangs.length, 5);
  assert.equal((seoProd.jsonLd[1] as { '@type': string })['@type'], 'Product');

  const robots = buildRobotsTxt('https://montenapoleone1974.com');
  assert.match(robots, /Sitemap: https:\/\/montenapoleone1974\.com\/sitemap\.xml/);

  const sitemap = buildSitemapXml({
    origin: 'https://montenapoleone1974.com',
    regions: ['en', 'no'],
    categories: [{ slug: 'linen' }],
    products: [{ slug: 'beige-linen-shirt-l3' }],
  });
  assert.match(sitemap, /https:\/\/montenapoleone1974\.com\/no\/product\/beige-linen-shirt-l3/);
  assert.match(sitemap, /hreflang="nb-NO"/);
});

test('AI shopping agent recommends products, handles "yes" confirmation to add to bag, offers 10% discount, and routes to checkout', () => {
  const sampleProducts = [
    {
      id: 1,
      sku: 'MN-L3',
      slug: 'beige-linen-shirt-l3',
      title: 'Beige Linen Shirt',
      category_slug: 'linen',
      category_slugs: ['linen'],
      fabric_spec: '100% Tuscan Linen',
      price: 185,
      primary_image: '/img1.jpg',
      stock_qty: 12,
      preorder_allowed: true,
      sizes: ['39 / M', '40 / M', '41 / L'],
    },
  ];

  // Turn 1: User asks for a linen shirt
  const turn1 = evaluateStorefrontAgentTurn({
    message: 'Show me a beige linen shirt in size 40 / M',
    regionCode: 'en',
    products: sampleProducts,
    cartQty: 0,
    cartSubtotal: 0,
    firstOrderEligible: true,
    promoRules: DEFAULT_PROMO_POPUP_SETTINGS,
    bulkRules: DEFAULT_BULK_DISCOUNT_SETTINGS,
  });
  assert.equal(turn1.agentAction?.type, 'open_product');
  assert.equal(turn1.agentAction?.productSlug, 'beige-linen-shirt-l3');
  assert.equal(turn1.pendingOffer?.kind, 'product');
  assert.match(turn1.reply, /Do you like/i);

  // Turn 2: User replies "yes" -> adds to bag & offers MONTE10
  const turn2 = evaluateStorefrontAgentTurn({
    message: 'Yes please!',
    regionCode: 'en',
    products: sampleProducts,
    cartQty: 0,
    cartSubtotal: 0,
    firstOrderEligible: true,
    promoRules: DEFAULT_PROMO_POPUP_SETTINGS,
    bulkRules: DEFAULT_BULK_DISCOUNT_SETTINGS,
    pendingOffer: turn1.pendingOffer,
  });
  assert.equal(turn2.agentAction?.type, 'add_to_cart');
  assert.equal(turn2.agentAction?.productSlug, 'beige-linen-shirt-l3');
  assert.equal(turn2.agentAction?.size, '40 / M');
  assert.equal(turn2.pendingOffer?.kind, 'discount');
  assert.equal(turn2.pendingOffer?.couponCode, 'MONTE10');

  // Turn 3: User replies "yes" -> applies MONTE10
  const turn3 = evaluateStorefrontAgentTurn({
    message: 'yes',
    regionCode: 'en',
    products: sampleProducts,
    cartQty: 1,
    cartSubtotal: 185,
    firstOrderEligible: true,
    promoRules: DEFAULT_PROMO_POPUP_SETTINGS,
    bulkRules: DEFAULT_BULK_DISCOUNT_SETTINGS,
    pendingOffer: turn2.pendingOffer,
  });
  assert.equal(turn3.agentAction?.type, 'apply_coupon');
  assert.equal(turn3.agentAction?.couponCode, 'MONTE10');
  assert.equal(turn3.pendingOffer?.kind, 'checkout');

  // Turn 4: User confirms checkout -> opens checkout
  const turn4 = evaluateStorefrontAgentTurn({
    message: 'yes',
    regionCode: 'en',
    products: sampleProducts,
    cartQty: 1,
    cartSubtotal: 185,
    firstOrderEligible: true,
    activePromoCode: 'MONTE10',
    promoRules: DEFAULT_PROMO_POPUP_SETTINGS,
    bulkRules: DEFAULT_BULK_DISCOUNT_SETTINGS,
    pendingOffer: turn3.pendingOffer,
  });
  assert.equal(turn4.agentAction?.type, 'open_checkout');
});

test('parseStorefrontUrl handles hidden /admin and /staff-portal routes and DEFAULT_CUSTOMER_AUTH_SETTINGS has safe defaults', async () => {
  const { DEFAULT_CUSTOMER_AUTH_SETTINGS } = await import('./commerce.ts');
  const { TRANSLATIONS } = await import('../i18n/translations.ts');

  assert.equal(parseStorefrontUrl('/admin').view, 'admin');
  assert.equal(parseStorefrontUrl('/staff-portal').view, 'admin');
  assert.equal(parseStorefrontUrl('/no/about-us').view, 'about');

  assert.equal(DEFAULT_CUSTOMER_AUTH_SETTINGS.googleLoginEnabled, true);
  assert.equal(DEFAULT_CUSTOMER_AUTH_SETTINGS.showCornerPopup, true);
  assert.equal(DEFAULT_CUSTOMER_AUTH_SETTINGS.autoSubscribeMailchimp, true);
  assert.ok(DEFAULT_CUSTOMER_AUTH_SETTINGS.cornerPopupDelaySeconds >= 0);

  for (const code of ['en', 'no', 'it', 'vn'] as const) {
    const locale = TRANSLATIONS[code];
    assert.equal(locale.footer.infoUrls.length, 6, `footer.infoUrls length for ${code}`);
    assert.equal(locale.aboutPage.commitmentCards.length, 6, `aboutPage.commitmentCards length for ${code}`);
    assert.equal(locale.aboutPage.traditions.length, 3, `aboutPage.traditions length for ${code}`);
    assert.ok(locale.aboutPage.lead.length > 20);
  }
});

test('SIZE_GUIDE_CHARTS and RETURN_FORM_PDFS match exact tailoring measurements and 4 regional PDFs', async () => {
  const { SIZE_GUIDE_CHARTS, RETURN_FORM_PDFS, getReturnFormPdfForRegion } = await import(
    './sizeGuide.ts'
  );

  assert.equal(SIZE_GUIDE_CHARTS.length, 3);
  const [contemporary, modernFit, slimfit] = SIZE_GUIDE_CHARTS;

  assert.equal(contemporary.title, 'Contemporary');
  assert.deepEqual(contemporary.sizes, ['S / 38', 'M / 40', 'L / 42', 'XL / 44', '2XL / 46', '3XL / 48']);
  assert.equal(contemporary.rows.length, 7);
  assert.deepEqual(contemporary.rows[1].values, [106, 113, 122, 130, 134, 146]);
  assert.deepEqual(contemporary.rows[6].values, [76.5, 77.5, 79, 81, 82.5, 85]);

  assert.equal(modernFit.title, 'Modern Fit');
  assert.equal(modernFit.sizes.length, 8);
  assert.equal(modernFit.rows.length, 7);
  assert.deepEqual(modernFit.rows[1].values, [110, 114, 116, 120, 124, 127, 132, 135]);

  assert.equal(slimfit.title, 'Slimfit');
  assert.equal(slimfit.sizes.length, 9);
  assert.equal(slimfit.rows.length, 7);
  assert.deepEqual(slimfit.rows[1].values, [93, 96, 102, 105, 109, 113, 118, 123, 126]);

  assert.equal(RETURN_FORM_PDFS.en.url, '/assets/aistudio/Return_English_8c2b95ab.pdf');
  assert.equal(RETURN_FORM_PDFS.no.url, '/assets/aistudio/Return_Norwegian_e44561c2.pdf');
  assert.equal(RETURN_FORM_PDFS.vn.url, '/assets/aistudio/Return_Tieng_Viet_6ea36a22.pdf');
  assert.equal(RETURN_FORM_PDFS.it.url, '/assets/aistudio/Return_Italian_Modulo_Recesso.pdf');
  assert.equal(getReturnFormPdfForRegion('no').shortLabel, 'Norsk');
  assert.equal(getReturnFormPdfForRegion('it').shortLabel, 'Italiano');
});

test('resolves backend-ordered collars & cuffs with custom images and default selection', () => {
  const catalog = [
    {
      option_type: 'collar' as const,
      name: 'Cutaway',
      subtitle: 'Bold Italian spread',
      detail: 'Architectural points',
      stitch_spec: '7.0 cm',
      image_url: '/uploads/cutaway.jpg',
      sort_order: 1,
      is_default: true,
      active: true,
    },
    {
      option_type: 'collar' as const,
      name: 'Spread',
      subtitle: 'Classic wide',
      detail: 'Timeless balance',
      stitch_spec: '6.5 cm',
      image_url: '',
      sort_order: 2,
      is_default: false,
      active: true,
    },
    {
      option_type: 'collar' as const,
      name: 'Hidden Inactive',
      subtitle: 'Archived',
      detail: '',
      stitch_spec: '',
      image_url: '',
      sort_order: 3,
      is_default: false,
      active: false,
    },
  ];

  const ordered = resolveOrderedTailoringOptions('collar', ['Spread', 'Cutaway', 'Hidden Inactive'], catalog);
  assert.equal(ordered.length, 2);
  assert.equal(ordered[0].name, 'Cutaway');
  assert.equal(ordered[0].isDefault, true);
  assert.equal(ordered[0].imageUrl, '/uploads/cutaway.jpg');
  assert.equal(ordered[1].name, 'Spread');
  assert.equal(ordered[1].isDefault, false);
});

test('builds rich Product SEO metadata with custom overrides, AggregateRating, Review schema, and Sitemap images', () => {
  const seo = buildSeoMetadata({
    view: 'product',
    region: { code: 'no', name: 'Norway', currency_code: 'NOK', warehouse_name: 'Oslo Warehouse' },
    product: {
      sku: 'MN-L3',
      slug: 'beige-linen-l3',
      category_slug: 'linen',
      title: 'BEIGE Linskjorte #L3',
      description: '100% italiensk lin.',
      fabric_spec: '100% Tuscan Linen',
      price: 1699,
      primary_image: '/uploads/linen-l3.jpg',
      gallery: ['/uploads/linen-l3.jpg', '/uploads/linen-l3-detail.jpg'],
      stock_qty: 12,
      preorder_allowed: true,
      seo_title: 'Beige Linskjorte fra Treviso – Monte Napoleone 1974',
      seo_description: 'Kjøp eksklusiv beige linskjorte i 100% toscansk lin med gratis skreddersydd ermelengde og skjortelengde i Norge.',
      seo_keywords: 'linskjorte norge, beige linskjorte, italiensk skjorte',
      review_count: 2,
      average_rating: 4.8,
      reviews: [
        {
          customer_name: 'Henrik Solberg',
          rating: 5,
          title: 'Fantastisk passform',
          comment: 'Sitter perfekt etter gratis ermetilpasning.',
          created_at: '2026-11-20T10:00:00Z',
        },
      ],
    },
    origin: 'https://montenapoleone1974.com',
  });

  assert.match(seo.title, /Beige Linskjorte/);
  assert.equal(seo.keywords, 'linskjorte norge, beige linskjorte, italiensk skjorte');
  assert.equal(seo.productMeta?.priceCurrency, 'NOK');
  assert.equal(seo.productMeta?.retailerItemId, 'MN-L3');
  const prodLd = seo.jsonLd[1] as {
    aggregateRating?: { ratingValue: number; reviewCount: number };
    review?: Array<{ '@type': string; author: { name: string } }>;
  };
  assert.equal(prodLd.aggregateRating?.ratingValue, 4.8);
  assert.equal(prodLd.aggregateRating?.reviewCount, 2);
  assert.equal(prodLd.review?.[0].author.name, 'Henrik Solberg');

  const xml = buildSitemapXml({
    origin: 'https://montenapoleone1974.com',
    regions: ['en', 'no'],
    categories: [{ slug: 'linen' }],
    products: [{ slug: 'beige-linen-l3', primary_image: '/uploads/linen-l3.jpg', title: 'BEIGE Linskjorte #L3' }],
  });
  assert.match(xml, /<image:image>/);
  assert.match(xml, /https:\/\/montenapoleone1974\.com\/uploads\/linen-l3\.jpg/);
});

test('builds localized post-purchase review_request email templates with direct verification links', () => {
  const order: OrderRecord = {
    id: 99,
    order_number: 'MN-2026-99100',
    region_code: 'no',
    currency_code: 'NOK',
    customer_name: 'Astrid Hansen',
    customer_email: 'astrid@oslo.no',
    customer_phone: '+47 90000011',
    shipping_address: 'Bogstadveien 12',
    shipping_city: 'Oslo',
    shipping_postal_code: '0355',
    shipping_country: 'Norway',
    is_b2b: false,
    company_name: null,
    org_number: null,
    subtotal: 1699,
    shipping_cost: 0,
    discount_amount: 0,
    vat_amount: 340,
    total: 1699,
    payment_method: 'vipps',
    payment_status: 'paid',
    payment_reference: 'VIPPS99100',
    shipping_method: 'dhl_economy',
    dhl_tracking_number: null,
    dhl_status: 'delivered',
    order_status: 'delivered',
    items: [],
    notes: null,
    created_at: '2026-11-22T10:00:00Z',
  };

  const email = buildOrderEmailTemplate({
    type: 'review_request',
    order,
    region: {
      code: 'no',
      name: 'Norway',
      warehouse_name: 'Oslo Warehouse',
      bank_name: 'DNB',
      bank_account_display: '1506.88.41920',
      bank_iban: 'NO9315068841920',
      bank_bic: 'DNBANOKKXXX',
    },
    reviewLinks: [
      {
        title: 'BEIGE Linskjorte #L3',
        sku: 'MN-L3',
        reviewUrl: 'https://montenapoleone1974.com/no/product/beige-linen-l3?reviewToken=abc123',
      },
    ],
  });

  assert.match(email.subject, /MN-2026-99100/);
  assert.match(email.html, /reviewToken=abc123/);
  assert.match(email.html, /BEIGE Linskjorte #L3/);
});

test('parses WooCommerce variable + variation rows, sizes, fits, HTML stripping, and generates EN/NO/IT/VN copy', () => {
  const wooVariableCsv = [
    'ID,Type,SKU,Name,Published,Short description,Description,"Regular price","Sale price",Categories,Images,Stock,Parent,"Attribute 1 name","Attribute 1 value(s)","Attribute 2 name","Attribute 2 value(s)"',
    '501,variable,MN-WOO-VAR,"Milano Twill Classic",1,"<p>Crisp <strong>Italian</strong> twill</p>","Two-ply Egyptian cotton woven in Como.",210,185,"Business > Non-Iron Shirts","/img/twill-1.jpg, /img/twill-2.jpg",,,Size,"38 / S, 40 / M, 42 / L",Fit,"Slim Fit, Regular Fit"',
    '502,variation,MN-WOO-VAR-38S,"Milano Twill - 38",1,"","",210,185,"",,12,MN-WOO-VAR,Size,"38 / S",Fit,"Slim Fit"',
    '503,variation,MN-WOO-VAR-40R,"Milano Twill - 40",1,"","",220,195,"",,9,501,Size,"40 / M",Fit,"Regular Fit"',
  ].join('\n');

  assert.equal(isWooCommerceCsvHeader(wooVariableCsv), true);
  const parsed = parseWooCommerceCsv(wooVariableCsv, 'en');
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.rows.length, 1);

  const parent = parsed.rows[0];
  assert.equal(parent.productType, 'variable');
  assert.equal(parent.shortDescription, 'Crisp Italian twill');
  assert.equal(parent.stockQty, 21);
  assert.equal(parent.salePrice, 185);
  assert.deepEqual(parent.sizes, ['38 / S', '40 / M', '42 / L']);
  assert.deepEqual(parent.fits, ['Slim Fit', 'Regular Fit']);
  assert.equal(parent.variations?.length, 2);
  assert.equal(parent.variations?.[0].skuVariant, 'MN-WOO-VAR-38S');
  assert.equal(parent.variations?.[0].sizeLabel, '38 / S');
  assert.equal(parent.variations?.[0].fit, 'Slim Fit');
  assert.equal(parent.variations?.[1].regularPrice, 220);

  const multiCopy = buildDeterministicMultilingualCopy({
    title: parent.title,
    shortDescription: parent.shortDescription,
    description: parent.description,
    fabricSpec: '100% Two-Ply Cotton',
    sourceRegion: 'en',
  });
  assert.match(multiCopy.no.description, /Skreddersydd i Treviso/);
  assert.match(multiCopy.it.description, /Camicia sartoriale realizzata a Treviso/);
  assert.match(multiCopy.vn.description, /Áo sơ mi may đo thủ công tại Treviso/);
});

test('parses and builds /admin/<tab> routes cleanly for deep-linking and back navigation', () => {
  assert.deepEqual(parseStorefrontUrl('/admin'), {
    region: undefined,
    view: 'admin',
    adminTab: 'overview',
  });
  assert.deepEqual(parseStorefrontUrl('/admin/collar-cuff'), {
    region: undefined,
    view: 'admin',
    adminTab: 'collar_cuff',
  });
  assert.deepEqual(parseStorefrontUrl('/no/admin/orders'), {
    region: 'no',
    view: 'admin',
    adminTab: 'orders',
  });
  assert.deepEqual(parseStorefrontUrl('/admin/reports'), {
    region: undefined,
    view: 'admin',
    adminTab: 'reports',
  });

  assert.equal(buildStorefrontPath({ regionCode: 'en', view: 'admin', adminTab: 'overview' }), '/admin');
  assert.equal(
    buildStorefrontPath({ regionCode: 'en', view: 'admin', adminTab: 'collar_cuff' }),
    '/admin/collar-cuff'
  );
  assert.equal(
    buildStorefrontPath({ regionCode: 'no', view: 'admin', adminTab: 'orders' }),
    '/admin/orders'
  );
});









