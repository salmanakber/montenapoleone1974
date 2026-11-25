import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import type {
  AuthUser,
  CategoryRecord,
  MenuItemRecord,
  RegionCode,
  RegionConfig,
  TopBannerSettings,
} from '../types.ts';
import type { RegionCopy } from '../i18n/translations.ts';

export type AppView =
  | 'home'
  | 'catalog'
  | 'product'
  | 'b2b'
  | 'about'
  | 'info'
  | 'checkout'
  | 'account'
  | 'admin';

interface NavbarProps {
  activeView: AppView;
  isTransparentOverHero: boolean;
  showScrollProgress?: boolean;
  authUser?: AuthUser | null;
  region: RegionConfig;
  regions: RegionConfig[];
  categories: CategoryRecord[];
  menuItems?: MenuItemRecord[];
  topBanner?: TopBannerSettings;
  copy: RegionCopy;
  cartCount: number;
  wishlistCount: number;
  onSelectRegion: (code: RegionCode) => void;
  onNavigate: (view: AppView, opts?: { category?: string }) => void;
  onOpenSearch: () => void;
  onOpenBag: () => void;
  onOpenWishlist: () => void;
}

const RegionFlagCircle: React.FC<{ code: RegionCode; size?: 'sm' | 'md' }> = ({
  code,
  size = 'md',
}) => {
  const dim = size === 'sm' ? 'w-6 h-6 sm:w-7 sm:h-7' : 'w-7 h-7';
  if (code === 'it') {
    return (
      <span
        className={`${dim} rounded-full overflow-hidden border border-black/10 shrink-0 inline-flex`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 28 28" className="w-full h-full">
          <rect x="0" y="0" width="9.33" height="28" fill="#009246" />
          <rect x="9.33" y="0" width="9.34" height="28" fill="#FFFFFF" />
          <rect x="18.67" y="0" width="9.33" height="28" fill="#CE2B37" />
        </svg>
      </span>
    );
  }
  if (code === 'no') {
    return (
      <span
        className={`${dim} rounded-full overflow-hidden border border-black/10 shrink-0 inline-flex`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 28 28" className="w-full h-full">
          <rect width="28" height="28" fill="#BA0C2F" />
          <rect x="8" y="0" width="6" height="28" fill="#FFFFFF" />
          <rect x="0" y="11" width="28" height="6" fill="#FFFFFF" />
          <rect x="9.5" y="0" width="3" height="28" fill="#00205B" />
          <rect x="0" y="12.5" width="28" height="3" fill="#00205B" />
        </svg>
      </span>
    );
  }
  if (code === 'vn') {
    return (
      <span
        className={`${dim} rounded-full overflow-hidden border border-black/10 shrink-0 inline-flex`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 28 28" className="w-full h-full">
          <rect width="28" height="28" fill="#DA251D" />
          <polygon
            points="14,6.5 16.1,12.8 22.7,12.8 17.3,16.7 19.4,23 14,19.1 8.6,23 10.7,16.7 5.3,12.8 11.9,12.8"
            fill="#FFCD00"
          />
        </svg>
      </span>
    );
  }
  return (
    <span
      className={`${dim} rounded-full bg-[#ECEEEF] text-neutral-600 border border-black/10 shrink-0 inline-flex items-center justify-center`}
      aria-hidden="true"
    >
      <Globe className="w-3.5 h-3.5" />
    </span>
  );
};

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  isTransparentOverHero,
  showScrollProgress = false,
  authUser = null,
  region,
  regions,
  categories,
  menuItems = [],
  topBanner,
  copy,
  cartCount,
  wishlistCount,
  onSelectRegion,
  onNavigate,
  onOpenSearch,
  onOpenBag,
  onOpenWishlist,
}) => {
  const [regionOpen, setRegionOpen] = useState(false);
  const [b2cOpen, setB2cOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSubmenu, setDrawerSubmenu] = useState<'main' | 'shirts'>('main');
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 28,
    restDelta: 0.001,
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!drawerOpen) setDrawerSubmenu('main');
  }, [drawerOpen]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setRegionOpen(false);
        setB2cOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRegionOpen(false);
        setB2cOpen(false);
        setDrawerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const solidHeader = !isTransparentOverHero || scrolled || regionOpen || b2cOpen || drawerOpen;
  const floatingStickyBar = scrolled && !regionOpen && !b2cOpen && !drawerOpen;

  const getCategoryName = (cat: CategoryRecord): string => {
    if (region.code === 'no') return cat.name_no;
    if (region.code === 'it') return cat.name_it;
    if (region.code === 'vn') return cat.name_vn;
    return cat.name_en;
  };

  const getMenuTitle = (item: MenuItemRecord): string => {
    if (region.code === 'no') return item.title_no;
    if (region.code === 'it') return item.title_it;
    if (region.code === 'vn') return item.title_vn;
    return item.title_en;
  };

  const activeMegaCards = menuItems.filter((m) => m.active && m.slot === 'mega_card');
  const activeNavLinks = menuItems.filter((m) => m.active && m.slot === 'nav_link');

  const resolvedMegaCards =
    activeMegaCards.length > 0
      ? activeMegaCards.map((m) => ({
          id: String(m.id),
          label: getMenuTitle(m),
          targetType: m.target_type,
          targetValue: m.target_value,
          image: m.image_url,
        }))
      : copy.nav.megaCategories.map((c, i) => ({
          id: `fallback-${i}`,
          label: c.label,
          targetType: 'category' as const,
          targetValue: c.category,
          image: c.image,
        }));

  const resolvedTopBannerText = topBanner
    ? region.code === 'no'
      ? topBanner.text_no
      : region.code === 'it'
      ? topBanner.text_it
      : region.code === 'vn'
      ? topBanner.text_vn
      : topBanner.text_en
    : '';

  const topBannerVisibilityClass =
    topBanner?.visibility === 'desktop_only'
      ? 'hidden md:flex'
      : topBanner?.visibility === 'mobile_only'
      ? 'flex md:hidden'
      : 'flex';

  const showTopBannerStrip =
    Boolean(topBanner?.enabled && resolvedTopBannerText?.trim()) && !floatingStickyBar;

  return (
    <>
      <header
        ref={headerRef}
        data-sticky-mode={floatingStickyBar ? 'floating' : 'anchored'}
        className={`fixed z-40 transition-all duration-300 ${
          floatingStickyBar
            ? 'top-2 inset-x-0 sm:inset-x-2 max-w-[1640px] mx-auto rounded-none shadow-md border border-black/10 bg-white/95 backdrop-blur-md text-[#1A1A1A]'
            : solidHeader
            ? 'top-0 left-0 right-0 bg-white/98 backdrop-blur-md text-[#1A1A1A] border-b border-black/10'
            : 'top-0 left-0 right-0 bg-gradient-to-b from-black/45 to-transparent text-white'
        }`}
      >
        {showTopBannerStrip && topBanner && (
          <div
            data-testid="top-promo-banner"
            style={{
              backgroundColor: topBanner.bgColor || '#142B4E',
              color: topBanner.textColor || '#FFFFFF',
            }}
            className={`${topBannerVisibilityClass} w-full items-center justify-center px-3 py-1.5 text-center text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.14em] border-b border-black/10`}
          >
            {topBanner.linkView && topBanner.linkView !== 'none' ? (
              <button
                type="button"
                onClick={() => {
                  if (topBanner.linkView === 'catalog') {
                    onNavigate('catalog', { category: topBanner.linkCategory || 'all' });
                  } else {
                    onNavigate(topBanner.linkView as AppView);
                  }
                }}
                className="hover:underline underline-offset-4 cursor-pointer truncate max-w-[1540px]"
              >
                {resolvedTopBannerText}
              </button>
            ) : (
              <span className="truncate max-w-[1540px]">{resolvedTopBannerText}</span>
            )}
          </div>
        )}
        <div className="max-w-[1640px] mx-auto px-3 sm:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4 relative">
          {/* Left Zone: Hamburger + Region / Currency Switcher (Matches Screenshot 1) */}
          <div className="flex items-center gap-1.5 sm:gap-5 min-w-0">
            <button
              type="button"
              onClick={() => {
                setB2cOpen(false);
                setRegionOpen(false);
                setDrawerOpen(true);
              }}
              aria-label="Open navigation menu"
              className="p-1.5 -ml-1 sm:p-2 sm:-ml-2 hover:opacity-70 transition-opacity cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setB2cOpen(false);
                  setRegionOpen((prev) => !prev);
                }}
                aria-expanded={regionOpen}
                aria-label={`${copy.nav.regionLabel}: ${region.name} ${region.currency_code}`}
                className="flex items-center gap-2 text-left py-1 px-1 sm:py-1.5 sm:px-2 rounded hover:bg-black/5 transition-colors cursor-pointer"
              >
                <RegionFlagCircle code={region.code} size="sm" />
                <div className="hidden sm:flex flex-col leading-tight">
                  <span className="text-[10px] opacity-70 tracking-wider whitespace-nowrap">
                    {copy.nav.regionLabel}
                  </span>
                  <span className="text-xs font-medium whitespace-nowrap flex items-center gap-1">
                    {region.name} • {region.currency_symbol} {region.currency_code}
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </span>
                </div>
              </button>

              {/* Attached Screenshot 1 Design: Region / Currency Switcher Dropdown */}
              {regionOpen && (
                <div
                  role="dialog"
                  aria-label="Select your region and currency"
                  className="fixed sm:absolute left-4 sm:left-0 top-16 sm:top-full sm:mt-2 w-[calc(100vw-2rem)] sm:w-[370px] bg-white text-[#1A1A1A] border border-black/10 shadow-2xl z-50"
                >
                  {/* Top Active Region Summary Header + Close X */}
                  <div className="px-5 py-4 border-b border-black/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <RegionFlagCircle code={region.code} />
                      <div className="leading-tight">
                        <div className="text-[11px] text-neutral-500">{copy.nav.regionLabel}</div>
                        <div className="text-sm font-medium text-[#1A1A1A]">
                          {region.name} • {region.currency_symbol} {region.currency_code}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRegionOpen(false)}
                      aria-label="Close region switcher"
                      className="p-1.5 text-neutral-500 hover:text-black cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Section Header */}
                  <div className="px-6 pt-5 pb-3 text-center text-[11px] tracking-[0.2em] uppercase text-neutral-500">
                    {copy.nav.selectRegionHeading}
                  </div>

                  {/* Clean Country / Currency Rows with Circular Flags & Chevrons */}
                  <div className="px-5 pb-4 divide-y divide-black/10">
                    {regions.map((r) => {
                      const active = r.code === region.code;
                      return (
                        <button
                          key={r.code}
                          type="button"
                          onClick={() => {
                            onSelectRegion(r.code);
                            setRegionOpen(false);
                          }}
                          className={`w-full py-3.5 px-2 flex items-center justify-between text-left transition-colors cursor-pointer ${
                            active ? 'bg-[#F8F8F8] font-semibold' : 'hover:bg-neutral-50'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <RegionFlagCircle code={r.code} />
                            <span className="text-sm text-[#1A1A1A]">{r.name}</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-neutral-500">
                            <span className="text-xs font-mono-tabular text-neutral-600">
                              {r.currency_symbol} {r.currency_code}
                            </span>
                            <ChevronRight className="w-4 h-4 text-neutral-400" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center Zone: Authentic MONTE NAPOLEONE 1974 Brand Mark */}
          <button
            type="button"
            onClick={() => {
              setB2cOpen(false);
              onNavigate('home');
            }}
            className="flex flex-col items-center justify-center text-center group cursor-pointer shrink-0"
          >
            <span className="font-serif-brand text-[14px] sm:text-2xl tracking-[0.11em] sm:tracking-[0.18em] font-medium uppercase leading-none whitespace-nowrap">
              MONTE NAPOLEONE
            </span>
            <span className="font-serif-brand text-[9px] sm:text-[11px] tracking-[0.3em] sm:tracking-[0.35em] opacity-80 mt-0.5 leading-none">
              1974
            </span>
          </button>

          {/* Right Zone: Single-line Storefront Links + B2C Mega-Dropdown Trigger + Bag */}
          <nav className="flex items-center gap-3 sm:gap-5 text-xs sm:text-[13px] tracking-wide">
            <button
              type="button"
              onClick={() => {
                setB2cOpen(false);
                onNavigate('b2b');
              }}
              className={`hidden md:inline-block whitespace-nowrap shrink-0 hover:underline underline-offset-4 cursor-pointer ${
                activeView === 'b2b' ? 'font-semibold underline' : ''
              }`}
            >
              {copy.nav.b2b}
            </button>

            <button
              type="button"
              onClick={() => {
                setRegionOpen(false);
                setB2cOpen((prev) => !prev);
              }}
              aria-expanded={b2cOpen}
              aria-label={`${copy.nav.b2c} categories menu`}
              className={`hidden md:inline-flex items-center gap-1 whitespace-nowrap shrink-0 hover:underline underline-offset-4 cursor-pointer ${
                activeView === 'catalog' || b2cOpen ? 'font-semibold underline' : ''
              }`}
            >
              <span>{copy.nav.b2c}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${b2cOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <button
              type="button"
              onClick={() => {
                setB2cOpen(false);
                onNavigate('about');
              }}
              className={`hidden lg:inline-block whitespace-nowrap shrink-0 hover:underline underline-offset-4 cursor-pointer ${
                activeView === 'about' ? 'font-semibold underline' : ''
              }`}
            >
              {copy.nav.aboutUs}
            </button>

            <button
              type="button"
              onClick={() => {
                setB2cOpen(false);
                onOpenSearch();
              }}
              aria-label={copy.nav.search}
              className="hidden lg:inline-flex items-center gap-1 whitespace-nowrap shrink-0 hover:opacity-75 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{copy.nav.search}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setB2cOpen(false);
                onNavigate('account');
              }}
              aria-label={copy.nav.account}
              className={`hidden sm:inline-flex items-center gap-1 whitespace-nowrap shrink-0 hover:underline underline-offset-4 cursor-pointer ${
                activeView === 'account' ? 'font-semibold underline' : ''
              }`}
            >
              <User className="w-3.5 h-3.5 lg:hidden" />
              <span>{authUser ? authUser.name.split(' ')[0] : copy.nav.account}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setB2cOpen(false);
                onOpenWishlist();
              }}
              aria-label={`${copy.nav.wishlist} (${wishlistCount})`}
              className="hidden sm:inline-flex items-center gap-1 whitespace-nowrap shrink-0 hover:opacity-75 cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 lg:hidden" />
              <span>
                {copy.nav.wishlist}
                {wishlistCount > 0 ? ` (${wishlistCount})` : ''}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setB2cOpen(false);
                onOpenBag();
              }}
              aria-label={`Shopping bag (${cartCount} items)`}
              className="relative p-1.5 flex items-center gap-1.5 hover:opacity-75 transition-opacity cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="font-mono-tabular text-xs font-semibold">{cartCount}</span>
            </button>
          </nav>
        </div>

        {/* B2C Mega-Dropdown with Enlarged Category Images & Tighter Grid Spacing */}
        {b2cOpen && (
          <div
            role="region"
            aria-label="Category mega menu"
            className="w-full bg-white text-[#1A1A1A] border-t border-black/10 shadow-xl"
          >
            <div className="max-w-[1620px] mx-auto px-3 sm:px-6 py-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {resolvedMegaCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => {
                      setB2cOpen(false);
                      if (card.targetType === 'view') {
                        onNavigate(card.targetValue as AppView);
                      } else {
                        onNavigate('catalog', { category: card.targetValue });
                      }
                    }}
                    className="group text-left cursor-pointer flex flex-col"
                  >
                    <div className="aspect-[4/3] w-full bg-[#EFEFEF] overflow-hidden">
                      <img
                        src={card.image}
                        alt={card.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    </div>
                    <span className="mt-1.5 text-[11px] sm:text-xs font-medium uppercase tracking-[0.08em] text-neutral-700 group-hover:text-[#142B4E] group-hover:underline">
                      {card.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Quick Sub-Category & Custom Admin Links Bar */}
              <div className="mt-3.5 pt-3 border-t border-black/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setB2cOpen(false);
                      onNavigate('catalog', { category: 'all' });
                    }}
                    className="font-medium text-[#142B4E] hover:underline cursor-pointer"
                  >
                    {copy.nav.allShirts}
                  </button>
                  {categories
                    .filter((c) => c.active !== false && c.scope !== 'b2b')
                    .map((c) => (
                      <button
                        key={c.slug}
                        type="button"
                        onClick={() => {
                          setB2cOpen(false);
                          if (c.slug === 'b2b') onNavigate('b2b');
                          else onNavigate('catalog', { category: c.slug });
                        }}
                        className={`hover:text-[#142B4E] hover:underline cursor-pointer ${
                          c.parent_id ? 'text-neutral-500 text-[11px]' : 'text-neutral-700 font-medium'
                        }`}
                      >
                        {c.parent_id ? `↳ ${getCategoryName(c)}` : getCategoryName(c)}
                      </button>
                    ))}
                  {activeNavLinks.map((lnk) => (
                    <button
                      key={lnk.id}
                      type="button"
                      onClick={() => {
                        setB2cOpen(false);
                        if (lnk.target_type === 'view') onNavigate(lnk.target_value as AppView);
                        else onNavigate('catalog', { category: lnk.target_value });
                      }}
                      className="text-[#142B4E] font-medium hover:underline cursor-pointer"
                    >
                      {getMenuTitle(lnk)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setB2cOpen(false)}
                  aria-label="Close category menu"
                  className="p-1 text-neutral-500 hover:text-black cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
        {showScrollProgress && (
          <motion.div
            data-testid="pdp-nav-progress"
            style={{ scaleX: smoothProgress, transformOrigin: '0% 50%' }}
            className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#142B4E] pointer-events-none z-20"
          />
        )}
      </header>

      {/* Slide-out Navigation Drawer (Left Hamburger Menu with Custom Logo & Sliding Shirts Submenu) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative w-80 max-w-[85vw] bg-white text-[#1A1A1A] h-full shadow-2xl flex flex-col justify-between overflow-hidden">
            <div className="flex flex-col flex-1 min-h-0">
              {/* Custom Brand Logo Header */}
              <div className="px-5 py-4 border-b border-black/10 flex items-center justify-between gap-3 shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('home');
                    setDrawerOpen(false);
                  }}
                  className="text-left cursor-pointer min-w-0"
                >
                  <img
                    src="/assets/aistudio/logo__2__1ee1df15.png"
                    alt="Monte Napoleone 1974"
                    className="h-5 w-auto max-w-[190px] object-contain"
                  />
                  <div className="text-[10px] text-neutral-500 mt-1 truncate">
                    {region.name} · {region.warehouse_name}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-2 text-neutral-500 hover:text-black cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sliding Drawer Body (Main Menu <-> Shirts 4-Image Grid) */}
              <div className="relative flex-1 overflow-y-auto overflow-x-hidden">
                <div
                  className={`flex w-[200%] transition-transform duration-300 ease-out ${
                    drawerSubmenu === 'shirts' ? '-translate-x-1/2' : 'translate-x-0'
                  }`}
                >
                  {/* Panel 1: Main Navigation Menu */}
                  <div className="w-1/2 p-5 space-y-5 shrink-0">
                    {/* Prominent Shirts Entry at Top (slides horizontally to 4-image submenu) */}
                    <button
                      type="button"
                      data-testid="mobile-drawer-shirts-btn"
                      onClick={() => setDrawerSubmenu('shirts')}
                      className="w-full px-3.5 py-3 bg-[#F7F7F7] hover:bg-[#EFEFEF] border border-black/10 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#142B4E]">
                          {copy.nav.b2c} · Shirts
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          Linen, Business, T-Shirts & Piqué
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#142B4E] shrink-0" />
                    </button>

                    <div>
                      <div className="text-[11px] uppercase tracking-widest text-neutral-400 mb-2.5">
                        Collections
                      </div>
                      <ul className="space-y-2.5 text-sm">
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              onNavigate('catalog', { category: 'all' });
                              setDrawerOpen(false);
                            }}
                            className="w-full text-left font-medium hover:text-[#142B4E] cursor-pointer"
                          >
                            {copy.nav.allShirts}
                          </button>
                        </li>
                        {categories
                          .filter((c) => c.active !== false && c.scope !== 'b2b')
                          .map((c) => (
                            <li key={c.slug}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (c.slug === 'b2b') {
                                    onNavigate('b2b');
                                  } else {
                                    onNavigate('catalog', { category: c.slug });
                                  }
                                  setDrawerOpen(false);
                                }}
                                className={`w-full text-left hover:text-[#142B4E] cursor-pointer ${
                                  c.parent_id ? 'pl-3 text-xs text-neutral-500' : 'text-neutral-700'
                                }`}
                              >
                                {c.parent_id ? `↳ ${getCategoryName(c)}` : getCategoryName(c)}
                              </button>
                            </li>
                          ))}
                      </ul>
                    </div>

                    <div className="pt-4 border-t border-black/10 space-y-2.5 text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate('b2b');
                          setDrawerOpen(false);
                        }}
                        className="w-full text-left font-medium hover:text-[#142B4E] cursor-pointer"
                      >
                        {copy.nav.b2b} — {copy.home.b2bTitle}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate('about');
                          setDrawerOpen(false);
                        }}
                        className="w-full text-left text-neutral-700 hover:text-[#142B4E] cursor-pointer"
                      >
                        {copy.nav.aboutUs}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate('account');
                          setDrawerOpen(false);
                        }}
                        className="w-full text-left text-neutral-700 hover:text-[#142B4E] cursor-pointer"
                      >
                        {copy.nav.account} & Order Tracking
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onOpenWishlist();
                          setDrawerOpen(false);
                        }}
                        className="w-full text-left text-neutral-700 hover:text-[#142B4E] cursor-pointer"
                      >
                        {copy.nav.wishlist} ({wishlistCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onOpenSearch();
                          setDrawerOpen(false);
                        }}
                        className="w-full text-left text-neutral-700 hover:text-[#142B4E] cursor-pointer"
                      >
                        {copy.nav.search}
                      </button>
                    </div>
                  </div>

                  {/* Panel 2: Sliding Shirts 4-Image Category Submenu */}
                  <div className="w-1/2 p-5 space-y-4 shrink-0" data-testid="mobile-drawer-shirts-panel">
                    <div className="flex items-center justify-between border-b border-black/10 pb-3">
                      <button
                        type="button"
                        onClick={() => setDrawerSubmenu('main')}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#142B4E] hover:underline cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Back to Menu</span>
                      </button>
                      <span className="text-[11px] uppercase tracking-[0.14em] text-neutral-500 font-semibold">
                        {copy.nav.b2c}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {resolvedMegaCards.slice(0, 4).map((card) => (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => {
                            setDrawerOpen(false);
                            if (card.targetType === 'view') {
                              onNavigate(card.targetValue as AppView);
                            } else {
                              onNavigate('catalog', { category: card.targetValue });
                            }
                          }}
                          className="group text-left cursor-pointer flex flex-col"
                        >
                          <div className="aspect-[4/3] w-full bg-[#EFEFEF] overflow-hidden border border-black/5">
                            <img
                              src={card.image}
                              alt={card.label}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                            />
                          </div>
                          <span className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[#1A1A1A] group-hover:text-[#142B4E] leading-tight">
                            {card.label}
                          </span>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('catalog', { category: 'all' });
                        setDrawerOpen(false);
                      }}
                      className="w-full py-2.5 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E] hover:text-white text-xs uppercase tracking-[0.12em] font-medium transition-colors cursor-pointer"
                    >
                      {copy.nav.allShirts}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-black/10 bg-[#F7F7F7] shrink-0 text-[11px] text-neutral-500 flex items-center justify-between">
              <span>{region.name}</span>
              <span className="font-mono-tabular">
                {region.currency_symbol} {region.currency_code}
              </span>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
