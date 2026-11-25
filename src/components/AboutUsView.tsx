import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Award, CheckCircle2, Compass, Globe2, MapPin, Play, Scissors, Sparkles } from 'lucide-react';
import type { RegionConfig } from '../types.ts';
import type { RegionCopy } from '../i18n/translations.ts';

interface AboutUsViewProps {
  region: RegionConfig;
  copy: RegionCopy;
  onNavigateCatalog: () => void;
  onNavigateB2B: () => void;
}

const ATELIER_MEDIA = {
  atelierImg1: 'https://montenapoleone1974.com/wp-content/uploads/2026/08/5553.jpeg',
  atelierImg2: 'https://montenapoleone1974.com/wp-content/uploads/2026/08/34534534.jpeg',
  heritageImg: 'https://montenapoleone1974.com/wp-content/uploads/2025/08/IMG_4560_4-5.jpg',
  atelierVideo: 'https://www.montenapoleone1974.com/wp-content/uploads/2025/02/original-EEC388E6-6C6E-4852-A3D4-B4AC3427BEF0.mp4',
};

export const AboutUsView: React.FC<AboutUsViewProps> = ({
  region,
  copy,
  onNavigateCatalog,
  onNavigateB2B,
}) => {
  const about = copy.aboutPage;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.defaultMuted = true;
    el.play().catch(() => {});
  }, []);

  return (
    <main className="pt-20 pb-24 bg-white text-[#1A1A1A]">
      {/* Section 1: About Us / WHY WE EXIST Editorial Opening */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-8 pb-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center border-b border-black/10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="lg:col-span-6 space-y-5"
        >
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#142B4E] font-semibold">
            {about.eyebrow}
          </div>
          <h1 className="font-serif-brand text-3xl sm:text-5xl font-medium tracking-wide leading-[1.1] text-[#1A1A1A]">
            {about.title}
          </h1>
          <p className="text-base sm:text-lg text-[#142B4E] font-medium leading-relaxed">
            {about.lead}
          </p>
          <div className="space-y-3.5 text-sm text-neutral-700 leading-relaxed">
            {about.paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>
          <blockquote className="border-l-2 border-[#142B4E] pl-4 py-1 italic text-sm sm:text-base text-[#1A1A1A]">
            {about.pullQuote}
          </blockquote>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={onNavigateCatalog}
              className="px-6 py-3 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-[0.16em] font-medium cursor-pointer transition-colors"
            >
              {about.ctaCatalog}
            </button>
            <button
              type="button"
              onClick={onNavigateB2B}
              className="px-6 py-3 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E] hover:text-white text-xs uppercase tracking-[0.16em] font-medium transition-colors cursor-pointer"
            >
              {about.ctaB2B}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="lg:col-span-6 grid grid-cols-2 gap-3"
        >
          <div className="aspect-[4/5] sm:aspect-[3/4] bg-[#EFEFEF] overflow-hidden border border-black/5">
            <img
              src={ATELIER_MEDIA.atelierImg1}
              alt="Monte Napoleone 1974 Italian Shirting Craftsmanship"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="aspect-[4/5] sm:aspect-[3/4] bg-[#EFEFEF] overflow-hidden mt-4 sm:mt-7 border border-black/5">
            <img
              src={ATELIER_MEDIA.atelierImg2}
              alt="Monte Napoleone 1974 Tailoring & Collar Precision"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top"
            />
          </div>
        </motion.div>
      </section>

      {/* Section 2: Atelier Video & Photography Gallery from montenapoleone1974.com/om-oss/ */}
      <section className="bg-[#142B4E] text-white py-14">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-4">
            <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.18em] text-white/90 font-semibold">
              <Play className="w-4 h-4" />
              <span>Atelier Film & Craftsmanship</span>
            </div>
            <p className="text-xs text-white/75">{about.videoCaption}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-7 relative bg-[#0B192E] border border-white/15 rounded-md overflow-hidden shadow-2xl aspect-video lg:aspect-auto lg:min-h-[480px]">
              <video
                ref={videoRef}
                data-testid="about-atelier-video"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                poster={ATELIER_MEDIA.atelierImg1}
                className="w-full h-full object-cover object-center pointer-events-none select-none"
              >
                <source src={ATELIER_MEDIA.atelierVideo} type="video/mp4" />
              </video>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0B192E]/75 via-[#0B192E]/20 to-transparent flex items-end justify-between px-4 pb-3 text-[11px] uppercase tracking-[0.16em] text-white/90">
                <span>Treviso Atelier Film · Ambient Silent Reel</span>
                <span className="font-mono-tabular text-white/75">Est. 1974</span>
              </div>
            </div>
            <div className="lg:col-span-5 grid grid-cols-2 lg:grid-cols-1 gap-4">
              <div className="relative overflow-hidden border border-white/15 aspect-[4/3] lg:aspect-auto lg:min-h-[230px] bg-[#0B192E]">
                <img
                  src={ATELIER_MEDIA.heritageImg}
                  alt="Monte Napoleone Heritage Collection Tailoring"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-[11px] uppercase tracking-[0.14em] text-white">
                  Treviso · Since 1974
                </div>
              </div>
              <div className="relative overflow-hidden border border-white/15 aspect-[4/3] lg:aspect-auto lg:min-h-[230px] bg-[#0B192E]">
                <img
                  src="/src/assets/images/editorial_tailoring_guide_1795248294030.jpg"
                  alt="Two-Ply Fabric & Bespoke Pattern Development"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-[11px] uppercase tracking-[0.14em] text-white">
                  100/2 Two-Ply & Linen
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Our Foundation / OUR STORY & Three Traditions */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 py-16 border-b border-black/10 space-y-10">
        <div className="max-w-3xl space-y-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#142B4E] font-semibold">
            {about.storyEyebrow}
          </div>
          <h2 className="font-serif-brand text-2xl sm:text-4xl font-medium tracking-wide text-[#1A1A1A]">
            {about.storyHeading}
          </h2>
          {about.storyBody.map((p, idx) => (
            <p key={idx} className="text-sm sm:text-base text-neutral-700 leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            {about.traditionsHeading}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {about.traditions.map((trad, i) => {
              const Icon = i === 0 ? Sparkles : i === 1 ? Compass : Globe2;
              return (
                <div
                  key={trad.title}
                  className="border border-black/10 bg-[#FAFAFA] p-6 space-y-3"
                >
                  <div className="w-10 h-10 bg-[#142B4E] text-white flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="font-serif-brand text-lg font-medium text-[#1A1A1A]">
                    {trad.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">{trad.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 4: Expertise · Designed Around You · Heritage Collection */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 py-16 border-b border-black/10 space-y-14">
        {about.features.map((feat, idx) => {
          const isReversed = idx % 2 === 1;
          const featureImg =
            idx === 0
              ? '/src/assets/images/editorial_business_twoply_1795248294929.jpg'
              : idx === 1
              ? '/src/assets/images/editorial_casual_linen_1795248294319.jpg'
              : ATELIER_MEDIA.heritageImg;
          return (
            <div
              key={feat.title}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
            >
              <div className={`lg:col-span-6 space-y-4 ${isReversed ? 'lg:order-2' : ''}`}>
                <div className="text-[11px] uppercase tracking-[0.2em] text-[#142B4E] font-semibold flex items-center gap-2">
                  {idx === 0 ? (
                    <Award className="w-3.5 h-3.5" />
                  ) : (
                    <Scissors className="w-3.5 h-3.5" />
                  )}
                  <span>{feat.eyebrow}</span>
                </div>
                <h2 className="font-serif-brand text-2xl sm:text-3xl font-medium tracking-wide text-[#1A1A1A]">
                  {feat.title}
                </h2>
                <div className="space-y-3 text-sm text-neutral-700 leading-relaxed">
                  {feat.paragraphs.map((para, pIdx) => (
                    <p key={pIdx}>{para}</p>
                  ))}
                </div>
                {feat.quote && (
                  <blockquote className="border-l-2 border-[#142B4E] pl-4 py-1 italic text-sm text-[#142B4E]">
                    {feat.quote}
                  </blockquote>
                )}
              </div>

              <div className={`lg:col-span-6 ${isReversed ? 'lg:order-1' : ''}`}>
                <div className="aspect-[5/4] sm:aspect-[16/11] bg-[#EFEFEF] overflow-hidden border border-black/10">
                  <img
                    src={featureImg}
                    alt={feat.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Section 5: Brand Purpose / OUR COMMITMENT (6 Structured Cards) + Oslo Showroom */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-16 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#142B4E] font-semibold">
            {about.commitmentEyebrow}
          </div>
          <h2 className="font-serif-brand text-2xl sm:text-4xl font-medium tracking-wide text-[#1A1A1A]">
            {about.commitmentHeading}
          </h2>
        </div>

        <div
          data-testid="about-commitment-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {about.commitmentCards.map((card) => (
            <article
              key={card.title}
              className="border border-black/10 bg-[#FAFAFA] p-6 space-y-2.5 hover:border-[#142B4E]/40 transition-colors"
            >
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-[#142B4E] font-semibold">
                <span>{card.eyebrow}</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-serif-brand text-lg font-medium text-[#1A1A1A]">
                {card.title}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">{card.body}</p>
            </article>
          ))}
        </div>

        {/* Showroom & Regional Fulfillment Strip */}
        <div className="p-6 sm:p-8 bg-[#F7F7F7] border border-black/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#142B4E]">
              <MapPin className="w-4 h-4" />
              <span>{about.showroomHeading}</span>
            </div>
            <p className="text-sm text-neutral-700">{about.showroomAddress}</p>
            <p className="text-xs font-mono-tabular text-neutral-500">
              Active Regional Warehouse: {region.warehouse_name} ({region.currency_code})
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              type="button"
              onClick={onNavigateCatalog}
              className="px-5 py-2.5 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-wider font-medium cursor-pointer"
            >
              {about.ctaCatalog}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};
