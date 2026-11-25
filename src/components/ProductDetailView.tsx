import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import {
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Heart,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Star,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type {
  BespokeTailoring,
  Product,
  ProductReviewsResponse,
  RegionCode,
  RegionConfig,
  TailoringOptionRecord,
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
  resolveOrderedTailoringOptions,
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
  tailoringOptions?: TailoringOptionRecord[];
  tailoringSurcharges: Record<RegionCode, number>;
  authToken?: string | null;
  reviewToken?: string | null;
  inWishlist: boolean;
  wishlistIds: number[];
  onBack: () => void;
  onOpenProduct: (slug: string) => void;
  onToggleWishlist: (productId: number) => void;
  onAddToBag: (product: Product, tailoring: BespokeTailoring) => void;
  onSwitchToB2B?: (product: Product) => void;
  onOpenSizeGuide: () => void;
  onOpenReturnForm: () => void;
  onProductReviewSubmitted?: () => void;
}

const COLLAR_META: Record<string, { hint: string }> = {
  Spread: { hint: 'For Business Shirt' },
  'Semi Spread': { hint: 'For Business Shirt' },
  'Button Down': { hint: 'For Casual Shirt' },
  Cutaway: { hint: 'For Casual & Formal' },
};

const DEFAULT_FIT_OPTIONS: Array<{
  value: string;
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
      <svg viewBox="0 0 64 42" className="w-20 h-14 text-[#1A1A1A]" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M16 8 L32 16 L48 8 L58 22 L38 28 L32 18 L26 28 L6 22 Z" />
        <line x1="32" y1="16" x2="32" y2="38" />
      </svg>
    );
  }
  if (name === 'Button Down') {
    return (
      <svg viewBox="0 0 64 42" className="w-20 h-14 text-[#1A1A1A]" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M18 6 L32 15 L46 6 L52 28 L38 30 L32 18 L26 30 L12 28 Z" />
        <circle cx="22" cy="24" r="1.5" fill="currentColor" />
        <circle cx="42" cy="24" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 42" className="w-20 h-14 text-[#1A1A1A]" fill="none" stroke="currentColor" strokeWidth="1.4">
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
  tailoringOptions = [],
  tailoringSurcharges,
  authToken,
  reviewToken,
  inWishlist,
  wishlistIds,
  onBack,
  onOpenProduct,
  onToggleWishlist,
  onAddToBag,
  onSwitchToB2B,
  onOpenSizeGuide,
  onOpenReturnForm,
  onProductReviewSubmitted,
}) => {
  const [showStickyBar, setShowStickyBar] = useState(false);
  const desktopSectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: sectionProgress } = useScroll({
    target: desktopSectionRef,
    offset: ['start start', 'end end'],
  });
  const yColLeft = useTransform(sectionProgress, [0, 1], [0, -18]);
  const yColRight = useTransform(sectionProgress, [0, 1], [14, -14]);

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

  const orderedCollars = useMemo(
    () => resolveOrderedTailoringOptions('collar', product.collars, tailoringOptions),
    [product.collars, tailoringOptions]
  );
  const orderedCuffs = useMemo(
    () => resolveOrderedTailoringOptions('cuff', product.cuffs, tailoringOptions),
    [product.cuffs, tailoringOptions]
  );

  const resolvedFitOptions = useMemo(() => {
    const descByFit: Record<string, { label: string; desc: string }> = Object.fromEntries(
      DEFAULT_FIT_OPTIONS.map((o) => [o.value.toLowerCase(), { label: o.label, desc: o.desc }])
    );
    const activeVariants = (product.variants || []).filter((v) => v.active !== false);
    const variantFits = Array.from(new Set(activeVariants.map((v) => v.fit).filter(Boolean)));
    const fitNames = variantFits.length > 0 ? variantFits : DEFAULT_FIT_OPTIONS.map((o) => o.value);
    return fitNames.map((f) => {
      const known = descByFit[f.toLowerCase()];
      return {
        value: f,
        label: known?.label || f.toUpperCase(),
        desc: known?.desc || `Bespoke ${f} silhouette crafted to exact Italian shirtmaking proportions.`,
      };
    });
  }, [product.variants]);

  const [fit, setFit] = useState<string>(() => resolvedFitOptions[0]?.value || 'Regular Fit');

  const sizesForActiveFit = useMemo(() => {
    const variantSizes = (product.variants || [])
      .filter((v) => v.active !== false && v.fit.toLowerCase() === fit.toLowerCase())
      .map((v) => v.size_label)
      .filter(Boolean);
    if (variantSizes.length > 0) return Array.from(new Set(variantSizes));
    if (product.sizes && product.sizes.length > 0) return product.sizes;
    return ['38 / S', '40 / M', '42 / L', '44 / XL'];
  }, [product.variants, product.sizes, fit]);

  const [size, setSize] = useState<string>(
    () =>
      sizesForActiveFit.find((s) => s.startsWith('40')) || sizesForActiveFit[0] || '40 / M'
  );
  const [collar, setCollar] = useState<string>(
    () => orderedCollars.find((c) => c.isDefault)?.name || orderedCollars[0]?.name || 'Spread'
  );
  const [cuff, setCuff] = useState<string>(
    () => orderedCuffs.find((c) => c.isDefault)?.name || orderedCuffs[0]?.name || 'Modern'
  );

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

  // Verified Purchaser-Only Product Reviews State
  const [reviewsData, setReviewsData] = useState<ProductReviewsResponse>({
    reviews: [],
    reviewCount: product.review_count || 0,
    averageRating: product.average_rating || 0,
    viewer: { canReview: false, alreadyReviewed: false, reason: 'purchase_required' },
  });
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [fitFeedback, setFitFeedback] = useState<'runs_small' | 'true_to_size' | 'runs_large'>('true_to_size');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);

  // PhotoSwipe-style Full-Screen Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxZoomed, setLightboxZoomed] = useState(false);

  // Mobile-only horizontal image slider state
  const [mobileSlide, setMobileSlide] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    setLightboxIndex(null);
    setLightboxZoomed(false);
    setFitDrawerOpen(false);
    setMobileSlide(0);
    setFit((prev) =>
      resolvedFitOptions.some((o) => o.value === prev)
        ? prev
        : resolvedFitOptions[0]?.value || 'Regular Fit'
    );
    const defaultCollar = orderedCollars.find((c) => c.isDefault)?.name || orderedCollars[0]?.name;
    const defaultCuff = orderedCuffs.find((c) => c.isDefault)?.name || orderedCuffs[0]?.name;
    if (defaultCollar) setCollar(defaultCollar);
    if (defaultCuff) setCuff(defaultCuff);
  }, [product.id, resolvedFitOptions, orderedCollars, orderedCuffs]);

  useEffect(() => {
    setSize((prev) =>
      sizesForActiveFit.includes(prev)
        ? prev
        : sizesForActiveFit.find((s) => s.startsWith('40')) || sizesForActiveFit[0] || '40 / M'
    );
  }, [sizesForActiveFit]);

  useEffect(() => {
    let cancelled = false;
    const headers: Record<string, string> = {};
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const qs = reviewToken ? `?reviewToken=${encodeURIComponent(reviewToken)}` : '';
    fetch(`/api/products/${encodeURIComponent(product.slug)}/reviews${qs}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ProductReviewsResponse | null) => {
        if (!cancelled && data && Array.isArray(data.reviews)) {
          setReviewsData(data);
          if (data.viewer?.canReview || reviewToken) {
            setReviewsModalOpen(true);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [product.slug, authToken, reviewToken]);

  useEffect(() => {
    if (!reviewsModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setReviewsModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [reviewsModalOpen]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewsData.viewer.canReview || reviewSubmitting) return;
    setReviewSubmitting(true);
    setReviewMessage(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const res = await fetch(`/api/products/${encodeURIComponent(product.slug)}/reviews`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          rating: ratingInput,
          title: reviewTitle,
          comment: reviewComment,
          fitFeedback,
          regionCode: region.code,
          reviewToken: reviewToken || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewMessage({ type: 'err', text: data.error || 'Could not publish verified review.' });
        return;
      }
      setReviewsData(data);
      setReviewTitle('');
      setReviewComment('');
      setReviewMessage({ type: 'ok', text: 'Thank you! Your verified review has been published.' });
      onProductReviewSubmitted?.();
    } catch {
      setReviewMessage({ type: 'err', text: 'Network error submitting review.' });
    } finally {
      setReviewSubmitting(false);
    }
  };

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
    <main className="pt-16 pb-36 lg:pb-32 max-w-[1920px] mx-auto px-0 md:pr-6 lg:pr-10">
      {/* Compact Shipping & Regional Warehouse Notice Bar */}
      <div className="px-4 md:px-6 py-1.5 md:py-2 border-b border-black/10 flex items-center justify-between gap-2 text-[11px] md:text-xs text-neutral-600 mb-2 md:mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="truncate">{copy.pdp.freeShippingBanner}</span>
          <span className="hidden sm:inline text-neutral-300">·</span>
          <span className="hidden sm:inline font-medium text-neutral-700">{region.dhl_eta_days}</span>
        </div>
          <span className="hidden sm:inline text-[11px] font-mono-tabular text-neutral-500 shrink-0">
          {copy.pdp.skuLabel} {variantInfo.variantSku} · {product.warehouse_location}
        </span>
      </div>

      {/* Main 2-Column Split: Sticky Parallax Studio 4-Image Grid Left (desktop) + Scrollable Configurator Right */}
      <div
        ref={desktopSectionRef}
        className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 md:gap-6 lg:gap-8 items-start"
      >
        {/* Left Sticky Parallax Studio Gallery (7 cols on desktop, flush left) */}
        <div
          data-testid="sticky-pdp-gallery-col"
          className="lg:col-span-7 relative md:pl-0 lg:sticky lg:top-20"
        >
          <button
            type="button"
            onClick={onBack}
            aria-label={copy.pdp.backToCatalog}
            className="absolute top-3 left-3 z-10 w-8 h-8 bg-white/90 hover:bg-white border border-black/10 flex items-center justify-center text-[#1A1A1A] shadow-sm cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* MOBILE ONLY (< md): Compact Swipeable Image Slider */}
          <div className="md:hidden px-3" data-testid="mobile-pdp-slider">
            <div
              className="relative aspect-[4/3] bg-[#E6E6E6] overflow-hidden"
              onTouchStart={(e) => {
                touchStartX.current = e.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(e) => {
                if (touchStartX.current === null) return;
                const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
                const diff = touchStartX.current - endX;
                if (Math.abs(diff) > 40 && gallery.length > 1) {
                  setMobileSlide((prev) =>
                    diff > 0
                      ? (prev + 1) % gallery.length
                      : prev === 0
                      ? gallery.length - 1
                      : prev - 1
                  );
                }
                touchStartX.current = null;
              }}
            >
              <img
                src={gallery[mobileSlide] || product.primary_image}
                alt={`${product.title} slide ${mobileSlide + 1}`}
                referrerPolicy="no-referrer"
                onClick={() => {
                  setLightboxIndex(mobileSlide);
                  setLightboxZoomed(false);
                }}
                className="w-full h-full object-cover cursor-zoom-in"
              />

              <span className="absolute top-3 right-3 px-2 py-0.5 bg-white/90 border border-black/10 text-[11px] font-mono-tabular text-[#1A1A1A]">
                {mobileSlide + 1} / {gallery.length}
              </span>

              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setMobileSlide((prev) => (prev === 0 ? gallery.length - 1 : prev - 1))
                    }
                    aria-label="Previous product image"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-black/10 flex items-center justify-center text-[#1A1A1A] shadow cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileSlide((prev) => (prev + 1) % gallery.length)}
                    aria-label="Next product image"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-black/10 flex items-center justify-center text-[#1A1A1A] shadow cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-center gap-1.5">
                  {gallery.map((_, idx) => (
                    <button
                      key={`dot-${idx}`}
                      type="button"
                      onClick={() => setMobileSlide(idx)}
                      aria-label={`Select image ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        idx === mobileSlide ? 'w-5 bg-[#142B4E]' : 'w-1.5 bg-neutral-300'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {gallery.map((thumb, idx) => (
                    <button
                      key={`mobile-thumb-${idx}`}
                      type="button"
                      onClick={() => setMobileSlide(idx)}
                      className={`w-10 h-11 shrink-0 overflow-hidden border-2 bg-[#E6E6E6] cursor-pointer ${
                        idx === mobileSlide ? 'border-[#142B4E]' : 'border-transparent opacity-70'
                      }`}
                    >
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* DESKTOP: taller portrait tiles so shirts are not cropped oddly */}
          <div
            data-testid="desktop-pdp-gallery"
            className="hidden md:grid md:grid-cols-2 gap-3"
          >
            <motion.div style={{ y: yColLeft }} className="space-y-3">
              {gallery
                .map((imgUrl, idx) => ({ imgUrl, idx }))
                .filter((_, pos) => pos % 2 === 0)
                .map(({ imgUrl, idx }) => (
                  <button
                    key={`${imgUrl}-${idx}`}
                    type="button"
                    onClick={() => {
                      setLightboxIndex(idx);
                      setLightboxZoomed(false);
                    }}
                    aria-label={`Open lightbox image ${idx + 1} of ${gallery.length} for ${product.title}`}
                    className="group relative aspect-[3/4] min-h-[280px] lg:min-h-[340px] bg-[#E8E6E2] overflow-hidden cursor-zoom-in text-left block w-full"
                  >
                    <img
                      src={imgUrl}
                      alt={`${product.title} view ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain object-center transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                    <span className="absolute bottom-2.5 right-2.5 w-7 h-7 bg-white/85 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[#1A1A1A] pointer-events-none">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </span>
                  </button>
                ))}
            </motion.div>

            <motion.div style={{ y: yColRight }} className="space-y-3">
              {gallery
                .map((imgUrl, idx) => ({ imgUrl, idx }))
                .filter((_, pos) => pos % 2 === 1)
                .map(({ imgUrl, idx }) => (
                  <button
                    key={`${imgUrl}-${idx}`}
                    type="button"
                    onClick={() => {
                      setLightboxIndex(idx);
                      setLightboxZoomed(false);
                    }}
                    aria-label={`Open lightbox image ${idx + 1} of ${gallery.length} for ${product.title}`}
                    className="group relative aspect-[3/4] min-h-[280px] lg:min-h-[340px] bg-[#E8E6E2] overflow-hidden cursor-zoom-in text-left block w-full"
                  >
                    <img
                      src={imgUrl}
                      alt={`${product.title} view ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain object-center transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                    <span className="absolute bottom-2.5 right-2.5 w-7 h-7 bg-white/85 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[#1A1A1A] pointer-events-none">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </span>
                  </button>
                ))}
            </motion.div>
          </div>
        </div>

        {/* Right Purchase Configurator (5 cols, scrolls naturally while left gallery stays sticky) */}
        <div className="lg:col-span-5 px-4 md:px-0 space-y-3.5">
          {/* Universal B2C Retail <-> B2B Corporate Switcher on Every Single Product */}
          {onSwitchToB2B && (
            <div
              role="group"
              aria-label={copy.pdp.orderModeSwitcherAria}
              className="grid grid-cols-2 p-1 bg-[#F3F4F6] border border-black/10 rounded-lg text-[11px]"
            >
              <button
                type="button"
                className="py-1.5 px-2.5 bg-[#142B4E] text-white font-semibold uppercase tracking-wider rounded-md flex items-center justify-center gap-1.5 cursor-default"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{copy.pdp.b2cRetailOnePc}</span>
              </button>
              <button
                type="button"
                onClick={() => onSwitchToB2B(product)}
                className="py-1.5 px-2.5 text-[#142B4E] hover:bg-white font-semibold uppercase tracking-wider rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{copy.pdp.b2bCorporateMoq20}</span>
              </button>
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-base sm:text-lg font-medium uppercase tracking-wide text-[#1A1A1A]">
                {product.title}
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">{product.fabric_spec}</p>
              <button
                type="button"
                onClick={() => setReviewsModalOpen(true)}
                data-testid="pdp-reviews-trigger"
                className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-[#142B4E] hover:text-[#0f213d] cursor-pointer group"
                aria-label="Open customer reviews"
              >
                <span className="inline-flex items-center gap-0.5 text-amber-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        reviewsData.reviewCount > 0 && s <= Math.round(reviewsData.averageRating)
                          ? 'fill-amber-400 text-amber-500'
                          : 'text-neutral-300'
                      }`}
                    />
                  ))}
                </span>
                {reviewsData.reviewCount > 0 ? (
                  <>
                    <span className="font-mono-tabular font-semibold">
                      {reviewsData.averageRating.toFixed(1)}
                    </span>
                    <span className="text-neutral-500 group-hover:underline">
                      ({reviewsData.reviewCount} {copy.pdp.verifiedLabel}{' '}
                      {reviewsData.reviewCount === 1
                        ? copy.pdp.reviewSingular
                        : copy.pdp.reviewPlural})
                    </span>
                  </>
                ) : (
                  <span className="text-neutral-500 group-hover:underline">
                    {copy.pdp.customerReviews}
                  </span>
                )}
              </button>
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
          <div className="hidden md:flex flex-wrap gap-1.5 text-[11px] pt-0.5">
            <button
              type="button"
              onClick={() => scrollToSection(fitSectionRef)}
              className="px-2 py-1 bg-[#F5F5F5] hover:bg-[#142B4E] hover:text-white border border-black/10 transition-colors cursor-pointer"
            >
              {copy.pdp.quickJumpFitSize}
            </button>
            <button
              type="button"
              onClick={() => {
                setCollarOpen(true);
                scrollToSection(collarSectionRef);
              }}
              className="px-2 py-1 bg-[#F5F5F5] hover:bg-[#142B4E] hover:text-white border border-black/10 transition-colors cursor-pointer"
            >
              {copy.pdp.quickJumpCollar}
            </button>
            <button
              type="button"
              onClick={() => {
                setCuffOpen(true);
                scrollToSection(cuffSectionRef);
              }}
              className="px-2 py-1 bg-[#F5F5F5] hover:bg-[#142B4E] hover:text-white border border-black/10 transition-colors cursor-pointer"
            >
              {copy.pdp.quickJumpCuff}
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

          <div className="flex items-center justify-between border-y border-black/10 py-2.5 md:py-3">
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
            <span className="text-xs text-neutral-500">{copy.pdp.pleaseComplete}</span>
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
                <div
                  data-testid="pdp-collar-grid"
                  className="p-3 grid grid-cols-2 gap-3 border-t border-black/10 bg-[#FAFAFA]"
                >
                  {orderedCollars.map((c) => {
                    const selected = collar === c.name;
                    const hint = c.subtitle || COLLAR_META[c.name]?.hint || 'Bespoke option';
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setCollar(c.name)}
                        className={`group overflow-hidden border text-center flex flex-col transition-all cursor-pointer bg-white ${
                          selected
                            ? 'border-[#142B4E] ring-1 ring-[#142B4E] shadow-sm'
                            : 'border-black/10 hover:border-black/35'
                        }`}
                      >
                        <div className="relative w-full h-32 sm:h-36 bg-[#F4F3F1] border-b border-black/10 overflow-hidden flex items-center justify-center p-1">
                          {c.imageUrl ? (
                            <img
                              src={c.imageUrl}
                              alt={c.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-300"
                            />
                          ) : (
                            <CollarIllustration name={c.name} />
                          )}
                          <span
                            className={`absolute top-2 left-2 w-4 h-4 rounded-full bg-white/95 border shadow-sm flex items-center justify-center ${
                              selected ? 'border-[#1D63DC]' : 'border-neutral-300'
                            }`}
                          >
                            {selected && <span className="w-2 h-2 rounded-full bg-[#1D63DC]" />}
                          </span>
                          {c.isDefault && (
                            <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#142B4E] text-white text-[9px] uppercase tracking-wider font-semibold shadow-sm">
                              {copy.pdp.defaultBadge}
                            </span>
                          )}
                        </div>
                        <div className="px-2.5 py-2.5 w-full bg-white">
                          <div className="text-xs font-medium text-[#1A1A1A] truncate">{c.name}</div>
                          <div className="text-[10px] text-neutral-500 mt-0.5 truncate">{hint}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Module 3: Choose cuff (optional) — Backend-Editable Visual Cuff Showcase */}
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
                <div className="border-t border-black/10 bg-[#FAFAFA] p-3 space-y-3">
                  <div className="text-[11px] text-neutral-500 px-0.5">
                    {copy.pdp.cuffShowcaseCaption}
                  </div>
                  <div data-testid="pdp-cuff-grid" className="grid grid-cols-2 gap-3">
                    {orderedCuffs.map((cf) => {
                      const selected = cuff === cf.name;
                      const subtitle = cf.subtitle || CUFF_SPECS[cf.name]?.subtitle;
                      return (
                        <button
                          key={cf.name}
                          type="button"
                          onClick={() => setCuff(cf.name)}
                          className={`group overflow-hidden border text-center flex flex-col transition-all cursor-pointer bg-white ${
                            selected
                              ? 'border-[#142B4E] ring-1 ring-[#142B4E] shadow-sm'
                              : 'border-black/10 hover:border-black/35'
                          }`}
                        >
                          <div className="relative w-full h-32 sm:h-36 bg-[#F4F3F1] border-b border-black/10 overflow-hidden flex items-center justify-center p-1">
                            {cf.imageUrl ? (
                              <img
                                src={cf.imageUrl}
                                alt={cf.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-300"
                              />
                            ) : (
                              <CuffShowcaseIllustration name={cf.name} selected={selected} />
                            )}
                            <span
                              className={`absolute top-2 left-2 w-4 h-4 rounded-full bg-white/95 border shadow-sm flex items-center justify-center ${
                                selected ? 'border-[#1D63DC]' : 'border-neutral-300'
                              }`}
                            >
                              {selected && <span className="w-2 h-2 rounded-full bg-[#1D63DC]" />}
                            </span>
                            {cf.isDefault && (
                              <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#142B4E] text-white text-[9px] uppercase tracking-wider font-semibold shadow-sm">
                                {copy.pdp.defaultBadge}
                              </span>
                            )}
                          </div>
                          <div className="px-2.5 py-2.5 w-full bg-white">
                            <div className="text-xs font-medium text-[#1A1A1A] truncate">{cf.name}</div>
                            {subtitle && (
                              <div className="text-[10px] text-neutral-500 mt-0.5 truncate">{subtitle}</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Cuff Craftsmanship Preview Banner */}
                  {(() => {
                    const activeOpt = orderedCuffs.find((x) => x.name === cuff);
                    const specFallback = CUFF_SPECS[cuff];
                    const detailText = activeOpt?.detail || specFallback?.detail;
                    const stitchText = activeOpt?.stitchSpec || specFallback?.stitchSpec;
                    if (!detailText && !stitchText) return null;
                    return (
                      <div className="p-2.5 bg-white border border-black/10 flex items-center gap-3 text-[11px]">
                        <div className="shrink-0 w-16 h-16 bg-[#F4F3F1] border border-black/10 overflow-hidden flex items-center justify-center p-0.5">
                          {activeOpt?.imageUrl ? (
                            <img
                              src={activeOpt.imageUrl}
                              alt={cuff}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <CuffShowcaseIllustration name={cuff} selected />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[#142B4E]">
                            {cuff} — {copy.pdp.atelierSpec}
                          </div>
                          {detailText && (
                            <div className="text-neutral-600 leading-snug mt-0.5">{detailText}</div>
                          )}
                          {stitchText && (
                            <div className="text-[10px] font-mono-tabular text-neutral-500 mt-1">
                              {stitchText}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
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
                      {copy.pdp.basePattern}{' '}
                      <strong className="text-[#1A1A1A]">{fit} · {size}</strong>
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
                            {isEditing ? copy.pdp.tailoringDone : copy.pdp.change}
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
                                {copy.pdp.tailoringReset}
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
                      {copy.pdp.cuffMonogramLabel}
                    </label>
                    <input
                      id="cuff-monogram"
                      type="text"
                      maxLength={4}
                      value={monogram}
                      onChange={(e) => setMonogram(e.target.value.toUpperCase())}
                      placeholder={copy.pdp.cuffMonogramPlaceholder}
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

      {/* Verified reviews live in a modal — stars under the title open it */}
      {reviewsModalOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdp-reviews-modal-title"
          data-testid="pdp-reviews-modal"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0B1526]/55 backdrop-blur-[3px]"
            onClick={() => setReviewsModalOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] overflow-hidden bg-[#FBFBF9] sm:border border-black/10 shadow-2xl flex flex-col"
          >
            <div className="relative shrink-0 px-5 sm:px-7 pt-6 pb-5 border-b border-black/8 bg-gradient-to-br from-[#142B4E] via-[#1a3a66] to-[#0f213d] text-white overflow-hidden">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.12]"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 18% 20%, #fff 0.6px, transparent 0.7px), radial-gradient(circle at 82% 70%, #fff 0.6px, transparent 0.7px)',
                  backgroundSize: '18px 18px',
                }}
              />
              <button
                type="button"
                onClick={() => setReviewsModalOpen(false)}
                aria-label="Close reviews"
                className="absolute top-3 right-3 p-2 text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="relative flex items-start gap-4">
                <img
                  src={product.primary_image}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 object-cover bg-white/10 border border-white/15 shrink-0"
                />
                <div className="min-w-0 pt-0.5">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/65 mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {copy.pdp.verifiedReviewsTitle}
                  </div>
                  <h2
                    id="pdp-reviews-modal-title"
                    className="text-base sm:text-lg font-medium uppercase tracking-wide truncate"
                  >
                    {product.title}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-0.5 text-amber-300">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            reviewsData.reviewCount > 0 && s <= Math.round(reviewsData.averageRating)
                              ? 'fill-amber-300 text-amber-300'
                              : 'text-white/30'
                          }`}
                        />
                      ))}
                    </span>
                    {reviewsData.reviewCount > 0 ? (
                      <span className="text-xs font-mono-tabular text-white/90">
                        {reviewsData.averageRating.toFixed(1)} / 5.0 · {reviewsData.reviewCount}{' '}
                        {reviewsData.reviewCount === 1
                          ? copy.pdp.reviewSingular
                          : copy.pdp.reviewPlural}
                      </span>
                    ) : (
                      <span className="text-xs text-white/70">{copy.pdp.noRatingsYet}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-5">
              {reviewMessage && (
                <div
                  className={`p-3 text-xs border ${
                    reviewMessage.type === 'ok'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {reviewMessage.text}
                </div>
              )}

              {reviewsData.viewer.canReview ? (
                <form
                  onSubmit={handleSubmitReview}
                  data-testid="verified-review-form"
                  className="border border-[#142B4E]/20 bg-white p-4 sm:p-5 space-y-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/8 pb-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#142B4E]">
                      Rate Your Purchased Shirt
                    </div>
                    <span className="text-[11px] font-mono-tabular text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5">
                      Verified Order {reviewsData.viewer.orderNumber || ''}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <div className="text-[11px] text-neutral-600 mb-1">Star Rating *</div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatingInput(star)}
                            aria-label={`Rate ${star} stars`}
                            className="p-1 cursor-pointer"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= ratingInput
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-neutral-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-neutral-600 mb-1">How does this fit?</div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        {(
                          [
                            ['runs_small', 'Runs Small'],
                            ['true_to_size', 'True to Size'],
                            ['runs_large', 'Runs Large'],
                          ] as const
                        ).map(([val, lbl]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setFitFeedback(val)}
                            className={`px-2.5 py-1 border cursor-pointer ${
                              fitFeedback === val
                                ? 'bg-[#142B4E] text-white border-[#142B4E]'
                                : 'bg-white text-neutral-700 border-black/15'
                            }`}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    placeholder="Headline (e.g. Effortless drape and breathable linen)"
                    maxLength={140}
                    className="w-full px-3 py-2 text-xs border border-black/15 bg-white outline-none focus:border-[#142B4E]"
                  />

                  <textarea
                    required
                    minLength={5}
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your experience with fabric feel, collar structure, and sleeve fit..."
                    className="w-full px-3 py-2 text-xs border border-black/15 bg-white outline-none focus:border-[#142B4E]"
                  />

                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="px-6 py-2.5 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-wider font-medium cursor-pointer disabled:opacity-60"
                  >
                    {reviewSubmitting ? 'Publishing Review...' : 'Submit Verified Review'}
                  </button>
                </form>
              ) : (
                <div className="px-4 py-3 bg-white border border-black/8 text-[11px] text-neutral-600">
                  {reviewsData.viewer.alreadyReviewed
                    ? 'Thank you — you have already submitted your verified review for this shirt (limit one review per customer per product).'
                    : 'Every rating is linked to a confirmed order. Verified buyers can review via the post-purchase email link or signed-in order history.'}
                </div>
              )}

              {reviewsData.reviews.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#142B4E]/8 text-[#142B4E] mb-3">
                    <Star className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-[#1A1A1A] font-medium">No customer reviews yet</p>
                  <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                    Be among the first verified purchasers to share fit and fabric notes for this shirt.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviewsData.reviews.map((rev, idx) => (
                    <motion.article
                      key={rev.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.04, 0.24) }}
                      className="border border-black/8 bg-white p-4 space-y-2 shadow-[0_1px_0_rgba(0,0,0,0.03)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= rev.rating ? 'fill-amber-400 text-amber-500' : 'text-neutral-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-mono-tabular px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Verified Buyer
                        </span>
                      </div>
                      {rev.title && (
                        <h3 className="text-xs font-semibold text-[#1A1A1A]">{rev.title}</h3>
                      )}
                      <p className="text-xs text-neutral-600 leading-relaxed">{rev.comment}</p>
                      <div className="pt-1 flex items-center justify-between text-[11px] text-neutral-400">
                        <span>{rev.customer_name}</span>
                        <span>
                          {rev.fit_feedback === 'runs_small'
                            ? 'Fit: Runs Small'
                            : rev.fit_feedback === 'runs_large'
                              ? 'Fit: Runs Large'
                              : 'Fit: True to Size'}
                          {' · '}
                          {rev.created_at.slice(0, 10)}
                        </span>
                      </div>
                    </motion.article>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Recommendations Row Using Hover Scrubber Cards */}
      {recommendations.length > 0 && (
        <section className="mt-10 pt-7 border-t border-black/10 px-4 md:px-6">
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
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-black/15 shadow-lg px-4 sm:px-8 py-2 md:py-2.5">
          <div className="max-w-[1660px] mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={product.primary_image}
                alt={product.title}
                referrerPolicy="no-referrer"
                className="hidden sm:block w-10 h-10 object-cover bg-[#E6E6E6] shrink-0"
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
                  <span>{copy.pdp.b2bQuoteCta}</span>
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
                  {resolvedFitOptions.map((opt) => {
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
                          onClick={() => setFit(opt.value)}
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
                              {sizesForActiveFit.map((s) => (
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
