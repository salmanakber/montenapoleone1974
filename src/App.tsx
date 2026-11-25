import { useCallback, useEffect, useMemo, useState } from 'react';
import { TRANSLATIONS } from './i18n/translations.ts';
import type {
  AdminTab,
  AiAgentAction,
  AiPublicConfig,
  AuthUser,
  BespokeTailoring,
  BulkDiscountSettings,
  CartItem,
  CategoryRecord,
  CustomerAuthPublicConfig,
  HeroSlideRecord,
  HomePageSettings,
  MenuItemRecord,
  Product,
  PromotionPopupSettings,
  RegionCode,
  RegionConfig,
  TailoringOptionRecord,
  TailoringSizeSpec,
  TopBannerSettings,
} from './types.ts';
import {
  calculateTailoringSurcharge,
  DEFAULT_BULK_DISCOUNT_SETTINGS,
  DEFAULT_CUSTOMER_AUTH_SETTINGS,
  DEFAULT_HOME_PAGE_SETTINGS,
  DEFAULT_PROMO_POPUP_SETTINGS,
  resolveHomeFeaturedProducts,
  DEFAULT_TAILORING_SURCHARGE,
  DEFAULT_TOP_BANNER_SETTINGS,
  resolveOrderedTailoringOptions,
  resolveVariantPriceAndStock,
} from './utils/commerce.ts';
import {
  buildSeoMetadata,
  buildStorefrontPath,
  parseStorefrontUrl,
} from './utils/seo.ts';
import { Navbar, type AppView } from './components/Navbar.tsx';
import { HeroAndHome } from './components/HeroAndHome.tsx';
import { CatalogView } from './components/CatalogView.tsx';
import { ProductDetailView } from './components/ProductDetailView.tsx';
import { AboutUsView } from './components/AboutUsView.tsx';
import { InfoPagesView } from './components/InfoPagesView.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { CheckoutView } from './components/CheckoutView.tsx';
import { AccountView, B2BView } from './components/B2BAndAccountView.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { Footer } from './components/Footer.tsx';
import { InfoModal, SearchModal } from './components/Modals.tsx';
import { FirstOrderPopup } from './components/FirstOrderPopup.tsx';
import { AiConciergeWidget } from './components/AiConciergeWidget.tsx';
import { GmailLoginCornerPopup } from './components/GmailLoginCornerPopup.tsx';
import {
  resolveInfoPageSlug,
  type InfoPageSlug,
} from './content/infoPages.ts';

const DEFAULT_REGION: RegionConfig = {
  code: 'en',
  name: 'International',
  language_name: 'English',
  currency_code: 'USD',
  currency_symbol: '$',
  vat_rate: 0,
  free_shipping_threshold: 250,
  dhl_base_rate: 22,
  dhl_express_rate: 38,
  dhl_eta_days: '3–5 business days via DHL Express',
  bank_name: 'DNB Bank ASA International',
  bank_account_display: '1506.88.41920',
  bank_iban: 'NO9315068841920',
  bank_bic: 'DNBANOKKXXX',
  bank_reference_prefix: 'MNUS',
  enabled_payments: ['stripe', 'paypal', 'bank_transfer'],
  warehouse_name: 'Treviso Global Hub',
};

const DEFAULT_AI_CONFIG: AiPublicConfig = {
  enabled: true,
  displayMode: 'agent',
  bubblePosition: 'right',
  activeProvider: 'gemini',
  greeting_en: 'Ask me to recommend a shirt by climate, fabric, or size — or add it directly to your bag.',
  greeting_no: 'Spør meg om skjortestoff, passform eller størrelse — så legger jeg den rett i handlekurven for deg.',
  greeting_it: 'Chiedimi un consiglio su tessuti, taglie o vestibilità — posso aggiungerla subito al carrello.',
  greeting_vn: 'Hỏi tôi về chất liệu vải, phom dáng hoặc size áo — tôi có thể thêm ngay vào giỏ hàng giúp bạn.',
};

const PROMO_CLAIMED_STORAGE_KEY = 'mn_first_order_promo_claimed_v1';

function getSavedRegionFallback(): RegionCode {
  try {
    const saved = window.localStorage.getItem('mn_region');
    if (saved === 'en' || saved === 'no' || saved === 'it' || saved === 'vn') return saved;
  } catch {
    // ignore
  }
  return 'en';
}

function getInitialPromoClaimed(): boolean {
  try {
    return window.localStorage.getItem(PROMO_CLAIMED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export default function App() {
  const initialRoute = useMemo(() => {
    try {
      return parseStorefrontUrl(window.location.pathname);
    } catch {
      return { view: 'home' as AppView };
    }
  }, []);

  const [regionCode, setRegionCode] = useState<RegionCode>(
    () => initialRoute.region || getSavedRegionFallback()
  );
  const [regions, setRegions] = useState<RegionConfig[]>([DEFAULT_REGION]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemRecord[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlideRecord[]>([]);
  const [topBanner, setTopBanner] = useState<TopBannerSettings>(DEFAULT_TOP_BANNER_SETTINGS);
  const [homePage, setHomePage] = useState<HomePageSettings>(DEFAULT_HOME_PAGE_SETTINGS);
  const [promoRules, setPromoRules] = useState<PromotionPopupSettings>(DEFAULT_PROMO_POPUP_SETTINGS);
  const [bulkDiscount, setBulkDiscount] = useState<BulkDiscountSettings>(DEFAULT_BULK_DISCOUNT_SETTINGS);
  const [aiConfig, setAiConfig] = useState<AiPublicConfig>(DEFAULT_AI_CONFIG);
  const [customerAuthConfig, setCustomerAuthConfig] = useState<CustomerAuthPublicConfig>({
    ...DEFAULT_CUSTOMER_AUTH_SETTINGS,
    googleConfigured: false,
  });
  const [activePromoCode, setActivePromoCode] = useState('');
  const [promoClaimedOrUsed, setPromoClaimedOrUsed] = useState<boolean>(getInitialPromoClaimed);
  const [products, setProducts] = useState<Product[]>([]);
  const [tailoringSpecs, setTailoringSpecs] = useState<TailoringSizeSpec[]>([]);
  const [tailoringOptions, setTailoringOptions] = useState<TailoringOptionRecord[]>([]);
  const [tailoringSurcharges, setTailoringSurcharges] = useState<Record<RegionCode, number>>(
    DEFAULT_TAILORING_SURCHARGE
  );
  const [loading, setLoading] = useState(true);

  const [activeView, setActiveView] = useState<AppView>(initialRoute.view);
  const [adminTab, setAdminTab] = useState<AdminTab>(initialRoute.adminTab || 'overview');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialRoute.category || 'all');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    initialRoute.view === 'product' ? initialRoute.slug || null : null
  );
  const [b2bProductSlug, setB2bProductSlug] = useState<string | null>(
    initialRoute.view === 'b2b' ? initialRoute.slug || null : null
  );
  const [infoPage, setInfoPage] = useState<InfoPageSlug>(() => {
    if (initialRoute.view === 'info') {
      return resolveInfoPageSlug(initialRoute.infoPage || initialRoute.slug) || 'returns';
    }
    return 'returns';
  });
  const [reviewToken, setReviewToken] = useState<string | null>(() => {
    try {
      return new URLSearchParams(window.location.search).get('reviewToken');
    } catch {
      return null;
    }
  });
  const [searchQuery, setSearchQuery] = useState('');

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = window.localStorage.getItem('mn_cart_v1');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [drawerState, setDrawerState] = useState<{ open: boolean; mode: 'bag' | 'wishlist' }>({
    open: false,
    mode: 'bag',
  });
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<'size_guide' | 'return_form' | null>(null);

  // Persist staff/customer session so admin does not drop on refresh
  const AUTH_STORAGE_KEY = 'mn_auth_session_v1';
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { token?: string };
      return parsed.token || null;
    } catch {
      return null;
    }
  });
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { user?: AuthUser };
      return parsed.user || null;
    } catch {
      return null;
    }
  });

  const persistAuth = useCallback((token: string | null, user: AuthUser | null) => {
    setAuthToken(token);
    setAuthUser(user);
    try {
      if (token && user) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
      } else {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch {
      // ignore quota / private mode
    }
  }, []);

  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    fetch('/api/auth/status', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.user) {
          persistAuth(authToken, data.user as AuthUser);
        } else {
          persistAuth(null, null);
        }
      })
      .catch(() => {
        // keep cached session offline; next admin call will revalidate
      });
    return () => {
      cancelled = true;
    };
  }, [authToken, persistAuth]);

  const getVisitorSessionId = useCallback(() => {
    try {
      let sid = window.sessionStorage.getItem('mn_visitor_sid') || '';
      if (!sid) {
        sid = `v-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
        window.sessionStorage.setItem('mn_visitor_sid', sid);
      }
      return sid;
    } catch {
      return `v-${Date.now()}`;
    }
  }, []);

  const fetchStorefront = useCallback(async (targetRegion: RegionCode) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/storefront/bootstrap?region=${targetRegion}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.regions)) setRegions(data.regions);
      if (Array.isArray(data.categories)) setCategories(data.categories);
      if (Array.isArray(data.menuItems)) setMenuItems(data.menuItems);
      if (Array.isArray(data.heroSlides)) setHeroSlides(data.heroSlides);
      if (data.topBanner) setTopBanner(data.topBanner);
      if (data.homePage) setHomePage(data.homePage);
      if (data.promoRules) setPromoRules(data.promoRules);
      if (data.bulkDiscount) setBulkDiscount(data.bulkDiscount);
      if (data.aiConfig) setAiConfig(data.aiConfig);
      if (data.customerAuthConfig) setCustomerAuthConfig(data.customerAuthConfig);
      const surcharges: Record<RegionCode, number> =
        data.tailoringSurcharges || DEFAULT_TAILORING_SURCHARGE;
      setTailoringSurcharges(surcharges);
      if (Array.isArray(data.tailoringSpecs)) setTailoringSpecs(data.tailoringSpecs);
      if (Array.isArray(data.tailoringOptions)) setTailoringOptions(data.tailoringOptions);
      if (Array.isArray(data.products)) {
        setProducts(data.products);
        // Sync regional unit prices (including variant + tailoring surcharge) for items already in bag
        setCart((prev) =>
          prev.map((item) => {
            const fresh = (data.products as Product[]).find((p) => p.id === item.productId);
            if (!fresh) return item;
            const variantResolved = resolveVariantPriceAndStock(
              fresh,
              targetRegion,
              item.tailoring.fit,
              item.tailoring.size
            );
            const itemSurcharge = calculateTailoringSurcharge(
              item.tailoring,
              targetRegion,
              surcharges
            );
            return {
              ...item,
              title: fresh.title,
              sku: variantResolved.variantSku,
              unitPrice: variantResolved.price + itemSurcharge,
              stockQty: variantResolved.stockQty,
              tailoring: {
                ...item.tailoring,
                tailoringSurcharge: itemSurcharge,
              },
            };
          })
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStorefront(regionCode);
  }, [regionCode, fetchStorefront]);

  useEffect(() => {
    if (activeView === 'admin') return;
    const sid = getVisitorSessionId();
    const sendHeartbeat = () => {
      let tz = '';
      let loc = '';
      try {
        tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        loc = navigator.language || '';
      } catch {
        // ignore
      }
      fetch('/api/analytics/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sid,
          regionCode,
          path: window.location.pathname || activeView,
          timezone: tz,
          locale: loc,
        }),
      }).catch(() => {});
    };
    sendHeartbeat();
    const timer = window.setInterval(sendHeartbeat, 15000);
    return () => window.clearInterval(timer);
  }, [regionCode, activeView, selectedCategory, selectedSlug, getVisitorSessionId]);

  // Persist bag locally and sync to server for abandoned-cart emails
  useEffect(() => {
    try {
      window.localStorage.setItem('mn_cart_v1', JSON.stringify(cart));
    } catch {
      // ignore quota errors
    }

    if (activeView === 'admin') return;
    const timer = window.setTimeout(() => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      let knownEmail = authUser?.email || '';
      try {
        knownEmail = knownEmail || window.localStorage.getItem('mn_cart_email') || '';
      } catch {
        // ignore
      }
      fetch('/api/cart/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId: getVisitorSessionId(),
          regionCode,
          email: knownEmail || undefined,
          customerName: authUser?.name || undefined,
          items: cart.map((i) => ({
            productId: i.productId,
            slug: i.slug,
            sku: i.sku,
            title: i.title,
            image: i.image,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
          })),
        }),
      }).catch(() => {});
    }, 700);
    return () => window.clearTimeout(timer);
  }, [cart, regionCode, authToken, authUser, activeView, getVisitorSessionId]);

  const markPromoClaimedOrUsed = useCallback(() => {
    setPromoClaimedOrUsed(true);
    try {
      window.localStorage.setItem(PROMO_CLAIMED_STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const origin = event.origin || '';
      const trustedOrigin =
        origin === window.location.origin ||
        origin.endsWith('.run.app') ||
        origin.includes('localhost');
      if (!trustedOrigin) return;
      const payload = event.data as
        | {
            type?: string;
            token?: string;
            user?: AuthUser;
            discountCode?: string | null;
          }
        | undefined;
      if (payload?.type === 'MN_GOOGLE_AUTH_SUCCESS' && payload.token && payload.user) {
        persistAuth(payload.token, payload.user);
        if (payload.discountCode) {
          setActivePromoCode(payload.discountCode);
          markPromoClaimedOrUsed();
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [markPromoClaimedOrUsed, persistAuth]);

  const pushBrowserUrl = useCallback(
    (
      nextRegion: RegionCode,
      nextView: AppView,
      nextCategory?: string,
      nextSlug?: string | null,
      nextAdminTab?: AdminTab
    ) => {
      try {
        const nextPath = buildStorefrontPath({
          regionCode: nextRegion,
          view: nextView,
          category: nextCategory,
          slug: nextSlug,
          adminTab: nextAdminTab,
        });
        if (window.location.pathname !== nextPath) {
          window.history.pushState(
            {
              regionCode: nextRegion,
              view: nextView,
              category: nextCategory,
              slug: nextSlug,
              adminTab: nextAdminTab,
            },
            '',
            nextPath
          );
        }
      } catch {
        // ignore
      }
    },
    []
  );

  useEffect(() => {
    const onPopState = () => {
      const parsed = parseStorefrontUrl(window.location.pathname);
      if (parsed.region) setRegionCode(parsed.region);
      setActiveView(parsed.view);
      if (parsed.adminTab) setAdminTab(parsed.adminTab);
      setSelectedCategory(parsed.category || 'all');
      setSelectedSlug(parsed.view === 'product' ? parsed.slug || null : null);
      setB2bProductSlug(parsed.view === 'b2b' ? parsed.slug || null : null);
      if (parsed.view === 'info') {
        setInfoPage(resolveInfoPageSlug(parsed.infoPage || parsed.slug) || 'returns');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleSelectRegion = (next: RegionCode) => {
    setRegionCode(next);
    try {
      window.localStorage.setItem('mn_region', next);
    } catch {
      // ignore
    }
    pushBrowserUrl(
      next,
      activeView,
      selectedCategory,
      activeView === 'b2b'
        ? b2bProductSlug
        : activeView === 'info'
          ? infoPage
          : selectedSlug,
      activeView === 'admin' ? adminTab : undefined
    );
  };

  const activeRegion = useMemo(
    () => regions.find((r) => r.code === regionCode) || DEFAULT_REGION,
    [regions, regionCode]
  );
  const copy = TRANSLATIONS[regionCode];

  const activeProduct = useMemo(
    () => products.find((p) => p.slug === selectedSlug) || products[0] || null,
    [products, selectedSlug]
  );

  useEffect(() => {
    try {
      const origin = window.location.origin;
      const catRecord =
        selectedCategory && selectedCategory !== 'all'
          ? categories.find((c) => c.slug === selectedCategory) || null
          : null;
      const seo = buildSeoMetadata({
        view: activeView,
        region: activeRegion,
        category: selectedCategory,
        categoryRecord: catRecord,
        product: activeView === 'product' ? activeProduct : null,
        slug: activeView === 'info' ? infoPage : undefined,
        origin,
      });

      document.documentElement.lang =
        regionCode === 'no' ? 'nb' : regionCode === 'it' ? 'it' : regionCode === 'vn' ? 'vi' : 'en';
      document.title = seo.title;

      const setMetaTag = (attr: 'name' | 'property', key: string, value: string) => {
        let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute(attr, key);
          document.head.appendChild(el);
        }
        el.content = value;
      };

      setMetaTag('name', 'description', seo.description);
      setMetaTag('name', 'keywords', seo.keywords);
      setMetaTag('name', 'robots', seo.robots);
      setMetaTag('property', 'og:title', seo.title);
      setMetaTag('property', 'og:description', seo.description);
      setMetaTag('property', 'og:type', seo.ogType);
      setMetaTag('property', 'og:site_name', seo.ogSiteName);
      setMetaTag('property', 'og:locale', seo.ogLocale);
      setMetaTag('property', 'og:url', seo.canonicalUrl);
      setMetaTag('property', 'og:image', seo.ogImage);
      setMetaTag('property', 'og:image:alt', seo.ogImageAlt);
      if (seo.productMeta) {
        setMetaTag('property', 'product:price:amount', String(seo.productMeta.priceAmount));
        setMetaTag('property', 'product:price:currency', seo.productMeta.priceCurrency);
        setMetaTag('property', 'product:availability', seo.productMeta.availability);
        setMetaTag('property', 'product:retailer_item_id', seo.productMeta.retailerItemId);
      }
      setMetaTag('name', 'twitter:card', 'summary_large_image');
      setMetaTag('name', 'twitter:title', seo.title);
      setMetaTag('name', 'twitter:description', seo.description);
      setMetaTag('name', 'twitter:image', seo.ogImage);
      setMetaTag('property', 'og:image:width', '1200');
      setMetaTag('property', 'og:image:height', '630');

      let canonicalEl = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!canonicalEl) {
        canonicalEl = document.createElement('link');
        canonicalEl.rel = 'canonical';
        document.head.appendChild(canonicalEl);
      }
      canonicalEl.href = seo.canonicalUrl;

      document.head.querySelectorAll('link[data-mn-hreflang="1"]').forEach((node) => node.remove());
      seo.hreflangs.forEach((alt) => {
        const linkEl = document.createElement('link');
        linkEl.rel = 'alternate';
        linkEl.hreflang = alt.hreflang;
        linkEl.href = alt.href;
        linkEl.setAttribute('data-mn-hreflang', '1');
        document.head.appendChild(linkEl);
      });

      let jsonLdEl = document.getElementById('mn-structured-data') as HTMLScriptElement | null;
      if (!jsonLdEl) {
        jsonLdEl = document.createElement('script');
        jsonLdEl.id = 'mn-structured-data';
        jsonLdEl.type = 'application/ld+json';
        document.head.appendChild(jsonLdEl);
      }
      jsonLdEl.textContent = JSON.stringify(seo.jsonLd);
    } catch {
      // ignore DOM head sync errors in non-browser contexts
    }
  }, [activeView, activeRegion, regionCode, selectedCategory, categories, activeProduct, infoPage]);

  const navigate = (
    view: AppView,
    opts?: {
      category?: string;
      slug?: string;
      reviewToken?: string | null;
      adminTab?: AdminTab;
      infoPage?: InfoPageSlug;
    }
  ) => {
    const nextCat = opts?.category !== undefined ? opts.category : selectedCategory;
    const nextInfo =
      opts?.infoPage !== undefined
        ? opts.infoPage
        : view === 'info'
          ? infoPage
          : null;
    const nextSlug =
      opts?.slug !== undefined
        ? opts.slug
        : view === 'product'
          ? selectedSlug
          : view === 'b2b'
            ? b2bProductSlug
            : view === 'info'
              ? nextInfo
              : null;
    const nextAdminTab = opts?.adminTab !== undefined ? opts.adminTab : adminTab;
    if (opts?.category !== undefined) setSelectedCategory(opts.category);
    if (opts?.slug !== undefined && view !== 'info') setSelectedSlug(opts.slug);
    if (opts?.infoPage !== undefined) setInfoPage(opts.infoPage);
    else if (view === 'info' && opts?.slug) {
      const resolved = resolveInfoPageSlug(opts.slug);
      if (resolved) setInfoPage(resolved);
    }
    if (opts?.adminTab !== undefined) setAdminTab(opts.adminTab);
    if (opts?.reviewToken !== undefined) {
      setReviewToken(opts.reviewToken);
    } else if (view !== 'product') {
      setReviewToken(null);
    }
    setActiveView(view);
    pushBrowserUrl(
      regionCode,
      view,
      nextCat,
      view === 'info' ? nextInfo || infoPage : nextSlug,
      view === 'admin' ? nextAdminTab : undefined
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToBag = (product: Product, tailoring: BespokeTailoring) => {
    const variantResolved = resolveVariantPriceAndStock(
      product,
      regionCode,
      tailoring.fit,
      tailoring.size
    );
    const surcharge = calculateTailoringSurcharge(tailoring, regionCode, tailoringSurcharges);
    const finalUnitPrice = variantResolved.price + surcharge;
    const enrichedTailoring: BespokeTailoring = {
      ...tailoring,
      tailoringSurcharge: surcharge,
    };

    const cartKey = [
      product.id,
      tailoring.fit,
      tailoring.size,
      tailoring.collar,
      tailoring.cuff,
      tailoring.lengthAdjustmentCm,
      tailoring.sleeveAdjustmentCm,
      tailoring.waistAdjustmentCm || 0,
      tailoring.chestAdjustmentCm || 0,
      tailoring.bottomHemAdjustmentCm || 0,
      tailoring.shoulderAdjustmentCm || 0,
      tailoring.monogram || '',
    ].join('-');

    setCart((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey);
      if (existing) {
        return prev.map((i) =>
          i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          cartKey,
          productId: product.id,
          slug: product.slug,
          sku: variantResolved.variantSku,
          title: product.title,
          image: product.primary_image,
          unitPrice: finalUnitPrice,
          quantity: 1,
          stockQty: variantResolved.stockQty,
          preorderAllowed: product.preorder_allowed,
          tailoring: enrichedTailoring,
        },
      ];
    });
    setDrawerState({ open: true, mode: 'bag' });
  };

  const handleToggleWishlist = (productId: number) => {
    setWishlistIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleQuickAddToBag = (
    product: Product,
    size?: string,
    fit: string = 'Regular Fit'
  ) => {
    const resolvedSize =
      size && product.sizes.includes(size) ? size : product.sizes[Math.floor(product.sizes.length / 2)] || '40 / M';
    const ordCollars = resolveOrderedTailoringOptions('collar', product.collars, tailoringOptions);
    const ordCuffs = resolveOrderedTailoringOptions('cuff', product.cuffs, tailoringOptions);
    handleAddToBag(product, {
      fit,
      size: resolvedSize,
      collar: ordCollars.find((c) => c.isDefault)?.name || ordCollars[0]?.name || 'Spread',
      cuff: ordCuffs.find((c) => c.isDefault)?.name || ordCuffs[0]?.name || 'Modern',
      sleeveAdjustmentCm: 0,
      lengthAdjustmentCm: 0,
      waistAdjustmentCm: 0,
      chestAdjustmentCm: 0,
      bottomHemAdjustmentCm: 0,
      shoulderAdjustmentCm: 0,
    });
  };

  const handleExecuteAiAction = (action: AiAgentAction) => {
    if (action.type === 'switch_region' && action.regionCode) {
      handleSelectRegion(action.regionCode);
      return;
    }
    if (action.type === 'apply_coupon' && action.couponCode) {
      setActivePromoCode(action.couponCode.toUpperCase());
      if (cart.length > 0) {
        navigate('checkout');
      }
      return;
    }
    if (action.type === 'open_checkout') {
      navigate('checkout');
      return;
    }
    if (action.type === 'open_about') {
      navigate('about');
      return;
    }
    if (action.type === 'open_b2b') {
      navigate('b2b');
      return;
    }
    if (action.type === 'open_category') {
      navigate('catalog', { category: action.categorySlug || 'all' });
      return;
    }
    if (action.type === 'open_product' && action.productSlug) {
      navigate('product', { slug: action.productSlug });
      return;
    }
    if (action.type === 'add_to_cart' && action.productSlug) {
      const target = products.find((p) => p.slug === action.productSlug || p.sku === action.productSlug);
      if (target) {
        handleQuickAddToBag(target, action.size, action.fit);
      }
    }
  };

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartSubtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const wishlistProducts = products.filter((p) => wishlistIds.includes(p.id));
  const hasTopBannerText = Boolean(
    topBanner.enabled &&
      (topBanner[`text_${regionCode}` as keyof TopBannerSettings] || topBanner.text_en)
  );
  const topBannerSpacerClass = !hasTopBannerText
    ? ''
    : topBanner.visibility === 'desktop_only'
    ? 'hidden md:block h-7'
    : topBanner.visibility === 'mobile_only'
    ? 'md:hidden h-7'
    : 'h-7';

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1A1A1A]">
      {activeView !== 'admin' && (
        <Navbar
          activeView={activeView}
          isTransparentOverHero={activeView === 'home'}
          showScrollProgress={activeView === 'product'}
          authUser={authUser}
          region={activeRegion}
          regions={regions}
          categories={categories}
          menuItems={menuItems}
          topBanner={topBanner}
          copy={copy}
          cartCount={cartCount}
          wishlistCount={wishlistIds.length}
          onSelectRegion={handleSelectRegion}
          onNavigate={(view, opts) => navigate(view, opts)}
          onOpenSearch={() => setSearchModalOpen(true)}
          onOpenBag={() => setDrawerState({ open: true, mode: 'bag' })}
          onOpenWishlist={() => setDrawerState({ open: true, mode: 'wishlist' })}
        />
      )}

      <div className="flex-1">
        {activeView !== 'home' && activeView !== 'admin' && topBannerSpacerClass && (
          <div className={topBannerSpacerClass} aria-hidden="true" />
        )}
        {loading && products.length === 0 ? (
          <div className="pt-32 pb-24 text-center text-xs uppercase tracking-widest text-neutral-400">
            Monte Napoleone 1974...
          </div>
        ) : activeView === 'home' ? (
          <HeroAndHome
            region={activeRegion}
            copy={copy}
            heroSlides={heroSlides}
            homePage={homePage}
            featuredProducts={resolveHomeFeaturedProducts(products, homePage)}
            onNavigateCatalog={(category = 'all') => navigate('catalog', { category })}
            onNavigateB2B={() => navigate('b2b')}
            onNavigateAbout={() => navigate('about')}
            onOpenProduct={(slug) => navigate('product', { slug })}
            onOpenSizeGuide={() => setInfoModal('size_guide')}
          />
        ) : activeView === 'catalog' ? (
          <CatalogView
            region={activeRegion}
            copy={copy}
            categories={categories}
            products={products}
            selectedCategory={selectedCategory}
            searchQuery={searchQuery}
            wishlistIds={wishlistIds}
            onSelectCategory={setSelectedCategory}
            onSearchChange={setSearchQuery}
            onOpenProduct={(slug) => navigate('product', { slug })}
            onToggleWishlist={handleToggleWishlist}
            onNavigateB2B={() => navigate('b2b')}
          />
        ) : activeView === 'about' ? (
          <AboutUsView
            region={activeRegion}
            copy={copy}
            onNavigateCatalog={() => navigate('catalog', { category: 'all' })}
            onNavigateB2B={() => navigate('b2b')}
          />
        ) : activeView === 'info' ? (
          <InfoPagesView
            region={activeRegion}
            copy={copy}
            page={infoPage}
            onNavigatePage={(page) => navigate('info', { infoPage: page, slug: page })}
            onNavigateCatalog={() => navigate('catalog', { category: 'all' })}
            onNavigateHome={() => navigate('home')}
          />
        ) : activeView === 'product' && activeProduct ? (
          <ProductDetailView
            product={activeProduct}
            recommendations={products.filter((p) => p.id !== activeProduct.id)}
            region={activeRegion}
            copy={copy}
            tailoringSpecs={tailoringSpecs}
            tailoringOptions={tailoringOptions}
            tailoringSurcharges={tailoringSurcharges}
            authToken={authToken}
            reviewToken={reviewToken}
            inWishlist={wishlistIds.includes(activeProduct.id)}
            wishlistIds={wishlistIds}
            onBack={() => navigate('catalog')}
            onOpenProduct={(slug) => navigate('product', { slug, reviewToken: null })}
            onToggleWishlist={handleToggleWishlist}
            onAddToBag={handleAddToBag}
            onSwitchToB2B={(p) => {
              setB2bProductSlug(p.slug);
              navigate('b2b');
            }}
            onOpenSizeGuide={() => setInfoModal('size_guide')}
            onOpenReturnForm={() => setInfoModal('return_form')}
            onProductReviewSubmitted={() => fetchStorefront(regionCode)}
          />
        ) : activeView === 'b2b' ? (
          <B2BView
            region={activeRegion}
            copy={copy}
            categories={categories}
            products={products}
            tailoringOptions={tailoringOptions}
            wishlistIds={wishlistIds}
            initialProductSlug={b2bProductSlug}
            onClearInitialProduct={() => setB2bProductSlug(null)}
            onSwitchToB2C={(slug) => {
              setB2bProductSlug(null);
              navigate('product', { slug });
            }}
            onToggleWishlist={handleToggleWishlist}
            onOpenSizeGuide={() => setInfoModal('size_guide')}
            onOpenReturnForm={() => setInfoModal('return_form')}
          />
        ) : activeView === 'checkout' ? (
          <CheckoutView
            region={activeRegion}
            copy={copy}
            items={cart}
            promoRules={promoRules}
            bulkDiscount={bulkDiscount}
            initialDiscountCode={activePromoCode}
            cartSessionId={getVisitorSessionId()}
            authEmail={authUser?.email || null}
            onClearCart={() => setCart([])}
            onBackToShop={() => navigate('catalog', { category: 'all' })}
            onRefreshStorefront={() => fetchStorefront(regionCode)}
            onOrderCompleted={(usedCode) => {
              if (usedCode) {
                markPromoClaimedOrUsed();
              }
            }}
          />
        ) : activeView === 'account' ? (
          <AccountView
            region={activeRegion}
            copy={copy}
            authToken={authToken}
            authUser={authUser}
            customerAuthConfig={customerAuthConfig}
            onAuthChange={(token, user) => {
              persistAuth(token, user);
            }}
            onPromoUnlocked={(code) => {
              setActivePromoCode(code);
              markPromoClaimedOrUsed();
            }}
            onOpenProduct={(slug, invToken) =>
              navigate('product', { slug, reviewToken: invToken || null })
            }
          />
        ) : (
          <AdminDashboard
            authToken={authToken}
            authUser={authUser}
            initialTab={adminTab}
            onTabChange={(tab) => {
              setAdminTab(tab);
              pushBrowserUrl(regionCode, 'admin', selectedCategory, null, tab);
            }}
            onAuthChange={(token, user) => {
              persistAuth(token, user);
            }}
            onRefreshStorefront={() => fetchStorefront(regionCode)}
            onBackToStorefront={() => navigate('home')}
          />
        )}
      </div>

      {activeView !== 'admin' && (
        <Footer
          region={activeRegion}
          copy={copy}
          onNavigateAbout={() => navigate('about')}
          onNavigateInfo={(page) => navigate('info', { infoPage: page, slug: page })}
          onOpenSizeGuide={() => setInfoModal('size_guide')}
          onPromoCodeUnlocked={(code) => {
            setActivePromoCode(code);
            markPromoClaimedOrUsed();
          }}
          onPromoCodeAlreadyUsed={markPromoClaimedOrUsed}
        />
      )}

      <CartDrawer
        open={drawerState.open}
        mode={drawerState.mode}
        region={activeRegion}
        copy={copy}
        items={cart}
        wishlistProducts={wishlistProducts}
        bulkDiscount={bulkDiscount}
        onClose={() => setDrawerState((prev) => ({ ...prev, open: false }))}
        onUpdateQty={(key, qty) =>
          setCart((prev) =>
            qty <= 0
              ? prev.filter((i) => i.cartKey !== key)
              : prev.map((i) => (i.cartKey === key ? { ...i, quantity: qty } : i))
          )
        }
        onRemoveItem={(key) => setCart((prev) => prev.filter((i) => i.cartKey !== key))}
        onCheckout={() => navigate('checkout')}
        onOpenProduct={(slug) => navigate('product', { slug })}
        onToggleWishlist={handleToggleWishlist}
      />

      <SearchModal
        open={searchModalOpen}
        products={products}
        region={activeRegion}
        onClose={() => setSearchModalOpen(false)}
        onSelectProduct={(slug) => navigate('product', { slug })}
      />

      <InfoModal mode={infoModal} region={activeRegion} onClose={() => setInfoModal(null)} />

      {activeView !== 'admin' && (
        <>
          <FirstOrderPopup
            regionCode={regionCode}
            copy={copy}
            promoRules={promoRules}
            isProductPage={activeView === 'product'}
            offerAlreadyUsed={promoClaimedOrUsed}
            onCodeUnlocked={(code) => setActivePromoCode(code)}
            onOfferClaimed={markPromoClaimedOrUsed}
          />

          {activeView !== 'product' && activeView !== 'checkout' && activeView !== 'account' && (
            <GmailLoginCornerPopup
              regionCode={regionCode}
              customerAuthConfig={customerAuthConfig}
              authUser={authUser}
              onOpenAccount={() => navigate('account')}
            />
          )}

          <AiConciergeWidget
            region={activeRegion}
            copy={copy}
            aiConfig={aiConfig}
            products={products}
            hasFloatingPromoLeft={
              promoRules.popupEnabled && promoRules.showFloatingButton && !promoClaimedOrUsed
            }
            isProductPage={activeView === 'product'}
            cartCount={cartCount}
            cartSubtotal={cartSubtotal}
            firstOrderEligible={!promoClaimedOrUsed}
            activePromoCode={activePromoCode}
            currentProductSlug={activeView === 'product' ? activeProduct?.slug || selectedSlug : null}
            onExecuteAction={handleExecuteAiAction}
            onOpenProduct={(slug) => navigate('product', { slug })}
            onQuickAddToBag={handleQuickAddToBag}
          />
        </>
      )}
    </div>
  );
}
