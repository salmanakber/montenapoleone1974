import React, { useMemo, useRef, useState } from 'react';
import { Check, Copy, FolderOpen, ImagePlus, Search, Trash2, UploadCloud } from 'lucide-react';
import type { MediaAsset } from '../types.ts';

interface MediaLibraryPanelProps {
  authToken: string;
  media: MediaAsset[];
  pickerMode?: boolean;
  onRefresh: () => void;
  onSelectMedia?: (asset: MediaAsset) => void;
}

const FOLDERS: Array<MediaAsset['folder'] | 'all'> = [
  'all',
  'products',
  'editorial',
  'hero',
  'tailoring',
  'uploads',
];

export const MediaLibraryPanel: React.FC<MediaLibraryPanelProps> = ({
  authToken,
  media,
  pickerMode = false,
  onRefresh,
  onSelectMedia,
}) => {
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [uploadFolder, setUploadFolder] = useState<MediaAsset['folder']>('uploads');
  const [selectedId, setSelectedId] = useState<number | null>(media[0]?.id ?? null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const [editAlt, setEditAlt] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return media.filter((m) => {
      if (selectedFolder !== 'all' && m.folder !== selectedFolder) return false;
      if (!q) return true;
      return (
        m.original_name.toLowerCase().includes(q) ||
        m.alt_text.toLowerCase().includes(q) ||
        m.caption.toLowerCase().includes(q)
      );
    });
  }, [media, selectedFolder, search]);

  const activeAsset = useMemo(
    () => media.find((m) => m.id === selectedId) || filtered[0] || null,
    [media, selectedId, filtered]
  );

  React.useEffect(() => {
    if (activeAsset) {
      setEditAlt(activeAsset.alt_text);
      setEditCaption(activeAsset.caption);
    }
  }, [activeAsset?.id]);

  const selectAsset = (asset: MediaAsset) => {
    setSelectedId(asset.id);
    setEditAlt(asset.alt_text);
    setEditCaption(asset.caption);
  };

  const toggleBulkId = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteMedia = async () => {
    if (selectedIds.length === 0 || bulkDeleting) return;
    setBulkDeleting(true);
    setError(null);
    setBulkFeedback(null);
    try {
      const res = await fetch('/api/admin/media/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Bulk delete failed.');
        return;
      }
      if (selectedId && selectedIds.includes(selectedId)) {
        setSelectedId(null);
      }
      setBulkFeedback(`Deleted ${data.deletedCount ?? selectedIds.length} media file(s).`);
      setSelectedIds([]);
      onRefresh();
    } catch {
      setError('Network error deleting selected media.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        form.append('folder', uploadFolder);
        form.append('alt_text', file.name.replace(/\.[^.]+$/, ''));

        const res = await fetch('/api/admin/media/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
          body: form,
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Upload failed.');
          break;
        }
        if (data.media?.id) {
          setSelectedId(data.media.id);
          setEditAlt(data.media.alt_text);
          setEditCaption(data.media.caption);
        }
      }
      onRefresh();
    } catch {
      setError('Upload failed due to a network error.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveMeta = async () => {
    if (!activeAsset) return;
    setSavingMeta(true);
    try {
      await fetch(`/api/admin/media/${activeAsset.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          alt_text: editAlt || activeAsset.alt_text,
          caption: editCaption,
        }),
      });
      onRefresh();
    } finally {
      setSavingMeta(false);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/admin/media/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      if (selectedId === id) setSelectedId(null);
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      onRefresh();
    }
  };

  const handleCopyUrl = (asset: MediaAsset) => {
    navigator.clipboard?.writeText(asset.url).catch(() => {});
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((m) => selectedIds.includes(m.id));

  return (
    <div className="space-y-5">
      {/* Drag-and-Drop Upload Bar */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed p-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${
          dragOver ? 'border-[#142B4E] bg-[#142B4E]/5' : 'border-neutral-300 bg-[#FAFAFA]'
        }`}
      >
        <div className="flex items-center gap-3">
          <UploadCloud className="w-6 h-6 text-[#142B4E] shrink-0" />
          <div>
            <div className="text-xs font-semibold text-[#1A1A1A]">
              WordPress-Style Media Library · Drag & Drop JPG, PNG, WebP (max 8MB)
            </div>
            <div className="text-[11px] text-neutral-500">
              Files are stored cleanly on the Node.js server and ready for products, hero sliders, and lookbooks.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            aria-label="Target media folder"
            value={uploadFolder}
            onChange={(e) => setUploadFolder(e.target.value as MediaAsset['folder'])}
            className="px-2.5 py-2 text-xs border border-neutral-300 bg-white outline-none"
          >
            <option value="uploads">Folder: uploads</option>
            <option value="products">Folder: products</option>
            <option value="editorial">Folder: editorial</option>
            <option value="hero">Folder: hero</option>
          </select>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-wider font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ImagePlus className="w-3.5 h-3.5" />
            <span>{uploading ? 'Uploading...' : 'Upload Media'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
      )}
      {bulkFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{bulkFeedback}</div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 bg-neutral-100 p-1 rounded-lg">
          {FOLDERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setSelectedFolder(f)}
              className={`px-3 py-1.5 text-xs rounded-md capitalize transition-colors cursor-pointer ${
                selectedFolder === f
                  ? 'bg-white text-[#1A1A1A] font-medium shadow-sm'
                  : 'text-neutral-600 hover:text-[#1A1A1A]'
              }`}
            >
              {f === 'all' ? 'All Media' : f}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search media..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-300 bg-white outline-none focus:border-[#142B4E]"
          />
        </div>
      </div>

      {/* Bulk Selection Bar */}
      <div
        data-testid="media-bulk-bar"
        className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 bg-[#FAFAFA] border border-neutral-200 text-xs"
      >
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-[#142B4E]">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds((prev) => Array.from(new Set([...prev, ...filtered.map((m) => m.id)])));
                } else {
                  const visSet = new Set(filtered.map((m) => m.id));
                  setSelectedIds((prev) => prev.filter((id) => !visSet.has(id)));
                }
              }}
            />
            <span>Select All Visible ({filtered.length})</span>
          </label>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-[11px] text-neutral-500 hover:text-black underline cursor-pointer"
            >
              Clear ({selectedIds.length})
            </button>
          )}
        </div>

        <button
          type="button"
          data-testid="media-bulk-delete-btn"
          disabled={selectedIds.length === 0 || bulkDeleting}
          onClick={handleBulkDeleteMedia}
          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-neutral-300 text-white text-[11px] uppercase tracking-wider font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}</span>
        </button>
      </div>

      {/* Main Media Grid + Attachment Inspector Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {filtered.map((asset) => {
            const isSelected = activeAsset?.id === asset.id;
            const isChecked = selectedIds.includes(asset.id);
            return (
              <div
                key={asset.id}
                className={`group relative border p-1.5 bg-white transition-all ${
                  isSelected
                    ? 'border-[#142B4E] ring-2 ring-[#142B4E]/30'
                    : isChecked
                    ? 'border-red-400 ring-1 ring-red-300'
                    : 'border-neutral-200 hover:border-neutral-400'
                }`}
              >
                <label
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-2.5 left-2.5 z-10 w-5 h-5 bg-white/95 border border-neutral-400 rounded flex items-center justify-center shadow-sm cursor-pointer"
                  aria-label={`Select ${asset.original_name}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleBulkId(asset.id)}
                    className="accent-[#142B4E] cursor-pointer"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => selectAsset(asset)}
                  className="w-full text-left cursor-pointer"
                >
                  <div className="aspect-square bg-[#E6E6E6] overflow-hidden">
                    <img
                      src={asset.url}
                      alt={asset.alt_text || asset.original_name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="mt-1.5 px-1">
                    <div className="text-[11px] font-medium truncate text-[#1A1A1A]">
                      {asset.original_name}
                    </div>
                    <div className="text-[10px] font-mono-tabular text-neutral-500 flex justify-between">
                      <span>{asset.folder}</span>
                      <span>{Math.max(1, Math.round(asset.size_bytes / 1024))} KB</span>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Right Attachment Details Panel */}
        <aside className="lg:col-span-4 border border-neutral-200 bg-[#FAFAFA] p-4 space-y-4">
          {activeAsset ? (
            <>
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Attachment Details</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(activeAsset.id)}
                  aria-label={`Delete ${activeAsset.original_name}`}
                  className="text-xs text-red-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              <div className="aspect-[4/3] bg-[#E6E6E6] overflow-hidden border border-neutral-200">
                <img
                  src={activeAsset.url}
                  alt={activeAsset.alt_text}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="text-[11px] font-mono-tabular text-neutral-600 space-y-0.5">
                <div className="truncate font-medium text-[#1A1A1A]">{activeAsset.original_name}</div>
                <div>
                  {activeAsset.mime_type} · {activeAsset.width}×{activeAsset.height} ·{' '}
                  {Math.max(1, Math.round(activeAsset.size_bytes / 1024))} KB
                </div>
                <div>Uploaded by {activeAsset.uploaded_by}</div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={activeAsset.url}
                  className="flex-1 px-2.5 py-1.5 text-[11px] font-mono-tabular border border-neutral-300 bg-white text-neutral-600"
                />
                <button
                  type="button"
                  onClick={() => handleCopyUrl(activeAsset)}
                  className="px-2.5 py-1.5 border border-neutral-300 bg-white hover:bg-neutral-100 text-xs inline-flex items-center gap-1 cursor-pointer"
                >
                  {copiedId === activeAsset.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#4F8A47]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-neutral-200">
                <div>
                  <label className="block text-[11px] text-neutral-600 mb-1">Alt Text (SEO)</label>
                  <input
                    value={editAlt || activeAsset.alt_text}
                    onChange={(e) => setEditAlt(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 bg-white outline-none focus:border-[#142B4E]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-600 mb-1">Caption</label>
                  <input
                    value={editCaption || activeAsset.caption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 bg-white outline-none focus:border-[#142B4E]"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={savingMeta}
                    onClick={handleSaveMeta}
                    className="flex-1 py-2 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E] hover:text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    {savingMeta ? 'Saving...' : 'Save Metadata'}
                  </button>
                  {pickerMode && onSelectMedia && (
                    <button
                      type="button"
                      onClick={() => onSelectMedia(activeAsset)}
                      className="flex-1 py-2 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs font-medium cursor-pointer"
                    >
                      Use Image
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-neutral-500 py-10 text-center">
              Select a media asset to inspect or edit metadata.
            </div>
          )}
        </aside>
      </div>

      {pickerMode && onSelectMedia && (
        <div
          data-testid="media-picker-sticky-bar"
          className="sticky bottom-0 z-20 -mx-6 -mb-6 px-6 py-3.5 bg-white/95 backdrop-blur-md border-t border-neutral-200 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] flex flex-wrap items-center justify-between gap-3"
        >
          {activeAsset ? (
            <>
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={activeAsset.url}
                  alt={activeAsset.alt_text || activeAsset.original_name}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 object-cover border border-neutral-200 bg-[#F4F4F4] shrink-0"
                />
                <div className="min-w-0 text-xs">
                  <div className="font-semibold text-[#142B4E] truncate max-w-[260px] sm:max-w-md">
                    {activeAsset.original_name}
                  </div>
                  <div className="text-[11px] font-mono-tabular text-neutral-500 truncate max-w-[260px] sm:max-w-md">
                    {activeAsset.url}
                  </div>
                </div>
              </div>
              <button
                type="button"
                data-testid="media-picker-choose-btn"
                onClick={() => onSelectMedia(activeAsset)}
                className="px-6 py-2.5 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-[0.16em] font-semibold inline-flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Choose Image</span>
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-between text-xs text-neutral-500">
              <span>Click any image above to select it.</span>
              <span className="px-5 py-2 bg-neutral-200 text-neutral-500 uppercase tracking-wider font-medium">
                Choose Image
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
