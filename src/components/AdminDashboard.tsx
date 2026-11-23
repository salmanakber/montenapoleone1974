import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
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
  Shield,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Truck,
  Upload,
  Users,
  X,
} from 'lucide-react';
import type {
  AdminReportData,
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
  TailoringSizeSpec,
  TopBannerSettings,
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
  onAuthChange: (token: string | null, user: AuthUser | null) => void;
  onRefreshStorefront: () => void;
  onBackToStorefront?: () => void;
}

type AdminTab =
  | 'overview'
  | 'products'
  | 'categories'
  | 'variants'
  | 'stock'
  | 'tailoring'
  | 'menu'
  | 'hero'
  | 'promotions'
  | 'ai'
  | 'orders'
  | 'emails'
  | 'reports'
  | 'media'
  | 'b2b'
  | 'newsletter'
  | 'staff'
  | 'settings'
  | 'credentials'
  | 'database';

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
  onAuthChange,
  onRefreshStorefront,
  onBackToStorefront,
}) => {
  const [needsOwnerClaim, setNeedsOwnerClaim] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Claim / Login forms
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [claimName, setClaimName] = useState('');
  const [claimEmail, setClaimEmail] = useState('');
  const [claimPassword, setClaimPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // Dashboard Data
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
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
  const [reportData, setReportData] = useState<AdminReportData | null>(null);
  const [heroSlides, setHeroSlides] = useState<HeroSlideRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [topBanner, setTopBanner] = useState<TopBannerSettings>(DEFAULT_TOP_BANNER_SETTINGS);
  const [promoRules, setPromoRules] = useState<PromotionPopupSettings>(DEFAULT_PROMO_POPUP_SETTINGS);
  const [bulkDiscount, setBulkDiscount] = useState<BulkDiscountSettings>(DEFAULT_BULK_DISCOUNT_SETTINGS);
  const [customerAuth, setCustomerAuth] = useState<CustomerAuthSettings>(DEFAULT_CUSTOMER_AUTH_SETTINGS);
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

  // Orders filter & inspection modal
  const [orderRegionFilter, setOrderRegionFilter] = useState<'all' | RegionCode>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [inspectingOrder, setInspectingOrder] = useState<OrderRecord | null>(null);

  // CSV Import & Bulk Editor state
  const [showBulkEditor, setShowBulkEditor] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvText, setCsvText] = useState(
    'sku,region_code,price,stock_qty\nMN-L3,en,185,18\nMN-B1,no,1599,42'
  );
  const [csvPreview, setCsvPreview] = useState<{ rows: CsvImportRow[]; errors: string[] } | null>(null);
  const [csvResultMsg, setCsvResultMsg] = useState<string | null>(null);

  // Product & Menu Editor Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<
    'primary' | 'secondary' | 'tailoring' | 'menu' | 'hero' | null
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
        if (data.user && authToken) {
          onAuthChange(authToken, data.user);
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
      fetch('/api/admin/reports', { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const parsed = d?.report || (d?.byRegion ? d : null);
          if (parsed) setReportData(parsed);
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
            if (d?.aiSettings) setAiSettings(d.aiSettings);
          })
      );
    }

    await Promise.all(reqs);
  }, [authToken, authUser]);

  useEffect(() => {
    setActiveTab('overview');
  }, [authUser?.id]);

  useEffect(() => {
    if (authToken && authUser) {
      loadAdminData();
    }
  }, [authToken, authUser, loadAdminData]);

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
    if (!authToken) return;
    setCsvResultMsg(null);

    if (isWooCommerceCsvHeader(csvText)) {
      const wooParsed = parseWooCommerceCsv(csvText);
      if (wooParsed.rows.length === 0) {
        setCsvResultMsg(wooParsed.errors[0] || 'No valid WooCommerce product rows detected.');
        return;
      }
      const res = await fetch('/api/admin/import/woocommerce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ rows: wooParsed.rows }),
      });
      const data = await res.json();
      if (res.ok) {
        setCsvResultMsg(
          `WooCommerce Import complete: ${data.importedCount} product(s) (${data.createdCount} created, ${data.updatedCount} updated, ${data.categoriesCreated} categories synced).`
        );
        loadAdminData();
        onRefreshStorefront();
      } else {
        setCsvResultMsg(data.error || 'WooCommerce CSV import failed.');
      }
      return;
    }

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

  const handleSaveProductEdit = async () => {
    if (!authToken || !editingProduct) return;
    const assigned =
      Array.isArray(editingProduct.category_slugs) && editingProduct.category_slugs.length > 0
        ? editingProduct.category_slugs
        : [editingProduct.category_slug || 'business'];
    const payload: Product = {
      ...editingProduct,
      category_slug: assigned[0],
      category_slugs: assigned,
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
    const assignedCategories = newCategories.length > 0 ? newCategories : ['business'];
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
        localizations: {
          en: { title: newTitleEn, price: newPriceEn, stock_qty: 12 },
          no: { title: `${newTitleEn} (NO)`, price: newPriceNo, stock_qty: 10 },
          it: { title: `${newTitleEn} (IT)`, price: newPriceIt, stock_qty: 15 },
          vn: { title: `${newTitleEn} (VN)`, price: newPriceVn, stock_qty: 8 },
        },
      }),
    });
    if (res.ok) {
      setCreatingProduct(false);
      setNewSku('');
      setNewTitleEn('');
      setNewCategories(['business']);
      loadAdminData();
      onRefreshStorefront();
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
      id: 'reports',
      label: 'Reports & Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
      visible:
        hasPermission(authUser, 'manage_orders') ||
        hasPermission(authUser, 'manage_pricing') ||
        hasPermission(authUser, 'manage_inventory'),
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
                  onClick={() => setActiveTab(tab.id)}
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
                <div className="border border-[#142B4E]/25 bg-[#FAFAFA] p-5 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold uppercase tracking-wider text-[#142B4E] flex items-center gap-2">
                        <span>Bulk CSV / WooCommerce Product Export Import</span>
                        {isWooCommerceCsvHeader(csvText) && (
                          <span className="px-2 py-0.5 bg-[#0284C7] text-white text-[10px]">
                            WooCommerce CSV Detected
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        Supports Monte Napoleone regional CSV (<code className="font-mono-tabular">sku,region_code,title,price,stock_qty</code>) or standard WooCommerce Product Export CSV (<code className="font-mono-tabular">SKU,Name,Regular price,Categories,Images,Stock</code>).
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCsvText(
                            'ID,Type,SKU,Name,Published,Short description,Description,In stock?,Stock,Regular price,Sale price,Categories,Images\n' +
                              '901,simple,MN-WOO-901,"Como Royal Twill Shirt",1,"Fine Italian 2-ply twill","Woven in Como with mother-of-pearl buttons",1,24,189,165,"Business > Twill Non-Iron","/src/assets/images/shirt_white_signature_1795248293653.jpg"\n' +
                              '902,simple,MN-WOO-902,"Portofino Resort Linen",1,"Lightweight coastal linen","Breathable summer weave",1,18,169,,"Casual & Linen > Summer Linen","/src/assets/images/shirt_beige_linen_1795248293982.jpg"'
                          );
                          setCsvPreview(null);
                          setCsvResultMsg(null);
                        }}
                        className="px-3 py-1.5 bg-white border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E]/5 cursor-pointer"
                      >
                        Load WooCommerce Sample
                      </button>
                      <label className="px-3 py-1.5 bg-white border border-neutral-300 cursor-pointer hover:bg-neutral-50">
                        <span>Upload .csv file</span>
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          className="sr-only"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            f.text().then((txt) => {
                              setCsvText(txt);
                              if (!isWooCommerceCsvHeader(txt)) {
                                setCsvPreview(parseProductImportCsv(txt));
                              } else {
                                setCsvPreview(null);
                              }
                            });
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <textarea
                    rows={4}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    aria-label="CSV product import data"
                    className="w-full p-3 font-mono-tabular text-[11px] border border-neutral-300 bg-white outline-none focus:border-[#142B4E]"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isWooCommerceCsvHeader(csvText)) {
                            const woo = parseWooCommerceCsv(csvText);
                            setCsvPreview(null);
                            setCsvResultMsg(
                              `WooCommerce CSV validated: ${woo.rows.length} product(s) ready across EN/NO/IT/VN.`
                            );
                          } else {
                            setCsvPreview(parseProductImportCsv(csvText));
                          }
                        }}
                        className="px-3 py-1.5 border border-neutral-300 bg-white hover:bg-neutral-50 cursor-pointer"
                      >
                        Validate CSV
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyCsvImport}
                        className="px-4 py-1.5 bg-[#142B4E] text-white uppercase tracking-wider font-medium cursor-pointer"
                      >
                        {isWooCommerceCsvHeader(csvText) ? 'Import WooCommerce Products' : 'Apply Bulk Import'}
                      </button>
                    </div>
                    {csvResultMsg && <span className="text-[#4F8A47] font-medium">{csvResultMsg}</span>}
                  </div>

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

              <div className="border border-neutral-200 bg-white overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F7F7F7] border-b border-neutral-200 text-neutral-600 uppercase text-[11px]">
                    <tr>
                      <th className="p-3">Shirt</th>
                      <th className="p-3">EN (USD)</th>
                      <th className="p-3">NO (NOK)</th>
                      <th className="p-3">IT (EUR)</th>
                      <th className="p-3">VN (VND)</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {products.map((p) => {
                      const locs = p.localizations;
                      return (
                        <tr key={p.id} className="hover:bg-neutral-50">
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
                  </tbody>
                </table>
              </div>
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
            <ReportsPanel report={reportData} onRefresh={loadAdminData} />
          )}

          {/* ORDERS & DHL DISPATCH + SEARCH/FILTER/EXPORT */}
          {safeActiveTab === 'orders' && hasPermission(authUser, 'manage_orders') && (
            <div className="space-y-5">
              <div className="border-b border-neutral-200 pb-3 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-base font-semibold uppercase tracking-wide">
                  Orders, Local Bank Transfers & DHL Express Dispatch
                </h1>
                <button
                  type="button"
                  onClick={() => handleExportCsv('orders')}
                  className="px-3.5 py-2 border border-neutral-300 bg-white hover:bg-neutral-50 text-xs uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Orders CSV</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
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
                <input
                  type="search"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Filter by order # or email..."
                  aria-label="Filter orders"
                  className="px-3 py-1.5 border border-neutral-300 bg-white w-full sm:w-64 outline-none focus:border-[#142B4E]"
                />
              </div>

              <div className="space-y-3">
                {orders
                  .filter((ord) => {
                    if (orderRegionFilter !== 'all' && ord.region_code !== orderRegionFilter) return false;
                    const q = orderSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      ord.order_number.toLowerCase().includes(q) ||
                      ord.customer_email.toLowerCase().includes(q) ||
                      ord.customer_name.toLowerCase().includes(q)
                    );
                  })
                  .map((ord) => (
                  <div key={ord.id} className="border border-neutral-200 bg-white p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                      <div>
                        <span className="font-mono-tabular font-semibold text-sm">{ord.order_number}</span>
                        <span className="mx-2 text-neutral-300">·</span>
                        <span className="text-xs font-medium">{ord.customer_name}</span>
                        <span className="mx-2 text-neutral-300">·</span>
                        <span className="text-xs text-neutral-500">
                          {ord.shipping_city}, {ord.shipping_country}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular">
                        <span className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 uppercase">
                          {ord.payment_method} ({ord.payment_status})
                        </span>
                        <span className="px-2 py-0.5 bg-[#142B4E]/10 text-[#142B4E] uppercase">
                          {ord.order_status}
                        </span>
                        <span className="font-semibold text-sm ml-2">
                          {formatRegionalPrice(ord.total, ord.region_code)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="text-neutral-600">
                        <span className="font-mono-tabular">Ref: {ord.payment_reference}</span>
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
                ))}
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
          )}

          {/* WORDPRESS-STYLE MEDIA LIBRARY */}
          {safeActiveTab === 'media' && authToken && hasPermission(authUser, 'manage_media') && (
            <MediaLibraryPanel authToken={authToken} media={media} onRefresh={loadAdminData} />
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
                    <span className="text-[11px] text-neutral-500">
                      Callback URI: {typeof window !== 'undefined' ? `${window.location.origin}/api/auth/google/callback` : '/api/auth/google/callback'}
                    </span>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-3 border border-neutral-200 p-3">
                <img
                  src={editingProduct.primary_image}
                  alt="Primary"
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 object-cover bg-[#E6E6E6]"
                />
                <div>
                  <div className="font-medium">Primary Studio Photo</div>
                  <button
                    type="button"
                    onClick={() => setMediaPickerTarget('primary')}
                    className="mt-1 text-[#142B4E] hover:underline cursor-pointer"
                  >
                    Choose from Media Library
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 border border-neutral-200 p-3">
                <img
                  src={editingProduct.secondary_image}
                  alt="Secondary"
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 object-cover bg-[#E6E6E6]"
                />
                <div>
                  <div className="font-medium">Secondary Editorial Photo</div>
                  <button
                    type="button"
                    onClick={() => setMediaPickerTarget('secondary')}
                    className="mt-1 text-[#142B4E] hover:underline cursor-pointer"
                  >
                    Choose from Media Library
                  </button>
                </div>
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
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => {
              setMediaPickerTarget(null);
              setTailoringPickerCb(null);
            }}
          />
          <div className="relative w-full max-w-5xl bg-white border border-black/20 shadow-2xl p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
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
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
                } else if (editingProduct) {
                  setEditingProduct((prev) =>
                    prev
                      ? {
                          ...prev,
                          primary_image: mediaPickerTarget === 'primary' ? asset.url : prev.primary_image,
                          secondary_image: mediaPickerTarget === 'secondary' ? asset.url : prev.secondary_image,
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
      )}

      {/* CREATE PRODUCT MODAL */}
      {creatingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setCreatingProduct(false)} />
          <form
            onSubmit={handleCreateProduct}
            className="relative w-full max-w-lg bg-white border border-black/15 shadow-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-black/10 pb-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider">Add New Shirt</h2>
              <button
                type="button"
                onClick={() => setCreatingProduct(false)}
                className="p-1 text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <input
                required
                placeholder="SKU (e.g. MN-L50)"
                value={newSku}
                onChange={(e) => setNewSku(e.target.value)}
                className="px-3 py-2 border border-neutral-300 font-mono-tabular"
              />
              <div className="border border-neutral-200 p-3 bg-[#FAFAFA] space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#142B4E]">
                  Assign Categories (Select multiple parent & child categories)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
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
                          className={`flex items-center gap-1.5 px-2 py-1 border cursor-pointer ${
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
            </div>
            <input
              required
              placeholder="Product Title (English)"
              value={newTitleEn}
              onChange={(e) => setNewTitleEn(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300"
            />
            <input
              required
              placeholder="Fabric Spec"
              value={newFabric}
              onChange={(e) => setNewFabric(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300"
            />
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] text-neutral-500">USD</label>
                <input
                  type="number"
                  value={newPriceEn}
                  onChange={(e) => setNewPriceEn(Number(e.target.value))}
                  className="w-full px-2 py-1.5 border border-neutral-300 font-mono-tabular"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-500">NOK</label>
                <input
                  type="number"
                  value={newPriceNo}
                  onChange={(e) => setNewPriceNo(Number(e.target.value))}
                  className="w-full px-2 py-1.5 border border-neutral-300 font-mono-tabular"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-500">EUR</label>
                <input
                  type="number"
                  value={newPriceIt}
                  onChange={(e) => setNewPriceIt(Number(e.target.value))}
                  className="w-full px-2 py-1.5 border border-neutral-300 font-mono-tabular"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-500">VND</label>
                <input
                  type="number"
                  value={newPriceVn}
                  onChange={(e) => setNewPriceVn(Number(e.target.value))}
                  className="w-full px-2 py-1.5 border border-neutral-300 font-mono-tabular"
                />
              </div>
            </div>
            <div className="flex items-center justify-between border border-neutral-200 p-2">
              <span className="truncate text-neutral-600">{newPrimaryImg}</span>
              <button
                type="button"
                onClick={() => setMediaPickerTarget('primary')}
                className="text-[#142B4E] hover:underline shrink-0 ml-2 cursor-pointer"
              >
                Pick from Media
              </button>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-[#142B4E] text-white uppercase tracking-wider font-medium cursor-pointer"
            >
              Create Multi-Region Shirt
            </button>
          </form>
        </div>
      )}
      </main>
    </div>
  );
};
