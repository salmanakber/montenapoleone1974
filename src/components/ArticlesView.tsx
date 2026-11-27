import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import type { RegionConfig } from '../types.ts';
import type { RegionCopy } from '../i18n/translations.ts';
import {
  ARTICLE_SLUGS,
  getArticleContent,
  type ArticleSlug,
} from '../content/articles.ts';

interface ArticlesViewProps {
  region: RegionConfig;
  copy: RegionCopy;
  slug: ArticleSlug;
  onNavigateArticle: (slug: ArticleSlug) => void;
  onNavigateCatalog: () => void;
  onNavigateHome: () => void;
}

export const ArticlesView: React.FC<ArticlesViewProps> = ({
  region,
  copy,
  slug,
  onNavigateArticle,
  onNavigateCatalog,
  onNavigateHome,
}) => {
  const content = getArticleContent(slug, region.code);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  const navLabel = (s: ArticleSlug) =>
    s === 'fabric-guide'
      ? region.code === 'no'
        ? 'Skjortestoffer'
        : 'Fabric guide'
      : region.code === 'no'
        ? 'Kvalitet & bærekraft'
        : 'Quality & sustainability';

  return (
    <main className="pt-20 pb-24 bg-white text-[#1A1A1A]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-6 pb-4">
        <nav className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
          <button type="button" onClick={onNavigateHome} className="hover:text-[#142B4E] cursor-pointer">
            {copy.nav.home}
          </button>
          <span>/</span>
          <span className="text-[#142B4E] font-medium">{content.title}</span>
        </nav>
      </div>

      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 pb-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <aside className="lg:col-span-3 lg:sticky lg:top-24 space-y-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-3">
            {region.code === 'no' ? 'Råd & Inspirasjon' : 'Advice & Inspiration'}
          </div>
          {ARTICLE_SLUGS.map((s) => {
            const active = s === slug;
            return (
              <button
                key={s}
                type="button"
                onClick={() => onNavigateArticle(s)}
                className={`w-full text-left px-3 py-2.5 text-xs border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#142B4E] text-white border-[#142B4E]'
                    : 'bg-white text-neutral-700 border-transparent hover:border-black/10 hover:bg-[#F7F7F7]'
                }`}
              >
                {navLabel(s)}
              </button>
            );
          })}
        </aside>

        <div className="lg:col-span-9 min-w-0">
          <motion.article
            key={slug}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-10"
          >
            <header className="space-y-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#142B4E] font-semibold">
                {content.eyebrow}
              </div>
              <h1 className="font-serif-brand text-3xl sm:text-4xl font-medium tracking-wide leading-[1.15]">
                {content.title}
              </h1>
              <p className="text-sm sm:text-base text-neutral-600 leading-relaxed max-w-3xl">
                {content.lead}
              </p>
            </header>

            <div className="aspect-[16/10] w-full overflow-hidden bg-[#E8E6E2]">
              <img
                src={content.heroImage}
                alt={content.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-8 max-w-3xl">
              {content.sections.map((section) => (
                <section key={section.heading} className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#142B4E]">
                    {section.heading}
                  </h2>
                  {section.paragraphs.map((p) => (
                    <p key={p.slice(0, 48)} className="text-sm text-neutral-700 leading-relaxed">
                      {p}
                    </p>
                  ))}
                </section>
              ))}
            </div>

            <div className="pt-4 border-t border-black/10">
              <button
                type="button"
                onClick={onNavigateCatalog}
                className="px-5 py-3 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-[0.14em] font-medium cursor-pointer"
              >
                {copy.nav.allShirts}
              </button>
            </div>
          </motion.article>
        </div>
      </section>
    </main>
  );
};
