import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Ruler } from 'lucide-react';
import type { HeroSlideRecord, HomePageSettings, Product, RegionCode, RegionConfig } from '../types.ts';
import type { RegionCopy } from '../i18n/translations.ts';
import { DEFAULT_HOME_PAGE_SETTINGS, formatRegionalPrice } from '../utils/commerce.ts';

interface HeroAndHomeProps {
  region: RegionConfig;
  copy: RegionCopy;
  heroSlides?: HeroSlideRecord[];
  homePage?: HomePageSettings;
  featuredProducts: Product[];
  onNavigateCatalog: (category?: string) => void;
  onNavigateB2B: () => void;
  onNavigateAbout?: () => void;
  onNavigateArticle?: (slug: string) => void;
  onOpenProduct: (slug: string) => void;
  onOpenSizeGuide: () => void;
}

function pickHome(settings: HomePageSettings, base: string, region: RegionCode): string {
  const key = `${base}_${region}` as keyof HomePageSettings;
  const enKey = `${base}_en` as keyof HomePageSettings;
  return String(settings[key] || settings[enKey] || '');
}

export const HeroAndHome: React.FC<HeroAndHomeProps> = ({
  region,
  copy,
  heroSlides = [],
  homePage = DEFAULT_HOME_PAGE_SETTINGS,
  featuredProducts,
  onNavigateCatalog,
  onNavigateB2B,
  onNavigateAbout,
  onNavigateArticle,
  onOpenProduct,
  onOpenSizeGuide,
}) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const hp = { ...DEFAULT_HOME_PAGE_SETTINGS, ...homePage };

  const pickLoc = (s: HeroSlideRecord, prefix: 'title' | 'subtitle' | 'cta'): string => {
    const key = `${prefix}_${region.code}` as keyof HeroSlideRecord;
    return String(s[key] || s[`${prefix}_en` as keyof HeroSlideRecord] || '');
  };

  const openArticleFromTarget = (value: string) => {
    if (!onNavigateArticle) return false;
    const raw = String(value || '').trim().toLowerCase();
    if (raw.startsWith('article/')) {
      onNavigateArticle(raw.slice('article/'.length) || 'fabric-guide');
      return true;
    }
    if (
      raw === 'fabric-guide' ||
      raw === 'sustainable-fashion' ||
      raw === 'oversikt-over-skjortestoffer'
    ) {
      onNavigateArticle(raw);
      return true;
    }
    return false;
  };

  const runTarget = (type: 'category' | 'view', value: string) => {
    if (type === 'view') {
      if (openArticleFromTarget(value)) return;
      if (value === 'b2b') onNavigateB2B();
      else if (value === 'about' && onNavigateAbout) onNavigateAbout();
      else onNavigateCatalog('all');
    } else {
      onNavigateCatalog(value || 'all');
    }
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

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);

  useEffect(() => {
    if (slideIndex >= slides.length) setSlideIndex(0);
  }, [slides.length, slideIndex]);

  const featuredTitle = pickHome(hp, 'featuredTitle', region.code) || copy.nav.allShirts;
  const featuredCta = pickHome(hp, 'featuredCta', region.code) || copy.hero.slide1Cta;
  const casualTitle = pickHome(hp, 'casualTitle', region.code) || copy.home.casualTitle;
  const casualDesc = pickHome(hp, 'casualDesc', region.code) || copy.home.casualDesc;
  const b2bTitle = pickHome(hp, 'b2bTitle', region.code) || copy.home.b2bTitle;
  const b2bDesc = pickHome(hp, 'b2bDesc', region.code) || copy.home.b2bDesc;
  const businessTitle = pickHome(hp, 'businessTitle', region.code) || copy.home.businessTitle;
  const businessDesc = pickHome(hp, 'businessDesc', region.code) || copy.home.businessDesc;
  const guideTitle = pickHome(hp, 'guideTitle', region.code) || copy.home.guideTitle;
  const guideSub = pickHome(hp, 'guideSub', region.code) || copy.home.guideSub;
  const inspirationTitle = pickHome(hp, 'inspirationTitle', region.code) || copy.home.inspirationTitle;
  const inspirationSub = pickHome(hp, 'inspirationSub', region.code) || copy.home.inspirationSub;

  const editorialCards = [
    {
      key: 'casual',
      title: casualTitle,
      desc: casualDesc,
      image: hp.casualImage,
      onClick: () => runTarget(hp.casualTargetType, hp.casualTargetValue),
    },
    {
      key: 'b2b',
      title: b2bTitle,
      desc: b2bDesc,
      image: hp.b2bImage,
      onClick: () => runTarget(hp.b2bTargetType, hp.b2bTargetValue),
    },
    {
      key: 'business',
      title: businessTitle,
      desc: businessDesc,
      image: hp.businessImage,
      onClick: () => runTarget(hp.businessTargetType, hp.businessTargetValue),
    },
  ];

  return (
    <div className="bg-white">
      {/* Full-bleed hero */}
      <section
        className="relative w-full h-[100svh] min-h-[100vh] overflow-hidden bg-[#8D826E]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {slides.map((slide, idx) => (
          <img
            key={slide.id}
            src={slide.image}
            alt={slide.title || 'Monte Napoleone 1974'}
            referrerPolicy="no-referrer"
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${
              idx === safeIdx ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
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
                <h1 className="font-serif-brand text-4xl sm:text-5xl md:text-6xl font-light tracking-[0.14em] uppercase max-w-4xl">
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

            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3">
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

      {/* Editorial cards — stable grid, no overlap */}
      {hp.showEditorialCards !== false && (
        <section className="max-w-[1660px] mx-auto px-3 sm:px-6 py-8 sm:py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {editorialCards.map((card, idx) => (
              <motion.article
                key={card.key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="group flex flex-col"
              >
                <button
                  type="button"
                  onClick={card.onClick}
                  className="relative aspect-[3/4] w-full overflow-hidden bg-[#E6E6E6] text-left cursor-pointer"
                >
                  <img
                    src={card.image}
                    alt={card.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                  <div className="absolute inset-x-0 top-0 p-4 sm:p-5 bg-gradient-to-b from-black/55 to-transparent">
                    <h2 className="text-xs sm:text-sm font-medium tracking-[0.12em] uppercase text-white">
                      {card.title}
                    </h2>
                  </div>
                </button>
                <p className="mt-2.5 text-xs sm:text-[13px] leading-relaxed text-neutral-600 line-clamp-3">
                  {card.desc}
                </p>
              </motion.article>
            ))}
          </div>
        </section>
      )}

      {/* Featured shirts */}
      {hp.showFeaturedProducts !== false && (
        <section className="max-w-[1660px] mx-auto px-3 sm:px-6 pb-10 sm:pb-12">
          <div className="flex items-end justify-between border-b border-black/10 pb-2.5 mb-4">
            <h2 className="text-sm sm:text-base font-medium uppercase tracking-[0.12em] text-[#1A1A1A]">
              {featuredTitle}
            </h2>
            <button
              type="button"
              onClick={() => onNavigateCatalog('all')}
              className="text-xs uppercase tracking-wider text-[#142B4E] hover:underline underline-offset-4 font-medium cursor-pointer"
            >
              {featuredCta} →
            </button>
          </div>

          {featuredProducts.length === 0 ? (
            <div className="border border-dashed border-black/15 px-6 py-10 text-center">
              <p className="text-sm text-neutral-600">No shirts selected for the home page yet.</p>
              <button
                type="button"
                onClick={() => onNavigateCatalog('all')}
                className="mt-3 text-xs uppercase tracking-wider text-[#142B4E] font-medium cursor-pointer"
              >
                {featuredCta} →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {featuredProducts.map((product, idx) => (
                <motion.button
                  key={product.id}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.12 }}
                  transition={{ duration: 0.35, delay: idx * 0.04 }}
                  onClick={() => onOpenProduct(product.slug)}
                  className="group text-left flex flex-col cursor-pointer"
                >
                  <div className="relative aspect-[3/4] w-full bg-[#E6E6E6] overflow-hidden">
                    <img
                      src={product.primary_image}
                      alt={product.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  </div>
                  <h3 className="mt-2 text-xs font-medium uppercase tracking-wide text-[#1A1A1A] group-hover:underline line-clamp-2">
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
          )}
        </section>
      )}

      {/* Guide + inspiration */}
      {hp.showGuideInspiration !== false && (
        <section className="max-w-[1660px] mx-auto px-3 sm:px-6 pb-12 sm:pb-14">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <h2 className="text-xs sm:text-sm uppercase tracking-[0.12em] font-medium text-[#1A1A1A] mb-2">
                {guideTitle}
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (onNavigateArticle) onNavigateArticle('fabric-guide');
                  else onOpenSizeGuide();
                }}
                className="relative aspect-[16/10] w-full overflow-hidden bg-[#E6E6E6] group cursor-pointer block text-left"
              >
                <img
                  src={hp.guideImage}
                  alt={guideTitle}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                />
                <span className="absolute bottom-4 left-4 bg-white/95 text-[#1A1A1A] px-3.5 py-2 text-xs uppercase tracking-wider inline-flex items-center gap-2">
                  <Ruler className="w-3.5 h-3.5" />
                  {guideSub}
                </span>
              </button>
            </div>

            <div>
              <h2 className="text-xs sm:text-sm uppercase tracking-[0.12em] font-medium text-[#1A1A1A] mb-2">
                {inspirationTitle}
              </h2>
              <button
                type="button"
                onClick={() => runTarget(hp.inspirationTargetType, hp.inspirationTargetValue)}
                className="relative aspect-[16/10] w-full overflow-hidden bg-[#E6E6E6] group cursor-pointer block text-left"
              >
                <img
                  src={hp.inspirationImage}
                  alt={inspirationTitle}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                />
                <span className="absolute bottom-4 left-4 bg-white/95 text-[#1A1A1A] px-3.5 py-2 text-xs uppercase tracking-wider">
                  {inspirationSub}
                </span>
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
