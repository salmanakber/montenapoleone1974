import type {
  AiAgentAction,
  AiPendingOffer,
  BulkDiscountSettings,
  PromotionPopupSettings,
  RegionCode,
} from '../types.ts';
import { calculateBulkPurchaseDiscount, formatRegionalPrice } from './commerce.ts';

export interface AgentCatalogProduct {
  id: number;
  slug: string;
  sku: string;
  title: string;
  category_slug: string;
  category_slugs?: string[];
  fabric_spec: string;
  price: number;
  primary_image: string;
  stock_qty: number;
  preorder_allowed: boolean;
  sizes: string[];
}

export interface AgentConversationTurnInput {
  message: string;
  regionCode: RegionCode;
  products: AgentCatalogProduct[];
  cartQty: number;
  cartSubtotal: number;
  firstOrderEligible: boolean;
  activePromoCode?: string;
  promoRules: PromotionPopupSettings;
  bulkRules: BulkDiscountSettings;
  pendingOffer?: AiPendingOffer | null;
  currentProductSlug?: string | null;
}

export interface AgentDecisionResult {
  reply: string;
  recommendedSlugs: string[];
  agentAction: AiAgentAction | null;
  pendingOffer: AiPendingOffer | null;
  suggestedReplies: string[];
}

const YES_PATTERNS =
  /^(yes|yep|yeah|sure|ok|okay|please|add|add it|add to bag|add to cart|take it|sounds good|go ahead|do it|apply|apply it|ja|legg til|gjerne|sì|si|aggiungi|certo|va bene|có|ok|thêm vào giỏ|áp dụng|mua)\b/i;

const CHECKOUT_PATTERNS = /\b(checkout|pay|payment|order now|complete order|kasse|betal|cassa|thanh toán)\b/i;
const DISCOUNT_WORDS = /\b(discount|promo|coupon|offer|10%|first order|bulk|code|rabatt|sconto|giảm giá|mã)\b/i;

export function isAffirmativeConfirmation(text: string): boolean {
  const clean = text.trim().toLowerCase().replace(/[!?.]+$/g, '');
  if (!clean) return false;
  if (YES_PATTERNS.test(clean)) return true;
  if (/\byes[, ]+(add|apply|please|take|do|go)\b/i.test(clean)) return true;
  if (/\badd (it|this|that|to bag|to cart)\b/i.test(clean)) return true;
  return false;
}

export function extractRequestedSize(message: string, availableSizes: string[]): string | undefined {
  const lower = message.toLowerCase();
  // 1. Exact full size string match (e.g. "40 / m")
  for (const s of availableSizes) {
    if (lower.includes(s.toLowerCase())) {
      return s;
    }
  }
  // 2. Numeric collar/EU size match first (e.g. "40" matches "40 / M" rather than "39 / M" via "m")
  for (const s of availableSizes) {
    const numMatch = s.match(/\d{2}/);
    if (numMatch && new RegExp(`\\b${numMatch[0]}\\b`).test(lower)) {
      return s;
    }
  }
  // 3. Letter size fallback (e.g. "medium" or "l"), preferring "40 / M" when letter is "m"
  for (const s of availableSizes) {
    const parts = s.toLowerCase().split('/').map((x) => x.trim());
    const letterPart = parts[1] || parts[0];
    if (letterPart && new RegExp(`\\b${letterPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lower)) {
      if (letterPart === 'm') {
        const preferredM = availableSizes.find((cand) => cand.startsWith('40'));
        if (preferredM) return preferredM;
      }
      return s;
    }
  }
  return undefined;
}

export function extractRequestedFit(
  message: string
): 'Slim Fit' | 'Regular Fit' | 'Contemporary Fit' | undefined {
  const lower = message.toLowerCase();
  if (lower.includes('slim')) return 'Slim Fit';
  if (lower.includes('contemporary')) return 'Contemporary Fit';
  if (lower.includes('regular')) return 'Regular Fit';
  return undefined;
}

export function buildDiscountUpsellSentence(params: {
  regionCode: RegionCode;
  cartQty: number;
  cartSubtotal: number;
  firstOrderEligible: boolean;
  activePromoCode?: string;
  promoRules: PromotionPopupSettings;
  bulkRules: BulkDiscountSettings;
}): { text: string; offerCouponCode?: string } {
  const promoCode = (params.promoRules.discountCode || 'MONTE10').trim().toUpperCase();
  const hasPromoAlready =
    params.activePromoCode && params.activePromoCode.trim().toUpperCase() === promoCode;
  const bulkEval = calculateBulkPurchaseDiscount(
    params.cartQty,
    params.cartSubtotal,
    params.bulkRules,
    params.regionCode
  );

  const hints: string[] = [];
  let offerCouponCode: string | undefined;

  if (params.promoRules.popupEnabled && params.firstOrderEligible && !hasPromoAlready) {
    offerCouponCode = promoCode;
    hints.push(
      `You qualify for ${params.promoRules.discountPct}% off your first order with code ${promoCode}`
    );
  }

  if (bulkEval.nextTier && bulkEval.unitsNeededForNext > 0) {
    hints.push(
      `Add ${bulkEval.unitsNeededForNext} more shirt${bulkEval.unitsNeededForNext > 1 ? 's' : ''} to unlock ${bulkEval.nextTier.discountPct}% off (${bulkEval.nextTier.minQty}+ shirts bulk savings)`
    );
  } else if (bulkEval.appliedTier) {
    hints.push(
      `You already unlocked our ${bulkEval.appliedTier.discountPct}% bulk discount (${formatRegionalPrice(
        bulkEval.discountAmount,
        params.regionCode
      )} saved)`
    );
  }

  return {
    text: hints.join('. '),
    offerCouponCode,
  };
}

export function evaluateStorefrontAgentTurn(input: AgentConversationTurnInput): AgentDecisionResult {
  const cleanMsg = input.message.trim();
  const lower = cleanMsg.toLowerCase();
  const defaultSize = '40 / M';

  // 1. Handle explicit affirmative confirmation to previous proposal
  if (input.pendingOffer && isAffirmativeConfirmation(cleanMsg)) {
    if (input.pendingOffer.kind === 'product' && input.pendingOffer.productSlug) {
      const prod =
        input.products.find((p) => p.slug === input.pendingOffer?.productSlug) || input.products[0];
      if (prod) {
        const chosenSize =
          extractRequestedSize(cleanMsg, prod.sizes) || input.pendingOffer.size || defaultSize;
        const chosenFit = extractRequestedFit(cleanMsg) || input.pendingOffer.fit || 'Regular Fit';
        const nextQty = input.cartQty + 1;
        const nextSubtotal = input.cartSubtotal + prod.price;
        const upsell = buildDiscountUpsellSentence({
          regionCode: input.regionCode,
          cartQty: nextQty,
          cartSubtotal: nextSubtotal,
          firstOrderEligible: input.firstOrderEligible,
          activePromoCode: input.activePromoCode,
          promoRules: input.promoRules,
          bulkRules: input.bulkRules,
        });

        const reply = upsell.offerCouponCode
          ? `Added ${prod.title} (${chosenFit}, ${chosenSize}) to your bag. ${upsell.text}. Would you like me to apply ${upsell.offerCouponCode} and take you to checkout?`
          : upsell.text
          ? `Added ${prod.title} (${chosenFit}, ${chosenSize}) to your bag. ${upsell.text}. Ready to open checkout?`
          : `Added ${prod.title} (${chosenFit}, ${chosenSize}) to your bag. Would you like to proceed to checkout?`;

        return {
          reply,
          recommendedSlugs: [prod.slug],
          agentAction: {
            type: 'add_to_cart',
            productSlug: prod.slug,
            size: chosenSize,
            fit: chosenFit,
          },
          pendingOffer: upsell.offerCouponCode
            ? { kind: 'discount', couponCode: upsell.offerCouponCode }
            : { kind: 'checkout' },
          suggestedReplies: upsell.offerCouponCode
            ? [`Yes, apply ${upsell.offerCouponCode} & checkout`, 'Browse more shirts']
            : ['Yes, go to checkout', 'Browse more shirts'],
        };
      }
    }

    if (input.pendingOffer.kind === 'discount' && input.pendingOffer.couponCode) {
      const code = input.pendingOffer.couponCode;
      return {
        reply: `Applied ${code} (${input.promoRules.discountPct}% off) and taking you to checkout now so you can complete your order.`,
        recommendedSlugs: [],
        agentAction: { type: 'apply_coupon', couponCode: code },
        pendingOffer: { kind: 'checkout' },
        suggestedReplies: ['Proceed to checkout'],
      };
    }

    if (input.pendingOffer.kind === 'checkout') {
      return {
        reply: 'Opening checkout now with your bag and active discounts applied.',
        recommendedSlugs: [],
        agentAction: { type: 'open_checkout' },
        pendingOffer: null,
        suggestedReplies: [],
      };
    }
  }

  // 2. Explicit checkout / apply discount intent
  if (CHECKOUT_PATTERNS.test(lower)) {
    const promoCode = (input.promoRules.discountCode || 'MONTE10').trim().toUpperCase();
    if (
      input.promoRules.popupEnabled &&
      input.firstOrderEligible &&
      (!input.activePromoCode || input.activePromoCode.toUpperCase() !== promoCode) &&
      (lower.includes(promoCode.toLowerCase()) || DISCOUNT_WORDS.test(lower))
    ) {
      return {
        reply: `Applied ${promoCode} (${input.promoRules.discountPct}% off) and routing you directly to Checkout.`,
        recommendedSlugs: [],
        agentAction: { type: 'apply_coupon', couponCode: promoCode },
        pendingOffer: { kind: 'checkout' },
        suggestedReplies: ['Open Checkout'],
      };
    }
    return {
      reply: 'Taking you to Checkout now.',
      recommendedSlugs: [],
      agentAction: { type: 'open_checkout' },
      pendingOffer: null,
      suggestedReplies: [],
    };
  }

  if (DISCOUNT_WORDS.test(lower)) {
    const upsell = buildDiscountUpsellSentence({
      regionCode: input.regionCode,
      cartQty: input.cartQty,
      cartSubtotal: input.cartSubtotal,
      firstOrderEligible: input.firstOrderEligible,
      activePromoCode: input.activePromoCode,
      promoRules: input.promoRules,
      bulkRules: input.bulkRules,
    });
    const promoCode = (input.promoRules.discountCode || 'MONTE10').trim().toUpperCase();
    if (upsell.offerCouponCode) {
      return {
        reply: `${upsell.text}. Would you like me to apply ${promoCode} to your bag right now?`,
        recommendedSlugs: [],
        agentAction: null,
        pendingOffer: { kind: 'discount', couponCode: promoCode },
        suggestedReplies: [`Yes, apply ${promoCode}`, 'Show linen shirts'],
      };
    }
    return {
      reply: upsell.text || `All active promotions and tiered bulk savings are ready in your bag.`,
      recommendedSlugs: [],
      agentAction: null,
      pendingOffer: null,
      suggestedReplies: ['Show bestsellers', 'Go to checkout'],
    };
  }

  // 3. Explicit page routing intents (About, B2B, Region)
  if (/\b(b2b|wholesale|corporate|company|uniform|embroidery|moq|bedrift)\b/i.test(lower)) {
    return {
      reply:
        'Routing you to our Corporate B2B Portal. Enjoy tiered savings starting at 20 shirts per colour with bespoke embroidered monograms.',
      recommendedSlugs: [],
      agentAction: { type: 'open_b2b' },
      pendingOffer: null,
      suggestedReplies: ['Show linen shirts', 'Check discounts'],
    };
  }

  if (/\b(about|heritage|story|treviso|history|since 1974|atelier)\b/i.test(lower)) {
    return {
      reply: 'Taking you to the Monte Napoleone 1974 Heritage & Treviso Atelier story.',
      recommendedSlugs: [],
      agentAction: { type: 'open_about' },
      pendingOffer: null,
      suggestedReplies: ['Show business shirts', 'Check first-order offer'],
    };
  }

  if (/\b(norway|norwegian|nok|oslo|norge)\b/i.test(lower) && input.regionCode !== 'no') {
    return {
      reply: 'Switching storefront to Norway (NOK) with Oslo warehouse dispatch and Vipps support.',
      recommendedSlugs: [],
      agentAction: { type: 'switch_region', regionCode: 'no' },
      pendingOffer: null,
      suggestedReplies: ['Show linen shirts'],
    };
  }

  if (/\b(italy|italian|eur|euro|milano|italia)\b/i.test(lower) && input.regionCode !== 'it') {
    return {
      reply: 'Switching storefront to Italy (EUR) with Treviso Atelier express dispatch.',
      recommendedSlugs: [],
      agentAction: { type: 'switch_region', regionCode: 'it' },
      pendingOffer: null,
      suggestedReplies: ['Show business shirts'],
    };
  }

  if (/\b(vietnam|vietnamese|vnd|hanoi|saigon|việt nam)\b/i.test(lower) && input.regionCode !== 'vn') {
    return {
      reply: 'Switching storefront to Việt Nam (VND) with local bank QR and DHL Express delivery.',
      recommendedSlugs: [],
      agentAction: { type: 'switch_region', regionCode: 'vn' },
      pendingOffer: null,
      suggestedReplies: ['Show linen shirts'],
    };
  }

  // 4. Category or Product Matching + "Do you like this?" proposal flow
  const categoryKeywords: Array<{ slug: string; regex: RegExp }> = [
    { slug: 'linen', regex: /\b(linen|summer|beach|breathable|lino|lin|vải lanh)\b/i },
    { slug: 'business', regex: /\b(business|formal|office|poplin|dress shirt|twill|2-ply)\b/i },
    { slug: 'oxford', regex: /\b(oxford|smart casual)\b/i },
    { slug: 'flannel', regex: /\b(flannel|winter|warm|brushed)\b/i },
    { slug: 'stretch', regex: /\b(stretch|travel|non-iron|elastic)\b/i },
  ];

  const matchedCat = categoryKeywords.find((k) => k.regex.test(lower));
  const keywords = lower
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !['shirt', 'shirts', 'want', 'show', 'find', 'looking', 'for', 'the', 'with', 'please'].includes(w));

  const scored = input.products
    .map((p) => {
      let score = 0;
      const haystack = `${p.title} ${p.sku} ${p.slug} ${p.fabric_spec} ${p.category_slug} ${(p.category_slugs || []).join(' ')}`.toLowerCase();
      if (matchedCat && (p.category_slug === matchedCat.slug || p.category_slugs?.includes(matchedCat.slug))) {
        score += 5;
      }
      for (const kw of keywords) {
        if (haystack.includes(kw)) score += 3;
      }
      if (input.currentProductSlug && p.slug === input.currentProductSlug) {
        score += 1;
      }
      return { p, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const chosen = scored.length > 0 ? scored.slice(0, 3).map((s) => s.p) : input.products.slice(0, 3);
  const topProduct = chosen[0];
  const reqSize = topProduct ? extractRequestedSize(cleanMsg, topProduct.sizes) || defaultSize : defaultSize;
  const reqFit = extractRequestedFit(cleanMsg) || 'Regular Fit';

  // If user asks to add explicitly in first message
  if (topProduct && /\badd\b.*\b(bag|cart)\b/i.test(lower)) {
    const upsell = buildDiscountUpsellSentence({
      regionCode: input.regionCode,
      cartQty: input.cartQty + 1,
      cartSubtotal: input.cartSubtotal + topProduct.price,
      firstOrderEligible: input.firstOrderEligible,
      activePromoCode: input.activePromoCode,
      promoRules: input.promoRules,
      bulkRules: input.bulkRules,
    });
    return {
      reply: `Added ${topProduct.title} (${reqFit}, ${reqSize}) to your bag. ${upsell.text ? `${upsell.text}. ` : ''}Would you like me to apply ${upsell.offerCouponCode || 'your discounts'} or open checkout?`,
      recommendedSlugs: chosen.map((c) => c.slug),
      agentAction: {
        type: 'add_to_cart',
        productSlug: topProduct.slug,
        size: reqSize,
        fit: reqFit,
      },
      pendingOffer: upsell.offerCouponCode
        ? { kind: 'discount', couponCode: upsell.offerCouponCode }
        : { kind: 'checkout' },
      suggestedReplies: upsell.offerCouponCode
        ? [`Yes, apply ${upsell.offerCouponCode} & checkout`, 'Continue shopping']
        : ['Go to checkout', 'Show more shirts'],
    };
  }

  if (matchedCat && chosen.length > 1 && scored[0]?.score < 7) {
    return {
      reply: `I’ve opened our ${matchedCat.slug.toUpperCase()} collection for you — spotlighting ${topProduct.title} (${formatRegionalPrice(topProduct.price, input.regionCode)}). Do you like this piece? Say "yes" and I’ll add ${reqSize} (${reqFit}) straight to your bag.`,
      recommendedSlugs: chosen.map((c) => c.slug),
      agentAction: {
        type: 'open_category',
        categorySlug: matchedCat.slug,
      },
      pendingOffer: topProduct
        ? { kind: 'product', productSlug: topProduct.slug, size: reqSize, fit: reqFit }
        : null,
      suggestedReplies: ['Yes, add to bag', 'Check 10% first-order offer'],
    };
  }

  if (topProduct) {
    return {
      reply: `Here is ${topProduct.title} (${topProduct.fabric_spec}) at ${formatRegionalPrice(
        topProduct.price,
        input.regionCode
      )} with complimentary sleeve & shirt length tailoring. Do you like this shirt? Say "yes" and I’ll add ${reqSize} (${reqFit}) directly to your bag.`,
      recommendedSlugs: chosen.map((c) => c.slug),
      agentAction: {
        type: 'open_product',
        productSlug: topProduct.slug,
      },
      pendingOffer: {
        kind: 'product',
        productSlug: topProduct.slug,
        size: reqSize,
        fit: reqFit,
      },
      suggestedReplies: ['Yes, add to bag', 'Show all linen shirts', 'Check discounts'],
    };
  }

  return {
    reply: `Welcome to Monte Napoleone 1974 (${input.regionCode.toUpperCase()}). Ask me for linen, business 2-ply, oxford, corporate B2B quotes, or available discounts — I can open collections and add shirts directly to your bag.`,
    recommendedSlugs: input.products.slice(0, 3).map((p) => p.slug),
    agentAction: null,
    pendingOffer: null,
    suggestedReplies: ['Show Italian linen shirts', 'Check available discounts', 'Open B2B portal'],
  };
}
