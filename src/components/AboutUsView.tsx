import React from 'react';
import { motion } from 'motion/react';
import { Award, MapPin, Scissors, Sparkles } from 'lucide-react';
import type { RegionConfig } from '../types.ts';
import type { RegionCopy } from '../i18n/translations.ts';

interface AboutUsViewProps {
  region: RegionConfig;
  copy: RegionCopy;
  onNavigateCatalog: () => void;
  onNavigateB2B: () => void;
}

export const AboutUsView: React.FC<AboutUsViewProps> = ({
  region,
  copy,
  onNavigateCatalog,
  onNavigateB2B,
}) => {
  const about = copy.aboutPage;

  return (
    <main className="pt-20 pb-20 bg-white text-[#1A1A1A]">
      {/* Editorial Header Split */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-6 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border-b border-black/10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="lg:col-span-6 space-y-5"
        >
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#142B4E] font-medium">
            {about.eyebrow}
          </div>
          <h1 className="font-serif-brand text-3xl sm:text-5xl font-medium tracking-wide leading-[1.12] text-[#1A1A1A]">
            {about.title}
          </h1>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">{about.lead}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={onNavigateCatalog}
              className="px-6 py-3 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-[0.16em] font-medium cursor-pointer"
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
          className="lg:col-span-6 grid grid-cols-2 gap-2.5"
        >
          <div className="aspect-[3/4] bg-[#E6E6E6] overflow-hidden">
            <img
              src="/src/assets/images/editorial_tailoring_guide_1795248294030.jpg"
              alt="Monte Napoleone 1974 Tailoring Atelier"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="aspect-[3/4] bg-[#E6E6E6] overflow-hidden mt-6">
            <img
              src="/src/assets/images/hero_oxford_olive_1795248294228.jpg"
              alt="Monte Napoleone 1974 Italian Craftsmanship"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>
      </section>

      {/* Narrative Columns + Three Pillars */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 py-14 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-5 text-sm leading-relaxed text-neutral-700">
          {about.paragraphs.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}

          <div className="mt-8 p-6 bg-[#F7F7F7] border border-black/10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#142B4E]">
              <MapPin className="w-4 h-4" />
              <span>{about.showroomHeading}</span>
            </div>
            <p className="text-xs text-neutral-700">{about.showroomAddress}</p>
            <p className="text-[11px] font-mono-tabular text-neutral-500">
              Active Regional Warehouse: {region.warehouse_name} ({region.currency_code})
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          {about.pillars.map((pillar, i) => {
            const Icon = i === 0 ? Sparkles : i === 1 ? Scissors : Award;
            return (
              <div
                key={pillar.title}
                className="border border-black/10 bg-[#FAFAFA] p-5 flex items-start gap-4"
              >
                <div className="w-9 h-9 bg-[#142B4E] text-white flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]">
                    {pillar.title}
                  </h2>
                  <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">{pillar.body}</p>
                </div>
              </div>
            );
          })}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <img
              src="/src/assets/images/editorial_business_twoply_1795248294929.jpg"
              alt="Two-Ply 100/2 Business Shirting"
              referrerPolicy="no-referrer"
              className="aspect-[4/3] w-full object-cover bg-[#E6E6E6]"
            />
            <img
              src="/src/assets/images/editorial_casual_linen_1795248294319.jpg"
              alt="European Casual Linen"
              referrerPolicy="no-referrer"
              className="aspect-[4/3] w-full object-cover bg-[#E6E6E6]"
            />
          </div>
        </div>
      </section>
    </main>
  );
};
