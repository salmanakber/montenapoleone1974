import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  FolderTree,
  GripVertical,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import type { CategoryRecord, CategoryScope } from '../types.ts';

interface AdminCategoriesPanelProps {
  authToken: string;
  onRefreshStorefront: () => void;
}

const SAMPLE_WP_WXR_XML = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:wp="http://wordpress.org/export/1.2/">
<channel>
  <wp:term>
    <wp:term_taxonomy>product_cat</wp:term_taxonomy>
    <wp:term_slug>ceremonial-evening</wp:term_slug>
    <wp:term_parent></wp:term_parent>
    <wp:term_name><![CDATA[Ceremonial & Evening]]></wp:term_name>
  </wp:term>
  <wp:term>
    <wp:term_taxonomy>product_cat</wp:term_taxonomy>
    <wp:term_slug>tuxedo-marcella</wp:term_slug>
    <wp:term_parent>ceremonial-evening</wp:term_parent>
    <wp:term_name><![CDATA[Tuxedo Marcella Bib]]></wp:term_name>
  </wp:term>
  <wp:term>
    <wp:term_taxonomy>product_cat</wp:term_taxonomy>
    <wp:term_slug>twill-non-iron</wp:term_slug>
    <wp:term_parent>business</wp:term_parent>
    <wp:term_name><![CDATA[Twill Non-Iron]]></wp:term_name>
  </wp:term>
</channel>
</rss>`;

export const AdminCategoriesPanel: React.FC<AdminCategoriesPanelProps> = ({
  authToken,
  onRefreshStorefront,
}) => {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [scopeFilter, setScopeFilter] = useState<'all' | 'b2c' | 'b2b'>('all');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Create form state
  const [newSlug, setNewSlug] = useState('');
  const [newParentId, setNewParentId] = useState<string>('');
  const [newScope, setNewScope] = useState<CategoryScope>('both');
  const [newNameEn, setNewNameEn] = useState('');
  const [newNameNo, setNewNameNo] = useState('');
  const [newNameIt, setNewNameIt] = useState('');
  const [newNameVn, setNewNameVn] = useState('');

  // WordPress XML import state
  const [wpXml, setWpXml] = useState('');
  const [wpScope, setWpScope] = useState<CategoryScope>('both');

  const loadCategories = async () => {
    const res = await fetch('/api/admin/categories', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.categories)) setCategories(data.categories);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [authToken]);

  const persistReorder = async (nextList: CategoryRecord[]) => {
    setCategories(nextList);
    const res = await fetch('/api/admin/categories/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ orderedIds: nextList.map((c) => c.id) }),
    });
    if (res.ok) {
      setFeedback('Category order saved for Storefront & B2B.');
      onRefreshStorefront();
    }
  };

  const handleMove = async (idx: number, delta: -1 | 1) => {
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= categories.length) return;
    const copy = [...categories];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    await persistReorder(copy);
  };

  const handleDrop = async (dropIdx: number) => {
    if (dragIndex === null || dragIndex === dropIdx) {
      setDragIndex(null);
      return;
    }
    const copy = [...categories];
    const [moved] = copy.splice(dragIndex, 1);
    copy.splice(dropIdx, 0, moved);
    setDragIndex(null);
    await persistReorder(copy);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameEn.trim()) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          slug: newSlug.trim() || newNameEn.trim(),
          parent_id: newParentId ? Number(newParentId) : null,
          scope: newScope,
          active: true,
          sort_order: (categories.length + 1) * 10,
          name_en: newNameEn.trim(),
          name_no: newNameNo.trim() || newNameEn.trim(),
          name_it: newNameIt.trim() || newNameEn.trim(),
          name_vn: newNameVn.trim() || newNameEn.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewSlug('');
        setNewParentId('');
        setNewNameEn('');
        setNewNameNo('');
        setNewNameIt('');
        setNewNameVn('');
        setFeedback('Created category and updated hierarchy.');
        await loadCategories();
        onRefreshStorefront();
      } else {
        setFeedback(data.error || 'Could not create category.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handlePatchCategory = async (
    cat: CategoryRecord,
    patch: Partial<{
      parent_id: number | null;
      scope: CategoryScope;
      active: boolean;
      name_en: string;
      name_no: string;
      name_it: string;
      name_vn: string;
    }>
  ) => {
    const res = await fetch(`/api/admin/categories/${cat.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      await loadCategories();
      onRefreshStorefront();
    }
  };

  const handleDeleteCategory = async (cat: CategoryRecord) => {
    const res = await fetch(`/api/admin/categories/${cat.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      setFeedback(`Deleted category "${cat.name_en}".`);
      await loadCategories();
      onRefreshStorefront();
    }
  };

  const handleImportWpXml = async () => {
    if (!wpXml.trim()) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/categories/import-wp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ xmlText: wpXml, scope: wpScope }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(
          `WordPress XML imported: ${data.importedCount} new categories, ${data.updatedCount} updated (${data.total} terms).`
        );
        await loadCategories();
        onRefreshStorefront();
      } else {
        setFeedback(data.error || 'Could not import WordPress XML.');
      }
    } finally {
      setBusy(false);
    }
  };

  const catById = new Map(categories.map((c) => [c.id, c]));
  const filtered = categories.filter((c) => {
    const sc = c.scope || 'both';
    if (scopeFilter === 'b2c') return sc === 'both' || sc === 'b2c';
    if (scopeFilter === 'b2b') return sc === 'both' || sc === 'b2b';
    return true;
  });

  return (
    <div className="space-y-6 text-xs">
      <div className="border-b border-neutral-200 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold uppercase tracking-wide flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-[#142B4E]" />
            <span>Categories, Sub-Categories, Drag-Order & WordPress Import</span>
          </h1>
          <p className="text-neutral-500 mt-0.5">
            Drag rows or use arrows to control B2C & B2B category order, assign Parent/Child relationships, or import from a WordPress WXR XML file.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {(['all', 'b2c', 'b2b'] as const).map((sc) => (
            <button
              key={sc}
              type="button"
              onClick={() => setScopeFilter(sc)}
              className={`px-3 py-1.5 border uppercase font-medium cursor-pointer ${
                scopeFilter === sc
                  ? 'bg-[#142B4E] text-white border-[#142B4E]'
                  : 'bg-white border-neutral-300 text-neutral-700'
              }`}
            >
              {sc === 'all' ? 'All Scopes' : sc.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-[#F4F8F4] border border-[#4F8A47]/40 text-[#2E5D28] font-medium">
          {feedback}
        </div>
      )}

      {/* Drag & Drop Category Tree Table */}
      <div className="border border-neutral-200 bg-white overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F7F7F7] border-b border-neutral-200 text-neutral-600 uppercase text-[11px]">
            <tr>
              <th className="p-3 w-20">Order</th>
              <th className="p-3">Category (EN / NO / IT / VN)</th>
              <th className="p-3">Parent Category</th>
              <th className="p-3">Visibility Scope</th>
              <th className="p-3">Active</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((cat) => {
              const globalIdx = categories.findIndex((c) => c.id === cat.id);
              const parentCat = cat.parent_id ? catById.get(cat.parent_id) : null;
              return (
                <tr
                  key={cat.id}
                  draggable
                  onDragStart={() => setDragIndex(globalIdx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(globalIdx)}
                  className={`hover:bg-neutral-50 transition-colors ${
                    dragIndex === globalIdx ? 'bg-[#142B4E]/10 opacity-70' : ''
                  }`}
                >
                  <td className="p-3 font-mono-tabular">
                    <div className="flex items-center gap-1">
                      <span
                        title="Drag to reorder"
                        className="cursor-grab text-neutral-400 hover:text-[#142B4E]"
                      >
                        <GripVertical className="w-4 h-4" />
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMove(globalIdx, -1)}
                        disabled={globalIdx <= 0}
                        aria-label={`Move ${cat.name_en} up`}
                        className="p-1 border border-neutral-200 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(globalIdx, 1)}
                        disabled={globalIdx >= categories.length - 1}
                        aria-label={`Move ${cat.name_en} down`}
                        className="p-1 border border-neutral-200 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className={`font-semibold text-[#1A1A1A] ${parentCat ? 'pl-4 border-l-2 border-[#142B4E]/30' : ''}`}>
                      {cat.name_en}
                      <span className="ml-2 font-mono-tabular text-[10px] text-neutral-400">
                        /{cat.slug}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      NO: {cat.name_no} · IT: {cat.name_it} · VN: {cat.name_vn}
                    </div>
                  </td>
                  <td className="p-3">
                    <select
                      aria-label={`Parent category for ${cat.name_en}`}
                      value={cat.parent_id ? String(cat.parent_id) : ''}
                      onChange={(e) =>
                        handlePatchCategory(cat, {
                          parent_id: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="px-2 py-1 border border-neutral-300 bg-white text-[11px]"
                    >
                      <option value="">— Top Level —</option>
                      {categories
                        .filter((other) => other.id !== cat.id && !other.parent_id)
                        .map((other) => (
                          <option key={other.id} value={other.id}>
                            {other.name_en}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      aria-label={`Scope for ${cat.name_en}`}
                      value={cat.scope || 'both'}
                      onChange={(e) =>
                        handlePatchCategory(cat, { scope: e.target.value as CategoryScope })
                      }
                      className="px-2 py-1 border border-neutral-300 bg-white uppercase font-medium text-[11px]"
                    >
                      <option value="both">Both B2C & B2B</option>
                      <option value="b2c">B2C Retail Only</option>
                      <option value="b2b">B2B Corporate Only</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cat.active !== false}
                        onChange={(e) => handlePatchCategory(cat, { active: e.target.checked })}
                        className="accent-[#142B4E]"
                      />
                      <span>{cat.active !== false ? 'Shown' : 'Hidden'}</span>
                    </label>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      aria-label={`Delete ${cat.name_en}`}
                      className="p-1.5 text-neutral-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Create Parent / Sub Category */}
        <form onSubmit={handleCreateCategory} className="border border-neutral-200 bg-white p-5 space-y-3">
          <div className="font-semibold uppercase tracking-wider text-[#142B4E] flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Add Category / Sub-Category</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-neutral-500 mb-1">English Title *</label>
              <input
                required
                value={newNameEn}
                onChange={(e) => setNewNameEn(e.target.value)}
                placeholder="e.g. Tuxedo Shirts"
                className="w-full px-3 py-1.5 border border-neutral-300"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-500 mb-1">Slug (optional)</label>
              <input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="tuxedo-shirts"
                className="w-full px-3 py-1.5 border border-neutral-300 font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-500 mb-1">Norwegian (NO)</label>
              <input
                value={newNameNo}
                onChange={(e) => setNewNameNo(e.target.value)}
                placeholder="Smokingskjorter"
                className="w-full px-3 py-1.5 border border-neutral-300"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-500 mb-1">Italian (IT)</label>
              <input
                value={newNameIt}
                onChange={(e) => setNewNameIt(e.target.value)}
                placeholder="Camicie Smoking"
                className="w-full px-3 py-1.5 border border-neutral-300"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-500 mb-1">Vietnamese (VN)</label>
              <input
                value={newNameVn}
                onChange={(e) => setNewNameVn(e.target.value)}
                placeholder="Áo Sơ Mi Tuxedo"
                className="w-full px-3 py-1.5 border border-neutral-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">Parent</label>
                <select
                  value={newParentId}
                  onChange={(e) => setNewParentId(e.target.value)}
                  className="w-full px-2 py-1.5 border border-neutral-300 bg-white"
                >
                  <option value="">Top Level</option>
                  {categories
                    .filter((c) => !c.parent_id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name_en}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">Scope</label>
                <select
                  value={newScope}
                  onChange={(e) => setNewScope(e.target.value as CategoryScope)}
                  className="w-full px-2 py-1.5 border border-neutral-300 bg-white"
                >
                  <option value="both">Both</option>
                  <option value="b2c">B2C</option>
                  <option value="b2b">B2B</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 bg-[#142B4E] text-white uppercase tracking-wider font-medium cursor-pointer"
          >
            Create Category
          </button>
        </form>

        {/* WordPress / WooCommerce WXR XML Category Importer */}
        <div className="border border-neutral-200 bg-white p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-semibold uppercase tracking-wider text-[#142B4E] flex items-center gap-1.5">
                <Upload className="w-4 h-4" />
                <span>WordPress / WooCommerce XML Category Import</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Upload a WordPress Tools → Export XML file or paste WXR XML containing{' '}
                <code>&lt;wp:term&gt;</code> or <code>&lt;wp:category&gt;</code> hierarchy.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWpXml(SAMPLE_WP_WXR_XML)}
                className="px-2.5 py-1 border border-neutral-300 bg-[#FAFAFA] hover:bg-neutral-100 text-[11px] cursor-pointer"
              >
                Load Sample XML
              </button>
              <label className="px-2.5 py-1 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E]/5 text-[11px] cursor-pointer">
                <span>Upload .xml</span>
                <input
                  type="file"
                  accept=".xml,text/xml,application/xml"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) f.text().then((t) => setWpXml(t));
                  }}
                />
              </label>
            </div>
          </div>

          <textarea
            rows={5}
            value={wpXml}
            onChange={(e) => setWpXml(e.target.value)}
            placeholder="Paste WordPress WXR XML here..."
            aria-label="WordPress WXR XML import text"
            className="w-full p-2.5 border border-neutral-300 font-mono-tabular text-[11px] outline-none focus:border-[#142B4E]"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <select
              value={wpScope}
              onChange={(e) => setWpScope(e.target.value as CategoryScope)}
              aria-label="Default scope for imported WordPress categories"
              className="px-2.5 py-1.5 border border-neutral-300 bg-white"
            >
              <option value="both">Assign Scope: Both B2C & B2B</option>
              <option value="b2c">Assign Scope: B2C Only</option>
              <option value="b2b">Assign Scope: B2B Only</option>
            </select>
            <button
              type="button"
              disabled={busy || !wpXml.trim()}
              onClick={handleImportWpXml}
              className="px-4 py-2 bg-[#142B4E] text-white uppercase tracking-wider font-medium disabled:opacity-50 cursor-pointer"
            >
              Import WP Categories
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
