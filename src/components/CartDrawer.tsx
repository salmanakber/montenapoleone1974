import React from 'react';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import type { BulkDiscountSettings, CartItem, Product, RegionConfig } from '../types.ts';
import type { RegionCopy } from '../i18n/translations.ts';
import {
  calculateBulkPurchaseDiscount,
  DEFAULT_BULK_DISCOUNT_SETTINGS,
  formatRegionalPrice,
} from '../utils/commerce.ts';

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
  onCheckout: () => void;
  onOpenProduct: (slug: string) => void;
  onToggleWishlist: (productId: number) => void;
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
  onCheckout,
  onOpenProduct,
  onToggleWishlist,
}) => {
  if (!open) return null;

  const subtotal = items.reduce((s, item) => s + item.unitPrice * item.quantity, 0);
  const totalQty = items.reduce((s, item) => s + item.quantity, 0);
  const bulkEval = calculateBulkPurchaseDiscount(totalQty, subtotal, bulkDiscount, region.code);
  const estimatedAfterBulk = Math.max(0, subtotal - bulkEval.discountAmount);

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

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
            items.map((item) => (
              <div key={item.cartKey} className="flex gap-4 pb-4 border-b border-black/10">
                <img
                  src={item.image}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-20 h-24 object-cover bg-[#E6E6E6] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-medium uppercase leading-snug">{item.title}</div>
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
                    {(item.tailoring.sleeveAdjustmentCm !== 0 ||
                      item.tailoring.lengthAdjustmentCm !== 0 ||
                      (item.tailoring.waistAdjustmentCm || 0) !== 0 ||
                      (item.tailoring.chestAdjustmentCm || 0) !== 0 ||
                      (item.tailoring.bottomHemAdjustmentCm || 0) !== 0 ||
                      (item.tailoring.shoulderAdjustmentCm || 0) !== 0 ||
                      item.tailoring.monogram) && (
                      <div className="text-[#4F8A47] leading-relaxed">
                        Tailored:{' '}
                        {[
                          item.tailoring.lengthAdjustmentCm !== 0
                            ? `Length ${item.tailoring.lengthAdjustmentCm > 0 ? `+${item.tailoring.lengthAdjustmentCm}` : item.tailoring.lengthAdjustmentCm}cm`
                            : null,
                          item.tailoring.sleeveAdjustmentCm !== 0
                            ? `Sleeve ${item.tailoring.sleeveAdjustmentCm > 0 ? `+${item.tailoring.sleeveAdjustmentCm}` : item.tailoring.sleeveAdjustmentCm}cm`
                            : null,
                          (item.tailoring.waistAdjustmentCm || 0) !== 0
                            ? `Waist ${(item.tailoring.waistAdjustmentCm || 0) > 0 ? `+${item.tailoring.waistAdjustmentCm}` : item.tailoring.waistAdjustmentCm}cm`
                            : null,
                          (item.tailoring.chestAdjustmentCm || 0) !== 0
                            ? `Chest ${(item.tailoring.chestAdjustmentCm || 0) > 0 ? `+${item.tailoring.chestAdjustmentCm}` : item.tailoring.chestAdjustmentCm}cm`
                            : null,
                          (item.tailoring.bottomHemAdjustmentCm || 0) !== 0
                            ? `Hem ${(item.tailoring.bottomHemAdjustmentCm || 0) > 0 ? `+${item.tailoring.bottomHemAdjustmentCm}` : item.tailoring.bottomHemAdjustmentCm}cm`
                            : null,
                          (item.tailoring.shoulderAdjustmentCm || 0) !== 0
                            ? `Shoulder ${(item.tailoring.shoulderAdjustmentCm || 0) > 0 ? `+${item.tailoring.shoulderAdjustmentCm}` : item.tailoring.shoulderAdjustmentCm}cm`
                            : null,
                          item.tailoring.monogram ? `Monogram ${item.tailoring.monogram}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                        {(item.tailoring.tailoringSurcharge || 0) > 0 && (
                          <span className="ml-1 font-mono-tabular text-[#142B4E]">
                            (+{formatRegionalPrice(item.tailoring.tailoringSurcharge || 0, region.code)})
                          </span>
                        )}
                      </div>
                    )}
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
            ))
          )}
        </div>

        {mode === 'bag' && items.length > 0 && (
          <div className="p-6 border-t border-black/10 bg-[#FAFAFA] space-y-3">
            {bulkDiscount.enabled && (bulkEval.appliedTier || bulkEval.nextTier) && (
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

            {bulkEval.discountAmount > 0 && (
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
                {formatRegionalPrice(estimatedAfterBulk, region.code)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onCheckout();
              }}
              className="w-full py-3.5 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-[0.16em] font-medium transition-colors cursor-pointer"
            >
              {copy.checkout.proceedToCheckout}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
