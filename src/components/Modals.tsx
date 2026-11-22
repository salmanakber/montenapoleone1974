import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Product, RegionConfig } from '../types.ts';
import { formatRegionalPrice } from '../utils/commerce.ts';

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
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ mode, onClose }) => {
  if (!mode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white border border-black/15 shadow-2xl p-6 sm:p-8 space-y-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-black/10 pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            {mode === 'size_guide'
              ? 'Monte Napoleone Size & Tailoring Guide (cm)'
              : 'Returns & 14-Day Withdrawal Form'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 text-neutral-500 hover:text-black cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === 'size_guide' ? (
          <div className="space-y-4">
            <p className="text-xs text-neutral-600 leading-relaxed">
              Every shirt includes complimentary sleeve and body length customization (+/- 4 cm). Measure a well-fitting dress shirt laid flat from center back yoke to cuff.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono-tabular border-collapse">
                <thead>
                  <tr className="bg-[#F7F7F7] border-b border-black/15 text-left">
                    <th className="p-2.5">Collar / Size</th>
                    <th className="p-2.5">Chest (Slim)</th>
                    <th className="p-2.5">Waist (Slim)</th>
                    <th className="p-2.5">Sleeve Standard</th>
                    <th className="p-2.5">Back Length</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  <tr><td className="p-2.5">37 / XS</td><td className="p-2.5">98</td><td className="p-2.5">88</td><td className="p-2.5">64</td><td className="p-2.5">75</td></tr>
                  <tr><td className="p-2.5">38 / S</td><td className="p-2.5">102</td><td className="p-2.5">92</td><td className="p-2.5">65</td><td className="p-2.5">76</td></tr>
                  <tr><td className="p-2.5">39 / M</td><td className="p-2.5">106</td><td className="p-2.5">96</td><td className="p-2.5">66</td><td className="p-2.5">77</td></tr>
                  <tr><td className="p-2.5">40 / M</td><td className="p-2.5">110</td><td className="p-2.5">100</td><td className="p-2.5">66.5</td><td className="p-2.5">78</td></tr>
                  <tr><td className="p-2.5">41 / L</td><td className="p-2.5">114</td><td className="p-2.5">104</td><td className="p-2.5">67</td><td className="p-2.5">79</td></tr>
                  <tr><td className="p-2.5">42 / L</td><td className="p-2.5">118</td><td className="p-2.5">108</td><td className="p-2.5">67.5</td><td className="p-2.5">80</td></tr>
                  <tr><td className="p-2.5">43 / XL</td><td className="p-2.5">124</td><td className="p-2.5">114</td><td className="p-2.5">68</td><td className="p-2.5">81</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-neutral-600 leading-relaxed">
            <p>
              Unused shirts with original tags may be returned or exchanged within 14 days via DHL Return Waybill.
            </p>
            <p>
              <strong>Showroom Return Address:</strong> Gulbrandsens Agencies Showroom, Maridalsveien 87, 0461 Oslo, Norway · or Via Roma 14, Treviso, Italy.
            </p>
            <p>
              Email <span className="text-[#142B4E] font-medium">monte@montenapoleone1974.com</span> with your Order Number (e.g. MN-2026-1001) for a prepaid return label.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
