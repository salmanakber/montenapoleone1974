import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import {
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Heart,
  Ruler,
  ShoppingBag,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type {
  BespokeTailoring,
  Product,
  RegionCode,
  RegionConfig,
  TailoringSizeSpec,
  TailoringZoneKey,
} from '../types.ts';
import type { RegionCopy } from '../i18n/translations.ts';
import {
  calculateTailoringSurcharge,
  computeDefaultSizeMeasurements,
  DEFAULT_TAILORING_SURCHARGE,
  evaluateStockState,
  formatRegionalPrice,
  resolveVariantPriceAndStock,
} from '../utils/commerce.ts';
import { ProductHoverCard } from './ProductHoverCard.tsx';
import {
  CUFF_SPECS,
  CuffShowcaseIllustration,
  TailoringZoneSketch,
} from './TailoringIllustrations.tsx';

interface ProductDetailViewProps {
  product: Product;
  recommendations: Product[];
  region: RegionConfig;
  copy: RegionCopy;
  tailoringSpecs: TailoringSizeSpec[];
  tailoringSurcharges: Record<RegionCode, number>;
  inWishlist: boolean;
  wishlistIds: number[];
  onBack: () => void;
  onOpenProduct: (slug: string) => void;
  onToggleWishlist: (productId: number) => void;
  onAddToBag: (product: Product, tailoring: BespokeTailoring) => void;
  onSwitchToB2B?: (product: Product) => void;
  onOpenSizeGuide: () => void;
  onOpenReturnForm: () => void;
}

const COLLAR_META: Record<string, { hint: string }> = {
  Spread: { hint: 'For Business Shirt' },
  'Semi Spread': { hint: 'For Business Shirt' },
  'Button Down': { hint: 'For Casual Shirt' },
  Cutaway: { hint: 'For Casual & Formal' },
};

const FIT_OPTIONS: Array<{
  value: BespokeTailoring['fit'];
  label: string;
  desc: string;
}> = [
  {
    value: 'Regular Fit',
    label: 'REGULAR FIT',
    desc: 'Classic Italian cut with comfortable ease across chest and waist.',
  },
  {
    value: 'Slim Fit',
    label: 'SLIM FIT',
    desc: 'Tailored silhouette tapering cleanly at the waist.',
  },
  {
    value: 'Contemporary Fit',
    label: 'CONTEMPORARY FIT',
    desc: 'Balanced modern cut between Regular and Slim.',
  },
];

const CollarIllustration: React.FC<{ name: string }> = ({ name }) => {
  if (name === 'Cutaway') {
    return (
      <svg viewBox="0 0 64 42" className="w-14 h-9 text-[#1A1A1A]" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M16 8 L32 16 L48 8 L58 22 L38 28 L32 18 L26 28 L6 22 Z" />
        <line x1="32" y1="16" x2="32" y2="38" />
      </svg>
    );
  }
  if (name === 'Button Down') {
    return (
      <svg viewBox="0 0 64 42" className="w-14 h-9 text-[#1A1A1A]" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M18 6 L32 15 L46 6 L52 28 L38 30 L32 18 L26 30 L12 28 Z" />
        <circle cx="22" cy="24" r="1.5" fill="currentColor" />
        <circle cx="42" cy="24" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 42" className="w-14 h-9 text-[#1A1A1A]" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M18 7 L32 15 L46 7 L54 25 L36 31 L32 18 L28 31 L10 25 Z" />
      <line x1="32" y1="16" x2="32" y2="38" />
    </svg>
  );
};

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  recommendations,
  region,
  copy,
  tailoringSpecs,
  tailoringSurcharges,
  inWishlist,
  wishlistIds,
  onBack,
  onOpenProduct,
  onToggleWishlist,
  onAddToBag,
  onSwitchToB2B,
  onOpenSizeGuide,
  onOpenReturnForm,
}) => {
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 180, damping: 28, restDelta: 0.001 });
  const [showStickyBar, setShowStickyBar] = useState(false);

  const fitSectionRef = useRef<HTMLButtonElement>(null);
  const collarSectionRef = useRef<HTMLDivElement>(null);
  const cuffSectionRef = useRef<HTMLDivElement>(null);
  const tailoringSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 560);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToSection = (ref: React.RefObject<HTMLElement | null>) => {
    if (!ref.current) return;
    const top = ref.current.getBoundingClientRect().top + window.scrollY - 82;
    window.scrollTo({ top, behavior: 'smooth' });
  };
  const gallery =
    product.gallery && product.gallery.length > 0
      ? product.gallery
      : [product.primary_image, product.secondary_image].filter(Boolean);

  const [fit, setFit] = useState<'Regular Fit' | 'Slim Fit' | 'Contemporary Fit'>('Regular Fit');
  const [size, setSize] = useState<string>(
    product.sizes.find((s) => s.startsWith('40')) || product.sizes[0] || '40 / M'
  );
  const [collar, setCollar] = useState<string>(product.collars[0] || 'Spread');
  const [cuff, setCuff] = useState<string>(product.cuffs[1] || product.cuffs[0] || 'Modern');

  // 6 bespoke tailoring cm adjustments
  const [lengthAdjustmentCm, setLengthAdjustmentCm] = useState<number>(0);
  const [sleeveAdjustmentCm, setSleeveAdjustmentCm] = useState<number>(0);
  const [waistAdjustmentCm, setWaistAdjustmentCm] = useState<number>(0);
  const [chestAdjustmentCm, setChestAdjustmentCm] = useState<number>(0);
  const [bottomHemAdjustmentCm, setBottomHemAdjustmentCm] = useState<number>(0);
  const [shoulderAdjustmentCm, setShoulderAdjustmentCm] = useState<number>(0);
  const [monogram, setMonogram] = useState<string>('');

  const [fitDrawerOpen, setFitDrawerOpen] = useState(false);
  const [collarOpen, setCollarOpen] = useState(true);
  const [cuffOpen, setCuffOpen] = useState(false);
  const [tailoringOpen, setTailoringOpen] = useState(true);
  const [showMoreMeasurements, setShowMoreMeasurements] = useState(true);
  const [activeTailorEditor, setActiveTailorEditor] = useState<TailoringZoneKey | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);

  // PhotoSwipe-style Full-Screen Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxZoomed, setLightboxZoomed] = useState(false);

  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    setLightboxIndex(null);
    setLightboxZoomed(false);
    setFitDrawerOpen(false);
    setSize((prev) =>
      product.sizes.includes(prev)
        ? prev
        : product.sizes.find((s) => s.startsWith('40')) || product.sizes[0] || '40 / M'
    );
  }, [product.id, product.sizes]);

  useEffect(() => {
    if (lightboxIndex === null && !fitDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
        setLightboxZoomed(false);
        setFitDrawerOpen(false);
      } else if (lightboxIndex !== null && e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev === null ? 0 : (prev + 1) % gallery.length));
      } else if (lightboxIndex !== null && e.key === 'ArrowLeft') {
        setLightboxIndex((prev) =>
          prev === null ? 0 : prev === 0 ? gallery.length - 1 : prev - 1
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxIndex, fitDrawerOpen, gallery.length]);

  // Match bespoke base cm and Media Library sketches for currently active fit + size
  const activeSpec = useMemo(() => {
    const exact = tailoringSpecs.find(
      (sp) => sp.fit === fit && sp.size_label.toLowerCase() === size.toLowerCase()
    );
    if (exact) return exact;
    const prefixMatch = tailoringSpecs.find(
      (sp) =>
        sp.fit === fit &&
        sp.size_label.split('/')[0].trim() === size.split('/')[0].trim()
    );
    if (prefixMatch) return prefixMatch;
    const defaults = computeDefaultSizeMeasurements(fit, size);
    return {
      fit,
      size_label: size,
      ...defaults,
      sketch_shirt_length: '',
      sketch_sleeve_length: '',
      sketch_waist: '',
      sketch_chest: '',
      sketch_bottom_hem: '',
      sketch_shoulder: '',
    } satisfies TailoringSizeSpec;
  }, [tailoringSpecs, fit, size]);

  const variantInfo = useMemo(
    () => resolveVariantPriceAndStock(product, region.code, fit, size),
    [product, region.code, fit, size]
  );

  const unitSurcharge =
    tailoringSurcharges[region.code] ?? DEFAULT_TAILORING_SURCHARGE[region.code];

  const tailoringSurcharge = useMemo(
    () =>
      calculateTailoringSurcharge(
        {
          waistAdjustmentCm,
          chestAdjustmentCm,
          bottomHemAdjustmentCm,
          shoulderAdjustmentCm,
        },
        region.code,
        tailoringSurcharges
      ),
    [
      waistAdjustmentCm,
      chestAdjustmentCm,
      bottomHemAdjustmentCm,
      shoulderAdjustmentCm,
      region.code,
      tailoringSurcharges,
    ]
  );

  const finalDisplayPrice = variantInfo.price + tailoringSurcharge;
  const stockState = evaluateStockState(variantInfo.stockQty, product.preorder_allowed);
  const canPurchase = stockState !== 'out_of_stock';

  const tailoringZones: Array<{
    key: TailoringZoneKey;
    label: string;
    baseCm: number;
    adjustmentCm: number;
    setAdjustmentCm: (val: number) => void;
    sketchUrl: string;
    isPaid: boolean;
  }> = [
    {
      key: 'shirt_length',
      label: copy.pdp.shirtLength,
      baseCm: activeSpec.shirt_length_cm,
      adjustmentCm: lengthAdjustmentCm,
      setAdjustmentCm: setLengthAdjustmentCm,
      sketchUrl: activeSpec.sketch_shirt_length,
      isPaid: false,
    },
    {
      key: 'sleeve_length',
      label: copy.pdp.sleeveLength,
      baseCm: activeSpec.sleeve_length_cm,
      adjustmentCm: sleeveAdjustmentCm,
      setAdjustmentCm: setSleeveAdjustmentCm,
      sketchUrl: activeSpec.sketch_sleeve_length,
      isPaid: false,
    },
    {
      key: 'waist',
      label: copy.pdp.waist,
      baseCm: activeSpec.waist_cm,
      adjustmentCm: waistAdjustmentCm,
      setAdjustmentCm: setWaistAdjustmentCm,
      sketchUrl: activeSpec.sketch_waist,
      isPaid: true,
    },
    {
      key: 'chest',
      label: copy.pdp.chest,
      baseCm: activeSpec.chest_cm,
      adjustmentCm: chestAdjustmentCm,
      setAdjustmentCm: setChestAdjustmentCm,
      sketchUrl: activeSpec.sketch_chest,
      isPaid: true,
    },
    {
      key: 'bottom_hem',
      label: copy.pdp.bottomHem,
      baseCm: activeSpec.bottom_hem_cm,
      adjustmentCm: bottomHemAdjustmentCm,
      setAdjustmentCm: setBottomHemAdjustmentCm,
      sketchUrl: activeSpec.sketch_bottom_hem,
      isPaid: true,
    },
    {
      key: 'shoulder',
      label: copy.pdp.shoulder,
      baseCm: activeSpec.shoulder_cm,
      adjustmentCm: shoulderAdjustmentCm,
      setAdjustmentCm: setShoulderAdjustmentCm,
      sketchUrl: activeSpec.sketch_shoulder,
      isPaid: true,
    },
  ];

  const visibleTailoringZones = showMoreMeasurements
    ? tailoringZones
    : tailoringZones.slice(0, 2);

  const handleAdd = () => {
    if (!canPurchase) return;
    onAddToBag(product, {
      fit,
      size,
      collar,
      cuff,
      sleeveAdjustmentCm,
      lengthAdjustmentCm,
      waistAdjustmentCm,
      chestAdjustmentCm,
      bottomHemAdjustmentCm,
      shoulderAdjustmentCm,
      tailoringSurcharge,
      baseMeasurements: {
        shirt_length: activeSpec.shirt_length_cm,
        sleeve_length: activeSpec.sleeve_length_cm,
        waist: activeSpec.waist_cm,
        chest: activeSpec.chest_cm,
        bottom_hem: activeSpec.bottom_hem_cm,
        shoulder: activeSpec.shoulder_cm,
      },
      monogram: monogram.trim() || undefined,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

  return (
    <main className="pt-16 pb-20 max-w-[1660px] mx-auto px-2 sm:px-4">
      {/* Top Scroll Reading Progress Bar */}
      <motion.div
        style={{ scaleX: smoothProgress, transformOrigin: '0% 50%' }}
        className="fixed top-16 left-0 right-0 h-[2px] bg-[#142B4E] z-30 pointer-events-none"
      />

      {/* Compact Shipping & Regional Warehouse Notice Bar */}
      <div className="py-2 border-b border-black/10 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600 mb-3">
        <div className="flex flex-wrap items-center gap-3">
          <span>{copy.pdp.freeShippingBanner}</span>
          <span className="hidden sm:inline text-neutral-300">·</span>
          <span className="hidden sm:inline font-medium text-neutral-700">{region.dhl_eta_days}</span>
        </div>
        <span className="text-[11px] font-mono-tabular text-neutral-500">
          SKU {variantInfo.variantSku} · {product.warehouse_location}
        </span>
      </div>

      {/* Main 2-Column Split: Enlarged Studio Lightbox Grid Left (8 cols) + Configurator Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* Left Enlarged Scroll-Reveal Studio Gallery (8 cols) */}
        <div className="lg:col-span-8 relative">
          <button
            type="button"
            onClick={onBack}
            aria-label={copy.pdp.backToCatalog}
            className="absolute top-3 left-3 z-10 w-8 h-8 bg-white/90 hover:bg-white border border-black/10 flex items-center justify-center text-[#1A1A1A] shadow-sm cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {gallery.map((imgUrl, idx) => (
              <motion.button
                key={`${imgUrl}-${idx}`}
                type="button"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.4, delay: (idx % 2) * 0.06 }}
                onClick={() => {
                  setLightboxIndex(idx);
                  setLightboxZoomed(false);
                }}
                aria-label={`Open lightbox image ${idx + 1} of ${gallery.length} for ${product.title}`}
                className="group relative aspect-[4/4.65] bg-[#E6E6E6] overflow-hidden cursor-zoom-in text-left block"
              >
                <img
                  src={imgUrl}
                  alt={`${product.title} view ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <span className="absolute bottom-2.5 right-2.5 w-7 h-7 bg-white/85 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[#1A1A1A] pointer-events-none">
                  <ZoomIn className="w-3.5 h-3.5" />
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Right Purchase Configurator (4 cols, Sticky on Desktop Scroll) */}
        <div className="lg:col-span-4 lg:sticky lg:top-20 space-y-3.5">
          {/* Universal B2C Retail <-> B2B Corporate Switcher on Every Single Product */}
          {onSwitchToB2B && (
            <div
              role="group"
              aria-label="Order mode switcher"
              className="grid grid-cols-2 p-1 bg-[#F3F4F6] border border-black/10 rounded-lg text-[11px]"
            >
              <button
                type="button"
                className="py-1.5 px-2.5 bg-[#142B4E] text-white font-semibold uppercase tracking-wider rounded-md flex items-center justify-center gap-1.5 cursor-default"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>B2C Retail (1 pc)</span>
              </button>
              <button
                type="button"
                onClick={() => onSwitchToB2B(product)}
                className="py-1.5 px-2.5 text-[#142B4E] hover:bg-white font-semibold uppercase tracking-wider rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>B2B Corporate (MOQ 20)</span>
              </button>
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-base sm:text-lg font-medium uppercase tracking-wide text-[#1A1A1A]">
                {product.title}
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">{product.fabric_spec}</p>
            </div>
            <button
              type="button"
              onClick={() => onToggleWishlist(product.id)}
              aria-label="Toggle wishlist"
              className="p-2 border border-black/10 hover:border-[#142B4E] transition-colors cursor-pointer shrink-0"
            >
              <Heart
                className={`w-4 h-4 ${
                  inWishlist ? 'fill-[#142B4E] text-[#142B4E]' : 'text-neutral-600'
                }`}
              />
            </button>
          </div>

          {/* Smooth Quick-Jump Anchor Bar */}
          <div className="flex flex-wrap gap-1.5 text-[11px] pt-0.5">
            <button
              type="button"
              onClick={() => scrollToSection(fitSectionRef)}
              className="px-2 py-1 bg-[#F5F5F5] hover:bg-[#142B4E] hover:text-white border border-black/10 transition-colors cursor-pointer"
            >
              Fit & Size
            </button>
            <button
              type="button"
              onClick={() => {
                setCollarOpen(true);
                scrollToSection(collarSectionRef);
              }}
              className="px-2 py-1 bg-[#F5F5F5] hover:bg-[#142B4E] hover:text-white border border-black/10 transition-colors cursor-pointer"
            >
              Collar
            </button>
            <button
              type="button"
              onClick={() => {
                setCuffOpen(true);
                scrollToSection(cuffSectionRef);
              }}
              className="px-2 py-1 bg-[#F5F5F5] hover:bg-[#142B4E] hover:text-white border border-black/10 transition-colors cursor-pointer"
            >
              Cuff
            </button>
            <button
              type="button"
              onClick={() => {
                setTailoringOpen(true);
                scrollToSection(tailoringSectionRef);
              }}
              className="px-2 py-1 bg-[#F5F5F5] hover:bg-[#142B4E] hover:text-white border border-black/10 transition-colors cursor-pointer"
            >
              {copy.pdp.tailoringOptional.split(' ')[0]}
            </button>
          </div>

          <div className="flex items-center justify-between border-y border-black/10 py-3">
            <div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl font-mono-tabular font-semibold text-[#142B4E]" data-testid="pdp-live-price">
                  {formatRegionalPrice(finalDisplayPrice, region.code)}
                </span>
                {product.compare_at_price && tailoringSurcharge === 0 && variantInfo.price === product.price && (
                  <span className="text-sm font-mono-tabular line-through text-neutral-400">
                    {formatRegionalPrice(product.compare_at_price, region.code)}
                  </span>
                )}
              </div>
              {tailoringSurcharge > 0 && (
                <div className="text-[11px] font-mono-tabular text-[#5E7461] font-medium mt-0.5">
                  Includes +{formatRegionalPrice(tailoringSurcharge, region.code)} bespoke tailoring
                </div>
              )}
            </div>

            <span
              className={`px-2.5 py-1 text-[11px] uppercase tracking-wider font-medium text-white rounded-sm ${
                stockState === 'out_of_stock' ? 'bg-neutral-600' : 'bg-[#6AA84F]'
              }`}
            >
              {stockState === 'out_of_stock'
                ? copy.pdp.outOfStock
                : stockState === 'preorder'
                ? copy.pdp.preorder
                : `${copy.pdp.available} ${variantInfo.stockQty}`}
            </span>
          </div>

          {/* Expandable Description with "Read more..." */}
          <div className="text-xs leading-relaxed text-neutral-600">
            <p className={descExpanded ? '' : 'line-clamp-3'}>{product.description}</p>
            <button
              type="button"
              onClick={() => setDescExpanded((prev) => !prev)}
              className="mt-1 text-xs font-medium text-[#1A1A1A] hover:underline cursor-pointer"
            >
              {descExpanded ? copy.pdp.showLess : copy.pdp.readMore}
            </button>
            <div className="text-[11px] text-neutral-500 mt-1">{product.delivery_note}</div>
          </div>

          {/* Return Form & Size Guide Pill Buttons */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="text-xs text-neutral-500">Please complete</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenReturnForm}
                className="px-3 py-1.5 bg-[#F5F5F5] hover:bg-neutral-200 border border-black/10 text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{copy.pdp.returnForm}</span>
              </button>
              <button
                type="button"
                onClick={onOpenSizeGuide}
                className="px-3 py-1.5 bg-[#F5F5F5] hover:bg-neutral-200 border border-black/10 text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>{copy.pdp.sizeGuide}</span>
              </button>
            </div>
          </div>

          {/* 4 Bordered Configurator Modules */}
          <div className="space-y-2">
            {/* Module 1: * Fit & Size (Required) -> Opens Right Slide-Over Drawer */}
            <button
              ref={fitSectionRef}
              type="button"
              onClick={() => setFitDrawerOpen(true)}
              aria-label="Open Fit & Size selector"
              className="w-full px-4 py-3 border border-black/15 hover:border-black/40 bg-white flex items-center justify-between text-left transition-colors cursor-pointer"
            >
              <div>
                <span className="text-xs font-medium text-[#1A1A1A]">
                  <span className="text-red-600 mr-1">*</span>
                  {copy.pdp.fitAndSizeRequired.replace('* ', '')}
                </span>
                <div className="text-[11px] text-neutral-500 mt-0.5 font-mono-tabular">
                  {fit.toUpperCase()} · {size}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>

            {/* Module 2: Choose collar (optional) with Blue Radio Dots */}
            <div ref={collarSectionRef} className="border border-black/15 bg-white">
              <button
                type="button"
                onClick={() => setCollarOpen((prev) => !prev)}
                aria-expanded={collarOpen}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#FAFAFA] cursor-pointer"
              >
                <div>
                  <span className="text-xs font-medium text-[#1A1A1A]">{copy.pdp.chooseCollar}</span>
                  <div className="text-[11px] text-neutral-500 mt-0.5">{collar}</div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-neutral-500 transition-transform ${
                    collarOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {collarOpen && (
                <div className="px-3 pb-3 pt-2 grid grid-cols-2 gap-2.5 border-t border-black/10 bg-[#FAFAFA]">
                  {product.collars.map((c) => {
                    const selected = collar === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCollar(c)}
                        className={`relative p-2.5 border text-center flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer bg-white ${
                          selected
                            ? 'border-[#142B4E] ring-1 ring-[#142B4E]'
                            : 'border-black/10 hover:border-black/30'
                        }`}
                      >
                        <span
                          className={`absolute top-2 left-2 w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            selected ? 'border-[#1D63DC]' : 'border-neutral-300'
                          }`}
                        >
                          {selected && <span className="w-2 h-2 rounded-full bg-[#1D63DC]" />}
                        </span>
                        <CollarIllustration name={c} />
                        <div>
                          <div className="text-xs font-medium text-[#1A1A1A]">{c}</div>
                          <div className="text-[10px] text-neutral-500 mt-0.5">
                            {COLLAR_META[c]?.hint || 'Bespoke option'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Module 3: Choose cuff (optional) — Enhanced Visual Cuff Showcase */}
            <div ref={cuffSectionRef} className="border border-black/15 bg-white">
              <button
                type="button"
                onClick={() => setCuffOpen((prev) => !prev)}
                aria-expanded={cuffOpen}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#FAFAFA] cursor-pointer"
              >
                <div>
                  <span className="text-xs font-medium text-[#1A1A1A]">{copy.pdp.chooseCuff}</span>
                  <div className="text-[11px] text-neutral-500 mt-0.5">{cuff}</div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-neutral-500 transition-transform ${
                    cuffOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {cuffOpen && (
                <div className="border-t border-black/10 bg-[#FAFAFA] p-3 space-y-2.5">
                  <div className="text-[11px] text-neutral-500 px-0.5">
                    {copy.pdp.cuffShowcaseCaption}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {product.cuffs.map((cf) => {
                      const selected = cuff === cf;
                      const meta = CUFF_SPECS[cf];
                      return (
                        <button
                          key={cf}
                          type="button"
                          onClick={() => setCuff(cf)}
                          className={`relative p-3 border text-center flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer bg-white ${
                            selected
                              ? 'border-[#142B4E] ring-1 ring-[#142B4E]'
                              : 'border-black/10 hover:border-black/30'
                          }`}
                        >
                          <span
                            className={`absolute top-2 left-2 w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              selected ? 'border-[#1D63DC]' : 'border-neutral-300'
                            }`}
                          >
                            {selected && <span className="w-2 h-2 rounded-full bg-[#1D63DC]" />}
                          </span>
                          <CuffShowcaseIllustration name={cf} selected={selected} />
                          <div>
                            <div className="text-xs font-medium text-[#1A1A1A]">{cf}</div>
                            {meta && (
                              <div className="text-[10px] text-neutral-500 mt-0.5">{meta.subtitle}</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Cuff Craftsmanship Preview Banner */}
                  {CUFF_SPECS[cuff] && (
                    <div className="p-2.5 bg-white border border-black/10 flex items-center gap-3 text-[11px]">
                      <div className="shrink-0">
                        <CuffShowcaseIllustration name={cuff} selected />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[#142B4E]">{cuff} — Atelier Spec</div>
                        <div className="text-neutral-600 leading-snug mt-0.5">
                          {CUFF_SPECS[cuff].detail}
                        </div>
                        <div className="text-[10px] font-mono-tabular text-neutral-500 mt-1">
                          {CUFF_SPECS[cuff].stitchSpec}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Module 4: Tailoring (optional) / Skreddersøm (valgfritt) — Matching Screenshot Control */}
            <div ref={tailoringSectionRef} className="border border-black/15 bg-white">
              <button
                type="button"
                onClick={() => setTailoringOpen((prev) => !prev)}
                aria-expanded={tailoringOpen}
                className="w-full px-4 py-3 bg-[#C8C8C8] hover:bg-[#BFBFBF] text-[#1A1A1A] flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <span className="text-xs font-medium">{copy.pdp.tailoringOptional}</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#1A1A1A] transition-transform ${
                    tailoringOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {tailoringOpen && (
                <div className="bg-white divide-y divide-black/10 text-xs">
                  {/* Live active fit/size context banner */}
                  <div className="px-4 py-2 bg-[#FAFAFA] flex items-center justify-between text-[11px] text-neutral-600">
                    <span>
                      Base pattern: <strong className="text-[#1A1A1A]">{fit} · {size}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFitDrawerOpen(true)}
                      className="text-[#1D63DC] hover:underline font-medium cursor-pointer"
                    >
                      {copy.pdp.chooseFitSizeHint}
                    </button>
                  </div>

                  {visibleTailoringZones.map((zone) => {
                    const isEditing = activeTailorEditor === zone.key;
                    const adjustedCm = Math.round((zone.baseCm + zone.adjustmentCm) * 10) / 10;
                    const isModified = zone.adjustmentCm !== 0;

                    return (
                      <div key={zone.key} className="px-4 py-3 space-y-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <TailoringZoneSketch
                              zone={zone.key}
                              customImageUrl={zone.sketchUrl}
                              sizeLabel={size}
                              cmValue={adjustedCm}
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-[13px] text-[#1A1A1A] leading-tight">
                                {zone.label}
                              </div>
                              <div className="text-[11px] text-neutral-600 mt-0.5 font-mono-tabular">
                                {copy.pdp.chooseFitSizeHint} ·{' '}
                                <span className="font-semibold text-[#1A1A1A]">
                                  {zone.baseCm} cm
                                </span>
                                {isModified && (
                                  <span className="text-[#1D63DC] font-semibold">
                                    {' '}
                                    → {adjustedCm} cm ({zone.adjustmentCm > 0 ? `+${zone.adjustmentCm}` : zone.adjustmentCm} cm)
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-medium text-[#2E7D32] mt-0.5">
                                {zone.isPaid
                                  ? formatRegionalPrice(unitSurcharge, region.code)
                                  : copy.pdp.freeOfCharge}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveTailorEditor(isEditing ? null : zone.key)}
                            aria-label={`${copy.pdp.change} ${zone.label}`}
                            className="text-xs font-medium text-[#1D63DC] hover:underline shrink-0 cursor-pointer"
                          >
                            {isEditing ? 'Done' : copy.pdp.change}
                          </button>
                        </div>

                        {isEditing && (
                          <div className="pl-[60px] pt-1 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <input
                                type="range"
                                min={-6}
                                max={6}
                                step={0.5}
                                value={zone.adjustmentCm}
                                onChange={(e) => zone.setAdjustmentCm(Number(e.target.value))}
                                aria-label={`${zone.label} adjustment cm`}
                                className="flex-1 accent-[#142B4E]"
                              />
                              <button
                                type="button"
                                onClick={() => zone.setAdjustmentCm(0)}
                                className="text-[10px] px-2 py-0.5 border border-black/15 text-neutral-600 hover:text-black cursor-pointer"
                              >
                                Reset
                              </button>
                            </div>
                            <div className="flex justify-between text-[10px] font-mono-tabular text-neutral-500">
                              <span>-6 cm ({Math.round((zone.baseCm - 6) * 10) / 10} cm)</span>
                              <span>0 cm ({zone.baseCm} cm Std)</span>
                              <span>+6 cm ({Math.round((zone.baseCm + 6) * 10) / 10} cm)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Show more / fewer measurements link matching screenshot */}
                  <div className="px-4 py-2.5 text-center bg-white">
                    <button
                      type="button"
                      onClick={() => setShowMoreMeasurements((prev) => !prev)}
                      className="text-xs font-medium text-[#1D63DC] hover:underline cursor-pointer"
                    >
                      {showMoreMeasurements
                        ? copy.pdp.showFewerMeasurements
                        : copy.pdp.showMoreMeasurements}
                    </button>
                  </div>

                  {/* Optional Cuff Monogram */}
                  <div className="px-4 py-3 bg-[#FAFAFA]">
                    <label htmlFor="cuff-monogram" className="block text-[11px] text-neutral-600 mb-1">
                      Optional Cuff Monogram (max 4 initials)
                    </label>
                    <input
                      id="cuff-monogram"
                      type="text"
                      maxLength={4}
                      value={monogram}
                      onChange={(e) => setMonogram(e.target.value.toUpperCase())}
                      placeholder="e.g. M.N."
                      className="w-full px-3 py-1.5 text-xs border border-black/15 bg-white outline-none focus:border-[#142B4E]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Primary Navy CTA */}
          <button
            type="button"
            disabled={!canPurchase}
            onClick={handleAdd}
            className={`w-full py-3.5 px-6 text-xs uppercase tracking-[0.16em] font-medium transition-colors flex items-center justify-center gap-2 ${
              !canPurchase
                ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                : justAdded
                ? 'bg-[#4F8A47] text-white cursor-pointer'
                : 'bg-[#142B4E] hover:bg-[#0f213d] text-white cursor-pointer'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-4 h-4" />
                <span>{copy.pdp.addedFeedback}</span>
              </>
            ) : (
              <span>
                {canPurchase
                  ? `${copy.pdp.addToBag} · ${formatRegionalPrice(finalDisplayPrice, region.code)}`
                  : copy.pdp.outOfStock}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Recommendations Row Using Hover Scrubber Cards */}
      {recommendations.length > 0 && (
        <section className="mt-10 pt-7 border-t border-black/10">
          <h2 className="text-sm font-medium uppercase tracking-[0.1em] text-[#1A1A1A] mb-3.5">
            {copy.pdp.recommendationsTitle}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {recommendations.slice(0, 4).map((rec) => (
              <ProductHoverCard
                key={rec.id}
                product={rec}
                regionCode={region.code}
                preorderLabel={copy.catalog.preorderTag}
                outOfStockLabel={copy.catalog.outOfStockTag}
                inWishlist={wishlistIds.includes(rec.id)}
                onOpenProduct={onOpenProduct}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        </section>
      )}

      {/* Floating Scroll Summary & Add-to-Bag Sticky Dock */}
      {showStickyBar && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-black/15 shadow-lg px-4 sm:px-8 py-2.5">
          <div className="max-w-[1660px] mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={product.primary_image}
                alt={product.title}
                referrerPolicy="no-referrer"
                className="w-10 h-10 object-cover bg-[#E6E6E6] shrink-0"
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide truncate">
                  {product.title}
                </div>
                <div className="text-[11px] font-mono-tabular text-neutral-500">
                  {fit} · {size} · {collar} · {cuff}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {onSwitchToB2B && (
                <button
                  type="button"
                  onClick={() => onSwitchToB2B(product)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E]/5 text-[11px] uppercase tracking-wider font-medium cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>B2B Quote</span>
                </button>
              )}
              <button
                type="button"
                disabled={!canPurchase}
                onClick={handleAdd}
                className="px-5 py-2.5 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-wider font-medium cursor-pointer"
              >
                {canPurchase
                  ? `${copy.pdp.addToBag} · ${formatRegionalPrice(finalDisplayPrice, region.code)}`
                  : copy.pdp.outOfStock}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RIGHT SLIDE-OVER DRAWER: Choose Fit and Size */}
      {fitDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
            onClick={() => setFitDrawerOpen(false)}
          />
          <aside
            role="dialog"
            aria-label={copy.pdp.chooseFitAndSizeTitle}
            className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto"
          >
            <div>
              <div className="px-6 py-5 border-b border-black/10 flex items-center justify-between">
                <h2 className="text-sm font-medium uppercase tracking-[0.1em] text-[#1A1A1A]">
                  {copy.pdp.chooseFitAndSizeTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => setFitDrawerOpen(false)}
                  aria-label="Close fit and size drawer"
                  className="w-8 h-8 rounded-full border border-black/15 flex items-center justify-center text-neutral-600 hover:text-black cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  {FIT_OPTIONS.map((opt) => {
                    const active = fit === opt.value;
                    return (
                      <div
                        key={opt.value}
                        className={`border p-4 transition-colors ${
                          active ? 'border-[#142B4E] bg-[#FAFAFA]' : 'border-black/15 bg-white'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setFit(opt.value as 'Regular Fit' | 'Slim Fit' | 'Contemporary Fit')}
                          className="w-full flex items-start gap-3 text-left cursor-pointer"
                        >
                          <span
                            className={`mt-0.5 w-4 h-4 border flex items-center justify-center shrink-0 ${
                              active
                                ? 'bg-[#142B4E] border-[#142B4E] text-white'
                                : 'border-neutral-400 bg-white'
                            }`}
                          >
                            {active && <Check className="w-3 h-3" />}
                          </span>
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]">
                              {opt.label}
                            </div>
                            <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                              {opt.desc}
                            </p>
                          </div>
                        </button>

                        {active && (
                          <div className="mt-4 pt-3 border-t border-black/10">
                            <div className="text-[11px] uppercase tracking-wider text-neutral-500 mb-2">
                              {copy.pdp.selectSize}
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {product.sizes.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setSize(s)}
                                  className={`py-2 px-1 text-[11px] font-mono-tabular border text-center transition-colors cursor-pointer ${
                                    size === s
                                      ? 'border-[#142B4E] bg-[#142B4E] text-white font-medium'
                                      : 'border-black/15 bg-white text-[#1A1A1A] hover:border-black/40'
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-black/10 bg-[#FAFAFA] flex items-center justify-between gap-3">
              <div className="text-xs text-neutral-600 font-mono-tabular">
                {fit} · {size} · {formatRegionalPrice(variantInfo.price, region.code)}
              </div>
              <button
                type="button"
                onClick={() => setFitDrawerOpen(false)}
                className="px-7 py-3 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-[0.16em] font-medium cursor-pointer"
              >
                {copy.pdp.continueBtn}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* FULL-SCREEN LIGHTBOX MODAL */}
      {lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Product image lightbox ${lightboxIndex + 1} of ${gallery.length}`}
          className="fixed inset-0 z-[70] bg-[#EAEAEA]/95 backdrop-blur-sm flex flex-col justify-between"
        >
          <div className="px-6 py-4 flex items-center justify-between text-xs text-[#1A1A1A]">
            <span className="font-mono-tabular font-medium">
              {lightboxIndex + 1} / {gallery.length} · {product.title}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLightboxZoomed((prev) => !prev)}
                aria-label={lightboxZoomed ? 'Zoom out lightbox image' : 'Zoom in lightbox image'}
                className="p-2 bg-white/80 hover:bg-white border border-black/10 text-[#1A1A1A] cursor-pointer"
              >
                {lightboxZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLightboxIndex(null);
                  setLightboxZoomed(false);
                }}
                aria-label="Close lightbox"
                className="p-2 bg-white/80 hover:bg-white border border-black/10 text-[#1A1A1A] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 relative flex items-center justify-center px-14 py-4 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setLightboxZoomed(false);
                setLightboxIndex((prev) =>
                  prev === null ? 0 : prev === 0 ? gallery.length - 1 : prev - 1
                );
              }}
              aria-label="Previous lightbox photo"
              className="absolute left-4 sm:left-8 w-10 h-10 bg-white/85 hover:bg-white border border-black/10 flex items-center justify-center text-[#1A1A1A] cursor-pointer z-10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="max-h-[76vh] max-w-4xl overflow-auto flex items-center justify-center">
              <img
                src={gallery[lightboxIndex]}
                alt={`${product.title} studio angle ${lightboxIndex + 1}`}
                referrerPolicy="no-referrer"
                onClick={() => setLightboxZoomed((prev) => !prev)}
                className={`max-h-[74vh] w-auto object-contain transition-transform duration-300 cursor-zoom-in ${
                  lightboxZoomed ? 'scale-150 cursor-zoom-out' : 'scale-100'
                }`}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setLightboxZoomed(false);
                setLightboxIndex((prev) => (prev === null ? 0 : (prev + 1) % gallery.length));
              }}
              aria-label="Next lightbox photo"
              className="absolute right-4 sm:right-8 w-10 h-10 bg-white/85 hover:bg-white border border-black/10 flex items-center justify-center text-[#1A1A1A] cursor-pointer z-10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-4 flex items-center justify-center gap-2.5">
            {gallery.map((thumb, idx) => (
              <button
                key={`${thumb}-thumb-${idx}`}
                type="button"
                onClick={() => {
                  setLightboxIndex(idx);
                  setLightboxZoomed(false);
                }}
                aria-label={`View photo ${idx + 1}`}
                className={`w-14 h-14 overflow-hidden border-2 transition-all cursor-pointer ${
                  idx === lightboxIndex ? 'border-[#142B4E] opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={thumb} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
};
