import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  FileText,
  Layers,
  PackageSearch,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
} from 'lucide-react';
import type {
  B2BQuotationItem,
  CategoryRecord,
  OrderRecord,
  Product,
  RegionConfig,
} from '../types.ts';
import type { RegionCopy } from '../i18n/translations.ts';
import {
  calculateB2BMoqSummary,
  calculateB2BTierDiscount,
  estimateB2BUnitRate,
  formatRegionalPrice,
} from '../utils/commerce.ts';
import { ProductHoverCard } from './ProductHoverCard.tsx';

const B2B_SIZES = ['S / 37', 'M / 39', 'L / 41', 'XL / 43', '2XL / 45', '3XL / 48'] as const;

interface B2BViewProps {
  region: RegionConfig;
  copy: RegionCopy;
  categories: CategoryRecord[];
  products: Product[];
  wishlistIds: number[];
  initialProductSlug?: string | null;
  onClearInitialProduct?: () => void;
  onSwitchToB2C?: (slug: string) => void;
  onToggleWishlist: (productId: number) => void;
  onOpenSizeGuide: () => void;
  onOpenReturnForm: () => void;
}

export const B2BView: React.FC<B2BViewProps> = ({
  region,
  copy,
  categories,
  products,
  wishlistIds,
  initialProductSlug,
  onClearInitialProduct,
  onSwitchToB2C,
  onToggleWishlist,
  onOpenSizeGuide,
  onOpenReturnForm,
}) => {
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 180, damping: 28, restDelta: 0.001 });
  const [showStickyB2BBar, setShowStickyB2BBar] = useState(false);

  const qtySectionRef = useRef<HTMLDivElement>(null);
  const specSectionRef = useRef<HTMLDivElement>(null);
  const notesSectionRef = useRef<HTMLDivElement>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [showCheckoutSummary, setShowCheckoutSummary] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowStickyB2BBar(window.scrollY > 420);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!initialProductSlug || products.length === 0) return;
    const matched = products.find((p) => p.slug === initialProductSlug);
    if (matched) {
      setActiveProduct(matched);
      setShowCheckoutSummary(false);
    }
    onClearInitialProduct?.();
  }, [initialProductSlug, products, onClearInitialProduct]);

  const scrollToRef = (ref: React.RefObject<HTMLElement | null>) => {
    if (!ref.current) return;
    const top = ref.current.getBoundingClientRect().top + window.scrollY - 82;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  // Configured batches accumulated via "SAVE & ADD NEW COLOUR"
  const [batches, setBatches] = useState<B2BQuotationItem[]>([]);

  // Active Shirt Configurator State
  const [sizeBreakdown, setSizeBreakdown] = useState<Record<string, number>>({
    'S / 37': 2,
    'M / 39': 5,
    'L / 41': 6,
    'XL / 43': 4,
    '2XL / 45': 2,
    '3XL / 48': 1,
  });
  const [bodyFit, setBodyFit] = useState<'SLIM FIT' | 'REGULAR FIT' | 'CONTEMPORARY FIT'>(
    'REGULAR FIT'
  );
  const [collarType, setCollarType] = useState('Spread');
  const [cuffType, setCuffType] = useState('Modern');
  const [supplierNotes, setSupplierNotes] = useState('');

  // Corporate Shipping Details & Order Summary Form
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [embroideryRequested, setEmbroideryRequested] = useState(true);
  const [generalNotes, setGeneralNotes] = useState('');
  const [submittedId, setSubmittedId] = useState<{ id: number; qty: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getCategoryName = (cat: CategoryRecord): string => {
    if (region.code === 'no') return cat.name_no;
    if (region.code === 'it') return cat.name_it;
    if (region.code === 'vn') return cat.name_vn;
    return cat.name_en;
  };

  const b2bVisibleCategories = useMemo(
    () =>
      categories.filter(
        (c) => c.active !== false && c.slug !== 'b2b' && (c.scope === 'b2b' || c.scope === 'both' || !c.scope)
      ),
    [categories]
  );

  const b2bTopCategories = useMemo(
    () => b2bVisibleCategories.filter((c) => !c.parent_id),
    [b2bVisibleCategories]
  );

  const activeB2BCategory = useMemo(
    () => b2bVisibleCategories.find((c) => c.slug === selectedCategory) || null,
    [b2bVisibleCategories, selectedCategory]
  );

  const activeB2BParent = useMemo(() => {
    if (!activeB2BCategory) return null;
    if (!activeB2BCategory.parent_id) return activeB2BCategory;
    return b2bVisibleCategories.find((c) => c.id === activeB2BCategory.parent_id) || activeB2BCategory;
  }, [b2bVisibleCategories, activeB2BCategory]);

  const b2bChildCategories = useMemo(() => {
    if (!activeB2BParent) return [];
    return b2bVisibleCategories.filter((c) => c.parent_id === activeB2BParent.id);
  }, [b2bVisibleCategories, activeB2BParent]);

  const b2bProducts = useMemo(() => {
    const allowedSlugs = new Set<string>();
    if (selectedCategory !== 'all' && selectedCategory !== 'outlet') {
      allowedSlugs.add(selectedCategory);
      if (activeB2BCategory && !activeB2BCategory.parent_id) {
        b2bVisibleCategories.forEach((ch) => {
          if (ch.parent_id === activeB2BCategory.id) allowedSlugs.add(ch.slug);
        });
      }
    }
    return products.filter((p) => {
      if (selectedCategory === 'outlet') return p.is_outlet;
      if (selectedCategory !== 'all' && !allowedSlugs.has(p.category_slug)) return false;
      return true;
    });
  }, [products, selectedCategory, activeB2BCategory, b2bVisibleCategories]);

  const moqSummary = useMemo(() => calculateB2BMoqSummary(sizeBreakdown, 20), [sizeBreakdown]);

  const totalBatchPieces = batches.reduce((sum, b) => sum + b.totalPieces, 0);

  const buildCurrentBatch = (prod: Product): B2BQuotationItem => ({
    id: `${prod.sku}-${Date.now()}`,
    productId: prod.id,
    sku: prod.sku,
    title: prod.title,
    image: prod.primary_image,
    fit: bodyFit,
    collar: collarType,
    cuff: cuffType,
    sizeBreakdown: { ...sizeBreakdown },
    totalPieces: moqSummary.totalPieces,
    notes: supplierNotes.trim(),
  });

  const handleSaveAndAddAnother = () => {
    if (!activeProduct) return;
    setError(null);
    const batch = buildCurrentBatch(activeProduct);
    setBatches((prev) => [...prev, batch]);
    setSupplierNotes('');
    setActiveProduct(null);
  };

  const handleDoneChoosing = () => {
    if (activeProduct && moqSummary.totalPieces > 0) {
      const batch = buildCurrentBatch(activeProduct);
      setBatches((prev) => [...prev, batch]);
      setActiveProduct(null);
    }
    setShowCheckoutSummary(true);
  };

  const handleSubmitQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payloadQty = Math.max(5, totalBatchPieces || 20);
    const res = await fetch('/api/b2b/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName,
        contactName,
        email,
        phone,
        regionCode: region.code,
        estimatedQty: payloadQty,
        embroideryRequested,
        notes:
          generalNotes.trim() ||
          batches.map((b) => `${b.sku} (${b.totalPieces} pcs · ${b.fit})`).join(' | '),
        items: batches,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Could not submit corporate quotation.');
      return;
    }
    setSubmittedId({ id: data.id, qty: data.estimatedQty || payloadQty });
    setBatches([]);
    setShowCheckoutSummary(false);
    setActiveProduct(null);
    setCompanyName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setGeneralNotes('');
  };

  const tierInfo = useMemo(
    () => calculateB2BTierDiscount(moqSummary.totalPieces),
    [moqSummary.totalPieces]
  );

  const estimatedUnitPrice = useMemo(() => {
    if (!activeProduct) return 0;
    return estimateB2BUnitRate(activeProduct.price, moqSummary.totalPieces, region.code);
  }, [activeProduct, moqSummary.totalPieces, region.code]);

  return (
    <main className="pt-20 pb-20 max-w-[1660px] mx-auto px-2 sm:px-4 min-h-[75vh]">
      {/* Smooth Scroll Progress Indicator */}
      <motion.div
        style={{ scaleX: smoothProgress, transformOrigin: '0% 50%' }}
        className="fixed top-16 left-0 right-0 h-[2px] bg-[#142B4E] z-30 pointer-events-none"
      />
      {/* Top Portal Banner */}
      <div className="border-b border-black/10 py-3.5 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            {region.name} · {region.warehouse_name}
          </div>
          <h1 className="text-xl sm:text-2xl font-medium uppercase tracking-[0.12em] text-[#1A1A1A] mt-0.5">
            {copy.b2b.portalTitle}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {batches.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveProduct(null);
                setShowCheckoutSummary(true);
              }}
              className="px-4 py-2 bg-[#142B4E] text-white text-xs uppercase tracking-wider font-medium inline-flex items-center gap-2 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                Quotation Batch: {batches.length} colour(s) · {totalBatchPieces} pcs
              </span>
            </button>
          )}
          {!showCheckoutSummary && !activeProduct && (
            <button
              type="button"
              onClick={() => setShowCheckoutSummary(true)}
              className="px-4 py-2 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E] hover:text-white text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Direct B2B Proposal Form
            </button>
          )}
        </div>
      </div>

      {/* Confirmation State */}
      {submittedId && (
        <div className="max-w-xl mx-auto my-12 border border-black/15 bg-[#FAFAFA] p-10 text-center space-y-4">
          <CheckCircle2 className="w-10 h-10 text-[#4F8A47] mx-auto" />
          <h2 className="text-base font-semibold uppercase tracking-wide">
            Corporate Quotation #{submittedId.id} Submitted
          </h2>
          <p className="text-xs text-neutral-600 leading-relaxed">
            Total quantity requested: <strong className="font-mono-tabular">{submittedId.qty} shirts</strong> for{' '}
            {region.name}. Our B2B Atelier team in Treviso & Oslo will prepare fabric swatches and tiered corporate pricing within 24 hours.
          </p>
          <button
            type="button"
            onClick={() => setSubmittedId(null)}
            className="px-6 py-2.5 bg-[#142B4E] text-white text-xs uppercase tracking-wider cursor-pointer"
          >
            Browse B2B Catalog
          </button>
        </div>
      )}

      {/* VIEW 1: B2B SHIPPING DETAILS & QUOTATION SUMMARY CHECKOUT */}
      {!submittedId && showCheckoutSummary && (
        <div className="max-w-5xl mx-auto space-y-8">
          <button
            type="button"
            onClick={() => setShowCheckoutSummary(false)}
            className="inline-flex items-center gap-1.5 text-xs text-[#142B4E] hover:underline cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to {copy.b2b.portalTitle}</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <form
              onSubmit={handleSubmitQuotation}
              className="lg:col-span-7 border border-black/15 bg-white p-6 sm:p-8 space-y-4"
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-[#142B4E] border-b border-black/10 pb-3">
                <Building2 className="w-4 h-4" />
                <span>Corporate Shipping & Contact Details</span>
              </div>

              <div>
                <label htmlFor="b2b-company" className="block text-xs text-neutral-600 mb-1">
                  Company Name *
                </label>
                <input
                  id="b2b-company"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-black/15 outline-none focus:border-[#142B4E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="b2b-contact" className="block text-xs text-neutral-600 mb-1">
                    Contact Name *
                  </label>
                  <input
                    id="b2b-contact"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-black/15 outline-none focus:border-[#142B4E]"
                  />
                </div>
                <div>
                  <label htmlFor="b2b-email" className="block text-xs text-neutral-600 mb-1">
                    Work Email *
                  </label>
                  <input
                    id="b2b-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-black/15 outline-none focus:border-[#142B4E]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="b2b-phone" className="block text-xs text-neutral-600 mb-1">
                  Phone & Delivery City
                </label>
                <input
                  id="b2b-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+47 ... · Oslo / Milan / HCMC"
                  className="w-full px-3 py-2 text-xs border border-black/15 outline-none focus:border-[#142B4E]"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-neutral-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={embroideryRequested}
                  onChange={(e) => setEmbroideryRequested(e.target.checked)}
                  className="accent-[#142B4E]"
                />
                <span>Include custom corporate logo embroidery (chest or cuff)</span>
              </label>

              <div>
                <label htmlFor="b2b-general-notes" className="block text-xs text-neutral-600 mb-1">
                  Delivery timeline & embroidery brief
                </label>
                <textarea
                  id="b2b-general-notes"
                  rows={3}
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-black/15 outline-none focus:border-[#142B4E]"
                />
              </div>

              {error && <div className="text-xs text-red-600">{error}</div>}

              <button
                type="submit"
                className="w-full py-3.5 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-[0.16em] font-medium cursor-pointer"
              >
                Submit Corporate Quotation Request
              </button>
            </form>

            {/* Right: Configured Shirt Batches Summary */}
            <aside className="lg:col-span-5 border border-black/15 bg-[#FAFAFA] p-6 space-y-4">
              <div className="text-xs uppercase tracking-wider font-semibold text-[#1A1A1A] border-b border-black/10 pb-3 flex justify-between">
                <span>Configured Colours & Sizes</span>
                <span className="font-mono-tabular">{totalBatchPieces} pcs</span>
              </div>

              {batches.length === 0 ? (
                <p className="text-xs text-neutral-500">
                  No individual colour batches pre-configured yet. You can submit general requirements on the left or go back and configure shirt fabrics.
                </p>
              ) : (
                <div className="space-y-3">
                  {batches.map((b) => (
                    <div key={b.id} className="bg-white border border-black/10 p-3 flex gap-3 text-xs">
                      <img
                        src={b.image}
                        alt={b.title}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 object-cover bg-[#E6E6E6] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium uppercase truncate">{b.title}</div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          {b.fit} · {b.collar} · {b.cuff}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-[#142B4E] mt-1">
                          {Object.entries(b.sizeBreakdown)
                            .filter(([, q]) => q > 0)
                            .map(([sz, q]) => `${sz.split('/')[0].trim()}:${q}`)
                            .join(' · ')}
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <span className="font-mono-tabular font-semibold">{b.totalPieces} pcs</span>
                        <button
                          type="button"
                          onClick={() => setBatches((prev) => prev.filter((x) => x.id !== b.id))}
                          aria-label={`Remove ${b.title}`}
                          className="text-neutral-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </div>
      )}

      {/* VIEW 2: B2B PRODUCT QUOTATION CONFIGURATOR WITH SCROLL EFFECTS & B2C SWITCHER */}
      {!submittedId && !showCheckoutSummary && activeProduct && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveProduct(null)}
                className="inline-flex items-center gap-1.5 text-xs text-[#142B4E] hover:underline font-medium cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to B2B Shirt Catalog</span>
              </button>
              {/* Quick Scroll Section Pills */}
              <div className="hidden md:flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => scrollToRef(qtySectionRef)}
                  className="px-2 py-1 bg-[#F5F5F5] hover:bg-[#142B4E] hover:text-white border border-black/10 cursor-pointer"
                >
                  1. Sizes & Qty
                </button>
                <button
                  type="button"
                  onClick={() => scrollToRef(specSectionRef)}
                  className="px-2 py-1 bg-[#F5F5F5] hover:bg-[#142B4E] hover:text-white border border-black/10 cursor-pointer"
                >
                  2. Fit, Collar & Cuff
                </button>
                <button
                  type="button"
                  onClick={() => scrollToRef(notesSectionRef)}
                  className="px-2 py-1 bg-[#F5F5F5] hover:bg-[#142B4E] hover:text-white border border-black/10 cursor-pointer"
                >
                  3. Embroidery & Notes
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onSwitchToB2C && (
                <div
                  role="group"
                  aria-label="Order mode switcher"
                  className="grid grid-cols-2 p-0.5 bg-[#F3F4F6] border border-black/10 rounded-lg text-[11px]"
                >
                  <button
                    type="button"
                    onClick={() => onSwitchToB2C(activeProduct.slug)}
                    className="py-1 px-2.5 text-[#142B4E] hover:bg-white font-semibold uppercase tracking-wider rounded-md inline-flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ShoppingBag className="w-3 h-3" />
                    <span>B2C Retail</span>
                  </button>
                  <button
                    type="button"
                    className="py-1 px-2.5 bg-[#142B4E] text-white font-semibold uppercase tracking-wider rounded-md inline-flex items-center justify-center gap-1 cursor-default"
                  >
                    <Building2 className="w-3 h-3" />
                    <span>B2B (MOQ 20)</span>
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={onOpenReturnForm}
                className="px-3 py-1.5 bg-[#F5F5F5] border border-black/10 text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{copy.pdp.returnForm}</span>
              </button>
              <button
                type="button"
                onClick={onOpenSizeGuide}
                className="px-3 py-1.5 bg-[#F5F5F5] border border-black/10 text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>{copy.pdp.sizeGuide}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-start">
            {/* Left Enlarged Scroll-Reveal Studio Images */}
            <div className="lg:col-span-6 grid grid-cols-2 gap-1.5">
              {(activeProduct.gallery.length > 0
                ? activeProduct.gallery
                : [activeProduct.primary_image, activeProduct.secondary_image]
              ).map((imgUrl, idx) => (
                <motion.div
                  key={`${imgUrl}-${idx}`}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.4, delay: (idx % 2) * 0.06 }}
                  className="aspect-[4/4.65] bg-[#E6E6E6] overflow-hidden"
                >
                  <img
                    src={imgUrl}
                    alt={`${activeProduct.title} ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-300"
                  />
                </motion.div>
              ))}
            </div>

            {/* Right Sticky Configurator: INFORMATION REQUIRED FOR QUOTATION */}
            <div className="lg:col-span-6 lg:sticky lg:top-20 space-y-4">
              <div>
                <h2 className="text-lg font-medium uppercase tracking-wide text-[#1A1A1A]">
                  {activeProduct.title}
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  {activeProduct.sku} · {activeProduct.fabric_spec}
                </p>
              </div>

              <div className="bg-[#F5F5F5] border border-black/10 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]">
                    {copy.b2b.infoRequired}
                  </span>
                  <div className="text-[11px] font-mono-tabular text-[#5E7461] mt-0.5">
                    {tierInfo.tierLabel} ·{' '}
                    {tierInfo.discountPct > 0
                      ? `Est. ${formatRegionalPrice(estimatedUnitPrice, region.code)}/pc (-${tierInfo.discountPct}%)`
                      : `Retail ref ${formatRegionalPrice(activeProduct.price, region.code)}/pc (20+ pcs unlocks -15% to -30%)`}
                  </div>
                </div>
                <span className="text-[11px] font-mono-tabular font-semibold px-2.5 py-0.5 bg-[#142B4E] text-white">
                  {copy.b2b.moqBanner}
                </span>
              </div>

              {/* 2-Column Size Breakdown Matrix (S/37 .. 3XL/48) */}
              <div ref={qtySectionRef} className="border border-black/15 p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {copy.b2b.sizeBreakdown}
                  </span>
                  <span
                    className={`text-xs font-mono-tabular font-semibold ${
                      moqSummary.meetsMoq ? 'text-[#4F8A47]' : 'text-amber-700'
                    }`}
                  >
                    {copy.b2b.totalPieces}: {moqSummary.totalPieces} pcs
                    {!moqSummary.meetsMoq && ` (${moqSummary.remainingForMoq} below 20 MOQ)`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {B2B_SIZES.map((sz) => (
                    <div key={sz} className="flex items-center justify-between border border-black/10 px-3 py-2 bg-[#FAFAFA]">
                      <label htmlFor={`b2b-sz-${sz}`} className="text-xs font-mono-tabular font-medium">
                        {sz}
                      </label>
                      <input
                        id={`b2b-sz-${sz}`}
                        type="number"
                        min={0}
                        max={500}
                        value={sizeBreakdown[sz] ?? 0}
                        onChange={(e) =>
                          setSizeBreakdown((prev) => ({
                            ...prev,
                            [sz]: Math.max(0, Math.floor(Number(e.target.value || 0))),
                          }))
                        }
                        className="w-16 px-2 py-1 text-xs text-right font-mono-tabular border border-black/15 bg-white outline-none focus:border-[#142B4E]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* BODY FIT Selector + Size Guide Links */}
              <div ref={specSectionRef} className="border border-black/15 p-4 space-y-2.5 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {copy.b2b.bodyFit}
                  </span>
                  <button
                    type="button"
                    onClick={onOpenSizeGuide}
                    className="text-[11px] text-[#142B4E] underline cursor-pointer"
                  >
                    {copy.pdp.sizeGuide}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['SLIM FIT', 'REGULAR FIT', 'CONTEMPORARY FIT'] as const).map((fitOpt) => {
                    const selected = bodyFit === fitOpt;
                    return (
                      <button
                        key={fitOpt}
                        type="button"
                        onClick={() => setBodyFit(fitOpt)}
                        className={`py-2.5 px-2 text-[11px] font-medium border text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                          selected
                            ? 'border-[#142B4E] bg-[#142B4E] text-white'
                            : 'border-black/15 bg-white text-[#1A1A1A] hover:border-black/40'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3" />}
                        <span>{fitOpt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Collar Type & Cuff Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-black/15 p-4 bg-white space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider">
                    {copy.b2b.collarType}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {activeProduct.collars.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCollarType(c)}
                        className={`py-2 px-2 text-[11px] border text-left cursor-pointer ${
                          collarType === c
                            ? 'border-[#142B4E] bg-[#142B4E]/5 font-semibold text-[#142B4E]'
                            : 'border-black/10 hover:border-black/30'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-black/15 p-4 bg-white space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider">
                    {copy.b2b.cuffType}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {activeProduct.cuffs.map((cf) => (
                      <button
                        key={cf}
                        type="button"
                        onClick={() => setCuffType(cf)}
                        className={`py-2 px-2 text-[11px] border text-left cursor-pointer ${
                          cuffType === cf
                            ? 'border-[#142B4E] bg-[#142B4E]/5 font-semibold text-[#142B4E]'
                            : 'border-black/10 hover:border-black/30'
                        }`}
                      >
                        {cf}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* NOTES FOR SUPPLIER */}
              <div ref={notesSectionRef} className="border border-black/15 p-4 bg-white space-y-2">
                <label htmlFor="b2b-supplier-notes" className="block text-xs font-semibold uppercase tracking-wider">
                  {copy.b2b.notesForSupplier}
                </label>
                <textarea
                  id="b2b-supplier-notes"
                  rows={2}
                  value={supplierNotes}
                  onChange={(e) => setSupplierNotes(e.target.value)}
                  placeholder="Logo placement, thread color, custom labels or packaging..."
                  className="w-full px-3 py-2 text-xs border border-black/15 outline-none focus:border-[#142B4E]"
                />
              </div>

              {/* SAVE & ADD NEW COLOUR + I'M DONE CHOOSING */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleSaveAndAddAnother}
                  className="py-3.5 px-4 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E]/5 text-xs uppercase tracking-[0.12em] font-semibold cursor-pointer"
                >
                  {copy.b2b.saveAddColour}
                </button>
                <button
                  type="button"
                  onClick={handleDoneChoosing}
                  className="py-3.5 px-4 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-[0.12em] font-semibold cursor-pointer"
                >
                  {copy.b2b.doneChoosing}
                </button>
              </div>
            </div>
          </div>

          {/* Sticky Scroll Batch Dock for B2B Single Product */}
          {showStickyB2BBar && (
            <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-black/15 shadow-lg px-4 sm:px-8 py-2.5">
              <div className="max-w-[1660px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={activeProduct.primary_image}
                    alt={activeProduct.title}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 object-cover bg-[#E6E6E6]"
                  />
                  <div>
                    <div className="font-semibold uppercase truncate">{activeProduct.title}</div>
                    <div className="text-[11px] font-mono-tabular text-neutral-600">
                      {moqSummary.totalPieces} pcs · {tierInfo.tierLabel} · {bodyFit}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveAndAddAnother}
                    className="px-3.5 py-2 border border-[#142B4E] text-[#142B4E] text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    + Save & Add Colour
                  </button>
                  <button
                    type="button"
                    onClick={handleDoneChoosing}
                    className="px-4 py-2 bg-[#142B4E] text-white text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    {copy.b2b.doneChoosing}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: DEFAULT MONTE CONNECTED B2B PRICE-FREE 4-COL CATALOG */}
      {!submittedId && !showCheckoutSummary && !activeProduct && (
        <div className="space-y-6">
          {/* Category Tabs (B2B Scoped + Subcategories) */}
          <div className="flex flex-col items-center gap-2">
            <nav
              aria-label="B2B shirt categories"
              className="inline-flex flex-wrap items-center justify-center bg-white border border-black/10 shadow-sm rounded-xl p-1 gap-1"
            >
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-[#142B4E] text-white font-medium'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                {copy.b2b.allCategoriesTab}
              </button>
              {b2bTopCategories.map((cat) => (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`px-3.5 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCategory === cat.slug || activeB2BParent?.id === cat.id
                      ? 'bg-[#142B4E] text-white font-medium'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {getCategoryName(cat)}
                </button>
              ))}
            </nav>

            {b2bChildCategories.length > 0 && activeB2BParent && (
              <nav
                aria-label="B2B subcategories"
                className="inline-flex flex-wrap items-center justify-center gap-1.5 px-2 py-1 bg-[#F7F7F7] border border-black/10 rounded-lg text-[11px]"
              >
                <button
                  type="button"
                  onClick={() => setSelectedCategory(activeB2BParent.slug)}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    selectedCategory === activeB2BParent.slug
                      ? 'bg-[#142B4E] text-white font-medium'
                      : 'text-neutral-600 hover:bg-white'
                  }`}
                >
                  All {getCategoryName(activeB2BParent)}
                </button>
                {b2bChildCategories.map((sub) => (
                  <button
                    key={sub.slug}
                    type="button"
                    onClick={() => setSelectedCategory(sub.slug)}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      selectedCategory === sub.slug
                        ? 'bg-[#142B4E] text-white font-medium'
                        : 'text-neutral-600 hover:bg-white'
                    }`}
                  >
                    {getCategoryName(sub)}
                  </button>
                ))}
              </nav>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {b2bProducts.map((prod) => (
              <ProductHoverCard
                key={prod.id}
                product={prod}
                regionCode={region.code}
                preorderLabel={copy.catalog.preorderTag}
                outOfStockLabel={copy.catalog.outOfStockTag}
                inWishlist={wishlistIds.includes(prod.id)}
                hidePrice
                onOpenProduct={() => setActiveProduct(prod)}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
};

interface AccountViewProps {
  region: RegionConfig;
  copy: RegionCopy;
  onOpenAdmin: () => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ region, copy, onOpenAdmin }) => {
  const [orderNumber, setOrderNumber] = useState('MN-2026-1001');
  const [email, setEmail] = useState('henrik.solberg@nordicexec.no');
  const [foundOrder, setFoundOrder] = useState<OrderRecord | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLookupError(null);
    try {
      const res = await fetch(
        `/api/orders/lookup?orderNumber=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setFoundOrder(null);
        setLookupError(data.error || 'Order not found');
      } else {
        setFoundOrder(data.order);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="pt-24 pb-20 max-w-4xl mx-auto px-4 sm:px-8 space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4">
        <div>
          <h1 className="text-xl font-medium uppercase tracking-wide">{copy.nav.account}</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Track DHL Express shipments, view bank transfer references, or access Staff/Owner Admin.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAdmin}
          className="px-4 py-2 bg-[#142B4E] text-white text-xs uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Owner / Staff Portal</span>
        </button>
      </div>

      {/* Order Lookup */}
      <section className="border border-black/15 p-6 space-y-5 bg-[#FAFAFA]">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-[#142B4E]">
          <PackageSearch className="w-4 h-4" />
          <span>Track Order & DHL Waybill</span>
        </div>

        <form onSubmit={handleLookup} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="Order Number (e.g. MN-2026-1001)"
            className="px-3 py-2 text-xs border border-black/15 bg-white font-mono-tabular outline-none focus:border-[#142B4E]"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Customer Email"
            className="px-3 py-2 text-xs border border-black/15 bg-white outline-none focus:border-[#142B4E]"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-[#142B4E] text-white text-xs uppercase tracking-wider font-medium cursor-pointer"
          >
            {loading ? 'Searching...' : 'Track Order'}
          </button>
        </form>

        {lookupError && <div className="text-xs text-red-600">{lookupError}</div>}

        {foundOrder && (
          <div className="bg-white border border-black/10 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-3">
              <div>
                <div className="text-sm font-mono-tabular font-semibold">{foundOrder.order_number}</div>
                <div className="text-xs text-neutral-500">
                  {foundOrder.customer_name} · {foundOrder.shipping_city}, {foundOrder.shipping_country}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 bg-[#F7F7F7] border border-black/10 uppercase">
                  Order: {foundOrder.order_status}
                </span>
                <span className="px-2.5 py-1 bg-[#F7F7F7] border border-black/10 uppercase">
                  Payment: {foundOrder.payment_status.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="inline-flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#D40511]" />
                <span>
                  DHL Status: <strong className="uppercase">{foundOrder.dhl_status.replace('_', ' ')}</strong>
                  {foundOrder.dhl_tracking_number
                    ? ` · Tracking ${foundOrder.dhl_tracking_number}`
                    : ' · Waybill pending'}
                </span>
              </div>
              <div className="font-mono-tabular font-semibold">
                {formatRegionalPrice(foundOrder.total, foundOrder.region_code)}
              </div>
            </div>

            {foundOrder.payment_method === 'bank_transfer' && (
              <div className="text-xs bg-[#F7F7F7] p-3 font-mono-tabular text-neutral-700">
                Reference / KID: <strong>{foundOrder.payment_reference}</strong> · Bank: {region.bank_name}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
};
