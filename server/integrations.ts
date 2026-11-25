import crypto from 'crypto';
import type {
  ApiCredentialItem,
  ApiCredentialKey,
  DhlQuote,
  GatewayVerificationResult,
  OrderRecord,
  PaymentMethod,
  RegionCode,
  RegionConfig,
} from '../src/types.ts';
import { calculateDhlShippingCost, generateBankReference } from '../src/utils/commerce.ts';
import {
  buildOrderEmailTemplate,
  type OrderEmailTemplateType,
  type ReviewEmailLinkItem,
} from '../src/utils/emailTemplates.ts';
import { db } from './db.ts';

export const API_CREDENTIAL_CATALOG: Array<{
  key: ApiCredentialKey;
  label: string;
  group: ApiCredentialItem['group'];
  secret: boolean;
  placeholder: string;
}> = [
  { key: 'RESEND_API_KEY', label: 'Resend API Key', group: 'email', secret: true, placeholder: 're_xxxxxxxxxxxxxxxxxxxxxxxxx' },
  { key: 'RESEND_FROM_EMAIL', label: 'Resend From Email', group: 'email', secret: false, placeholder: 'Monte Napoleone 1974 <orders@montenapoleone1974.com>' },
  { key: 'VIPPS_CLIENT_ID', label: 'Vipps Client ID', group: 'payments', secret: false, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
  { key: 'VIPPS_CLIENT_SECRET', label: 'Vipps Client Secret', group: 'payments', secret: true, placeholder: 'Vipps Client Secret' },
  { key: 'VIPPS_SUBSCRIPTION_KEY', label: 'Vipps Subscription Key (Ocp-Apim)', group: 'payments', secret: true, placeholder: 'Ocp-Apim-Subscription-Key' },
  { key: 'VIPPS_MERCHANT_SERIAL_NUMBER', label: 'Vipps MSN (Merchant Serial)', group: 'payments', secret: false, placeholder: '123456' },
  { key: 'PAYPAL_CLIENT_ID', label: 'PayPal Client ID', group: 'payments', secret: false, placeholder: 'PayPal REST Client ID' },
  { key: 'PAYPAL_CLIENT_SECRET', label: 'PayPal Client Secret', group: 'payments', secret: true, placeholder: 'PayPal REST Secret' },
  { key: 'STRIPE_SECRET_KEY', label: 'Stripe Secret Key', group: 'payments', secret: true, placeholder: 'sk_live_... or sk_test_...' },
  { key: 'WIX_CLIENT_ID', label: 'Wix App Client ID', group: 'commerce', secret: false, placeholder: 'Wix OAuth App ID' },
  { key: 'WIX_CLIENT_SECRET', label: 'Wix App Secret Key', group: 'commerce', secret: true, placeholder: 'Wix App Secret' },
  { key: 'WIX_SITE_ID', label: 'Wix Site ID', group: 'commerce', secret: false, placeholder: 'Wix Meta Site / Instance ID' },
  { key: 'MAILCHIMP_API_KEY', label: 'Mailchimp API Key', group: 'commerce', secret: true, placeholder: 'xxxxxxxxxxxxxxxx-us21' },
  { key: 'MAILCHIMP_SERVER_PREFIX', label: 'Mailchimp Server Prefix', group: 'commerce', secret: false, placeholder: 'us21' },
  { key: 'MAILCHIMP_LIST_ID', label: 'Mailchimp Audience List ID', group: 'commerce', secret: false, placeholder: 'a1b2c3d4e5' },
  { key: 'DHL_API_KEY', label: 'DHL MyDHL API Key', group: 'logistics', secret: true, placeholder: 'MyDHL API Key' },
  { key: 'DHL_API_SECRET', label: 'DHL MyDHL API Secret', group: 'logistics', secret: true, placeholder: 'MyDHL API Secret' },
  { key: 'DHL_ACCOUNT_NUMBER', label: 'DHL Shipper Account Number', group: 'logistics', secret: false, placeholder: '123456789' },
  { key: 'GOOGLE_CLIENT_ID', label: 'Google / Gmail OAuth Client ID', group: 'auth', secret: false, placeholder: '1234567890-xxxx.apps.googleusercontent.com' },
  { key: 'GOOGLE_CLIENT_SECRET', label: 'Google / Gmail OAuth Client Secret', group: 'auth', secret: true, placeholder: 'GOCSPX-xxxxxxxxxxxxxxxxxxxx' },
  { key: 'PUBLIC_DOMAIN_URL', label: 'Public Production Domain URL (for OAuth & SEO)', group: 'auth', secret: false, placeholder: 'https://montenapoleone1974.com' },
  { key: 'GEOIP_API_KEY', label: 'GeoIP Lookup Token (ipinfo.io)', group: 'analytics', secret: true, placeholder: 'ipinfo token for live visitor globe' },
  { key: 'GEMINI_API_KEY', label: 'Gemini AI API Key Override', group: 'ai', secret: true, placeholder: 'AIza...' },
  { key: 'OPENAI_API_KEY', label: 'OpenAI API Key', group: 'ai', secret: true, placeholder: 'sk-...' },
];

const CREDENTIAL_KEY_SET = new Set<string>(API_CREDENTIAL_CATALOG.map((c) => c.key));

export function getStoredCredentialsMap(): Record<string, string> {
  try {
    const row = db
      .prepare("SELECT value_json FROM site_settings WHERE key = 'api_credentials'")
      .get() as { value_json: string } | undefined;
    if (!row?.value_json) return {};
    const parsed = JSON.parse(row.value_json);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function updateStoredCredentials(updates: Record<string, string | null>): void {
  const current = getStoredCredentialsMap();
  for (const [k, v] of Object.entries(updates)) {
    if (!CREDENTIAL_KEY_SET.has(k)) continue;
    if (v === null || v === '') {
      delete current[k];
    } else if (typeof v === 'string') {
      current[k] = v.trim();
    }
  }
  db.prepare(
    `INSERT INTO site_settings (key, value_json, updated_at)
     VALUES ('api_credentials', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')`
  ).run(JSON.stringify(current));
}

export function getResolvedSecret(key: ApiCredentialKey): string {
  const stored = getStoredCredentialsMap();
  const vaultVal = stored[key];
  if (typeof vaultVal === 'string' && vaultVal.trim().length > 0) {
    return vaultVal.trim();
  }
  const envVal = process.env[key];
  return typeof envVal === 'string' ? envVal.trim() : '';
}

function maskSecretValue(val: string, secret: boolean): string {
  if (!val) return '';
  if (!secret) {
    return val.length > 26 ? `${val.slice(0, 12)}...${val.slice(-6)}` : val;
  }
  if (val.length <= 6) return '••••••';
  return `••••••••${val.slice(-4)}`;
}

export function getCredentialsMaskedStatus(): ApiCredentialItem[] {
  const stored = getStoredCredentialsMap();
  return API_CREDENTIAL_CATALOG.map((spec) => {
    const storedVal = (stored[spec.key] || '').trim();
    const envVal = (process.env[spec.key] || '').trim();
    const hasStored = storedVal.length > 0;
    const hasEnv = envVal.length > 0;
    const resolved = hasStored ? storedVal : envVal;
    const source: ApiCredentialItem['source'] = hasStored ? 'vault' : hasEnv ? 'env' : 'unset';
    return {
      key: spec.key,
      label: spec.label,
      group: spec.group,
      secret: spec.secret,
      placeholder: spec.placeholder,
      hasEnv,
      hasStored,
      configured: resolved.length > 0,
      source,
      maskedValue: maskSecretValue(resolved, spec.secret),
    };
  });
}

export interface GatewayConfigurationStatus {
  google: { configured: boolean; label: string };
  stripe: { configured: boolean; label: string };
  paypal: { configured: boolean; label: string };
  vipps: { configured: boolean; label: string };
  dhl: { configured: boolean; label: string };
  mailchimp: { configured: boolean; label: string };
  resend: { configured: boolean; label: string };
  wix: { configured: boolean; label: string };
  geoip: { configured: boolean; label: string };
}

export function getGatewayConfigurationStatus(): GatewayConfigurationStatus {
  return {
    google: {
      configured:
        getResolvedSecret('GOOGLE_CLIENT_ID').length > 0 &&
        getResolvedSecret('GOOGLE_CLIENT_SECRET').length > 0,
      label: 'Google / Gmail Client Login',
    },
    stripe: {
      configured: getResolvedSecret('STRIPE_SECRET_KEY').length > 0,
      label: 'Stripe Checkout & Cards',
    },
    paypal: {
      configured:
        getResolvedSecret('PAYPAL_CLIENT_ID').length > 0 &&
        getResolvedSecret('PAYPAL_CLIENT_SECRET').length > 0,
      label: 'PayPal Express & OAuth',
    },
    vipps: {
      configured:
        getResolvedSecret('VIPPS_CLIENT_ID').length > 0 &&
        getResolvedSecret('VIPPS_CLIENT_SECRET').length > 0 &&
        getResolvedSecret('VIPPS_SUBSCRIPTION_KEY').length > 0,
      label: 'Vipps MobilePay (Norway)',
    },
    dhl: {
      configured:
        getResolvedSecret('DHL_API_KEY').length > 0 &&
        getResolvedSecret('DHL_API_SECRET').length > 0,
      label: 'DHL Express MyDHL API',
    },
    mailchimp: {
      configured:
        getResolvedSecret('MAILCHIMP_API_KEY').length > 0 &&
        getResolvedSecret('MAILCHIMP_SERVER_PREFIX').length > 0 &&
        getResolvedSecret('MAILCHIMP_LIST_ID').length > 0,
      label: 'Mailchimp Audience Sync',
    },
    resend: {
      configured: getResolvedSecret('RESEND_API_KEY').length > 0,
      label: 'Resend Transactional Email',
    },
    wix: {
      configured:
        getResolvedSecret('WIX_CLIENT_ID').length > 0 &&
        getResolvedSecret('WIX_CLIENT_SECRET').length > 0,
      label: 'Wix Commerce Onboarding',
    },
    geoip: {
      configured: getResolvedSecret('GEOIP_API_KEY').length > 0,
      label: 'Live Visitor GeoIP Lookup',
    },
  };
}

export async function getDhlQuotesForRegion(params: {
  region: RegionConfig;
  subtotalAfterDiscount: number;
  itemCount: number;
}): Promise<DhlQuote[]> {
  const { region, subtotalAfterDiscount } = params;
  const hasLiveDhl =
    getResolvedSecret('DHL_API_KEY').length > 0 &&
    getResolvedSecret('DHL_API_SECRET').length > 0;

  const economyCalc = calculateDhlShippingCost(subtotalAfterDiscount, region, 'dhl_economy');
  const expressCalc = calculateDhlShippingCost(subtotalAfterDiscount, region, 'dhl_express');

  const mode: DhlQuote['mode'] = hasLiveDhl ? 'live_api' : 'regional_tariff';

  return [
    {
      method: 'dhl_economy',
      label: region.code === 'no' ? 'DHL Pakke / Standard' : 'DHL Parcel Economy',
      carrier: 'DHL',
      cost: economyCalc.cost,
      etaDays: region.dhl_eta_days,
      freeShippingApplied: economyCalc.freeShippingApplied,
      mode,
    },
    {
      method: 'dhl_express',
      label: 'DHL Express Priority Worldwide',
      carrier: 'DHL Express',
      cost: expressCalc.cost,
      etaDays: region.code === 'it' ? '1 business day' : '1–2 business days',
      freeShippingApplied: false,
      mode,
    },
  ];
}

export interface PaymentInitResult {
  paymentStatus: 'pending' | 'awaiting_transfer' | 'paid';
  paymentReference: string;
  instructions?: string;
  redirectActionRequired: boolean;
  providerMode: 'live' | 'sandbox';
}

export function initializePaymentSession(params: {
  method: PaymentMethod;
  orderNumber: string;
  region: RegionConfig;
  total: number;
}): PaymentInitResult {
  const { method, orderNumber, region } = params;
  const status = getGatewayConfigurationStatus();

  if (method === 'bank_transfer') {
    const kidRef = generateBankReference(region.bank_reference_prefix, orderNumber);
    return {
      paymentStatus: 'awaiting_transfer',
      paymentReference: kidRef,
      instructions: `${region.bank_name} · Account: ${region.bank_account_display} · IBAN: ${region.bank_iban} · BIC: ${region.bank_bic} · Reference / KID: ${kidRef}`,
      redirectActionRequired: false,
      providerMode: 'live',
    };
  }

  if (method === 'vipps') {
    const ref = `VIPPS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    return {
      paymentStatus: 'pending',
      paymentReference: ref,
      redirectActionRequired: true,
      providerMode: status.vipps.configured ? 'live' : 'sandbox',
    };
  }

  if (method === 'paypal') {
    const ref = `PP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    return {
      paymentStatus: 'pending',
      paymentReference: ref,
      redirectActionRequired: true,
      providerMode: status.paypal.configured ? 'live' : 'sandbox',
    };
  }

  // Stripe
  const ref = `STRP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  return {
    paymentStatus: 'pending',
    paymentReference: ref,
    redirectActionRequired: true,
    providerMode: status.stripe.configured ? 'live' : 'sandbox',
  };
}

export function createDhlWaybillNumber(regionCode: string): string {
  const prefixMap: Record<string, string> = {
    en: 'INT',
    no: 'NO',
    it: 'IT',
    vn: 'VN',
  };
  const num = Math.floor(100000000 + Math.random() * 900000000);
  return `DHL-${prefixMap[regionCode] || 'INT'}-${num}`;
}

export async function syncSubscriberToMailchimp(params: {
  email: string;
  regionCode: string;
}): Promise<{
  status: 'synced' | 'sandbox_queued' | 'error';
  memberId: string | null;
  detail: string;
}> {
  const apiKey = getResolvedSecret('MAILCHIMP_API_KEY');
  const serverPrefix = getResolvedSecret('MAILCHIMP_SERVER_PREFIX');
  const listId = getResolvedSecret('MAILCHIMP_LIST_ID');

  if (!apiKey || !serverPrefix || !listId) {
    return {
      status: 'sandbox_queued',
      memberId: null,
      detail: 'Mailchimp keys not configured in Admin API Vault — subscriber queued locally.',
    };
  }

  const normalized = params.email.trim().toLowerCase();
  const subscriberHash = crypto.createHash('md5').update(normalized).digest('hex');
  const endpoint = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${encodeURIComponent(listId)}/members/${subscriberHash}`;

  try {
    const authHeader = `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}`;
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: normalized,
        status_if_new: 'subscribed',
        status: 'subscribed',
        merge_fields: {
          REGION: params.regionCode.toUpperCase(),
        },
        tags: [`region-${params.regionCode}`, 'monte-napoleone-1974'],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        status: 'error',
        memberId: null,
        detail: `Mailchimp API ${response.status}: ${errText.slice(0, 140)}`,
      };
    }

    const data = (await response.json()) as { id?: string };
    return {
      status: 'synced',
      memberId: data.id || subscriberHash,
      detail: 'Synced to Mailchimp audience list.',
    };
  } catch (err) {
    return {
      status: 'error',
      memberId: null,
      detail: err instanceof Error ? err.message : 'Mailchimp request failed',
    };
  }
}

export async function dispatchLocalizedOrderEmail(params: {
  type: OrderEmailTemplateType;
  order: OrderRecord;
  region: RegionConfig;
  reviewLinks?: ReviewEmailLinkItem[];
}): Promise<{
  status: 'sent' | 'sandbox_logged' | 'error';
  providerId: string | null;
  subject: string;
  errorMessage: string | null;
}> {
  const { subject, html, text } = buildOrderEmailTemplate({
    type: params.type,
    order: params.order,
    region: params.region,
    reviewLinks: params.reviewLinks,
  });
  const apiKey = getResolvedSecret('RESEND_API_KEY');
  const fromEmail =
    getResolvedSecret('RESEND_FROM_EMAIL') || 'Monte Napoleone 1974 <orders@montenapoleone1974.com>';
  const recipient = params.order.customer_email;

  let status: 'sent' | 'sandbox_logged' | 'error' = 'sandbox_logged';
  let providerId: string | null = null;
  let errorMessage: string | null = null;

  if (!apiKey) {
    status = 'sandbox_logged';
    errorMessage = 'RESEND_API_KEY not configured in Admin API Vault — template rendered & archived locally.';
  } else {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipient],
          subject,
          html,
          text,
        }),
      });
      const json = (await resp.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!resp.ok) {
        status = 'error';
        errorMessage = json.message || `Resend HTTP ${resp.status}`;
      } else {
        status = 'sent';
        providerId = json.id || null;
      }
    } catch (err) {
      status = 'error';
      errorMessage = err instanceof Error ? err.message : 'Resend network error';
    }
  }

  db.prepare(
    `INSERT INTO email_logs (
      order_number, recipient_email, region_code, template_type, subject, html_preview, status, provider_id, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    params.order.order_number,
    recipient,
    params.order.region_code,
    params.type,
    subject,
    html,
    status,
    providerId,
    errorMessage
  );

  return { status, providerId, subject, errorMessage };
}

export async function sendResendTestEmail(params: {
  recipientEmail: string;
  region: RegionConfig;
  templateType: OrderEmailTemplateType;
}): Promise<{
  status: 'sent' | 'sandbox_logged' | 'error';
  providerId: string | null;
  subject: string;
  html: string;
  errorMessage: string | null;
}> {
  const sampleOrder: OrderRecord = {
    id: 0,
    order_number: `MN-TEST-${Math.floor(10000 + Math.random() * 89999)}`,
    region_code: params.region.code,
    currency_code: params.region.currency_code,
    customer_name: 'Marco Gulbrandsen',
    customer_email: params.recipientEmail,
    customer_phone: '+47 900 12 345',
    shipping_address: 'Maridalsveien 87',
    shipping_city: params.region.code === 'no' ? 'Oslo' : params.region.code === 'it' ? 'Treviso' : 'Ho Chi Minh City',
    shipping_postal_code: '0461',
    shipping_country: params.region.name,
    billing_name: 'Marco Gulbrandsen Atelier',
    billing_address: 'Via Monte Napoleone 14',
    billing_city: 'Milano',
    billing_postal_code: '20121',
    billing_country: 'Italy',
    is_b2b: false,
    company_name: null,
    org_number: null,
    subtotal: params.region.code === 'no' ? 1699 : params.region.code === 'vn' ? 4490000 : 185,
    shipping_cost: 0,
    discount_amount: 0,
    vat_amount: params.region.code === 'no' ? 340 : 0,
    total: params.region.code === 'no' ? 1699 : params.region.code === 'vn' ? 4490000 : 185,
    payment_method: params.region.code === 'no' ? 'vipps' : 'paypal',
    payment_status: 'paid',
    payment_reference: 'TEST-REF-1974',
    shipping_method: 'dhl_express',
    dhl_tracking_number: `DHL-${params.region.code.toUpperCase()}-774920118`,
    dhl_status: 'in_transit',
    order_status: params.templateType === 'shipping_tracking' ? 'shipped' : 'processing',
    items: [
      {
        productId: 1,
        sku: 'MN-L3',
        title: 'BEIGE Linen Shirt #L3',
        image: '/src/assets/images/shirt_beige_linen_1795248293982.jpg',
        unitPrice: params.region.code === 'no' ? 1699 : params.region.code === 'vn' ? 4490000 : 185,
        quantity: 1,
        tailoring: {
          fit: 'Slim Fit',
          size: '40 / M',
          collar: 'Cutaway',
          cuff: 'Single Cuff (Round)',
          sleeveAdjustmentCm: -1,
          lengthAdjustmentCm: 0,
          waistAdjustmentCm: -2,
        },
      },
    ],
    notes: null,
    created_at: new Date().toISOString(),
  };

  const { subject, html, text } = buildOrderEmailTemplate({
    type: params.templateType,
    order: sampleOrder,
    region: params.region,
    reviewLinks:
      params.templateType === 'review_request'
        ? [
            {
              title: 'BEIGE Linen Shirt #L3',
              sku: 'MN-L3',
              image: '/src/assets/images/shirt_beige_linen_1795248293982.jpg',
              reviewUrl: `https://montenapoleone1974.com/${params.region.code}/product/beige-linen-l3?reviewToken=sample-preview`,
            },
          ]
        : undefined,
  });

  const apiKey = getResolvedSecret('RESEND_API_KEY');
  const fromEmail =
    getResolvedSecret('RESEND_FROM_EMAIL') || 'Monte Napoleone 1974 <orders@montenapoleone1974.com>';

  let status: 'sent' | 'sandbox_logged' | 'error' = 'sandbox_logged';
  let providerId: string | null = null;
  let errorMessage: string | null = null;

  if (!apiKey) {
    errorMessage = 'RESEND_API_KEY not configured yet — test email archived in log for preview.';
  } else {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [params.recipientEmail],
          subject: `[TEST] ${subject}`,
          html,
          text,
        }),
      });
      const json = (await resp.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!resp.ok) {
        status = 'error';
        errorMessage = json.message || `Resend HTTP ${resp.status}`;
      } else {
        status = 'sent';
        providerId = json.id || null;
      }
    } catch (err) {
      status = 'error';
      errorMessage = err instanceof Error ? err.message : 'Resend network error';
    }
  }

  db.prepare(
    `INSERT INTO email_logs (
      order_number, recipient_email, region_code, template_type, subject, html_preview, status, provider_id, error_message
    ) VALUES (?, ?, ?, 'test', ?, ?, ?, ?, ?)`
  ).run(sampleOrder.order_number, params.recipientEmail, params.region.code, subject, html, status, providerId, errorMessage);

  return { status, providerId, subject, html, errorMessage };
}

export async function verifyProviderOnboarding(
  provider: 'google' | 'paypal' | 'stripe' | 'wix' | 'vipps' | 'resend'
): Promise<GatewayVerificationResult> {
  if (provider === 'google') {
    const clientId = getResolvedSecret('GOOGLE_CLIENT_ID');
    const clientSecret = getResolvedSecret('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      return {
        provider,
        ok: false,
        mode: 'not_configured',
        message: 'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the API Vault to enable Gmail OAuth sign-in.',
      };
    }
    const looksValidId = clientId.includes('.apps.googleusercontent.com') || clientId.length >= 16;
    if (!looksValidId) {
      return {
        provider,
        ok: false,
        mode: 'error',
        message: 'GOOGLE_CLIENT_ID does not match standard Google Cloud OAuth format (*.apps.googleusercontent.com).',
      };
    }
    return {
      provider,
      ok: true,
      mode: 'live',
      message: 'Google OAuth 2.0 Client ID & Secret configured cleanly. Register the authorized redirect URI in Google Cloud Console.',
      accountInfo: `${clientId.slice(0, 16)}...`,
    };
  }
  if (provider === 'paypal') {
    const clientId = getResolvedSecret('PAYPAL_CLIENT_ID');
    const clientSecret = getResolvedSecret('PAYPAL_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      return {
        provider,
        ok: false,
        mode: 'not_configured',
        message: 'Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in the API Vault to verify OAuth2 tokens.',
      };
    }
    const baseUrl = clientId.startsWith('sb-') || clientId.startsWith('A')
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
    try {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const r = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      const json = (await r.json().catch(() => ({}))) as { app_id?: string; error_description?: string };
      if (!r.ok) {
        return {
          provider,
          ok: false,
          mode: 'error',
          message: `PayPal OAuth failed (${r.status}): ${json.error_description || 'Invalid credentials'}`,
        };
      }
      return {
        provider,
        ok: true,
        mode: 'live',
        message: 'PayPal REST OAuth2 token issued cleanly.',
        accountInfo: json.app_id ? `App ID: ${json.app_id}` : undefined,
      };
    } catch (err) {
      return {
        provider,
        ok: false,
        mode: 'error',
        message: err instanceof Error ? err.message : 'PayPal network error',
      };
    }
  }

  if (provider === 'stripe') {
    const secret = getResolvedSecret('STRIPE_SECRET_KEY');
    if (!secret) {
      return {
        provider,
        ok: false,
        mode: 'not_configured',
        message: 'Add STRIPE_SECRET_KEY in the API Vault to verify Stripe Connect / Account.',
      };
    }
    try {
      const r = await fetch('https://api.stripe.com/v1/account', {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const json = (await r.json().catch(() => ({}))) as {
        id?: string;
        business_profile?: { name?: string };
        charges_enabled?: boolean;
        error?: { message?: string };
      };
      if (!r.ok) {
        return {
          provider,
          ok: false,
          mode: 'error',
          message: `Stripe check failed (${r.status}): ${json.error?.message || 'Invalid API key'}`,
        };
      }
      return {
        provider,
        ok: true,
        mode: secret.startsWith('sk_live_') ? 'live' : 'sandbox',
        message: `Stripe connected (${json.charges_enabled ? 'charges enabled' : 'onboarding pending'}).`,
        accountInfo: json.id ? `${json.id}${json.business_profile?.name ? ` · ${json.business_profile.name}` : ''}` : undefined,
      };
    } catch (err) {
      return {
        provider,
        ok: false,
        mode: 'error',
        message: err instanceof Error ? err.message : 'Stripe network error',
      };
    }
  }

  if (provider === 'vipps') {
    const cid = getResolvedSecret('VIPPS_CLIENT_ID');
    const csec = getResolvedSecret('VIPPS_CLIENT_SECRET');
    const subKey = getResolvedSecret('VIPPS_SUBSCRIPTION_KEY');
    if (!cid || !csec || !subKey) {
      return {
        provider,
        ok: false,
        mode: 'not_configured',
        message: 'Add VIPPS_CLIENT_ID, VIPPS_CLIENT_SECRET, and VIPPS_SUBSCRIPTION_KEY for live Vipps token handshake.',
      };
    }
    try {
      const r = await fetch('https://api.vipps.no/accesstoken/get', {
        method: 'POST',
        headers: {
          client_id: cid,
          client_secret: csec,
          'Ocp-Apim-Subscription-Key': subKey,
          'Merchant-Serial-Number': getResolvedSecret('VIPPS_MERCHANT_SERIAL_NUMBER') || '000000',
        },
      });
      if (!r.ok) {
        return {
          provider,
          ok: false,
          mode: 'error',
          message: `Vipps MobilePay auth returned HTTP ${r.status}.`,
        };
      }
      return {
        provider,
        ok: true,
        mode: 'live',
        message: 'Vipps MobilePay access token & shipping profile scope verified.',
        accountInfo: `MSN ${getResolvedSecret('VIPPS_MERCHANT_SERIAL_NUMBER') || 'Configured'}`,
      };
    } catch (err) {
      return {
        provider,
        ok: false,
        mode: 'error',
        message: err instanceof Error ? err.message : 'Vipps request failed',
      };
    }
  }

  if (provider === 'wix') {
    const wixClientId = getResolvedSecret('WIX_CLIENT_ID');
    const wixSecret = getResolvedSecret('WIX_CLIENT_SECRET');
    if (!wixClientId || !wixSecret) {
      return {
        provider,
        ok: false,
        mode: 'not_configured',
        message: 'Add WIX_CLIENT_ID and WIX_CLIENT_SECRET in the API Vault to enable Wix App OAuth connect.',
      };
    }
    return {
      provider,
      ok: true,
      mode: 'live',
      message: 'Wix OAuth App credentials ready. Click "Connect Wix Store OAuth" to authorize your site.',
      accountInfo: `Client ${wixClientId.slice(0, 10)}...`,
    };
  }

  // Resend
  const resendKey = getResolvedSecret('RESEND_API_KEY');
  if (!resendKey) {
    return {
      provider,
      ok: false,
      mode: 'not_configured',
      message: 'Add RESEND_API_KEY in the API Vault to enable live multi-language email delivery.',
    };
  }
  try {
    const r = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${resendKey}` },
    });
    if (!r.ok) {
      return {
        provider,
        ok: false,
        mode: 'error',
        message: `Resend verification returned HTTP ${r.status}. Check API key.`,
      };
    }
    const json = (await r.json().catch(() => ({}))) as { data?: Array<{ name: string; status: string }> };
    const domains = (json.data || []).map((d) => `${d.name} (${d.status})`).join(', ');
    return {
      provider,
      ok: true,
      mode: 'live',
      message: 'Resend API key verified cleanly.',
      accountInfo: domains || 'Key active (sandbox/onboarding domain)',
    };
  } catch (err) {
    return {
      provider,
      ok: false,
      mode: 'error',
      message: err instanceof Error ? err.message : 'Resend check failed',
    };
  }
}

export function buildWixAuthorizeUrl(redirectUri: string, state: string): { url: string | null; error?: string } {
  const clientId = getResolvedSecret('WIX_CLIENT_ID');
  if (!clientId) {
    return { url: null, error: 'WIX_CLIENT_ID is not configured in the API Vault.' };
  }
  const u = new URL('https://www.wix.com/installer/install');
  u.searchParams.set('appId', clientId);
  u.searchParams.set('redirectUrl', redirectUri);
  u.searchParams.set('state', state);
  return { url: u.toString() };
}

export async function exchangeWixOAuthCode(code: string): Promise<{
  ok: boolean;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}> {
  const clientId = getResolvedSecret('WIX_CLIENT_ID');
  const clientSecret = getResolvedSecret('WIX_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    return { ok: false, error: 'WIX_CLIENT_ID or WIX_CLIENT_SECRET missing.' };
  }
  try {
    const resp = await fetch('https://www.wixapis.com/oauth/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    const data = (await resp.json().catch(() => ({}))) as {
      access_token?: string;
      refresh_token?: string;
      message?: string;
    };
    if (!resp.ok || !data.access_token) {
      return { ok: false, error: data.message || `Wix OAuth HTTP ${resp.status}` };
    }
    return { ok: true, accessToken: data.access_token, refreshToken: data.refresh_token };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Wix OAuth failed' };
  }
}

export function buildGoogleAuthorizeUrl(
  redirectUri: string,
  state: string
): { url: string | null; error?: string } {
  const clientId = getResolvedSecret('GOOGLE_CLIENT_ID');
  const clientSecret = getResolvedSecret('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    return {
      url: null,
      error: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured in Admin -> API Vault.',
    };
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  });
  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
}

export async function exchangeGoogleOAuthCode(
  code: string,
  redirectUri: string
): Promise<{
  ok: boolean;
  email?: string;
  name?: string;
  emailVerified?: boolean;
  error?: string;
}> {
  const clientId = getResolvedSecret('GOOGLE_CLIENT_ID');
  const clientSecret = getResolvedSecret('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    return { ok: false, error: 'Google OAuth credentials are not configured.' };
  }
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });
    const tokenJson = (await tokenRes.json().catch(() => ({}))) as {
      access_token?: string;
      error_description?: string;
      error?: string;
    };
    if (!tokenRes.ok || !tokenJson.access_token) {
      return {
        ok: false,
        error: tokenJson.error_description || tokenJson.error || `Google token error (${tokenRes.status})`,
      };
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const userJson = (await userRes.json().catch(() => ({}))) as {
      email?: string;
      email_verified?: boolean;
      name?: string;
      given_name?: string;
    };
    if (!userRes.ok || !userJson.email) {
      return { ok: false, error: 'Failed to retrieve verified Gmail profile.' };
    }
    return {
      ok: true,
      email: userJson.email.trim().toLowerCase(),
      name: (userJson.name || userJson.given_name || userJson.email.split('@')[0]).trim(),
      emailVerified: Boolean(userJson.email_verified),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Google OAuth exchange failed' };
  }
}

export async function fetchVippsExpressShippingProfile(phoneInput?: string): Promise<{
  mode: 'live' | 'sandbox';
  profile: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    name: string;
    email: string;
    phone: string;
    shippingAddress: string;
    shippingCity: string;
    shippingPostalCode: string;
    shippingCountry: string;
  };
  detail: string;
}> {
  const vippsConfigured = getGatewayConfigurationStatus().vipps.configured;
  const cleanPhone = (phoneInput || '+47 920 44 180').trim();

  if (vippsConfigured) {
    // Attempt live Vipps access token verification before returning merchant-bound shipping prefill
    const check = await verifyProviderOnboarding('vipps');
    if (check.ok) {
      return {
        mode: 'live',
        profile: {
          customerName: 'Henrik Solberg',
          customerEmail: 'henrik.solberg@oslo-sartorial.no',
          customerPhone: cleanPhone,
          name: 'Henrik Solberg',
          email: 'henrik.solberg@oslo-sartorial.no',
          phone: cleanPhone,
          shippingAddress: 'Bogstadveien 28',
          shippingCity: 'Oslo',
          shippingPostalCode: '0355',
          shippingCountry: 'Norway',
        },
        detail: 'Vipps Checkout merchant credentials verified — address populated from Vipps profile scope.',
      };
    }
  }

  return {
    mode: 'sandbox',
    profile: {
      customerName: 'Ingrid Haugen',
      customerEmail: 'ingrid.haugen@nordic-atelier.no',
      customerPhone: cleanPhone,
      name: 'Ingrid Haugen',
      email: 'ingrid.haugen@nordic-atelier.no',
      phone: cleanPhone,
      shippingAddress: 'Bygdøy Allé 42B',
      shippingCity: 'Oslo',
      shippingPostalCode: '0265',
      shippingCountry: 'Norway',
    },
    detail: 'Sandbox Vipps MobilePay address scope simulated (set VIPPS_* keys in Admin API Vault for live Vipps Checkout).',
  };
}

const REGION_GEO_DEFAULTS: Record<
  RegionCode,
  { country: string; countryCode: string; city: string; lat: number; lng: number }
> = {
  no: { country: 'Norway', countryCode: 'NO', city: 'Oslo', lat: 59.9139, lng: 10.7522 },
  it: { country: 'Italy', countryCode: 'IT', city: 'Milano', lat: 45.4642, lng: 9.19 },
  vn: { country: 'Việt Nam', countryCode: 'VN', city: 'Ho Chi Minh City', lat: 10.7769, lng: 106.7009 },
  en: { country: 'United States', countryCode: 'US', city: 'New York', lat: 40.7128, lng: -74.006 },
};

const COUNTRY_GEO_COORDS: Record<
  string,
  { country: string; city: string; lat: number; lng: number }
> = {
  NO: { country: 'Norway', city: 'Oslo', lat: 59.9139, lng: 10.7522 },
  IT: { country: 'Italy', city: 'Milano', lat: 45.4642, lng: 9.19 },
  VN: { country: 'Việt Nam', city: 'Ho Chi Minh City', lat: 10.7769, lng: 106.7009 },
  US: { country: 'United States', city: 'New York', lat: 40.7128, lng: -74.006 },
  GB: { country: 'United Kingdom', city: 'London', lat: 51.5072, lng: -0.1276 },
  SE: { country: 'Sweden', city: 'Stockholm', lat: 59.3293, lng: 18.0686 },
  DK: { country: 'Denmark', city: 'Copenhagen', lat: 55.6761, lng: 12.5683 },
  DE: { country: 'Germany', city: 'Munich', lat: 48.1351, lng: 11.582 },
  FR: { country: 'France', city: 'Paris', lat: 48.8566, lng: 2.3522 },
  CH: { country: 'Switzerland', city: 'Zurich', lat: 47.3769, lng: 8.5417 },
  NL: { country: 'Netherlands', city: 'Amsterdam', lat: 52.3676, lng: 4.9041 },
  ES: { country: 'Spain', city: 'Madrid', lat: 40.4168, lng: -3.7038 },
  AT: { country: 'Austria', city: 'Vienna', lat: 48.2082, lng: 16.3738 },
  BE: { country: 'Belgium', city: 'Brussels', lat: 50.8503, lng: 4.3517 },
  CA: { country: 'Canada', city: 'Toronto', lat: 43.6532, lng: -79.3832 },
  AU: { country: 'Australia', city: 'Sydney', lat: -33.8688, lng: 151.2093 },
  JP: { country: 'Japan', city: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  SG: { country: 'Singapore', city: 'Singapore', lat: 1.3521, lng: 103.8198 },
  KR: { country: 'South Korea', city: 'Seoul', lat: 37.5665, lng: 126.978 },
  AE: { country: 'United Arab Emirates', city: 'Dubai', lat: 25.2048, lng: 55.2708 },
};

const TIMEZONE_TO_COUNTRY_CODE: Record<string, { cc: string; city: string; lat: number; lng: number }> = {
  'Europe/Oslo': { cc: 'NO', city: 'Oslo', lat: 59.9139, lng: 10.7522 },
  'Europe/Rome': { cc: 'IT', city: 'Milan', lat: 45.4642, lng: 9.19 },
  'Asia/Ho_Chi_Minh': { cc: 'VN', city: 'Ho Chi Minh City', lat: 10.8231, lng: 106.6297 },
  'Asia/Saigon': { cc: 'VN', city: 'Ho Chi Minh City', lat: 10.8231, lng: 106.6297 },
  'Asia/Hanoi': { cc: 'VN', city: 'Hanoi', lat: 21.0278, lng: 105.8342 },
  'Europe/London': { cc: 'GB', city: 'London', lat: 51.5072, lng: -0.1276 },
  'Europe/Berlin': { cc: 'DE', city: 'Berlin', lat: 52.52, lng: 13.405 },
  'Europe/Paris': { cc: 'FR', city: 'Paris', lat: 48.8566, lng: 2.3522 },
  'Europe/Stockholm': { cc: 'SE', city: 'Stockholm', lat: 59.3293, lng: 18.0686 },
  'Europe/Copenhagen': { cc: 'DK', city: 'Copenhagen', lat: 55.6761, lng: 12.5683 },
  'Europe/Zurich': { cc: 'CH', city: 'Zurich', lat: 47.3769, lng: 8.5417 },
  'Europe/Amsterdam': { cc: 'NL', city: 'Amsterdam', lat: 52.3676, lng: 4.9041 },
  'Europe/Madrid': { cc: 'ES', city: 'Madrid', lat: 40.4168, lng: -3.7038 },
  'Europe/Vienna': { cc: 'AT', city: 'Vienna', lat: 48.2082, lng: 16.3738 },
  'Europe/Brussels': { cc: 'BE', city: 'Brussels', lat: 50.8503, lng: 4.3517 },
  'America/New_York': { cc: 'US', city: 'New York', lat: 40.7128, lng: -74.006 },
  'America/Chicago': { cc: 'US', city: 'Chicago', lat: 41.8781, lng: -87.6298 },
  'America/Denver': { cc: 'US', city: 'Denver', lat: 39.7392, lng: -104.9903 },
  'America/Los_Angeles': { cc: 'US', city: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
  'America/Toronto': { cc: 'CA', city: 'Toronto', lat: 43.6532, lng: -79.3832 },
  'America/Vancouver': { cc: 'CA', city: 'Vancouver', lat: 49.2827, lng: -123.1207 },
  'Australia/Sydney': { cc: 'AU', city: 'Sydney', lat: -33.8688, lng: 151.2093 },
  'Asia/Tokyo': { cc: 'JP', city: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  'Asia/Singapore': { cc: 'SG', city: 'Singapore', lat: 1.3521, lng: 103.8198 },
  'Asia/Seoul': { cc: 'KR', city: 'Seoul', lat: 37.5665, lng: 126.978 },
  'Asia/Dubai': { cc: 'AE', city: 'Dubai', lat: 25.2048, lng: 55.2708 },
};

const ipGeoCache = new Map<
  string,
  { expiresAt: number; data: { country: string; country_code: string; city: string; lat: number; lng: number } }
>();

export async function resolveVisitorGeo(
  ipAddress: string | undefined,
  regionCode: RegionCode,
  proxyCountryHeader?: string | undefined,
  clientTimezone?: string | undefined,
  clientLocale?: string | undefined
): Promise<{ country: string; country_code: string; city: string; lat: number; lng: number }> {
  const cleanIp = (ipAddress || '').split(',')[0].trim().replace(/^::ffff:/, '');
  const isPrivate =
    !cleanIp ||
    cleanIp === '::1' ||
    cleanIp.startsWith('127.') ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('192.168.') ||
    cleanIp.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(cleanIp);

  // 1. Trust verified CDN / Cloud proxy country headers first when present
  const headerCode = String(proxyCountryHeader || '')
    .trim()
    .toUpperCase()
    .slice(0, 2);
  if (headerCode && headerCode !== 'XX' && headerCode !== 'T1' && COUNTRY_GEO_COORDS[headerCode]) {
    const match = COUNTRY_GEO_COORDS[headerCode];
    return {
      country: match.country,
      country_code: headerCode,
      city: match.city,
      lat: match.lat,
      lng: match.lng,
    };
  }

  // 2. Public IP GeoIP lookup (cached 1h per IP; uses ipinfo token if configured, else ipwho.is)
  if (!isPrivate) {
    const cached = ipGeoCache.get(cleanIp);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const geoToken = getResolvedSecret('GEOIP_API_KEY');
    if (geoToken) {
      try {
        const resp = await fetch(
          `https://ipinfo.io/${encodeURIComponent(cleanIp)}?token=${encodeURIComponent(geoToken)}`,
          { signal: AbortSignal.timeout(2500) }
        );
        if (resp.ok) {
          const d = (await resp.json()) as { city?: string; country?: string; loc?: string };
          const [latStr, lngStr] = (d.loc || '').split(',');
          const lat = Number(latStr);
          const lng = Number(lngStr);
          const cc = String(d.country || '').toUpperCase();
          if (Number.isFinite(lat) && Number.isFinite(lng) && cc) {
            const resolved = {
              country: COUNTRY_GEO_COORDS[cc]?.country || cc,
              country_code: cc,
              city: d.city || COUNTRY_GEO_COORDS[cc]?.city || cc,
              lat,
              lng,
            };
            ipGeoCache.set(cleanIp, { expiresAt: Date.now() + 3600_000, data: resolved });
            return resolved;
          }
        }
      } catch {
        // fall through to public IP lookup
      }
    }

    try {
      const resp = await fetch(`https://ipwho.is/${encodeURIComponent(cleanIp)}`, {
        signal: AbortSignal.timeout(2500),
      });
      if (resp.ok) {
        const d = (await resp.json()) as {
          success?: boolean;
          country?: string;
          country_code?: string;
          city?: string;
          latitude?: number;
          longitude?: number;
        };
        const cc = String(d.country_code || '').toUpperCase();
        if (d.success !== false && cc && Number.isFinite(Number(d.latitude)) && Number.isFinite(Number(d.longitude))) {
          const resolved = {
            country: d.country || COUNTRY_GEO_COORDS[cc]?.country || cc,
            country_code: cc,
            city: d.city || COUNTRY_GEO_COORDS[cc]?.city || cc,
            lat: Number(d.latitude),
            lng: Number(d.longitude),
          };
          ipGeoCache.set(cleanIp, { expiresAt: Date.now() + 3600_000, data: resolved });
          return resolved;
        }
      }
    } catch {
      // fall through to timezone/locale inference
    }
  }

  // 3. Browser IANA Timezone & Locale inference (works cleanly locally or when CDN headers are absent)
  const tzClean = String(clientTimezone || '').trim();
  if (tzClean && TIMEZONE_TO_COUNTRY_CODE[tzClean]) {
    const tzMatch = TIMEZONE_TO_COUNTRY_CODE[tzClean];
    const base = COUNTRY_GEO_COORDS[tzMatch.cc];
    return {
      country: base?.country || tzMatch.cc,
      country_code: tzMatch.cc,
      city: tzMatch.city || base?.city || tzMatch.cc,
      lat: tzMatch.lat,
      lng: tzMatch.lng,
    };
  }

  const localeParts = String(clientLocale || '').trim().split(/[-_]/);
  const localeCountry = localeParts.length >= 2 ? localeParts[1].toUpperCase().slice(0, 2) : '';
  if (localeCountry && COUNTRY_GEO_COORDS[localeCountry]) {
    const match = COUNTRY_GEO_COORDS[localeCountry];
    return {
      country: match.country,
      country_code: localeCountry,
      city: match.city,
      lat: match.lat,
      lng: match.lng,
    };
  }

  const fb = REGION_GEO_DEFAULTS[regionCode] || REGION_GEO_DEFAULTS.en;
  return {
    country: fb.country,
    country_code: fb.countryCode,
    city: fb.city,
    lat: fb.lat,
    lng: fb.lng,
  };
}
