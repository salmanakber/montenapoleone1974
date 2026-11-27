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

/** Always return exactly 6 slots (pad / trim) for admin editing. */
export function normalizeGallerySlots(
  gallery: string[] | null | undefined,
  primary?: string | null,
  secondary?: string | null
): string[] {
  const raw = Array.isArray(gallery) ? gallery.map((u) => String(u || '').trim()) : [];
  const slots = Array.from({ length: PRODUCT_GALLERY_SLOT_COUNT }, (_, i) => raw[i] || '');
  if (!slots[0] && primary) slots[0] = String(primary).trim();
  if (!slots[1] && secondary && secondary !== slots[0]) slots[1] = String(secondary).trim();
  // Legacy galleries were dense (no empties). If only dense extras exist past primary, keep them in order.
  if (raw.length > 0 && raw.every((u, i) => i < raw.length && Boolean(u))) {
    // already assigned above for index positions; densify only when legacy length < 6 and no holes
  }
  return slots;
}

/** Storefront: only filled media, preserving slot order (no blank tiles). */
export function resolveFilledGalleryMedia(product: {
  gallery?: string[] | null;
  primary_image?: string;
  secondary_image?: string;
}): string[] {
  const slots = normalizeGallerySlots(product.gallery, product.primary_image, product.secondary_image);
  const filled = slots.filter(Boolean);
  if (filled.length > 0) return filled;
  return [product.primary_image, product.secondary_image].filter(Boolean) as string[];
}
