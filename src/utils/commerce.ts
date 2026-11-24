import type {
  AuthUser,
  BespokeTailoring,
  BulkDiscountSettings,
  BulkDiscountTier,
  CartItem,
  CsvImportRow,
  CustomerAuthSettings,
  PaymentMethod,
  Product,
  PromotionPopupSettings,
  RegionCode,
  RegionConfig,
  ShippingMethod,
  StaffPermissionKey,
  StaffPermissions,
  TailoringSizeSpec,
  TopBannerSettings,
} from '../types.ts';

export const DEFAULT_TOP_BANNER_SETTINGS: TopBannerSettings = {
  enabled: true,
  visibility: 'both',
  text_en: 'COMPLIMENTARY BESPOKE SLEEVE & SHIRT LENGTH TAILORING · FREE DHL SHIPPING OVER $250',
  text_no: 'KOSTNADSFRI SKREDDERSYDD ERME- OG SKJORTELENGDE · FRI FRAKT OVER 2 500 KR',
  text_it: 'LUNGHEZZA MANICHE E BUSTO SU MISURA GRATUITA · SPEDIZIONE DHL GRATUITA',
  text_vn: 'MIỄN PHÍ ĐO CHỈNH CHIỀU DÀI TAY & THÂN ÁO · MIỄN PHÍ VẬN CHUYỂN DHL',
  linkView: 'catalog',
  linkCategory: 'all',
  bgColor: '#142B4E',
  textColor: '#FFFFFF',
};

export const DEFAULT_BULK_DISCOUNT_SETTINGS: BulkDiscountSettings = {
  enabled: true,
  stackWithCoupon: false,
  tiers: [
    { minQty: 3, discountPct: 10 },
    { minQty: 5, discountPct: 15 },
    { minQty: 10, discountPct: 20 },
  ],
};

export const DEFAULT_PROMO_POPUP_SETTINGS: PromotionPopupSettings = {
  popupEnabled: true,
  showFloatingButton: true,
  discountCode: 'MONTE10',
  discountPct: 10,
  firstOrderOnly: true,
  delaySeconds: 0,
  title_en: 'GET 10% OFF YOUR FIRST ORDER!',
  title_no: 'FÅ 10% RABATT PÅ DIN FØRSTE BESTILLING!',
  title_it: 'OTTIENI IL 10% DI SCONTO SUL PRIMO ORDINE!',
  title_vn: 'GIẢM 10% CHO ĐƠN HÀNG ĐẦU TIÊN!',
  subtitle_en: 'Join the Monte Napoleone 1974 mailing list for private seasonal releases and 10% off your first tailored shirt.',
  subtitle_no: 'Meld deg på Monte Napoleone 1974 nyhetsbrevet og motta 10% velkomstrabatt på din første bestilling.',
  subtitle_it: 'Iscriviti alla newsletter Monte Napoleone 1974 per ricevere il 10% di benvenuto sul primo acquisto.',
  subtitle_vn: 'Đăng ký nhận bản tin Monte Napoleone 1974 để nhận ưu đãi 10% cho đơn hàng đầu tiên.',
  button_en: 'GET 10% OFF',
  button_no: 'FÅ 10% RABATT',
  button_it: 'OTTIENI 10%',
  button_vn: 'NHẬN ƯU ĐÃI 10%',
};

export const DEFAULT_STAFF_PERMISSIONS: StaffPermissions = {
  manage_products: true,
  manage_inventory: true,
  manage_pricing: false,
  manage_orders: true,
  manage_media: true,
  manage_b2b: true,
  manage_staff: false,
  manage_settings: false,
};

export const OWNER_PERMISSIONS: StaffPermissions = {
  manage_products: true,
  manage_inventory: true,
  manage_pricing: true,
  manage_orders: true,
  manage_media: true,
  manage_b2b: true,
  manage_staff: true,
  manage_settings: true,
};

export function formatRegionalPrice(amount: number, regionCode: RegionCode): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  switch (regionCode) {
    case 'no': {
      const rounded = Math.round(safeAmount);
      return `${rounded.toLocaleString('nb-NO')} kr`;
    }
    case 'it': {
      return `€${safeAmount.toLocaleString('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    case 'vn': {
      const rounded = Math.round(safeAmount);
      return `${rounded.toLocaleString('vi-VN')} ₫`;
    }
    case 'en':
    default: {
      return `$${safeAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  }
}

export function evaluateStockState(
  stockQty: number,
  preorderAllowed: boolean
): 'in_stock' | 'low_stock' | 'preorder' | 'out_of_stock' {
  if (stockQty > 5) return 'in_stock';
  if (stockQty > 0) return 'low_stock';
  if (preorderAllowed) return 'preorder';
  return 'out_of_stock';
}

export function calculateDhlShippingCost(
  subtotalAfterDiscount: number,
  region: Pick<RegionConfig, 'free_shipping_threshold' | 'dhl_base_rate' | 'dhl_express_rate'>,
  method: ShippingMethod
): { cost: number; freeShippingApplied: boolean } {
  if (method === 'dhl_economy' && subtotalAfterDiscount >= region.free_shipping_threshold) {
    return { cost: 0, freeShippingApplied: true };
  }
  if (method === 'dhl_express') {
    const expressCost =
      subtotalAfterDiscount >= region.free_shipping_threshold
        ? Math.round(region.dhl_express_rate * 0.5)
        : region.dhl_express_rate;
    return { cost: expressCost, freeShippingApplied: false };
  }
  return { cost: region.dhl_base_rate, freeShippingApplied: false };
}

export function roundForRegion(amount: number, regionCode: RegionCode): number {
  if (regionCode === 'vn' || regionCode === 'no') {
    return Math.round(amount);
  }
  return Number(amount.toFixed(2));
}

export function calculateBulkPurchaseDiscount(
  totalQty: number,
  subtotal: number,
  bulkSettings: BulkDiscountSettings = DEFAULT_BULK_DISCOUNT_SETTINGS,
  regionCode: RegionCode = 'en'
): {
  discountPct: number;
  discountAmount: number;
  appliedTier: BulkDiscountTier | null;
  nextTier: BulkDiscountTier | null;
  unitsNeededForNext: number;
} {
  const safeQty = Math.max(0, Math.floor(Number.isFinite(totalQty) ? totalQty : 0));
  if (!bulkSettings.enabled || !Array.isArray(bulkSettings.tiers) || bulkSettings.tiers.length === 0) {
    return {
      discountPct: 0,
      discountAmount: 0,
      appliedTier: null,
      nextTier: null,
      unitsNeededForNext: 0,
    };
  }

  const sortedTiers = [...bulkSettings.tiers]
    .filter((t) => Number(t.minQty) > 0 && Number(t.discountPct) > 0)
    .sort((a, b) => a.minQty - b.minQty);

  let appliedTier: BulkDiscountTier | null = null;
  let nextTier: BulkDiscountTier | null = null;

  for (const tier of sortedTiers) {
    if (safeQty >= tier.minQty) {
      appliedTier = tier;
    } else if (!nextTier) {
      nextTier = tier;
    }
  }

  const discountPct = appliedTier ? Math.min(90, Math.max(0, appliedTier.discountPct)) : 0;
  const discountAmount = discountPct > 0 ? roundForRegion((subtotal * discountPct) / 100, regionCode) : 0;
  const unitsNeededForNext = nextTier ? Math.max(0, nextTier.minQty - safeQty) : 0;

  return {
    discountPct,
    discountAmount,
    appliedTier,
    nextTier,
    unitsNeededForNext,
  };
}

export interface DiscountResolutionResult {
  couponDiscountAmount: number;
  bulkDiscountAmount: number;
  totalDiscountAmount: number;
  appliedCouponCode: string | null;
  appliedBulkTier: BulkDiscountTier | null;
  nextBulkTier: BulkDiscountTier | null;
  unitsNeededForNext: number;
  promoRejectedReason: string | null;
}

export function resolveOrderDiscounts(params: {
  subtotal: number;
  totalQty: number;
  regionCode: RegionCode;
  discountCode?: string;
  promoSettings?: PromotionPopupSettings;
  bulkSettings?: BulkDiscountSettings;
  isFirstOrder?: boolean;
}): DiscountResolutionResult {
  const promo = params.promoSettings || DEFAULT_PROMO_POPUP_SETTINGS;
  const bulk = params.bulkSettings || DEFAULT_BULK_DISCOUNT_SETTINGS;
  const isFirstOrder = params.isFirstOrder !== undefined ? params.isFirstOrder : true;

  const bulkEval = calculateBulkPurchaseDiscount(params.totalQty, params.subtotal, bulk, params.regionCode);

  const normalizedInput = (params.discountCode || '').trim().toUpperCase();
  const expectedCode = (promo.discountCode || 'MONTE10').trim().toUpperCase();

  let couponPct = 0;
  let appliedCouponCode: string | null = null;
  let promoRejectedReason: string | null = null;

  if (normalizedInput) {
    if (!promo.popupEnabled && normalizedInput === expectedCode) {
      promoRejectedReason = 'Promotional code is currently disabled.';
    } else if (normalizedInput !== expectedCode) {
      promoRejectedReason = 'Invalid promotional code.';
    } else if (promo.firstOrderOnly && !isFirstOrder) {
      promoRejectedReason = 'This code is valid for your first order only.';
    } else {
      couponPct = Math.min(90, Math.max(0, promo.discountPct));
      appliedCouponCode = expectedCode;
    }
  }

  let couponDiscountAmount =
    couponPct > 0 ? roundForRegion((params.subtotal * couponPct) / 100, params.regionCode) : 0;
  let bulkDiscountAmount = bulkEval.discountAmount;

  if (couponDiscountAmount > 0 && bulkDiscountAmount > 0 && !bulk.stackWithCoupon) {
    if (bulkDiscountAmount >= couponDiscountAmount) {
      couponDiscountAmount = 0;
      appliedCouponCode = null;
    } else {
      bulkDiscountAmount = 0;
    }
  }

  const totalDiscountAmount = Math.min(
    params.subtotal,
    roundForRegion(couponDiscountAmount + bulkDiscountAmount, params.regionCode)
  );

  return {
    couponDiscountAmount,
    bulkDiscountAmount,
    totalDiscountAmount,
    appliedCouponCode,
    appliedBulkTier: bulkDiscountAmount > 0 ? bulkEval.appliedTier : null,
    nextBulkTier: bulkEval.nextTier,
    unitsNeededForNext: bulkEval.unitsNeededForNext,
    promoRejectedReason,
  };
}

export interface CheckoutTotals {
  subtotal: number;
  discountAmount: number;
  couponDiscountAmount: number;
  bulkDiscountAmount: number;
  appliedCouponCode: string | null;
  appliedBulkTier: BulkDiscountTier | null;
  nextBulkTier: BulkDiscountTier | null;
  unitsNeededForNext: number;
  promoRejectedReason: string | null;
  shippingCost: number;
  vatAmount: number;
  total: number;
  freeShippingApplied: boolean;
}

export function calculateCheckoutTotals(params: {
  items: Pick<CartItem, 'unitPrice' | 'quantity'>[];
  region: Pick<RegionConfig, 'code' | 'vat_rate' | 'free_shipping_threshold' | 'dhl_base_rate' | 'dhl_express_rate'>;
  shippingMethod: ShippingMethod;
  discountCode?: string;
  promoSettings?: PromotionPopupSettings;
  bulkSettings?: BulkDiscountSettings;
  isFirstOrder?: boolean;
}): CheckoutTotals {
  const subtotal = params.items.reduce(
    (sum, item) => sum + item.unitPrice * Math.max(0, item.quantity),
    0
  );
  const totalQty = params.items.reduce((sum, item) => sum + Math.max(0, item.quantity), 0);

  const discountRes = resolveOrderDiscounts({
    subtotal,
    totalQty,
    regionCode: params.region.code,
    discountCode: params.discountCode,
    promoSettings: params.promoSettings,
    bulkSettings: params.bulkSettings,
    isFirstOrder: params.isFirstOrder,
  });

  const discountAmount = discountRes.totalDiscountAmount;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const { cost: shippingCost, freeShippingApplied } = calculateDhlShippingCost(
    discountedSubtotal,
    params.region,
    params.shippingMethod
  );

  const total = roundForRegion(discountedSubtotal + shippingCost, params.region.code);

  const vatRate = Math.max(0, params.region.vat_rate);
  const extractedVat =
    vatRate > 0 ? total - total / (1 + vatRate) : 0;
  const vatAmount = roundForRegion(extractedVat, params.region.code);

  return {
    subtotal,
    discountAmount,
    couponDiscountAmount: discountRes.couponDiscountAmount,
    bulkDiscountAmount: discountRes.bulkDiscountAmount,
    appliedCouponCode: discountRes.appliedCouponCode,
    appliedBulkTier: discountRes.appliedBulkTier,
    nextBulkTier: discountRes.nextBulkTier,
    unitsNeededForNext: discountRes.unitsNeededForNext,
    promoRejectedReason: discountRes.promoRejectedReason,
    shippingCost,
    vatAmount,
    total,
    freeShippingApplied,
  };
}

export function getAvailablePaymentMethods(region: Pick<RegionConfig, 'code' | 'enabled_payments'>): PaymentMethod[] {
  const allowed = new Set<PaymentMethod>(region.enabled_payments);
  if (region.code !== 'no') {
    allowed.delete('vipps');
  }
  return Array.from(allowed);
}

export function generateBankReference(prefix: string, orderNumber: string): string {
  const digits = orderNumber.replace(/\D/g, '').slice(-6).padStart(6, '0');
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let n = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 0) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${prefix}${digits}${checkDigit}`;
}

export function hasPermission(
  user: Pick<AuthUser, 'role' | 'permissions' | 'active'> | null | undefined,
  permission: StaffPermissionKey
): boolean {
  if (!user || !user.active) return false;
  if (user.role === 'owner') return true;
  if (user.role !== 'staff') return false;
  return Boolean(user.permissions?.[permission]);
}

export function calculateB2BMoqSummary(
  sizeBreakdown: Record<string, number>,
  moqPerColor = 20
): { totalPieces: number; meetsMoq: boolean; remainingForMoq: number } {
  const totalPieces = Object.values(sizeBreakdown).reduce(
    (sum, qty) => sum + Math.max(0, Math.floor(Number.isFinite(qty) ? qty : 0)),
    0
  );
  const meetsMoq = totalPieces >= moqPerColor;
  const remainingForMoq = meetsMoq ? 0 : moqPerColor - totalPieces;
  return { totalPieces, meetsMoq, remainingForMoq };
}

function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  return [headerLine, ...dataLines].join('\r\n');
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result.map((s) => s.trim());
}

export function parseProductImportCsv(csvText: string): {
  rows: CsvImportRow[];
  errors: string[];
} {
  const clean = csvText.replace(/^\uFEFF/, '').trim();
  if (!clean) {
    return { rows: [], errors: ['CSV content is empty.'] };
  }
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], errors: ['CSV must contain a header row and at least one data row.'] };
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (name: string) => headers.indexOf(name);
  const skuIdx = idx('sku');
  const regIdx = idx('region_code');

  if (skuIdx === -1 || regIdx === -1) {
    return {
      rows: [],
      errors: ['Required columns missing: "sku" and "region_code" must be in the CSV header.'],
    };
  }

  const titleIdx = idx('title');
  const priceIdx = idx('price');
  const compareIdx = idx('compare_at_price');
  const stockIdx = idx('stock_qty');
  const catIdx = idx('category_slug');

  const rows: CsvImportRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const sku = (cells[skuIdx] || '').trim();
    const rcRaw = (cells[regIdx] || '').trim().toLowerCase();

    if (!sku) {
      errors.push(`Row ${i + 1}: missing SKU.`);
      continue;
    }
    if (rcRaw !== 'en' && rcRaw !== 'no' && rcRaw !== 'it' && rcRaw !== 'vn') {
      errors.push(`Row ${i + 1}: invalid region_code "${rcRaw}" (expected en, no, it, or vn).`);
      continue;
    }

    const row: CsvImportRow = { sku, region_code: rcRaw };
    if (titleIdx !== -1 && cells[titleIdx]) row.title = cells[titleIdx];
    if (catIdx !== -1 && cells[catIdx]) row.category_slug = cells[catIdx];

    if (priceIdx !== -1 && cells[priceIdx] !== undefined && cells[priceIdx] !== '') {
      const parsed = Number(cells[priceIdx]);
      if (!Number.isFinite(parsed) || parsed < 0) {
        errors.push(`Row ${i + 1}: invalid price "${cells[priceIdx]}".`);
        continue;
      }
      row.price = parsed;
    }

    if (compareIdx !== -1 && cells[compareIdx] !== undefined && cells[compareIdx] !== '') {
      const parsedCmp = Number(cells[compareIdx]);
      if (Number.isFinite(parsedCmp) && parsedCmp >= 0) {
        row.compare_at_price = parsedCmp;
      }
    }

    if (stockIdx !== -1 && cells[stockIdx] !== undefined && cells[stockIdx] !== '') {
      const parsedStock = Math.floor(Number(cells[stockIdx]));
      if (!Number.isFinite(parsedStock) || parsedStock < 0) {
        errors.push(`Row ${i + 1}: invalid stock_qty "${cells[stockIdx]}".`);
        continue;
      }
      row.stock_qty = parsedStock;
    }

    rows.push(row);
  }

  return { rows, errors };
}

export const DEFAULT_TAILORING_SURCHARGE: Record<RegionCode, number> = {
  en: 10,
  no: 100,
  it: 10,
  vn: 250000,
};

export function calculateTailoringSurcharge(
  tailoring: Pick<
    BespokeTailoring,
    | 'waistAdjustmentCm'
    | 'chestAdjustmentCm'
    | 'bottomHemAdjustmentCm'
    | 'shoulderAdjustmentCm'
  >,
  regionCode: RegionCode,
  rateMap: Record<RegionCode, number> = DEFAULT_TAILORING_SURCHARGE
): number {
  const unitRate = rateMap[regionCode] ?? DEFAULT_TAILORING_SURCHARGE.en;
  let paidCount = 0;
  if (Number(tailoring.waistAdjustmentCm || 0) !== 0) paidCount++;
  if (Number(tailoring.chestAdjustmentCm || 0) !== 0) paidCount++;
  if (Number(tailoring.bottomHemAdjustmentCm || 0) !== 0) paidCount++;
  if (Number(tailoring.shoulderAdjustmentCm || 0) !== 0) paidCount++;
  return paidCount * unitRate;
}

export function resolveVariantPriceAndStock(
  product: Pick<Product, 'price' | 'stock_qty' | 'sku' | 'variants'>,
  regionCode: RegionCode,
  fit: string,
  size: string
): { price: number; stockQty: number; variantSku: string } {
  const normalizedFit = fit.trim().toLowerCase();
  const normalizedSize = size.trim().toLowerCase();
  const match = (product.variants || []).find(
    (v) =>
      v.active &&
      v.fit.trim().toLowerCase() === normalizedFit &&
      v.size_label.trim().toLowerCase() === normalizedSize
  );
  if (!match) {
    return {
      price: product.price,
      stockQty: product.stock_qty,
      variantSku: product.sku,
    };
  }
  const priceKey = `price_${regionCode}` as const;
  const stockKey = `stock_${regionCode}` as const;
  const overridePrice = match[priceKey];
  const variantStock = match[stockKey];
  return {
    price:
      typeof overridePrice === 'number' && Number.isFinite(overridePrice) && overridePrice > 0
        ? overridePrice
        : product.price,
    stockQty: Number.isFinite(variantStock) ? Math.max(0, variantStock) : product.stock_qty,
    variantSku: match.sku_variant || product.sku,
  };
}

export function computeBulkPriceAdjustment(
  currentPrice: number,
  mode: 'percent' | 'fixed_delta' | 'set_exact',
  value: number,
  regionCode: RegionCode
): number {
  let raw = currentPrice;
  if (mode === 'percent') {
    raw = currentPrice * (1 + value / 100);
  } else if (mode === 'fixed_delta') {
    raw = currentPrice + value;
  } else if (mode === 'set_exact') {
    raw = value;
  }
  const clamped = Math.max(1, raw);
  if (regionCode === 'no' || regionCode === 'vn') {
    return Math.round(clamped);
  }
  return Number(clamped.toFixed(2));
}

export function extractNumericCollarSize(sizeLabel: string): number {
  const match = sizeLabel.match(/\d{2}/);
  return match ? Number(match[0]) : 40;
}

export function computeDefaultSizeMeasurements(
  fit: TailoringSizeSpec['fit'],
  sizeLabel: string
): Pick<
  TailoringSizeSpec,
  'shirt_length_cm' | 'sleeve_length_cm' | 'waist_cm' | 'chest_cm' | 'bottom_hem_cm' | 'shoulder_cm'
> {
  const num = extractNumericCollarSize(sizeLabel);
  const offset = num - 40;
  const fitChestAdj = fit === 'Slim Fit' ? -4 : fit === 'Contemporary Fit' ? -2 : 0;
  const fitWaistAdj = fit === 'Slim Fit' ? -6 : fit === 'Contemporary Fit' ? -3 : 0;
  const fitHemAdj = fit === 'Slim Fit' ? -4 : fit === 'Contemporary Fit' ? -2 : 0;

  return {
    shirt_length_cm: Math.round((77 + offset * 0.5) * 10) / 10,
    sleeve_length_cm: Math.round((65 + offset * 0.5) * 10) / 10,
    waist_cm: Math.round((102 + offset * 3 + fitWaistAdj) * 10) / 10,
    chest_cm: Math.round((110 + offset * 3 + fitChestAdj) * 10) / 10,
    bottom_hem_cm: Math.round((106 + offset * 3 + fitHemAdj) * 10) / 10,
    shoulder_cm: Math.round((46 + offset * 0.7) * 10) / 10,
  };
}

export function calculateB2BTierDiscount(totalPieces: number): {
  tierLabel: string;
  discountPct: number;
} {
  const qty = Math.max(0, Math.floor(Number.isFinite(totalPieces) ? totalPieces : 0));
  if (qty >= 100) return { tierLabel: 'Enterprise 100+', discountPct: 30 };
  if (qty >= 50) return { tierLabel: 'Corporate 50–99', discountPct: 22 };
  if (qty >= 20) return { tierLabel: 'Standard MOQ 20–49', discountPct: 15 };
  return { tierLabel: 'Sample / Under MOQ (<20)', discountPct: 0 };
}

export function estimateB2BUnitRate(
  retailUnitPrice: number,
  totalPieces: number,
  regionCode: RegionCode
): number {
  const { discountPct } = calculateB2BTierDiscount(totalPieces);
  const raw = Math.max(1, retailUnitPrice * (1 - discountPct / 100));
  if (regionCode === 'no' || regionCode === 'vn') {
    return Math.round(raw);
  }
  return Number(raw.toFixed(2));
}

export interface AddressBlock {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export function normalizeBillingAddress(
  shipping: AddressBlock,
  billingSameAsShipping: boolean,
  billingInput?: Partial<AddressBlock>
): AddressBlock {
  if (billingSameAsShipping || !billingInput) {
    return { ...shipping };
  }
  return {
    name: billingInput.name?.trim() || shipping.name,
    email: billingInput.email?.trim() || shipping.email,
    phone: billingInput.phone?.trim() || shipping.phone,
    address: billingInput.address?.trim() || shipping.address,
    city: billingInput.city?.trim() || shipping.city,
    postalCode: billingInput.postalCode?.trim() || shipping.postalCode,
    country: billingInput.country?.trim() || shipping.country,
  };
}

export function slugifyCategoryName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'category';
}

export function convertBasePriceAcrossRegions(
  baseAmount: number,
  sourceRegion: RegionCode
): Record<RegionCode, number> {
  const usdRate: Record<RegionCode, number> = {
    en: 1,
    it: 0.92,
    no: 10.6,
    vn: 25200,
  };
  const usdAmount = baseAmount / (usdRate[sourceRegion] || 1);
  return {
    en: Math.max(1, Math.round(usdAmount)),
    it: Math.max(1, Math.round(usdAmount * usdRate.it)),
    no: Math.max(10, Math.round((usdAmount * usdRate.no) / 10) * 10 - 1),
    vn: Math.max(50000, Math.round((usdAmount * usdRate.vn) / 10000) * 10000),
  };
}

function parseFullCsvTable(csvText: string): string[][] {
  const clean = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '"') {
      if (inQuotes && clean[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(cur.trim());
      cur = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(cur.trim());
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      cur = '';
    } else {
      cur += ch;
    }
  }
  row.push(cur.trim());
  if (row.some((cell) => cell.length > 0)) {
    rows.push(row);
  }
  return rows;
}

export function isWooCommerceCsvHeader(csvText: string): boolean {
  const table = parseFullCsvTable(csvText);
  if (table.length === 0) return false;
  const headers = table[0].map((h) => h.toLowerCase());
  return (
    headers.includes('name') &&
    (headers.includes('regular price') || headers.includes('categories') || headers.includes('images'))
  );
}

export function parseWooCommerceCsv(
  csvText: string,
  sourceRegion: RegionCode = 'en'
): {
  rows: Array<{
    sku: string;
    title: string;
    shortDescription: string;
    description: string;
    regularPrice: number;
    salePrice: number | null;
    stockQty: number;
    categoryPaths: string[];
    images: string[];
    fabricSpec: string;
    published: boolean;
    sourceRegion: RegionCode;
  }>;
  categories: Array<{ slug: string; name: string; parentSlug: string | null }>;
  errors: string[];
} {
  const table = parseFullCsvTable(csvText);
  if (table.length < 2) {
    return {
      rows: [],
      categories: [],
      errors: ['WooCommerce CSV must include a header row and at least one product row.'],
    };
  }

  const headers = table[0].map((h) => h.toLowerCase());
  const col = (...names: string[]) => {
    for (const n of names) {
      const i = headers.indexOf(n);
      if (i !== -1) return i;
    }
    return -1;
  };

  const skuIdx = col('sku', 'id');
  const nameIdx = col('name', 'post_title', 'title');
  const regularPriceIdx = col('regular price', 'regular_price', 'price');
  const salePriceIdx = col('sale price', 'sale_price');
  const categoriesIdx = col('categories', 'tax:product_cat');
  const imagesIdx = col('images', 'image');
  const stockIdx = col('stock', 'stock quantity', 'stock_qty');
  const descIdx = col('description', 'post_content');
  const shortDescIdx = col('short description', 'post_excerpt', 'short_description');
  const publishedIdx = col('published');
  const attr1NameIdx = col('attribute 1 name');
  const attr1ValIdx = col('attribute 1 value(s)', 'attribute 1 values');

  if (nameIdx === -1) {
    return {
      rows: [],
      categories: [],
      errors: ['Missing required WooCommerce "Name" column.'],
    };
  }

  const rows: Array<{
    sku: string;
    title: string;
    shortDescription: string;
    description: string;
    regularPrice: number;
    salePrice: number | null;
    stockQty: number;
    categoryPaths: string[];
    images: string[];
    fabricSpec: string;
    published: boolean;
    sourceRegion: RegionCode;
  }> = [];
  const categoryMap = new Map<string, { slug: string; name: string; parentSlug: string | null }>();
  const errors: string[] = [];

  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    const title = (cells[nameIdx] || '').trim();
    if (!title) {
      errors.push(`Row ${r + 1}: empty product Name.`);
      continue;
    }
    const rawSku = skuIdx !== -1 ? (cells[skuIdx] || '').trim() : '';
    const sku = rawSku || `WOO-${slugifyCategoryName(title).toUpperCase().slice(0, 12)}-${r}`;

    const regRaw = regularPriceIdx !== -1 ? Number((cells[regularPriceIdx] || '').replace(/[^0-9.]/g, '')) : 0;
    const saleRaw = salePriceIdx !== -1 ? Number((cells[salePriceIdx] || '').replace(/[^0-9.]/g, '')) : 0;
    const regularPrice = Number.isFinite(regRaw) && regRaw > 0 ? regRaw : saleRaw > 0 ? saleRaw : 175;
    const salePrice = Number.isFinite(saleRaw) && saleRaw > 0 && saleRaw < regularPrice ? saleRaw : null;

    const stockRaw = stockIdx !== -1 ? Math.floor(Number(cells[stockIdx] || 15)) : 15;
    const stockQty = Number.isFinite(stockRaw) && stockRaw >= 0 ? stockRaw : 15;

    const rawCats = categoriesIdx !== -1 ? cells[categoriesIdx] || '' : '';
    const categoryPaths = rawCats
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const pathStr of categoryPaths) {
      const segments = pathStr
        .split('>')
        .map((s) => s.trim())
        .filter(Boolean);
      let parentSlug: string | null = null;
      for (const seg of segments) {
        const slug = slugifyCategoryName(seg);
        if (!categoryMap.has(slug)) {
          categoryMap.set(slug, { slug, name: seg, parentSlug });
        }
        parentSlug = slug;
      }
    }

    const rawImgs = imagesIdx !== -1 ? cells[imagesIdx] || '' : '';
    const images = rawImgs
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//i.test(s) || s.startsWith('/'));

    const attrName = attr1NameIdx !== -1 ? (cells[attr1NameIdx] || '').trim() : '';
    const attrVal = attr1ValIdx !== -1 ? (cells[attr1ValIdx] || '').trim() : '';
    const fabricSpec = attrVal ? `${attrName ? `${attrName}: ` : ''}${attrVal}` : '100% Italian 2-Ply Cotton';

    const publishedVal = publishedIdx !== -1 ? (cells[publishedIdx] || '1').trim() : '1';
    const published = publishedVal !== '0' && publishedVal.toLowerCase() !== 'false';

    rows.push({
      sku,
      title,
      shortDescription: shortDescIdx !== -1 ? (cells[shortDescIdx] || '').replace(/<[^>]+>/g, '').trim() : '',
      description: descIdx !== -1 ? (cells[descIdx] || '').replace(/<[^>]+>/g, '').trim() : '',
      regularPrice,
      salePrice,
      stockQty,
      categoryPaths,
      images,
      fabricSpec,
      published,
      sourceRegion,
    });
  }

  return { rows, categories: Array.from(categoryMap.values()), errors };
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .trim();
}

function extractXmlTag(block: string, tagName: string): string {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i');
  const m = block.match(re);
  return m ? decodeXmlEntities(m[1]) : '';
}

export function parseWordPressCategoriesXml(xmlText: string): {
  categories: Array<{ slug: string; name: string; parentSlug: string | null }>;
  errors: string[];
} {
  const clean = xmlText.replace(/^\uFEFF/, '').trim();
  if (!clean) {
    return { categories: [], errors: ['WordPress XML content is empty.'] };
  }

  const found = new Map<string, { slug: string; name: string; parentSlug: string | null }>();

  // 1. Parse <wp:term> blocks (WooCommerce product_cat & standard terms)
  const termRegex = /<wp:term>([\s\S]*?)<\/wp:term>/gi;
  let match: RegExpExecArray | null;
  while ((match = termRegex.exec(clean)) !== null) {
    const block = match[1];
    const taxonomy = extractXmlTag(block, 'wp:term_taxonomy');
    if (taxonomy && taxonomy !== 'product_cat' && taxonomy !== 'category') continue;
    const name = extractXmlTag(block, 'wp:term_name');
    const slug = extractXmlTag(block, 'wp:term_slug') || slugifyCategoryName(name);
    const parent = extractXmlTag(block, 'wp:term_parent') || null;
    if (name && slug) {
      found.set(slug, { slug, name, parentSlug: parent || null });
    }
  }

  // 2. Parse <wp:category> blocks (classic WordPress export)
  const catRegex = /<wp:category>([\s\S]*?)<\/wp:category>/gi;
  while ((match = catRegex.exec(clean)) !== null) {
    const block = match[1];
    const name = extractXmlTag(block, 'wp:cat_name');
    const slug = extractXmlTag(block, 'wp:category_nicename') || slugifyCategoryName(name);
    const parent = extractXmlTag(block, 'wp:category_parent') || null;
    if (name && slug) {
      found.set(slug, { slug, name, parentSlug: parent || null });
    }
  }

  // 3. Fallback: scan <category domain="product_cat" nicename="...">Name</category>
  const inlineCatRegex = /<category[^>]*domain=["'](product_cat|category)["'][^>]*nicename=["']([^"']+)["'][^>]*>([\s\S]*?)<\/category>/gi;
  while ((match = inlineCatRegex.exec(clean)) !== null) {
    const slug = match[2].trim();
    const name = decodeXmlEntities(match[3]);
    if (slug && name && !found.has(slug)) {
      found.set(slug, { slug, name, parentSlug: null });
    }
  }

  if (found.size === 0) {
    return {
      categories: [],
      errors: ['No WordPress categories (<wp:term>, <wp:category>, or product_cat) were found in the XML.'],
    };
  }

  // Topological sort so parents come before children
  const list = Array.from(found.values());
  list.sort((a, b) => {
    if (!a.parentSlug && b.parentSlug) return -1;
    if (a.parentSlug && !b.parentSlug) return 1;
    return 0;
  });

  return { categories: list, errors: [] };
}

export function productMatchesCategories(
  product: Pick<Product, 'category_slug' | 'category_slugs'>,
  allowedSlugs: Set<string> | null
): boolean {
  if (!allowedSlugs || allowedSlugs.size === 0) return true;
  if (allowedSlugs.has(product.category_slug)) return true;
  if (Array.isArray(product.category_slugs)) {
    return product.category_slugs.some((slug) => allowedSlugs.has(slug));
  }
  return false;
}

export function isTopBannerVisibleOnViewport(
  banner: Pick<TopBannerSettings, 'enabled' | 'visibility'>,
  viewportWidth: number
): boolean {
  if (!banner.enabled) return false;
  if (banner.visibility === 'desktop_only') return viewportWidth >= 768;
  if (banner.visibility === 'mobile_only') return viewportWidth < 768;
  return true;
}

export const DEFAULT_CUSTOMER_AUTH_SETTINGS: CustomerAuthSettings = {
  googleLoginEnabled: true,
  showCornerPopup: true,
  autoSubscribeMailchimp: true,
  cornerPopupDelaySeconds: 3,
};

export interface ResolvedTailoringChoice {
  name: string;
  subtitle: string;
  detail: string;
  stitchSpec: string;
  imageUrl: string;
  isDefault: boolean;
  sortOrder: number;
}

const DEFAULT_FALLBACK_COLLARS = ['Spread', 'Semi Spread', 'Button Down', 'Cutaway'];
const DEFAULT_FALLBACK_CUFFS = ['Angle', 'Modern', 'Rounded', 'Single French'];

export function resolveOrderedTailoringOptions(
  optionType: 'collar' | 'cuff',
  productOptionNames: string[] | undefined,
  catalogOptions: Array<{
    option_type: 'collar' | 'cuff';
    name: string;
    subtitle: string;
    detail: string;
    stitch_spec: string;
    image_url: string;
    sort_order: number;
    is_default: boolean;
    active: boolean;
  }> | undefined
): ResolvedTailoringChoice[] {
  const fallbackNames = optionType === 'collar' ? DEFAULT_FALLBACK_COLLARS : DEFAULT_FALLBACK_CUFFS;
  const activeCatalog = (catalogOptions || [])
    .filter((o) => o.option_type === optionType && o.active)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  const cleanProductNames = (productOptionNames || []).map((n) => n.trim()).filter(Boolean);

  if (activeCatalog.length === 0) {
    const baseNames = cleanProductNames.length > 0 ? cleanProductNames : fallbackNames;
    return baseNames.map((name, idx) => ({
      name,
      subtitle: '',
      detail: '',
      stitchSpec: '',
      imageUrl: '',
      isDefault: idx === 0,
      sortOrder: idx + 1,
    }));
  }

  const productSet = new Set(cleanProductNames.map((n) => n.toLowerCase()));
  const catalogByLower = new Map(activeCatalog.map((c) => [c.name.toLowerCase(), c]));

  let ordered: ResolvedTailoringChoice[] = activeCatalog
    .filter((c) => productSet.size === 0 || productSet.has(c.name.toLowerCase()))
    .map((c) => ({
      name: c.name,
      subtitle: c.subtitle,
      detail: c.detail,
      stitchSpec: c.stitch_spec,
      imageUrl: c.image_url,
      isDefault: Boolean(c.is_default),
      sortOrder: c.sort_order,
    }));

  for (const rawName of cleanProductNames) {
    const low = rawName.toLowerCase();
    const inFullCatalog = (catalogOptions || []).find(
      (c) => c.option_type === optionType && c.name.toLowerCase() === low
    );
    if (!inFullCatalog && !catalogByLower.has(low) && !ordered.some((o) => o.name.toLowerCase() === low)) {
      ordered.push({
        name: rawName,
        subtitle: '',
        detail: '',
        stitchSpec: '',
        imageUrl: '',
        isDefault: false,
        sortOrder: ordered.length + 100,
      });
    }
  }

  if (ordered.length === 0) {
    ordered = activeCatalog.map((c) => ({
      name: c.name,
      subtitle: c.subtitle,
      detail: c.detail,
      stitchSpec: c.stitch_spec,
      imageUrl: c.image_url,
      isDefault: Boolean(c.is_default),
      sortOrder: c.sort_order,
    }));
  }

  if (!ordered.some((o) => o.isDefault) && ordered.length > 0) {
    ordered[0] = { ...ordered[0], isDefault: true };
  }

  return ordered;
}

