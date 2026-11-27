/**
 * Fixed product gallery order — used in admin product editor and PDP.
 * Slot index is stable so future bulk image uploads map correctly.
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

/** Fabric macro shots (committed `/media/fabric-closeups/` or `/uploads/fabric-closeup-*`). */
export function isFabricCloseupUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return (
    clean.includes('fabric-closeup') ||
    clean.includes('/fabric-closeups/') ||
    clean.includes('/media/fabric-closeups/')
  );
}

function isListingEligibleUrl(url: string | null | undefined): boolean {
  return Boolean(url) && !isProductVideoUrl(url) && !isFabricCloseupUrl(url);
}

/**
 * Keep admin slot positions fixed:
 * - shirt photos stay where they are in 0–3 (sparse empties allowed)
 * - fabric close-up always forced to slot 4
 * - short video always forced to slot 5
 * Storefront still hides empty slots via resolveFilledGalleryMedia.
 */
export function canonicalizeGallerySlots(
  gallery: string[] | null | undefined,
  primary?: string | null,
  secondary?: string | null
): string[] {
  const slots = normalizeGallerySlots(gallery, primary, secondary);
  let fabric = '';
  let video = '';

  for (let i = 0; i < slots.length; i++) {
    const u = slots[i];
    if (!u) continue;
    if (isFabricCloseupUrl(u)) {
      if (!fabric) fabric = u;
      slots[i] = '';
      continue;
    }
    if (isProductVideoUrl(u)) {
      if (!video) video = u;
      slots[i] = '';
    }
  }

  // Non-fabric media that landed on fabric/video tiles → first empty shirt slot
  for (const i of [FABRIC_CLOSEUP_SLOT_INDEX, SHORT_VIDEO_SLOT_INDEX]) {
    const u = slots[i];
    if (!u || isFabricCloseupUrl(u) || isProductVideoUrl(u)) continue;
    const dest = slots.findIndex((x, idx) => idx < FABRIC_CLOSEUP_SLOT_INDEX && !x);
    if (dest >= 0) slots[dest] = u;
    slots[i] = '';
  }

  if (fabric) slots[FABRIC_CLOSEUP_SLOT_INDEX] = fabric;
  if (video) slots[SHORT_VIDEO_SLOT_INDEX] = video;
  return slots;
}

/** Always return exactly 6 slots (pad / trim) for admin editing. */
export function normalizeGallerySlots(
  gallery: string[] | null | undefined,
  primary?: string | null,
  secondary?: string | null
): string[] {
  const raw = Array.isArray(gallery) ? gallery.map((u) => String(u || '').trim()) : [];
  const slots = Array.from({ length: PRODUCT_GALLERY_SLOT_COUNT }, (_, i) => raw[i] || '');
  const primaryTrim = String(primary || '').trim();
  const secondaryTrim = String(secondary || '').trim();
  // Only backfill primary/secondary into empty early slots when they are not already in the gallery
  // (avoids duplicating a lone fabric-closeup into slot 0).
  if (
    primaryTrim &&
    !slots.includes(primaryTrim) &&
    isListingEligibleUrl(primaryTrim)
  ) {
    if (!slots[0]) slots[0] = primaryTrim;
  }
  if (
    secondaryTrim &&
    secondaryTrim !== primaryTrim &&
    !slots.includes(secondaryTrim) &&
    isListingEligibleUrl(secondaryTrim)
  ) {
    if (!slots[1]) slots[1] = secondaryTrim;
  }
  // Fabric / video that only exist on primary should still land in their fixed slots
  if (primaryTrim && isFabricCloseupUrl(primaryTrim) && !slots.includes(primaryTrim)) {
    slots[FABRIC_CLOSEUP_SLOT_INDEX] = primaryTrim;
  }
  if (primaryTrim && isProductVideoUrl(primaryTrim) && !slots.includes(primaryTrim)) {
    slots[SHORT_VIDEO_SLOT_INDEX] = primaryTrim;
  }
  return slots;
}

/**
 * Place a media URL into the gallery. Fabric close-ups and videos always map to
 * their fixed slots (5 / 6), even if the admin clicked another tile.
 */
export function assignGallerySlotUrl(
  gallery: string[] | null | undefined,
  targetIndex: number,
  url: string
): string[] {
  const next = canonicalizeGallerySlots(gallery);
  const clean = String(url || '').trim();
  if (!clean) {
    if (targetIndex >= 0 && targetIndex < PRODUCT_GALLERY_SLOT_COUNT) next[targetIndex] = '';
    return next;
  }
  for (let i = 0; i < next.length; i++) {
    if (next[i] === clean) next[i] = '';
  }
  let dest = targetIndex;
  if (isFabricCloseupUrl(clean)) dest = FABRIC_CLOSEUP_SLOT_INDEX;
  else if (isProductVideoUrl(clean)) dest = SHORT_VIDEO_SLOT_INDEX;
  else if (dest === FABRIC_CLOSEUP_SLOT_INDEX || dest === SHORT_VIDEO_SLOT_INDEX) {
    dest = next.findIndex((u, i) => i < FABRIC_CLOSEUP_SLOT_INDEX && !u);
    if (dest < 0) dest = 0;
  }
  if (dest < 0 || dest >= PRODUCT_GALLERY_SLOT_COUNT) dest = 0;
  next[dest] = clean;
  return next;
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

/** Storefront: only filled media, preserving fixed slot order (no blank tiles). */
export function resolveFilledGalleryMedia(product: {
  gallery?: string[] | null;
  primary_image?: string;
  secondary_image?: string;
}): string[] {
  const slots = canonicalizeGallerySlots(
    product.gallery,
    product.primary_image,
    product.secondary_image
  );
  const filled = slots.filter(Boolean);
  if (filled.length > 0) return filled;
  return [product.primary_image, product.secondary_image].filter(Boolean) as string[];
}
