import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
  LogOut,
  Mail,
  PackageSearch,
  Ruler,
  ShoppingBag,
  Sparkles,
  Trash2,
  Truck,
  User,
} from 'lucide-react';
import type {
  AuthUser,
  B2BQuotationItem,
  CategoryRecord,
  CustomerAuthPublicConfig,
  OrderRecord,
  Product,
  RegionConfig,
  TailoringOptionRecord,
} from '../types.ts';
import type { RegionCopy } from '../i18n/translations.ts';
import { GoogleIcon } from './GmailLoginCornerPopup.tsx';
import {
  calculateB2BMoqSummary,
  calculateB2BTierDiscount,
  estimateB2BUnitRate,
  formatRegionalPrice,
  productMatchesCategories,
  resolveOrderedTailoringOptions,
} from '../utils/commerce.ts';
import { ProductHoverCard } from './ProductHoverCard.tsx';

const B2B_SIZES = ['S / 37', 'M / 39', 'L / 41', 'XL / 43', '2XL / 45', '3XL / 48'] as const;

interface B2BViewProps {
  region: RegionConfig;
  copy: RegionCopy;
  categories: CategoryRecord[];
  products: Product[];
  tailoringOptions?: TailoringOptionRecord[];
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
  tailoringOptions = [],
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
  const b2bCatCarouselRef = useRef<HTMLDivElement>(null);

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
  const resolvedCollars = useMemo(
    () =>
      resolveOrderedTailoringOptions(
        'collar',
        activeProduct?.collars || ['Spread', 'Semi Spread', 'Button Down', 'Cutaway'],
        tailoringOptions
      ),
    [activeProduct, tailoringOptions]
  );
  const resolvedCuffs = useMemo(
    () =>
      resolveOrderedTailoringOptions(
        'cuff',
        activeProduct?.cuffs || ['Angle', 'Modern', 'Rounded', 'Single French'],
        tailoringOptions
      ),
    [activeProduct, tailoringOptions]
  );

  const resolvedB2BFits = useMemo(() => {
    const variantFits = Array.from(
      new Set(
        (activeProduct?.variants || [])
          .filter((v) => v.active !== false)
          .map((v) => v.fit.toUpperCase())
          .filter(Boolean)
      )
    );
    return variantFits.length > 0
      ? variantFits
      : ['SLIM FIT', 'REGULAR FIT', 'CONTEMPORARY FIT'];
  }, [activeProduct]);

  const [bodyFit, setBodyFit] = useState<string>('REGULAR FIT');
  const [collarType, setCollarType] = useState(
    () => resolvedCollars.find((c) => c.isDefault)?.name || resolvedCollars[0]?.name || 'Spread'
  );
  const [cuffType, setCuffType] = useState(
    () => resolvedCuffs.find((c) => c.isDefault)?.name || resolvedCuffs[0]?.name || 'Modern'
  );
  const [supplierNotes, setSupplierNotes] = useState('');

  useEffect(() => {
    const defCollar = resolvedCollars.find((c) => c.isDefault)?.name || resolvedCollars[0]?.name;
    const defCuff = resolvedCuffs.find((c) => c.isDefault)?.name || resolvedCuffs[0]?.name;
    if (defCollar) setCollarType(defCollar);
    if (defCuff) setCuffType(defCuff);
    setBodyFit((prev) =>
      resolvedB2BFits.includes(prev) ? prev : resolvedB2BFits[0] || 'REGULAR FIT'
    );
  }, [activeProduct?.id, resolvedCollars, resolvedCuffs, resolvedB2BFits]);

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
      return productMatchesCategories(p, allowedSlugs.size > 0 ? allowedSlugs : null);
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {resolvedB2BFits.map((fitOpt) => {
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
                <div className="border border-black/15 p-4 bg-white space-y-2.5">
                  <div className="text-xs font-semibold uppercase tracking-wider">
                    {copy.b2b.collarType}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {resolvedCollars.map((c) => {
                      const active = collarType === c.name;
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setCollarType(c.name)}
                          className={`group overflow-hidden border text-center flex flex-col bg-white transition-all cursor-pointer ${
                            active
                              ? 'border-[#142B4E] ring-1 ring-[#142B4E] shadow-sm'
                              : 'border-black/10 hover:border-black/30'
                          }`}
                        >
                          <div className="relative w-full h-28 sm:h-32 bg-[#F4F3F1] overflow-hidden border-b border-black/10 flex items-center justify-center p-1">
                            {c.imageUrl ? (
                              <img
                                src={c.imageUrl}
                                alt={c.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-400 text-[10px]">
                                {c.name}
                              </div>
                            )}
                            {active && (
                              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#142B4E] text-white flex items-center justify-center shadow">
                                <Check className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                          <div className="px-2 py-2 text-[11px] font-medium truncate w-full text-[#1A1A1A]">
                            {c.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border border-black/15 p-4 bg-white space-y-2.5">
                  <div className="text-xs font-semibold uppercase tracking-wider">
                    {copy.b2b.cuffType}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {resolvedCuffs.map((cf) => {
                      const active = cuffType === cf.name;
                      return (
                        <button
                          key={cf.name}
                          type="button"
                          onClick={() => setCuffType(cf.name)}
                          className={`group overflow-hidden border text-center flex flex-col bg-white transition-all cursor-pointer ${
                            active
                              ? 'border-[#142B4E] ring-1 ring-[#142B4E] shadow-sm'
                              : 'border-black/10 hover:border-black/30'
                          }`}
                        >
                          <div className="relative w-full h-28 sm:h-32 bg-[#F4F3F1] overflow-hidden border-b border-black/10 flex items-center justify-center p-1">
                            {cf.imageUrl ? (
                              <img
                                src={cf.imageUrl}
                                alt={cf.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-400 text-[10px]">
                                {cf.name}
                              </div>
                            )}
                            {active && (
                              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#142B4E] text-white flex items-center justify-center shadow">
                                <Check className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                          <div className="px-2 py-2 text-[11px] font-medium truncate w-full text-[#1A1A1A]">
                            {cf.name}
                          </div>
                        </button>
                      );
                    })}
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
          {/* Mobile Horizontal Carousel / Desktop Auto-Adjusted Category Bar */}
          <div className="flex flex-col items-center gap-2.5">
            <div
              data-testid="b2b-category-carousel"
              className="w-full max-w-full flex items-center gap-1.5 bg-white border border-black/10 shadow-sm rounded-xl p-1.5 md:px-4"
            >
              <button
                type="button"
                onClick={() => b2bCatCarouselRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
                aria-label="Scroll B2B categories left"
                className="p-1.5 rounded-lg text-neutral-500 hover:text-[#142B4E] hover:bg-neutral-100 shrink-0 cursor-pointer md:hidden"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <nav
                ref={b2bCatCarouselRef}
                aria-label="B2B shirt categories"
                className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth snap-x py-0.5 md:flex-wrap md:justify-center md:overflow-visible"
              >
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`snap-start px-3.5 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
                    className={`snap-start px-3.5 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedCategory === cat.slug || activeB2BParent?.id === cat.id
                        ? 'bg-[#142B4E] text-white font-medium'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {getCategoryName(cat)}
                  </button>
                ))}
              </nav>

              <button
                type="button"
                onClick={() => b2bCatCarouselRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
                aria-label="Scroll B2B categories right"
                className="p-1.5 rounded-lg text-neutral-500 hover:text-[#142B4E] hover:bg-neutral-100 shrink-0 cursor-pointer md:hidden"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

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
  authToken: string | null;
  authUser: AuthUser | null;
  customerAuthConfig: CustomerAuthPublicConfig;
  onAuthChange: (token: string | null, user: AuthUser | null) => void;
  onPromoUnlocked: (code: string) => void;
  onOpenProduct?: (slug: string, reviewToken?: string) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  region,
  copy,
  authToken,
  authUser,
  customerAuthConfig,
  onAuthChange,
  onPromoUnlocked,
  onOpenProduct,
}) => {
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regSubscribeMailchimp, setRegSubscribeMailchimp] = useState<boolean>(
    customerAuthConfig.autoSubscribeMailchimp
  );
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [myOrders, setMyOrders] = useState<
    Array<
      OrderRecord & {
        reviewInvites?: Array<{
          productId: number;
          slug: string;
          title: string;
          token: string;
          alreadyReviewed?: boolean;
        }>;
      }
    >
  >([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [orderNumber, setOrderNumber] = useState('MN-2026-1001');
  const [email, setEmail] = useState('henrik.solberg@nordicexec.no');
  const [foundOrder, setFoundOrder] = useState<OrderRecord | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRegSubscribeMailchimp(customerAuthConfig.autoSubscribeMailchimp);
  }, [customerAuthConfig.autoSubscribeMailchimp]);

  useEffect(() => {
    if (!authToken || !authUser) {
      setMyOrders([]);
      return;
    }
    let cancelled = false;
    setLoadingOrders(true);
    fetch('/api/account/orders', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => (res.ok ? res.json() : { orders: [] }))
      .then((data) => {
        if (!cancelled && Array.isArray(data.orders)) {
          setMyOrders(data.orders);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingOrders(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authToken, authUser]);

  const handleGoogleSignIn = async () => {
    setGoogleSubmitting(true);
    setAuthMessage(null);
    try {
      const subFlag = customerAuthConfig.autoSubscribeMailchimp ? '1' : '0';
      const res = await fetch(
        `/api/auth/google/url?region=${encodeURIComponent(region.code)}&subscribe=${subFlag}`
      );
      const data = await res.json();
      if (!res.ok || !data.url) {
        setAuthMessage({
          type: 'err',
          text:
            data.error ||
            'Google sign-in requires Google OAuth Client ID and Secret in Admin API Vault.',
        });
        return;
      }
      const popup = window.open(
        data.url,
        'mn_google_oauth',
        'width=540,height=660,menubar=no,toolbar=no,location=yes,status=no'
      );
      if (!popup) {
        setAuthMessage({
          type: 'err',
          text: 'Popup blocked by browser. Please allow popups for Gmail sign-in.',
        });
      }
    } catch {
      setAuthMessage({ type: 'err', text: 'Unable to initiate Gmail authentication.' });
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthMessage(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthMessage({ type: 'err', text: data.error || 'Invalid credentials' });
        return;
      }
      onAuthChange(data.token, data.user);
      setAuthMessage({ type: 'ok', text: `Signed in as ${data.user.email}` });
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthMessage(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          phone: regPhone,
          regionCode: region.code,
          subscribeMailchimp: regSubscribeMailchimp,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthMessage({ type: 'err', text: data.error || 'Could not create account' });
        return;
      }
      onAuthChange(data.token, data.user);
      if (data.discountCode) {
        onPromoUnlocked(data.discountCode);
      }
      setAuthMessage({
        type: 'ok',
        text: data.discountCode
          ? `Account created & subscribed to Mailchimp. Code ${data.discountCode} unlocked!`
          : `Welcome to Monte Napoleone 1974, ${data.user.name}.`,
      });
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (authToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {});
    }
    onAuthChange(null, null);
    setAuthMessage(null);
  };

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
      <div className="border-b border-black/10 pb-4">
        <h1 className="text-xl font-medium uppercase tracking-wide">{copy.nav.account}</h1>
        <p className="text-xs text-neutral-500 mt-1">
          Sign in with Gmail or email for faster bespoke checkout, personal orders, and live DHL tracking.
        </p>
      </div>

      {/* Customer Authentication / Signed-In Account Card */}
      {!authUser ? (
        <section
          data-testid="customer-auth-card"
          className="border border-black/15 p-6 bg-white space-y-5 shadow-xs"
        >
          {customerAuthConfig.googleLoginEnabled && (
            <div className="space-y-3">
              <button
                type="button"
                data-testid="account-gmail-signin-btn"
                onClick={handleGoogleSignIn}
                disabled={googleSubmitting}
                className="w-full py-3 px-4 bg-white hover:bg-neutral-50 border border-black/25 text-[#1A1A1A] text-xs uppercase tracking-[0.14em] font-medium flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                <GoogleIcon className="w-4 h-4" />
                <span>{googleSubmitting ? 'Connecting to Google...' : 'Continue with Gmail'}</span>
              </button>
              {customerAuthConfig.autoSubscribeMailchimp && (
                <div className="text-[11px] text-[#142B4E] bg-[#F4F6F9] border border-[#142B4E]/15 px-3 py-2 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Signing in with Gmail automatically joins our Mailchimp client list &amp; applies first-order savings (MONTE10).
                  </span>
                </div>
              )}
              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-black/10" />
                <span className="shrink mx-3 text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                  Or with Email
                </span>
                <div className="flex-grow border-t border-black/10" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-6 border-b border-black/10 text-xs uppercase tracking-wider">
            <button
              type="button"
              onClick={() => {
                setAuthTab('login');
                setAuthMessage(null);
              }}
              className={`pb-2.5 cursor-pointer transition-colors ${
                authTab === 'login'
                  ? 'border-b-2 border-[#142B4E] font-semibold text-[#142B4E]'
                  : 'text-neutral-500 hover:text-[#1A1A1A]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('register');
                setAuthMessage(null);
              }}
              className={`pb-2.5 cursor-pointer transition-colors ${
                authTab === 'register'
                  ? 'border-b-2 border-[#142B4E] font-semibold text-[#142B4E]'
                  : 'text-neutral-500 hover:text-[#1A1A1A]'
              }`}
            >
              Create Account
            </button>
          </div>

          {authMessage && (
            <div
              className={`p-3 text-xs border ${
                authMessage.type === 'err'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              {authMessage.text}
            </div>
          )}

          {authTab === 'login' ? (
            <form onSubmit={handleEmailLogin} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Email address"
                className="px-3 py-2.5 text-xs border border-black/15 outline-none focus:border-[#142B4E]"
              />
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Password"
                className="px-3 py-2.5 text-xs border border-black/15 outline-none focus:border-[#142B4E]"
              />
              <button
                type="submit"
                disabled={authSubmitting}
                className="px-5 py-2.5 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-wider font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{authSubmitting ? 'Signing in...' : 'Sign In'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailRegister} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Full name"
                  className="px-3 py-2.5 text-xs border border-black/15 outline-none focus:border-[#142B4E]"
                />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="Email address (Gmail or personal)"
                  className="px-3 py-2.5 text-xs border border-black/15 outline-none focus:border-[#142B4E]"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Password (min 6 characters)"
                  className="px-3 py-2.5 text-xs border border-black/15 outline-none focus:border-[#142B4E]"
                />
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="Phone (optional, for DHL courier)"
                  className="px-3 py-2.5 text-xs border border-black/15 outline-none focus:border-[#142B4E]"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={regSubscribeMailchimp}
                  onChange={(e) => setRegSubscribeMailchimp(e.target.checked)}
                />
                <span>Join our Mailchimp client list &amp; receive 10% off your first order (MONTE10)</span>
              </label>
              <button
                type="submit"
                disabled={authSubmitting}
                className="px-6 py-2.5 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-wider font-medium cursor-pointer"
              >
                {authSubmitting ? 'Creating account...' : 'Create Customer Account'}
              </button>
            </form>
          )}
        </section>
      ) : (
        <section
          data-testid="signed-in-account-panel"
          className="border border-black/15 p-6 bg-white space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#142B4E] text-white flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-medium text-[#1A1A1A]">{authUser.name}</div>
                <div className="text-xs text-neutral-500">{authUser.email}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 border border-black/15 hover:border-[#142B4E] text-xs uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          {authMessage && authMessage.type === 'ok' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              {authMessage.text}
            </div>
          )}

          <div>
            <h2 className="text-xs uppercase tracking-[0.16em] font-semibold text-[#142B4E] mb-3">
              My Order History
            </h2>
            {loadingOrders ? (
              <div className="text-xs text-neutral-500">Loading your orders...</div>
            ) : myOrders.length === 0 ? (
              <div className="text-xs text-neutral-500 bg-[#FAFAFA] border border-black/10 p-4">
                No previous orders matched <strong>{authUser.email}</strong> yet.
              </div>
            ) : (
              <div className="space-y-3">
                {myOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="border border-black/10 bg-[#FAFAFA] p-4 space-y-2.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-mono-tabular font-semibold text-[#1A1A1A]">
                          {ord.order_number}
                        </div>
                        <div className="text-neutral-500">
                          {ord.shipping_city}, {ord.shipping_country} · {ord.payment_method.toUpperCase()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-white border border-black/10 uppercase text-[11px]">
                          {ord.order_status}
                        </span>
                        <span className="font-mono-tabular font-semibold">
                          {formatRegionalPrice(ord.total, ord.region_code)}
                        </span>
                      </div>
                    </div>
                    {ord.order_status !== 'cancelled' && Array.isArray(ord.reviewInvites) && ord.reviewInvites.length > 0 && (
                      <div className="pt-2 border-t border-black/10 flex flex-wrap items-center gap-2">
                        {ord.reviewInvites.map((inv) =>
                          inv.alreadyReviewed ? (
                            <span
                              key={`${ord.id}-${inv.productId}`}
                              className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px]"
                            >
                              {inv.title}: Reviewed ✓
                            </span>
                          ) : (
                            <button
                              key={`${ord.id}-${inv.productId}`}
                              type="button"
                              onClick={() => onOpenProduct?.(inv.slug, inv.token)}
                              className="px-2.5 py-1 bg-white hover:bg-[#142B4E] hover:text-white border border-[#142B4E]/30 text-[#142B4E] text-[11px] font-medium transition-colors cursor-pointer"
                            >
                              Rate {inv.title} →
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Order Lookup */}
      <section className="border border-black/15 p-6 space-y-5 bg-[#FAFAFA]">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-[#142B4E]">
          <PackageSearch className="w-4 h-4" />
          <span>Track Order &amp; DHL Waybill</span>
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
