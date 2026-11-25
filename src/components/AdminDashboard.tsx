import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  Check,
  Compass,
  Database,
  Download,
  Eye,
  FolderTree,
  Gift,
  Globe,
  GripVertical,
  Image as ImageIcon,
  KeyRound,
  Layers,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Package,
  Plus,
  RefreshCw,
  Ruler,
  Scissors,
  Search,
  Shield,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingUp,
  Truck,
  Upload,
  Users,
  X,
} from 'lucide-react';
import type {
  AdminReportData,
  AdminTab,
  AiAdminSettings,
  AuthUser,
  B2BInquiry,
  BulkDiscountSettings,
  CategoryRecord,
  CsvImportRow,
  CustomerAuthSettings,
  HeroSlideRecord,
  MediaAsset,
  NewsletterSubscriber,
  OrderRecord,
  PaymentMethod,
  Product,
  ProductVariant,
  PromotionPopupSettings,
  RegionCode,
  RegionConfig,
  StaffPermissionKey,
  StaffPermissions,
  StockMovement,
  TailoringOptionRecord,
  TailoringSizeSpec,
  TopBannerSettings,
  WooProductImportRow,
} from '../types.ts';
import {
  DEFAULT_BULK_DISCOUNT_SETTINGS,
  DEFAULT_CUSTOMER_AUTH_SETTINGS,
  DEFAULT_PROMO_POPUP_SETTINGS,
  DEFAULT_STAFF_PERMISSIONS,
  DEFAULT_TOP_BANNER_SETTINGS,
  formatRegionalPrice,
  hasPermission,
  isWooCommerceCsvHeader,
  parseProductImportCsv,
  parseWooCommerceCsv,
} from '../utils/commerce.ts';
import { MediaLibraryPanel } from './MediaLibraryPanel.tsx';
import {
  BulkProductEditorPanel,
  StockManagementPanel,
  VariantMatrixPanel,
} from './AdminCatalogModules.tsx';
import {
  OrderDetailModal,
  ReportsPanel,
  TailoringMatrixPanel,
  TailoringOptionsPanel,
} from './AdminTailoringAndReports.tsx';
import { DatabaseInspectorPanel, MenuManagerPanel } from './AdminMenuAndDatabase.tsx';
import {
  AiSettingsAdminPanel,
  HeroSliderAdminPanel,
  PromotionsAndBulkAdminPanel,
} from './AdminHeroPromoAi.tsx';
import { AdminCategoriesPanel } from './AdminCategoriesPanel.tsx';
import { ApiVaultAndOnboardingPanel, EmailsResendPanel } from './AdminEmailsAndVault.tsx';

interface AdminDashboardProps {
  authToken: string | null;
  authUser: AuthUser | null;
  initialTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
  onAuthChange: (token: string | null, user: AuthUser | null) => void;
  onRefreshStorefront: () => void;
  onBackToStorefront?: () => void;
}

const PERMISSION_LABELS: Array<{ key: StaffPermissionKey; label: string }> = [
  { key: 'manage_products', label: 'Edit Products & Translations' },
  { key: 'manage_inventory', label: 'Adjust Regional Stock' },
  { key: 'manage_pricing', label: 'Modify Regional Prices' },
  { key: 'manage_orders', label: 'Orders & DHL Dispatch' },
  { key: 'manage_media', label: 'Media Library Uploads' },
  { key: 'manage_b2b', label: 'B2B Corporate Inquiries' },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  authToken,
  authUser,
  initialTab = 'overview',
  onTabChange,
  onAuthChange,
  onRefreshStorefront,
  onBackToStorefront,
}) => {
  const [needsOwnerClaim, setNeedsOwnerClaim] = useState(false);
  const [hasEnvPasscode, setHasEnvPasscode] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Claim / Login forms
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [claimName, setClaimName] = useState('');
  const [claimEmail, setClaimEmail] = useState('');
  const [claimPassword, setClaimPassword] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetPasscode, setResetPasscode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // Dashboard Data
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [reportsLastUpdatedAt, setReportsLastUpdatedAt] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders'>('revenue');
  const [hoveredChartIdx, setHoveredChartIdx] = useState<number | null>(null);
  const [overview, setOverview] = useState<{
    summary: {
      totalProducts: number;
      totalOrders: number;
      totalMedia: number;
      pendingB2B: number;
      activeVisitorsCount?: number;
      totalRevenueUsdEquiv?: number;
    };
    regionStats: Array<{ region_code: RegionCode; currency_code: string; order_count: number; revenue: number }>;
    dailySeries?: Array<{ date: string; orders: number; revenue_usd_equiv: number }>;
    lowStock: Array<{ sku: string; title: string; region_code: RegionCode; stock_qty: number; warehouse_location: string }>;
    recentAudit: Array<{ id: number; actor_email: string; actor_role: string; action: string; target: string; details: string; created_at: string }>;
  } | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [b2bList, setB2bList] = useState<B2BInquiry[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [mailchimpStatus, setMailchimpStatus] = useState<{ configured: boolean; label: string }>({
    configured: false,
    label: 'Mailchimp Audience Sync',
  });
  const [syncingMailchimp, setSyncingMailchimp] = useState(false);
  const [mailchimpFeedback, setMailchimpFeedback] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<AuthUser[]>([]);
  const [regions, setRegions] = useState<RegionConfig[]>([]);
  const [gateways, setGateways] = useState<Record<string, { configured: boolean; label: string }>>({});

  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [tailoringSpecs, setTailoringSpecs] = useState<TailoringSizeSpec[]>([]);
  const [tailoringOptions, setTailoringOptions] = useState<TailoringOptionRecord[]>([]);
  const [reportData, setReportData] = useState<AdminReportData | null>(null);
  const [heroSlides, setHeroSlides] = useState<HeroSlideRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [topBanner, setTopBanner] = useState<TopBannerSettings>(DEFAULT_TOP_BANNER_SETTINGS);
  const [promoRules, setPromoRules] = useState<PromotionPopupSettings>(DEFAULT_PROMO_POPUP_SETTINGS);
  const [bulkDiscount, setBulkDiscount] = useState<BulkDiscountSettings>(DEFAULT_BULK_DISCOUNT_SETTINGS);
  const [customerAuth, setCustomerAuth] = useState<CustomerAuthSettings>(DEFAULT_CUSTOMER_AUTH_SETTINGS);
  const [googleCallbackUrl, setGoogleCallbackUrl] = useState<string>('');
  const [customerAuthMsg, setCustomerAuthMsg] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AiAdminSettings>({
    enabled: true,
    displayMode: 'agent',
    bubblePosition: 'right',
    activeProvider: 'gemini',
    geminiModel: 'gemini-4-hydrogen',
    openaiModel: 'gpt-4o-mini',
    greeting_en: 'Ask me to recommend a shirt by climate, fabric, or size — or add it directly to your bag.',
    greeting_no: 'Spør meg om skjortestoff, passform eller størrelse — så legger jeg den rett i handlekurven for deg.',
    greeting_it: 'Chiedimi un consiglio su tessuti, taglie o vestibilità — posso aggiungerla subito al carrello.',
    greeting_vn: 'Hỏi tôi về chất liệu vải, phom dáng hoặc size áo — tôi có thể thêm ngay vào giỏ hàng giúp bạn.',
  });

  // Orders filter, pagination, bulk status & inspection modal
  const [orderRegionFilter, setOrderRegionFilter] = useState<'all' | RegionCode>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [orderChannelFilter, setOrderChannelFilter] = useState<'all' | 'b2c' | 'b2b'>('all');
  const [orderSort, setOrderSort] = useState<'newest' | 'oldest' | 'total_desc' | 'total_asc'>('newest');
  const [orderPage, setOrderPage] = useState(1);
  const [orderPageSize, setOrderPageSize] = useState<10 | 25 | 50>(10);
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [bulkOrderStatus, setBulkOrderStatus] = useState<string>('');
  const [bulkPaymentStatus, setBulkPaymentStatus] = useState<string>('');
  const [orderBulkMsg, setOrderBulkMsg] = useState<string | null>(null);
  const [orderBulkBusy, setOrderBulkBusy] = useState(false);
  const [inspectingOrder, setInspectingOrder] = useState<OrderRecord | null>(null);

  // CSV Import & Bulk Editor state
  const [showBulkEditor, setShowBulkEditor] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvText, setCsvText] = useState(
    'sku,region_code,price,stock_qty\nMN-L3,en,185,18\nMN-B1,no,1599,42'
  );
  const [wooSourceRegion, setWooSourceRegion] = useState<RegionCode>('en');
  const [wooAutoTranslate, setWooAutoTranslate] = useState(true);
  const [wooDownloadImages, setWooDownloadImages] = useState(true);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvImportBusy, setCsvImportBusy] = useState(false);
  const [csvImportStep, setCsvImportStep] = useState<string | null>(null);
  const [wooPreview, setWooPreview] = useState<{ rows: WooProductImportRow[]; errors: string[] } | null>(null);
  const [csvPreview, setCsvPreview] = useState<{ rows: CsvImportRow[]; errors: string[] } | null>(null);
  const [csvResultMsg, setCsvResultMsg] = useState<string | null>(null);

  // Products pagination, search & bulk delete
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState<10 | 25 | 50>(10);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [productBulkBusy, setProductBulkBusy] = useState(false);
  const [productBulkMsg, setProductBulkMsg] = useState<string | null>(null);

  // Per-Product Variations editor inside Edit Modal
  const [editVarFitInput, setEditVarFitInput] = useState('');
  const [editVarSizeInput, setEditVarSizeInput] = useState('');
  const [editVarSelectedFits, setEditVarSelectedFits] = useState<string[]>(['Regular Fit', 'Slim Fit']);
  const [editVarSelectedSizes, setEditVarSelectedSizes] = useState<string[]>(['38 / S', '40 / M', '42 / L']);

  // Product & Menu Editor Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editGallerySlots, setEditGallerySlots] = useState<string[]>(['', '', '']);
  const [dragGalleryIdx, setDragGalleryIdx] = useState<number | null>(null);
  const [dragOverGalleryIdx, setDragOverGalleryIdx] = useState<number | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [syncingExternalMedia, setSyncingExternalMedia] = useState(false);
  const [mediaSyncMsg, setMediaSyncMsg] = useState<string | null>(null);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<
    'primary' | 'secondary' | 'tailoring' | 'menu' | 'hero' | { type: 'gallery'; index: number } | null
  >(null);
  const [tailoringPickerCb, setTailoringPickerCb] = useState<((url: string) => void) | null>(null);

  // B2B Quote & Order Conversion drafts
  const [b2bQuoteDrafts, setB2bQuoteDrafts] = useState<Record<number, string>>({});
  const [b2bBusyId, setB2bBusyId] = useState<number | null>(null);
  const [b2bFeedback, setB2bFeedback] = useState<string | null>(null);

  // New Product Form
  const [newSku, setNewSku] = useState('');
  const [newCategories, setNewCategories] = useState<string[]>(['business']);
  const [newFabric, setNewFabric] = useState('100% Italian 2-Ply Cotton');
  const [newTitleEn, setNewTitleEn] = useState('');
  const [newPriceEn, setNewPriceEn] = useState(175);
  const [newPriceNo, setNewPriceNo] = useState(1599);
  const [newPriceIt, setNewPriceIt] = useState(159);
  const [newPriceVn, setNewPriceVn] = useState(4290000);
  const [newPrimaryImg, setNewPrimaryImg] = useState('/src/assets/images/shirt_white_signature_1795248293653.jpg');
  const [newFits, setNewFits] = useState<string[]>(['Regular Fit', 'Slim Fit']);
  const [newSizes, setNewSizes] = useState<string[]>([
    '38 / S',
    '39 / M',
    '40 / M',
    '41 / L',
    '42 / L',
    '43 / XL',
  ]);
  const [newStockQty, setNewStockQty] = useState(12);
  const [newCreateBusy, setNewCreateBusy] = useState(false);
  const [newCreateError, setNewCreateError] = useState<string | null>(null);

  const CREATE_FIT_OPTIONS = ['Regular Fit', 'Slim Fit', 'Contemporary Fit'] as const;
  const CREATE_SIZE_OPTIONS = [
    '37 / XS',
    '38 / S',
    '39 / M',
    '40 / M',
    '41 / L',
    '42 / L',
    '43 / XL',
    '44 / XXL',
    '45 / 3XL',
  ] as const;

  // New Staff Form
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPass, setStaffPass] = useState('');
  const [staffPerms, setStaffPerms] = useState<StaffPermissions>({ ...DEFAULT_STAFF_PERMISSIONS });
  const [staffMsg, setStaffMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/status', {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        setNeedsOwnerClaim(Boolean(data.needsOwnerClaim));
        setHasEnvPasscode(Boolean(data.hasEnvPasscode));
        if (data.user && authToken) {
          onAuthChange(authToken, data.user);
        } else if (authToken && !data.user) {
          onAuthChange(null, null);
        }
      })
      .finally(() => setCheckingAuth(false));
  }, [authToken]);

  const loadAdminData = useCallback(async () => {
    if (!authToken || !authUser) return;
    const headers = { Authorization: `Bearer ${authToken}` };

    const reqs: Promise<void>[] = [
      fetch('/api/admin/overview', { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setOverview(d)),
      fetch('/api/admin/products', { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.products && setProducts(d.products)),
      fetch('/api/admin/variants', { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.variants && setVariants(d.variants)),
      fetch('/api/admin/tailoring-specs', { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.specs && setTailoringSpecs(d.specs)),
      fetch('/api/admin/tailoring-options', { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.options && setTailoringOptions(d.options)),
      fetch('/api/admin/reports', { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const parsed = d?.report || (d?.byRegion ? d : null);
          if (parsed) {
            setReportData(parsed);
            setReportsLastUpdatedAt(new Date().toLocaleTimeString());
          }
        }),
    ];

    if (hasPermission(authUser, 'manage_inventory')) {
      reqs.push(
        fetch('/api/admin/stock/movements', { headers })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d?.movements && setStockMovements(d.movements))
      );
    }

    if (hasPermission(authUser, 'manage_orders')) {
      reqs.push(
        fetch('/api/admin/orders', { headers })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d?.orders && setOrders(d.orders))
      );
    }
    if (hasPermission(authUser, 'manage_media')) {
      reqs.push(
        fetch('/api/admin/media', { headers })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d?.media && setMedia(d.media))
      );
    }
    if (hasPermission(authUser, 'manage_b2b')) {
      reqs.push(
        fetch('/api/admin/b2b', { headers })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d?.inquiries && setB2bList(d.inquiries))
      );
    }
    if (hasPermission(authUser, 'manage_settings') || hasPermission(authUser, 'manage_b2b')) {
      reqs.push(
        fetch('/api/admin/newsletter', { headers })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.subscribers) setSubscribers(d.subscribers);
            if (d?.mailchimp) setMailchimpStatus(d.mailchimp);
          })
      );
    }
    if (hasPermission(authUser, 'manage_staff')) {
      reqs.push(
        fetch('/api/admin/staff', { headers })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d?.staff && setStaffList(d.staff))
      );
    }
    if (hasPermission(authUser, 'manage_products') || hasPermission(authUser, 'manage_settings')) {
      reqs.push(
        fetch('/api/admin/hero-slides', { headers })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d?.slides && setHeroSlides(d.slides)),
        fetch('/api/admin/categories', { headers })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d?.categories && setCategories(d.categories))
      );
    }

    if (hasPermission(authUser, 'manage_settings')) {
      reqs.push(
        fetch('/api/admin/regions', { headers })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.regions) setRegions(d.regions);
            if (d?.gateways) setGateways(d.gateways);
          }),
        fetch('/api/admin/site-settings', { headers })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.topBanner) setTopBanner(d.topBanner);
            if (d?.promoRules) setPromoRules(d.promoRules);
            if (d?.bulkDiscount) setBulkDiscount(d.bulkDiscount);
            if (d?.customerAuth) setCustomerAuth(d.customerAuth);
            if (d?.googleCallbackUrl) setGoogleCallbackUrl(d.googleCallbackUrl);
            if (d?.aiSettings) setAiSettings(d.aiSettings);
          })
      );
    }

    await Promise.all(reqs);
  }, [authToken, authUser]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (authToken && authUser) {
      loadAdminData();
    }
  }, [authToken, authUser, loadAdminData]);

  useEffect(() => {
    setOrderPage(1);
  }, [orderRegionFilter, orderStatusFilter, paymentStatusFilter, orderChannelFilter, orderSearch, orderSort, orderPageSize]);

  useEffect(() => {
    setProductPage(1);
  }, [productSearch, productPageSize]);

  useEffect(() => {
    if (!authToken || !authUser) return;
    if (activeTab !== 'reports' && activeTab !== 'overview') return;
    const timer = window.setInterval(() => {
      const headers = { Authorization: `Bearer ${authToken}` };
      fetch('/api/admin/reports', { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const parsed = d?.report || (d?.byRegion ? d : null);
          if (parsed) {
            setReportData(parsed);
            setReportsLastUpdatedAt(new Date().toLocaleTimeString());
          }
        })
        .catch(() => {});
      fetch('/api/admin/overview', { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setOverview(d))
        .catch(() => {});
    }, 5000);
    return () => window.clearInterval(timer);
  }, [authToken, authUser, activeTab]);

  const handleClaimOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    try {
      const res = await fetch('/api/auth/claim-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: claimName, email: claimEmail, password: claimPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Setup failed');
        return;
      }
      setNeedsOwnerClaim(false);
      onAuthChange(data.token, data.user);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Sign in failed');
        return;
      }
      if (data.user.role !== 'owner' && data.user.role !== 'staff') {
        setAuthError('This portal is restricted to Owner and Staff accounts.');
        return;
      }
      onAuthChange(data.token, data.user);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleResetOwnerPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    try {
      const res = await fetch('/api/auth/reset-owner-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail || undefined,
          adminPasscode: resetPasscode,
          newPassword: resetNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Password reset failed');
        return;
      }
      onAuthChange(data.token, data.user);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    if (authToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    }
    setActiveTab('overview');
    setOverview(null);
    setOrders([]);
    setMedia([]);
    setB2bList([]);
    setSubscribers([]);
    setStaffList([]);
    setRegions([]);
    setGateways({});
    setEditingProduct(null);
    setCreatingProduct(false);
    onAuthChange(null, null);
  };

  const handleExportCsv = async (resource: 'products' | 'orders' | 'newsletter' | 'b2b') => {
    if (!authToken) return;
    const res = await fetch(`/api/admin/export/${resource}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `montenapoleone-${resource}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleApplyCsvImport = async () => {
    if (!authToken || csvImportBusy) return;
    setCsvResultMsg(null);
    setCsvImportBusy(true);

    try {
      if (isWooCommerceCsvHeader(csvText)) {
        setCsvImportStep('Parsing CSV…');
        const wooParsed = parseWooCommerceCsv(csvText, wooSourceRegion);
        setWooPreview(wooParsed);
        if (wooParsed.rows.length === 0) {
          setCsvResultMsg(wooParsed.errors[0] || 'No valid WooCommerce product rows detected.');
          return;
        }
        const remoteImgCount = wooParsed.rows.reduce(
          (n, r) => n + (r.images || []).filter((u) => /^https?:\/\//i.test(String(u))).length,
          0
        );
        setCsvImportStep(
          wooDownloadImages
            ? `Importing ${wooParsed.rows.length} product(s) and saving ${remoteImgCount} image URL(s) locally…`
            : `Importing ${wooParsed.rows.length} product(s)…`
        );
        // Prefer csvText for large catalogs — avoids multi‑MB JSON row payloads
        const useCsvText = wooParsed.rows.length > 80 || csvText.length > 200_000;
        const res = await fetch('/api/admin/import/woocommerce', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(
            useCsvText
              ? {
                  csvText,
                  baseRegion: wooSourceRegion,
                  translateLanguages: wooAutoTranslate,
                  downloadImages: wooDownloadImages,
                }
              : {
                  rows: wooParsed.rows,
                  baseRegion: wooSourceRegion,
                  translateLanguages: wooAutoTranslate,
                  downloadImages: wooDownloadImages,
                }
          ),
        });
        const data = await res.json();
        if (res.ok) {
          const imgParts = [
            data.mediaCopiedLocalCount
              ? `${data.mediaCopiedLocalCount} copied from WordPress`
              : null,
            data.mediaDownloadedCount
              ? `${data.mediaDownloadedCount} downloaded`
              : null,
            data.mediaReusedCount ? `${data.mediaReusedCount} already local` : null,
            data.mediaFailedCount ? `${data.mediaFailedCount} failed` : null,
          ].filter(Boolean);
          setCsvResultMsg(
            `Import complete: ${data.importedCount} product(s) · ${data.createdCount} created · ${data.updatedCount} updated · ${data.categoriesCreated} categories · ${data.variantsSynced ?? 0} variants` +
              (wooDownloadImages
                ? ` · Images: ${imgParts.length ? imgParts.join(', ') : 'none found'} (${data.remoteImageUrlsFound ?? 0} remote URLs)`
                : ' · image download skipped') +
              (data.translatedWithAi ? ' · AI EN/NO/IT/VN' : ' · EN/NO/IT/VN')
          );
          loadAdminData();
          onRefreshStorefront();
        } else {
          setCsvResultMsg(data.error || 'WooCommerce CSV import failed.');
        }
        return;
      }

      setCsvImportStep('Importing localization rows…');
      const parsed = parseProductImportCsv(csvText);
      setCsvPreview(parsed);
      if (parsed.rows.length === 0) return;

      const res = await fetch('/api/admin/import/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ rows: parsed.rows }),
      });
      const data = await res.json();
      if (res.ok) {
        setCsvResultMsg(
          `Imported ${data.updatedCount} regional localization rows (${data.skippedCount} skipped).`
        );
        loadAdminData();
        onRefreshStorefront();
      } else {
        setCsvResultMsg(data.error || 'CSV import failed.');
      }
    } catch {
      setCsvResultMsg('Network error during import. Try again — large catalogs can take a few minutes.');
    } finally {
      setCsvImportBusy(false);
      setCsvImportStep(null);
    }
  };

  const handleSyncMailchimp = async () => {
    if (!authToken) return;
    setSyncingMailchimp(true);
    setMailchimpFeedback(null);
    try {
      const res = await fetch('/api/admin/newsletter/sync-mailchimp', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMailchimpFeedback(
          data.configured
            ? `Synced ${data.syncedCount} of ${data.total} subscribers to Mailchimp.`
            : `Sandbox queue active: ${data.queuedCount} subscribers queued locally. Add MAILCHIMP_API_KEY, MAILCHIMP_SERVER_PREFIX, and MAILCHIMP_LIST_ID in Secrets for live push.`
        );
        loadAdminData();
      }
    } finally {
      setSyncingMailchimp(false);
    }
  };

  const handleUpdateB2BStatus = async (id: number, status: B2BInquiry['status']) => {
    if (!authToken) return;
    const res = await fetch(`/api/admin/b2b/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok) loadAdminData();
  };

  const handleSaveB2BQuote = async (inq: B2BInquiry) => {
    if (!authToken) return;
    const rawRate = b2bQuoteDrafts[inq.id];
    const unitRate =
      rawRate !== undefined && rawRate !== ''
        ? Number(rawRate)
        : Number(inq.quoted_unit_price || 0);
    setB2bBusyId(inq.id);
    setB2bFeedback(null);
    try {
      const res = await fetch(`/api/admin/b2b/${inq.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          status: inq.status === 'new' || inq.status === 'reviewing' ? 'quoted' : inq.status,
          quoted_unit_price: unitRate > 0 ? unitRate : null,
        }),
      });
      if (res.ok) {
        setB2bFeedback(`Saved B2B quote rate for ${inq.company_name}.`);
        await loadAdminData();
      }
    } finally {
      setB2bBusyId(null);
    }
  };

  const handleConvertB2BToOrder = async (inq: B2BInquiry) => {
    if (!authToken) return;
    const rawRate = b2bQuoteDrafts[inq.id];
    const quotedUnitPrice =
      rawRate !== undefined && rawRate !== ''
        ? Number(rawRate)
        : Number(inq.quoted_unit_price || 0);
    setB2bBusyId(inq.id);
    setB2bFeedback(null);
    try {
      const res = await fetch(`/api/admin/b2b/${inq.id}/convert-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          quotedUnitPrice: quotedUnitPrice > 0 ? quotedUnitPrice : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setB2bFeedback(
          `Converted B2B Inquiry #${inq.id} (${inq.company_name}) to official Order ${data.orderNumber}. Manage payment & DHL waybill inside Orders & DHL.`
        );
        await loadAdminData();
      } else {
        setB2bFeedback(data.error || 'Could not convert B2B inquiry.');
      }
    } finally {
      setB2bBusyId(null);
    }
  };

  const handleDispatchDhl = async (orderId: number) => {
    if (!authToken) return;
    const res = await fetch(`/api/admin/orders/${orderId}/dhl-dispatch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      loadAdminData();
    }
  };

  const handleMarkOrderPaid = async (orderId: number) => {
    if (!authToken) return;
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ payment_status: 'paid', order_status: 'processing' }),
    });
    if (res.ok) loadAdminData();
  };

  const handleQuickOrderUpdate = async (
    orderId: number,
    patch: { order_status?: string; payment_status?: string }
  ) => {
    if (!authToken) return;
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      await loadAdminData();
      onRefreshStorefront();
    }
  };

  const handleApplyBulkOrders = async () => {
    if (!authToken || selectedOrderIds.length === 0) return;
    if (!bulkOrderStatus && !bulkPaymentStatus) {
      setOrderBulkMsg('Select an Order Status or Payment Status to apply.');
      return;
    }
    setOrderBulkBusy(true);
    setOrderBulkMsg(null);
    try {
      const res = await fetch('/api/admin/orders/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          orderIds: selectedOrderIds,
          order_status: bulkOrderStatus || undefined,
          payment_status: bulkPaymentStatus || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrderBulkMsg(`Updated ${data.updatedCount} selected order(s).`);
        setSelectedOrderIds([]);
        setBulkOrderStatus('');
        setBulkPaymentStatus('');
        await loadAdminData();
        onRefreshStorefront();
      } else {
        setOrderBulkMsg(data.error || 'Bulk order update failed.');
      }
    } finally {
      setOrderBulkBusy(false);
    }
  };

  const handleBulkDeleteProducts = async () => {
    if (!authToken || selectedProductIds.length === 0 || productBulkBusy) return;
    setProductBulkBusy(true);
    setProductBulkMsg(null);
    try {
      const res = await fetch('/api/admin/products/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ productIds: selectedProductIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProductBulkMsg(data.error || 'Bulk delete failed.');
        return;
      }
      setProductBulkMsg(`Deleted ${data.deletedCount ?? selectedProductIds.length} product(s).`);
      setSelectedProductIds([]);
      await loadAdminData();
      onRefreshStorefront();
    } catch {
      setProductBulkMsg('Network error deleting products.');
    } finally {
      setProductBulkBusy(false);
    }
  };

  const handleSyncExternalProductMedia = async () => {
    if (!authToken || syncingExternalMedia) return;
    setSyncingExternalMedia(true);
    setMediaSyncMsg(null);
    try {
      const res = await fetch('/api/admin/media/sync-external-products', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        const msg = `Synced external product media: ${data.copiedLocalCount ?? 0} copied from WordPress, ${data.downloadedCount} downloaded, ${data.reusedCount} cached, ${data.failedCount ?? 0} failed · ${data.updatedProducts} product(s) updated.`;
        setMediaSyncMsg(msg);
        setCsvResultMsg((prev) => (prev ? `${prev} · ${msg}` : msg));
        await loadAdminData();
        onRefreshStorefront();
      } else {
        setMediaSyncMsg(data.error || 'Could not sync external product images.');
      }
    } catch {
      setMediaSyncMsg('Network error syncing external product images.');
    } finally {
      setSyncingExternalMedia(false);
    }
  };

  const handleMoveGallerySlot = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || toIdx < 0 || toIdx >= editGallerySlots.length) return;
    setEditGallerySlots((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const handleSaveProductEdit = async () => {
    if (!authToken || !editingProduct) return;
    const assigned =
      Array.isArray(editingProduct.category_slugs) && editingProduct.category_slugs.length > 0
        ? editingProduct.category_slugs
        : [editingProduct.category_slug || 'business'];
    const activeVariantSizes = Array.from(
      new Set(
        (editingProduct.variants || [])
          .filter((v) => v.active !== false && v.size_label)
          .map((v) => v.size_label)
      )
    );
    const cleanedGallerySlots = editGallerySlots.map((u) => u.trim()).filter(Boolean);
    const orderedGallery = Array.from(
      new Set([editingProduct.primary_image, ...cleanedGallerySlots].filter(Boolean))
    );
    const nextSecondary =
      cleanedGallerySlots[0] || editingProduct.secondary_image || editingProduct.primary_image;

    const payload: Product = {
      ...editingProduct,
      secondary_image: nextSecondary,
      gallery: orderedGallery,
      category_slug: assigned[0],
      category_slugs: assigned,
      sizes: activeVariantSizes.length > 0 ? activeVariantSizes : editingProduct.sizes,
    };
    const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setEditingProduct(null);
      loadAdminData();
      onRefreshStorefront();
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    if (newFits.length === 0) {
      setNewCreateError('Select at least one fit variation.');
      return;
    }
    if (newSizes.length === 0) {
      setNewCreateError('Select at least one size.');
      return;
    }
    setNewCreateBusy(true);
    setNewCreateError(null);
    const assignedCategories = newCategories.length > 0 ? newCategories : ['business'];
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sku: newSku,
          category_slug: assignedCategories[0],
          category_slugs: assignedCategories,
          fabric_spec: newFabric,
          is_featured: true,
          preorder_allowed: true,
          primary_image: newPrimaryImg,
          secondary_image: newPrimaryImg,
          sizes: newSizes,
          fits: newFits,
          localizations: {
            en: { title: newTitleEn, price: newPriceEn, stock_qty: newStockQty },
            no: { title: `${newTitleEn} (NO)`, price: newPriceNo, stock_qty: newStockQty },
            it: { title: `${newTitleEn} (IT)`, price: newPriceIt, stock_qty: newStockQty },
            vn: { title: `${newTitleEn} (VN)`, price: newPriceVn, stock_qty: newStockQty },
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNewCreateError((data as { error?: string }).error || 'Could not create product.');
        return;
      }
      setCreatingProduct(false);
      setNewSku('');
      setNewTitleEn('');
      setNewCategories(['business']);
      setNewFits(['Regular Fit', 'Slim Fit']);
      setNewSizes(['38 / S', '39 / M', '40 / M', '41 / L', '42 / L', '43 / XL']);
      setNewStockQty(12);
      setNewCreateError(null);
      loadAdminData();
      onRefreshStorefront();
    } catch {
      setNewCreateError('Network error creating product.');
    } finally {
      setNewCreateBusy(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    setStaffMsg(null);
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: staffName,
        email: staffEmail,
        password: staffPass,
        permissions: staffPerms,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStaffMsg(data.error || 'Could not create staff user.');
      return;
    }
    setStaffName('');
    setStaffEmail('');
    setStaffPass('');
    setStaffMsg(`Created staff account for ${data.user.email}`);
    loadAdminData();
  };

  const handleToggleStaffActive = async (member: AuthUser) => {
    if (!authToken || member.role === 'owner') return;
    await fetch(`/api/admin/staff/${member.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ active: !member.active }),
    });
    loadAdminData();
  };

  const handleUpdateRegion = async (reg: RegionConfig) => {
    if (!authToken) return;
    const res = await fetch(`/api/admin/regions/${reg.code}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(reg),
    });
    if (res.ok) {
      loadAdminData();
      onRefreshStorefront();
    }
  };

  const renderAdminTopBar = (signedInUser: AuthUser | null) => (
    <header className="bg-[#142B4E] text-white border-b border-black/15 sticky top-0 z-30">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToStorefront && (
            <button
              type="button"
              onClick={onBackToStorefront}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Storefront</span>
            </button>
          )}
          <div className="min-w-0">
            <div className="font-serif-brand text-sm sm:text-base tracking-[0.16em] uppercase truncate">
              MONTE NAPOLEONE 1974 · Admin Suite
            </div>
          </div>
        </div>
        {signedInUser && (
          <div className="flex items-center gap-3 text-xs shrink-0">
            <span className="hidden sm:inline text-white/80">
              {signedInUser.name} ({signedInUser.role.toUpperCase()})
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="px-2.5 py-1.5 border border-white/25 hover:bg-white/15 text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#F5F7FA]">
        {renderAdminTopBar(null)}
        <main className="py-20 max-w-md mx-auto px-4 text-center text-xs text-neutral-500">
          Verifying access...
        </main>
      </div>
    );
  }

  // First-Run Owner Setup or Sign-In Screen
  if (!authToken || !authUser) {
    return (
      <div className="min-h-screen bg-[#F5F7FA]">
        {renderAdminTopBar(null)}
        <main className="py-16 max-w-md mx-auto px-4">
          <div className="border border-black/15 bg-white p-8 space-y-6 shadow-sm">
            <div className="flex items-center gap-2.5 text-[#142B4E]">
              <Lock className="w-5 h-5" />
              <div>
                <h1 className="text-base font-semibold uppercase tracking-wide">
                  {needsOwnerClaim ? 'First-Run Owner Setup' : 'Owner & Staff Backend'}
                </h1>
              <p className="text-xs text-neutral-500">
                {needsOwnerClaim
                  ? 'Claim the initial Owner account to manage regional pricing, DHL, media, and staff roles.'
                  : 'Sign in with your Owner or Staff credentials.'}
              </p>
            </div>
          </div>

          {needsOwnerClaim ? (
            <form onSubmit={handleClaimOwner} className="space-y-4">
              <div>
                <label htmlFor="owner-name" className="block text-xs text-neutral-600 mb-1">
                  Owner Name
                </label>
                <input
                  id="owner-name"
                  required
                  value={claimName}
                  onChange={(e) => setClaimName(e.target.value)}
                  placeholder="e.g. Marco Gulbrandsen"
                  className="w-full px-3 py-2 text-xs border border-black/15 outline-none focus:border-[#142B4E]"
                />
              </div>
              <div>
                <label htmlFor="owner-email" className="block text-xs text-neutral-600 mb-1">
                  Owner Email
                </label>
                <input
                  id="owner-email"
                  type="email"
                  required
                  value={claimEmail}
                  onChange={(e) => setClaimEmail(e.target.value)}
                  placeholder="owner@montenapoleone1974.com"
                  className="w-full px-3 py-2 text-xs border border-black/15 outline-none focus:border-[#142B4E]"
                />
              </div>
              <div>
                <label htmlFor="owner-pass" className="block text-xs text-neutral-600 mb-1">
                  Owner Password (min 6 characters)
                </label>
                <input
                  id="owner-pass"
                  type="password"
                  required
                  minLength={6}
                  value={claimPassword}
                  onChange={(e) => setClaimPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-black/15 outline-none focus:border-[#142B4E]"
                />
              </div>
              {authError && <div className="text-xs text-red-600">{authError}</div>}
              <button
                type="submit"
                disabled={authBusy}
                className="w-full py-3 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-wider font-medium cursor-pointer"
              >
                {authBusy ? 'Creating Owner...' : 'Claim Owner Account & Enter'}
              </button>
            </form>
          ) : showPasswordReset ? (
            <form onSubmit={handleResetOwnerPassword} className="space-y-4">
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Reset the Owner password using the server <span className="font-mono-tabular">ADMIN_PASSCODE</span>.
                You will be signed in immediately after a successful reset.
              </p>
              <div>
                <label htmlFor="reset-owner-email" className="block text-xs text-neutral-600 mb-1">
                  Owner Email (optional update)
                </label>
                <input
                  id="reset-owner-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="owner@montenapoleone1974.com"
                  className="w-full px-3 py-2 text-xs border border-black/15 outline-none focus:border-[#142B4E]"
                />
              </div>
              <div>
                <label htmlFor="reset-admin-passcode" className="block text-xs text-neutral-600 mb-1">
                  ADMIN_PASSCODE
                </label>
                <input
                  id="reset-admin-passcode"
                  type="password"
                  required
                  value={resetPasscode}
                  onChange={(e) => setResetPasscode(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-black/15 outline-none focus:border-[#142B4E]"
                />
              </div>
              <div>
                <label htmlFor="reset-new-password" className="block text-xs text-neutral-600 mb-1">
                  New Owner Password (min 6 characters)
                </label>
                <input
                  id="reset-new-password"
                  type="password"
                  required
                  minLength={6}
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-black/15 outline-none focus:border-[#142B4E]"
                />
              </div>
              {authError && <div className="text-xs text-red-600">{authError}</div>}
              <button
                type="submit"
                disabled={authBusy}
                className="w-full py-3 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-wider font-medium cursor-pointer"
              >
                {authBusy ? 'Updating Password...' : 'Reset Owner Password & Enter'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordReset(false);
                  setAuthError(null);
                }}
                className="w-full text-[11px] text-neutral-500 hover:text-[#142B4E] cursor-pointer"
              >
                Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="staff-email" className="block text-xs text-neutral-600 mb-1">
                  Email Address
                </label>
                <input
                  id="staff-email"
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-black/15 outline-none focus:border-[#142B4E]"
                />
              </div>
              <div>
                <label htmlFor="staff-pass" className="block text-xs text-neutral-600 mb-1">
                  Password
                </label>
                <input
                  id="staff-pass"
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-black/15 outline-none focus:border-[#142B4E]"
                />
              </div>
              {authError && <div className="text-xs text-red-600">{authError}</div>}
              <button
                type="submit"
                disabled={authBusy}
                className="w-full py-3 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-wider font-medium cursor-pointer"
              >
                {authBusy ? 'Signing In...' : 'Sign In to Backend'}
              </button>
              {hasEnvPasscode && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordReset(true);
                    setAuthError(null);
                  }}
                  className="w-full text-[11px] text-neutral-500 hover:text-[#142B4E] cursor-pointer"
                >
                  Forgot password? Reset Owner with ADMIN_PASSCODE
                </button>
              )}
            </form>
          )}
          </div>
        </main>
      </div>
    );
  }

  const navTabs: Array<{ id: AdminTab; label: string; icon: React.ReactNode; visible: boolean }> = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" />, visible: true },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
      visible:
        hasPermission(authUser, 'manage_orders') ||
        hasPermission(authUser, 'manage_pricing') ||
        hasPermission(authUser, 'manage_inventory'),
    },
    {
      id: 'products',
      label: 'Products & Bulk Editor',
      icon: <Layers className="w-4 h-4" />,
      visible:
        hasPermission(authUser, 'manage_products') ||
        hasPermission(authUser, 'manage_inventory') ||
        hasPermission(authUser, 'manage_pricing'),
    },
    {
      id: 'categories',
      label: 'Categories & WP Import',
      icon: <FolderTree className="w-4 h-4" />,
      visible:
        hasPermission(authUser, 'manage_products') || hasPermission(authUser, 'manage_settings'),
    },
    {
      id: 'variants',
      label: 'Variations Matrix',
      icon: <SlidersHorizontal className="w-4 h-4" />,
      visible:
        hasPermission(authUser, 'manage_products') ||
        hasPermission(authUser, 'manage_pricing') ||
        hasPermission(authUser, 'manage_inventory'),
    },
    {
      id: 'stock',
      label: 'Stock & Ledger',
      icon: <Boxes className="w-4 h-4" />,
      visible: hasPermission(authUser, 'manage_inventory'),
    },
    {
      id: 'tailoring',
      label: 'Tailoring Size Matrix',
      icon: <Ruler className="w-4 h-4" />,
      visible:
        hasPermission(authUser, 'manage_products') || hasPermission(authUser, 'manage_settings'),
    },
    {
      id: 'collar_cuff',
      label: 'Collar & Cuff Studio',
      icon: <Scissors className="w-4 h-4" />,
      visible:
        hasPermission(authUser, 'manage_products') || hasPermission(authUser, 'manage_settings'),
    },
    {
      id: 'menu',
      label: 'Menu & Navigation',
      icon: <Compass className="w-4 h-4" />,
      visible:
        hasPermission(authUser, 'manage_products') || hasPermission(authUser, 'manage_settings'),
    },
    {
      id: 'hero',
      label: 'Hero Slider',
      icon: <Layers className="w-4 h-4" />,
      visible:
        hasPermission(authUser, 'manage_products') || hasPermission(authUser, 'manage_settings'),
    },
    {
      id: 'promotions',
      label: 'Promotions & Bulk',
      icon: <Gift className="w-4 h-4" />,
      visible: hasPermission(authUser, 'manage_settings'),
    },
    {
      id: 'ai',
      label: 'AI Concierge & Agent',
      icon: <Sparkles className="w-4 h-4" />,
      visible: hasPermission(authUser, 'manage_settings'),
    },
    {
      id: 'orders',
      label: 'Orders & DHL',
      icon: <ShoppingBag className="w-4 h-4" />,
      visible: hasPermission(authUser, 'manage_orders'),
    },
    {
      id: 'emails',
      label: 'Emails & Resend',
      icon: <Mail className="w-4 h-4" />,
      visible:
        hasPermission(authUser, 'manage_orders') || hasPermission(authUser, 'manage_settings'),
    },
    {
      id: 'media',
      label: 'Media Library',
      icon: <ImageIcon className="w-4 h-4" />,
      visible: hasPermission(authUser, 'manage_media'),
    },
    {
      id: 'b2b',
      label: 'B2B Inquiries',
      icon: <Building2 className="w-4 h-4" />,
      visible: hasPermission(authUser, 'manage_b2b'),
    },
    {
      id: 'newsletter',
      label: 'Mailchimp & Audience',
      icon: <Mail className="w-4 h-4" />,
      visible:
        hasPermission(authUser, 'manage_settings') || hasPermission(authUser, 'manage_b2b'),
    },
    {
      id: 'staff',
      label: 'Staff & RBAC',
      icon: <Users className="w-4 h-4" />,
      visible: hasPermission(authUser, 'manage_staff'),
    },
    {
      id: 'settings',
      label: 'Regions & Gateways',
      icon: <Globe className="w-4 h-4" />,
      visible: hasPermission(authUser, 'manage_settings'),
    },
    {
      id: 'credentials',
      label: 'API Vault & Onboarding',
      icon: <KeyRound className="w-4 h-4" />,
      visible: authUser.role === 'owner' && hasPermission(authUser, 'manage_settings'),
    },
    {
      id: 'database',
      label: 'Database & Backups',
      icon: <Database className="w-4 h-4" />,
      visible: authUser.role === 'owner' && hasPermission(authUser, 'manage_settings'),
    },
  ];

  const visibleNavTabs = navTabs.filter((t) => t.visible);
  const safeActiveTab: AdminTab = visibleNavTabs.some((t) => t.id === activeTab)
    ? activeTab
    : 'overview';

  const chartSeries = overview?.dailySeries || [];
  const chartMaxVal = Math.max(
    1,
    ...chartSeries.map((d) => (chartMetric === 'revenue' ? d.revenue_usd_equiv : d.orders))
  );
  const chartW = 720;
  const chartH = 190;
  const chartPadX = 28;
  const chartPadY = 20;
  const chartInnerW = chartW - chartPadX * 2;
  const chartInnerH = chartH - chartPadY * 2;
  const chartCoords = chartSeries.map((pt, idx) => {
    const val = chartMetric === 'revenue' ? pt.revenue_usd_equiv : pt.orders;
    const x =
      chartSeries.length <= 1
        ? chartW / 2
        : chartPadX + (idx / (chartSeries.length - 1)) * chartInnerW;
    const y = chartPadY + chartInnerH - (val / chartMaxVal) * chartInnerH;
    return { ...pt, val, x, y };
  });
  const polylinePoints = chartCoords.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPoints =
    chartCoords.length > 0
      ? `${chartCoords[0].x.toFixed(1)},${(chartH - chartPadY).toFixed(1)} ${polylinePoints} ${chartCoords[
          chartCoords.length - 1
        ].x.toFixed(1)},${(chartH - chartPadY).toFixed(1)}`
      : '';
  const activeChartPoint =
    hoveredChartIdx !== null && chartCoords[hoveredChartIdx]
      ? chartCoords[hoveredChartIdx]
      : chartCoords[chartCoords.length - 1] || null;

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {renderAdminTopBar(authUser)}
      <main className="py-6 pb-16 max-w-[1440px] mx-auto px-4 sm:px-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Sidebar (240px) */}
        <aside className="w-full lg:w-60 shrink-0 border border-neutral-200 bg-[#FAFAFA] p-4 space-y-6">
          <div className="pb-4 border-b border-neutral-200">
            <div className="text-[11px] uppercase tracking-wider text-neutral-500">
              Signed in as {authUser.role.toUpperCase()}
            </div>
            <div className="text-sm font-semibold text-[#1A1A1A] mt-0.5 truncate">
              {authUser.name}
            </div>
            <div className="text-[11px] text-neutral-500 truncate">{authUser.email}</div>
          </div>

          <nav className="space-y-1">
            {visibleNavTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    onTabChange?.(tab.id);
                  }}
                  className={`w-full px-3 py-2 text-xs flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                    safeActiveTab === tab.id
                      ? 'bg-[#142B4E] text-white font-medium'
                      : 'text-neutral-700 hover:bg-neutral-200/60'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-3 py-2 border border-neutral-300 text-xs text-neutral-700 hover:bg-white flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </aside>

        {/* Main Workspace */}
        <section className="flex-1 min-w-0 w-full space-y-6">
          {/* OVERVIEW */}
          {safeActiveTab === 'overview' && overview && (
            <div className="space-y-6">
              <div className="border-b border-neutral-200 pb-3 flex items-center justify-between">
                <h1 className="text-base font-semibold uppercase tracking-wide">
                  Operations Overview
                </h1>
                <span className="text-xs text-neutral-500">
                  Access Level: <strong className="uppercase">{authUser.role}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="border border-neutral-200 p-4 bg-white">
                  <div className="text-[11px] text-neutral-500 uppercase">Revenue (USD Eq.)</div>
                  <div className="text-xl font-mono-tabular font-semibold mt-1 text-[#059669]">
                    ${(overview.summary.totalRevenueUsdEquiv ?? 0).toLocaleString('en-US')}
                  </div>
                </div>
                <div className="border border-neutral-200 p-4 bg-white">
                  <div className="text-[11px] text-neutral-500 uppercase">Total Orders</div>
                  <div className="text-xl font-mono-tabular font-semibold mt-1">
                    {overview.summary.totalOrders}
                  </div>
                </div>
                <div className="border border-neutral-200 p-4 bg-white">
                  <div className="text-[11px] text-neutral-500 uppercase">Live Visitors</div>
                  <div className="text-xl font-mono-tabular font-semibold mt-1 text-[#0284C7]">
                    {overview.summary.activeVisitorsCount ?? 0}
                  </div>
                </div>
                <div className="border border-neutral-200 p-4 bg-white">
                  <div className="text-[11px] text-neutral-500 uppercase">Active Shirts</div>
                  <div className="text-xl font-mono-tabular font-semibold mt-1">
                    {overview.summary.totalProducts}
                  </div>
                </div>
                <div className="border border-neutral-200 p-4 bg-white">
                  <div className="text-[11px] text-neutral-500 uppercase">Media Assets</div>
                  <div className="text-xl font-mono-tabular font-semibold mt-1">
                    {overview.summary.totalMedia}
                  </div>
                </div>
                <div className="border border-neutral-200 p-4 bg-white">
                  <div className="text-[11px] text-neutral-500 uppercase">B2B Requests</div>
                  <div className="text-xl font-mono-tabular font-semibold mt-1">
                    {overview.summary.pendingB2B}
                  </div>
                </div>
              </div>

              {/* Overview Interactive Revenue & Order Velocity Line Chart */}
              <div className="border border-neutral-200 bg-white p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-[#142B4E] flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#0284C7]" />
                      <span>Multi-Day Storefront Sales & Order Velocity</span>
                    </h2>
                    {activeChartPoint && (
                      <div className="text-[11px] text-neutral-500 font-mono-tabular mt-0.5">
                        {activeChartPoint.date}:{' '}
                        <strong className="text-[#142B4E]">
                          ${activeChartPoint.revenue_usd_equiv.toLocaleString('en-US')} USD eq.
                        </strong>{' '}
                        · {activeChartPoint.orders} order(s)
                      </div>
                    )}
                  </div>

                  <div className="inline-flex border border-neutral-200 bg-[#F8FAFC] p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setChartMetric('revenue')}
                      className={`px-3 py-1 cursor-pointer ${
                        chartMetric === 'revenue'
                          ? 'bg-[#142B4E] text-white font-medium'
                          : 'text-neutral-600'
                      }`}
                    >
                      Revenue (USD Eq.)
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMetric('orders')}
                      className={`px-3 py-1 cursor-pointer ${
                        chartMetric === 'orders'
                          ? 'bg-[#142B4E] text-white font-medium'
                          : 'text-neutral-600'
                      }`}
                    >
                      Orders Count
                    </button>
                  </div>
                </div>

                {chartCoords.length === 0 ? (
                  <div className="h-44 flex items-center justify-center bg-[#FAFAFA] border border-dashed border-neutral-200 text-xs text-neutral-400">
                    No order series data recorded yet.
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <svg
                      viewBox={`0 0 ${chartW} ${chartH + 22}`}
                      data-testid="overview-line-chart"
                      className="w-full h-48 sm:h-52 min-w-[460px]"
                      role="img"
                      aria-label="Multi-day sales and order trend line chart"
                    >
                      <defs>
                        <linearGradient id="mnChartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0284C7" stopOpacity="0.24" />
                          <stop offset="100%" stopColor="#0284C7" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>

                      {[0.25, 0.5, 0.75, 1].map((frac) => {
                        const yLine = chartPadY + chartInnerH * (1 - frac);
                        return (
                          <line
                            key={frac}
                            x1={chartPadX}
                            x2={chartW - chartPadX}
                            y1={yLine}
                            y2={yLine}
                            stroke="#E2E8F0"
                            strokeDasharray="3 3"
                          />
                        );
                      })}
                      <line
                        x1={chartPadX}
                        x2={chartW - chartPadX}
                        y1={chartH - chartPadY}
                        y2={chartH - chartPadY}
                        stroke="#CBD5E1"
                      />

                      {areaPoints && <polygon points={areaPoints} fill="url(#mnChartAreaGrad)" />}
                      {polylinePoints && (
                        <polyline
                          fill="none"
                          stroke="#142B4E"
                          strokeWidth="2.5"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          points={polylinePoints}
                        />
                      )}

                      {chartCoords.map((pt, idx) => {
                        const active = hoveredChartIdx === idx;
                        return (
                          <g key={pt.date}>
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={active ? 6 : 4}
                              fill={active ? '#0284C7' : '#FFFFFF'}
                              stroke="#142B4E"
                              strokeWidth="2"
                              className="cursor-pointer"
                              onMouseEnter={() => setHoveredChartIdx(idx)}
                              onMouseLeave={() => setHoveredChartIdx(null)}
                              onClick={() => setHoveredChartIdx(idx)}
                            />
                            <text
                              x={pt.x}
                              y={chartH + 8}
                              textAnchor="middle"
                              fontSize="10"
                              fill="#64748B"
                            >
                              {pt.date.slice(5)}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                )}
              </div>

              {/* Revenue per Region */}
              <div className="border border-neutral-200 bg-white p-5 space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Regional Storefront Performance
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {overview.regionStats.map((rs) => (
                    <div key={rs.region_code} className="p-3 bg-[#FAFAFA] border border-neutral-200">
                      <div className="text-xs uppercase font-medium text-neutral-600">
                        {rs.region_code.toUpperCase()} ({rs.currency_code})
                      </div>
                      <div className="text-lg font-mono-tabular font-semibold mt-1">
                        {formatRegionalPrice(rs.revenue, rs.region_code)}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono-tabular">
                        {rs.order_count} orders
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Low Stock & Audit */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border border-neutral-200 bg-white p-5 space-y-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Regional Warehouse Low-Stock Alerts
                  </h2>
                  <div className="divide-y divide-neutral-100 text-xs">
                    {overview.lowStock.map((ls, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{ls.title}</div>
                          <div className="text-[11px] text-neutral-500">
                            {ls.sku} · {ls.warehouse_location}
                          </div>
                        </div>
                        <span className="font-mono-tabular font-semibold text-amber-700">
                          {ls.stock_qty} left
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-neutral-200 bg-white p-5 space-y-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Audit Activity Log
                  </h2>
                  <div className="divide-y divide-neutral-100 text-xs max-h-64 overflow-y-auto">
                    {overview.recentAudit.map((a) => (
                      <div key={a.id} className="py-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{a.action}</span>
                          <span className="font-mono-tabular text-[11px] text-neutral-400">
                            {a.actor_role}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {a.target} · {a.details}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PRODUCTS & MULTI-REGION PRICING / INVENTORY + CSV IMPORT/EXPORT */}
          {safeActiveTab === 'products' &&
            (hasPermission(authUser, 'manage_products') ||
              hasPermission(authUser, 'manage_inventory') ||
              hasPermission(authUser, 'manage_pricing')) && (
            <div className="space-y-5">
              <div className="border-b border-neutral-200 pb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-base font-semibold uppercase tracking-wide">
                    Multi-Region Products, Pricing & Warehouse Stock
                  </h1>
                  <p className="text-xs text-neutral-500">
                    Each product maintains separate translations, currencies, and warehouse inventory for EN, NO, IT, and VN.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkEditor((prev) => !prev)}
                    className={`px-3.5 py-2 border text-xs uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer ${
                      showBulkEditor
                        ? 'bg-[#142B4E] text-white border-[#142B4E]'
                        : 'border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E]/5'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Bulk Editor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportCsv('products')}
                    className="px-3.5 py-2 border border-neutral-300 bg-white hover:bg-neutral-50 text-xs uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Products CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCsvImport((prev) => !prev)}
                    className="px-3.5 py-2 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E]/5 text-xs uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import CSV</span>
                  </button>
                  {hasPermission(authUser, 'manage_products') && (
                    <button
                      type="button"
                      onClick={() => setCreatingProduct(true)}
                      className="px-4 py-2 bg-[#142B4E] text-white text-xs uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Shirt</span>
                    </button>
                  )}
                </div>
              </div>

              {showBulkEditor && authToken && (
                <BulkProductEditorPanel
                  authToken={authToken}
                  authUser={authUser}
                  products={products}
                  onDone={() => {
                    loadAdminData();
                    onRefreshStorefront();
                  }}
                />
              )}

              {showCsvImport && (
                <div className="border border-[#142B4E]/25 bg-[#FAFAFA] p-5 space-y-4 text-xs">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold uppercase tracking-wider text-[#142B4E] flex flex-wrap items-center gap-2">
                        <span>Product CSV Import</span>
                        {isWooCommerceCsvHeader(csvText) && (
                          <span className="px-2 py-0.5 bg-[#0284C7] text-white text-[10px]">
                            WooCommerce Detected
                          </span>
                        )}
                        {csvFileName && (
                          <span className="px-2 py-0.5 bg-white border border-neutral-300 text-neutral-700 text-[10px] font-mono-tabular normal-case tracking-normal">
                            {csvFileName}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-1 max-w-2xl">
                        1) Choose your WooCommerce export · 2) Confirm options · 3) Import.
                        Image URLs (including <code className="font-mono-tabular">Image URL</code> /
                        Gallery columns) are saved into Media Library as local{' '}
                        <code className="font-mono-tabular">/uploads</code> files for SEO.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const sample =
                          'ID,Type,SKU,Name,Published,Short description,Description,In stock?,Stock,Regular price,Sale price,Categories,Images,Parent,Attribute 1 name,Attribute 1 value(s),Attribute 2 name,Attribute 2 value(s)\n' +
                          '901,variable,MN-WOO-901,"Como Royal Twill Shirt",1,"Fine Italian 2-ply twill","Woven in Como with mother-of-pearl buttons",1,,189,165,"Business > Twill Non-Iron","/src/assets/images/shirt_white_signature_1795248293653.jpg",,Size,"38 / S, 40 / M, 42 / L",Fit,"Slim Fit, Regular Fit"\n' +
                          '902,variation,MN-WOO-901-38,"Como Royal Twill - 38",1,,,1,14,189,165,,,MN-WOO-901,Size,"38 / S",Fit,"Slim Fit"\n' +
                          '903,variation,MN-WOO-901-40,"Como Royal Twill - 40",1,,,1,22,189,165,,,MN-WOO-901,Size,"40 / M",Fit,"Regular Fit"\n' +
                          '904,simple,MN-WOO-904,"Portofino Resort Linen",1,"Lightweight coastal linen","Breathable summer weave",1,18,169,,"Casual & Linen > Summer Linen","/src/assets/images/shirt_beige_linen_1795248293982.jpg",,Size,"39 / M, 40 / M, 41 / L",,';
                        setCsvText(sample);
                        setCsvFileName('sample-variable-products.csv');
                        setCsvPreview(null);
                        setWooPreview(parseWooCommerceCsv(sample, wooSourceRegion));
                        setCsvResultMsg(null);
                      }}
                      className="px-3 py-1.5 bg-white border border-neutral-300 text-neutral-600 hover:bg-neutral-50 cursor-pointer shrink-0"
                    >
                      Load sample
                    </button>
                  </div>

                  <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-[#142B4E]/40 bg-white px-4 py-8 cursor-pointer hover:bg-[#142B4E]/[0.03] transition-colors">
                    <span className="text-sm font-medium text-[#142B4E]">
                      {csvFileName ? 'Replace CSV file' : 'Drop or choose your WooCommerce .csv'}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Accepts Product Export CSV with Image URL / Gallery Image URLs columns
                    </span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setCsvResultMsg(null);
                        setCsvFileName(f.name);
                        f.text().then((txt) => {
                          setCsvText(txt);
                          if (isWooCommerceCsvHeader(txt)) {
                            const woo = parseWooCommerceCsv(txt, wooSourceRegion);
                            setCsvPreview(null);
                            setWooPreview(woo);
                            const imgN = woo.rows.reduce((n, r) => n + (r.images?.length || 0), 0);
                            setCsvResultMsg(
                              `Ready: ${woo.rows.length} product(s), ${imgN} image URL(s), ${woo.categories.length} category path(s).`
                            );
                          } else {
                            setWooPreview(null);
                            setCsvPreview(parseProductImportCsv(txt));
                          }
                        });
                        e.target.value = '';
                      }}
                    />
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white border border-neutral-200 p-3">
                    <label className="flex flex-col gap-1 text-[11px] text-neutral-700">
                      <span className="font-medium uppercase tracking-wider text-neutral-500">
                        Source currency
                      </span>
                      <select
                        value={wooSourceRegion}
                        onChange={(e) => setWooSourceRegion(e.target.value as RegionCode)}
                        className="border border-neutral-300 px-2 py-1.5 bg-white outline-none"
                      >
                        <option value="en">English (USD)</option>
                        <option value="no">Norwegian (NOK)</option>
                        <option value="it">Italian (EUR)</option>
                        <option value="vn">Vietnamese (VND)</option>
                      </select>
                    </label>
                    <label className="flex items-start gap-2 text-[11px] text-neutral-700 cursor-pointer pt-5">
                      <input
                        type="checkbox"
                        checked={wooDownloadImages}
                        onChange={(e) => setWooDownloadImages(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        <strong className="font-medium">Save images locally</strong>
                        <span className="block text-neutral-500">
                          Copy WordPress uploads into Media Library (recommended)
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2 text-[11px] text-neutral-700 cursor-pointer pt-5">
                      <input
                        type="checkbox"
                        checked={wooAutoTranslate}
                        onChange={(e) => setWooAutoTranslate(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        <strong className="font-medium">Localize EN / NO / IT / VN</strong>
                        <span className="block text-neutral-500">Rewrite titles & descriptions</span>
                      </span>
                    </label>
                  </div>

                  <details className="bg-white border border-neutral-200">
                    <summary className="px-3 py-2 cursor-pointer text-[11px] text-neutral-600 hover:bg-neutral-50">
                      Advanced: paste / edit CSV text
                    </summary>
                    <textarea
                      rows={5}
                      value={csvText}
                      onChange={(e) => {
                        setCsvText(e.target.value);
                        setCsvFileName(null);
                      }}
                      aria-label="CSV product import data"
                      className="w-full p-3 font-mono-tabular text-[11px] border-t border-neutral-200 outline-none focus:border-[#142B4E]"
                    />
                  </details>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={csvImportBusy}
                      onClick={() => {
                        if (isWooCommerceCsvHeader(csvText)) {
                          const woo = parseWooCommerceCsv(csvText, wooSourceRegion);
                          setCsvPreview(null);
                          setWooPreview(woo);
                          const imgN = woo.rows.reduce((n, r) => n + (r.images?.length || 0), 0);
                          setCsvResultMsg(
                            `Validated: ${woo.rows.length} product(s), ${imgN} image URL(s), ${woo.categories.length} category path(s).`
                          );
                        } else {
                          setWooPreview(null);
                          setCsvPreview(parseProductImportCsv(csvText));
                        }
                      }}
                      className="px-3 py-2 border border-neutral-300 bg-white hover:bg-neutral-50 cursor-pointer disabled:opacity-50"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      disabled={csvImportBusy}
                      onClick={handleApplyCsvImport}
                      className="px-5 py-2 bg-[#142B4E] text-white uppercase tracking-wider font-medium cursor-pointer disabled:opacity-60"
                    >
                      {csvImportBusy
                        ? csvImportStep || 'Importing…'
                        : isWooCommerceCsvHeader(csvText)
                          ? `Import ${wooPreview?.rows.length || ''} Products`.trim()
                          : 'Apply Bulk Import'}
                    </button>
                    <button
                      type="button"
                      data-testid="sync-external-media-btn"
                      disabled={syncingExternalMedia || csvImportBusy}
                      onClick={handleSyncExternalProductMedia}
                      className="px-3.5 py-2 border border-[#142B4E] text-[#142B4E] bg-white hover:bg-[#142B4E]/5 cursor-pointer disabled:opacity-50"
                    >
                      {syncingExternalMedia ? 'Saving images…' : 'Re-save remote images'}
                    </button>
                  </div>

                  {(csvImportBusy || csvResultMsg) && (
                    <div
                      className={`px-3 py-2.5 border text-[11px] ${
                        csvImportBusy
                          ? 'bg-sky-50 border-sky-200 text-sky-900'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      }`}
                    >
                      {csvImportBusy ? csvImportStep || 'Working…' : csvResultMsg}
                    </div>
                  )}

                  {wooPreview && wooPreview.rows.length > 0 && (
                    <div className="border border-neutral-200 bg-white overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-[11px] text-left">
                        <thead className="bg-[#F1F5F9] text-neutral-600 uppercase sticky top-0">
                          <tr>
                            <th className="p-2">Image</th>
                            <th className="p-2">SKU</th>
                            <th className="p-2">Type</th>
                            <th className="p-2">Title</th>
                            <th className="p-2">Categories</th>
                            <th className="p-2">Fits</th>
                            <th className="p-2">Sizes</th>
                            <th className="p-2">Variations</th>
                            <th className="p-2">Gallery</th>
                            <th className="p-2">Price ({wooSourceRegion.toUpperCase()})</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {wooPreview.rows.slice(0, 20).map((wr) => (
                            <tr key={wr.sku}>
                              <td className="p-2">
                                {wr.images && wr.images.length > 0 ? (
                                  <img
                                    src={wr.images[0]}
                                    alt={wr.sku}
                                    referrerPolicy="no-referrer"
                                    className="w-8 h-8 object-cover border border-neutral-200 bg-[#E6E6E6]"
                                  />
                                ) : (
                                  <span className="text-neutral-400">—</span>
                                )}
                              </td>
                              <td className="p-2 font-mono-tabular font-semibold">{wr.sku}</td>
                              <td className="p-2 uppercase">{wr.productType || 'simple'}</td>
                              <td className="p-2">{wr.title}</td>
                              <td className="p-2 text-neutral-600">{wr.categoryPaths.join(' | ')}</td>
                              <td className="p-2">{(wr.fits || []).join(', ') || '—'}</td>
                              <td className="p-2">{(wr.sizes || []).join(', ')}</td>
                              <td className="p-2 font-mono-tabular">{wr.variations?.length || 0}</td>
                              <td className="p-2 font-mono-tabular">{wr.images?.length || 0} img(s)</td>
                              <td className="p-2 font-mono-tabular">{wr.salePrice || wr.regularPrice}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {csvPreview && (
                    <div className="text-[11px] space-y-1 pt-1">
                      <div className="text-neutral-600">
                        Parsed <strong>{csvPreview.rows.length}</strong> valid row(s)
                        {csvPreview.errors.length > 0 && ` · ${csvPreview.errors.length} error(s)`}
                      </div>
                      {csvPreview.errors.map((err, i) => (
                        <div key={i} className="text-red-600">
                          {err}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(() => {
                const pq = productSearch.trim().toLowerCase();
                const filteredProducts = products.filter((p) => {
                  if (!pq) return true;
                  return (
                    p.sku.toLowerCase().includes(pq) ||
                    (p.localizations?.en?.title || p.title).toLowerCase().includes(pq) ||
                    p.category_slug.toLowerCase().includes(pq) ||
                    (p.category_slugs || []).some((s) => s.toLowerCase().includes(pq))
                  );
                });
                const totalProductPages = Math.max(
                  1,
                  Math.ceil(filteredProducts.length / productPageSize)
                );
                const safeProductPage = Math.min(productPage, totalProductPages);
                const pagedProducts = filteredProducts.slice(
                  (safeProductPage - 1) * productPageSize,
                  safeProductPage * productPageSize
                );
                const allPageSelected =
                  pagedProducts.length > 0 &&
                  pagedProducts.every((p) => selectedProductIds.includes(p.id));

                return (
                  <div className="space-y-3">
                    {/* Products Search, Pagination Size & Bulk Delete Bar */}
                    <div
                      data-testid="admin-products-toolbar"
                      className="flex flex-wrap items-center justify-between gap-3 bg-[#FAFAFA] border border-neutral-200 p-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="relative w-60 sm:w-72">
                          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="search"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="Search SKU, title, or category..."
                            className="w-full pl-8 pr-3 py-1.5 border border-neutral-300 bg-white outline-none focus:border-[#142B4E]"
                          />
                        </div>
                        <select
                          aria-label="Products per page"
                          value={productPageSize}
                          onChange={(e) => setProductPageSize(Number(e.target.value) as 10 | 25 | 50)}
                          className="px-2.5 py-1.5 border border-neutral-300 bg-white outline-none"
                        >
                          <option value={10}>10 / page</option>
                          <option value={25}>25 / page</option>
                          <option value={50}>50 / page</option>
                        </select>
                        <span className="text-[11px] font-mono-tabular text-neutral-500">
                          Showing {pagedProducts.length} of {filteredProducts.length} product(s)
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {productBulkMsg && (
                          <span className="text-[#4F8A47] font-medium mr-2">{productBulkMsg}</span>
                        )}
                        {hasPermission(authUser, 'manage_products') && (
                          <button
                            type="button"
                            data-testid="admin-products-bulk-delete-btn"
                            disabled={selectedProductIds.length === 0 || productBulkBusy}
                            onClick={handleBulkDeleteProducts}
                            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-neutral-300 text-white text-[11px] uppercase tracking-wider font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>
                              {productBulkBusy
                                ? 'Deleting...'
                                : `Delete Selected (${selectedProductIds.length})`}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="border border-neutral-200 bg-white overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[#F7F7F7] border-b border-neutral-200 text-neutral-600 uppercase text-[11px]">
                          <tr>
                            <th className="p-3 w-8">
                              <input
                                type="checkbox"
                                aria-label="Select all products on page"
                                checked={allPageSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedProductIds((prev) =>
                                      Array.from(new Set([...prev, ...pagedProducts.map((p) => p.id)]))
                                    );
                                  } else {
                                    const pageIds = new Set(pagedProducts.map((p) => p.id));
                                    setSelectedProductIds((prev) =>
                                      prev.filter((id) => !pageIds.has(id))
                                    );
                                  }
                                }}
                              />
                            </th>
                            <th className="p-3">Shirt</th>
                            <th className="p-3">EN (USD)</th>
                            <th className="p-3">NO (NOK)</th>
                            <th className="p-3">IT (EUR)</th>
                            <th className="p-3">VN (VND)</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {pagedProducts.map((p) => {
                            const locs = p.localizations;
                            const isChecked = selectedProductIds.includes(p.id);
                            return (
                              <tr key={p.id} className={isChecked ? 'bg-red-50/40' : 'hover:bg-neutral-50'}>
                                <td className="p-3">
                                  <input
                                    type="checkbox"
                                    aria-label={`Select product ${p.sku}`}
                                    checked={isChecked}
                                    onChange={(e) => {
                                      setSelectedProductIds((prev) =>
                                        e.target.checked
                                          ? [...prev, p.id]
                                          : prev.filter((id) => id !== p.id)
                                      );
                                    }}
                                  />
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={p.primary_image}
                                      alt={p.sku}
                                      referrerPolicy="no-referrer"
                                      className="w-10 h-10 object-cover bg-[#E6E6E6] shrink-0"
                                    />
                                    <div>
                                      <div className="font-medium">{locs?.en?.title || p.sku}</div>
                                      <div className="text-[11px] font-mono-tabular text-neutral-500">
                                        {p.sku} ·{' '}
                                        {(p.category_slugs && p.category_slugs.length > 0
                                          ? p.category_slugs
                                          : [p.category_slug]
                                        ).join(', ')}
                                        {p.variants && p.variants.length > 0 && (
                                          <span className="ml-1.5 text-[#142B4E]">
                                            · {p.variants.length} var(s)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                {(['en', 'no', 'it', 'vn'] as const).map((rc) => {
                                  const loc = locs?.[rc];
                                  return (
                                    <td key={rc} className="p-3 font-mono-tabular">
                                      {loc ? (
                                        <div>
                                          <div className="font-medium">{formatRegionalPrice(loc.price, rc)}</div>
                                          <div className="text-[11px] text-neutral-500">
                                            Stock: {loc.stock_qty}
                                          </div>
                                        </div>
                                      ) : (
                                        '—'
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="p-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cloned: Product = JSON.parse(JSON.stringify(p));
                                      cloned.category_slugs =
                                        Array.isArray(cloned.category_slugs) && cloned.category_slugs.length > 0
                                          ? cloned.category_slugs
                                          : [cloned.category_slug || 'business'];
                                      if (!cloned.variants || cloned.variants.length === 0) {
                                        cloned.variants = variants.filter((v) => v.product_id === p.id);
                                      }
                                      const rawGallery = Array.isArray(cloned.gallery) ? cloned.gallery : [];
                                      const extraGallery = rawGallery.filter(
                                        (u) => Boolean(u) && u !== cloned.primary_image
                                      );
                                      if (
                                        extraGallery.length === 0 &&
                                        cloned.secondary_image &&
                                        cloned.secondary_image !== cloned.primary_image
                                      ) {
                                        extraGallery.push(cloned.secondary_image);
                                      }
                                      while (extraGallery.length < 3) {
                                        extraGallery.push('');
                                      }
                                      setEditGallerySlots(extraGallery);
                                      setDragGalleryIdx(null);
                                      setDragOverGalleryIdx(null);
                                      setEditVarFitInput('');
                                      setEditVarSizeInput('');
                                      setEditingProduct(cloned);
                                    }}
                                    className="px-3 py-1.5 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E] hover:text-white text-[11px] uppercase tracking-wider cursor-pointer"
                                  >
                                    Edit Regions
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {pagedProducts.length === 0 && (
                            <tr>
                              <td colSpan={7} className="p-6 text-center text-neutral-500">
                                No products match "{productSearch}".
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Products Pagination Footer */}
                    {totalProductPages > 1 && (
                      <div
                        data-testid="admin-products-pagination"
                        className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1"
                      >
                        <div className="font-mono-tabular text-neutral-500">
                          Page {safeProductPage} of {totalProductPages} ({filteredProducts.length} total SKUs)
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={safeProductPage <= 1}
                            onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                            className="px-3 py-1.5 border border-neutral-300 bg-white hover:bg-neutral-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            disabled={safeProductPage >= totalProductPages}
                            onClick={() => setProductPage((p) => Math.min(totalProductPages, p + 1))}
                            className="px-3 py-1.5 border border-neutral-300 bg-white hover:bg-neutral-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* HIERARCHICAL CATEGORIES, WORDPRESS WXR IMPORT & DRAG-DROP REORDER */}
          {safeActiveTab === 'categories' &&
            authToken &&
            (hasPermission(authUser, 'manage_products') || hasPermission(authUser, 'manage_settings')) && (
              <AdminCategoriesPanel
                authToken={authToken}
                onRefreshStorefront={() => {
                  loadAdminData();
                  onRefreshStorefront();
                }}
              />
            )}

          {/* VARIATIONS MATRIX (BULK FIT & SIZE PRICING / STOCK) */}
          {safeActiveTab === 'variants' &&
            authToken &&
            (hasPermission(authUser, 'manage_products') ||
              hasPermission(authUser, 'manage_pricing') ||
              hasPermission(authUser, 'manage_inventory')) && (
              <VariantMatrixPanel
                authToken={authToken}
                authUser={authUser}
                products={products}
                categories={categories}
                variants={variants}
                onRefresh={() => {
                  loadAdminData();
                  onRefreshStorefront();
                }}
              />
            )}

          {/* WAREHOUSE STOCK MANAGEMENT & MOVEMENT LEDGER */}
          {safeActiveTab === 'stock' &&
            authToken &&
            hasPermission(authUser, 'manage_inventory') && (
              <StockManagementPanel
                authToken={authToken}
                products={products}
                movements={stockMovements}
                onRefresh={() => {
                  loadAdminData();
                  onRefreshStorefront();
                }}
              />
            )}

          {/* TAILORING SIZE MATRIX & SKETCH ASSIGNER */}
          {safeActiveTab === 'tailoring' &&
            authToken &&
            (hasPermission(authUser, 'manage_products') ||
              hasPermission(authUser, 'manage_settings')) && (
              <TailoringMatrixPanel
                authToken={authToken}
                specs={tailoringSpecs}
                onRefresh={() => {
                  loadAdminData();
                  onRefreshStorefront();
                }}
                onOpenMediaPicker={(cb) => {
                  setTailoringPickerCb(() => cb);
                  setMediaPickerTarget('tailoring');
                }}
              />
            )}

          {/* COLLAR & CUFF STUDIO (IMAGES, REORDER, DEFAULT SELECTED) */}
          {safeActiveTab === 'collar_cuff' &&
            authToken &&
            (hasPermission(authUser, 'manage_products') ||
              hasPermission(authUser, 'manage_settings')) && (
              <TailoringOptionsPanel
                authToken={authToken}
                options={tailoringOptions}
                onUpdated={(nextOpts) => {
                  if (nextOpts) setTailoringOptions(nextOpts);
                  else loadAdminData();
                  onRefreshStorefront();
                }}
                onOpenMediaPicker={(cb) => {
                  setTailoringPickerCb(() => cb);
                  setMediaPickerTarget('tailoring');
                }}
              />
            )}

          {/* B2C MEGA-MENU & CATEGORY MANAGER */}
          {safeActiveTab === 'menu' &&
            authToken &&
            (hasPermission(authUser, 'manage_products') ||
              hasPermission(authUser, 'manage_settings')) && (
              <MenuManagerPanel
                authToken={authToken}
                onRefreshStorefront={onRefreshStorefront}
                onPickImage={(cb) => {
                  setTailoringPickerCb(() => cb);
                  setMediaPickerTarget('menu');
                }}
              />
            )}

          {/* HERO SLIDER BANNER MANAGER */}
          {safeActiveTab === 'hero' &&
            authToken &&
            (hasPermission(authUser, 'manage_products') ||
              hasPermission(authUser, 'manage_settings')) && (
              <HeroSliderAdminPanel
                authToken={authToken}
                slides={heroSlides}
                onRefresh={loadAdminData}
                onRefreshStorefront={onRefreshStorefront}
                onPickImage={(cb) => {
                  setTailoringPickerCb(() => cb);
                  setMediaPickerTarget('hero');
                }}
              />
            )}

          {/* PROMOTIONS (TOP BANNER + 10% FIRST-ORDER MAILCHIMP POPUP) & BULK DISCOUNTS */}
          {safeActiveTab === 'promotions' &&
            authToken &&
            hasPermission(authUser, 'manage_settings') && (
              <PromotionsAndBulkAdminPanel
                authToken={authToken}
                topBanner={topBanner}
                promoRules={promoRules}
                bulkDiscount={bulkDiscount}
                onRefresh={loadAdminData}
                onRefreshStorefront={onRefreshStorefront}
              />
            )}

          {/* AI CONCIERGE & PERSONAL SHOPPING AGENT SETTINGS */}
          {safeActiveTab === 'ai' &&
            authToken &&
            hasPermission(authUser, 'manage_settings') && (
              <AiSettingsAdminPanel
                authToken={authToken}
                aiSettings={aiSettings}
                onRefresh={loadAdminData}
                onRefreshStorefront={onRefreshStorefront}
              />
            )}

          {/* TRANSACTIONAL EMAILS & RESEND MULTI-LANGUAGE ENGINE */}
          {safeActiveTab === 'emails' &&
            authToken &&
            (hasPermission(authUser, 'manage_orders') || hasPermission(authUser, 'manage_settings')) && (
              <EmailsResendPanel authToken={authToken} />
            )}

          {/* REPORTS & FINANCIAL ANALYTICS */}
          {safeActiveTab === 'reports' && (
            <ReportsPanel
              report={reportData}
              onRefresh={loadAdminData}
              lastUpdatedAt={reportsLastUpdatedAt}
            />
          )}

          {/* ORDERS & DHL DISPATCH + NAVIGATION, ADVANCED FILTERS & BULK STATUS */}
          {safeActiveTab === 'orders' && hasPermission(authUser, 'manage_orders') && (() => {
            const q = orderSearch.trim().toLowerCase();
            const filteredOrders = orders
              .filter((ord) => {
                if (orderRegionFilter !== 'all' && ord.region_code !== orderRegionFilter) return false;
                if (orderStatusFilter !== 'all' && ord.order_status !== orderStatusFilter) return false;
                if (paymentStatusFilter !== 'all' && ord.payment_status !== paymentStatusFilter) return false;
                if (orderChannelFilter === 'b2b' && !ord.is_b2b) return false;
                if (orderChannelFilter === 'b2c' && ord.is_b2b) return false;
                if (!q) return true;
                return (
                  ord.order_number.toLowerCase().includes(q) ||
                  ord.customer_email.toLowerCase().includes(q) ||
                  ord.customer_name.toLowerCase().includes(q) ||
                  (ord.company_name || '').toLowerCase().includes(q) ||
                  (ord.dhl_tracking_number || '').toLowerCase().includes(q)
                );
              })
              .sort((a, b) => {
                if (orderSort === 'oldest') return a.id - b.id;
                if (orderSort === 'total_desc') return b.total - a.total;
                if (orderSort === 'total_asc') return a.total - b.total;
                return b.id - a.id;
              });

            const totalOrdersMatched = filteredOrders.length;
            const totalPages = Math.max(1, Math.ceil(totalOrdersMatched / orderPageSize));
            const currentPage = Math.min(orderPage, totalPages);
            const startIdx = (currentPage - 1) * orderPageSize;
            const pagedOrders = filteredOrders.slice(startIdx, startIdx + orderPageSize);
            const allPageSelected =
              pagedOrders.length > 0 && pagedOrders.every((o) => selectedOrderIds.includes(o.id));

            return (
              <div className="space-y-5">
                <div className="border-b border-neutral-200 pb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-base font-semibold uppercase tracking-wide">
                      Orders Portal, Bank Transfers & DHL Express Dispatch
                    </h1>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {totalOrdersMatched} order(s) matching filters · {orders.length} total
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportCsv('orders')}
                    className="px-3.5 py-2 border border-neutral-300 bg-white hover:bg-neutral-50 text-xs uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Orders CSV</span>
                  </button>
                </div>

                {/* Advanced Filter & Navigation Toolbar */}
                <div
                  data-testid="admin-orders-filters"
                  className="bg-white border border-neutral-200 p-4 space-y-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {(['all', 'en', 'no', 'it', 'vn'] as const).map((rc) => (
                        <button
                          key={rc}
                          type="button"
                          onClick={() => setOrderRegionFilter(rc)}
                          className={`px-3 py-1.5 border uppercase cursor-pointer ${
                            orderRegionFilter === rc
                              ? 'bg-[#142B4E] text-white border-[#142B4E]'
                              : 'bg-white border-neutral-300 text-neutral-700'
                          }`}
                        >
                          {rc}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(['all', 'b2c', 'b2b'] as const).map((ch) => (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => setOrderChannelFilter(ch)}
                          className={`px-2.5 py-1.5 border uppercase text-[11px] cursor-pointer ${
                            orderChannelFilter === ch
                              ? 'bg-[#C5A059] text-white border-[#C5A059] font-semibold'
                              : 'bg-white border-neutral-300 text-neutral-700'
                          }`}
                        >
                          {ch === 'all' ? 'All Channels' : ch.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                    <input
                      type="search"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Order #, email, company, DHL..."
                      aria-label="Filter orders"
                      className="px-3 py-1.5 border border-neutral-300 bg-white outline-none focus:border-[#142B4E]"
                    />

                    <select
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                      aria-label="Filter by order status"
                      className="px-3 py-1.5 border border-neutral-300 bg-white outline-none focus:border-[#142B4E]"
                    >
                      <option value="all">Order Status: All</option>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="tailoring">Tailoring</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <select
                      value={paymentStatusFilter}
                      onChange={(e) => setPaymentStatusFilter(e.target.value)}
                      aria-label="Filter by payment status"
                      className="px-3 py-1.5 border border-neutral-300 bg-white outline-none focus:border-[#142B4E]"
                    >
                      <option value="all">Payment: All</option>
                      <option value="pending">Pending</option>
                      <option value="awaiting_transfer">Awaiting Transfer</option>
                      <option value="paid">Paid</option>
                      <option value="refunded">Refunded</option>
                    </select>

                    <select
                      value={orderSort}
                      onChange={(e) => setOrderSort(e.target.value as 'newest' | 'oldest' | 'total_desc' | 'total_asc')}
                      aria-label="Sort orders"
                      className="px-3 py-1.5 border border-neutral-300 bg-white outline-none focus:border-[#142B4E]"
                    >
                      <option value="newest">Sort: Newest First</option>
                      <option value="oldest">Sort: Oldest First</option>
                      <option value="total_desc">Sort: Highest Total</option>
                      <option value="total_asc">Sort: Lowest Total</option>
                    </select>

                    <div className="flex items-center gap-2">
                      <select
                        value={orderPageSize}
                        onChange={(e) => setOrderPageSize(Number(e.target.value) as 10 | 25 | 50)}
                        aria-label="Orders per page"
                        className="px-2.5 py-1.5 border border-neutral-300 bg-white outline-none flex-1"
                      >
                        <option value={10}>10 / page</option>
                        <option value={25}>25 / page</option>
                        <option value={50}>50 / page</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setOrderRegionFilter('all');
                          setOrderStatusFilter('all');
                          setPaymentStatusFilter('all');
                          setOrderChannelFilter('all');
                          setOrderSearch('');
                          setOrderSort('newest');
                        }}
                        className="px-2.5 py-1.5 border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-[11px] cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bulk Selection & Batch Status Bar */}
                <div
                  data-testid="admin-orders-bulk-bar"
                  className="bg-[#FAFAFA] border border-[#142B4E]/20 p-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-[#142B4E]">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOrderIds((prev) =>
                            Array.from(new Set([...prev, ...pagedOrders.map((o) => o.id)]))
                          );
                        } else {
                          const pageIds = new Set(pagedOrders.map((o) => o.id));
                          setSelectedOrderIds((prev) => prev.filter((id) => !pageIds.has(id)));
                        }
                      }}
                    />
                    <span>
                      Select Page ({selectedOrderIds.length} selected)
                    </span>
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={bulkOrderStatus}
                      onChange={(e) => setBulkOrderStatus(e.target.value)}
                      aria-label="Bulk set order status"
                      className="px-2.5 py-1.5 border border-neutral-300 bg-white"
                    >
                      <option value="">Set Order Status...</option>
                      <option value="pending">pending</option>
                      <option value="processing">processing</option>
                      <option value="tailoring">tailoring</option>
                      <option value="shipped">shipped</option>
                      <option value="delivered">delivered</option>
                      <option value="cancelled">cancelled (restock)</option>
                    </select>

                    <select
                      value={bulkPaymentStatus}
                      onChange={(e) => setBulkPaymentStatus(e.target.value)}
                      aria-label="Bulk set payment status"
                      className="px-2.5 py-1.5 border border-neutral-300 bg-white"
                    >
                      <option value="">Set Payment Status...</option>
                      <option value="pending">pending</option>
                      <option value="awaiting_transfer">awaiting_transfer</option>
                      <option value="paid">paid</option>
                      <option value="refunded">refunded</option>
                    </select>

                    <button
                      type="button"
                      disabled={selectedOrderIds.length === 0 || orderBulkBusy}
                      onClick={handleApplyBulkOrders}
                      data-testid="admin-orders-bulk-apply"
                      className="px-3.5 py-1.5 bg-[#142B4E] text-white uppercase tracking-wider text-[11px] font-medium disabled:opacity-40 cursor-pointer"
                    >
                      {orderBulkBusy ? 'Applying...' : 'Apply Bulk Update'}
                    </button>
                  </div>
                </div>

                {orderBulkMsg && (
                  <div className="px-3 py-2 bg-[#4F8A47]/10 border border-[#4F8A47]/30 text-[#4F8A47] text-xs font-medium">
                    {orderBulkMsg}
                  </div>
                )}

                {pagedOrders.length === 0 ? (
                  <div className="border border-neutral-200 bg-white p-8 text-center text-xs text-neutral-500">
                    No orders match your current filters.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pagedOrders.map((ord) => {
                      const isChecked = selectedOrderIds.includes(ord.id);
                      return (
                        <div key={ord.id} className="border border-neutral-200 bg-white p-5 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                aria-label={`Select order ${ord.order_number}`}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedOrderIds((prev) =>
                                      prev.includes(ord.id) ? prev : [...prev, ord.id]
                                    );
                                  } else {
                                    setSelectedOrderIds((prev) => prev.filter((id) => id !== ord.id));
                                  }
                                }}
                              />
                              <span className="font-mono-tabular font-semibold text-sm">{ord.order_number}</span>
                              {ord.is_b2b && (
                                <span className="px-1.5 py-0.5 bg-[#C5A059] text-white text-[10px] font-semibold uppercase">
                                  B2B
                                </span>
                              )}
                              <span className="text-neutral-300">·</span>
                              <span className="text-xs font-medium">{ord.customer_name}</span>
                              <span className="text-neutral-300">·</span>
                              <span className="text-xs text-neutral-500">
                                {ord.shipping_city}, {ord.shipping_country}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular">
                              <select
                                value={ord.payment_status}
                                aria-label={`Payment status for ${ord.order_number}`}
                                onChange={(e) =>
                                  handleQuickOrderUpdate(ord.id, { payment_status: e.target.value })
                                }
                                className="px-2 py-1 bg-neutral-100 border border-neutral-300 uppercase outline-none cursor-pointer"
                              >
                                <option value="pending">pay: pending</option>
                                <option value="awaiting_transfer">pay: awaiting_transfer</option>
                                <option value="paid">pay: paid</option>
                                <option value="refunded">pay: refunded</option>
                              </select>

                              <select
                                value={ord.order_status}
                                aria-label={`Order status for ${ord.order_number}`}
                                onChange={(e) =>
                                  handleQuickOrderUpdate(ord.id, { order_status: e.target.value })
                                }
                                className="px-2 py-1 bg-[#142B4E]/10 text-[#142B4E] border border-[#142B4E]/30 uppercase font-semibold outline-none cursor-pointer"
                              >
                                <option value="pending">pending</option>
                                <option value="processing">processing</option>
                                <option value="tailoring">tailoring</option>
                                <option value="shipped">shipped</option>
                                <option value="delivered">delivered</option>
                                <option value="cancelled">cancelled</option>
                              </select>

                              <span className="font-semibold text-sm ml-2">
                                {formatRegionalPrice(ord.total, ord.region_code)}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="text-neutral-600">
                              <span className="font-mono-tabular">
                                {ord.payment_method.toUpperCase()} · Ref: {ord.payment_reference}
                              </span>
                              {ord.dhl_tracking_number && (
                                <span className="ml-4 inline-flex items-center gap-1 font-mono-tabular text-[#1A1A1A] bg-[#FFCC00]/40 px-2 py-0.5">
                                  <Truck className="w-3.5 h-3.5" />
                                  {ord.dhl_tracking_number}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setInspectingOrder(ord)}
                                className="px-3 py-1.5 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E] hover:text-white text-[11px] uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect / Tailor Ticket</span>
                              </button>
                              {ord.payment_status !== 'paid' && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkOrderPaid(ord.id)}
                                  className="px-3 py-1.5 border border-[#4F8A47] text-[#4F8A47] hover:bg-[#4F8A47] hover:text-white text-[11px] uppercase tracking-wider cursor-pointer"
                                >
                                  Confirm Payment Received
                                </button>
                              )}
                              {!ord.dhl_tracking_number && (
                                <button
                                  type="button"
                                  onClick={() => handleDispatchDhl(ord.id)}
                                  className="px-3 py-1.5 bg-[#FFCC00] hover:bg-[#f0c000] text-[#D40511] font-bold text-[11px] uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Package className="w-3.5 h-3.5" />
                                  <span>Create DHL Waybill</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Orders Pagination Controls */}
                <div
                  data-testid="admin-orders-pagination"
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-3 text-xs text-neutral-600"
                >
                  <div>
                    Showing {totalOrdersMatched === 0 ? 0 : startIdx + 1}–
                    {Math.min(startIdx + orderPageSize, totalOrdersMatched)} of {totalOrdersMatched} orders
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 border border-neutral-300 bg-white disabled:opacity-40 cursor-pointer"
                    >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                      .map((pageNum) => (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setOrderPage(pageNum)}
                          className={`px-2.5 py-1 border cursor-pointer ${
                            pageNum === currentPage
                              ? 'bg-[#142B4E] text-white border-[#142B4E]'
                              : 'bg-white border-neutral-300'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setOrderPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 border border-neutral-300 bg-white disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>

                {inspectingOrder && authToken && (
                  <OrderDetailModal
                    order={inspectingOrder}
                    authToken={authToken}
                    onClose={() => setInspectingOrder(null)}
                    onUpdated={() => {
                      loadAdminData();
                      onRefreshStorefront();
                    }}
                  />
                )}
              </div>
            );
          })()}

          {/* WORDPRESS-STYLE MEDIA LIBRARY */}
          {safeActiveTab === 'media' && authToken && hasPermission(authUser, 'manage_media') && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
                <div>
                  <h1 className="text-base font-semibold uppercase tracking-wide">
                    Media Library & Imported Product Assets
                  </h1>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Local uploaded and WooCommerce-downloaded images saved cleanly in server folders.
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="media-tab-sync-external-btn"
                  disabled={syncingExternalMedia}
                  onClick={handleSyncExternalProductMedia}
                  className="px-4 py-2 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E] hover:text-white text-xs uppercase tracking-wider font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingExternalMedia ? 'animate-spin' : ''}`} />
                  <span>
                    {syncingExternalMedia
                      ? 'Downloading Product Images...'
                      : 'Sync External Product Images to Media'}
                  </span>
                </button>
              </div>
              {mediaSyncMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  {mediaSyncMsg}
                </div>
              )}
              <MediaLibraryPanel authToken={authToken} media={media} onRefresh={loadAdminData} />
            </div>
          )}

          {/* B2B INQUIRIES, QUOTE PRICING & CONVERSION TO OFFICIAL B2B ORDER */}
          {safeActiveTab === 'b2b' && hasPermission(authUser, 'manage_b2b') && (
            <div className="space-y-4">
              <div className="border-b border-neutral-200 pb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-base font-semibold uppercase tracking-wide">
                    Corporate B2B Inquiries, Quotations & Order Conversion
                  </h1>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Set custom per-shirt B2B contract rates, review size distributions, and convert approved quotes into official DHL + invoice orders.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleExportCsv('b2b')}
                  className="px-3.5 py-2 border border-neutral-300 bg-white hover:bg-neutral-50 text-xs uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export B2B CSV</span>
                </button>
              </div>

              {b2bFeedback && (
                <div className="p-3 bg-[#F6F9F6] border border-[#4F8A47]/40 text-xs text-[#2D5728] flex flex-wrap items-center justify-between gap-2">
                  <span>{b2bFeedback}</span>
                  {hasPermission(authUser, 'manage_orders') && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('orders')}
                      className="px-2.5 py-1 bg-[#142B4E] text-white text-[11px] uppercase tracking-wider cursor-pointer"
                    >
                      Open Orders & DHL
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-3">
                {b2bList.map((inq) => {
                  const unitDraft =
                    b2bQuoteDrafts[inq.id] ??
                    (inq.quoted_unit_price ? String(inq.quoted_unit_price) : '');
                  return (
                    <div key={inq.id} className="border border-neutral-200 bg-white p-5 space-y-4 text-xs">
                      <div className="flex flex-wrap justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm">{inq.company_name}</span>
                            {inq.converted_order_number && (
                              <span className="px-2 py-0.5 bg-[#4F8A47]/15 text-[#2D5728] font-mono-tabular font-semibold text-[11px]">
                                B2B Order: {inq.converted_order_number}
                              </span>
                            )}
                          </div>
                          <div className="text-neutral-500 mt-0.5">
                            {inq.contact_name} · {inq.email} · {inq.phone}
                          </div>
                          {inq.notes && <p className="mt-2 text-neutral-700">{inq.notes}</p>}
                        </div>
                        <div className="text-right font-mono-tabular space-y-1.5">
                          <div className="font-semibold">Total Qty: {inq.estimated_qty} shirts</div>
                          <div className="text-neutral-500">
                            {inq.region_code.toUpperCase()} · {inq.embroidery_requested ? 'Logo Embroidery' : 'Plain'}
                          </div>
                          <select
                            aria-label={`Status for ${inq.company_name}`}
                            value={inq.status}
                            onChange={(e) =>
                              handleUpdateB2BStatus(inq.id, e.target.value as B2BInquiry['status'])
                            }
                            className="px-2.5 py-1 border border-neutral-300 bg-[#FAFAFA] uppercase font-semibold text-[#142B4E]"
                          >
                            <option value="new">New</option>
                            <option value="reviewing">Reviewing</option>
                            <option value="quoted">Quoted</option>
                            <option value="approved">Approved</option>
                          </select>
                        </div>
                      </div>

                      {inq.items && inq.items.length > 0 && (
                        <div className="pt-3 border-t border-neutral-100 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {inq.items.map((item, idx) => {
                            const breakdown = Object.entries(item.sizeBreakdown || {}).filter(
                              ([, q]) => Number(q) > 0
                            );
                            return (
                              <div key={item.id || idx} className="p-3 bg-[#FAFAFA] border border-neutral-200 space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium uppercase">{item.title} ({item.sku})</span>
                                  <span className="font-mono-tabular font-semibold text-[#142B4E]">
                                    {item.totalPieces} pcs
                                  </span>
                                </div>
                                <div className="text-[11px] text-neutral-600">
                                  {item.fit} · Collar: {item.collar} · Cuff: {item.cuff}
                                </div>
                                {breakdown.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {breakdown.map(([sz, q]) => (
                                      <span
                                        key={sz}
                                        className="px-1.5 py-0.5 bg-white border border-neutral-200 font-mono-tabular text-[10px]"
                                      >
                                        {sz}: {q}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Quote Unit Price & Order Conversion Bar */}
                      <div className="pt-3 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3 bg-[#FAFAFA] -mx-5 -mb-5 px-5 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <label
                            htmlFor={`b2b-rate-${inq.id}`}
                            className="text-[11px] uppercase tracking-wider text-neutral-600 font-semibold"
                          >
                            Contract Unit Price ({inq.region_code.toUpperCase()}):
                          </label>
                          <input
                            id={`b2b-rate-${inq.id}`}
                            type="number"
                            step="any"
                            placeholder="Auto-tier rate"
                            value={unitDraft}
                            onChange={(e) =>
                              setB2bQuoteDrafts((prev) => ({
                                ...prev,
                                [inq.id]: e.target.value,
                              }))
                            }
                            className="w-32 px-2.5 py-1.5 border border-neutral-300 bg-white font-mono-tabular text-xs"
                          />
                          <button
                            type="button"
                            disabled={b2bBusyId === inq.id}
                            onClick={() => handleSaveB2BQuote(inq)}
                            className="px-3 py-1.5 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E] hover:text-white text-[11px] uppercase tracking-wider cursor-pointer transition-colors"
                          >
                            Save Quote
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {inq.converted_order_number ? (
                            <button
                              type="button"
                              onClick={() => setActiveTab('orders')}
                              className="px-3.5 py-1.5 bg-[#4F8A47] text-white text-[11px] uppercase tracking-wider font-medium cursor-pointer"
                            >
                              View {inq.converted_order_number} in Orders & DHL
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={b2bBusyId === inq.id}
                              onClick={() => handleConvertB2BToOrder(inq)}
                              className="px-4 py-1.5 bg-[#142B4E] hover:bg-[#0f213d] text-white text-[11px] uppercase tracking-wider font-medium cursor-pointer transition-colors"
                            >
                              {b2bBusyId === inq.id ? 'Creating B2B Order...' : 'Convert to B2B Order'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MAILCHIMP & NEWSLETTER AUDIENCE */}
          {safeActiveTab === 'newsletter' &&
            (hasPermission(authUser, 'manage_settings') || hasPermission(authUser, 'manage_b2b')) && (
            <div className="space-y-5">
              <div className="border-b border-neutral-200 pb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-base font-semibold uppercase tracking-wide">
                    Mailchimp Audience & Newsletter Subscribers
                  </h1>
                  <p className="text-xs text-neutral-500">
                    {mailchimpStatus.configured
                      ? 'Live Mailchimp Marketing API v3 connected.'
                      : 'Sandbox Queue mode — subscribers are stored in SQLite and ready for Mailchimp API push.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportCsv('newsletter')}
                    className="px-3.5 py-2 border border-neutral-300 bg-white hover:bg-neutral-50 text-xs uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Subscribers CSV</span>
                  </button>
                  <button
                    type="button"
                    disabled={syncingMailchimp}
                    onClick={handleSyncMailchimp}
                    className="px-4 py-2 bg-[#142B4E] text-white text-xs uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingMailchimp ? 'animate-spin' : ''}`} />
                    <span>{syncingMailchimp ? 'Syncing...' : 'Sync to Mailchimp'}</span>
                  </button>
                </div>
              </div>

              {mailchimpFeedback && (
                <div className="p-3 bg-[#FAFAFA] border border-[#142B4E]/25 text-xs text-[#142B4E]">
                  {mailchimpFeedback}
                </div>
              )}

              <div className="border border-neutral-200 bg-white overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F7F7F7] border-b border-neutral-200 text-neutral-600 uppercase text-[11px]">
                    <tr>
                      <th className="p-3">Subscriber Email</th>
                      <th className="p-3">Region</th>
                      <th className="p-3">Promo Code</th>
                      <th className="p-3">Mailchimp Sync</th>
                      <th className="p-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {subscribers.map((sub) => (
                      <tr key={sub.id} className="hover:bg-neutral-50">
                        <td className="p-3 font-medium">{sub.email}</td>
                        <td className="p-3 uppercase font-mono-tabular">{sub.region_code}</td>
                        <td className="p-3 font-mono-tabular">{sub.discount_code}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 text-[10px] uppercase font-semibold ${
                              sub.mailchimp_status === 'synced'
                                ? 'bg-[#4F8A47]/15 text-[#4F8A47]'
                                : sub.mailchimp_status === 'error'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {sub.mailchimp_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3 font-mono-tabular text-neutral-500">{sub.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STAFF & RBAC PERMISSIONS (OWNER ONLY) */}
          {safeActiveTab === 'staff' && hasPermission(authUser, 'manage_staff') && (
            <div className="space-y-6">
              <div className="border-b border-neutral-200 pb-3">
                <h1 className="text-base font-semibold uppercase tracking-wide">
                  Staff Accounts & Role-Based Permissions (Owner Only)
                </h1>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-3">
                  {staffList.map((member) => (
                    <div key={member.id} className="border border-neutral-200 bg-white p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-sm">{member.name}</span>
                          <span className="ml-2 px-2 py-0.5 bg-[#142B4E]/10 text-[#142B4E] uppercase text-[10px] font-semibold">
                            {member.role}
                          </span>
                        </div>
                        {member.role !== 'owner' && (
                          <button
                            type="button"
                            onClick={() => handleToggleStaffActive(member)}
                            className={`px-2.5 py-1 border text-[11px] cursor-pointer ${
                              member.active
                                ? 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                                : 'border-red-300 text-red-700 bg-red-50'
                            }`}
                          >
                            {member.active ? 'Active (Suspend)' : 'Suspended (Restore)'}
                          </button>
                        )}
                      </div>
                      <div className="text-neutral-500">{member.email}</div>
                      <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] text-neutral-600">
                        {PERMISSION_LABELS.filter((p) => member.permissions[p.key]).map((p) => (
                          <span key={p.key} className="bg-neutral-100 px-2 py-0.5">
                            {p.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={handleCreateStaff}
                  className="lg:col-span-5 border border-neutral-200 bg-[#FAFAFA] p-5 space-y-4"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#142B4E] flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    <span>Invite Staff Member</span>
                  </div>
                  <input
                    required
                    placeholder="Staff Full Name"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 bg-white outline-none"
                  />
                  <input
                    required
                    type="email"
                    placeholder="Staff Email"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 bg-white outline-none"
                  />
                  <input
                    required
                    type="password"
                    minLength={6}
                    placeholder="Temporary Password (min 6 chars)"
                    value={staffPass}
                    onChange={(e) => setStaffPass(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 bg-white outline-none"
                  />

                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] uppercase tracking-wider text-neutral-500">
                      Granular Staff Permissions
                    </div>
                    {PERMISSION_LABELS.map((perm) => (
                      <label key={perm.key} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={staffPerms[perm.key]}
                          onChange={(e) =>
                            setStaffPerms((prev) => ({ ...prev, [perm.key]: e.target.checked }))
                          }
                          className="accent-[#142B4E]"
                        />
                        <span>{perm.label}</span>
                      </label>
                    ))}
                  </div>

                  {staffMsg && <div className="text-xs text-[#142B4E] font-medium">{staffMsg}</div>}

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#142B4E] text-white text-xs uppercase tracking-wider font-medium cursor-pointer"
                  >
                    Create Staff Account
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* REGIONAL SETTINGS & PAYMENT GATEWAYS (OWNER ONLY) */}
          {safeActiveTab === 'settings' && hasPermission(authUser, 'manage_settings') && (
            <div className="space-y-6">
              <div className="border-b border-neutral-200 pb-3">
                <h1 className="text-base font-semibold uppercase tracking-wide">
                  Regional Tax, DHL Tariffs & Payment Gateways (Owner Only)
                </h1>
              </div>

              {/* Gateway Secrets Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(gateways).map(([key, gw]) => (
                  <div key={key} className="border border-neutral-200 bg-white p-4 space-y-1">
                    <div className="text-xs font-semibold">{gw.label}</div>
                    <div className="text-[11px] font-mono-tabular">
                      {gw.configured ? (
                        <span className="text-[#4F8A47] inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Live API Key Configured
                        </span>
                      ) : (
                        <span className="text-amber-700">Sandbox Mode (Set Secret in API Vault)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer Gmail / Google OAuth Login & Auto-Mailchimp Settings */}
              <div className="border border-neutral-200 bg-white p-5 space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                  <div>
                    <div className="font-semibold text-sm text-[#142B4E]">
                      Customer Gmail / Google Login & Auto-Mailchimp Subscription
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Control Gmail OAuth sign-in, corner welcome popup, and automatic Mailchimp audience subscription for shoppers.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('credentials')}
                    className="px-3 py-1.5 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E] hover:text-white text-[11px] uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Configure Google Client ID & Secret
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <label className="flex items-start gap-2.5 p-3 border border-neutral-200 bg-[#FAFAFA] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customerAuth.googleLoginEnabled}
                      onChange={(e) =>
                        setCustomerAuth((prev) => ({ ...prev, googleLoginEnabled: e.target.checked }))
                      }
                      className="mt-0.5 accent-[#142B4E]"
                    />
                    <div>
                      <div className="font-semibold">Enable Gmail Login</div>
                      <div className="text-[11px] text-neutral-500">Show Continue with Gmail on customer login</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 border border-neutral-200 bg-[#FAFAFA] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customerAuth.showCornerPopup}
                      onChange={(e) =>
                        setCustomerAuth((prev) => ({ ...prev, showCornerPopup: e.target.checked }))
                      }
                      className="mt-0.5 accent-[#142B4E]"
                    />
                    <div>
                      <div className="font-semibold">Corner Sign-In Popup</div>
                      <div className="text-[11px] text-neutral-500">Prompt guests cleanly at top-right corner</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 border border-neutral-200 bg-[#FAFAFA] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customerAuth.autoSubscribeMailchimp}
                      onChange={(e) =>
                        setCustomerAuth((prev) => ({ ...prev, autoSubscribeMailchimp: e.target.checked }))
                      }
                      className="mt-0.5 accent-[#142B4E]"
                    />
                    <div>
                      <div className="font-semibold">Auto-Sync to Mailchimp</div>
                      <div className="text-[11px] text-neutral-500">Send customer email directly to Mailchimp on login</div>
                    </div>
                  </label>

                  <div className="p-3 border border-neutral-200 bg-[#FAFAFA]">
                    <label htmlFor="corner-delay-input" className="block font-semibold mb-1">
                      Popup Delay (seconds)
                    </label>
                    <input
                      id="corner-delay-input"
                      type="number"
                      min={0}
                      max={30}
                      value={customerAuth.cornerPopupDelaySeconds}
                      onChange={(e) =>
                        setCustomerAuth((prev) => ({
                          ...prev,
                          cornerPopupDelaySeconds: Math.max(0, Math.min(30, Number(e.target.value))),
                        }))
                      }
                      className="w-full px-2.5 py-1 border border-neutral-300 bg-white font-mono-tabular"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  {customerAuthMsg ? (
                    <span className="text-xs text-[#2E5D28] font-medium">{customerAuthMsg}</span>
                  ) : (
                    <div className="text-[11px] text-neutral-600 space-y-0.5">
                      <div>
                        Authorized Redirect URI:{' '}
                        <span className="font-mono-tabular text-[#142B4E] font-medium">
                          {googleCallbackUrl ||
                            (typeof window !== 'undefined'
                              ? `${window.location.origin}/api/auth/google/callback`
                              : '/api/auth/google/callback')}
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        Set <span className="font-mono-tabular">PUBLIC_DOMAIN_URL</span> in API Vault when deploying to a custom domain behind Nginx.
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      if (!authToken) return;
                      setCustomerAuthMsg(null);
                      const res = await fetch('/api/admin/site-settings/customer_auth', {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${authToken}`,
                        },
                        body: JSON.stringify(customerAuth),
                      });
                      if (res.ok) {
                        setCustomerAuthMsg('Customer Gmail login settings saved & applied to storefront.');
                        onRefreshStorefront();
                      }
                    }}
                    className="px-4 py-2 bg-[#142B4E] hover:bg-[#0f213d] text-white text-xs uppercase tracking-wider font-medium cursor-pointer"
                  >
                    Save Gmail Login Settings
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {regions.map((reg) => (
                  <div key={reg.code} className="border border-neutral-200 bg-white p-5 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                      <span className="font-semibold text-sm">
                        {reg.name} ({reg.currency_code})
                      </span>
                      <span className="text-neutral-500">{reg.warehouse_name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-neutral-500 mb-1">VAT Rate (0.25 = 25%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={reg.vat_rate}
                          onChange={(e) =>
                            setRegions((prev) =>
                              prev.map((r) =>
                                r.code === reg.code ? { ...r, vat_rate: Number(e.target.value) } : r
                              )
                            )
                          }
                          className="w-full px-2.5 py-1.5 border border-neutral-300 font-mono-tabular"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-neutral-500 mb-1">
                          Free Shipping Threshold ({reg.currency_code})
                        </label>
                        <input
                          type="number"
                          value={reg.free_shipping_threshold}
                          onChange={(e) =>
                            setRegions((prev) =>
                              prev.map((r) =>
                                r.code === reg.code
                                  ? { ...r, free_shipping_threshold: Number(e.target.value) }
                                  : r
                              )
                            )
                          }
                          className="w-full px-2.5 py-1.5 border border-neutral-300 font-mono-tabular"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-neutral-500 mb-1">Local Bank Account / IBAN</label>
                      <input
                        value={reg.bank_iban}
                        onChange={(e) =>
                          setRegions((prev) =>
                            prev.map((r) => (r.code === reg.code ? { ...r, bank_iban: e.target.value } : r))
                          )
                        }
                        className="w-full px-2.5 py-1.5 border border-neutral-300 font-mono-tabular"
                      />
                    </div>

                    <div>
                      <div className="text-[11px] text-neutral-500 mb-1.5">Enabled Payment Gateways</div>
                      <div className="flex flex-wrap gap-3">
                        {(['vipps', 'stripe', 'paypal', 'bank_transfer'] as PaymentMethod[])
                          .filter((m) => m !== 'vipps' || reg.code === 'no')
                          .map((method) => {
                            const enabled = reg.enabled_payments.includes(method);
                            return (
                              <label key={method} className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={enabled}
                                  onChange={(e) => {
                                    const next = e.target.checked
                                      ? [...reg.enabled_payments, method]
                                      : reg.enabled_payments.filter((x) => x !== method);
                                    setRegions((prev) =>
                                      prev.map((r) =>
                                        r.code === reg.code ? { ...r, enabled_payments: next } : r
                                      )
                                    );
                                  }}
                                  className="accent-[#142B4E]"
                                />
                                <span className="uppercase">{method.replace('_', ' ')}</span>
                              </label>
                            );
                          })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpdateRegion(reg)}
                      className="px-4 py-2 bg-[#142B4E] text-white text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Save {reg.name} Settings
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* OWNER-ONLY API CREDENTIALS VAULT & PROVIDER ONBOARDING */}
          {safeActiveTab === 'credentials' &&
            authToken &&
            authUser.role === 'owner' &&
            hasPermission(authUser, 'manage_settings') && (
              <ApiVaultAndOnboardingPanel
                authToken={authToken}
                googleCallbackUrl={googleCallbackUrl}
                onRefreshSettings={() => {
                  loadAdminData();
                  onRefreshStorefront();
                }}
              />
            )}

          {/* OWNER-ONLY DATABASE INSPECTOR & LIVE BACKUP DOWNLOAD */}
          {safeActiveTab === 'database' &&
            authToken &&
            authUser.role === 'owner' &&
            hasPermission(authUser, 'manage_settings') && (
              <DatabaseInspectorPanel authToken={authToken} />
            )}
        </section>
      </div>

      {/* EDIT PRODUCT & REGIONAL LOCALIZATION MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditingProduct(null)} />
          <div className="relative w-full max-w-4xl bg-white border border-black/15 shadow-2xl p-6 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider">
                Edit Product · {editingProduct.sku}
              </h2>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1 text-neutral-500 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              data-testid="edit-product-gallery-editor"
              className="border border-neutral-200 bg-[#FAFAFA] p-4 space-y-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold uppercase tracking-wider text-[#142B4E]">
                    Product Media
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Primary lead photo + horizontal gallery strip. Drag cards or use arrows to reorder.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditGallerySlots((prev) => [...prev, ''])}
                  className="px-3 py-1.5 border border-[#142B4E] text-[#142B4E] bg-white hover:bg-[#142B4E] hover:text-white text-[11px] uppercase tracking-wider font-medium cursor-pointer"
                >
                  + Add Gallery Slot
                </button>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                {/* Primary Main Image Card */}
                <div className="snap-start shrink-0 w-[160px] sm:w-[180px] bg-white border-2 border-[#142B4E] p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="px-1.5 py-0.5 bg-[#142B4E] text-white text-[9px] uppercase tracking-wider font-semibold">
                      Primary
                    </span>
                    <span className="text-[9px] text-neutral-500 font-mono-tabular">Lead</span>
                  </div>
                  <div className="aspect-[4/5] w-full bg-[#ECECEC] overflow-hidden border border-neutral-200 flex items-center justify-center">
                    {editingProduct.primary_image ? (
                      <img
                        src={editingProduct.primary_image}
                        alt="Primary product"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-neutral-400">No photo</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMediaPickerTarget('primary')}
                    className="w-full py-1.5 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E] hover:text-white text-[10px] uppercase tracking-wider font-medium cursor-pointer"
                  >
                    Choose Media
                  </button>
                </div>

                {/* Draggable Gallery Slots */}
                {editGallerySlots.map((slotUrl, idx) => (
                  <div
                    key={`gallery-slot-${idx}`}
                    data-testid={`gallery-slot-${idx}`}
                    draggable
                    onDragStart={() => setDragGalleryIdx(idx)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverGalleryIdx !== idx) setDragOverGalleryIdx(idx);
                    }}
                    onDragLeave={() => {
                      if (dragOverGalleryIdx === idx) setDragOverGalleryIdx(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragGalleryIdx !== null && dragGalleryIdx !== idx) {
                        handleMoveGallerySlot(dragGalleryIdx, idx);
                      }
                      setDragGalleryIdx(null);
                      setDragOverGalleryIdx(null);
                    }}
                    onDragEnd={() => {
                      setDragGalleryIdx(null);
                      setDragOverGalleryIdx(null);
                    }}
                    className={`snap-start shrink-0 w-[148px] sm:w-[160px] bg-white border p-2 space-y-1.5 transition-all cursor-grab active:cursor-grabbing ${
                      dragOverGalleryIdx === idx
                        ? 'border-[#142B4E] ring-2 ring-[#142B4E]/30 bg-slate-50'
                        : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="inline-flex items-center gap-0.5 font-semibold text-[10px] text-[#142B4E]">
                        <GripVertical className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span>#{idx + 1}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveGallerySlot(idx, idx - 1)}
                          aria-label={`Move gallery image ${idx + 1} left`}
                          className="p-0.5 text-neutral-500 hover:text-black disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === editGallerySlots.length - 1}
                          onClick={() => handleMoveGallerySlot(idx, idx + 1)}
                          aria-label={`Move gallery image ${idx + 1} right`}
                          className="p-0.5 text-neutral-500 hover:text-black disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEditGallerySlots((prev) =>
                              prev.length > 3
                                ? prev.filter((_, j) => j !== idx)
                                : prev.map((v, j) => (j === idx ? '' : v))
                            )
                          }
                          aria-label={`Clear gallery slot ${idx + 1}`}
                          className="p-0.5 text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="aspect-[4/5] w-full bg-[#F1F1F1] border border-dashed border-neutral-300 overflow-hidden flex items-center justify-center">
                      {slotUrl ? (
                        <img
                          src={slotUrl}
                          alt={`Gallery ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover pointer-events-none"
                        />
                      ) : (
                        <span className="text-[9px] text-neutral-400 text-center px-1">Empty</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setMediaPickerTarget({ type: 'gallery', index: idx })}
                      className="w-full py-1 border border-neutral-300 hover:border-[#142B4E] text-[#142B4E] text-[10px] font-medium cursor-pointer bg-[#FAFAFA]"
                    >
                      Choose Media
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Multi-Category Assignment (Parent & Child Categories) */}
            <div className="border border-neutral-200 p-3.5 bg-[#FAFAFA] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold uppercase tracking-wider text-[#142B4E]">
                  Assigned Categories (Multiple Parent & Child Supported)
                </span>
                <span className="font-mono-tabular text-[11px] text-neutral-500">
                  Selected: {(editingProduct.category_slugs || [editingProduct.category_slug]).join(', ')}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto pt-1">
                {(() => {
                  const usableCats = categories.filter((c) => c.slug !== 'all' && c.slug !== 'b2b');
                  const parents = usableCats.filter((c) => !c.parent_id);
                  const ordered: Array<{ slug: string; label: string; isChild: boolean }> = [];
                  parents.forEach((par) => {
                    ordered.push({ slug: par.slug, label: par.name_en, isChild: false });
                    usableCats
                      .filter((ch) => ch.parent_id === par.id)
                      .forEach((ch) =>
                        ordered.push({ slug: ch.slug, label: `↳ ${ch.name_en}`, isChild: true })
                      );
                  });
                  usableCats
                    .filter((c) => !ordered.some((o) => o.slug === c.slug))
                    .forEach((c) => ordered.push({ slug: c.slug, label: c.name_en, isChild: Boolean(c.parent_id) }));
                  const fallbackSlugs =
                    ordered.length > 0
                      ? ordered
                      : ['linen', 'business', 'oxford', 'flannel', 'stretch'].map((s) => ({
                          slug: s,
                          label: s.toUpperCase(),
                          isChild: false,
                        }));
                  const selectedList =
                    editingProduct.category_slugs && editingProduct.category_slugs.length > 0
                      ? editingProduct.category_slugs
                      : [editingProduct.category_slug];
                  return fallbackSlugs.map((item) => {
                    const checked = selectedList.includes(item.slug);
                    return (
                      <label
                        key={item.slug}
                        className={`flex items-center gap-1.5 px-2 py-1.5 border cursor-pointer ${
                          checked
                            ? 'bg-[#142B4E] text-white border-[#142B4E]'
                            : 'bg-white text-neutral-700 border-neutral-300'
                        } ${item.isChild ? 'pl-3' : 'font-medium'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? Array.from(new Set([...selectedList, item.slug]))
                              : selectedList.filter((s) => s !== item.slug);
                            const safeNext = next.length > 0 ? next : [item.slug];
                            setEditingProduct((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    category_slug: safeNext[0],
                                    category_slugs: safeNext,
                                  }
                                : prev
                            );
                          }}
                          className="accent-white"
                        />
                        <span className="truncate">{item.label}</span>
                      </label>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Per-Product Variations: Body Fits, Custom Fits & Sizes */}
            <div
              data-testid="edit-product-variations-section"
              className="border border-neutral-200 p-4 bg-[#FAFAFA] space-y-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold uppercase tracking-wider text-[#142B4E]">
                    Product Variations · Body Fits & Sizes ({(editingProduct.variants || []).length})
                  </span>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    Add custom body fits or sizes directly for this product, or adjust individual SKU pricing and stock.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const existing = editingProduct.variants || [];
                    const baseEnPrice = editingProduct.localizations?.en?.price ?? null;
                    const baseNoPrice = editingProduct.localizations?.no?.price ?? null;
                    const baseItPrice = editingProduct.localizations?.it?.price ?? null;
                    const baseVnPrice = editingProduct.localizations?.vn?.price ?? null;
                    const nextVars = [...existing];
                    for (const fitVal of editVarSelectedFits) {
                      for (const szVal of editVarSelectedSizes) {
                        const dup = nextVars.some(
                          (v) =>
                            v.fit.toLowerCase() === fitVal.toLowerCase() &&
                            v.size_label.toLowerCase() === szVal.toLowerCase()
                        );
                        if (!dup) {
                          const fitSlug = fitVal
                            .replace(/[^a-z0-9]/gi, '')
                            .slice(0, 4)
                            .toUpperCase();
                          const szSlug = szVal
                            .split('/')[0]
                            .trim()
                            .replace(/[^a-z0-9]/gi, '')
                            .toUpperCase();
                          nextVars.push({
                            product_id: editingProduct.id,
                            fit: fitVal,
                            size_label: szVal,
                            sku_variant: `${editingProduct.sku}-${fitSlug}-${szSlug || 'VAR'}`,
                            price_en: baseEnPrice,
                            price_no: baseNoPrice,
                            price_it: baseItPrice,
                            price_vn: baseVnPrice,
                            stock_en: 10,
                            stock_no: 10,
                            stock_it: 10,
                            stock_vn: 10,
                            active: true,
                          });
                        }
                      }
                    }
                    setEditingProduct((prev) =>
                      prev ? { ...prev, variants: nextVars } : prev
                    );
                  }}
                  className="px-3 py-1.5 bg-[#142B4E] hover:bg-[#0f213d] text-white text-[11px] uppercase tracking-wider font-medium cursor-pointer"
                >
                  + Generate Selected Fit × Size Rows
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white border border-neutral-200 p-3">
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                    Fits for Generator
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(
                      new Set([
                        'Regular Fit',
                        'Slim Fit',
                        'Contemporary Fit',
                        ...(editingProduct.variants || []).map((v) => v.fit),
                        ...editVarSelectedFits,
                      ])
                    ).map((fitVal) => {
                      const active = editVarSelectedFits.includes(fitVal);
                      return (
                        <button
                          key={fitVal}
                          type="button"
                          onClick={() =>
                            setEditVarSelectedFits((prev) =>
                              prev.includes(fitVal)
                                ? prev.filter((x) => x !== fitVal)
                                : [...prev, fitVal]
                            )
                          }
                          className={`px-2.5 py-1 border text-[11px] cursor-pointer ${
                            active
                              ? 'bg-[#142B4E] text-white border-[#142B4E]'
                              : 'bg-white text-neutral-700 border-neutral-300'
                          }`}
                        >
                          {fitVal}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      value={editVarFitInput}
                      onChange={(e) => setEditVarFitInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const clean = editVarFitInput.trim();
                          if (clean && !editVarSelectedFits.includes(clean)) {
                            setEditVarSelectedFits((prev) => [...prev, clean]);
                          }
                          setEditVarFitInput('');
                        }
                      }}
                      placeholder="Custom fit (e.g. Comfort Fit)"
                      className="flex-1 px-2 py-1 border border-neutral-300 text-[11px] outline-none focus:border-[#142B4E]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const clean = editVarFitInput.trim();
                        if (clean && !editVarSelectedFits.includes(clean)) {
                          setEditVarSelectedFits((prev) => [...prev, clean]);
                        }
                        setEditVarFitInput('');
                      }}
                      className="px-2.5 py-1 border border-[#142B4E] text-[#142B4E] text-[11px] font-medium cursor-pointer"
                    >
                      + Fit
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                    Sizes for Generator
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {Array.from(
                      new Set([
                        '37 / XS',
                        '38 / S',
                        '39 / M',
                        '40 / M',
                        '41 / L',
                        '42 / L',
                        '43 / XL',
                        '44 / XXL',
                        '45 / 3XL',
                        ...(editingProduct.sizes || []),
                        ...(editingProduct.variants || []).map((v) => v.size_label),
                        ...editVarSelectedSizes,
                      ])
                    ).map((szVal) => {
                      const active = editVarSelectedSizes.includes(szVal);
                      return (
                        <button
                          key={szVal}
                          type="button"
                          onClick={() =>
                            setEditVarSelectedSizes((prev) =>
                              prev.includes(szVal)
                                ? prev.filter((x) => x !== szVal)
                                : [...prev, szVal]
                            )
                          }
                          className={`px-2 py-1 border font-mono-tabular text-[11px] cursor-pointer ${
                            active
                              ? 'bg-[#142B4E] text-white border-[#142B4E]'
                              : 'bg-white text-neutral-700 border-neutral-300'
                          }`}
                        >
                          {szVal}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      value={editVarSizeInput}
                      onChange={(e) => setEditVarSizeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const clean = editVarSizeInput.trim();
                          if (clean && !editVarSelectedSizes.includes(clean)) {
                            setEditVarSelectedSizes((prev) => [...prev, clean]);
                          }
                          setEditVarSizeInput('');
                        }
                      }}
                      placeholder="Custom size (e.g. 46 / 4XL)"
                      className="flex-1 px-2 py-1 border border-neutral-300 text-[11px] outline-none focus:border-[#142B4E]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const clean = editVarSizeInput.trim();
                        if (clean && !editVarSelectedSizes.includes(clean)) {
                          setEditVarSelectedSizes((prev) => [...prev, clean]);
                        }
                        setEditVarSizeInput('');
                      }}
                      className="px-2.5 py-1 border border-[#142B4E] text-[#142B4E] text-[11px] font-medium cursor-pointer"
                    >
                      + Size
                    </button>
                  </div>
                </div>
              </div>

              {(editingProduct.variants || []).length > 0 && (
                <div className="border border-neutral-200 bg-white overflow-x-auto max-h-56 overflow-y-auto">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-[#F7F7F7] border-b border-neutral-200 text-neutral-600 uppercase sticky top-0">
                      <tr>
                        <th className="p-2">Fit</th>
                        <th className="p-2">Size</th>
                        <th className="p-2">Variant SKU</th>
                        <th className="p-2">EN Price</th>
                        <th className="p-2">EN Stock</th>
                        <th className="p-2">Active</th>
                        <th className="p-2 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {(editingProduct.variants || []).map((v, idx) => (
                        <tr key={`${v.fit}-${v.size_label}-${idx}`}>
                          <td className="p-1.5">
                            <input
                              value={v.fit}
                              onChange={(e) =>
                                setEditingProduct((prev) => {
                                  if (!prev) return prev;
                                  const next = [...(prev.variants || [])];
                                  next[idx] = { ...next[idx], fit: e.target.value };
                                  return { ...prev, variants: next };
                                })
                              }
                              className="w-28 px-1.5 py-1 border border-neutral-200 bg-white"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              value={v.size_label}
                              onChange={(e) =>
                                setEditingProduct((prev) => {
                                  if (!prev) return prev;
                                  const next = [...(prev.variants || [])];
                                  next[idx] = { ...next[idx], size_label: e.target.value };
                                  return { ...prev, variants: next };
                                })
                              }
                              className="w-20 px-1.5 py-1 border border-neutral-200 font-mono-tabular bg-white"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              value={v.sku_variant}
                              onChange={(e) =>
                                setEditingProduct((prev) => {
                                  if (!prev) return prev;
                                  const next = [...(prev.variants || [])];
                                  next[idx] = { ...next[idx], sku_variant: e.target.value };
                                  return { ...prev, variants: next };
                                })
                              }
                              className="w-32 px-1.5 py-1 border border-neutral-200 font-mono-tabular bg-white"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              step="any"
                              value={v.price_en ?? ''}
                              placeholder="Base"
                              onChange={(e) =>
                                setEditingProduct((prev) => {
                                  if (!prev) return prev;
                                  const next = [...(prev.variants || [])];
                                  next[idx] = {
                                    ...next[idx],
                                    price_en: e.target.value === '' ? null : Number(e.target.value),
                                  };
                                  return { ...prev, variants: next };
                                })
                              }
                              className="w-16 px-1.5 py-1 border border-neutral-200 font-mono-tabular bg-white"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              value={v.stock_en}
                              onChange={(e) =>
                                setEditingProduct((prev) => {
                                  if (!prev) return prev;
                                  const next = [...(prev.variants || [])];
                                  next[idx] = { ...next[idx], stock_en: Number(e.target.value) };
                                  return { ...prev, variants: next };
                                })
                              }
                              className="w-14 px-1.5 py-1 border border-neutral-200 font-mono-tabular bg-white"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={v.active !== false}
                              onChange={(e) =>
                                setEditingProduct((prev) => {
                                  if (!prev) return prev;
                                  const next = [...(prev.variants || [])];
                                  next[idx] = { ...next[idx], active: e.target.checked };
                                  return { ...prev, variants: next };
                                })
                              }
                            />
                          </td>
                          <td className="p-1.5 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingProduct((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        variants: (prev.variants || []).filter((_, j) => j !== idx),
                                      }
                                    : prev
                                )
                              }
                              aria-label={`Remove variation ${v.fit} ${v.size_label}`}
                              className="text-red-600 hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {(['en', 'no', 'it', 'vn'] as const).map((rc) => {
                const loc = editingProduct.localizations?.[rc];
                if (!loc) return null;
                return (
                  <div key={rc} className="border border-neutral-200 p-4 space-y-2.5 bg-[#FAFAFA]">
                    <div className="font-semibold uppercase text-[#142B4E]">
                      Region: {rc.toUpperCase()} ({loc.warehouse_location})
                    </div>
                    <input
                      disabled={!hasPermission(authUser, 'manage_products')}
                      value={loc.title}
                      onChange={(e) =>
                        setEditingProduct((prev) =>
                          prev && prev.localizations
                            ? {
                                ...prev,
                                localizations: {
                                  ...prev.localizations,
                                  [rc]: { ...loc, title: e.target.value },
                                },
                              }
                            : prev
                        )
                      }
                      className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white"
                      placeholder="Localized Title"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-neutral-500">Regional Price</label>
                        <input
                          type="number"
                          disabled={!hasPermission(authUser, 'manage_pricing')}
                          value={loc.price}
                          onChange={(e) =>
                            setEditingProduct((prev) =>
                              prev && prev.localizations
                                ? {
                                    ...prev,
                                    localizations: {
                                      ...prev.localizations,
                                      [rc]: { ...loc, price: Number(e.target.value) },
                                    },
                                  }
                                : prev
                            )
                          }
                          className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white font-mono-tabular disabled:bg-neutral-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-500">Warehouse Stock</label>
                        <input
                          type="number"
                          disabled={!hasPermission(authUser, 'manage_inventory')}
                          value={loc.stock_qty}
                          onChange={(e) =>
                            setEditingProduct((prev) =>
                              prev && prev.localizations
                                ? {
                                    ...prev,
                                    localizations: {
                                      ...prev.localizations,
                                      [rc]: { ...loc, stock_qty: Number(e.target.value) },
                                    },
                                  }
                                : prev
                            )
                          }
                          className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white font-mono-tabular disabled:bg-neutral-100"
                        />
                      </div>
                    </div>

                    {/* Per-Region Product SEO Fields */}
                    <div className="pt-2 border-t border-neutral-200 space-y-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#142B4E]">
                        Search Engine Optimization ({rc.toUpperCase()})
                      </div>
                      <input
                        disabled={!hasPermission(authUser, 'manage_products')}
                        value={loc.seo_title || ''}
                        onChange={(e) =>
                          setEditingProduct((prev) =>
                            prev && prev.localizations
                              ? {
                                  ...prev,
                                  localizations: {
                                    ...prev.localizations,
                                    [rc]: { ...loc, seo_title: e.target.value },
                                  },
                                }
                              : prev
                          )
                        }
                        placeholder="SEO Title (leave blank for auto-optimized title)"
                        className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white text-[11px]"
                      />
                      <textarea
                        rows={2}
                        disabled={!hasPermission(authUser, 'manage_products')}
                        value={loc.seo_description || ''}
                        onChange={(e) =>
                          setEditingProduct((prev) =>
                            prev && prev.localizations
                              ? {
                                  ...prev,
                                  localizations: {
                                    ...prev.localizations,
                                    [rc]: { ...loc, seo_description: e.target.value },
                                  },
                                }
                              : prev
                          )
                        }
                        placeholder="Meta Description (120–160 chars)"
                        className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white text-[11px]"
                      />
                      <input
                        disabled={!hasPermission(authUser, 'manage_products')}
                        value={loc.seo_keywords || ''}
                        onChange={(e) =>
                          setEditingProduct((prev) =>
                            prev && prev.localizations
                              ? {
                                  ...prev,
                                  localizations: {
                                    ...prev.localizations,
                                    [rc]: { ...loc, seo_keywords: e.target.value },
                                  },
                                }
                              : prev
                          )
                        }
                        placeholder="SEO Keywords (comma-separated, e.g. Italian linen shirt, Oslo dress shirt)"
                        className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white text-[11px]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-black/10">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 border border-neutral-300 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProductEdit}
                className="px-5 py-2 bg-[#142B4E] text-white text-xs uppercase tracking-wider font-medium cursor-pointer"
              >
                Save Regional Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEDIA PICKER MODAL FOR PRODUCTS & TAILORING SKETCHES */}
      {mediaPickerTarget && authToken && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop stays visual only — outside click does NOT close the picker */}
          <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-5xl bg-white border border-black/20 shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-3.5 shrink-0">
              <h3 className="text-sm font-semibold uppercase tracking-wider">
                Select{' '}
                {mediaPickerTarget === 'tailoring'
                  ? 'Tailoring Measurement Sketch'
                  : mediaPickerTarget === 'menu'
                  ? 'Mega-Dropdown Menu Card'
                  : mediaPickerTarget === 'hero'
                  ? 'Hero Banner'
                  : mediaPickerTarget === 'primary'
                  ? 'Primary'
                  : typeof mediaPickerTarget === 'object' && mediaPickerTarget?.type === 'gallery'
                  ? `Gallery Slot #${mediaPickerTarget.index + 1}`
                  : 'Secondary'}{' '}
                Image from Media Library
              </h3>
              <button
                type="button"
                onClick={() => {
                  setMediaPickerTarget(null);
                  setTailoringPickerCb(null);
                }}
                className="p-1 text-neutral-500 hover:text-black cursor-pointer"
                aria-label="Close media picker"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              <MediaLibraryPanel
                authToken={authToken}
                media={media}
                pickerMode
                onRefresh={loadAdminData}
                onSelectMedia={(asset) => {
                  if (
                    (mediaPickerTarget === 'tailoring' ||
                      mediaPickerTarget === 'menu' ||
                      mediaPickerTarget === 'hero') &&
                    tailoringPickerCb
                  ) {
                    tailoringPickerCb(asset.url);
                  } else if (
                    typeof mediaPickerTarget === 'object' &&
                    mediaPickerTarget?.type === 'gallery'
                  ) {
                    const targetIdx = mediaPickerTarget.index;
                    setEditGallerySlots((prev) => {
                      const next = [...prev];
                      while (next.length <= targetIdx) next.push('');
                      next[targetIdx] = asset.url;
                      return next;
                    });
                    if (targetIdx === 0 && editingProduct) {
                      setEditingProduct((prev) =>
                        prev ? { ...prev, secondary_image: asset.url } : prev
                      );
                    }
                  } else if (editingProduct) {
                    setEditingProduct((prev) =>
                      prev
                        ? {
                            ...prev,
                            primary_image:
                              mediaPickerTarget === 'primary' ? asset.url : prev.primary_image,
                            secondary_image:
                              mediaPickerTarget === 'secondary' ? asset.url : prev.secondary_image,
                          }
                        : prev
                    );
                  } else if (creatingProduct) {
                    setNewPrimaryImg(asset.url);
                  }
                  setTailoringPickerCb(null);
                  setMediaPickerTarget(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* CREATE PRODUCT MODAL */}
      {creatingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="fixed inset-0 bg-black/55" onClick={() => !newCreateBusy && setCreatingProduct(false)} />
          <form
            onSubmit={handleCreateProduct}
            className="relative w-full max-w-6xl max-h-[94vh] overflow-y-auto bg-white border border-black/15 shadow-2xl text-xs"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-black/10 bg-white px-5 sm:px-6 py-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#142B4E]">
                  Add New Shirt
                </h2>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Fits × sizes generate variants for all regions automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !newCreateBusy && setCreatingProduct(false)}
                className="p-1.5 text-neutral-500 hover:bg-neutral-100 cursor-pointer"
                aria-label="Close create product"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 sm:px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left: identity + prices + image */}
              <div className="lg:col-span-5 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-neutral-600 mb-1">SKU *</label>
                    <input
                      required
                      placeholder="e.g. MN-L50"
                      value={newSku}
                      onChange={(e) => setNewSku(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 font-mono-tabular outline-none focus:border-[#142B4E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-600 mb-1">Stock / Variant</label>
                    <input
                      type="number"
                      min={0}
                      value={newStockQty}
                      onChange={(e) => setNewStockQty(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-2 border border-neutral-300 font-mono-tabular outline-none focus:border-[#142B4E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-600 mb-1">Title (EN) *</label>
                  <input
                    required
                    placeholder="e.g. White Signature Twill"
                    value={newTitleEn}
                    onChange={(e) => setNewTitleEn(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 outline-none focus:border-[#142B4E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-600 mb-1">Fabric Spec *</label>
                  <input
                    required
                    placeholder="100% Italian 2-Ply Cotton"
                    value={newFabric}
                    onChange={(e) => setNewFabric(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 outline-none focus:border-[#142B4E]"
                  />
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                    Prices
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <div>
                      <label className="text-[10px] text-neutral-500">USD</label>
                      <input
                        type="number"
                        value={newPriceEn}
                        onChange={(e) => setNewPriceEn(Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-neutral-300 font-mono-tabular outline-none focus:border-[#142B4E]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-500">NOK</label>
                      <input
                        type="number"
                        value={newPriceNo}
                        onChange={(e) => setNewPriceNo(Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-neutral-300 font-mono-tabular outline-none focus:border-[#142B4E]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-500">EUR</label>
                      <input
                        type="number"
                        value={newPriceIt}
                        onChange={(e) => setNewPriceIt(Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-neutral-300 font-mono-tabular outline-none focus:border-[#142B4E]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-500">VND</label>
                      <input
                        type="number"
                        value={newPriceVn}
                        onChange={(e) => setNewPriceVn(Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-neutral-300 font-mono-tabular outline-none focus:border-[#142B4E]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 border border-neutral-200 p-2.5 bg-[#FAFAFA]">
                  <img
                    src={newPrimaryImg}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 object-cover bg-[#E6E6E6] border border-neutral-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">Primary image</div>
                    <span className="block truncate text-neutral-600 font-mono-tabular text-[10px]">
                      {newPrimaryImg}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMediaPickerTarget('primary')}
                      className="mt-1 text-[#142B4E] hover:underline cursor-pointer"
                    >
                      Pick from Media
                    </button>
                  </div>
                </div>

                <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800">
                  Will create{' '}
                  <strong className="font-mono-tabular">
                    {Math.max(0, newFits.length) * Math.max(0, newSizes.length)}
                  </strong>{' '}
                  variants ({newFits.length || 0} fits × {newSizes.length || 0} sizes).
                </div>

                {newCreateError && (
                  <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-[11px]">
                    {newCreateError}
                  </div>
                )}
              </div>

              {/* Right: categories + fits + sizes side by side */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="border border-neutral-200 p-3 bg-[#FAFAFA] space-y-2 min-h-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#142B4E]">
                    Categories
                  </div>
                  <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-0.5">
                    {(() => {
                      const usableCats = categories.filter((c) => c.slug !== 'all' && c.slug !== 'b2b');
                      const parents = usableCats.filter((c) => !c.parent_id);
                      const ordered: Array<{ slug: string; label: string; isChild: boolean }> = [];
                      parents.forEach((par) => {
                        ordered.push({ slug: par.slug, label: par.name_en, isChild: false });
                        usableCats
                          .filter((ch) => ch.parent_id === par.id)
                          .forEach((ch) =>
                            ordered.push({ slug: ch.slug, label: `↳ ${ch.name_en}`, isChild: true })
                          );
                      });
                      usableCats
                        .filter((c) => !ordered.some((o) => o.slug === c.slug))
                        .forEach((c) =>
                          ordered.push({ slug: c.slug, label: c.name_en, isChild: Boolean(c.parent_id) })
                        );
                      const list =
                        ordered.length > 0
                          ? ordered
                          : ['linen', 'business', 'oxford', 'flannel', 'stretch'].map((s) => ({
                              slug: s,
                              label: s.toUpperCase(),
                              isChild: false,
                            }));
                      return list.map((item) => {
                        const checked = newCategories.includes(item.slug);
                        return (
                          <label
                            key={item.slug}
                            className={`flex items-center gap-1.5 px-2 py-1.5 border cursor-pointer ${
                              checked
                                ? 'bg-[#142B4E] text-white border-[#142B4E]'
                                : 'bg-white text-neutral-700 border-neutral-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? Array.from(new Set([...newCategories, item.slug]))
                                  : newCategories.filter((s) => s !== item.slug);
                                setNewCategories(next.length > 0 ? next : [item.slug]);
                              }}
                              className="accent-white"
                            />
                            <span className="truncate">{item.label}</span>
                          </label>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="border border-[#142B4E]/15 bg-[#F8FAFC] p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#142B4E]">
                      Fits *
                    </div>
                    <span className="text-[10px] font-mono-tabular text-neutral-500">
                      {newFits.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {CREATE_FIT_OPTIONS.map((fit) => {
                      const checked = newFits.includes(fit);
                      return (
                        <button
                          key={fit}
                          type="button"
                          onClick={() =>
                            setNewFits((prev) =>
                              checked ? prev.filter((f) => f !== fit) : [...prev, fit]
                            )
                          }
                          className={`w-full text-left px-2.5 py-2 border text-[11px] cursor-pointer ${
                            checked
                              ? 'bg-[#142B4E] text-white border-[#142B4E]'
                              : 'bg-white text-neutral-700 border-neutral-300 hover:border-[#142B4E]'
                          }`}
                        >
                          {fit}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border border-[#142B4E]/15 bg-[#F8FAFC] p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#142B4E]">
                      Sizes *
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNewSizes([...CREATE_SIZE_OPTIONS])}
                        className="text-[10px] text-[#142B4E] hover:underline cursor-pointer"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewSizes([])}
                        className="text-[10px] text-neutral-500 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                      <span className="text-[10px] font-mono-tabular text-neutral-500">
                        {newSizes.length}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
                    {CREATE_SIZE_OPTIONS.map((size) => {
                      const checked = newSizes.includes(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() =>
                            setNewSizes((prev) =>
                              checked ? prev.filter((s) => s !== size) : [...prev, size]
                            )
                          }
                          className={`px-2 py-1.5 border font-mono-tabular text-[11px] cursor-pointer ${
                            checked
                              ? 'bg-[#142B4E] text-white border-[#142B4E]'
                              : 'bg-white text-neutral-700 border-neutral-300 hover:border-[#142B4E]'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 border-t border-black/10 bg-white px-5 sm:px-6 py-3 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={newCreateBusy}
                onClick={() => setCreatingProduct(false)}
                className="px-4 py-2.5 border border-neutral-300 text-neutral-700 uppercase tracking-wider font-medium cursor-pointer hover:bg-neutral-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={newCreateBusy}
                className="px-5 py-2.5 bg-[#142B4E] hover:bg-[#0f213d] text-white uppercase tracking-wider font-medium cursor-pointer disabled:opacity-60"
              >
                {newCreateBusy
                  ? 'Creating...'
                  : `Create Shirt · ${newFits.length * newSizes.length || 0} Variants`}
              </button>
            </div>
          </form>
        </div>
      )}
      </main>
    </div>
  );
};
