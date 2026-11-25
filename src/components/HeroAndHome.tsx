import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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

  const runTarget = (type: 'category' | 'view', value: string) => {
    if (type === 'view') {
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
    <div className="bg-[#F7F5F2]">
      {/* Hero — compact full-bleed composition */}
      <section
        className="relative w-full h-[min(78svh,820px)] min-h-[420px] overflow-hidden bg-[#8D826E]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={activeSlide.id}
            src={activeSlide.image}
            alt={activeSlide.title || 'Monte Napoleone 1974'}
            referrerPolicy="no-referrer"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        </AnimatePresence>
        <div
          className={`absolute inset-0 ${
            activeSlide.showText || activeSlide.showButton
              ? 'bg-gradient-to-t from-black/60 via-black/25 to-black/20'
              : 'bg-gradient-to-b from-black/25 via-transparent to-black/15'
          }`}
        />

        {(activeSlide.showText || activeSlide.showButton) && (
          <div className="absolute inset-0 flex flex-col items-center justify-end sm:justify-center text-center text-white px-6 pb-16 sm:pb-0 pt-20">
            {activeSlide.showText && (
              <motion.div
                key={`copy-${activeSlide.id}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.12 }}
              >
                <p className="text-[10px] sm:text-[11px] tracking-[0.35em] uppercase text-white/75 mb-3">
                  Monte Napoleone 1974
                </p>
                <h1 className="font-serif-brand text-3xl sm:text-5xl md:text-6xl font-light tracking-[0.12em] uppercase max-w-4xl leading-[1.1]">
                  {activeSlide.title}
                </h1>
                {activeSlide.subtitle && (
                  <p className="mt-3 sm:mt-4 text-xs sm:text-sm tracking-[0.14em] uppercase font-light text-white/88 max-w-xl mx-auto">
                    {activeSlide.subtitle}
                  </p>
                )}
              </motion.div>
            )}
            {activeSlide.showButton && activeSlide.cta && (
              <button
                type="button"
                onClick={activeSlide.onClick}
                className="mt-6 sm:mt-8 px-7 py-3 bg-[#142B4E] hover:bg-[#0f213d] text-white text-[11px] uppercase tracking-[0.2em] font-medium transition-colors cursor-pointer"
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
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-white/80 hover:text-white bg-black/25 hover:bg-black/45 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setSlideIndex((prev) => (prev + 1) % slides.length)}
              aria-label="Next hero slide"
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-white/80 hover:text-white bg-black/25 hover:bg-black/45 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {slides.map((sl, idx) => (
                <button
                  key={sl.id}
                  type="button"
                  onClick={() => setSlideIndex(idx)}
                  aria-label={`Select hero slide ${idx + 1}`}
                  className={`h-1 transition-all cursor-pointer ${
                    idx === safeIdx ? 'w-7 bg-white' : 'w-2.5 bg-white/45 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Editorial trio — copy on image to shorten page */}
      {hp.showEditorialCards !== false && (
        <section className="max-w-[1440px] mx-auto px-3 sm:px-6 -mt-6 sm:-mt-8 relative z-10 pb-8 sm:pb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
            {editorialCards.map((card, idx) => (
              <motion.button
                key={card.key}
                type="button"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: idx * 0.06 }}
                onClick={card.onClick}
                className="group relative aspect-[4/5] sm:aspect-[3/3.6] w-full overflow-hidden bg-[#1A1A1A] text-left cursor-pointer shadow-[0_12px_40px_-18px_rgba(20,43,78,0.45)]"
              >
                <img
                  src={card.image}
                  alt={card.title}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 text-white">
                  <h2 className="text-[11px] sm:text-xs font-medium tracking-[0.16em] uppercase">
                    {card.title}
                  </h2>
                  <p className="mt-1.5 text-[11px] sm:text-xs leading-relaxed text-white/80 line-clamp-2">
                    {card.desc}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* Featured shirts */}
      {hp.showFeaturedProducts !== false && (
        <section className="max-w-[1440px] mx-auto px-3 sm:px-6 pb-10 sm:pb-12">
          <div className="flex items-end justify-between gap-4 mb-4 sm:mb-5">
            <h2 className="text-sm sm:text-base font-medium uppercase tracking-[0.14em] text-[#1A1A1A]">
              {featuredTitle}
            </h2>
            <button
              type="button"
              onClick={() => onNavigateCatalog('all')}
              className="text-[11px] uppercase tracking-[0.16em] text-[#142B4E] hover:underline underline-offset-4 font-medium cursor-pointer shrink-0"
            >
              {featuredCta} →
            </button>
          </div>

          {featuredProducts.length === 0 ? (
            <div className="border border-dashed border-[#142B4E]/25 bg-white/60 px-6 py-12 text-center">
              <p className="text-sm text-neutral-600">
                No shirts selected for the home page yet.
              </p>
              <button
                type="button"
                onClick={() => onNavigateCatalog('all')}
                className="mt-4 text-xs uppercase tracking-[0.16em] text-[#142B4E] font-medium cursor-pointer"
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
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.35, delay: idx * 0.04 }}
                  onClick={() => onOpenProduct(product.slug)}
                  className="group text-left flex flex-col cursor-pointer bg-white"
                >
                  <div className="relative aspect-[3/4] w-full bg-[#EDE8E1] overflow-hidden">
                    <img
                      src={product.primary_image}
                      alt={product.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                  </div>
                  <div className="px-2.5 py-2.5">
                    <h3 className="text-[11px] sm:text-xs font-medium uppercase tracking-wide text-[#1A1A1A] group-hover:underline underline-offset-2 line-clamp-2">
                      {product.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-2 text-[11px] sm:text-xs font-mono-tabular text-neutral-700">
                      <span>{formatRegionalPrice(product.price, region.code)}</span>
                      {product.compare_at_price && (
                        <span className="line-through text-neutral-400">
                          {formatRegionalPrice(product.compare_at_price, region.code)}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Guide + inspiration */}
      {hp.showGuideInspiration !== false && (
        <section className="max-w-[1440px] mx-auto px-3 sm:px-6 pb-14 sm:pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onOpenSizeGuide}
              className="relative aspect-[16/9] w-full overflow-hidden bg-[#EDE8E1] group cursor-pointer block text-left"
            >
              <img
                src={hp.guideImage}
                alt={guideTitle}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 text-white">
                <h2 className="text-[11px] sm:text-xs uppercase tracking-[0.16em] font-medium">
                  {guideTitle}
                </h2>
                <span className="mt-2 inline-flex items-center gap-2 bg-white text-[#1A1A1A] px-3 py-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider">
                  <Ruler className="w-3.5 h-3.5" />
                  {guideSub}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => runTarget(hp.inspirationTargetType, hp.inspirationTargetValue)}
              className="relative aspect-[16/9] w-full overflow-hidden bg-[#EDE8E1] group cursor-pointer block text-left"
            >
              <img
                src={hp.inspirationImage}
                alt={inspirationTitle}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 text-white">
                <h2 className="text-[11px] sm:text-xs uppercase tracking-[0.16em] font-medium">
                  {inspirationTitle}
                </h2>
                <span className="mt-2 inline-block bg-white text-[#1A1A1A] px-3 py-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider">
                  {inspirationSub}
                </span>
              </div>
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
