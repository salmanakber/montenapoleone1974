export type RegionCode = 'en' | 'no' | 'it' | 'vn';

export type PaymentMethod = 'stripe' | 'paypal' | 'vipps' | 'bank_transfer';

export type ShippingMethod = 'dhl_express' | 'dhl_economy';

export type UserRole = 'owner' | 'staff' | 'customer';

export type StaffPermissionKey =
  | 'manage_products'
  | 'manage_inventory'
  | 'manage_pricing'
  | 'manage_orders'
  | 'manage_media'
  | 'manage_b2b'
  | 'manage_staff'
  | 'manage_settings';

export type StaffPermissions = Record<StaffPermissionKey, boolean>;

export interface RegionConfig {
  code: RegionCode;
  name: string;
  language_name: string;
  currency_code: string;
  currency_symbol: string;
  vat_rate: number;
  free_shipping_threshold: number;
  dhl_base_rate: number;
  dhl_express_rate: number;
  dhl_eta_days: string;
  bank_name: string;
  bank_account_display: string;
  bank_iban: string;
  bank_bic: string;
  bank_reference_prefix: string;
  enabled_payments: PaymentMethod[];
  warehouse_name: string;
}

export type CategoryScope = 'both' | 'b2c' | 'b2b';

export interface CategoryRecord {
  id: number;
  slug: string;
  parent_id: number | null;
  scope: CategoryScope;
  active: boolean;
  sort_order: number;
  name_en: string;
  name_no: string;
  name_it: string;
  name_vn: string;
}

export interface ProductLocalization {
  product_id: number;
  region_code: RegionCode;
  title: string;
  subtitle: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  stock_qty: number;
  warehouse_location: string;
  delivery_note: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
}

export type TailoringZoneKey =
  | 'shirt_length'
  | 'sleeve_length'
  | 'waist'
  | 'chest'
  | 'bottom_hem'
  | 'shoulder';

export interface TailoringSizeSpec {
  id?: number;
  fit: 'Regular Fit' | 'Slim Fit' | 'Contemporary Fit' | 'Tailored Classic';
  size_label: string;
  shirt_length_cm: number;
  sleeve_length_cm: number;
  waist_cm: number;
  chest_cm: number;
  bottom_hem_cm: number;
  shoulder_cm: number;
  sketch_shirt_length: string;
  sketch_sleeve_length: string;
  sketch_waist: string;
  sketch_chest: string;
  sketch_bottom_hem: string;
  sketch_shoulder: string;
  updated_at?: string;
}

export interface ProductVariant {
  id?: number;
  product_id: number;
  fit: 'Regular Fit' | 'Slim Fit' | 'Contemporary Fit';
  size_label: string;
  sku_variant: string;
  price_en: number | null;
  price_no: number | null;
  price_it: number | null;
  price_vn: number | null;
  stock_en: number;
  stock_no: number;
  stock_it: number;
  stock_vn: number;
  active: boolean;
}

export interface StockMovement {
  id: number;
  product_id: number;
  sku: string;
  variant_label: string | null;
  region_code: RegionCode;
  delta_qty: number;
  previous_qty: number;
  new_qty: number;
  reason: string;
  reference_id: string;
  actor_email: string;
  created_at: string;
}

export interface CountryMetric {
  country: string;
  region_code: RegionCode;
  lat: number;
  lng: number;
  orders: number;
  revenue_usd_equiv: number;
  units_sold: number;
  hub_label: string;
}

export interface VisitorSessionMetric {
  id: number;
  session_id: string;
  country: string;
  country_code: string;
  city: string;
  lat: number;
  lng: number;
  region_code: RegionCode;
  current_path: string;
  last_seen_at: string;
  is_active?: boolean;
}

export interface DailyRevenuePoint {
  date: string;
  orders: number;
  revenue_usd_equiv: number;
  b2c_orders: number;
  b2b_orders: number;
}

export interface CategoryMetric {
  category_slug: string;
  units_sold: number;
  revenue_usd_equiv: number;
}

export interface AdminReportData {
  byRegion: Array<{ region_code: RegionCode; currency_code: string; orders: number; paid_revenue: number; total_revenue: number; items_sold: number }>;
  byPaymentMethod: Array<{ payment_method: PaymentMethod; count: number; total_amount: number }>;
  byStatus: Array<{ order_status: string; count: number }>;
  topSkus: Array<{ sku: string; title: string; units_sold: number; revenue: number }>;
  stockHealth: { total_skus: number; low_stock_alerts: number; out_of_stock: number; total_movements: number };
  byCountry?: CountryMetric[];
  dailySeries?: DailyRevenuePoint[];
  byCategory?: CategoryMetric[];
  visitorLocations?: VisitorSessionMetric[];
  activeVisitorsCount?: number;
}

export interface Product {
  id: number;
  sku: string;
  slug: string;
  category_slug: string;
  category_slugs?: string[];
  fabric_spec: string;
  is_featured: boolean;
  is_b2b_eligible: boolean;
  is_outlet: boolean;
  preorder_allowed: boolean;
  primary_image: string;
  secondary_image: string;
  gallery: string[];
  collars: string[];
  cuffs: string[];
  sizes: string[];
  active: boolean;
  // Active region fields
  title: string;
  subtitle: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  stock_qty: number;
  warehouse_location: string;
  delivery_note: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  review_count?: number;
  average_rating?: number;
  reviews?: Array<{
    customer_name: string;
    rating: number;
    title: string;
    comment: string;
    created_at: string;
  }>;
  localizations?: Record<RegionCode, ProductLocalization>;
  variants?: ProductVariant[];
}

export type TailoringOptionType = 'collar' | 'cuff';

export interface TailoringOptionRecord {
  id: number;
  option_type: TailoringOptionType;
  name: string;
  subtitle: string;
  detail: string;
  stitch_spec: string;
  image_url: string;
  sort_order: number;
  is_default: boolean;
  active: boolean;
  updated_at?: string;
}

export interface ProductReview {
  id: number;
  product_id: number;
  order_number: string;
  customer_name: string;
  rating: number;
  title: string;
  comment: string;
  fit_feedback?: 'runs_small' | 'true_to_size' | 'runs_large';
  region_code: RegionCode;
  verified_purchase: boolean;
  created_at: string;
}

export interface ProductReviewsResponse {
  reviews: ProductReview[];
  reviewCount: number;
  averageRating: number;
  viewer: {
    canReview: boolean;
    alreadyReviewed: boolean;
    reason?: 'invite_verified' | 'order_verified' | 'already_reviewed' | 'purchase_required';
    orderNumber?: string;
    customerName?: string;
  };
}

export interface BespokeTailoring {
  fit: 'Slim Fit' | 'Regular Fit' | 'Contemporary Fit' | 'Tailored Classic';
  size: string;
  collar: string;
  cuff: string;
  sleeveAdjustmentCm: number;
  lengthAdjustmentCm: number;
  waistAdjustmentCm?: number;
  chestAdjustmentCm?: number;
  bottomHemAdjustmentCm?: number;
  shoulderAdjustmentCm?: number;
  tailoringSurcharge?: number;
  baseMeasurements?: Partial<Record<TailoringZoneKey, number>>;
  monogram?: string;
}

export interface CartItem {
  cartKey: string;
  productId: number;
  slug: string;
  sku: string;
  title: string;
  image: string;
  unitPrice: number;
  quantity: number;
  stockQty: number;
  preorderAllowed: boolean;
  tailoring: BespokeTailoring;
}

export interface DhlQuote {
  method: ShippingMethod;
  label: string;
  carrier: string;
  cost: number;
  etaDays: string;
  freeShippingApplied: boolean;
  mode: 'live_api' | 'regional_tariff';
}

export interface OrderItemSnapshot {
  productId: number;
  sku: string;
  title: string;
  image: string;
  unitPrice: number;
  quantity: number;
  tailoring: BespokeTailoring;
}

export interface OrderRecord {
  id: number;
  order_number: string;
  region_code: RegionCode;
  currency_code: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country: string;
  billing_same_as_shipping?: boolean;
  billing_name?: string;
  billing_email?: string;
  billing_phone?: string;
  billing_address?: string;
  billing_city?: string;
  billing_postal_code?: string;
  billing_country?: string;
  is_b2b: boolean;
  company_name: string | null;
  org_number: string | null;
  subtotal: number;
  shipping_cost: number;
  discount_amount: number;
  vat_amount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: 'pending' | 'awaiting_transfer' | 'paid' | 'refunded';
  payment_reference: string;
  shipping_method: ShippingMethod;
  dhl_tracking_number: string | null;
  dhl_status: 'pending_label' | 'label_created' | 'in_transit' | 'delivered';
  order_status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItemSnapshot[];
  notes: string | null;
  created_at: string;
}

export interface MediaAsset {
  id: number;
  filename: string;
  original_name: string;
  url: string;
  mime_type: string;
  size_bytes: number;
  width: number;
  height: number;
  folder: 'products' | 'editorial' | 'hero' | 'tailoring' | 'uploads';
  alt_text: string;
  caption: string;
  uploaded_by: string;
  created_at: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  permissions: StaffPermissions;
  assigned_regions: RegionCode[];
  active: boolean;
  created_at?: string;
}

export interface B2BQuotationItem {
  id: string;
  productId: number;
  sku: string;
  title: string;
  image: string;
  fit: 'SLIM FIT' | 'REGULAR FIT' | 'CONTEMPORARY FIT';
  collar: string;
  cuff: string;
  sizeBreakdown: Record<string, number>;
  totalPieces: number;
  notes: string;
}

export interface B2BInquiry {
  id: number;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  region_code: RegionCode;
  estimated_qty: number;
  embroidery_requested: boolean;
  notes: string;
  items?: B2BQuotationItem[];
  status: 'new' | 'reviewing' | 'quoted' | 'approved';
  quoted_unit_price?: number | null;
  converted_order_number?: string | null;
  created_at: string;
}

export interface MenuItemRecord {
  id: number;
  slot: 'mega_card' | 'nav_link';
  target_type: 'category' | 'view';
  target_value: string;
  sort_order: number;
  active: boolean;
  title_en: string;
  title_no: string;
  title_it: string;
  title_vn: string;
  image_url: string;
}

export interface DatabaseTableSummary {
  name: string;
  rowCount: number;
  columns: string[];
}

export interface DatabaseOverviewResponse {
  engine: string;
  dbPath: string;
  relativePath: string;
  uploadsPath: string;
  journalMode: string;
  fileSizeBytes: number;
  tables: DatabaseTableSummary[];
}

export interface NewsletterSubscriber {
  id: number;
  email: string;
  region_code: RegionCode;
  discount_code: string;
  status: 'subscribed' | 'unsubscribed';
  mailchimp_status: 'pending_sync' | 'synced' | 'sandbox_queued' | 'error';
  mailchimp_member_id: string | null;
  synced_at: string | null;
  created_at: string;
}

export interface CsvImportRow {
  sku: string;
  region_code: RegionCode;
  title?: string;
  price?: number;
  compare_at_price?: number | null;
  stock_qty?: number;
  category_slug?: string;
}

export interface HeroSlideRecord {
  id: number;
  sort_order: number;
  active: boolean;
  image_url: string;
  target_type: 'category' | 'view';
  target_value: string;
  show_text: boolean;
  show_button: boolean;
  title_en: string;
  title_no: string;
  title_it: string;
  title_vn: string;
  subtitle_en: string;
  subtitle_no: string;
  subtitle_it: string;
  subtitle_vn: string;
  cta_en: string;
  cta_no: string;
  cta_it: string;
  cta_vn: string;
}

export interface BulkDiscountTier {
  minQty: number;
  discountPct: number;
}

export interface BulkDiscountSettings {
  enabled: boolean;
  stackWithCoupon: boolean;
  tiers: BulkDiscountTier[];
}

export interface PromotionPopupSettings {
  popupEnabled: boolean;
  showFloatingButton: boolean;
  discountCode: string;
  discountPct: number;
  firstOrderOnly: boolean;
  delaySeconds: number;
  title_en: string;
  title_no: string;
  title_it: string;
  title_vn: string;
  subtitle_en: string;
  subtitle_no: string;
  subtitle_it: string;
  subtitle_vn: string;
  button_en: string;
  button_no: string;
  button_it: string;
  button_vn: string;
}

export type TopBannerVisibility = 'both' | 'desktop_only' | 'mobile_only';

export interface TopBannerSettings {
  enabled: boolean;
  visibility: TopBannerVisibility;
  text_en: string;
  text_no: string;
  text_it: string;
  text_vn: string;
  linkView: 'none' | 'catalog' | 'b2b' | 'about';
  linkCategory?: string;
  bgColor: string;
  textColor: string;
}

export interface AiPublicConfig {
  enabled: boolean;
  displayMode: 'agent' | 'chatbot';
  bubblePosition: 'left' | 'right';
  activeProvider: 'gemini' | 'openai';
  greeting_en: string;
  greeting_no: string;
  greeting_it: string;
  greeting_vn: string;
}

export interface AiAdminSettings extends AiPublicConfig {
  geminiModel: string;
  openaiModel: string;
  hasEnvGeminiKey?: boolean;
  hasEnvOpenaiKey?: boolean;
  hasStoredGeminiKey?: boolean;
  hasStoredOpenaiKey?: boolean;
  geminiKeyMasked?: string;
  openaiKeyMasked?: string;
}

export interface AiRecommendedProduct {
  id: number;
  slug: string;
  sku: string;
  title: string;
  price: number;
  primary_image: string;
  stock_qty: number;
  preorder_allowed: boolean;
  sizes: string[];
}

export interface AiAgentAction {
  type:
    | 'add_to_cart'
    | 'open_product'
    | 'switch_region'
    | 'apply_coupon'
    | 'open_category'
    | 'open_about'
    | 'open_b2b'
    | 'open_checkout';
  productSlug?: string;
  size?: string;
  fit?: 'Slim Fit' | 'Regular Fit' | 'Contemporary Fit';
  categorySlug?: string;
  regionCode?: RegionCode;
  couponCode?: string;
}

export interface AiPendingOffer {
  kind: 'product' | 'discount' | 'checkout';
  productSlug?: string;
  size?: string;
  fit?: 'Slim Fit' | 'Regular Fit' | 'Contemporary Fit';
  couponCode?: string;
}

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
  recommendedProducts?: AiRecommendedProduct[];
  agentAction?: AiAgentAction | null;
  pendingOffer?: AiPendingOffer | null;
  suggestedReplies?: string[];
}

export interface EmailLogRecord {
  id: number;
  order_number: string | null;
  recipient_email: string;
  region_code: RegionCode;
  template_type: 'order_confirmation' | 'shipping_tracking' | 'review_request' | 'test';
  subject: string;
  html_preview: string;
  status: 'sent' | 'sandbox_logged' | 'error';
  provider_id: string | null;
  error_message: string | null;
  created_at: string;
}

export type ApiCredentialKey =
  | 'PUBLIC_DOMAIN_URL'
  | 'RESEND_API_KEY'
  | 'RESEND_FROM_EMAIL'
  | 'VIPPS_CLIENT_ID'
  | 'VIPPS_CLIENT_SECRET'
  | 'VIPPS_SUBSCRIPTION_KEY'
  | 'VIPPS_MERCHANT_SERIAL_NUMBER'
  | 'PAYPAL_CLIENT_ID'
  | 'PAYPAL_CLIENT_SECRET'
  | 'STRIPE_SECRET_KEY'
  | 'WIX_CLIENT_ID'
  | 'WIX_CLIENT_SECRET'
  | 'WIX_SITE_ID'
  | 'MAILCHIMP_API_KEY'
  | 'MAILCHIMP_SERVER_PREFIX'
  | 'MAILCHIMP_LIST_ID'
  | 'DHL_API_KEY'
  | 'DHL_API_SECRET'
  | 'DHL_ACCOUNT_NUMBER'
  | 'GEOIP_API_KEY'
  | 'GOOGLE_CLIENT_ID'
  | 'GOOGLE_CLIENT_SECRET'
  | 'GEMINI_API_KEY'
  | 'OPENAI_API_KEY';

export interface ApiCredentialItem {
  key: ApiCredentialKey;
  label: string;
  group: 'auth' | 'email' | 'payments' | 'commerce' | 'logistics' | 'analytics' | 'ai';
  secret: boolean;
  placeholder: string;
  hasEnv: boolean;
  hasStored: boolean;
  configured: boolean;
  source: 'vault' | 'env' | 'unset';
  maskedValue: string;
}

export interface GatewayVerificationResult {
  provider: 'google' | 'paypal' | 'stripe' | 'wix' | 'vipps' | 'resend';
  ok: boolean;
  mode: 'live' | 'sandbox' | 'not_configured' | 'error';
  message: string;
  accountInfo?: string;
}

export interface CustomerAuthSettings {
  googleLoginEnabled: boolean;
  showCornerPopup: boolean;
  autoSubscribeMailchimp: boolean;
  cornerPopupDelaySeconds: number;
}

export interface CustomerAuthPublicConfig extends CustomerAuthSettings {
  googleConfigured: boolean;
  googleCallbackUrl?: string;
}

export interface ParsedCategoryImport {
  slug: string;
  name: string;
  parentSlug: string | null;
  scope?: CategoryScope;
}

export interface WooProductImportRow {
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
}





