import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Ruler } from 'lucide-react';
import type { HeroSlideRecord, Product, RegionConfig } from '../types.ts';
import type { RegionCopy } from '../i18n/translations.ts';
import { formatRegionalPrice } from '../utils/commerce.ts';

interface HeroAndHomeProps {
  region: RegionConfig;
  copy: RegionCopy;
  heroSlides?: HeroSlideRecord[];
  featuredProducts: Product[];
  onNavigateCatalog: (category?: string) => void;
  onNavigateB2B: () => void;
  onNavigateAbout?: () => void;
  onOpenProduct: (slug: string) => void;
  onOpenSizeGuide: () => void;
}

export const HeroAndHome: React.FC<HeroAndHomeProps> = ({
  region,
  copy,
  heroSlides = [],
  featuredProducts,
  onNavigateCatalog,
  onNavigateB2B,
  onNavigateAbout,
  onOpenProduct,
  onOpenSizeGuide,
}) => {
  const [slideIndex, setSlideIndex] = useState(0);

  const pickLoc = (
    s: HeroSlideRecord,
    prefix: 'title' | 'subtitle' | 'cta'
  ): string => {
    const key = `${prefix}_${region.code}` as keyof HeroSlideRecord;
    return String(s[key] || s[`${prefix}_en` as keyof HeroSlideRecord] || '');
  };

  const slides =
    heroSlides.length > 0
      ? heroSlides.map((s) => ({
          id: s.id,
          image: s.image_url,
          title: pickLoc(s, 'title'),
          subtitle: pickLoc(s, 'subtitle'),
          cta: pickLoc(s, 'cta'),
          showText: s.show_text,
          showButton: s.show_button,
          onClick: () => {
            if (s.target_type === 'view') {
              if (s.target_value === 'b2b') onNavigateB2B();
              else if (s.target_value === 'about' && onNavigateAbout) onNavigateAbout();
              else onNavigateCatalog('all');
            } else {
              onNavigateCatalog(s.target_value || 'all');
            }
          },
        }))
      : [
          {
            id: -1,
            image: '/src/assets/images/hero_oxford_olive_1795248294228.jpg',
            title: copy.hero.slide1Title,
            subtitle: copy.hero.slide1Sub,
            cta: copy.hero.slide1Cta,
            showText: true,
            showButton: true,
            onClick: () => onNavigateCatalog('oxford'),
          },
          {
            id: -2,
            image: '/src/assets/images/hero_linen_coastal_1795248294948.jpg',
            title: copy.hero.slide2Title,
            subtitle: copy.hero.slide2Sub,
            cta: copy.hero.slide2Cta,
            showText: true,
            showButton: true,
            onClick: () => onNavigateCatalog('linen'),
          },
        ];

  const safeIdx = slideIndex >= slides.length ? 0 : slideIndex;
  const activeSlide = slides[safeIdx];

  return (
    <div>
      {/* 1. Taller Full-Bleed Campaign Hero Slider (Backend-editable slides & text/button visibility) */}
      <section className="relative w-full h-[92vh] min-h-[640px] max-h-[960px] overflow-hidden bg-[#8D826E]">
        <img
          src={activeSlide.image}
          alt={activeSlide.title || 'Monte Napoleone 1974 Campaign'}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center transition-opacity duration-500"
        />
        <div
          className={`absolute inset-0 ${
            activeSlide.showText || activeSlide.showButton
              ? 'bg-gradient-to-t from-black/55 via-black/20 to-black/25'
              : 'bg-gradient-to-b from-black/30 via-transparent to-black/20'
          }`}
        />

        {(activeSlide.showText || activeSlide.showButton) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-6 pt-16">
            {activeSlide.showText && (
              <>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-[0.14em] uppercase max-w-4xl">
                  {activeSlide.title}
                </h1>
                {activeSlide.subtitle && (
                  <p className="mt-4 text-sm sm:text-base tracking-[0.16em] uppercase font-light text-white/90 max-w-2xl">
                    {activeSlide.subtitle}
                  </p>
                )}
              </>
            )}
            {activeSlide.showButton && activeSlide.cta && (
              <button
                type="button"
                onClick={activeSlide.onClick}
                className="mt-8 px-7 py-3 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-[0.18em] font-medium transition-colors cursor-pointer"
              >
                {activeSlide.cta}
              </button>
            )}
          </div>
        )}

        {/* Carousel Prev/Next Controls */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setSlideIndex((prev) => (prev <= 0 ? slides.length - 1 : prev - 1))}
              aria-label="Previous hero slide"
              className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white/80 hover:text-white bg-black/20 hover:bg-black/40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setSlideIndex((prev) => (prev + 1) % slides.length)}
              aria-label="Next hero slide"
              className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white/80 hover:text-white bg-black/20 hover:bg-black/40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[11px] tracking-widest uppercase text-white/85">
              {slides.map((sl, idx) => (
                <button
                  key={sl.id}
                  type="button"
                  onClick={() => setSlideIndex(idx)}
                  aria-label={`Select hero slide ${idx + 1}`}
                  className={`h-1.5 transition-all cursor-pointer ${
                    idx === safeIdx ? 'w-8 bg-white' : 'w-3 bg-white/45'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* 2. Three-Column Editorial Showcase (Wider canvas & larger visuals) */}
      <section className="max-w-[1660px] mx-auto px-2 sm:px-4 py-7 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
          {/* Card 1: Casual Linen */}
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{ duration: 0.45 }}
            className="group flex flex-col"
          >
            <button
              type="button"
              onClick={() => onNavigateCatalog('linen')}
              className="relative aspect-[3/4.2] w-full overflow-hidden bg-[#E6E6E6] text-left cursor-pointer"
            >
              <img
                src="/src/assets/images/editorial_casual_linen_1795248294319.jpg"
                alt={copy.home.casualTitle}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
              />
              <div className="absolute inset-x-0 top-0 p-5 bg-gradient-to-b from-black/50 to-transparent">
                <h2 className="text-sm font-medium tracking-[0.12em] uppercase text-white">
                  {copy.home.casualTitle}
                </h2>
              </div>
            </button>
            <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-neutral-600">
              {copy.home.casualDesc}
            </p>
          </motion.article>

          {/* Card 2: Corporate Agreement B2B */}
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{ duration: 0.45, delay: 0.06 }}
            className="group flex flex-col"
          >
            <button
              type="button"
              onClick={onNavigateB2B}
              className="relative aspect-[3/4.2] w-full overflow-hidden bg-[#E6E6E6] text-left cursor-pointer"
            >
              <img
                src="/src/assets/images/editorial_corporate_b2b_1795248294517.jpg"
                alt={copy.home.b2bTitle}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
              />
              <div className="absolute inset-x-0 top-0 p-5 bg-gradient-to-b from-black/50 to-transparent">
                <h2 className="text-sm font-medium tracking-[0.12em] uppercase text-white">
                  {copy.home.b2bTitle}
                </h2>
              </div>
            </button>
            <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-neutral-600">
              {copy.home.b2bDesc}
            </p>
          </motion.article>

          {/* Card 3: Business Shirts */}
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="group flex flex-col"
          >
            <button
              type="button"
              onClick={() => onNavigateCatalog('business')}
              className="relative aspect-[3/4.2] w-full overflow-hidden bg-[#E6E6E6] text-left cursor-pointer"
            >
              <img
                src="/src/assets/images/editorial_business_twoply_1795248294929.jpg"
                alt={copy.home.businessTitle}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
              />
              <div className="absolute inset-x-0 top-0 p-5 bg-gradient-to-b from-black/50 to-transparent">
                <h2 className="text-sm font-medium tracking-[0.12em] uppercase text-white">
                  {copy.home.businessTitle}
                </h2>
              </div>
            </button>
            <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-neutral-600">
              {copy.home.businessDesc}
            </p>
          </motion.article>
        </div>
      </section>

      {/* 3. Featured Regional Collection — Taller Product Images & Tighter Gutters */}
      <section className="max-w-[1660px] mx-auto px-2 sm:px-4 pb-10">
        <div className="flex items-end justify-between border-b border-black/10 pb-2 mb-3">
          <div>
            <h2 className="text-sm sm:text-base font-medium uppercase tracking-[0.12em] text-[#1A1A1A]">
              {copy.nav.allShirts}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {region.name} ({region.currency_code}) · {region.warehouse_name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateCatalog('all')}
            className="text-xs uppercase tracking-wider text-[#142B4E] hover:underline underline-offset-4 font-medium cursor-pointer"
          >
            {copy.hero.slide1Cta} →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
          {featuredProducts.slice(0, 4).map((product, idx) => (
            <motion.button
              key={product.id}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              onClick={() => onOpenProduct(product.slug)}
              className="group text-left flex flex-col cursor-pointer"
            >
              <div className="relative aspect-[3/4.2] w-full bg-[#E6E6E6] overflow-hidden">
                <span className="absolute top-3 left-3 z-10 text-[11px] font-mono-tabular text-neutral-700 bg-white/85 px-2 py-0.5">
                  {product.stock_qty > 0
                    ? product.stock_qty
                    : product.preorder_allowed
                    ? copy.catalog.preorderTag
                    : copy.catalog.outOfStockTag}
                </span>
                <img
                  src={product.primary_image}
                  alt={product.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
              </div>
              <h3 className="mt-1.5 text-xs font-medium uppercase tracking-wide text-[#1A1A1A] group-hover:underline">
                {product.title}
              </h3>
              <div className="mt-0.5 flex items-center gap-2 text-xs font-mono-tabular text-neutral-700">
                <span>{formatRegionalPrice(product.price, region.code)}</span>
                {product.compare_at_price && (
                  <span className="line-through text-neutral-400">
                    {formatRegionalPrice(product.compare_at_price, region.code)}
                  </span>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* 4. Two-Column Guide & Heritage Split */}
      <section className="max-w-[1660px] mx-auto px-2 sm:px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs sm:text-sm uppercase tracking-[0.12em] font-medium text-[#1A1A1A]">
                {copy.home.guideTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={onOpenSizeGuide}
              className="relative aspect-[16/10] w-full overflow-hidden bg-[#E6E6E6] group cursor-pointer block text-left"
            >
              <img
                src="/src/assets/images/editorial_tailoring_guide_1795248294030.jpg"
                alt={copy.home.guideTitle}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
              <span className="absolute bottom-4 left-4 bg-white/95 text-[#1A1A1A] px-3.5 py-2 text-xs uppercase tracking-wider inline-flex items-center gap-2">
                <Ruler className="w-3.5 h-3.5" />
                {copy.home.guideSub}
              </span>
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs sm:text-sm uppercase tracking-[0.12em] font-medium text-[#1A1A1A]">
                {copy.home.inspirationTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => (onNavigateAbout ? onNavigateAbout() : onNavigateCatalog('all'))}
              className="relative aspect-[16/10] w-full overflow-hidden bg-[#E6E6E6] group cursor-pointer block text-left"
            >
              <img
                src="/src/assets/images/hero_linen_coastal_1795248294948.jpg"
                alt={copy.home.inspirationTitle}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
              <span className="absolute bottom-4 left-4 bg-white/95 text-[#1A1A1A] px-3.5 py-2 text-xs uppercase tracking-wider">
                {copy.home.inspirationSub}
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
