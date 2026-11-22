import { useCallback, useEffect, useMemo, useState } from 'react';
import { TRANSLATIONS } from './i18n/translations.ts';
import type {
  AiAgentAction,
  AiPublicConfig,
  AuthUser,
  BespokeTailoring,
  BulkDiscountSettings,
  CartItem,
  CategoryRecord,
  HeroSlideRecord,
  MenuItemRecord,
  Product,
  PromotionPopupSettings,
  RegionCode,
  RegionConfig,
  TailoringSizeSpec,
} from './types.ts';
import {
  calculateTailoringSurcharge,
  DEFAULT_BULK_DISCOUNT_SETTINGS,
  DEFAULT_PROMO_POPUP_SETTINGS,
  DEFAULT_TAILORING_SURCHARGE,
  resolveVariantPriceAndStock,
} from './utils/commerce.ts';
import { Navbar, type AppView } from './components/Navbar.tsx';
import { HeroAndHome } from './components/HeroAndHome.tsx';
import { CatalogView } from './components/CatalogView.tsx';
import { ProductDetailView } from './components/ProductDetailView.tsx';
import { AboutUsView } from './components/AboutUsView.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { CheckoutView } from './components/CheckoutView.tsx';
import { AccountView, B2BView } from './components/B2BAndAccountView.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { Footer } from './components/Footer.tsx';
import { InfoModal, SearchModal } from './components/Modals.tsx';
import { FirstOrderPopup } from './components/FirstOrderPopup.tsx';
import { AiConciergeWidget } from './components/AiConciergeWidget.tsx';

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

function getInitialRegion(): RegionCode {
  try {
    const saved = window.localStorage.getItem('mn_region');
    if (saved === 'en' || saved === 'no' || saved === 'it' || saved === 'vn') return saved;
  } catch {
    // ignore
  }
  return 'en';
}

export default function App() {
  const [regionCode, setRegionCode] = useState<RegionCode>(getInitialRegion);
  const [regions, setRegions] = useState<RegionConfig[]>([DEFAULT_REGION]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemRecord[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlideRecord[]>([]);
  const [promoRules, setPromoRules] = useState<PromotionPopupSettings>(DEFAULT_PROMO_POPUP_SETTINGS);
  const [bulkDiscount, setBulkDiscount] = useState<BulkDiscountSettings>(DEFAULT_BULK_DISCOUNT_SETTINGS);
  const [aiConfig, setAiConfig] = useState<AiPublicConfig>(DEFAULT_AI_CONFIG);
  const [activePromoCode, setActivePromoCode] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [tailoringSpecs, setTailoringSpecs] = useState<TailoringSizeSpec[]>([]);
  const [tailoringSurcharges, setTailoringSurcharges] = useState<Record<RegionCode, number>>(
    DEFAULT_TAILORING_SURCHARGE
  );
  const [loading, setLoading] = useState(true);

  const [activeView, setActiveView] = useState<AppView>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [b2bProductSlug, setB2bProductSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [drawerState, setDrawerState] = useState<{ open: boolean; mode: 'bag' | 'wishlist' }>({
    open: false,
    mode: 'bag',
  });
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<'size_guide' | 'return_form' | null>(null);

  // Auth token strictly in React memory (never localStorage)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

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
      if (data.promoRules) setPromoRules(data.promoRules);
      if (data.bulkDiscount) setBulkDiscount(data.bulkDiscount);
      if (data.aiConfig) setAiConfig(data.aiConfig);
      const surcharges: Record<RegionCode, number> =
        data.tailoringSurcharges || DEFAULT_TAILORING_SURCHARGE;
      setTailoringSurcharges(surcharges);
      if (Array.isArray(data.tailoringSpecs)) setTailoringSpecs(data.tailoringSpecs);
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
    let sid = '';
    try {
      sid = window.sessionStorage.getItem('mn_visitor_sid') || '';
      if (!sid) {
        sid = `v-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
        window.sessionStorage.setItem('mn_visitor_sid', sid);
      }
    } catch {
      sid = `v-${Date.now()}`;
    }
    fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        regionCode,
        path: activeView,
      }),
    }).catch(() => {});
  }, [regionCode, activeView]);

  const handleSelectRegion = (next: RegionCode) => {
    setRegionCode(next);
    try {
      window.localStorage.setItem('mn_region', next);
    } catch {
      // ignore
    }
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

  const navigate = (view: AppView, opts?: { category?: string; slug?: string }) => {
    if (opts?.category !== undefined) setSelectedCategory(opts.category);
    if (opts?.slug !== undefined) setSelectedSlug(opts.slug);
    setActiveView(view);
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
    fit: 'Slim Fit' | 'Regular Fit' | 'Contemporary Fit' = 'Regular Fit'
  ) => {
    const resolvedSize =
      size && product.sizes.includes(size) ? size : product.sizes[Math.floor(product.sizes.length / 2)] || '40 / M';
    handleAddToBag(product, {
      fit,
      size: resolvedSize,
      collar: product.collars[0] || 'Cutaway',
      cuff: product.cuffs[0] || 'Single Cuff (Round)',
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
  const wishlistProducts = products.filter((p) => wishlistIds.includes(p.id));

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1A1A1A]">
      {activeView !== 'admin' && (
        <Navbar
          activeView={activeView}
          isTransparentOverHero={activeView === 'home'}
          region={activeRegion}
          regions={regions}
          categories={categories}
          menuItems={menuItems}
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
        {loading && products.length === 0 ? (
          <div className="pt-32 pb-24 text-center text-xs uppercase tracking-widest text-neutral-400">
            Monte Napoleone 1974...
          </div>
        ) : activeView === 'home' ? (
          <HeroAndHome
            region={activeRegion}
            copy={copy}
            heroSlides={heroSlides}
            featuredProducts={products.filter((p) => p.is_featured)}
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
        ) : activeView === 'product' && activeProduct ? (
          <ProductDetailView
            product={activeProduct}
            recommendations={products.filter((p) => p.id !== activeProduct.id)}
            region={activeRegion}
            copy={copy}
            tailoringSpecs={tailoringSpecs}
            tailoringSurcharges={tailoringSurcharges}
            inWishlist={wishlistIds.includes(activeProduct.id)}
            wishlistIds={wishlistIds}
            onBack={() => navigate('catalog')}
            onOpenProduct={(slug) => navigate('product', { slug })}
            onToggleWishlist={handleToggleWishlist}
            onAddToBag={handleAddToBag}
            onSwitchToB2B={(p) => {
              setB2bProductSlug(p.slug);
              navigate('b2b');
            }}
            onOpenSizeGuide={() => setInfoModal('size_guide')}
            onOpenReturnForm={() => setInfoModal('return_form')}
          />
        ) : activeView === 'b2b' ? (
          <B2BView
            region={activeRegion}
            copy={copy}
            categories={categories}
            products={products}
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
            onClearCart={() => setCart([])}
            onBackToShop={() => navigate('catalog', { category: 'all' })}
            onRefreshStorefront={() => fetchStorefront(regionCode)}
          />
        ) : activeView === 'account' ? (
          <AccountView
            region={activeRegion}
            copy={copy}
            onOpenAdmin={() => navigate('admin')}
          />
        ) : (
          <AdminDashboard
            authToken={authToken}
            authUser={authUser}
            onAuthChange={(token, user) => {
              setAuthToken(token);
              setAuthUser(user);
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
          onNavigateB2B={() => navigate('b2b')}
          onNavigateAccount={() => navigate('account')}
          onNavigateAbout={() => navigate('about')}
          onOpenSizeGuide={() => setInfoModal('size_guide')}
          onPromoCodeUnlocked={(code) => setActivePromoCode(code)}
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

      <InfoModal mode={infoModal} onClose={() => setInfoModal(null)} />

      {activeView !== 'admin' && (
        <>
          <FirstOrderPopup
            regionCode={regionCode}
            copy={copy}
            promoRules={promoRules}
            onCodeUnlocked={(code) => setActivePromoCode(code)}
          />

          <AiConciergeWidget
            region={activeRegion}
            copy={copy}
            aiConfig={aiConfig}
            products={products}
            hasFloatingPromoLeft={promoRules.popupEnabled && promoRules.showFloatingButton}
            onExecuteAction={handleExecuteAiAction}
            onOpenProduct={(slug) => navigate('product', { slug })}
            onQuickAddToBag={handleQuickAddToBag}
          />
        </>
      )}
    </div>
  );
}
