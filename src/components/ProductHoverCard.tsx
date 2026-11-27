import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, Star } from 'lucide-react';
import type { Product, RegionCode } from '../types.ts';
import { evaluateStockState, formatRegionalPrice } from '../utils/commerce.ts';
import {
  resolveFilledGalleryMedia,
  resolveListingImage,
} from '../utils/productGallery.ts';

interface ProductHoverCardProps {
  product: Product;
  regionCode: RegionCode;
  preorderLabel: string;
  outOfStockLabel: string;
  inWishlist: boolean;
  hidePrice?: boolean;
  onOpenProduct: (slug: string) => void;
  onToggleWishlist: (productId: number) => void;
}

export const ProductHoverCard: React.FC<ProductHoverCardProps> = ({
  product,
  regionCode,
  preorderLabel,
  outOfStockLabel,
  inWishlist,
  hidePrice = false,
  onOpenProduct,
  onToggleWishlist,
}) => {
  const filled = resolveFilledGalleryMedia(product);
  const listing = resolveListingImage(product);
  const images =
    filled.length > 0
      ? [listing, ...filled.filter((u) => u !== listing)].filter(Boolean)
      : [listing || product.primary_image].filter(Boolean);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const stockState = evaluateStockState(product.stock_qty, product.preorder_allowed);
  const currentImg = images[activeIndex] || listing || product.primary_image;
  const totalFrames = Math.max(1, images.length);
  const progressPct = ((activeIndex + 1) / totalFrames) * 100;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (images.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width - 1, e.clientX - rect.left));
    const idx = Math.min(images.length - 1, Math.floor((relX / rect.width) * images.length));
    if (idx !== activeIndex) {
      setActiveIndex(idx);
    }
  };

  return (
    <article
      className="group flex flex-col"
      onMouseEnter={() => {
        setIsHovered(true);
        if (images.length > 1 && activeIndex === 0) {
          setActiveIndex(1);
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setActiveIndex(0);
      }}
    >
      <div
        className="relative aspect-[4/5] w-full bg-[#E6E6E6] overflow-hidden"
        onMouseMove={handleMouseMove}
      >
        {/* Top-Left Stock Count or Pre-order Pill (Hidden on B2B price-free grid if desired, or shown cleanly) */}
        {!hidePrice && (
          <>
            {stockState === 'preorder' ? (
              <span className="absolute top-3 left-3 z-10 px-2.5 py-0.5 text-[11px] font-medium bg-[#4F8A47] text-white pointer-events-none">
                {preorderLabel}
              </span>
            ) : stockState === 'out_of_stock' ? (
              <span className="absolute top-3 left-3 z-10 px-2.5 py-0.5 text-[11px] font-medium bg-neutral-700 text-white pointer-events-none">
                {outOfStockLabel}
              </span>
            ) : (
              <span className="absolute top-3 left-3 z-10 text-xs font-mono-tabular text-neutral-700 pointer-events-none">
                {product.stock_qty}
              </span>
            )}
          </>
        )}

        {/* Top-Right Wishlist Heart */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product.id);
          }}
          aria-label={
            inWishlist
              ? `Remove ${product.title} from wishlist`
              : `Add ${product.title} to wishlist`
          }
          className="absolute top-3 right-3 z-10 p-1.5 text-neutral-600 hover:text-[#142B4E] transition-colors cursor-pointer"
        >
          <Heart
            className={`w-4 h-4 ${inWishlist ? 'fill-[#142B4E] text-[#142B4E]' : ''}`}
          />
        </button>

        {product.performance_badge && (
          <span
            className={`absolute bottom-3 left-3 z-10 inline-flex items-center gap-1 px-2 py-1 text-[9px] uppercase tracking-wider font-semibold shadow-sm pointer-events-none ${
              product.performance_badge === 'star_seller'
                ? 'bg-[#FFCC00] text-[#142B4E]'
                : 'bg-[#142B4E] text-white'
            }`}
          >
            <Star className="w-3 h-3" />
            {product.performance_badge === 'star_seller' ? 'Star seller' : 'Top seller'}
          </span>
        )}

        {/* Image Trigger */}
        <button
          type="button"
          onClick={() => onOpenProduct(product.slug)}
          className="w-full h-full block cursor-pointer"
          aria-label={`View ${product.title}`}
        >
          <img
            src={currentImg}
            alt={product.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </button>

        {/* Hover Prev / Next Controls */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
              }}
              aria-label={`Previous image of ${product.title}`}
              className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/85 hover:bg-white text-[#1A1A1A] flex items-center justify-center shadow-sm transition-opacity cursor-pointer ${
                isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((prev) => (prev + 1) % images.length);
              }}
              aria-label={`Next image of ${product.title}`}
              className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/85 hover:bg-white text-[#1A1A1A] flex items-center justify-center shadow-sm transition-opacity cursor-pointer ${
                isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Crisp Studio Price Tag Overlay (B2C) */}
        {!hidePrice && (
          <div className="absolute bottom-2.5 right-2.5 z-10 bg-white/95 text-[#142B4E] font-mono-tabular text-xs font-semibold px-2.5 py-0.5 shadow-sm border border-black/10 pointer-events-none">
            {formatRegionalPrice(product.price, regionCode)}
          </div>
        )}

        {/* Bottom Hover Progress Bar & Segments (Matches montenapoleone1974.com mont-card-slider) */}
        {images.length > 1 && (
          <div
            data-testid={`card-progress-${product.sku}`}
            className={`absolute inset-x-0 bottom-0 z-10 transition-opacity duration-200 pointer-events-none ${
              isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {/* Segmented step marks */}
            <div className="flex gap-0.5 px-0 bg-black/15 h-[3px] w-full">
              <div
                className="h-full bg-[#1A1A1A] transition-all duration-200 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Clean Caption & Prominent Price Below Image */}
      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-xs font-medium uppercase tracking-wide text-[#1A1A1A] leading-snug">
            <button
              type="button"
              onClick={() => onOpenProduct(product.slug)}
              className="hover:underline text-left cursor-pointer"
            >
              {product.title}
            </button>
          </h2>
          {!hidePrice && (
            <div className="mt-0.5 flex items-center gap-2 font-mono-tabular" data-testid={`card-price-${product.sku}`}>
              <span className="text-sm font-semibold text-[#142B4E]">
                {formatRegionalPrice(product.price, regionCode)}
              </span>
              {product.compare_at_price && (
                <span className="text-xs line-through text-neutral-400">
                  {formatRegionalPrice(product.compare_at_price, regionCode)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
