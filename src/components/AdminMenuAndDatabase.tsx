import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Compass,
  Database,
  Download,
  Image as ImageIcon,
  Layers,
  Plus,
  RefreshCw,
  Save,
  Server,
  Table2,
  Trash2,
} from 'lucide-react';
import type {
  CategoryRecord,
  CategoryScope,
  DatabaseOverviewResponse,
  MenuItemRecord,
} from '../types.ts';

function categoryOptionLabel(c: Pick<CategoryRecord, 'slug' | 'name_en' | 'parent_id'>): string {
  const name = (c.name_en || c.slug).trim();
  const prefix = c.parent_id ? '↳ ' : '';
  return name === c.slug ? `${prefix}${c.slug}` : `${prefix}${name} (${c.slug})`;
}

function CategoryTargetSelect({
  value,
  categories,
  onChange,
  ariaLabel,
}: {
  value: string;
  categories: CategoryRecord[];
  onChange: (next: string) => void;
  ariaLabel: string;
}) {
  const known = new Set(['all', ...categories.map((c) => c.slug)]);
  const orphan = value && !known.has(value) ? value : null;
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1.5 border border-neutral-300 bg-white"
    >
      <option value="all">All products (all)</option>
      {orphan && (
        <option value={orphan}>
          {orphan} (missing category)
        </option>
      )}
      {categories.map((c) => (
        <option key={c.slug} value={c.slug}>
          {categoryOptionLabel(c)}
        </option>
      ))}
    </select>
  );
}

interface MenuManagerPanelProps {
  authToken: string;
  onRefreshStorefront: () => void;
  onPickImage: (cb: (url: string) => void) => void;
}

export const MenuManagerPanel: React.FC<MenuManagerPanelProps> = ({
  authToken,
  onRefreshStorefront,
  onPickImage,
}) => {
  const [menuItems, setMenuItems] = useState<MenuItemRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  // Add Menu Item state
  const [newSlot, setNewSlot] = useState<'mega_card' | 'nav_link'>('mega_card');
  const [newTargetType, setNewTargetType] = useState<'category' | 'view'>('category');
  const [newTargetValue, setNewTargetValue] = useState('all');
  const [newSortOrder, setNewSortOrder] = useState(5);
  const [newTitleEn, setNewTitleEn] = useState('');
  const [newTitleNo, setNewTitleNo] = useState('');
  const [newTitleIt, setNewTitleIt] = useState('');
  const [newTitleVn, setNewTitleVn] = useState('');
  const [newImageUrl, setNewImageUrl] = useState(
    '/src/assets/images/shirt_beige_linen_1795248293982.jpg'
  );

  // Add Category state
  const [catSlug, setCatSlug] = useState('');
  const [catSortOrder, setCatSortOrder] = useState(6);
  const [catNameEn, setCatNameEn] = useState('');
  const [catNameNo, setCatNameNo] = useState('');
  const [catNameIt, setCatNameIt] = useState('');
  const [catNameVn, setCatNameVn] = useState('');
  const [catParentId, setCatParentId] = useState('');
  const [catScope, setCatScope] = useState<CategoryScope>('both');

  const loadMenuData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/menu', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMenuItems(data.menuItems || []);
        setCategories(data.categories || []);
      }
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    loadMenuData();
  }, [loadMenuData]);

  const handleSaveMenuItem = async (item: MenuItemRecord) => {
    setSavingId(item.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/menu/items/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        setFeedback(`Saved navigation item "${item.title_en}".`);
        onRefreshStorefront();
        await loadMenuData();
      } else {
        const d = await res.json();
        setFeedback(d.error || 'Could not save menu item.');
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteMenuItem = async (item: MenuItemRecord) => {
    setFeedback(null);
    const res = await fetch(`/api/admin/menu/items/${item.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      setFeedback(`Removed navigation item "${item.title_en}".`);
      onRefreshStorefront();
      await loadMenuData();
    }
  };

  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!newTitleEn.trim()) return;
    const res = await fetch('/api/admin/menu/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        slot: newSlot,
        target_type: newTargetType,
        target_value: newTargetValue,
        sort_order: newSortOrder,
        active: true,
        title_en: newTitleEn.trim(),
        title_no: newTitleNo.trim() || newTitleEn.trim(),
        title_it: newTitleIt.trim() || newTitleEn.trim(),
        title_vn: newTitleVn.trim() || newTitleEn.trim(),
        image_url: newImageUrl,
      }),
    });
    if (res.ok) {
      setNewTitleEn('');
      setNewTitleNo('');
      setNewTitleIt('');
      setNewTitleVn('');
      setFeedback('Added new navigation item to storefront header.');
      onRefreshStorefront();
      await loadMenuData();
    }
  };

  const handleSaveCategory = async (cat: CategoryRecord) => {
    setFeedback(null);
    const res = await fetch(`/api/admin/categories/${cat.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(cat),
    });
    if (res.ok) {
      setFeedback(`Updated category "${cat.slug}".`);
      onRefreshStorefront();
      await loadMenuData();
    }
  };

  const handleDeleteCategory = async (cat: CategoryRecord) => {
    setFeedback(null);
    const res = await fetch(`/api/admin/categories/${cat.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      setFeedback(`Deleted category "${cat.slug}".`);
      onRefreshStorefront();
      await loadMenuData();
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!catSlug.trim() || !catNameEn.trim()) return;
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        slug: catSlug.trim().toLowerCase(),
        sort_order: catSortOrder,
        parent_id: catParentId ? Number(catParentId) : null,
        scope: catScope,
        active: true,
        name_en: catNameEn.trim(),
        name_no: catNameNo.trim() || catNameEn.trim(),
        name_it: catNameIt.trim() || catNameEn.trim(),
        name_vn: catNameVn.trim() || catNameEn.trim(),
      }),
    });
    const d = await res.json();
    if (res.ok) {
      setCatSlug('');
      setCatNameEn('');
      setCatNameNo('');
      setCatNameIt('');
      setCatNameVn('');
      setCatParentId('');
      setCatScope('both');
      setFeedback('Added localized storefront category.');
      onRefreshStorefront();
      await loadMenuData();
    } else {
      setFeedback(d.error || 'Could not create category.');
    }
  };

  const topLevelCategories = categories.filter((c) => !c.parent_id);

  return (
    <div className="space-y-8">
      <div className="border-b border-neutral-200 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold uppercase tracking-wide flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#142B4E]" />
            <span>B2C Mega-Dropdown, Top Menu & Categories Manager</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Control B2C mega-menu images, localized labels (EN / NO / IT / VN), custom navigation links, and catalog category tabs.
          </p>
        </div>
        <button
          type="button"
          onClick={loadMenuData}
          className="px-3 py-1.5 border border-neutral-300 bg-white hover:bg-neutral-50 text-xs uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-[#F6F9F6] border border-[#4F8A47]/40 text-xs text-[#2D5728] flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* B2C MEGA-DROPDOWN CARDS & NAV LINKS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#142B4E]">
            B2C Mega-Dropdown Visual Cards & Header Links ({menuItems.length})
          </h2>
        </div>

        <div className="space-y-3">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="border border-neutral-200 bg-white p-4 grid grid-cols-1 xl:grid-cols-12 gap-4 items-center text-xs"
            >
              {/* Image preview & Media picker */}
              <div className="xl:col-span-3 flex items-center gap-3">
                <img
                  src={item.image_url}
                  alt={item.title_en}
                  referrerPolicy="no-referrer"
                  className="w-24 h-18 object-cover bg-[#EFEFEF] border border-black/10 shrink-0"
                />
                <div className="space-y-1.5 min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                    {item.slot === 'mega_card' ? 'Mega Card (4:3)' : 'Top Nav Link'}
                  </div>
                  {item.slot === 'mega_card' && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = item.id;
                        const targetTitle = item.title_en;
                        onPickImage((url) => {
                          // Capture targetId so each row keeps its own image (never share across items)
                          setMenuItems((prev) =>
                            prev.map((m) => (m.id === targetId ? { ...m, image_url: url } : m))
                          );
                          // Persist image only for this item — partial PATCH won't clobber other fields
                          void (async () => {
                            try {
                              const res = await fetch(`/api/admin/menu/items/${targetId}`, {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${authToken}`,
                                },
                                body: JSON.stringify({ image_url: url }),
                              });
                              if (res.ok) {
                                setFeedback(`Saved image for "${targetTitle}".`);
                                onRefreshStorefront();
                              } else {
                                setFeedback('Could not save menu image.');
                              }
                            } catch {
                              setFeedback('Could not save menu image.');
                            }
                          })();
                        });
                      }}
                      className="px-2.5 py-1 border border-[#142B4E]/30 text-[#142B4E] hover:bg-[#142B4E] hover:text-white text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <ImageIcon className="w-3 h-3" />
                      <span>Pick Image</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Multi-language titles */}
              <div className="xl:col-span-5 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase text-neutral-500 mb-0.5">English</label>
                  <input
                    value={item.title_en}
                    onChange={(e) =>
                      setMenuItems((prev) =>
                        prev.map((m) => (m.id === item.id ? { ...m, title_en: e.target.value } : m))
                      )
                    }
                    className="w-full px-2.5 py-1.5 border border-neutral-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-neutral-500 mb-0.5">Norsk</label>
                  <input
                    value={item.title_no}
                    onChange={(e) =>
                      setMenuItems((prev) =>
                        prev.map((m) => (m.id === item.id ? { ...m, title_no: e.target.value } : m))
                      )
                    }
                    className="w-full px-2.5 py-1.5 border border-neutral-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-neutral-500 mb-0.5">Italiano</label>
                  <input
                    value={item.title_it}
                    onChange={(e) =>
                      setMenuItems((prev) =>
                        prev.map((m) => (m.id === item.id ? { ...m, title_it: e.target.value } : m))
                      )
                    }
                    className="w-full px-2.5 py-1.5 border border-neutral-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-neutral-500 mb-0.5">Tiếng Việt</label>
                  <input
                    value={item.title_vn}
                    onChange={(e) =>
                      setMenuItems((prev) =>
                        prev.map((m) => (m.id === item.id ? { ...m, title_vn: e.target.value } : m))
                      )
                    }
                    className="w-full px-2.5 py-1.5 border border-neutral-300"
                  />
                </div>
              </div>

              {/* Target & controls */}
              <div className="xl:col-span-4 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase text-neutral-500 mb-0.5">Type</label>
                    <select
                      aria-label={`Target type for ${item.title_en}`}
                      value={item.target_type}
                      onChange={(e) => {
                        const nextType = e.target.value as 'category' | 'view';
                        setMenuItems((prev) =>
                          prev.map((m) =>
                            m.id === item.id
                              ? {
                                  ...m,
                                  target_type: nextType,
                                  target_value:
                                    nextType === 'category'
                                      ? categories[0]?.slug || 'all'
                                      : 'catalog',
                                }
                              : m
                          )
                        );
                      }}
                      className="w-full px-2 py-1.5 border border-neutral-300 bg-white"
                    >
                      <option value="category">Category</option>
                      <option value="view">Page link</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-neutral-500 mb-0.5">
                      {item.target_type === 'category' ? 'Category' : 'Link'}
                    </label>
                    {item.target_type === 'category' ? (
                      <CategoryTargetSelect
                        ariaLabel={`Category target for ${item.title_en}`}
                        value={item.target_value}
                        categories={categories}
                        onChange={(next) =>
                          setMenuItems((prev) =>
                            prev.map((m) =>
                              m.id === item.id ? { ...m, target_value: next } : m
                            )
                          )
                        }
                      />
                    ) : (
                      <select
                        aria-label={`View link for ${item.title_en}`}
                        value={item.target_value}
                        onChange={(e) =>
                          setMenuItems((prev) =>
                            prev.map((m) =>
                              m.id === item.id ? { ...m, target_value: e.target.value } : m
                            )
                          )
                        }
                        className="w-full px-2 py-1.5 border border-neutral-300 bg-white"
                      >
                        <option value="catalog">Catalog page</option>
                        <option value="b2b">B2B page</option>
                        <option value="home">Home</option>
                        <option value="account">Account</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-neutral-500 mb-0.5">Order</label>
                    <input
                      type="number"
                      aria-label={`Sort order for ${item.title_en}`}
                      value={item.sort_order}
                      onChange={(e) =>
                        setMenuItems((prev) =>
                          prev.map((m) =>
                            m.id === item.id ? { ...m, sort_order: Number(e.target.value) } : m
                          )
                        )
                      }
                      className="w-full px-2 py-1.5 border border-neutral-300 font-mono-tabular"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.active}
                      onChange={(e) =>
                        setMenuItems((prev) =>
                          prev.map((m) =>
                            m.id === item.id ? { ...m, active: e.target.checked } : m
                          )
                        )
                      }
                      className="accent-[#142B4E]"
                    />
                    <span className="text-[11px]">Visible on Site</span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={savingId === item.id}
                      onClick={() => handleSaveMenuItem(item)}
                      className="px-3 py-1.5 bg-[#142B4E] hover:bg-[#0f213d] text-white text-[11px] uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="w-3 h-3" />
                      <span>{savingId === item.id ? 'Saving...' : 'Save'}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete menu item ${item.title_en}`}
                      onClick={() => handleDeleteMenuItem(item)}
                      className="p-1.5 border border-neutral-300 text-neutral-500 hover:text-red-700 hover:border-red-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Mega-Menu Card or Top Nav Link */}
        <form
          onSubmit={handleCreateMenuItem}
          className="border border-neutral-200 bg-[#FAFAFA] p-4 space-y-3 text-xs"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-[#142B4E] flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            <span>Add New B2C Mega-Dropdown Card or Header Link</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] uppercase text-neutral-500 mb-1">Placement</label>
              <select
                value={newSlot}
                onChange={(e) => setNewSlot(e.target.value as 'mega_card' | 'nav_link')}
                className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white"
              >
                <option value="mega_card">B2C Mega-Dropdown Card (4:3 Image)</option>
                <option value="nav_link">Top Header Nav Link</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase text-neutral-500 mb-1">Target Type</label>
              <select
                value={newTargetType}
                onChange={(e) => {
                  const t = e.target.value as 'category' | 'view';
                  setNewTargetType(t);
                  setNewTargetValue(t === 'category' ? 'all' : 'catalog');
                }}
                className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white"
              >
                <option value="category">Catalog Category</option>
                <option value="view">Page View</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase text-neutral-500 mb-1">
                {newTargetType === 'category' ? 'Category' : 'Link'}
              </label>
              {newTargetType === 'category' ? (
                <CategoryTargetSelect
                  ariaLabel="Category destination"
                  value={newTargetValue}
                  categories={categories}
                  onChange={setNewTargetValue}
                />
              ) : (
                <select
                  value={newTargetValue}
                  onChange={(e) => setNewTargetValue(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white"
                >
                  <option value="catalog">Catalog page</option>
                  <option value="b2b">B2B page</option>
                  <option value="home">Home</option>
                  <option value="account">Account</option>
                </select>
              )}
            </div>
            <div>
              <label className="block text-[10px] uppercase text-neutral-500 mb-1">Sort Order</label>
              <input
                type="number"
                value={newSortOrder}
                onChange={(e) => setNewSortOrder(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white font-mono-tabular"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              required
              placeholder="Title (English) *"
              value={newTitleEn}
              onChange={(e) => setNewTitleEn(e.target.value)}
              className="px-2.5 py-1.5 border border-neutral-300 bg-white"
            />
            <input
              placeholder="Title (Norsk)"
              value={newTitleNo}
              onChange={(e) => setNewTitleNo(e.target.value)}
              className="px-2.5 py-1.5 border border-neutral-300 bg-white"
            />
            <input
              placeholder="Title (Italiano)"
              value={newTitleIt}
              onChange={(e) => setNewTitleIt(e.target.value)}
              className="px-2.5 py-1.5 border border-neutral-300 bg-white"
            />
            <input
              placeholder="Title (Tiếng Việt)"
              value={newTitleVn}
              onChange={(e) => setNewTitleVn(e.target.value)}
              className="px-2.5 py-1.5 border border-neutral-300 bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {newSlot === 'mega_card' ? (
              <div className="flex items-center gap-3">
                <img
                  src={newImageUrl}
                  alt="Preview"
                  referrerPolicy="no-referrer"
                  className="w-16 h-12 object-cover bg-[#EFEFEF] border border-black/10"
                />
                <button
                  type="button"
                  onClick={() => onPickImage((url) => setNewImageUrl(url))}
                  className="px-3 py-1.5 border border-neutral-300 bg-white hover:bg-neutral-50 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Select Card Image from Library</span>
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-neutral-500">
                Top Header Links appear alongside B2B / B2C in the main navigation bar.
              </div>
            )}

            <button
              type="submit"
              className="px-4 py-2 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-wider font-medium cursor-pointer"
            >
              Add Menu Item
            </button>
          </div>
        </form>
      </section>

      {/* STOREFRONT CATEGORIES */}
      <section className="space-y-4 pt-4 border-t border-neutral-200">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#142B4E] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Catalog & Drawer Categories ({categories.length})</span>
          </h2>
          <p className="text-[11px] text-neutral-500 mt-1 max-w-3xl">
            These drive catalog tabs and the mobile drawer. Choose parent category and scope from the
            dropdowns — no free-typed slugs for hierarchy.
          </p>
        </div>

        <div className="border border-neutral-200 bg-white overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F7F7F7] border-b border-neutral-200 text-neutral-600 uppercase text-[11px]">
              <tr>
                <th className="p-2.5">Slug</th>
                <th className="p-2.5">Parent</th>
                <th className="p-2.5">Scope</th>
                <th className="p-2.5 w-16">Order</th>
                <th className="p-2.5">English</th>
                <th className="p-2.5">Norsk</th>
                <th className="p-2.5">Italiano</th>
                <th className="p-2.5">Tiếng Việt</th>
                <th className="p-2.5">Shown</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td className="p-2.5 font-mono-tabular font-semibold text-[#142B4E]">{cat.slug}</td>
                  <td className="p-2.5 min-w-[140px]">
                    <select
                      aria-label={`Parent category for ${cat.slug}`}
                      value={cat.parent_id ? String(cat.parent_id) : ''}
                      onChange={(e) =>
                        setCategories((prev) =>
                          prev.map((c) =>
                            c.id === cat.id
                              ? {
                                  ...c,
                                  parent_id: e.target.value ? Number(e.target.value) : null,
                                }
                              : c
                          )
                        )
                      }
                      className="w-full px-2 py-1 border border-neutral-300 bg-white"
                    >
                      <option value="">— Top level —</option>
                      {topLevelCategories
                        .filter((other) => other.id !== cat.id)
                        .map((other) => (
                          <option key={other.id} value={other.id}>
                            {other.name_en || other.slug}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="p-2.5 min-w-[130px]">
                    <select
                      aria-label={`Scope for ${cat.slug}`}
                      value={cat.scope || 'both'}
                      onChange={(e) =>
                        setCategories((prev) =>
                          prev.map((c) =>
                            c.id === cat.id
                              ? { ...c, scope: e.target.value as CategoryScope }
                              : c
                          )
                        )
                      }
                      className="w-full px-2 py-1 border border-neutral-300 bg-white"
                    >
                      <option value="both">B2C & B2B</option>
                      <option value="b2c">B2C only</option>
                      <option value="b2b">B2B only</option>
                    </select>
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      aria-label={`Sort order for ${cat.slug}`}
                      value={cat.sort_order}
                      onChange={(e) =>
                        setCategories((prev) =>
                          prev.map((c) =>
                            c.id === cat.id ? { ...c, sort_order: Number(e.target.value) } : c
                          )
                        )
                      }
                      className="w-16 px-2 py-1 border border-neutral-300 font-mono-tabular"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      aria-label={`English name for ${cat.slug}`}
                      value={cat.name_en}
                      onChange={(e) =>
                        setCategories((prev) =>
                          prev.map((c) => (c.id === cat.id ? { ...c, name_en: e.target.value } : c))
                        )
                      }
                      className="w-full px-2 py-1 border border-neutral-300"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      aria-label={`Norwegian name for ${cat.slug}`}
                      value={cat.name_no}
                      onChange={(e) =>
                        setCategories((prev) =>
                          prev.map((c) => (c.id === cat.id ? { ...c, name_no: e.target.value } : c))
                        )
                      }
                      className="w-full px-2 py-1 border border-neutral-300"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      aria-label={`Italian name for ${cat.slug}`}
                      value={cat.name_it}
                      onChange={(e) =>
                        setCategories((prev) =>
                          prev.map((c) => (c.id === cat.id ? { ...c, name_it: e.target.value } : c))
                        )
                      }
                      className="w-full px-2 py-1 border border-neutral-300"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      aria-label={`Vietnamese name for ${cat.slug}`}
                      value={cat.name_vn}
                      onChange={(e) =>
                        setCategories((prev) =>
                          prev.map((c) => (c.id === cat.id ? { ...c, name_vn: e.target.value } : c))
                        )
                      }
                      className="w-full px-2 py-1 border border-neutral-300"
                    />
                  </td>
                  <td className="p-2.5">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        aria-label={`Show ${cat.slug} in catalog/drawer`}
                        checked={cat.active !== false}
                        onChange={(e) =>
                          setCategories((prev) =>
                            prev.map((c) =>
                              c.id === cat.id ? { ...c, active: e.target.checked } : c
                            )
                          )
                        }
                        className="accent-[#142B4E]"
                      />
                      <span className="text-[11px] text-neutral-600">
                        {cat.active !== false ? 'Yes' : 'No'}
                      </span>
                    </label>
                  </td>
                  <td className="p-2.5 text-right whitespace-nowrap space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleSaveCategory(cat)}
                      className="px-2.5 py-1 bg-[#142B4E] text-white text-[11px] uppercase cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete category ${cat.slug}`}
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1 border border-neutral-300 text-neutral-500 hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form
          onSubmit={handleCreateCategory}
          className="border border-neutral-200 bg-[#FAFAFA] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-2 items-end text-xs"
        >
          <div>
            <label className="block text-[10px] uppercase text-neutral-500 mb-1">Slug *</label>
            <input
              required
              placeholder="e.g. silk-evening"
              value={catSlug}
              onChange={(e) => setCatSlug(e.target.value)}
              className="w-full px-2 py-1.5 border border-neutral-300 bg-white font-mono-tabular"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-neutral-500 mb-1">Parent</label>
            <select
              aria-label="Parent category"
              value={catParentId}
              onChange={(e) => setCatParentId(e.target.value)}
              className="w-full px-2 py-1.5 border border-neutral-300 bg-white"
            >
              <option value="">— Top level —</option>
              {topLevelCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_en || c.slug}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase text-neutral-500 mb-1">Scope</label>
            <select
              aria-label="Category scope"
              value={catScope}
              onChange={(e) => setCatScope(e.target.value as CategoryScope)}
              className="w-full px-2 py-1.5 border border-neutral-300 bg-white"
            >
              <option value="both">B2C & B2B</option>
              <option value="b2c">B2C only</option>
              <option value="b2b">B2B only</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase text-neutral-500 mb-1">Order</label>
            <input
              type="number"
              value={catSortOrder}
              onChange={(e) => setCatSortOrder(Number(e.target.value))}
              className="w-full px-2 py-1.5 border border-neutral-300 bg-white font-mono-tabular"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-neutral-500 mb-1">English *</label>
            <input
              required
              placeholder="Silk Evening"
              value={catNameEn}
              onChange={(e) => setCatNameEn(e.target.value)}
              className="w-full px-2 py-1.5 border border-neutral-300 bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-neutral-500 mb-1">Norsk</label>
            <input
              placeholder="Silkeskjorter"
              value={catNameNo}
              onChange={(e) => setCatNameNo(e.target.value)}
              className="w-full px-2 py-1.5 border border-neutral-300 bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-neutral-500 mb-1">Italiano</label>
            <input
              placeholder="Seta Sera"
              value={catNameIt}
              onChange={(e) => setCatNameIt(e.target.value)}
              className="w-full px-2 py-1.5 border border-neutral-300 bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-neutral-500 mb-1">Tiếng Việt</label>
            <input
              placeholder="Áo Lụa Dự Tiệc"
              value={catNameVn}
              onChange={(e) => setCatNameVn(e.target.value)}
              className="w-full px-2 py-1.5 border border-neutral-300 bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-[#142B4E] hover:bg-[#0f213d] text-white uppercase tracking-wider font-medium cursor-pointer"
          >
            Add Category
          </button>
        </form>
      </section>
    </div>
  );
};

interface DatabaseInspectorPanelProps {
  authToken: string;
}

export const DatabaseInspectorPanel: React.FC<DatabaseInspectorPanelProps> = ({ authToken }) => {
  const [overview, setOverview] = useState<DatabaseOverviewResponse | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('orders');
  const [tableData, setTableData] = useState<{
    table: string;
    columns: string[];
    rows: Array<Record<string, unknown>>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [downloading, setDownloading] = useState<'sqlite' | 'json' | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/database/overview', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const d = (await res.json()) as DatabaseOverviewResponse;
        setOverview(d);
      }
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  const loadTablePreview = useCallback(
    async (tableName: string) => {
      setSelectedTable(tableName);
      setLoadingTable(true);
      try {
        const res = await fetch(`/api/admin/database/table/${encodeURIComponent(tableName)}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          setTableData(await res.json());
        }
      } finally {
        setLoadingTable(false);
      }
    },
    [authToken]
  );

  useEffect(() => {
    loadOverview();
    loadTablePreview('orders');
  }, [loadOverview, loadTablePreview]);

  const handleDownloadSnapshot = async (format: 'sqlite' | 'json') => {
    setDownloading(format);
    try {
      const res = await fetch(`/api/admin/database/download?format=${format}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        format === 'sqlite' ? 'montenapoleone-backup.db' : 'montenapoleone-backup.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold uppercase tracking-wide flex items-center gap-2">
            <Database className="w-4 h-4 text-[#142B4E]" />
            <span>Database Inspector & DigitalOcean Access (Owner Only)</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Live SQLite storage overview, safe read-only table inspection, and downloadable backups.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={downloading !== null}
            onClick={() => handleDownloadSnapshot('sqlite')}
            className="px-3.5 py-2 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading === 'sqlite' ? 'Creating .db...' : 'Download .db Snapshot'}</span>
          </button>
          <button
            type="button"
            disabled={downloading !== null}
            onClick={() => handleDownloadSnapshot('json')}
            className="px-3.5 py-2 border border-neutral-300 bg-white hover:bg-neutral-50 text-xs uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading === 'json' ? 'Exporting...' : 'Download JSON'}</span>
          </button>
        </div>
      </div>

      {/* Location & Engine Metadata */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="border border-neutral-200 bg-white p-4 space-y-1">
            <div className="text-[11px] uppercase text-neutral-500">Database Engine</div>
            <div className="font-semibold text-sm text-[#142B4E]">{overview.engine}</div>
            <div className="text-[11px] text-neutral-500 uppercase">
              Journal Mode: {overview.journalMode}
            </div>
          </div>
          <div className="border border-neutral-200 bg-white p-4 space-y-1">
            <div className="text-[11px] uppercase text-neutral-500">Database File Location</div>
            <div className="font-mono-tabular font-semibold text-[#1A1A1A]">
              {overview.relativePath}
            </div>
            <div className="text-[10px] font-mono-tabular text-neutral-400 truncate" title={overview.dbPath}>
              {overview.dbPath}
            </div>
          </div>
          <div className="border border-neutral-200 bg-white p-4 space-y-1">
            <div className="text-[11px] uppercase text-neutral-500">File Size On Disk</div>
            <div className="font-mono-tabular font-semibold text-sm">
              {(overview.fileSizeBytes / 1024).toFixed(1)} KB
            </div>
            <div className="text-[11px] text-neutral-500">
              {overview.tables.length} relational tables active
            </div>
          </div>
          <div className="border border-neutral-200 bg-white p-4 space-y-1">
            <div className="text-[11px] uppercase text-neutral-500">Uploaded Media Disk Folder</div>
            <div className="font-mono-tabular font-semibold text-[#1A1A1A]">uploads/</div>
            <div className="text-[10px] font-mono-tabular text-neutral-400 truncate" title={overview.uploadsPath}>
              {overview.uploadsPath}
            </div>
          </div>
        </div>
      )}

      {/* DigitalOcean SSH & Persistence Guide */}
      <div className="border border-[#142B4E]/20 bg-[#F8FAFC] p-5 space-y-3 text-xs">
        <div className="font-semibold uppercase tracking-wider text-[#142B4E] flex items-center gap-2">
          <Server className="w-4 h-4" />
          <span>How to Access & Persist Your Database on DigitalOcean</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-neutral-700 leading-relaxed">
          <div className="space-y-1.5">
            <div className="font-semibold text-[#1A1A1A]">
              1. DigitalOcean Droplet (Ubuntu + PM2 / Docker)
            </div>
            <p>
              Your SQLite file is stored directly on your Droplet disk at{' '}
              <code className="px-1.5 py-0.5 bg-white border border-neutral-200 font-mono-tabular">
                /var/www/montenapoleone/data/montenapoleone.db
              </code>{' '}
              and images at{' '}
              <code className="px-1.5 py-0.5 bg-white border border-neutral-200 font-mono-tabular">
                /var/www/montenapoleone/uploads/
              </code>
              .
            </p>
            <pre className="p-2.5 bg-[#142B4E] text-white/90 text-[11px] font-mono-tabular overflow-x-auto">
{`ssh root@your-droplet-ip
sqlite3 /var/www/montenapoleone/data/montenapoleone.db ".tables"
sqlite3 /var/www/montenapoleone/data/montenapoleone.db ".backup /root/mn-backup.db"`}
            </pre>
          </div>
          <div className="space-y-1.5">
            <div className="font-semibold text-[#1A1A1A]">
              2. GUI Tool Access (DBeaver / TablePlus) & App Platform Volumes
            </div>
            <p>
              On DigitalOcean App Platform, attach persistent volumes mounted to{' '}
              <code className="px-1.5 py-0.5 bg-white border border-neutral-200 font-mono-tabular">
                /app/data
              </code>{' '}
              and{' '}
              <code className="px-1.5 py-0.5 bg-white border border-neutral-200 font-mono-tabular">
                /app/uploads
              </code>{' '}
              so redeploys preserve orders, products, and WordPress-style media.
            </p>
            <p>
              To browse via GUI (TablePlus / DB Browser for SQLite), either click{' '}
              <strong>Download .db Snapshot</strong> above or download via SFTP (`scp`) from your Droplet.
            </p>
          </div>
        </div>
      </div>

      {/* Live Table Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-4 border border-neutral-200 bg-white divide-y divide-neutral-100 text-xs">
          <div className="p-3 bg-[#F7F7F7] font-semibold uppercase tracking-wider text-neutral-600 flex items-center justify-between">
            <span>SQLite Tables</span>
            {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
          </div>
          {overview?.tables.map((tbl) => (
            <button
              key={tbl.name}
              type="button"
              onClick={() => loadTablePreview(tbl.name)}
              className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left cursor-pointer transition-colors ${
                selectedTable === tbl.name
                  ? 'bg-[#142B4E] text-white'
                  : 'hover:bg-neutral-50 text-neutral-700'
              }`}
            >
              <span className="inline-flex items-center gap-2 font-mono-tabular font-medium">
                <Table2 className="w-3.5 h-3.5 opacity-75" />
                <span>{tbl.name}</span>
              </span>
              <span
                className={`px-2 py-0.5 text-[10px] font-mono-tabular ${
                  selectedTable === tbl.name
                    ? 'bg-white/20 text-white'
                    : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {tbl.rowCount} rows
              </span>
            </button>
          ))}
        </div>

        <div className="lg:col-span-8 border border-neutral-200 bg-white overflow-hidden">
          <div className="p-3 bg-[#F7F7F7] border-b border-neutral-200 flex items-center justify-between text-xs">
            <div className="font-semibold uppercase tracking-wider text-[#142B4E]">
              Table Preview: <span className="font-mono-tabular">{selectedTable}</span> (Latest 25 rows · Passwords Redacted)
            </div>
            {loadingTable && <RefreshCw className="w-3.5 h-3.5 animate-spin text-neutral-500" />}
          </div>
          <div className="overflow-x-auto max-h-[460px]">
            {tableData && tableData.rows.length > 0 ? (
              <table className="w-full text-[11px] text-left">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-mono-tabular sticky top-0">
                  <tr>
                    {tableData.columns.map((col) => (
                      <th key={col} className="p-2.5 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono-tabular">
                  {tableData.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50">
                      {tableData.columns.map((col) => {
                        const raw = row[col];
                        const display =
                          raw === null || raw === undefined
                            ? '—'
                            : typeof raw === 'object'
                            ? JSON.stringify(raw)
                            : String(raw);
                        return (
                          <td
                            key={col}
                            className="p-2.5 max-w-[220px] truncate text-neutral-700"
                            title={display}
                          >
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-xs text-neutral-500">
                {loadingTable ? 'Querying SQLite table...' : 'No rows in this table yet.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
