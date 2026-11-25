import React, { useEffect, useState } from 'react';
import {
  Bot,
  Check,
  Gift,
  Image as ImageIcon,
  Layers,
  Megaphone,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  AiAdminSettings,
  BulkDiscountSettings,
  HeroSlideRecord,
  HomePageSettings,
  PromotionPopupSettings,
  TopBannerSettings,
  TopBannerVisibility,
} from '../types.ts';
import { DEFAULT_HOME_PAGE_SETTINGS, DEFAULT_TOP_BANNER_SETTINGS } from '../utils/commerce.ts';

// ---------------------------------------------------------------------------
// 1. HERO SLIDER MANAGER PANEL
// ---------------------------------------------------------------------------

interface HeroSliderAdminPanelProps {
  authToken: string;
  slides: HeroSlideRecord[];
  onRefresh: () => void;
  onRefreshStorefront: () => void;
  onPickImage: (cb: (url: string) => void) => void;
}

export const HeroSliderAdminPanel: React.FC<HeroSliderAdminPanelProps> = ({
  authToken,
  slides,
  onRefresh,
  onRefreshStorefront,
  onPickImage,
}) => {
  const [drafts, setDrafts] = useState<HeroSlideRecord[]>(slides);
  const [busyId, setBusyId] = useState<number | 'new' | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Create slide state
  const [newImage, setNewImage] = useState(
    '/src/assets/images/hero_linen_ivory_1795248292749.jpg'
  );
  const [newTitleEn, setNewTitleEn] = useState('');
  const [newSubtitleEn, setNewSubtitleEn] = useState('');
  const [newCtaEn, setNewCtaEn] = useState('Explore Collection');
  const [newShowText, setNewShowText] = useState(true);
  const [newShowButton, setNewShowButton] = useState(true);

  useEffect(() => {
    setDrafts(slides);
  }, [slides]);

  const updateDraft = (id: number, patch: Partial<HeroSlideRecord>) => {
    setDrafts((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleSaveSlide = async (slide: HeroSlideRecord) => {
    setBusyId(slide.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/hero-slides/${slide.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(slide),
      });
      if (!res.ok) {
        const d = await res.json();
        setFeedback(d.error || 'Failed to save hero slide.');
        return;
      }
      setFeedback(`Saved Hero Slide #${slide.id} ("${slide.title_en}")`);
      onRefresh();
      onRefreshStorefront();
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleEn.trim()) return;
    setBusyId('new');
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/hero-slides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sort_order: drafts.length + 1,
          active: true,
          image_url: newImage,
          target_type: 'category',
          target_value: 'all',
          show_text: newShowText,
          show_button: newShowButton,
          title_en: newTitleEn.trim(),
          subtitle_en: newSubtitleEn.trim(),
          cta_en: newCtaEn.trim(),
        }),
      });
      if (!res.ok) {
        setFeedback('Could not create slide.');
        return;
      }
      setNewTitleEn('');
      setNewSubtitleEn('');
      setFeedback('Created new hero banner slide.');
      onRefresh();
      onRefreshStorefront();
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteSlide = async (id: number) => {
    setBusyId(id);
    try {
      await fetch(`/api/admin/hero-slides/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setFeedback(`Deleted Hero Slide #${id}`);
      onRefresh();
      onRefreshStorefront();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-3">
        <h1 className="text-base font-semibold uppercase tracking-wide flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#142B4E]" />
          <span>Home Page · Hero Slider (EN / NO / IT / VN)</span>
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Hero banners plus main-page sections (All Men’s Shirts, editorial cards, size guide, advice & inspiration). Edit copy per language below.
        </p>
      </div>

      {feedback && (
        <div className="p-3 border border-[#4F8A47]/40 bg-[#4F8A47]/10 text-[#2E5A28] text-xs font-medium">
          {feedback}
        </div>
      )}

      {/* Existing Slides */}
      <div className="space-y-4">
        {drafts.map((slide) => (
          <div key={slide.id} className="border border-neutral-200 bg-white p-5 space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-semibold text-sm">{slide.title_en}</div>
                  <div className="text-[11px] text-neutral-500 font-mono-tabular">
                    Slide #{slide.id} · Order {slide.sort_order}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slide.active}
                    onChange={(e) => updateDraft(slide.id, { active: e.target.checked })}
                    className="accent-[#142B4E]"
                  />
                  <span>Active</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-[#142B4E]">
                  <input
                    type="checkbox"
                    checked={slide.show_text}
                    onChange={(e) => updateDraft(slide.id, { show_text: e.target.checked })}
                    className="accent-[#142B4E]"
                  />
                  <span>Show Text Overlay</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-[#142B4E]">
                  <input
                    type="checkbox"
                    checked={slide.show_button}
                    onChange={(e) => updateDraft(slide.id, { show_button: e.target.checked })}
                    className="accent-[#142B4E]"
                  />
                  <span>Show CTA Button</span>
                </label>
              </div>
            </div>

            <div className="relative w-full h-44 sm:h-56 overflow-hidden bg-[#8D826E] border border-black/10">
              <img
                src={slide.image_url}
                alt={slide.title_en}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <div className="text-[10px] uppercase tracking-wider text-white/70">
                  Full-screen preview (object-cover · centered)
                </div>
                <div className="text-sm font-medium tracking-wide uppercase truncate">
                  {slide.title_en || 'Untitled slide'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase text-neutral-500 mb-1">Banner Image URL</label>
                <div className="flex gap-1.5">
                  <input
                    value={slide.image_url}
                    onChange={(e) => updateDraft(slide.id, { image_url: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 border border-neutral-300 font-mono-tabular"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onPickImage((url) => updateDraft(slide.id, { image_url: url }))
                    }
                    className="px-2.5 py-1.5 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E] hover:text-white inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Pick</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-neutral-500 mb-1">Target Type</label>
                <select
                  value={slide.target_type}
                  onChange={(e) =>
                    updateDraft(slide.id, {
                      target_type: e.target.value === 'view' ? 'view' : 'category',
                    })
                  }
                  className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white"
                >
                  <option value="category">Catalog Category</option>
                  <option value="view">Page View (b2b / about)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-neutral-500 mb-1">Target Value & Order</label>
                <div className="flex gap-1.5">
                  <input
                    value={slide.target_value}
                    onChange={(e) => updateDraft(slide.id, { target_value: e.target.value })}
                    className="flex-1 min-w-0 px-2.5 py-1.5 border border-neutral-300 font-mono-tabular"
                    placeholder="all / linen / b2b"
                  />
                  <input
                    type="number"
                    value={slide.sort_order}
                    onChange={(e) => updateDraft(slide.id, { sort_order: Number(e.target.value) })}
                    className="w-16 px-2 py-1.5 border border-neutral-300 font-mono-tabular"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#FAFAFA] p-3 border border-neutral-200">
              {(['en', 'no', 'it', 'vn'] as const).map((rc) => {
                const titleKey = `title_${rc}` as keyof HeroSlideRecord;
                const subKey = `subtitle_${rc}` as keyof HeroSlideRecord;
                const ctaKey = `cta_${rc}` as keyof HeroSlideRecord;
                return (
                  <div key={rc} className="space-y-1.5">
                    <div className="font-semibold uppercase text-[#142B4E]">{rc.toUpperCase()} Copy</div>
                    <input
                      value={String(slide[titleKey] || '')}
                      onChange={(e) => updateDraft(slide.id, { [titleKey]: e.target.value })}
                      placeholder={`Title (${rc.toUpperCase()})`}
                      className="w-full px-2 py-1 border border-neutral-300 bg-white"
                    />
                    <input
                      value={String(slide[subKey] || '')}
                      onChange={(e) => updateDraft(slide.id, { [subKey]: e.target.value })}
                      placeholder={`Subtitle (${rc.toUpperCase()})`}
                      className="w-full px-2 py-1 border border-neutral-300 bg-white"
                    />
                    <input
                      value={String(slide[ctaKey] || '')}
                      onChange={(e) => updateDraft(slide.id, { [ctaKey]: e.target.value })}
                      placeholder={`Button (${rc.toUpperCase()})`}
                      className="w-full px-2 py-1 border border-neutral-300 bg-white"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => handleDeleteSlide(slide.id)}
                disabled={busyId === slide.id || drafts.length <= 1}
                className="px-3 py-1.5 border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveSlide(slide)}
                disabled={busyId === slide.id}
                className="px-4 py-1.5 bg-[#142B4E] hover:bg-[#0f213d] text-white uppercase tracking-wider font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{busyId === slide.id ? 'Saving...' : 'Save Slide'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Slide */}
      <form
        onSubmit={handleCreateSlide}
        className="border border-neutral-200 bg-[#FAFAFA] p-5 space-y-3 text-xs"
      >
        <div className="font-semibold uppercase tracking-wider text-[#142B4E] flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          <span>Add New Hero Slide</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            required
            value={newTitleEn}
            onChange={(e) => setNewTitleEn(e.target.value)}
            placeholder="Headline (e.g. THE MILANESE POPLIN EDIT)"
            className="px-3 py-2 border border-neutral-300 bg-white"
          />
          <input
            value={newSubtitleEn}
            onChange={(e) => setNewSubtitleEn(e.target.value)}
            placeholder="Subtitle text"
            className="px-3 py-2 border border-neutral-300 bg-white"
          />
          <input
            value={newCtaEn}
            onChange={(e) => setNewCtaEn(e.target.value)}
            placeholder="Button text"
            className="px-3 py-2 border border-neutral-300 bg-white"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-[240px]">
            <input
              value={newImage}
              onChange={(e) => setNewImage(e.target.value)}
              className="flex-1 px-3 py-2 border border-neutral-300 bg-white font-mono-tabular"
            />
            <button
              type="button"
              onClick={() => onPickImage((url) => setNewImage(url))}
              className="px-3 py-2 border border-[#142B4E] text-[#142B4E] bg-white inline-flex items-center gap-1 cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Media</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={newShowText}
                onChange={(e) => setNewShowText(e.target.checked)}
                className="accent-[#142B4E]"
              />
              <span>Show Text</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={newShowButton}
                onChange={(e) => setNewShowButton(e.target.checked)}
                className="accent-[#142B4E]"
              />
              <span>Show Button</span>
            </label>
            <button
              type="submit"
              disabled={busyId === 'new'}
              className="px-5 py-2 bg-[#142B4E] text-white uppercase tracking-wider font-medium cursor-pointer"
            >
              {busyId === 'new' ? 'Adding...' : 'Create Hero Slide'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 1b. HOME / MAIN PAGE SECTION SETTINGS
// ---------------------------------------------------------------------------

interface HomePageSettingsAdminPanelProps {
  authToken: string;
  homePage: HomePageSettings;
  onRefresh: () => void;
  onRefreshStorefront: () => void;
  onPickImage: (cb: (url: string) => void) => void;
}

const LocFields: React.FC<{
  label: string;
  field: keyof HomePageSettings;
  draft: HomePageSettings;
  multiline?: boolean;
  onChange: (field: keyof HomePageSettings, value: string) => void;
}> = ({ label, field, draft, multiline, onChange }) => {
  const langs = [
    { code: 'en', key: `${String(field).replace(/_en$|_no$|_it$|_vn$/, '')}_en` as keyof HomePageSettings },
    { code: 'no', key: `${String(field).replace(/_en$|_no$|_it$|_vn$/, '')}_no` as keyof HomePageSettings },
    { code: 'it', key: `${String(field).replace(/_en$|_no$|_it$|_vn$/, '')}_it` as keyof HomePageSettings },
    { code: 'vn', key: `${String(field).replace(/_en$|_no$|_it$|_vn$/, '')}_vn` as keyof HomePageSettings },
  ];
  // field is expected like "casualTitle_en" — derive base
  const base = String(field).replace(/_(en|no|it|vn)$/, '');
  const rows = (['en', 'no', 'it', 'vn'] as const).map((code) => {
    const key = `${base}_${code}` as keyof HomePageSettings;
    return { code, key };
  });
  void langs;
  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium">{label}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map(({ code, key }) =>
          multiline ? (
            <label key={code} className="block">
              <span className="text-[10px] text-neutral-400 uppercase">{code}</span>
              <textarea
                rows={3}
                value={String(draft[key] || '')}
                onChange={(e) => onChange(key, e.target.value)}
                className="mt-0.5 w-full px-2.5 py-1.5 border border-neutral-300 text-xs outline-none focus:border-[#142B4E]"
              />
            </label>
          ) : (
            <label key={code} className="block">
              <span className="text-[10px] text-neutral-400 uppercase">{code}</span>
              <input
                value={String(draft[key] || '')}
                onChange={(e) => onChange(key, e.target.value)}
                className="mt-0.5 w-full px-2.5 py-1.5 border border-neutral-300 text-xs outline-none focus:border-[#142B4E]"
              />
            </label>
          )
        )}
      </div>
    </div>
  );
};

export const HomePageSettingsAdminPanel: React.FC<HomePageSettingsAdminPanelProps> = ({
  authToken,
  homePage,
  onRefresh,
  onRefreshStorefront,
  onPickImage,
}) => {
  const [draft, setDraft] = useState<HomePageSettings>(homePage || DEFAULT_HOME_PAGE_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setDraft(homePage || DEFAULT_HOME_PAGE_SETTINGS);
  }, [homePage]);

  const setField = (field: keyof HomePageSettings, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/site-settings/home_page', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || 'Failed to save homepage settings.');
        return;
      }
      setFeedback('Home / main page settings saved for EN · NO · IT · VN.');
      if (data.homePage) setDraft(data.homePage);
      onRefresh();
      onRefreshStorefront();
    } catch {
      setFeedback('Network error saving homepage settings.');
    } finally {
      setBusy(false);
    }
  };

  const ImageRow: React.FC<{
    label: string;
    field: keyof HomePageSettings;
  }> = ({ label, field }) => (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">{label}</div>
      <div className="flex gap-2 items-start">
        <img
          src={String(draft[field] || '')}
          alt=""
          referrerPolicy="no-referrer"
          className="w-24 h-16 object-cover border border-black/10 bg-[#E6E6E6] shrink-0"
        />
        <div className="flex-1 flex gap-1.5">
          <input
            value={String(draft[field] || '')}
            onChange={(e) => setField(field, e.target.value)}
            className="flex-1 px-2.5 py-1.5 border border-neutral-300 font-mono-tabular text-[11px]"
          />
          <button
            type="button"
            onClick={() => onPickImage((url) => setField(field, url))}
            className="px-2.5 py-1.5 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E] hover:text-white inline-flex items-center gap-1 cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Pick
          </button>
        </div>
      </div>
    </div>
  );

  const TargetRow: React.FC<{
    typeField: keyof HomePageSettings;
    valueField: keyof HomePageSettings;
  }> = ({ typeField, valueField }) => (
    <div className="grid grid-cols-2 gap-2">
      <label className="block">
        <span className="text-[10px] text-neutral-500 uppercase">Link type</span>
        <select
          value={String(draft[typeField] || 'category')}
          onChange={(e) => setField(typeField, e.target.value)}
          className="mt-0.5 w-full px-2.5 py-1.5 border border-neutral-300 bg-white text-xs"
        >
          <option value="category">Catalog category</option>
          <option value="view">Page view (b2b / about)</option>
        </select>
      </label>
      <label className="block">
        <span className="text-[10px] text-neutral-500 uppercase">Target</span>
        <input
          value={String(draft[valueField] || '')}
          onChange={(e) => setField(valueField, e.target.value)}
          placeholder="linen / business / b2b / about"
          className="mt-0.5 w-full px-2.5 py-1.5 border border-neutral-300 text-xs font-mono-tabular"
        />
      </label>
    </div>
  );

  return (
    <form onSubmit={save} className="border border-neutral-200 bg-white p-5 space-y-6 text-xs">
      <div className="border-b border-neutral-100 pb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#142B4E]">
          Main Page Sections
        </h2>
        <p className="text-[11px] text-neutral-500 mt-0.5">
          Edit All Men’s Shirts, Casual / B2B / Business cards, Size Guide, and Advice & Inspiration — each with EN / NO / IT / VN copy and images.
        </p>
      </div>

      {feedback && (
        <div className="px-3 py-2 border border-[#4F8A47]/40 bg-[#4F8A47]/10 text-[#2E5A28] font-medium">
          {feedback}
        </div>
      )}

      <section className="space-y-3 border border-neutral-100 p-4 bg-[#FAFAFA]">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#142B4E]">
          All Men’s Shirts strip
        </h3>
        <LocFields label="Section title" field="featuredTitle_en" draft={draft} onChange={setField} />
        <LocFields label="CTA label" field="featuredCta_en" draft={draft} onChange={setField} />
      </section>

      <section className="space-y-3 border border-neutral-100 p-4 bg-[#FAFAFA]">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#142B4E]">
          Editorial card · Casual Linen
        </h3>
        <LocFields label="Title" field="casualTitle_en" draft={draft} onChange={setField} />
        <LocFields label="Description" field="casualDesc_en" draft={draft} multiline onChange={setField} />
        <ImageRow label="Image" field="casualImage" />
        <TargetRow typeField="casualTargetType" valueField="casualTargetValue" />
      </section>

      <section className="space-y-3 border border-neutral-100 p-4 bg-[#FAFAFA]">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#142B4E]">
          Editorial card · Corporate / B2B
        </h3>
        <LocFields label="Title" field="b2bTitle_en" draft={draft} onChange={setField} />
        <LocFields label="Description" field="b2bDesc_en" draft={draft} multiline onChange={setField} />
        <ImageRow label="Image" field="b2bImage" />
        <TargetRow typeField="b2bTargetType" valueField="b2bTargetValue" />
      </section>

      <section className="space-y-3 border border-neutral-100 p-4 bg-[#FAFAFA]">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#142B4E]">
          Editorial card · Business Shirts
        </h3>
        <LocFields label="Title" field="businessTitle_en" draft={draft} onChange={setField} />
        <LocFields label="Description" field="businessDesc_en" draft={draft} multiline onChange={setField} />
        <ImageRow label="Image" field="businessImage" />
        <TargetRow typeField="businessTargetType" valueField="businessTargetValue" />
      </section>

      <section className="space-y-3 border border-neutral-100 p-4 bg-[#FAFAFA]">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#142B4E]">
          Guide: How to measure your shirt
        </h3>
        <LocFields label="Title" field="guideTitle_en" draft={draft} onChange={setField} />
        <LocFields label="Subtitle / badge" field="guideSub_en" draft={draft} onChange={setField} />
        <ImageRow label="Image" field="guideImage" />
      </section>

      <section className="space-y-3 border border-neutral-100 p-4 bg-[#FAFAFA]">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#142B4E]">
          Advice & Inspiration
        </h3>
        <LocFields label="Title" field="inspirationTitle_en" draft={draft} onChange={setField} />
        <LocFields label="Subtitle / badge" field="inspirationSub_en" draft={draft} onChange={setField} />
        <ImageRow label="Image" field="inspirationImage" />
        <TargetRow typeField="inspirationTargetType" valueField="inspirationTargetValue" />
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="px-5 py-2.5 bg-[#142B4E] text-white uppercase tracking-wider font-medium cursor-pointer disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save Home Page Settings'}
        </button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// 2. PROMOTIONS (10% FIRST-ORDER POPUP) & BULK PURCHASE DISCOUNTS
// ---------------------------------------------------------------------------

interface PromotionsAndBulkAdminPanelProps {
  authToken: string;
  topBanner?: TopBannerSettings;
  promoRules: PromotionPopupSettings;
  bulkDiscount: BulkDiscountSettings;
  onRefresh: () => void;
  onRefreshStorefront: () => void;
}

export const PromotionsAndBulkAdminPanel: React.FC<PromotionsAndBulkAdminPanelProps> = ({
  authToken,
  topBanner = DEFAULT_TOP_BANNER_SETTINGS,
  promoRules,
  bulkDiscount,
  onRefresh,
  onRefreshStorefront,
}) => {
  const [bannerDraft, setBannerDraft] = useState<TopBannerSettings>(topBanner);
  const [promoDraft, setPromoDraft] = useState<PromotionPopupSettings>(promoRules);
  const [bulkDraft, setBulkDraft] = useState<BulkDiscountSettings>(bulkDiscount);
  const [busy, setBusy] = useState<'banner' | 'promo' | 'bulk' | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setBannerDraft(topBanner);
  }, [topBanner]);

  useEffect(() => {
    setPromoDraft(promoRules);
  }, [promoRules]);

  useEffect(() => {
    setBulkDraft(bulkDiscount);
  }, [bulkDiscount]);

  const saveTopBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('banner');
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/site-settings/top_banner', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(bannerDraft),
      });
      if (!res.ok) {
        setFeedback('Failed to update top announcement banner settings.');
        return;
      }
      setFeedback(
        `Top Promotional Banner saved (${bannerDraft.enabled ? `Visible: ${bannerDraft.visibility}` : 'Disabled'}).`
      );
      onRefresh();
      onRefreshStorefront();
    } finally {
      setBusy(null);
    }
  };

  const savePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('promo');
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/site-settings/promo_rules', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(promoDraft),
      });
      if (!res.ok) {
        setFeedback('Failed to update first-order promo settings.');
        return;
      }
      setFeedback('First-order Mailchimp popup & coupon rules saved cleanly.');
      onRefresh();
      onRefreshStorefront();
    } finally {
      setBusy(null);
    }
  };

  const saveBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('bulk');
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/site-settings/bulk_discount', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(bulkDraft),
      });
      if (!res.ok) {
        setFeedback('Failed to save bulk discount rules.');
        return;
      }
      setFeedback('Tiered bulk purchase discount rules updated across Cart & Checkout.');
      onRefresh();
      onRefreshStorefront();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-3">
        <h1 className="text-base font-semibold uppercase tracking-wide flex items-center gap-2">
          <Gift className="w-4 h-4 text-[#142B4E]" />
          <span>Top Announcement Banner, First-Order Popup & Bulk Discount Rules</span>
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Configure the announcement banner above the navbar (with desktop/mobile visibility rules), the 10% First-Order Mailchimp popup, and multi-shirt bulk quantity tiers.
        </p>
      </div>

      {feedback && (
        <div className="p-3 border border-[#4F8A47]/40 bg-[#4F8A47]/10 text-[#2E5A28] text-xs font-medium">
          {feedback}
        </div>
      )}

      {/* Section 0: Top Promotional Announcement Banner */}
      <form onSubmit={saveTopBanner} className="border border-neutral-200 bg-white p-5 space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
          <div className="font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#142B4E]" />
            <span>0. Top Promotional Announcement Banner (Above Navbar)</span>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-[#142B4E]">
            <input
              type="checkbox"
              checked={bannerDraft.enabled}
              onChange={(e) => setBannerDraft((b) => ({ ...b, enabled: e.target.checked }))}
              className="accent-[#142B4E] w-4 h-4"
            />
            <span>Enable Top Banner</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] text-neutral-500 mb-1">Device Visibility Mode</label>
            <select
              aria-label="Top banner device visibility"
              value={bannerDraft.visibility}
              onChange={(e) =>
                setBannerDraft((b) => ({
                  ...b,
                  visibility: e.target.value as TopBannerVisibility,
                }))
              }
              className="w-full px-3 py-2 border border-neutral-300 bg-white font-medium"
            >
              <option value="both">Desktop & Phone (Both)</option>
              <option value="desktop_only">Desktop Only</option>
              <option value="mobile_only">Phone / Mobile Only</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-neutral-500 mb-1">Click Action Destination</label>
            <select
              aria-label="Top banner destination"
              value={bannerDraft.linkView}
              onChange={(e) =>
                setBannerDraft((b) => ({
                  ...b,
                  linkView: e.target.value as TopBannerSettings['linkView'],
                }))
              }
              className="w-full px-3 py-2 border border-neutral-300 bg-white"
            >
              <option value="catalog">Open Shirts Catalog</option>
              <option value="b2b">Open Corporate B2B Portal</option>
              <option value="about">Open About Us / Heritage</option>
              <option value="none">No Click Link (Text Only)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-neutral-500 mb-1">Catalog Category Filter</label>
            <input
              value={bannerDraft.linkCategory || 'all'}
              onChange={(e) => setBannerDraft((b) => ({ ...b, linkCategory: e.target.value }))}
              placeholder="all / linen / business"
              className="w-full px-3 py-2 border border-neutral-300 font-mono-tabular"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-neutral-500 mb-1">Background</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={bannerDraft.bgColor || '#142B4E'}
                  onChange={(e) => setBannerDraft((b) => ({ ...b, bgColor: e.target.value }))}
                  className="w-8 h-8 border border-neutral-300 p-0 cursor-pointer"
                />
                <input
                  value={bannerDraft.bgColor || '#142B4E'}
                  onChange={(e) => setBannerDraft((b) => ({ ...b, bgColor: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-neutral-300 font-mono-tabular text-[11px]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-neutral-500 mb-1">Text Color</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={bannerDraft.textColor || '#FFFFFF'}
                  onChange={(e) => setBannerDraft((b) => ({ ...b, textColor: e.target.value }))}
                  className="w-8 h-8 border border-neutral-300 p-0 cursor-pointer"
                />
                <input
                  value={bannerDraft.textColor || '#FFFFFF'}
                  onChange={(e) => setBannerDraft((b) => ({ ...b, textColor: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-neutral-300 font-mono-tabular text-[11px]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#FAFAFA] p-4 border border-neutral-200">
          {(['en', 'no', 'it', 'vn'] as const).map((rc) => {
            const key = `text_${rc}` as 'text_en' | 'text_no' | 'text_it' | 'text_vn';
            return (
              <div key={rc}>
                <label className="block text-[10px] uppercase font-semibold text-[#142B4E] mb-1">
                  Announcement Text ({rc.toUpperCase()})
                </label>
                <input
                  value={bannerDraft[key] || ''}
                  onChange={(e) => setBannerDraft((b) => ({ ...b, [key]: e.target.value }))}
                  placeholder={`Promotion text (${rc.toUpperCase()})`}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white"
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div
            className="flex-1 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] truncate text-center border border-black/10"
            style={{
              backgroundColor: bannerDraft.bgColor || '#142B4E',
              color: bannerDraft.textColor || '#FFFFFF',
            }}
          >
            Preview: {bannerDraft.text_en || 'Announcement banner text'}
          </div>
          <button
            type="submit"
            disabled={busy === 'banner'}
            className="px-5 py-2 bg-[#142B4E] text-white uppercase tracking-wider font-medium cursor-pointer shrink-0"
          >
            {busy === 'banner' ? 'Saving...' : 'Save Top Banner'}
          </button>
        </div>
      </form>

      {/* Section A: First-Order Popup & Mailchimp */}
      <form onSubmit={savePromo} className="border border-neutral-200 bg-white p-5 space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
          <div className="font-semibold text-sm uppercase tracking-wider">
            1. First-Order Mailchimp Popup & Coupon Engine
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={promoDraft.popupEnabled}
                onChange={(e) => setPromoDraft((p) => ({ ...p, popupEnabled: e.target.checked }))}
                className="accent-[#142B4E]"
              />
              <span>Enable Popup & Coupon</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={promoDraft.showFloatingButton}
                onChange={(e) =>
                  setPromoDraft((p) => ({ ...p, showFloatingButton: e.target.checked }))
                }
                className="accent-[#142B4E]"
              />
              <span>Show Bottom-Left Floating Button</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={promoDraft.firstOrderOnly}
                onChange={(e) => setPromoDraft((p) => ({ ...p, firstOrderOnly: e.target.checked }))}
                className="accent-[#142B4E]"
              />
              <span>First Order Only (Enforce per Email)</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] text-neutral-500 mb-1">Coupon Code</label>
            <input
              value={promoDraft.discountCode}
              onChange={(e) =>
                setPromoDraft((p) => ({ ...p, discountCode: e.target.value.toUpperCase() }))
              }
              className="w-full px-3 py-2 border border-neutral-300 font-mono-tabular uppercase"
            />
          </div>
          <div>
            <label className="block text-[11px] text-neutral-500 mb-1">Discount Percentage (%)</label>
            <input
              type="number"
              min={0}
              max={90}
              value={promoDraft.discountPct}
              onChange={(e) =>
                setPromoDraft((p) => ({ ...p, discountPct: Number(e.target.value) }))
              }
              className="w-full px-3 py-2 border border-neutral-300 font-mono-tabular"
            />
          </div>
          <div>
            <label className="block text-[11px] text-neutral-500 mb-1">Auto-Open Delay (seconds, 0 = manual)</label>
            <input
              type="number"
              min={0}
              max={60}
              value={promoDraft.delaySeconds}
              onChange={(e) =>
                setPromoDraft((p) => ({ ...p, delaySeconds: Number(e.target.value) }))
              }
              className="w-full px-3 py-2 border border-neutral-300 font-mono-tabular"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#FAFAFA] p-4 border border-neutral-200">
          {(['en', 'no', 'it', 'vn'] as const).map((rc) => {
            const tKey = `title_${rc}` as keyof PromotionPopupSettings;
            const sKey = `subtitle_${rc}` as keyof PromotionPopupSettings;
            const bKey = `button_${rc}` as keyof PromotionPopupSettings;
            return (
              <div key={rc} className="space-y-1.5">
                <div className="font-semibold uppercase text-[#142B4E]">{rc.toUpperCase()} Popup Copy</div>
                <input
                  value={String(promoDraft[tKey] || '')}
                  onChange={(e) => setPromoDraft((p) => ({ ...p, [tKey]: e.target.value }))}
                  placeholder="Headline"
                  className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white"
                />
                <input
                  value={String(promoDraft[sKey] || '')}
                  onChange={(e) => setPromoDraft((p) => ({ ...p, [sKey]: e.target.value }))}
                  placeholder="Subtitle"
                  className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white"
                />
                <input
                  value={String(promoDraft[bKey] || '')}
                  onChange={(e) => setPromoDraft((p) => ({ ...p, [bKey]: e.target.value }))}
                  placeholder="Floating Button Label"
                  className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white"
                />
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy === 'promo'}
            className="px-5 py-2 bg-[#142B4E] text-white uppercase tracking-wider font-medium cursor-pointer"
          >
            {busy === 'promo' ? 'Saving...' : 'Save First-Order Promo Rules'}
          </button>
        </div>
      </form>

      {/* Section B: Bulk Purchase Discount Tiers */}
      <form onSubmit={saveBulk} className="border border-neutral-200 bg-white p-5 space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
          <div className="font-semibold text-sm uppercase tracking-wider">
            2. Tiered Bulk Purchase Discounts
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={bulkDraft.enabled}
                onChange={(e) => setBulkDraft((b) => ({ ...b, enabled: e.target.checked }))}
                className="accent-[#142B4E]"
              />
              <span>Enable Bulk Purchase Discounts</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={bulkDraft.stackWithCoupon}
                onChange={(e) =>
                  setBulkDraft((b) => ({ ...b, stackWithCoupon: e.target.checked }))
                }
                className="accent-[#142B4E]"
              />
              <span>Stack with First-Order Coupon (otherwise best discount wins)</span>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          {bulkDraft.tiers.map((tier, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-3 bg-[#FAFAFA] p-3 border border-neutral-200">
              <div>
                <label className="block text-[10px] uppercase text-neutral-500">Minimum Shirts</label>
                <input
                  type="number"
                  min={2}
                  value={tier.minQty}
                  onChange={(e) =>
                    setBulkDraft((b) => ({
                      ...b,
                      tiers: b.tiers.map((t, i) =>
                        i === idx ? { ...t, minQty: Number(e.target.value) } : t
                      ),
                    }))
                  }
                  className="w-28 px-2.5 py-1.5 border border-neutral-300 bg-white font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-neutral-500">Discount (%)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={tier.discountPct}
                  onChange={(e) =>
                    setBulkDraft((b) => ({
                      ...b,
                      tiers: b.tiers.map((t, i) =>
                        i === idx ? { ...t, discountPct: Number(e.target.value) } : t
                      ),
                    }))
                  }
                  className="w-28 px-2.5 py-1.5 border border-neutral-300 bg-white font-mono-tabular"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setBulkDraft((b) => ({
                    ...b,
                    tiers: b.tiers.filter((_, i) => i !== idx),
                  }))
                }
                className="mt-4 px-2.5 py-1.5 border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setBulkDraft((b) => ({
                ...b,
                tiers: [...b.tiers, { minQty: 6, discountPct: 12 }],
              }))
            }
            className="px-3 py-1.5 border border-[#142B4E] text-[#142B4E] inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Quantity Tier</span>
          </button>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy === 'bulk'}
            className="px-5 py-2 bg-[#142B4E] text-white uppercase tracking-wider font-medium cursor-pointer"
          >
            {busy === 'bulk' ? 'Saving...' : 'Save Bulk Discount Rules'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 3. AI CONCIERGE & SHOPPING AGENT SETTINGS (GOOGLE GEMINI + OPENAI API)
// ---------------------------------------------------------------------------

interface AiSettingsAdminPanelProps {
  authToken: string;
  aiSettings: AiAdminSettings;
  onRefresh: () => void;
  onRefreshStorefront: () => void;
}

export const AiSettingsAdminPanel: React.FC<AiSettingsAdminPanelProps> = ({
  authToken,
  aiSettings,
  onRefresh,
  onRefreshStorefront,
}) => {
  const [draft, setDraft] = useState<AiAdminSettings>(aiSettings);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
  const [openaiApiKeyInput, setOpenaiApiKeyInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setDraft(aiSettings);
  }, [aiSettings]);

  const handleSave = async (e: React.FormEvent, extras?: Record<string, boolean>) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/site-settings/ai_settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ...draft,
          geminiApiKey: geminiApiKeyInput.trim() || undefined,
          openaiApiKey: openaiApiKeyInput.trim() || undefined,
          ...extras,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setFeedback(d.error || 'Failed to save AI configuration.');
        return;
      }
      setGeminiApiKeyInput('');
      setOpenaiApiKeyInput('');
      setFeedback('AI Concierge & Shopping Agent configuration saved.');
      onRefresh();
      onRefreshStorefront();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-3">
        <h1 className="text-base font-semibold uppercase tracking-wide flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#142B4E]" />
          <span>AI Concierge & Personal Shopping Agent (Gemini + OpenAI)</span>
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Switch between the transparent bottom-center AI Shopping Agent bar or a floating corner Chatbot bubble, and configure Google Gemini or OpenAI API keys securely on the server.
        </p>
      </div>

      {feedback && (
        <div className="p-3 border border-[#4F8A47]/40 bg-[#4F8A47]/10 text-[#2E5A28] text-xs font-medium">
          {feedback}
        </div>
      )}

      <form onSubmit={(e) => handleSave(e)} className="border border-neutral-200 bg-white p-5 space-y-5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
          <label className="inline-flex items-center gap-2 font-semibold text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
              className="accent-[#142B4E] w-4 h-4"
            />
            <span>Enable Storefront AI Assistant</span>
          </label>
          <span className="text-[11px] font-mono-tabular text-neutral-500">
            Keys stored server-side in SQLite / .env · Never exposed to browser
          </span>
        </div>

        {/* Display Mode & Active Provider */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase text-neutral-600 mb-1.5">
              Storefront Interface Mode
            </label>
            <select
              value={draft.displayMode}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  displayMode: e.target.value === 'chatbot' ? 'chatbot' : 'agent',
                }))
              }
              className="w-full px-3 py-2 border border-neutral-300 bg-white font-medium"
            >
              <option value="agent">Shopping Agent (Transparent Bottom Bar)</option>
              <option value="chatbot">Classic Chatbot (Floating Corner Bubble)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-neutral-600 mb-1.5">
              Corner Bubble Placement (Chatbot Mode)
            </label>
            <select
              value={draft.bubblePosition}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  bubblePosition: e.target.value === 'left' ? 'left' : 'right',
                }))
              }
              className="w-full px-3 py-2 border border-neutral-300 bg-white"
            >
              <option value="right">Bottom Right</option>
              <option value="left">Bottom Left</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-neutral-600 mb-1.5">
              Active AI Provider Engine
            </label>
            <select
              value={draft.activeProvider}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  activeProvider: e.target.value === 'openai' ? 'openai' : 'gemini',
                }))
              }
              className="w-full px-3 py-2 border border-neutral-300 bg-white font-semibold text-[#142B4E]"
            >
              <option value="gemini">Google Gemini API (@google/genai)</option>
              <option value="openai">OpenAI API (Chat Completions)</option>
            </select>
          </div>
        </div>

        {/* Provider Credentials & Model Presets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-neutral-200 bg-[#FAFAFA] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#142B4E] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Google Gemini Configuration
              </span>
              <span className="text-[11px] font-mono-tabular">
                {draft.hasEnvGeminiKey
                  ? 'Env Key Active'
                  : draft.hasStoredGeminiKey
                  ? `Stored (${draft.geminiKeyMasked})`
                  : 'No Key Configured'}
              </span>
            </div>
            <div>
              <label className="block text-[11px] text-neutral-500 mb-1">Gemini Model</label>
              <select
                value={draft.geminiModel}
                onChange={(e) => setDraft((d) => ({ ...d, geminiModel: e.target.value }))}
                className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white font-mono-tabular"
              >
                <option value="gemini-4-hydrogen">gemini-4-hydrogen (Recommended Fast Flash)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Flash Lite)</option>
                <option value="gemini-4-neon">gemini-4-neon (Pro Quality)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-neutral-500 mb-1">
                Override Server GEMINI_API_KEY (DigitalOcean / VPS)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="password"
                  value={geminiApiKeyInput}
                  onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                  placeholder="Enter new AIza... key to store securely"
                  className="flex-1 px-2.5 py-1.5 border border-neutral-300 bg-white font-mono-tabular"
                />
                {draft.hasStoredGeminiKey && (
                  <button
                    type="button"
                    onClick={(e) => handleSave(e, { clearGeminiKey: true })}
                    className="px-2.5 py-1.5 border border-red-200 text-red-700 bg-white cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border border-neutral-200 bg-[#FAFAFA] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#142B4E] flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" />
                OpenAI Configuration
              </span>
              <span className="text-[11px] font-mono-tabular">
                {draft.hasEnvOpenaiKey
                  ? 'Env Key Active'
                  : draft.hasStoredOpenaiKey
                  ? `Stored (${draft.openaiKeyMasked})`
                  : 'No Key Configured'}
              </span>
            </div>
            <div>
              <label className="block text-[11px] text-neutral-500 mb-1">OpenAI Model</label>
              <select
                value={draft.openaiModel}
                onChange={(e) => setDraft((d) => ({ ...d, openaiModel: e.target.value }))}
                className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white font-mono-tabular"
              >
                <option value="gpt-4o-mini">gpt-4o-mini (Recommended Fast)</option>
                <option value="gpt-4o">gpt-4o (Flagship)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-neutral-500 mb-1">
                Server OPENAI_API_KEY (DigitalOcean / VPS)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="password"
                  value={openaiApiKeyInput}
                  onChange={(e) => setOpenaiApiKeyInput(e.target.value)}
                  placeholder="Enter new sk-... key to store securely"
                  className="flex-1 px-2.5 py-1.5 border border-neutral-300 bg-white font-mono-tabular"
                />
                {draft.hasStoredOpenaiKey && (
                  <button
                    type="button"
                    onClick={(e) => handleSave(e, { clearOpenaiKey: true })}
                    className="px-2.5 py-1.5 border border-red-200 text-red-700 bg-white cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Localized Greetings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(['en', 'no', 'it', 'vn'] as const).map((rc) => {
            const gKey = `greeting_${rc}` as keyof AiAdminSettings;
            return (
              <div key={rc}>
                <label className="block text-[10px] uppercase text-neutral-500 mb-1">
                  Greeting Message ({rc.toUpperCase()})
                </label>
                <input
                  value={String(draft[gKey] || '')}
                  onChange={(e) => setDraft((d) => ({ ...d, [gKey]: e.target.value }))}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white"
                />
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2 bg-[#142B4E] hover:bg-[#0f213d] text-white uppercase tracking-wider font-medium cursor-pointer"
          >
            {busy ? 'Saving...' : 'Save AI Concierge Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
