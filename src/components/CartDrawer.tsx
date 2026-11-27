import React, { useMemo } from 'react';
import { Building2, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import type { BulkDiscountSettings, CartChannel, CartItem, Product, RegionConfig } from '../types.ts';
import type { RegionCopy } from '../i18n/translations.ts';
import {
  calculateBulkPurchaseDiscount,
  DEFAULT_BULK_DISCOUNT_SETTINGS,
  formatRegionalPrice,
} from '../utils/commerce.ts';

export function resolveCartChannel(item: CartItem): CartChannel {
  if (item.channel === 'b2b' || item.channel === 'b2c') return item.channel;
  if (String(item.cartKey || '').startsWith('b2b')) return 'b2b';
  return 'b2c';
}

/** Bag badge = retail lines + unique B2B colour groups (not total piece count). */
export function countCartBadgeEntries(items: CartItem[]): number {
  let retail = 0;
  const b2bKeys = new Set<string>();
  for (const item of items) {
    if (resolveCartChannel(item) === 'b2b') {
      b2bKeys.add(
        item.b2bGroupKey ||
          `${item.productId}|${item.tailoring.fit}|${item.tailoring.collar}|${item.tailoring.cuff}`
      );
    } else {
      retail += 1;
    }
  }
  return retail + b2bKeys.size;
}

interface CartDrawerProps {
  open: boolean;
  mode: 'bag' | 'wishlist';
  region: RegionConfig;
  copy: RegionCopy;
  items: CartItem[];
  wishlistProducts: Product[];
  bulkDiscount?: BulkDiscountSettings;
  onClose: () => void;
  onUpdateQty: (cartKey: string, qty: number) => void;
  onRemoveItem: (cartKey: string) => void;
  onCheckoutRetail: () => void;
  onCheckoutB2B: () => void;
  onOpenProduct: (slug: string) => void;
  onToggleWishlist: (productId: number) => void;
}

function CartLine({
  item,
  region,
  copy,
  showB2bBadge,
  onUpdateQty,
  onRemoveItem,
}: {
  item: CartItem;
  region: RegionConfig;
  copy: RegionCopy;
  showB2bBadge?: boolean;
  onUpdateQty: (cartKey: string, qty: number) => void;
  onRemoveItem: (cartKey: string) => void;
}) {
  return (
    <div className="flex gap-4 pb-4 border-b border-black/10 last:border-b-0 last:pb-0">
      <img
        src={item.image}
        alt={item.title}
        referrerPolicy="no-referrer"
        className="w-20 h-24 object-cover bg-[#E6E6E6] shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {showB2bBadge && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-[#142B4E] text-white text-[9px] font-semibold uppercase tracking-wider">
                  {copy.checkout.b2bBadge}
                </span>
              )}
              <div className="text-xs font-medium uppercase leading-snug">{item.title}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRemoveItem(item.cartKey)}
            aria-label={`Remove ${item.title}`}
            className="text-neutral-400 hover:text-red-600 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="text-[11px] text-neutral-500 mt-1 space-y-0.5">
          <div>
            {item.tailoring.fit} · {item.tailoring.size}
          </div>
          <div>
            Collar: {item.tailoring.collar} · Cuff: {item.tailoring.cuff}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="inline-flex items-center border border-black/15">
            <button
              type="button"
              onClick={() => onUpdateQty(item.cartKey, item.quantity - 1)}
              aria-label="Decrease quantity"
              className="p-1.5 hover:bg-neutral-100 cursor-pointer"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="px-3 text-xs font-mono-tabular">{item.quantity}</span>
            <button
              type="button"
              onClick={() => onUpdateQty(item.cartKey, item.quantity + 1)}
              aria-label="Increase quantity"
              className="p-1.5 hover:bg-neutral-100 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <span className="text-xs font-mono-tabular font-medium">
            {formatRegionalPrice(item.unitPrice * item.quantity, region.code)}
          </span>
        </div>
      </div>
    </div>
  );
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  mode,
  region,
  copy,
  items,
  wishlistProducts,
  bulkDiscount = DEFAULT_BULK_DISCOUNT_SETTINGS,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onCheckoutRetail,
  onCheckoutB2B,
  onOpenProduct,
  onToggleWishlist,
}) => {
  const retailItems = useMemo(
    () => items.filter((i) => resolveCartChannel(i) === 'b2c'),
    [items]
  );
  const b2bItems = useMemo(
    () => items.filter((i) => resolveCartChannel(i) === 'b2b'),
    [items]
  );

  const b2bGroups = useMemo(() => {
    const map = new Map<
      string,
      { key: string; title: string; image: string; fit: string; collar: string; cuff: string; lines: CartItem[] }
    >();
    for (const item of b2bItems) {
      const key =
        item.b2bGroupKey ||
        `${item.productId}|${item.tailoring.fit}|${item.tailoring.collar}|${item.tailoring.cuff}`;
      const existing = map.get(key);
      if (existing) {
        existing.lines.push(item);
      } else {
        map.set(key, {
          key,
          title: item.title,
          image: item.image,
          fit: item.tailoring.fit,
          collar: item.tailoring.collar,
          cuff: item.tailoring.cuff,
          lines: [item],
        });
      }
    }
    return Array.from(map.values());
  }, [b2bItems]);

  if (!open) return null;

  const retailSubtotal = retailItems.reduce((s, item) => s + item.unitPrice * item.quantity, 0);
  const b2bSubtotal = b2bItems.reduce((s, item) => s + item.unitPrice * item.quantity, 0);
  const b2bPcs = b2bItems.reduce((s, item) => s + item.quantity, 0);
  const subtotal = retailSubtotal + b2bSubtotal;
  const totalQty = items.reduce((s, item) => s + item.quantity, 0);
  const bulkEval = calculateBulkPurchaseDiscount(totalQty, subtotal, bulkDiscount, region.code);
  const estimatedAfterBulk = Math.max(0, subtotal - bulkEval.discountAmount);
  const hasRetail = retailItems.length > 0;
  const hasB2B = b2bItems.length > 0;
  const isMixed = hasRetail && hasB2B;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/45 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="relative w-full max-w-md bg-white text-[#1A1A1A] h-full shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-black/10 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-[0.12em]">
              {mode === 'bag' ? copy.checkout.bagTitle : copy.nav.wishlist}
            </h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {region.name} ({region.currency_code}) · {region.warehouse_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="p-2 text-neutral-500 hover:text-black cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {mode === 'wishlist' ? (
            wishlistProducts.length === 0 ? (
              <p className="text-sm text-neutral-500 py-12 text-center">
                No saved shirts in your wishlist yet.
              </p>
            ) : (
              wishlistProducts.map((p) => (
                <div key={p.id} className="flex gap-4 pb-4 border-b border-black/10">
                  <img
                    src={p.primary_image}
                    alt={p.title}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 object-cover bg-[#E6E6E6] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium uppercase truncate">{p.title}</div>
                    <div className="text-xs font-mono-tabular text-neutral-600 mt-1">
                      {formatRegionalPrice(p.price, region.code)}
                    </div>
                    <div className="mt-2.5 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          onOpenProduct(p.slug);
                          onClose();
                        }}
                        className="text-xs text-[#142B4E] font-medium hover:underline cursor-pointer"
                      >
                        {copy.catalog.quickView}
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleWishlist(p.id)}
                        className="text-xs text-neutral-500 hover:text-red-600 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : items.length === 0 ? (
            <p className="text-sm text-neutral-500 py-12 text-center">{copy.checkout.emptyBag}</p>
          ) : (
            <>
              {isMixed && (
                <div className="px-3 py-2.5 border border-amber-200 bg-amber-50 text-[11px] text-amber-900 leading-relaxed">
                  {copy.checkout.mixedCartNote}
                </div>
              )}

              {hasRetail && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-black/10 pb-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#1A1A1A]">
                      <ShoppingBag className="w-3.5 h-3.5 text-[#142B4E]" />
                      <span>{copy.checkout.retailGroupLabel}</span>
                    </div>
                    <span className="text-[11px] font-mono-tabular text-neutral-500">
                      {formatRegionalPrice(retailSubtotal, region.code)}
                    </span>
                  </div>
                  {retailItems.map((item) => (
                    <CartLine
                      key={item.cartKey}
                      item={item}
                      region={region}
                      copy={copy}
                      onUpdateQty={onUpdateQty}
                      onRemoveItem={onRemoveItem}
                    />
                  ))}
                </section>
              )}

              {hasB2B && (
                <section className="space-y-3 rounded-sm border border-[#142B4E]/25 bg-[#F4F7FB] p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#142B4E]">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{copy.checkout.b2bGroupLabel}</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-[#142B4E] text-white text-[9px] tracking-wider">
                          {copy.checkout.b2bBadge}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed">
                        {copy.checkout.b2bGroupHint}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-mono-tabular font-semibold text-[#142B4E]">
                        {b2bPcs} {copy.checkout.pcsLabel}
                      </div>
                      <div className="text-[11px] font-mono-tabular text-neutral-600">
                        {formatRegionalPrice(b2bSubtotal, region.code)}
                      </div>
                    </div>
                  </div>

                  {b2bGroups.map((group) => {
                    const groupPcs = group.lines.reduce((s, l) => s + l.quantity, 0);
                    const groupTotal = group.lines.reduce(
                      (s, l) => s + l.unitPrice * l.quantity,
                      0
                    );
                    const sortedLines = [...group.lines].sort((a, b) =>
                      String(a.tailoring.size).localeCompare(String(b.tailoring.size), undefined, {
                        numeric: true,
                      })
                    );
                    return (
                      <div
                        key={group.key}
                        className="bg-white border border-[#142B4E]/15 p-3 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={group.image}
                            alt={group.title}
                            referrerPolicy="no-referrer"
                            className="w-14 h-16 object-cover bg-[#E6E6E6] shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold uppercase leading-snug">
                                  {group.title}
                                </div>
                                <div className="text-[10px] text-neutral-500 mt-0.5">
                                  {group.fit} · {group.collar} · {group.cuff}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  for (const line of group.lines) onRemoveItem(line.cartKey);
                                }}
                                aria-label={`Remove ${group.title} group`}
                                className="text-neutral-400 hover:text-red-600 cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="mt-1.5 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono-tabular text-[#142B4E] font-semibold">
                                {groupPcs} {copy.checkout.pcsLabel} · {sortedLines.length} sizes
                              </span>
                              <span className="text-[11px] font-mono-tabular font-medium">
                                {formatRegionalPrice(groupTotal, region.code)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="border border-[#142B4E]/10 overflow-hidden">
                          <div className="grid grid-cols-[1fr_auto_auto] gap-0 bg-[#F4F7FB] text-[9px] uppercase tracking-wider text-neutral-500 font-semibold">
                            <div className="px-2.5 py-1.5">Size</div>
                            <div className="px-2.5 py-1.5 text-center">Qty</div>
                            <div className="px-2.5 py-1.5 text-right">Line</div>
                          </div>
                          <div className="divide-y divide-black/5">
                            {sortedLines.map((item) => (
                              <div
                                key={item.cartKey}
                                className="grid grid-cols-[1fr_auto_auto] items-center gap-0 text-[11px]"
                              >
                                <div className="px-2.5 py-1.5 font-mono-tabular text-neutral-700">
                                  {item.tailoring.size}
                                </div>
                                <div className="px-1.5 py-1 inline-flex items-center justify-center">
                                  <div className="inline-flex items-center border border-black/15">
                                    <button
                                      type="button"
                                      onClick={() => onUpdateQty(item.cartKey, item.quantity - 1)}
                                      aria-label={`Decrease ${item.tailoring.size}`}
                                      className="p-1 hover:bg-neutral-100 cursor-pointer"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="px-2 font-mono-tabular min-w-[1.75rem] text-center">
                                      {item.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => onUpdateQty(item.cartKey, item.quantity + 1)}
                                      aria-label={`Increase ${item.tailoring.size}`}
                                      className="p-1 hover:bg-neutral-100 cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                <div className="px-2.5 py-1.5 text-right font-mono-tabular text-neutral-600">
                                  {formatRegionalPrice(item.unitPrice * item.quantity, region.code)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </section>
              )}
            </>
          )}
        </div>

        {mode === 'bag' && items.length > 0 && (
          <div className="p-6 border-t border-black/10 bg-[#FAFAFA] space-y-3">
            {bulkDiscount.enabled && hasRetail && (bulkEval.appliedTier || bulkEval.nextTier) && (
              <div className="p-3 border border-[#142B4E]/15 bg-white text-[11px] space-y-1.5">
                {bulkEval.appliedTier ? (
                  <div className="flex items-center justify-between text-[#4F8A47] font-medium">
                    <span>
                      {copy.bulk.unlockedLabel} ({bulkEval.appliedTier.minQty}+ pcs · -{bulkEval.discountPct}%)
                    </span>
                    <span className="font-mono-tabular">
                      -{formatRegionalPrice(bulkEval.discountAmount, region.code)}
                    </span>
                  </div>
                ) : null}
                {bulkEval.nextTier && (
                  <div className="text-neutral-600">
                    {copy.bulk.upsellTemplate
                      .replace('{qty}', String(bulkEval.unitsNeededForNext))
                      .replace('{pct}', String(bulkEval.nextTier.discountPct))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-neutral-600">
              <span>{copy.checkout.subtotal}</span>
              <span className="font-mono-tabular">
                {formatRegionalPrice(subtotal, region.code)}
              </span>
            </div>

            {bulkEval.discountAmount > 0 && hasRetail && !hasB2B && (
              <div className="flex items-center justify-between text-xs text-[#4F8A47]">
                <span>{copy.bulk.bulkDiscountRow} (-{bulkEval.discountPct}%)</span>
                <span className="font-mono-tabular">
                  -{formatRegionalPrice(bulkEval.discountAmount, region.code)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm pt-2 border-t border-black/10">
              <span className="font-medium">{copy.checkout.totalLabel}</span>
              <span className="font-mono-tabular font-semibold">
                {formatRegionalPrice(
                  hasB2B && !hasRetail ? b2bSubtotal : estimatedAfterBulk,
                  region.code
                )}
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {hasRetail && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCheckoutRetail();
                  }}
                  className="w-full py-3.5 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-[0.16em] font-medium transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>
                    {isMixed || hasB2B
                      ? copy.checkout.checkoutRetailCta
                      : copy.checkout.proceedToCheckout}
                  </span>
                </button>
              )}
              {hasB2B && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCheckoutB2B();
                  }}
                  className="w-full py-3.5 border border-[#142B4E] bg-white hover:bg-[#142B4E] text-[#142B4E] hover:text-white text-xs uppercase tracking-[0.16em] font-medium transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{copy.checkout.checkoutB2bCta}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
