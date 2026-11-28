/**
 * Fixed product gallery slots — labels/order never change.
 * Only media URLs move between slots. Fabric close-ups belong in Slot 05.
 *
 * 0 Folded shirt (main)
 * 1 Ghost mannequin - front
 * 2 Sideway
 * 3 Shirt with model
 * 4 Fabric close up
 * 5 Short video clip
 */
export const PRODUCT_GALLERY_SLOT_COUNT = 6;
export const FABRIC_CLOSEUP_SLOT_INDEX = 4;
export const SHORT_VIDEO_SLOT_INDEX = 5;

export const PRODUCT_GALLERY_SLOTS = [
  {
    index: 0,
    id: 'folded_main',
    label: 'Folded shirt (main)',
    shortLabel: '1 · Folded main',
    kind: 'image' as const,
    hint: 'Lead / primary product photo',
  },
  {
    index: 1,
    id: 'ghost_front',
    label: 'Ghost mannequin — front',
    shortLabel: '2 · Ghost front',
    kind: 'image' as const,
    hint: 'Front ghost mannequin shot',
  },
  {
    index: 2,
    id: 'sideway',
    label: 'Sideway',
    shortLabel: '3 · Sideway',
    kind: 'image' as const,
    hint: 'Side / profile view',
  },
  {
    index: 3,
    id: 'model',
    label: 'Shirt with model',
    shortLabel: '4 · Model',
    kind: 'image' as const,
    hint: 'Lifestyle / model wearing shirt',
  },
  {
    index: 4,
    id: 'fabric_closeup',
    label: 'Fabric close up',
    shortLabel: '5 · Fabric',
    kind: 'image' as const,
    hint: 'Macro fabric texture',
  },
  {
    index: 5,
    id: 'short_video',
    label: 'Short video clip',
    shortLabel: '6 · Video',
    kind: 'video' as const,
    hint: 'Muted autoplay clip (mp4 / webm)',
  },
] as const;

export type ProductGallerySlot = (typeof PRODUCT_GALLERY_SLOTS)[number];

export function isProductVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return /\.(mp4|webm|mov|ogg|m4v)$/i.test(clean);
}

/**
 * Fabric Slot 05 only — match committed fabric-closeup assets / clear fabric paths.
 * Intentionally narrow so shirt/side/model photos are never pulled into Slot 05.
 */
export function isFabricCloseupUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  const file = clean.split('/').pop() || clean;
  return (
    clean.includes('/fabric-closeups/') ||
    clean.includes('/media/fabric-closeups/') ||
    file.startsWith('fabric-closeup-') ||
    /fabric[-_]?close[-_]?up/.test(file)
  );
}

function isListingEligibleUrl(url: string | null | undefined): boolean {
  return Boolean(url) && !isProductVideoUrl(url) && !isFabricCloseupUrl(url);
}

export function normalizeGalleryVisibility(
  visible: boolean[] | null | undefined
): boolean[] {
  const raw = Array.isArray(visible) ? visible : [];
  return Array.from({ length: PRODUCT_GALLERY_SLOT_COUNT }, (_, i) =>
    raw[i] === undefined || raw[i] === null ? true : Boolean(raw[i])
  );
}

/** Pad/trim to 6 fixed slots — never pack empties or invent mid-slot fills. */
export function padGallerySlots(gallery: string[] | null | undefined): string[] {
  const raw = Array.isArray(gallery) ? gallery.map((u) => String(u || '').trim()) : [];
  return Array.from({ length: PRODUCT_GALLERY_SLOT_COUNT }, (_, i) => raw[i] || '');
}

/**
 * Pin fabric → Slot 05 and video → Slot 06 when those URLs appear in the wrong index.
 * Other shirt images stay exactly where they are (empty mid-slots stay empty).
 */
export function canonicalizeGallerySlots(
  gallery: string[] | null | undefined,
  primary?: string | null,
  _secondary?: string | null
): string[] {
  const slots = padGallerySlots(gallery);

  // Only seed slot 0 from primary when the whole gallery is empty.
  const primaryTrim = String(primary || '').trim();
  if (primaryTrim && !slots.some(Boolean)) {
    if (isFabricCloseupUrl(primaryTrim)) slots[FABRIC_CLOSEUP_SLOT_INDEX] = primaryTrim;
    else if (isProductVideoUrl(primaryTrim)) slots[SHORT_VIDEO_SLOT_INDEX] = primaryTrim;
    else slots[0] = primaryTrim;
  }

  let fabric = '';
  let video = '';
  for (let i = 0; i < slots.length; i++) {
    const u = slots[i];
    if (!u) continue;
    if (isFabricCloseupUrl(u)) {
      if (!fabric) fabric = u;
      if (i !== FABRIC_CLOSEUP_SLOT_INDEX) slots[i] = '';
      continue;
    }
    if (isProductVideoUrl(u)) {
      if (!video) video = u;
      if (i !== SHORT_VIDEO_SLOT_INDEX) slots[i] = '';
    }
  }
  if (fabric) slots[FABRIC_CLOSEUP_SLOT_INDEX] = fabric;
  if (video) slots[SHORT_VIDEO_SLOT_INDEX] = video;
  return slots;
}

/** @deprecated alias — prefer padGallerySlots / canonicalizeGallerySlots */
export function normalizeGallerySlots(
  gallery: string[] | null | undefined,
  primary?: string | null,
  secondary?: string | null
): string[] {
  return canonicalizeGallerySlots(gallery, primary, secondary);
}

/**
 * Place a media URL into a chosen slot (swap-friendly).
 * Fabric close-up files always land in Slot 05; videos in Slot 06.
 */
export function assignGallerySlotUrl(
  gallery: string[] | null | undefined,
  targetIndex: number,
  url: string
): string[] {
  const next = padGallerySlots(gallery);
  const clean = String(url || '').trim();
  if (!clean) {
    if (targetIndex >= 0 && targetIndex < PRODUCT_GALLERY_SLOT_COUNT) next[targetIndex] = '';
    return canonicalizeGallerySlots(next);
  }
  for (let i = 0; i < next.length; i++) {
    if (next[i] === clean) next[i] = '';
  }
  let dest = targetIndex;
  if (isFabricCloseupUrl(clean)) dest = FABRIC_CLOSEUP_SLOT_INDEX;
  else if (isProductVideoUrl(clean)) dest = SHORT_VIDEO_SLOT_INDEX;
  if (dest < 0 || dest >= PRODUCT_GALLERY_SLOT_COUNT) dest = 0;
  next[dest] = clean;
  return canonicalizeGallerySlots(next);
}

/** Swap two slot images in place — slot labels stay fixed. */
export function swapGallerySlotImages(
  gallery: string[] | null | undefined,
  fromIdx: number,
  toIdx: number
): string[] {
  const next = padGallerySlots(gallery);
  if (
    fromIdx === toIdx ||
    fromIdx < 0 ||
    toIdx < 0 ||
    fromIdx >= PRODUCT_GALLERY_SLOT_COUNT ||
    toIdx >= PRODUCT_GALLERY_SLOT_COUNT
  ) {
    return next;
  }
  const a = next[fromIdx];
  next[fromIdx] = next[toIdx];
  next[toIdx] = a;
  return canonicalizeGallerySlots(next);
}

/** Index of the preferred listing/front image within the 6-slot gallery. */
export function resolveListingSlotIndex(
  gallery: string[] | null | undefined,
  preferredIndex?: number | null,
  primary?: string | null
): number {
  const slots = canonicalizeGallerySlots(gallery, primary);
  if (
    preferredIndex != null &&
    Number.isFinite(preferredIndex) &&
    preferredIndex >= 0 &&
    preferredIndex < PRODUCT_GALLERY_SLOT_COUNT &&
    isListingEligibleUrl(slots[preferredIndex])
  ) {
    return preferredIndex;
  }
  const primaryTrim = String(primary || '').trim();
  if (primaryTrim && isListingEligibleUrl(primaryTrim)) {
    const at = slots.findIndex((u) => u === primaryTrim);
    if (at >= 0) return at;
  }
  const firstShirt = slots.findIndex((u) => isListingEligibleUrl(u));
  if (firstShirt >= 0) return firstShirt;
  const firstFilled = slots.findIndex(Boolean);
  return firstFilled >= 0 ? firstFilled : 0;
}

/**
 * Listing/front image for catalog cards.
 * Prefers shirt photos (slots 0–3). Fabric close-up / video are never used when a shirt photo exists.
 */
export function resolveListingImage(product: {
  gallery?: string[] | null;
  primary_image?: string;
  secondary_image?: string;
  listing_slot_index?: number | null;
}): string {
  const slots = canonicalizeGallerySlots(
    product.gallery,
    product.primary_image,
    product.secondary_image
  );
  const idx = resolveListingSlotIndex(slots, product.listing_slot_index, product.primary_image);
  const chosen = slots[idx];
  if (isListingEligibleUrl(chosen)) return chosen;
  const shirt = slots.find((u) => isListingEligibleUrl(u));
  if (shirt) return shirt;
  return (
    slots.find(Boolean) ||
    String(product.primary_image || product.secondary_image || '')
  );
}

export type GalleryDisplaySlot = {
  index: number;
  url: string;
  visible: boolean;
};

/**
 * Storefront PDP slots: fixed order. Hidden slots are omitted.
 * Visible + empty → light-gray placeholder. Visible + url → media.
 */
export function resolveGallerySlotsForDisplay(product: {
  gallery?: string[] | null;
  primary_image?: string;
  secondary_image?: string;
  gallery_slot_visible?: boolean[] | null;
}): GalleryDisplaySlot[] {
  const slots = canonicalizeGallerySlots(
    product.gallery,
    product.primary_image,
    product.secondary_image
  );
  const visibility = normalizeGalleryVisibility(product.gallery_slot_visible);
  return slots.map((url, index) => ({
    index,
    url,
    visible: visibility[index],
  }));
}

/** Catalog hover / compact UIs: filled + visible media only, still in slot order. */
export function resolveFilledGalleryMedia(product: {
  gallery?: string[] | null;
  primary_image?: string;
  secondary_image?: string;
  gallery_slot_visible?: boolean[] | null;
}): string[] {
  const display = resolveGallerySlotsForDisplay(product);
  const filled = display.filter((s) => s.visible && s.url).map((s) => s.url);
  if (filled.length > 0) return filled;
  return [product.primary_image, product.secondary_image].filter(Boolean) as string[];
}
