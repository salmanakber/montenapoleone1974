import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, CreditCard, Landmark, Smartphone, Truck } from 'lucide-react';
import type {
  BulkDiscountSettings,
  CartItem,
  DhlQuote,
  OrderRecord,
  PaymentMethod,
  PromotionPopupSettings,
  RegionConfig,
  ShippingMethod,
} from '../types.ts';
import type { RegionCopy } from '../i18n/translations.ts';
import {
  calculateCheckoutTotals,
  DEFAULT_BULK_DISCOUNT_SETTINGS,
  DEFAULT_PROMO_POPUP_SETTINGS,
  formatRegionalPrice,
  getAvailablePaymentMethods,
} from '../utils/commerce.ts';

interface CheckoutViewProps {
  region: RegionConfig;
  copy: RegionCopy;
  items: CartItem[];
  /** When true, this checkout is the B2B group-order lane (is_b2b order portal). */
  forceB2B?: boolean;
  promoRules?: PromotionPopupSettings;
  bulkDiscount?: BulkDiscountSettings;
  initialDiscountCode?: string;
  cartSessionId?: string;
  authEmail?: string | null;
  onClearCart: () => void;
  onBackToShop: () => void;
  onRefreshStorefront: () => void;
  onOrderCompleted?: (usedDiscountCode?: string) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  region,
  copy,
  items,
  forceB2B = false,
  promoRules = DEFAULT_PROMO_POPUP_SETTINGS,
  bulkDiscount = DEFAULT_BULK_DISCOUNT_SETTINGS,
  initialDiscountCode = '',
  cartSessionId = '',
  authEmail = null,
  onClearCart,
  onBackToShop,
  onRefreshStorefront,
  onOrderCompleted,
}) => {
  const availableMethods = getAvailablePaymentMethods(region);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState(authEmail || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingPostalCode, setShippingPostalCode] = useState('');
  const [shippingCountry, setShippingCountry] = useState(region.name);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingName, setBillingName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingPostalCode, setBillingPostalCode] = useState('');
  const [billingCountry, setBillingCountry] = useState(region.name);
  const [vippsPrefillLoading, setVippsPrefillLoading] = useState(false);
  const [vippsPrefillMsg, setVippsPrefillMsg] = useState<string | null>(null);
  const [isB2B, setIsB2B] = useState(forceB2B);
  const [companyName, setCompanyName] = useState('');
  const [orgNumber, setOrgNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (forceB2B) setIsB2B(true);
  }, [forceB2B]);

  const [discountInput, setDiscountInput] = useState(initialDiscountCode);
  const [appliedDiscount, setAppliedDiscount] = useState(initialDiscountCode);
  const [isFirstOrder, setIsFirstOrder] = useState(true);
  const [promoFeedback, setPromoFeedback] = useState<string | null>(null);

  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('dhl_economy');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(availableMethods[0] || 'stripe');

  const [dhlQuotes, setDhlQuotes] = useState<DhlQuote[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingPay, setConfirmingPay] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<{
    order: OrderRecord;
    instructions?: string;
    redirectActionRequired: boolean;
    providerMode: 'live' | 'sandbox';
  } | null>(null);

  useEffect(() => {
    if (initialDiscountCode) {
      setDiscountInput(initialDiscountCode);
      setAppliedDiscount(initialDiscountCode);
    }
  }, [initialDiscountCode]);

  useEffect(() => {
    if (!availableMethods.includes(paymentMethod)) {
      setPaymentMethod(availableMethods[0] || 'stripe');
    }
    setShippingCountry(region.name);
    setBillingCountry(region.name);
  }, [region.code, region.name, availableMethods, paymentMethod]);

  const handleVippsShippingPrefill = async () => {
    setVippsPrefillLoading(true);
    setVippsPrefillMsg(null);
    try {
      const res = await fetch('/api/payments/vipps/checkout-prefill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: customerPhone || '' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVippsPrefillMsg(data.error || 'Could not load Vipps profile.');
        return;
      }
      if (availableMethods.includes('vipps')) setPaymentMethod('vipps');

      if (data.profile) {
        setCustomerName(data.profile.customerName || customerName);
        setCustomerEmail(data.profile.customerEmail || customerEmail);
        setCustomerPhone(data.profile.customerPhone || customerPhone);
        setShippingAddress(data.profile.shippingAddress || '');
        setShippingCity(data.profile.shippingCity || '');
        setShippingPostalCode(data.profile.shippingPostalCode || '');
        setShippingCountry(data.profile.shippingCountry || region.name);
        const same = data.profile.billingSameAsShipping !== false;
        setBillingSameAsShipping(same);
        if (!same) {
          setBillingAddress(data.profile.billingAddress || data.profile.shippingAddress || '');
          setBillingCity(data.profile.billingCity || data.profile.shippingCity || '');
          setBillingPostalCode(data.profile.billingPostalCode || data.profile.shippingPostalCode || '');
          setBillingCountry(data.profile.billingCountry || data.profile.shippingCountry || region.name);
        }
        setVippsPrefillMsg(
          data.detail ||
            `Shipping & billing prefilled via Vipps (${data.mode === 'live' ? 'Live' : 'Sandbox'}).`
        );
      } else {
        // Live Vipps connected but no stored address — keep / show manual form
        setBillingSameAsShipping(true);
        setVippsPrefillMsg(
          data.detail ||
            'Vipps is ready. Please enter your delivery address manually — billing defaults to the same address.'
        );
      }
    } catch {
      setVippsPrefillMsg('Network error loading Vipps profile. Please enter your address manually.');
    } finally {
      setVippsPrefillLoading(false);
    }
  };

  const totals = calculateCheckoutTotals({
    items,
    region,
    shippingMethod,
    discountCode: forceB2B ? '' : appliedDiscount,
    promoSettings: forceB2B ? { ...promoRules, popupEnabled: false } : promoRules,
    bulkSettings: forceB2B ? { ...bulkDiscount, enabled: false } : bulkDiscount,
    isFirstOrder: forceB2B ? false : isFirstOrder,
  });

  useEffect(() => {
    let active = true;
    if (!appliedDiscount && !customerEmail) {
      setIsFirstOrder(true);
      setPromoFeedback(null);
      return;
    }
    const rawSubtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    fetch('/api/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regionCode: region.code,
        subtotal: rawSubtotal,
        totalQty,
        discountCode: appliedDiscount,
        customerEmail,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setIsFirstOrder(d.isFirstOrder !== false);
        setPromoFeedback(d.promoRejectedReason || null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [appliedDiscount, customerEmail, region.code, items]);

  useEffect(() => {
    let active = true;
    const discountedSubtotal = Math.max(0, totals.subtotal - totals.discountAmount);
    fetch('/api/shipping/dhl/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regionCode: region.code,
        subtotalAfterDiscount: discountedSubtotal,
        itemCount: items.reduce((s, i) => s + i.quantity, 0),
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (active && Array.isArray(data.quotes)) {
          setDhlQuotes(data.quotes);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [region.code, totals.subtotal, totals.discountAmount, items]);

  useEffect(() => {
    if (authEmail && !customerEmail) {
      setCustomerEmail(authEmail);
    }
  }, [authEmail, customerEmail]);

  useEffect(() => {
    const email = customerEmail.trim().toLowerCase();
    if (!email.includes('@') || !cartSessionId) return;
    try {
      window.localStorage.setItem('mn_cart_email', email);
    } catch {
      // ignore
    }
    const timer = window.setTimeout(() => {
      fetch('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: cartSessionId,
          regionCode: region.code,
          email,
          customerName: customerName.trim() || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            slug: i.slug,
            sku: i.sku,
            title: i.title,
            image: i.image,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
          })),
        }),
      }).catch(() => {});
    }, 600);
    return () => window.clearTimeout(timer);
  }, [customerEmail, customerName, cartSessionId, region.code, items]);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (items.length === 0) {
      setErrorMsg(copy.checkout.emptyBag);
      return;
    }
    const submitAsB2B = forceB2B || isB2B;
    if (submitAsB2B && !companyName.trim()) {
      setErrorMsg(copy.checkout.b2bCompanyRequired);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionCode: region.code,
          customerName,
          customerEmail,
          customerPhone,
          shippingAddress,
          shippingCity,
          shippingPostalCode,
          shippingCountry: shippingCountry.trim() || region.name,
          billingSameAsShipping,
          billingName,
          billingEmail,
          billingPhone,
          billingAddress,
          billingCity,
          billingPostalCode,
          billingCountry,
          isB2B: submitAsB2B,
          companyName,
          orgNumber,
          notes: submitAsB2B
            ? [`[B2B Group Order]`, notes].filter(Boolean).join(' ').trim() || '[B2B Group Order]'
            : notes,
          discountCode: submitAsB2B ? '' : appliedDiscount,
          shippingMethod,
          paymentMethod,
          cartSessionId: cartSessionId || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            channel: i.channel || (submitAsB2B ? 'b2b' : 'b2c'),
            tailoring: i.tailoring,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not place order.');
        return;
      }
      setCompletedOrder({
        order: data.order,
        instructions: data.payment?.instructions,
        redirectActionRequired: Boolean(data.payment?.redirectActionRequired),
        providerMode: data.payment?.providerMode || 'sandbox',
      });
      onOrderCompleted?.(appliedDiscount || undefined);
      onClearCart();
      onRefreshStorefront();
    } catch {
      setErrorMsg('Network error placing order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteSandboxPayment = async () => {
    if (!completedOrder) return;
    setConfirmingPay(true);
    try {
      const res = await fetch(`/api/payments/${completedOrder.order.payment_method}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: completedOrder.order.order_number }),
      });
      const data = await res.json();
      if (res.ok && data.order) {
        setCompletedOrder({
          ...completedOrder,
          order: data.order,
          redirectActionRequired: false,
        });
      }
    } finally {
      setConfirmingPay(false);
    }
  };

  if (completedOrder) {
    const { order } = completedOrder;
    return (
      <main className="pt-28 pb-20 max-w-3xl mx-auto px-4 sm:px-8">
        <div className="border border-black/15 bg-white p-8 space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-black/10 pb-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-[#4F8A47] shrink-0" />
              <div>
                <h1 className="text-xl font-medium uppercase tracking-wide">
                  {copy.checkout.orderConfirmed}
                </h1>
                <p className="text-xs text-neutral-500 mt-1">
                  Order <span className="font-mono-tabular font-semibold text-[#1A1A1A]">{order.order_number}</span> ·{' '}
                  {region.name} ({order.currency_code})
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-[#F7F7F7] border border-black/10 text-xs font-mono-tabular uppercase">
              {order.payment_status.replace('_', ' ')}
            </span>
          </div>

          {order.payment_method === 'bank_transfer' && (
            <div className="p-5 bg-[#F7F7F7] border border-black/10 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#142B4E]">
                {copy.checkout.bankTransferInstructions}
              </div>
              <div className="text-xs text-neutral-700 font-mono-tabular leading-relaxed">
                <div>Bank: {region.bank_name}</div>
                <div>Account: {region.bank_account_display}</div>
                <div>IBAN: {region.bank_iban} · BIC: {region.bank_bic}</div>
                <div className="font-semibold text-[#1A1A1A] mt-1">
                  Payment Reference / KID: {order.payment_reference}
                </div>
              </div>
            </div>
          )}

          {order.payment_status === 'pending' && completedOrder.redirectActionRequired && (
            <div className="p-5 bg-[#142B4E]/5 border border-[#142B4E]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#142B4E]">
                  Authorize {order.payment_method.toUpperCase()} Payment ({completedOrder.providerMode})
                </div>
                <p className="text-xs text-neutral-600 mt-1">
                  Ref <span className="font-mono-tabular">{order.payment_reference}</span> · Total{' '}
                  <span className="font-mono-tabular font-semibold">
                    {formatRegionalPrice(order.total, order.region_code)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                disabled={confirmingPay}
                onClick={handleCompleteSandboxPayment}
                className="px-5 py-2.5 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-wider font-medium cursor-pointer shrink-0"
              >
                {confirmingPay ? 'Verifying...' : `Confirm ${order.payment_method.toUpperCase()} Payment`}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div>
              <div className="uppercase tracking-wider text-neutral-400 mb-2">Delivery & DHL</div>
              <div className="text-[#1A1A1A] font-medium">{order.customer_name}</div>
              <div className="text-neutral-600">{order.shipping_address}</div>
              <div className="text-neutral-600">
                {order.shipping_postal_code} {order.shipping_city}, {order.shipping_country}
              </div>
              <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 bg-[#FFCC00]/30 text-[#1A1A1A] font-medium">
                <Truck className="w-3.5 h-3.5" />
                <span>
                  {order.dhl_tracking_number
                    ? `DHL Tracking: ${order.dhl_tracking_number}`
                    : copy.checkout.dhlTrackingPending}
                </span>
              </div>

              {!order.billing_same_as_shipping && order.billing_address && (
                <div className="mt-4 pt-3 border-t border-black/10" data-testid="order-receipt-billing">
                  <div className="uppercase tracking-wider text-neutral-400 mb-1">Billing Address</div>
                  <div className="text-[#1A1A1A] font-medium">{order.billing_name || order.customer_name}</div>
                  <div className="text-neutral-600">{order.billing_address}</div>
                  <div className="text-neutral-600">
                    {order.billing_postal_code} {order.billing_city}, {order.billing_country}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="uppercase tracking-wider text-neutral-400 mb-2">Summary</div>
              <div className="space-y-1 font-mono-tabular">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Subtotal</span>
                  <span>{formatRegionalPrice(order.subtotal, order.region_code)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-[#4F8A47]">
                    <span>Discount</span>
                    <span>-{formatRegionalPrice(order.discount_amount, order.region_code)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-600">DHL Shipping</span>
                  <span>
                    {order.shipping_cost === 0
                      ? 'Free'
                      : formatRegionalPrice(order.shipping_cost, order.region_code)}
                  </span>
                </div>
                {order.vat_amount > 0 && (
                  <div className="flex justify-between text-neutral-500">
                    <span>Included VAT</span>
                    <span>{formatRegionalPrice(order.vat_amount, order.region_code)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-sm pt-2 border-t border-black/10">
                  <span>Total</span>
                  <span>{formatRegionalPrice(order.total, order.region_code)}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToShop}
            className="px-6 py-3 bg-[#142B4E] text-white text-xs uppercase tracking-wider font-medium cursor-pointer"
          >
            Continue Shopping
          </button>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="pt-28 pb-20 max-w-2xl mx-auto px-4 text-center">
        <p className="text-sm text-neutral-600 mb-6">{copy.checkout.emptyBag}</p>
        <button
          type="button"
          onClick={onBackToShop}
          className="px-6 py-3 bg-[#142B4E] text-white text-xs uppercase tracking-wider cursor-pointer"
        >
          {copy.nav.allShirts}
        </button>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="pt-24 pb-20 max-w-[720px] mx-auto px-4 sm:px-8 text-center space-y-4">
        <p className="text-sm text-neutral-600">{copy.checkout.emptyBag}</p>
        <button
          type="button"
          onClick={onBackToShop}
          className="px-6 py-3 bg-[#142B4E] text-white text-xs uppercase tracking-wider cursor-pointer"
        >
          {forceB2B ? copy.b2b.portalTitle : copy.nav.allShirts}
        </button>
      </main>
    );
  }

  return (
    <main className="pt-24 pb-20 max-w-[1280px] mx-auto px-4 sm:px-8">
      <div className="border-b border-black/10 pb-4 mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-medium uppercase tracking-wide inline-flex items-center gap-2 flex-wrap">
            {forceB2B ? copy.checkout.b2bCheckoutTitle : copy.checkout.checkoutTitle}
            {forceB2B && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-[#142B4E] text-white text-[10px] tracking-wider font-semibold">
                <Building2 className="w-3 h-3" />
                {copy.checkout.b2bBadge}
              </span>
            )}
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            {forceB2B
              ? copy.checkout.b2bGroupHint
              : `Dispatching from ${region.warehouse_name} · Currency: ${region.currency_code}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToShop}
          className="text-xs text-[#142B4E] hover:underline cursor-pointer"
        >
          ← {copy.pdp.backToCatalog}
        </button>
      </div>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Address, DHL, Payment */}
        <div className="lg:col-span-7 space-y-8">
          {/* 1. Customer, Shipping & Separate Billing Details */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                1. {copy.checkout.shippingDetails}
              </h2>
              {availableMethods.includes('vipps') && (
                <button
                  type="button"
                  disabled={vippsPrefillLoading}
                  onClick={handleVippsShippingPrefill}
                  data-testid="vipps-prefill-btn"
                  className="px-3 py-1.5 bg-[#FF5B24] hover:bg-[#e44e1a] text-white text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{vippsPrefillLoading ? 'Loading Vipps...' : 'Auto-Fill Shipping from Vipps'}</span>
                </button>
              )}
            </div>
            {vippsPrefillMsg && (
              <div className="p-2.5 bg-[#FF5B24]/10 border border-[#FF5B24]/30 text-[11px] text-[#1A1A1A]">
                {vippsPrefillMsg}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="co-name" className="block text-xs text-neutral-600 mb-1">
                  {copy.checkout.fullName}
                </label>
                <input
                  id="co-name"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-black/15 focus:border-[#142B4E] outline-none"
                />
              </div>
              <div>
                <label htmlFor="co-email" className="block text-xs text-neutral-600 mb-1">
                  {copy.checkout.email}
                </label>
                <input
                  id="co-email"
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-black/15 focus:border-[#142B4E] outline-none"
                />
              </div>
              <div>
                <label htmlFor="co-phone" className="block text-xs text-neutral-600 mb-1">
                  {copy.checkout.phone}
                </label>
                <input
                  id="co-phone"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-black/15 focus:border-[#142B4E] outline-none"
                />
              </div>
              <div>
                <label htmlFor="co-country" className="block text-xs text-neutral-600 mb-1">
                  Shipping Country
                </label>
                <input
                  id="co-country"
                  required
                  value={shippingCountry}
                  onChange={(e) => setShippingCountry(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-black/15 focus:border-[#142B4E] outline-none"
                />
              </div>
              <div>
                <label htmlFor="co-addr" className="block text-xs text-neutral-600 mb-1">
                  {copy.checkout.address}
                </label>
                <input
                  id="co-addr"
                  required
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-black/15 focus:border-[#142B4E] outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="co-city" className="block text-xs text-neutral-600 mb-1">
                    {copy.checkout.city}
                  </label>
                  <input
                    id="co-city"
                    required
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-black/15 focus:border-[#142B4E] outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="co-zip" className="block text-xs text-neutral-600 mb-1">
                    {copy.checkout.postalCode}
                  </label>
                  <input
                    id="co-zip"
                    required
                    value={shippingPostalCode}
                    onChange={(e) => setShippingPostalCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-black/15 focus:border-[#142B4E] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-3 border-t border-black/10">
              <label className="inline-flex items-center gap-2 text-xs text-neutral-800 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="billing-same-checkbox"
                  checked={billingSameAsShipping}
                  onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                  className="accent-[#142B4E]"
                />
                <span>Billing address is same as shipping address</span>
              </label>

              {!billingSameAsShipping && (
                <div className="p-4 bg-[#FAFAFA] border border-black/15 space-y-3" data-testid="billing-fields-panel">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#142B4E]">
                    Billing Address
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="bill-name" className="block text-[11px] text-neutral-600 mb-1">
                        Billing Name *
                      </label>
                      <input
                        id="bill-name"
                        required={!billingSameAsShipping}
                        value={billingName}
                        onChange={(e) => setBillingName(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-black/15 bg-white outline-none focus:border-[#142B4E]"
                      />
                    </div>
                    <div>
                      <label htmlFor="bill-email" className="block text-[11px] text-neutral-600 mb-1">
                        Billing Email
                      </label>
                      <input
                        id="bill-email"
                        type="email"
                        value={billingEmail}
                        onChange={(e) => setBillingEmail(e.target.value)}
                        placeholder={customerEmail}
                        className="w-full px-3 py-2 text-xs border border-black/15 bg-white outline-none focus:border-[#142B4E]"
                      />
                    </div>
                    <div>
                      <label htmlFor="bill-addr" className="block text-[11px] text-neutral-600 mb-1">
                        Billing Street Address *
                      </label>
                      <input
                        id="bill-addr"
                        required={!billingSameAsShipping}
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-black/15 bg-white outline-none focus:border-[#142B4E]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="bill-city" className="block text-[11px] text-neutral-600 mb-1">
                          City *
                        </label>
                        <input
                          id="bill-city"
                          required={!billingSameAsShipping}
                          value={billingCity}
                          onChange={(e) => setBillingCity(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-black/15 bg-white outline-none focus:border-[#142B4E]"
                        />
                      </div>
                      <div>
                        <label htmlFor="bill-zip" className="block text-[11px] text-neutral-600 mb-1">
                          Postal *
                        </label>
                        <input
                          id="bill-zip"
                          required={!billingSameAsShipping}
                          value={billingPostalCode}
                          onChange={(e) => setBillingPostalCode(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-black/15 bg-white outline-none focus:border-[#142B4E]"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="bill-phone" className="block text-[11px] text-neutral-600 mb-1">
                        Billing Phone
                      </label>
                      <input
                        id="bill-phone"
                        value={billingPhone}
                        onChange={(e) => setBillingPhone(e.target.value)}
                        placeholder={customerPhone}
                        className="w-full px-3 py-2 text-xs border border-black/15 bg-white outline-none focus:border-[#142B4E]"
                      />
                    </div>
                    <div>
                      <label htmlFor="bill-country" className="block text-[11px] text-neutral-600 mb-1">
                        Billing Country
                      </label>
                      <input
                        id="bill-country"
                        value={billingCountry}
                        onChange={(e) => setBillingCountry(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-black/15 bg-white outline-none focus:border-[#142B4E]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {forceB2B ? (
              <div className="pt-1 px-3 py-2.5 border border-[#142B4E]/25 bg-[#F4F7FB] text-xs text-[#142B4E] inline-flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" />
                <span className="font-semibold uppercase tracking-wider">{copy.checkout.b2bGroupLabel}</span>
              </div>
            ) : (
              <label className="inline-flex items-center gap-2 text-xs text-neutral-700 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isB2B}
                  onChange={(e) => setIsB2B(e.target.checked)}
                  className="accent-[#142B4E]"
                />
                <Building2 className="w-3.5 h-3.5" />
                <span>Order on behalf of a Company (B2B Invoice / VAT ID)</span>
              </label>
            )}

            {(forceB2B || isB2B) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <input
                  required={forceB2B}
                  placeholder="Company Name *"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="px-3 py-2 text-xs border border-black/15 focus:border-[#142B4E] outline-none"
                />
                <input
                  placeholder="Org. Number / VAT ID"
                  value={orgNumber}
                  onChange={(e) => setOrgNumber(e.target.value)}
                  className="px-3 py-2 text-xs border border-black/15 focus:border-[#142B4E] outline-none"
                />
              </div>
            )}
          </section>

          {/* 2. DHL Delivery Selection */}
          <section className="space-y-3 pt-4 border-t border-black/10">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              2. {copy.checkout.dhlDelivery}
            </h2>
            <div className="space-y-2.5">
              {(dhlQuotes.length > 0
                ? dhlQuotes
                : [
                    {
                      method: 'dhl_economy' as const,
                      label: 'DHL Parcel Economy',
                      carrier: 'DHL',
                      cost: totals.shippingCost,
                      etaDays: region.dhl_eta_days,
                      freeShippingApplied: totals.freeShippingApplied,
                      mode: 'regional_tariff' as const,
                    },
                    {
                      method: 'dhl_express' as const,
                      label: 'DHL Express Priority',
                      carrier: 'DHL Express',
                      cost: region.dhl_express_rate,
                      etaDays: '1–2 business days',
                      freeShippingApplied: false,
                      mode: 'regional_tariff' as const,
                    },
                  ]
              ).map((q) => (
                <label
                  key={q.method}
                  className={`flex items-center justify-between p-4 border cursor-pointer transition-colors ${
                    shippingMethod === q.method
                      ? 'border-[#142B4E] bg-[#142B4E]/[0.03]'
                      : 'border-black/15 hover:border-black/35'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shippingMethod"
                      checked={shippingMethod === q.method}
                      onChange={() => setShippingMethod(q.method)}
                      className="accent-[#142B4E]"
                    />
                    <div>
                      <div className="text-xs font-medium flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-[#FFCC00] text-[#D40511] text-[10px] font-bold">
                          DHL
                        </span>
                        <span>{q.label}</span>
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">{q.etaDays}</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono-tabular font-medium">
                    {q.cost === 0 ? 'Free' : formatRegionalPrice(q.cost, region.code)}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* 3. Localized Payment Method Selector */}
          <section className="space-y-3 pt-4 border-t border-black/10">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              3. {copy.checkout.paymentMethod}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableMethods.map((method) => {
                const selected = paymentMethod === method;
                const labelMap: Record<PaymentMethod, { title: string; sub: string; icon: React.ReactNode }> = {
                  vipps: {
                    title: 'Vipps MobilePay',
                    sub: 'Instant Norwegian NOK payment',
                    icon: <Smartphone className="w-4 h-4 text-[#FF5B24]" />,
                  },
                  stripe: {
                    title: 'Card (Stripe)',
                    sub: 'Visa, Mastercard, Apple Pay',
                    icon: <CreditCard className="w-4 h-4 text-[#142B4E]" />,
                  },
                  paypal: {
                    title: 'PayPal',
                    sub: 'PayPal Wallet or Express',
                    icon: <CreditCard className="w-4 h-4 text-[#003087]" />,
                  },
                  bank_transfer: {
                    title: 'Local Bank Transfer',
                    sub: `${region.bank_name} · ${region.bank_reference_prefix}/KID`,
                    icon: <Landmark className="w-4 h-4 text-neutral-700" />,
                  },
                };
                const meta = labelMap[method];

                return (
                  <label
                    key={method}
                    className={`p-4 border flex items-start gap-3 cursor-pointer transition-colors ${
                      selected
                        ? 'border-[#142B4E] bg-[#142B4E]/[0.03]'
                        : 'border-black/15 hover:border-black/35'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={selected}
                      onChange={() => setPaymentMethod(method)}
                      className="mt-1 accent-[#142B4E]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs font-medium">
                        {meta.icon}
                        <span>{meta.title}</span>
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-1">{meta.sub}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            {paymentMethod === 'bank_transfer' && (
              <div className="p-3.5 bg-[#F7F7F7] border border-black/10 text-[11px] text-neutral-600">
                Order is reserved immediately. Full {region.bank_name} IBAN & reference code will be generated on the confirmation receipt.
              </div>
            )}
          </section>

          <div>
            <label htmlFor="co-notes" className="block text-xs text-neutral-600 mb-1">
              Tailoring or Courier Notes (Optional)
            </label>
            <textarea
              id="co-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-black/15 focus:border-[#142B4E] outline-none"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700">{errorMsg}</div>
          )}
        </div>

        {/* Right Column: Order Summary */}
        <aside className="lg:col-span-5">
          <div className="border border-black/15 bg-[#FAFAFA] p-6 space-y-5 lg:sticky lg:top-24">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] inline-flex items-center gap-2">
              {copy.checkout.orderSummary}
              {forceB2B && (
                <span className="px-1.5 py-0.5 rounded-sm bg-[#142B4E] text-white text-[9px] tracking-wider">
                  {copy.checkout.b2bBadge}
                </span>
              )}
            </h2>

            <div className="divide-y divide-black/10 max-h-72 overflow-y-auto">
              {items.map((item) => (
                <div key={item.cartKey} className="py-3 flex gap-3">
                  <img
                    src={item.image}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-14 h-16 object-cover bg-[#E6E6E6]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium uppercase truncate inline-flex items-center gap-1.5">
                      {forceB2B && (
                        <span className="px-1 py-0.5 rounded-sm bg-[#142B4E] text-white text-[8px] tracking-wider">
                          {copy.checkout.b2bBadge}
                        </span>
                      )}
                      <span className="truncate">{item.title}</span>
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {item.tailoring.fit} · {item.tailoring.size} · Qty {item.quantity}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {item.tailoring.collar} · {item.tailoring.cuff}
                    </div>
                    {((item.tailoring.tailoringSurcharge || 0) > 0 ||
                      item.tailoring.lengthAdjustmentCm !== 0 ||
                      item.tailoring.sleeveAdjustmentCm !== 0) && (
                      <div className="text-[10px] text-[#4F8A47] mt-0.5">
                        {[
                          item.tailoring.lengthAdjustmentCm !== 0 ? `Len ${item.tailoring.lengthAdjustmentCm > 0 ? '+' : ''}${item.tailoring.lengthAdjustmentCm}cm` : null,
                          item.tailoring.sleeveAdjustmentCm !== 0 ? `Slv ${item.tailoring.sleeveAdjustmentCm > 0 ? '+' : ''}${item.tailoring.sleeveAdjustmentCm}cm` : null,
                          (item.tailoring.waistAdjustmentCm || 0) !== 0 ? `Waist ${(item.tailoring.waistAdjustmentCm || 0) > 0 ? '+' : ''}${item.tailoring.waistAdjustmentCm}cm` : null,
                          (item.tailoring.chestAdjustmentCm || 0) !== 0 ? `Chest ${(item.tailoring.chestAdjustmentCm || 0) > 0 ? '+' : ''}${item.tailoring.chestAdjustmentCm}cm` : null,
                          (item.tailoring.bottomHemAdjustmentCm || 0) !== 0 ? `Hem ${(item.tailoring.bottomHemAdjustmentCm || 0) > 0 ? '+' : ''}${item.tailoring.bottomHemAdjustmentCm}cm` : null,
                          (item.tailoring.shoulderAdjustmentCm || 0) !== 0 ? `Shld ${(item.tailoring.shoulderAdjustmentCm || 0) > 0 ? '+' : ''}${item.tailoring.shoulderAdjustmentCm}cm` : null,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                        {(item.tailoring.tailoringSurcharge || 0) > 0
                          ? ` (+${formatRegionalPrice(item.tailoring.tailoringSurcharge || 0, region.code)})`
                          : ''}
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-mono-tabular">
                    {formatRegionalPrice(item.unitPrice * item.quantity, region.code)}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2 border-t border-black/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  placeholder={copy.checkout.discountPlaceholder}
                  className="flex-1 px-3 py-2 text-xs border border-black/15 bg-white outline-none focus:border-[#142B4E]"
                />
                <button
                  type="button"
                  onClick={() => setAppliedDiscount(discountInput.trim().toUpperCase())}
                  className="px-4 py-2 border border-[#142B4E] text-[#142B4E] text-xs uppercase tracking-wider hover:bg-[#142B4E] hover:text-white transition-colors cursor-pointer"
                >
                  {copy.checkout.apply}
                </button>
              </div>
              {promoFeedback && (
                <div className="text-[11px] text-amber-700">{promoFeedback}</div>
              )}
              {bulkDiscount.enabled && totals.nextBulkTier && (
                <div className="text-[11px] text-neutral-600">
                  {copy.bulk.upsellTemplate
                    .replace('{qty}', String(totals.unitsNeededForNext))
                    .replace('{pct}', String(totals.nextBulkTier.discountPct))}
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs font-mono-tabular pt-2 border-t border-black/10">
              <div className="flex justify-between">
                <span className="text-neutral-600">{copy.checkout.subtotal}</span>
                <span>{formatRegionalPrice(totals.subtotal, region.code)}</span>
              </div>
              {totals.bulkDiscountAmount > 0 && (
                <div className="flex justify-between text-[#4F8A47]">
                  <span>
                    {copy.bulk.bulkDiscountRow} ({totals.appliedBulkTier?.minQty}+ pcs · -{totals.appliedBulkTier?.discountPct}%)
                  </span>
                  <span>-{formatRegionalPrice(totals.bulkDiscountAmount, region.code)}</span>
                </div>
              )}
              {totals.couponDiscountAmount > 0 && totals.appliedCouponCode && (
                <div className="flex justify-between text-[#4F8A47]">
                  <span>Promo ({totals.appliedCouponCode})</span>
                  <span>-{formatRegionalPrice(totals.couponDiscountAmount, region.code)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-600">{copy.checkout.dhlShipping}</span>
                <span>
                  {totals.shippingCost === 0
                    ? 'Free'
                    : formatRegionalPrice(totals.shippingCost, region.code)}
                </span>
              </div>
              {totals.vatAmount > 0 && (
                <div className="flex justify-between text-neutral-500">
                  <span>{copy.checkout.includedVat} ({Math.round(region.vat_rate * 100)}%)</span>
                  <span>{formatRegionalPrice(totals.vatAmount, region.code)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold pt-3 border-t border-black/10">
                <span>{copy.checkout.totalLabel} ({region.currency_code})</span>
                <span>{formatRegionalPrice(totals.total, region.code)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-[0.16em] font-medium transition-colors cursor-pointer"
            >
              {submitting ? 'Processing...' : copy.checkout.placeOrder}
            </button>
          </div>
        </aside>
      </form>
    </main>
  );
};
