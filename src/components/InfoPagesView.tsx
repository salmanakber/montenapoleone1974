import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, Download, Mail, MapPin } from 'lucide-react';
import type { RegionConfig } from '../types.ts';
import type { RegionCopy } from '../i18n/translations.ts';
import {
  getInfoPageContent,
  INFO_PAGE_SLUGS,
  type InfoPageSlug,
} from '../content/infoPages.ts';

interface InfoPagesViewProps {
  region: RegionConfig;
  copy: RegionCopy;
  page: InfoPageSlug;
  onNavigatePage: (page: InfoPageSlug) => void;
  onNavigateCatalog: () => void;
  onNavigateHome: () => void;
}

export const InfoPagesView: React.FC<InfoPagesViewProps> = ({
  region,
  copy,
  page,
  onNavigatePage,
  onNavigateCatalog,
  onNavigateHome,
}) => {
  const content = getInfoPageContent(page, region.code);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    setOpenFaq(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const navLabels: Record<InfoPageSlug, string> = {
    returns: copy.footer.infoLinks[0] || 'Returns',
    withdrawal: copy.footer.infoLinks[1] || 'Withdrawal',
    dealers: copy.footer.infoLinks[2] || 'Dealers',
    careers: copy.footer.infoLinks[3] || 'Careers',
    faq: copy.footer.infoLinks[4] || 'FAQ',
    privacy: copy.footer.infoLinks[5] || 'Privacy',
  };

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
            {copy.footer.infoHeading}
          </div>
          {INFO_PAGE_SLUGS.map((slug) => {
            const active = slug === page;
            return (
              <button
                key={slug}
                type="button"
                onClick={() => onNavigatePage(slug)}
                className={`w-full text-left px-3 py-2.5 text-xs border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#142B4E] text-white border-[#142B4E]'
                    : 'bg-white text-neutral-700 border-transparent hover:border-black/10 hover:bg-[#F7F7F7]'
                }`}
              >
                {navLabels[slug]}
              </button>
            );
          })}
        </aside>

        <div className="lg:col-span-9 min-w-0">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-8"
          >
            <header className="border-b border-black/10 pb-8 space-y-3">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#142B4E] font-semibold">
                {content.eyebrow}
              </div>
              <h1 className="font-serif-brand text-3xl sm:text-4xl font-medium tracking-wide leading-[1.15]">
                {content.title}
              </h1>
              <p className="text-sm sm:text-base text-neutral-600 leading-relaxed max-w-3xl">
                {content.lead}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                {content.pdfUrl && (
                  <a
                    href={content.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#142B4E] text-white text-xs uppercase tracking-[0.14em] font-medium hover:bg-[#0f213d]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {content.pdfLabel || 'Download PDF'}
                  </a>
                )}
                {content.ctaEmail && (
                  <a
                    href={`mailto:${content.ctaEmail}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#142B4E] text-[#142B4E] text-xs uppercase tracking-[0.14em] font-medium hover:bg-[#142B4E] hover:text-white transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {content.ctaEmail}
                  </a>
                )}
                <button
                  type="button"
                  onClick={onNavigateCatalog}
                  className="px-5 py-2.5 text-xs uppercase tracking-[0.14em] font-medium text-neutral-600 hover:text-[#142B4E] cursor-pointer"
                >
                  {copy.nav.allShirts} →
                </button>
              </div>
            </header>

            {content.dealers && content.dealers.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {content.dealers.map((d) => (
                  <div
                    key={`${d.name}-${d.city}`}
                    className="border border-black/10 bg-[#FAFAFA] px-4 py-4 flex items-start gap-3"
                  >
                    <MapPin className="w-4 h-4 text-[#142B4E] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-[#1A1A1A]">{d.name}</div>
                      <div className="text-xs text-neutral-500 mt-0.5">{d.city}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-8">
              {content.sections.map((section) => (
                <section key={section.heading} className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#142B4E]">
                    {section.heading}
                  </h2>
                  {section.paragraphs?.map((p) => (
                    <p key={p.slice(0, 48)} className="text-sm text-neutral-700 leading-relaxed">
                      {p}
                    </p>
                  ))}
                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="space-y-2 pl-0">
                      {section.bullets.map((b) => (
                        <li
                          key={b.slice(0, 48)}
                          className="text-sm text-neutral-700 leading-relaxed flex gap-2.5"
                        >
                          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#142B4E] shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.note && (
                    <p className="text-xs text-neutral-500 border-l-2 border-[#142B4E]/40 pl-3">
                      {section.note}
                    </p>
                  )}
                </section>
              ))}
            </div>

            {content.faqGroups?.map((group) => (
              <section key={group.title} className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#142B4E]">
                  {group.title}
                </h2>
                <div className="border border-black/10 divide-y divide-black/10">
                  {group.items.map((item) => {
                    const key = `${group.title}-${item.question}`;
                    const open = openFaq === key;
                    return (
                      <div key={key}>
                        <button
                          type="button"
                          onClick={() => setOpenFaq(open ? null : key)}
                          className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left cursor-pointer hover:bg-[#FAFAFA]"
                        >
                          <span className="text-sm font-medium text-[#1A1A1A]">{item.question}</span>
                          <ChevronDown
                            className={`w-4 h-4 text-neutral-500 shrink-0 transition-transform ${
                              open ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {open && (
                          <div className="px-4 pb-4 text-sm text-neutral-600 leading-relaxed">
                            {item.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </motion.div>
        </div>
      </section>
    </main>
  );
};
