import React, { useMemo, useState } from 'react';
import { Layers, PackageCheck, RefreshCw, SlidersHorizontal } from 'lucide-react';
import type {
  AuthUser,
  CategoryRecord,
  Product,
  ProductVariant,
  RegionCode,
  StockMovement,
} from '../types.ts';
import { formatRegionalPrice, hasPermission } from '../utils/commerce.ts';

const DEFAULT_FITS = ['Regular Fit', 'Slim Fit', 'Contemporary Fit'] as const;
const ALL_COLLAR_SIZES = [
  '30 / 3XS',
  '34 / 2XS',
  '37 / XS',
  '38 / S',
  '39 / M',
  '40 / M',
  '41 / L',
  '42 / L',
  '43 / XL',
  '44 / XXL',
  '45 / 3XL',
] as const;

export const BulkProductEditorPanel: React.FC<{
  authToken: string;
  authUser: AuthUser;
  products: Product[];
  onDone: () => void;
}> = ({ authToken, authUser, products, onDone }) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [regionCode, setRegionCode] = useState<'all' | RegionCode>('all');
  const [priceMode, setPriceMode] = useState<'none' | 'percent' | 'fixed_delta' | 'set_exact'>('none');
  const [priceValue, setPriceValue] = useState<string>('');
  const [stockMode, setStockMode] = useState<'none' | 'delta' | 'set_exact'>('none');
  const [stockValue, setStockValue] = useState<string>('');
  const [categorySlug, setCategorySlug] = useState<string>('');
  const [preorderFlag, setPreorderFlag] = useState<'unchanged' | 'yes' | 'no'>('unchanged');
  const [outletFlag, setOutletFlag] = useState<'unchanged' | 'yes' | 'no'>('unchanged');
  const [featuredFlag, setFeaturedFlag] = useState<'unchanged' | 'yes' | 'no'>('unchanged');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const canPrice = hasPermission(authUser, 'manage_pricing');
  const canStock = hasPermission(authUser, 'manage_inventory');
  const canProduct = hasPermission(authUser, 'manage_products');

  const toggleProduct = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setFeedback('Select one or more shirts first.');
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const payload: Record<string, unknown> = {
        productIds: selectedIds,
        regionCode,
      };
      if (canPrice && priceMode !== 'none' && priceValue !== '') {
        payload.priceMode = priceMode;
        payload.priceValue = Number(priceValue);
      }
      if (canStock && stockMode !== 'none' && stockValue !== '') {
        payload.stockMode = stockMode;
        payload.stockValue = Number(stockValue);
      }
      if (canProduct && categorySlug) {
        payload.categorySlug = categorySlug;
      }
      if (canProduct && preorderFlag !== 'unchanged') {
        payload.preorderAllowed = preorderFlag === 'yes';
      }
      if (canProduct && outletFlag !== 'unchanged') {
        payload.isOutlet = outletFlag === 'yes';
      }
      if (canProduct && featuredFlag !== 'unchanged') {
        payload.isFeatured = featuredFlag === 'yes';
      }

      const res = await fetch('/api/admin/products/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || 'Bulk update failed.');
        return;
      }
      setFeedback(`Updated ${data.updatedCount} SKU(s) across ${regionCode.toUpperCase()}.`);
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={handleApply}
      className="border border-[#142B4E]/30 bg-[#FAFAFA] p-5 space-y-4 text-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-2.5">
        <div className="flex items-center gap-2 font-semibold uppercase tracking-wider text-[#142B4E]">
          <SlidersHorizontal className="w-4 h-4" />
          <span>Bulk Product Editor ({selectedIds.length} selected)</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSelectedIds(products.map((p) => p.id))}
            className="px-2.5 py-1 border border-neutral-300 bg-white hover:bg-neutral-50 cursor-pointer"
          >
            Select All ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="px-2.5 py-1 border border-neutral-300 bg-white hover:bg-neutral-50 cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Product Selector Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
        {products.map((p) => {
          const checked = selectedIds.includes(p.id);
          return (
            <label
              key={p.id}
              className={`flex items-center gap-2 p-2 border cursor-pointer transition-colors ${
                checked ? 'border-[#142B4E] bg-white font-medium' : 'border-neutral-200 bg-white/70'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleProduct(p.id)}
                className="accent-[#142B4E]"
              />
              <span className="truncate">
                <span className="font-mono-tabular text-[10px] text-neutral-500 mr-1">{p.sku}</span>
                {p.localizations?.en?.title || p.title}
              </span>
            </label>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] text-neutral-600 mb-1">Target Storefront Region</label>
          <select
            value={regionCode}
            onChange={(e) => setRegionCode(e.target.value as 'all' | RegionCode)}
            className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white"
          >
            <option value="all">All Regions (EN, NO, IT, VN)</option>
            <option value="en">EN · International (USD)</option>
            <option value="no">NO · Norway (NOK)</option>
            <option value="it">IT · Italy (EUR)</option>
            <option value="vn">VN · Vietnam (VND)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-neutral-600 mb-1">Bulk Price Adjustment</label>
          <div className="flex gap-1.5">
            <select
              disabled={!canPrice}
              value={priceMode}
              onChange={(e) =>
                setPriceMode(e.target.value as 'none' | 'percent' | 'fixed_delta' | 'set_exact')
              }
              className="w-1/2 px-2 py-1.5 border border-neutral-300 bg-white disabled:bg-neutral-100"
            >
              <option value="none">No Change</option>
              <option value="percent">% Adjust (+/-)</option>
              <option value="fixed_delta">Fixed Delta (+/-)</option>
              <option value="set_exact">Set Exact Price</option>
            </select>
            <input
              type="number"
              step="any"
              disabled={!canPrice || priceMode === 'none'}
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
              placeholder={priceMode === 'percent' ? 'e.g. -10 or 15' : 'Amount'}
              className="w-1/2 px-2 py-1.5 border border-neutral-300 bg-white font-mono-tabular disabled:bg-neutral-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-neutral-600 mb-1">Bulk Warehouse Stock</label>
          <div className="flex gap-1.5">
            <select
              disabled={!canStock}
              value={stockMode}
              onChange={(e) => setStockMode(e.target.value as 'none' | 'delta' | 'set_exact')}
              className="w-1/2 px-2 py-1.5 border border-neutral-300 bg-white disabled:bg-neutral-100"
            >
              <option value="none">No Change</option>
              <option value="delta">Delta (+/-)</option>
              <option value="set_exact">Set Exact Qty</option>
            </select>
            <input
              type="number"
              disabled={!canStock || stockMode === 'none'}
              value={stockValue}
              onChange={(e) => setStockValue(e.target.value)}
              placeholder="Qty"
              className="w-1/2 px-2 py-1.5 border border-neutral-300 bg-white font-mono-tabular disabled:bg-neutral-100"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] text-neutral-600 mb-1">Category</label>
          <select
            disabled={!canProduct}
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white disabled:bg-neutral-100"
          >
            <option value="">Keep Existing</option>
            <option value="linen">Linen</option>
            <option value="business">Business</option>
            <option value="oxford">Oxford</option>
            <option value="flannel">Flannel</option>
            <option value="stretch">Stretch</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-neutral-600 mb-1">Pre-order Allowed</label>
          <select
            disabled={!canProduct}
            value={preorderFlag}
            onChange={(e) => setPreorderFlag(e.target.value as 'unchanged' | 'yes' | 'no')}
            className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white disabled:bg-neutral-100"
          >
            <option value="unchanged">Keep Existing</option>
            <option value="yes">Enable Pre-order</option>
            <option value="no">Disable Pre-order</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-neutral-600 mb-1">Outlet Tag</label>
          <select
            disabled={!canProduct}
            value={outletFlag}
            onChange={(e) => setOutletFlag(e.target.value as 'unchanged' | 'yes' | 'no')}
            className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white disabled:bg-neutral-100"
          >
            <option value="unchanged">Keep Existing</option>
            <option value="yes">Mark Outlet</option>
            <option value="no">Remove Outlet</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-neutral-600 mb-1">Featured Home Shelf</label>
          <select
            disabled={!canProduct}
            value={featuredFlag}
            onChange={(e) => setFeaturedFlag(e.target.value as 'unchanged' | 'yes' | 'no')}
            className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white disabled:bg-neutral-100"
          >
            <option value="unchanged">Keep Existing</option>
            <option value="yes">Feature on Home</option>
            <option value="no">Unfeature</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {feedback ? (
          <span className="text-[#142B4E] font-medium">{feedback}</span>
        ) : (
          <span className="text-neutral-500">
            Changes apply atomically across SQLite localizations and append inventory movements.
          </span>
        )}
        <button
          type="submit"
          disabled={busy || selectedIds.length === 0}
          className="px-5 py-2 bg-[#142B4E] hover:bg-[#0f213d] disabled:bg-neutral-300 text-white uppercase tracking-wider font-medium cursor-pointer"
        >
          {busy ? 'Applying...' : 'Apply Bulk Product Update'}
        </button>
      </div>
    </form>
  );
};

export const VariantMatrixPanel: React.FC<{
  authToken: string;
  authUser: AuthUser;
  products: Product[];
  categories?: CategoryRecord[];
  variants: ProductVariant[];
  onRefresh: () => void;
}> = ({ authToken, authUser, products, categories = [], variants, onRefresh }) => {
  const [targetScope, setTargetScope] = useState<'categories' | 'products'>('products');
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>(
    products[0] ? [products[0].id] : []
  );
  const [productQuery, setProductQuery] = useState('');
  const [availableFits, setAvailableFits] = useState<string[]>(() => {
    const fromVariants = Array.from(new Set(variants.map((v) => v.fit).filter(Boolean)));
    return Array.from(new Set([...DEFAULT_FITS, ...fromVariants]));
  });
  const [availableSizes, setAvailableSizes] = useState<string[]>(() => {
    const fromVariants = Array.from(new Set(variants.map((v) => v.size_label).filter(Boolean)));
    return Array.from(new Set([...ALL_COLLAR_SIZES, ...fromVariants]));
  });
  const [customFitInput, setCustomFitInput] = useState('');
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [selectedFits, setSelectedFits] = useState<string[]>(['Regular Fit', 'Slim Fit']);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['34 / 2XS', '40 / M', '45 / 3XL']);
  const [priceEn, setPriceEn] = useState('');
  const [priceNo, setPriceNo] = useState('');
  const [priceIt, setPriceIt] = useState('');
  const [priceVn, setPriceVn] = useState('');
  const [stockEn, setStockEn] = useState('');
  const [stockNo, setStockNo] = useState('');
  const [stockIt, setStockIt] = useState('');
  const [stockVn, setStockVn] = useState('');
  const [filterPid, setFilterPid] = useState<number | 'all'>('all');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const canPrice = hasPermission(authUser, 'manage_pricing');
  const canStock = hasPermission(authUser, 'manage_inventory');

  const usableCategories = useMemo(() => {
    const usable = categories.filter((c) => c.slug !== 'all' && c.slug !== 'b2b');
    const parents = usable.filter((c) => !c.parent_id);
    const ordered: Array<{ slug: string; label: string; isChild: boolean }> = [];
    parents.forEach((par) => {
      ordered.push({ slug: par.slug, label: par.name_en, isChild: false });
      usable
        .filter((ch) => ch.parent_id === par.id)
        .forEach((ch) =>
          ordered.push({ slug: ch.slug, label: `↳ ${ch.name_en}`, isChild: true })
        );
    });
    usable
      .filter((c) => !ordered.some((o) => o.slug === c.slug))
      .forEach((c) => ordered.push({ slug: c.slug, label: c.name_en, isChild: Boolean(c.parent_id) }));
    return ordered;
  }, [categories]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        (p.localizations?.en?.title || p.title).toLowerCase().includes(q) ||
        p.category_slug.toLowerCase().includes(q)
    );
  }, [products, productQuery]);

  const toggleItem = <T,>(arr: T[], item: T, setArr: (v: T[]) => void) => {
    setArr(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  };

  const handleAddCustomFit = () => {
    const clean = customFitInput.trim();
    if (!clean) return;
    setAvailableFits((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setSelectedFits((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setCustomFitInput('');
  };

  const handleAddCustomSize = () => {
    const clean = customSizeInput.trim();
    if (!clean) return;
    setAvailableSizes((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setSelectedSizes((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setCustomSizeInput('');
  };

  const handleBulkSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasTarget =
      targetScope === 'categories'
        ? selectedCategorySlugs.length > 0
        : selectedProductIds.length > 0;
    if (!hasTarget || selectedFits.length === 0 || selectedSizes.length === 0) {
      setFeedback(
        targetScope === 'categories'
          ? 'Select at least one category, one fit, and one size.'
          : 'Select at least one shirt, one fit, and one size.'
      );
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/variants/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productIds: targetScope === 'products' ? selectedProductIds : undefined,
          categorySlugs: targetScope === 'categories' ? selectedCategorySlugs : undefined,
          fits: selectedFits,
          sizes: selectedSizes,
          price_en: priceEn !== '' ? Number(priceEn) : null,
          price_no: priceNo !== '' ? Number(priceNo) : null,
          price_it: priceIt !== '' ? Number(priceIt) : null,
          price_vn: priceVn !== '' ? Number(priceVn) : null,
          stock_en: stockEn !== '' ? Number(stockEn) : undefined,
          stock_no: stockNo !== '' ? Number(stockNo) : undefined,
          stock_it: stockIt !== '' ? Number(stockIt) : undefined,
          stock_vn: stockVn !== '' ? Number(stockVn) : undefined,
          active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || 'Variant update failed.');
        return;
      }
      setFeedback(
        `Applied ${data.affected} variation record(s) across ${data.matchedProducts ?? (targetScope === 'products' ? selectedProductIds.length : 'matched')} shirt(s).`
      );
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const visibleVariants = useMemo(() => {
    return variants.filter((v) => filterPid === 'all' || v.product_id === filterPid);
  }, [variants, filterPid]);

  const productTitleById = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of products) m.set(p.id, `${p.sku} · ${p.localizations?.en?.title || p.title}`);
    return m;
  }, [products]);

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-3">
        <h1 className="text-base font-semibold uppercase tracking-wide flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#142B4E]" />
          <span>Bulk Fit × Size Variations Matrix</span>
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Apply default or custom Body Fits and Sizes either to entire parent/child categories or specific shirts, with per-variation pricing and stock.
        </p>
      </div>

      <form
        onSubmit={handleBulkSave}
        className="border border-neutral-200 bg-[#FAFAFA] p-5 space-y-4 text-xs"
      >
        {/* Step 1: Scope Switcher (Categories vs Specific Products) */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold uppercase tracking-wider text-neutral-600">
              1. Application Scope
            </span>
            <div
              role="group"
              aria-label="Variations application scope"
              className="inline-flex bg-white border border-neutral-300 p-0.5 rounded"
            >
              <button
                type="button"
                data-testid="variant-scope-categories"
                onClick={() => setTargetScope('categories')}
                className={`px-3 py-1 text-[11px] font-medium cursor-pointer rounded-sm ${
                  targetScope === 'categories'
                    ? 'bg-[#142B4E] text-white'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                Apply to Entire Category(ies)
              </button>
              <button
                type="button"
                data-testid="variant-scope-products"
                onClick={() => setTargetScope('products')}
                className={`px-3 py-1 text-[11px] font-medium cursor-pointer rounded-sm ${
                  targetScope === 'products'
                    ? 'bg-[#142B4E] text-white'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                Apply to Specific Product(s)
              </button>
            </div>
          </div>

          {targetScope === 'categories' ? (
            <div className="bg-white border border-neutral-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-600">
                  Chosen Categories ({selectedCategorySlugs.length} selected — automatically includes subcategories & matching shirts)
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCategorySlugs(usableCategories.map((c) => c.slug))}
                    className="text-[#142B4E] hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  {selectedCategorySlugs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategorySlugs([])}
                      className="text-neutral-500 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pt-1">
                {usableCategories.map((cat) => {
                  const active = selectedCategorySlugs.includes(cat.slug);
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() =>
                        toggleItem(selectedCategorySlugs, cat.slug, setSelectedCategorySlugs)
                      }
                      className={`px-3 py-1.5 border text-[11px] cursor-pointer ${
                        active
                          ? 'bg-[#142B4E] text-white border-[#142B4E]'
                          : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                      } ${cat.isChild ? 'pl-4' : 'font-medium'}`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
                {usableCategories.length === 0 && (
                  <span className="text-neutral-500">No categories loaded.</span>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  type="search"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder="Filter shirts by SKU, title, or category..."
                  className="px-2.5 py-1.5 border border-neutral-300 text-xs w-full sm:w-72 outline-none focus:border-[#142B4E]"
                />
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-neutral-500">{selectedProductIds.length} selected</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedProductIds((prev) =>
                        Array.from(new Set([...prev, ...filteredProducts.map((p) => p.id)]))
                      )
                    }
                    className="text-[#142B4E] hover:underline cursor-pointer"
                  >
                    Select Filtered ({filteredProducts.length})
                  </button>
                  {selectedProductIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedProductIds([])}
                      className="text-neutral-500 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pt-1">
                {filteredProducts.map((p) => {
                  const active = selectedProductIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleItem(selectedProductIds, p.id, setSelectedProductIds)}
                      className={`px-3 py-1.5 border text-[11px] cursor-pointer ${
                        active
                          ? 'bg-[#142B4E] text-white border-[#142B4E]'
                          : 'bg-white text-neutral-700 border-neutral-300'
                      }`}
                    >
                      <span className="font-mono-tabular">{p.sku}</span> ·{' '}
                      {p.localizations?.en?.title || p.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Fits & Sizes (with Custom Fit & Custom Size builders) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="font-semibold uppercase tracking-wider text-neutral-600">
              2. Body Fits & Custom Cuts ({selectedFits.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {availableFits.map((fit) => {
                const active = selectedFits.includes(fit);
                return (
                  <button
                    key={fit}
                    type="button"
                    onClick={() => toggleItem(selectedFits, fit, setSelectedFits)}
                    className={`px-3 py-1.5 border text-xs cursor-pointer ${
                      active
                        ? 'bg-[#142B4E] text-white border-[#142B4E]'
                        : 'bg-white text-neutral-700 border-neutral-300'
                    }`}
                  >
                    {fit}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={customFitInput}
                onChange={(e) => setCustomFitInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomFit();
                  }
                }}
                placeholder="Add custom fit (e.g. Tailored Fit, Relaxed Fit)"
                className="flex-1 px-2.5 py-1.5 border border-neutral-300 bg-white text-[11px] outline-none focus:border-[#142B4E]"
              />
              <button
                type="button"
                onClick={handleAddCustomFit}
                className="px-3 py-1.5 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E] hover:text-white text-[11px] font-medium cursor-pointer"
              >
                + Add Fit
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wider text-neutral-600">
                3. Sizes & Collar Measurements ({selectedSizes.length})
              </span>
              <button
                type="button"
                onClick={() => setSelectedSizes([...availableSizes])}
                className="text-[#142B4E] hover:underline cursor-pointer"
              >
                Select All Sizes
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {availableSizes.map((sz) => {
                const active = selectedSizes.includes(sz);
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => toggleItem(selectedSizes, sz, setSelectedSizes)}
                    className={`px-2.5 py-1 border font-mono-tabular text-[11px] cursor-pointer ${
                      active
                        ? 'bg-[#142B4E] text-white border-[#142B4E]'
                        : 'bg-white text-neutral-700 border-neutral-300'
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={customSizeInput}
                onChange={(e) => setCustomSizeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomSize();
                  }
                }}
                placeholder="Add custom size (e.g. 46 / 4XL, One Size, S-Tall)"
                className="flex-1 px-2.5 py-1.5 border border-neutral-300 bg-white text-[11px] outline-none focus:border-[#142B4E]"
              />
              <button
                type="button"
                onClick={handleAddCustomSize}
                className="px-3 py-1.5 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E] hover:text-white text-[11px] font-medium cursor-pointer"
              >
                + Add Size
              </button>
            </div>
          </div>
        </div>

        {/* Step 4: Optional Regional Price & Stock Overrides */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-black/10">
          <div>
            <label className="block text-[10px] text-neutral-500 mb-1">EN Price Override (USD)</label>
            <input
              type="number"
              step="any"
              disabled={!canPrice}
              value={priceEn}
              onChange={(e) => setPriceEn(e.target.value)}
              placeholder="Base price if blank"
              className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white font-mono-tabular disabled:bg-neutral-100"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-500 mb-1">NO Price Override (NOK)</label>
            <input
              type="number"
              step="any"
              disabled={!canPrice}
              value={priceNo}
              onChange={(e) => setPriceNo(e.target.value)}
              placeholder="Base price if blank"
              className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white font-mono-tabular disabled:bg-neutral-100"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-500 mb-1">IT Price Override (EUR)</label>
            <input
              type="number"
              step="any"
              disabled={!canPrice}
              value={priceIt}
              onChange={(e) => setPriceIt(e.target.value)}
              placeholder="Base price if blank"
              className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white font-mono-tabular disabled:bg-neutral-100"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-500 mb-1">VN Price Override (VND)</label>
            <input
              type="number"
              step="any"
              disabled={!canPrice}
              value={priceVn}
              onChange={(e) => setPriceVn(e.target.value)}
              placeholder="Base price if blank"
              className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white font-mono-tabular disabled:bg-neutral-100"
            />
          </div>

          <div>
            <label className="block text-[10px] text-neutral-500 mb-1">EN Stock Qty</label>
            <input
              type="number"
              disabled={!canStock}
              value={stockEn}
              onChange={(e) => setStockEn(e.target.value)}
              placeholder="e.g. 12"
              className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white font-mono-tabular disabled:bg-neutral-100"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-500 mb-1">NO Stock Qty</label>
            <input
              type="number"
              disabled={!canStock}
              value={stockNo}
              onChange={(e) => setStockNo(e.target.value)}
              placeholder="e.g. 14"
              className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white font-mono-tabular disabled:bg-neutral-100"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-500 mb-1">IT Stock Qty</label>
            <input
              type="number"
              disabled={!canStock}
              value={stockIt}
              onChange={(e) => setStockIt(e.target.value)}
              placeholder="e.g. 18"
              className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white font-mono-tabular disabled:bg-neutral-100"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-500 mb-1">VN Stock Qty</label>
            <input
              type="number"
              disabled={!canStock}
              value={stockVn}
              onChange={(e) => setStockVn(e.target.value)}
              placeholder="e.g. 10"
              className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white font-mono-tabular disabled:bg-neutral-100"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {feedback ? (
            <span className="text-[#4F8A47] font-medium">{feedback}</span>
          ) : (
            <span className="text-neutral-500">
              {targetScope === 'categories'
                ? `${selectedCategorySlugs.length} category(ies) × ${selectedFits.length} fit(s) × ${selectedSizes.length} size(s)`
                : `Total combinations in batch: ${selectedProductIds.length * selectedFits.length * selectedSizes.length}`}
            </span>
          )}
          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2 bg-[#142B4E] hover:bg-[#0f213d] text-white uppercase tracking-wider font-medium cursor-pointer"
          >
            {busy ? 'Saving Matrix...' : 'Bulk Apply Fit & Size Variations'}
          </button>
        </div>
      </form>

      {/* Active Variant List */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wider text-neutral-600">
            Saved Variant Overrides ({visibleVariants.length})
          </span>
          <select
            value={filterPid}
            onChange={(e) =>
              setFilterPid(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="px-3 py-1.5 border border-neutral-300 bg-white text-xs"
          >
            <option value="all">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} · {p.localizations?.en?.title || p.title}
              </option>
            ))}
          </select>
        </div>

        <div className="border border-neutral-200 bg-white overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F7F7F7] border-b border-neutral-200 text-neutral-600 uppercase text-[11px] sticky top-0">
              <tr>
                <th className="p-3">Shirt / Variant SKU</th>
                <th className="p-3">Fit</th>
                <th className="p-3">Size</th>
                <th className="p-3">Price Overrides (EN / NO / IT / VN)</th>
                <th className="p-3">Stock (EN / NO / IT / VN)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {visibleVariants.map((v) => (
                <tr key={`${v.product_id}-${v.fit}-${v.size_label}`} className="hover:bg-neutral-50">
                  <td className="p-3">
                    <div className="font-mono-tabular font-semibold text-[#142B4E]">
                      {v.sku_variant}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {productTitleById.get(v.product_id) || `#${v.product_id}`}
                    </div>
                  </td>
                  <td className="p-3">{v.fit}</td>
                  <td className="p-3 font-mono-tabular">{v.size_label}</td>
                  <td className="p-3 font-mono-tabular text-[11px]">
                    {[
                      v.price_en ? formatRegionalPrice(v.price_en, 'en') : 'Base',
                      v.price_no ? formatRegionalPrice(v.price_no, 'no') : 'Base',
                      v.price_it ? formatRegionalPrice(v.price_it, 'it') : 'Base',
                      v.price_vn ? formatRegionalPrice(v.price_vn, 'vn') : 'Base',
                    ].join(' · ')}
                  </td>
                  <td className="p-3 font-mono-tabular">
                    {v.stock_en} / {v.stock_no} / {v.stock_it} / {v.stock_vn}
                  </td>
                </tr>
              ))}
              {visibleVariants.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-neutral-500">
                    No variation overrides yet. Select fits and sizes above to bulk-generate matrix rules.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const StockManagementPanel: React.FC<{
  authToken: string;
  products: Product[];
  movements: StockMovement[];
  onRefresh: () => void;
}> = ({ authToken, products, movements, onRefresh }) => {
  const [productId, setProductId] = useState<number>(products[0]?.id || 1);
  const [regionCode, setRegionCode] = useState<RegionCode>('en');
  const [mode, setMode] = useState<'delta' | 'set'>('delta');
  const [qty, setQty] = useState<number>(10);
  const [reason, setReason] = useState<string>('supplier_restock');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/stock/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ productId, regionCode, mode, qty, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || 'Adjustment failed.');
        return;
      }
      setFeedback(`Updated warehouse stock: ${data.previous_qty} → ${data.new_qty} units.`);
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold uppercase tracking-wide flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-[#142B4E]" />
            <span>Regional Warehouse Stock & Movement Ledger</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Automatically synced with storefront checkout orders, cancellations/restocks, and manual warehouse counts.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="px-3 py-1.5 border border-neutral-300 bg-white hover:bg-neutral-50 text-xs inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Quick Warehouse Stock Adjustment Form */}
      <form
        onSubmit={handleAdjust}
        className="border border-neutral-200 bg-[#FAFAFA] p-5 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end text-xs"
      >
        <div className="sm:col-span-2">
          <label className="block text-[11px] text-neutral-600 mb-1">Shirt SKU</label>
          <select
            value={productId}
            onChange={(e) => setProductId(Number(e.target.value))}
            className="w-full px-2.5 py-2 border border-neutral-300 bg-white"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} · {p.localizations?.en?.title || p.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-neutral-600 mb-1">Warehouse</label>
          <select
            value={regionCode}
            onChange={(e) => setRegionCode(e.target.value as RegionCode)}
            className="w-full px-2.5 py-2 border border-neutral-300 bg-white"
          >
            <option value="en">EN · Treviso Hub</option>
            <option value="no">NO · Oslo Warehouse</option>
            <option value="it">IT · Milano Atelier</option>
            <option value="vn">VN · Saigon Dispatch</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-neutral-600 mb-1">Mode & Qty</label>
          <div className="flex gap-1">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'delta' | 'set')}
              className="w-1/2 px-2 py-2 border border-neutral-300 bg-white"
            >
              <option value="delta">+/-</option>
              <option value="set">Set</option>
            </select>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="w-1/2 px-2 py-2 border border-neutral-300 bg-white font-mono-tabular"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-neutral-600 mb-1">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-2.5 py-2 border border-neutral-300 bg-white"
          >
            <option value="supplier_restock">Supplier Restock</option>
            <option value="manual_warehouse_count">Physical Inventory Count</option>
            <option value="damage_writeoff">Damage / Shrinkage</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 bg-[#142B4E] hover:bg-[#0f213d] text-white uppercase tracking-wider font-medium cursor-pointer"
        >
          {busy ? 'Saving...' : 'Adjust Stock'}
        </button>

        {feedback && (
          <div className="sm:col-span-6 text-[#4F8A47] font-medium pt-1">{feedback}</div>
        )}
      </form>

      {/* Movement Audit Ledger */}
      <div className="border border-neutral-200 bg-white overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#F7F7F7] border-b border-neutral-200 text-neutral-600 uppercase text-[11px]">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">SKU / Variant</th>
              <th className="p-3">Region</th>
              <th className="p-3">Delta</th>
              <th className="p-3">Balance</th>
              <th className="p-3">Reason / Ref</th>
              <th className="p-3">Actor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {movements.map((m) => (
              <tr key={m.id} className="hover:bg-neutral-50">
                <td className="p-3 font-mono-tabular text-[11px] text-neutral-500">
                  {m.created_at}
                </td>
                <td className="p-3">
                  <div className="font-mono-tabular font-semibold">{m.sku}</div>
                  {m.variant_label && (
                    <div className="text-[11px] text-neutral-500">{m.variant_label}</div>
                  )}
                </td>
                <td className="p-3 uppercase font-mono-tabular">{m.region_code}</td>
                <td className="p-3 font-mono-tabular font-semibold">
                  <span className={m.delta_qty >= 0 ? 'text-[#4F8A47]' : 'text-red-600'}>
                    {m.delta_qty >= 0 ? `+${m.delta_qty}` : m.delta_qty}
                  </span>
                </td>
                <td className="p-3 font-mono-tabular text-neutral-600">
                  {m.previous_qty} → <strong className="text-[#1A1A1A]">{m.new_qty}</strong>
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 bg-neutral-100 text-[10px] uppercase font-mono-tabular">
                    {m.reason.replace(/_/g, ' ')}
                  </span>
                  <div className="text-[11px] font-mono-tabular text-neutral-500 mt-0.5">
                    {m.reference_id}
                  </div>
                </td>
                <td className="p-3 text-neutral-600">{m.actor_email}</td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-neutral-500">
                  No inventory movements recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
