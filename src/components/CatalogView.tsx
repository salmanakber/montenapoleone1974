import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { CategoryRecord, Product, RegionConfig } from '../types.ts';
import type { RegionCopy } from '../i18n/translations.ts';
import { ProductHoverCard } from './ProductHoverCard.tsx';

interface CatalogViewProps {
  region: RegionConfig;
  copy: RegionCopy;
  categories: CategoryRecord[];
  products: Product[];
  selectedCategory: string;
  searchQuery: string;
  wishlistIds: number[];
  onSelectCategory: (slug: string) => void;
  onSearchChange: (q: string) => void;
  onOpenProduct: (slug: string) => void;
  onToggleWishlist: (productId: number) => void;
  onNavigateB2B: () => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  region,
  copy,
  categories,
  products,
  selectedCategory,
  searchQuery,
  wishlistIds,
  onSelectCategory,
  onSearchChange,
  onOpenProduct,
  onToggleWishlist,
  onNavigateB2B,
}) => {
  const [visibleLimit, setVisibleLimit] = useState(6);

  const getCategoryName = (cat: CategoryRecord): string => {
    if (region.code === 'no') return cat.name_no;
    if (region.code === 'it') return cat.name_it;
    if (region.code === 'vn') return cat.name_vn;
    return cat.name_en;
  };

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.active !== false && c.scope !== 'b2b'),
    [categories]
  );

  const topCategories = useMemo(
    () => visibleCategories.filter((c) => !c.parent_id),
    [visibleCategories]
  );

  const activeCategoryRecord = useMemo(
    () => visibleCategories.find((c) => c.slug === selectedCategory) || null,
    [visibleCategories, selectedCategory]
  );

  const activeParentCategory = useMemo(() => {
    if (!activeCategoryRecord) return null;
    if (!activeCategoryRecord.parent_id) return activeCategoryRecord;
    return visibleCategories.find((c) => c.id === activeCategoryRecord.parent_id) || activeCategoryRecord;
  }, [visibleCategories, activeCategoryRecord]);

  const childCategories = useMemo(() => {
    if (!activeParentCategory) return [];
    return visibleCategories.filter((c) => c.parent_id === activeParentCategory.id);
  }, [visibleCategories, activeParentCategory]);

  const matchingCategorySlugs = useMemo(() => {
    if (selectedCategory === 'all' || selectedCategory === 'outlet') return null;
    const set = new Set<string>([selectedCategory]);
    if (activeCategoryRecord && !activeCategoryRecord.parent_id) {
      for (const ch of visibleCategories) {
        if (ch.parent_id === activeCategoryRecord.id) set.add(ch.slug);
      }
    }
    return set;
  }, [selectedCategory, activeCategoryRecord, visibleCategories]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedCategory === 'outlet') {
        if (!p.is_outlet) return false;
      } else if (matchingCategorySlugs && !matchingCategorySlugs.has(p.category_slug)) {
        return false;
      }
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.fabric_spec.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q)
      );
    });
  }, [products, selectedCategory, matchingCategorySlugs, searchQuery]);

  const displayedProducts = filteredProducts.slice(0, visibleLimit);

  return (
    <main className="pt-20 pb-20 max-w-[1720px] mx-auto px-1.5 sm:px-3 min-h-[75vh]">
      {/* Floating Segmented Category Filter Bar (Matches montenapoleone1974.com PLP) */}
      <div className="flex flex-col items-center gap-2 mb-3">
        <nav
          aria-label="Product categories"
          className="inline-flex flex-wrap items-center justify-center bg-white border border-black/10 shadow-sm rounded-xl p-1 gap-1 max-w-full"
        >
          <button
            type="button"
            onClick={() => {
              onSelectCategory('all');
              setVisibleLimit(9);
            }}
            className={`px-3.5 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#142B4E] text-white font-medium'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            {copy.catalog.allCategories}
          </button>
          {topCategories.map((cat) => {
            const active =
              selectedCategory === cat.slug || activeParentCategory?.id === cat.id;
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => {
                  if (cat.slug === 'b2b') {
                    onNavigateB2B();
                  } else {
                    onSelectCategory(cat.slug);
                    setVisibleLimit(9);
                  }
                }}
                className={`px-3.5 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#142B4E] text-white font-medium'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                {getCategoryName(cat)}
              </button>
            );
          })}
        </nav>

        {childCategories.length > 0 && activeParentCategory && (
          <nav
            aria-label="Subcategories"
            className="inline-flex flex-wrap items-center justify-center gap-1.5 px-2 py-1 bg-[#F7F7F7] border border-black/10 rounded-lg text-[11px]"
          >
            <button
              type="button"
              onClick={() => onSelectCategory(activeParentCategory.slug)}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                selectedCategory === activeParentCategory.slug
                  ? 'bg-[#142B4E] text-white font-medium'
                  : 'text-neutral-600 hover:bg-white'
              }`}
            >
              All {getCategoryName(activeParentCategory)}
            </button>
            {childCategories.map((sub) => (
              <button
                key={sub.slug}
                type="button"
                onClick={() => onSelectCategory(sub.slug)}
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

        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-black/10 pb-2.5">
          <div className="text-xs text-neutral-500">
            {region.name} · {region.warehouse_name} ·{' '}
            <span className="font-mono-tabular">{filteredProducts.length}</span> items
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={copy.catalog.searchPlaceholder}
              aria-label={copy.catalog.searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-black/15 focus:border-[#142B4E] outline-none bg-white"
            />
          </div>
        </div>
      </div>

      {/* 3-Column #E6E6E6 Studio Product Cards with Enlarged Visuals & Tighter Gutters */}
      {filteredProducts.length === 0 ? (
        <div className="py-16 text-center border border-black/10 bg-[#F7F7F7]">
          <p className="text-sm text-neutral-600">{copy.catalog.emptyResult}</p>
          <button
            type="button"
            onClick={() => {
              onSelectCategory('all');
              onSearchChange('');
            }}
            className="mt-4 px-5 py-2 bg-[#142B4E] text-white text-xs uppercase tracking-wider cursor-pointer"
          >
            {copy.catalog.allCategories}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2">
            {displayedProducts.map((product) => (
              <ProductHoverCard
                key={product.id}
                product={product}
                regionCode={region.code}
                preorderLabel={copy.catalog.preorderTag}
                outOfStockLabel={copy.catalog.outOfStockTag}
                inWishlist={wishlistIds.includes(product.id)}
                onOpenProduct={onOpenProduct}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>

          {filteredProducts.length > displayedProducts.length && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setVisibleLimit((prev) => prev + 6)}
                className="px-7 py-2.5 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-[0.14em] transition-colors cursor-pointer"
              >
                {copy.catalog.loadMore}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
};
