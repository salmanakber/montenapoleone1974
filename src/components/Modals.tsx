import React, { useEffect, useState } from 'react';
import { Download, ExternalLink, FileText, Ruler, Search, X } from 'lucide-react';
import type { Product, RegionCode, RegionConfig } from '../types.ts';
import { formatRegionalPrice } from '../utils/commerce.ts';
import {
  getReturnFormPdfForRegion,
  RETURN_FORM_PDFS,
  SIZE_GUIDE_CHARTS,
  type SizeChartTable,
} from '../utils/sizeGuide.ts';

interface SearchModalProps {
  open: boolean;
  products: Product[];
  region: RegionConfig;
  onClose: () => void;
  onSelectProduct: (slug: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  open,
  products,
  region,
  onClose,
  onSelectProduct,
}) => {
  const [query, setQuery] = useState('');
  if (!open) return null;

  const q = query.trim().toLowerCase();
  const matches = q
    ? products.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.fabric_spec.toLowerCase().includes(q)
      )
    : products.slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white border border-black/15 shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-black/15 pb-3">
          <Search className="w-4 h-4 text-neutral-500" />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${region.name} catalog (${region.currency_code})...`}
            className="flex-1 text-sm outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="p-1 text-neutral-500 hover:text-black cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="divide-y divide-black/5 max-h-80 overflow-y-auto">
          {matches.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelectProduct(p.slug);
                onClose();
              }}
              className="w-full py-2.5 flex items-center justify-between gap-4 hover:bg-neutral-50 px-2 text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <img
                  src={p.primary_image}
                  alt={p.title}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 object-cover bg-[#E6E6E6]"
                />
                <div>
                  <div className="text-xs font-medium uppercase">{p.title}</div>
                  <div className="text-[11px] text-neutral-500">{p.fabric_spec}</div>
                </div>
              </div>
              <span className="text-xs font-mono-tabular font-medium">
                {formatRegionalPrice(p.price, region.code)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface InfoModalProps {
  mode: 'size_guide' | 'return_form' | null;
  region?: RegionConfig;
  onClose: () => void;
}

const REGION_PDF_ORDER: RegionCode[] = ['en', 'no', 'it', 'vn'];

export const InfoModal: React.FC<InfoModalProps> = ({ mode, region, onClose }) => {
  const [activeFitFilter, setActiveFitFilter] = useState<'all' | SizeChartTable['id']>('all');
  const [selectedPdfLang, setSelectedPdfLang] = useState<RegionCode>(region?.code || 'en');

  useEffect(() => {
    if (region?.code) {
      setSelectedPdfLang(region.code);
    }
  }, [region?.code, mode]);

  useEffect(() => {
    if (!mode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, onClose]);

  if (!mode) return null;

  // 1. RIGHT-SIDE SLIDE-OVER SIZE GUIDE DRAWER
  if (mode === 'size_guide') {
    const visibleCharts =
      activeFitFilter === 'all'
        ? SIZE_GUIDE_CHARTS
        : SIZE_GUIDE_CHARTS.filter((c) => c.id === activeFitFilter);

    return (
      <div
        data-testid="size-guide-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Monte Napoleone Size Charts (cm)"
        className="fixed inset-0 z-50 flex justify-end"
      >
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
          onClick={onClose}
        />
        <aside className="relative w-full max-w-3xl bg-white h-full shadow-2xl border-l border-black/15 flex flex-col justify-between">
          {/* Header */}
          <div className="px-6 py-4 border-b border-black/10 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2.5">
              <Ruler className="w-4 h-4 text-[#142B4E]" />
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#1A1A1A]">
                  Size Guide — Size Charts (cm)
                </h2>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Complimentary sleeve &amp; shirt length tailoring (+/- 4 cm) available on every order.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close size guide drawer"
              className="p-2 text-neutral-500 hover:text-black cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="px-6 py-3 bg-[#F7F7F7] border-b border-black/10 flex flex-wrap items-center gap-2 shrink-0">
            {(
              [
                { id: 'all', label: 'All Fits (3)' },
                { id: 'contemporary', label: 'Contemporary' },
                { id: 'modern_fit', label: 'Modern Fit' },
                { id: 'slimfit', label: 'Slimfit' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFitFilter(tab.id)}
                className={`px-3.5 py-1.5 text-xs uppercase tracking-wider font-medium border transition-colors cursor-pointer ${
                  activeFitFilter === tab.id
                    ? 'bg-[#142B4E] text-white border-[#142B4E]'
                    : 'bg-white text-[#1A1A1A] border-black/15 hover:border-[#142B4E]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scrollable Charts */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
            {visibleCharts.map((chart) => (
              <section key={chart.id} className="space-y-3" data-testid={`size-chart-${chart.id}`}>
                <div className="flex items-baseline justify-between border-b border-black/15 pb-2">
                  <div>
                    <h3 className="text-base font-medium text-[#1A1A1A]">{chart.title}</h3>
                    <p className="text-xs text-neutral-500">{chart.subtitle}</p>
                  </div>
                  <span className="text-[11px] uppercase tracking-widest text-[#142B4E] font-medium">
                    Garment Flat Measurements (cm)
                  </span>
                </div>

                <div className="overflow-x-auto border border-black/10">
                  <table className="w-full text-xs font-mono-tabular border-collapse">
                    <thead>
                      <tr className="bg-[#142B4E] text-white text-left">
                        <th className="py-2.5 px-3 font-semibold uppercase tracking-wider min-w-[130px] sticky left-0 bg-[#142B4E]">
                          SIZE
                        </th>
                        {chart.sizes.map((sz) => (
                          <th
                            key={sz}
                            className="py-2.5 px-3 font-semibold text-center whitespace-nowrap border-l border-white/15"
                          >
                            {sz}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/10">
                      {chart.rows.map((row, idx) => (
                        <tr
                          key={row.metric}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}
                        >
                          <td className="py-2.5 px-3 font-sans font-medium text-[#1A1A1A] sticky left-0 bg-inherit border-r border-black/10">
                            {row.metric}
                          </td>
                          {row.values.map((val, cellIdx) => (
                            <td
                              key={`${row.metric}-${cellIdx}`}
                              className="py-2.5 px-3 text-center text-neutral-700 border-l border-black/5 whitespace-nowrap"
                            >
                              {val}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}

            <div className="p-4 bg-[#F7F7F7] border border-black/10 text-xs text-neutral-600 leading-relaxed space-y-1.5">
              <div className="font-semibold text-[#1A1A1A] uppercase tracking-wider text-[11px]">
                How to Measure Your Dress Shirt
              </div>
              <p>
                Lay a favorite well-fitting shirt flat on a table, buttoned up. Chest Width is measured
                full circumference 2 cm below armholes; Waist Width at the narrowest torso point;
                Sleeve Length from shoulder seam to cuff edge.
              </p>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-black/10 bg-[#FAFAFA] flex items-center justify-between shrink-0">
            <span className="text-xs text-neutral-500">Monte Napoleone 1974 · Treviso Sartoria</span>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-[0.14em] font-medium cursor-pointer"
            >
              Close Guide
            </button>
          </div>
        </aside>
      </div>
    );
  }

  // 2. RETURN & 14-DAY WITHDRAWAL FORM PDF VIEWER + REGIONAL DOWNLOADS
  const activePdf = getReturnFormPdfForRegion(selectedPdfLang);

  return (
    <div
      data-testid="return-form-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Returns and 14-Day Withdrawal Form PDF"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      <div className="fixed inset-0 bg-black/55 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white border border-black/15 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Title + Close */}
        <div className="px-5 sm:px-6 py-4 border-b border-black/10 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-4 h-4 text-[#142B4E] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#1A1A1A] truncate">
                Returns &amp; 14-Day Withdrawal Form
              </h2>
              <p className="text-[11px] text-neutral-500 truncate">{activePdf.formTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={activePdf.url}
              download={activePdf.downloadName}
              data-testid="active-return-pdf-download"
              className="px-3.5 py-2 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-wider font-medium inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {activePdf.shortLabel} PDF</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close return form modal"
              className="p-2 text-neutral-500 hover:text-black cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Language Switcher Strip (auto-matched to active storefront region) */}
        <div className="px-5 sm:px-6 py-3 bg-[#F7F7F7] border-b border-black/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-neutral-500 mr-1">
              Form Language:
            </span>
            {REGION_PDF_ORDER.map((code) => {
              const entry = RETURN_FORM_PDFS[code];
              const isSelected = selectedPdfLang === code;
              const isRegionDefault = region?.code === code;
              return (
                <button
                  key={code}
                  type="button"
                  data-testid={`return-pdf-tab-${code}`}
                  onClick={() => setSelectedPdfLang(code)}
                  className={`px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#142B4E] text-white border-[#142B4E]'
                      : 'bg-white text-[#1A1A1A] border-black/15 hover:border-[#142B4E]'
                  }`}
                >
                  <span>{entry.languageLabel}</span>
                  {isRegionDefault && (
                    <span
                      className={`text-[9px] uppercase px-1.5 py-0.5 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#EEF2F7] text-[#142B4E]'
                      }`}
                    >
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <a
            href={activePdf.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#142B4E] hover:underline inline-flex items-center gap-1"
          >
            <span>Open Fullscreen</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Embedded PDF Preview */}
        <div className="flex-1 bg-[#EAECEF] min-h-[420px] sm:min-h-[500px] overflow-hidden relative">
          <iframe
            key={activePdf.url}
            data-testid="return-pdf-iframe"
            title={activePdf.formTitle}
            src={`${activePdf.url}#view=FitH`}
            className="w-full h-full min-h-[420px] sm:min-h-[500px] border-0 bg-white"
          />
        </div>

        {/* Bottom Download All Languages + Showroom Return Instructions */}
        <div className="px-5 sm:px-6 py-4 bg-white border-t border-black/10 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-600">
              Download Standalone PDF by Language:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {REGION_PDF_ORDER.map((code) => {
                const entry = RETURN_FORM_PDFS[code];
                return (
                  <a
                    key={`dl-${code}`}
                    href={entry.url}
                    download={entry.downloadName}
                    className="px-2.5 py-1 border border-black/15 hover:border-[#142B4E] text-[11px] font-medium text-[#1A1A1A] hover:text-[#142B4E] inline-flex items-center gap-1.5 bg-[#FAFAFA]"
                  >
                    <Download className="w-3 h-3" />
                    <span>{entry.shortLabel}</span>
                  </a>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-neutral-600 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/5">
            <span>
              <strong>Showroom Returns:</strong> Gulbrandsens Agencies Showroom, Maridalsveien 87, 0461 Oslo, Norway · Via Roma 14, Treviso, Italy.
            </span>
            <span>
              DHL Return Support: <strong className="text-[#142B4E]">monte@montenapoleone1974.com</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

