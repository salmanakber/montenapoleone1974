import React, { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import R3fGlobe, { type GlobeMethods } from 'r3f-globe';
import * as THREE from 'three';
import { Globe, Maximize2, Minimize2, Minus, Plus, X } from 'lucide-react';
import type {
  AdminReportData,
  CountryMetric,
  VisitorCountryRollup,
  VisitorSessionMetric,
} from '../types.ts';
import { WORLD_COUNTRY_FEATURES, type WorldCountryFeature } from '../data/worldCountries.ts';

interface Globe3DMapProps {
  countries: CountryMetric[];
  visitors?: VisitorSessionMetric[];
  visitorCountries?: VisitorCountryRollup[];
  activeVisitorsCount?: number;
  liveViewMetrics?: AdminReportData['liveViewMetrics'];
}

interface GlobePointDatum {
  id: string;
  kind: 'visitor' | 'order';
  lat: number;
  lng: number;
  country: string;
  countryCode: string;
  city: string;
  activeCount: number;
  totalCount: number;
  orders: number;
  revenueUsd: number;
  currentPath: string;
  isActive: boolean;
}

interface GlobeArcDatum {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  kind: 'visitor' | 'order';
}

interface GlobeRingDatum {
  lat: number;
  lng: number;
  kind: 'visitor' | 'order';
}

interface SelectedGlobePopup {
  kind: 'visitor' | 'order' | 'country';
  title: string;
  subtitle: string;
  activeVisitors: number;
  totalSessions: number;
  orders: number;
  revenueUsd: number;
  path?: string;
}

class GlobeWebGLErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function detectSoftwareWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_DEBUG_RENDERER_INFO');
    if (ext) {
      const renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
      if (/swiftshader|llvmpipe|softpipe|mesa offscreen/i.test(renderer)) {
        return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}

const TREVISO_HUB = { lat: 45.67, lng: 12.24 };

const GlobeSceneContent: React.FC<{
  pointsData: GlobePointDatum[];
  arcsData: GlobeArcDatum[];
  ringsData: GlobeRingDatum[];
  activeCountryNames: Set<string>;
  activeCountryCodes: Set<string>;
  zoomTrigger: { seq: number; delta: number };
  paused: boolean;
  isSoftwareGl: boolean;
  onSelectPoint: (pt: GlobePointDatum) => void;
  onSelectCountry: (feat: WorldCountryFeature) => void;
  onHoverChange: (hovered: boolean) => void;
}> = ({
  pointsData,
  arcsData,
  ringsData,
  activeCountryNames,
  activeCountryCodes,
  zoomTrigger,
  paused,
  isSoftwareGl,
  onSelectPoint,
  onSelectCountry,
  onHoverChange,
}) => {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const prevZoomSeq = useRef(0);

  const globeMaterial = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: new THREE.Color('#E3E8F0'),
        emissive: new THREE.Color('#D8E0EB'),
        specular: new THREE.Color('#F8FAFC'),
        shininess: 8,
      }),
    []
  );

  useEffect(() => {
    globeRef.current?.setPointOfView(camera);
  }, [camera]);

  useEffect(() => {
    if (zoomTrigger.seq === prevZoomSeq.current) return;
    prevZoomSeq.current = zoomTrigger.seq;
    const currentDist = camera.position.length() || 335;
    const nextDist = Math.max(175, Math.min(440, currentDist * zoomTrigger.delta));
    camera.position.setLength(nextDist);
    controlsRef.current?.update();
    globeRef.current?.setPointOfView(camera);
  }, [zoomTrigger, camera]);

  useFrame((_, delta) => {
    if (!paused && !isSoftwareGl && controlsRef.current) {
      // OrbitControls handles gentle rotation cleanly when autoRotate is enabled
      void delta;
    }
    if (globeRef.current) {
      globeRef.current.setPointOfView(camera);
    }
  });

  const resolvePolygonColor = useCallback(
    (feat: object) => {
      const f = feat as WorldCountryFeature;
      const code = (f.properties?.iso_a2 || '').toUpperCase();
      const name = (f.properties?.name || '').toLowerCase();
      if (
        activeCountryCodes.has(code) ||
        activeCountryNames.has(name) ||
        (name === 'united states of america' && activeCountryNames.has('united states'))
      ) {
        return '#E0F2FE';
      }
      return '#FFFFFF';
    },
    [activeCountryCodes, activeCountryNames]
  );

  return (
    <>
      <ambientLight intensity={1.15} color="#FFFFFF" />
      <directionalLight position={[180, 220, 240]} intensity={0.85} color="#FFFFFF" />
      <directionalLight position={[-160, -100, -140]} intensity={0.35} color="#CBD5E1" />

      <R3fGlobe
        ref={globeRef}
        globeMaterial={globeMaterial}
        showGraticules={false}
        showAtmosphere
        atmosphereColor="#CBD5E1"
        atmosphereAltitude={0.1}
        polygonsData={WORLD_COUNTRY_FEATURES}
        polygonGeoJsonGeometry={(d) => (d as WorldCountryFeature).geometry as any}
        polygonCapColor={resolvePolygonColor}
        polygonSideColor={() => '#CBD5E1'}
        polygonStrokeColor={() => '#B8C4D4'}
        polygonAltitude={0.008}
        pointsData={pointsData}
        pointsMerge={false}
        pointLat={(d) => (d as GlobePointDatum).lat}
        pointLng={(d) => (d as GlobePointDatum).lng}
        pointColor={(d) =>
          (d as GlobePointDatum).kind === 'order' ? '#3B82F6' : '#0D9488'
        }
        pointAltitude={(d) => {
          const item = d as GlobePointDatum;
          return item.kind === 'order'
            ? 0.045 + Math.min(0.055, item.orders * 0.012)
            : 0.014;
        }}
        pointRadius={(d) => {
          const item = d as GlobePointDatum;
          if (item.kind === 'order') return 0.95;
          return item.isActive ? 0.72 : 0.52;
        }}
        ringsData={ringsData}
        ringLat={(d) => (d as GlobeRingDatum).lat}
        ringLng={(d) => (d as GlobeRingDatum).lng}
        ringColor={(d: unknown) =>
          (d as GlobeRingDatum).kind === 'order'
            ? (t: number) => `rgba(59, 130, 246, ${1 - t})`
            : (t: number) => `rgba(13, 148, 136, ${1 - t})`
        }
        ringMaxRadius={3.4}
        ringPropagationSpeed={1.6}
        ringRepeatPeriod={1800}
        arcsData={arcsData}
        arcStartLat={(d) => (d as GlobeArcDatum).startLat}
        arcStartLng={(d) => (d as GlobeArcDatum).startLng}
        arcEndLat={(d) => (d as GlobeArcDatum).endLat}
        arcEndLng={(d) => (d as GlobeArcDatum).endLng}
        arcColor={(d: unknown) =>
          (d as GlobeArcDatum).kind === 'order'
            ? ['rgba(59,130,246,0.2)', '#2563EB']
            : ['rgba(20,184,166,0.18)', '#0D9488']
        }
        arcStroke={0.42}
        arcDashLength={0.45}
        arcDashGap={0.35}
        arcDashAnimateTime={isSoftwareGl ? 0 : 2800}
        onHover={(layer) => {
          onHoverChange(layer === 'points');
        }}
        onClick={(layer, elemData, event) => {
          event?.stopPropagation?.();
          if (layer === 'points' && elemData) {
            onSelectPoint(elemData as GlobePointDatum);
          } else if (layer === 'polygons' && elemData) {
            onSelectCountry(elemData as WorldCountryFeature);
          }
        }}
      />

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={175}
        maxDistance={440}
        rotateSpeed={0.65}
        zoomSpeed={0.7}
        autoRotate={!paused && !isSoftwareGl}
        autoRotateSpeed={0.35}
        onChange={() => {
          globeRef.current?.setPointOfView(camera);
        }}
      />
    </>
  );
};

export const Globe3DMap: React.FC<Globe3DMapProps> = ({
  countries,
  visitors = [],
  visitorCountries = [],
  activeVisitorsCount = 0,
  liveViewMetrics,
}) => {
  const [fullscreen, setFullscreen] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(false);
  const [selectedPopup, setSelectedPopup] = useState<SelectedGlobePopup | null>(null);
  const [zoomTrigger, setZoomTrigger] = useState({ seq: 0, delta: 1 });
  const isSoftwareGl = useMemo(() => detectSoftwareWebGL(), []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  // Combine country metrics + live visitor session markers
  const { pointsData, arcsData, ringsData, activeCountryCodes, activeCountryNames } = useMemo(() => {
    const pts: GlobePointDatum[] = [];
    const arcs: GlobeArcDatum[] = [];
    const rings: GlobeRingDatum[] = [];
    const codes = new Set<string>();
    const names = new Set<string>();

    // Visitor country pins aggregated with city context
    for (const vc of visitorCountries) {
      if (!Number.isFinite(vc.lat) || !Number.isFinite(vc.lng)) continue;
      codes.add(vc.country_code.toUpperCase());
      names.add(vc.country.toLowerCase());
      const matchingVisitors = visitors.filter(
        (v) => v.country_code.toUpperCase() === vc.country_code.toUpperCase()
      );
      pts.push({
        id: `vc-${vc.country_code}`,
        kind: 'visitor',
        lat: vc.lat,
        lng: vc.lng,
        country: vc.country,
        countryCode: vc.country_code.toUpperCase(),
        city: vc.sample_cities?.[0] || matchingVisitors[0]?.city || vc.country,
        activeCount: vc.active_count,
        totalCount: vc.total_count,
        orders: 0,
        revenueUsd: 0,
        currentPath: matchingVisitors[0]?.current_path || '/',
        isActive: vc.active_count > 0,
      });
      if (vc.active_count > 0) {
        rings.push({ lat: vc.lat, lng: vc.lng, kind: 'visitor' });
      }
      if (Math.abs(vc.lat - TREVISO_HUB.lat) > 2 || Math.abs(vc.lng - TREVISO_HUB.lng) > 2) {
        arcs.push({
          startLat: TREVISO_HUB.lat,
          startLng: TREVISO_HUB.lng,
          endLat: vc.lat,
          endLng: vc.lng,
          kind: 'visitor',
        });
      }
    }

    // Order hub pins (offset slightly if exact same coordinates as a visitor pin)
    for (const c of countries) {
      if (c.orders <= 0 && c.revenue_usd_equiv <= 0) continue;
      const cc = c.region_code === 'no' ? 'NO' : c.region_code === 'it' ? 'IT' : c.region_code === 'vn' ? 'VN' : 'US';
      codes.add(cc);
      names.add(c.country.toLowerCase());
      pts.push({
        id: `ord-${c.region_code}`,
        kind: 'order',
        lat: c.lat + 0.6,
        lng: c.lng + 0.8,
        country: c.country,
        countryCode: cc,
        city: c.hub_label,
        activeCount: 0,
        totalCount: 0,
        orders: c.orders,
        revenueUsd: c.revenue_usd_equiv,
        currentPath: '',
        isActive: true,
      });
      rings.push({ lat: c.lat + 0.6, lng: c.lng + 0.8, kind: 'order' });
      if (c.region_code !== 'it') {
        arcs.push({
          startLat: TREVISO_HUB.lat,
          startLng: TREVISO_HUB.lng,
          endLat: c.lat,
          endLng: c.lng,
          kind: 'order',
        });
      }
    }

    return {
      pointsData: pts,
      arcsData: arcs,
      ringsData: rings,
      activeCountryCodes: codes,
      activeCountryNames: names,
    };
  }, [visitorCountries, visitors, countries]);

  const metrics = liveViewMetrics || {
    visitorsRightNow: activeVisitorsCount,
    totalSessions: visitors.length,
    totalSalesUsd: countries.reduce((s, c) => s + c.revenue_usd_equiv, 0),
    totalOrders: countries.reduce((s, c) => s + c.orders, 0),
    activeCarts: visitors.filter((v) => v.is_active && v.current_path.includes('/product')).length,
    checkingOut: visitors.filter((v) => v.is_active && v.current_path.includes('/checkout')).length,
    purchasedRecent: countries.reduce((s, c) => s + c.orders, 0),
    pageViewsTimeline: Array.from({ length: 10 }, (_, idx) => ({
      label: idx === 9 ? 'Now' : `${9 - idx}m`,
      count: idx === 9 ? activeVisitorsCount : 0,
    })),
  };

  const maxTimelineCount = Math.max(1, ...metrics.pageViewsTimeline.map((b) => b.count));

  const handleSelectPoint = useCallback((pt: GlobePointDatum) => {
    setSelectedPopup({
      kind: pt.kind,
      title: `${pt.country} (${pt.countryCode})`,
      subtitle: pt.city || pt.country,
      activeVisitors: pt.activeCount,
      totalSessions: pt.totalCount,
      orders: pt.orders,
      revenueUsd: pt.revenueUsd,
      path: pt.currentPath,
    });
  }, []);

  const handleSelectCountry = useCallback(
    (feat: WorldCountryFeature) => {
      const code = (feat.properties?.iso_a2 || '').toUpperCase();
      const vc = visitorCountries.find((v) => v.country_code.toUpperCase() === code);
      const ordMatch = countries.find(
        (c) =>
          (c.region_code === 'no' && code === 'NO') ||
          (c.region_code === 'it' && code === 'IT') ||
          (c.region_code === 'vn' && code === 'VN') ||
          (c.region_code === 'en' && code === 'US')
      );
      if (!vc && !ordMatch) return;
      setSelectedPopup({
        kind: 'country',
        title: vc?.country || feat.properties.name,
        subtitle: vc?.sample_cities?.join(', ') || ordMatch?.hub_label || code,
        activeVisitors: vc?.active_count || 0,
        totalSessions: vc?.total_count || 0,
        orders: ordMatch?.orders || 0,
        revenueUsd: ordMatch?.revenue_usd_equiv || 0,
      });
    },
    [visitorCountries, countries]
  );

  const nowFormatted = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const svgFallback = (
    <div className="h-[460px] flex flex-col items-center justify-center bg-[#F4F6F9] text-slate-600 gap-2 p-6 text-center">
      <Globe className="w-10 h-10 text-teal-600" />
      <div className="text-xs font-semibold text-slate-800">
        {metrics.visitorsRightNow} active visitor(s) across {visitorCountries.length} country/countries
      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-1">
        {visitorCountries.map((vc) => (
          <span
            key={vc.country_code}
            className="px-2.5 py-1 bg-white border border-slate-200 rounded text-[11px] font-mono-tabular"
          >
            {vc.country}: {vc.active_count} live / {vc.total_count} sessions
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div
      data-testid="live-view-globe-container"
      className={
        fullscreen
          ? 'fixed inset-4 z-50 bg-[#F4F6F9] border border-slate-200 rounded-xl shadow-2xl flex flex-col overflow-hidden'
          : 'relative bg-[#F4F6F9] border border-slate-200 rounded-xl overflow-hidden shadow-sm'
      }
    >
      {/* Top Floating Shopify-Style Live View Header */}
      <div className="flex items-start justify-between px-5 pt-4 pb-2 relative z-10 pointer-events-none">
        <div className="pointer-events-auto">
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-base font-semibold text-slate-900">Live view</h2>
            <span className="text-[11px] text-slate-500">Real-time · {nowFormatted}</span>
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-[11px] text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 ring-2 ring-teal-200" />
              <span>Visitor</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-200" />
              <span>Order</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFullscreen((prev) => !prev)}
          data-testid="globe-fullscreen-btn"
          className="pointer-events-auto px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
        >
          {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span>{fullscreen ? 'Exit full screen' : 'Full screen'}</span>
        </button>
      </div>

      {/* Main 3D Globe Stage */}
      <div
        className={`relative w-full ${fullscreen ? 'flex-1 min-h-[380px]' : 'h-[390px] sm:h-[440px]'} ${
          hoveredPoint ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        <GlobeWebGLErrorBoundary fallback={svgFallback}>
          <Canvas
            dpr={isSoftwareGl ? 1 : [1, 2]}
            gl={{ antialias: !isSoftwareGl, powerPreference: 'high-performance', alpha: true }}
            camera={{ position: [-10, 175, 295], fov: 38, near: 1, far: 1500 }}
            onPointerMissed={() => setSelectedPopup(null)}
          >
            <GlobeSceneContent
              pointsData={pointsData}
              arcsData={arcsData}
              ringsData={ringsData}
              activeCountryCodes={activeCountryCodes}
              activeCountryNames={activeCountryNames}
              zoomTrigger={zoomTrigger}
              paused={Boolean(selectedPopup)}
              isSoftwareGl={isSoftwareGl}
              onSelectPoint={handleSelectPoint}
              onSelectCountry={handleSelectCountry}
              onHoverChange={setHoveredPoint}
            />
          </Canvas>
        </GlobeWebGLErrorBoundary>

        {/* Clicked Marker / Country Popover Inside Map (zero backdrop-blur over WebGL) */}
        {selectedPopup && (
          <div
            data-testid="globe-marker-popover"
            className="absolute top-3 left-5 z-20 w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-3.5 text-xs space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      selectedPopup.kind === 'order' ? 'bg-blue-500' : 'bg-teal-500'
                    }`}
                  />
                  <span>{selectedPopup.title}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{selectedPopup.subtitle}</div>
              </div>
              <button
                type="button"
                aria-label="Close marker popup"
                onClick={() => setSelectedPopup(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100 text-[11px]">
              <div>
                <div className="text-slate-400">Active Visitors</div>
                <div className="font-mono-tabular font-semibold text-teal-700">
                  {selectedPopup.activeVisitors} live ({selectedPopup.totalSessions} total)
                </div>
              </div>
              <div>
                <div className="text-slate-400">Orders / Sales</div>
                <div className="font-mono-tabular font-semibold text-blue-700">
                  {selectedPopup.orders} · ${selectedPopup.revenueUsd.toLocaleString('en-US')}
                </div>
              </div>
            </div>
            {selectedPopup.path && (
              <div className="text-[10px] font-mono-tabular text-slate-500 truncate pt-1 border-t border-slate-100">
                Page: {selectedPopup.path}
              </div>
            )}
          </div>
        )}

        {/* Zoom - / + Control Pill */}
        <div className="absolute bottom-3 right-5 z-10 inline-flex items-center bg-white border border-slate-200 rounded-full shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setZoomTrigger((prev) => ({ seq: prev.seq + 1, delta: 1.18 }))}
            aria-label="Zoom out globe"
            data-testid="globe-zoom-out"
            className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer border-r border-slate-200"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomTrigger((prev) => ({ seq: prev.seq + 1, delta: 0.85 }))}
            aria-label="Zoom in globe"
            data-testid="globe-zoom-in"
            className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Shopify Live View 4-Module Bottom HUD */}
      <div className="px-5 pb-5 pt-2 grid grid-cols-1 lg:grid-cols-12 gap-3 relative z-10">
        {/* Left 2x2 KPI Grid */}
        <div className="lg:col-span-6 grid grid-cols-2 gap-3">
          <div className="bg-white border border-slate-200/90 rounded-lg p-3.5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-medium text-slate-600">Visitors right now</div>
              <div
                data-testid="live-view-visitors-count"
                className="text-2xl font-mono-tabular font-semibold text-slate-900 mt-1"
              >
                {metrics.visitorsRightNow.toLocaleString('en-US')}
              </div>
            </div>
            <div className="flex gap-1 mt-3">
              {Array.from({ length: 10 }, (_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 flex-1 rounded-xs ${
                    idx < Math.max(1, Math.min(10, metrics.visitorsRightNow))
                      ? 'bg-teal-500'
                      : 'bg-teal-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-lg p-3.5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-medium text-slate-600">Total sessions</div>
              <div className="text-2xl font-mono-tabular font-semibold text-slate-900 mt-1">
                {metrics.totalSessions.toLocaleString('en-US')}
              </div>
            </div>
            <div className="flex gap-1 mt-3">
              {Array.from({ length: 10 }, (_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 flex-1 rounded-xs ${
                    idx < Math.max(2, Math.min(10, metrics.totalSessions))
                      ? 'bg-teal-500'
                      : 'bg-teal-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-lg p-3.5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-medium text-slate-600">Total sales (USD eq.)</div>
              <div className="text-2xl font-mono-tabular font-semibold text-slate-900 mt-1">
                ${metrics.totalSalesUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="flex gap-1 mt-3">
              {Array.from({ length: 10 }, (_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 flex-1 rounded-xs ${
                    metrics.totalSalesUsd > 0 && idx % 2 === 0 ? 'bg-teal-500' : 'bg-teal-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-lg p-3.5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-medium text-slate-600">Total orders</div>
              <div className="text-2xl font-mono-tabular font-semibold text-slate-900 mt-1">
                {metrics.totalOrders.toLocaleString('en-US')}
              </div>
            </div>
            <div className="flex gap-1 mt-3">
              {Array.from({ length: 10 }, (_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 flex-1 rounded-xs ${
                    idx < Math.max(1, Math.min(10, metrics.totalOrders))
                      ? 'bg-teal-500'
                      : 'bg-teal-100'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Middle Card: Page Views 10 min Mini Bar Chart */}
        <div className="lg:col-span-3 bg-white border border-slate-200/90 rounded-lg p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-700">Page views</span>
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">10 min</span>
          </div>

          <div className="h-24 flex items-end gap-1.5 pt-3">
            {metrics.pageViewsTimeline.map((pt, i) => {
              const barPct = Math.max(14, Math.round((pt.count / maxTimelineCount) * 100));
              const isNow = i === metrics.pageViewsTimeline.length - 1;
              return (
                <div
                  key={pt.label}
                  title={`${pt.label}: ${pt.count} visitor(s)`}
                  className="flex-1 h-full flex items-end"
                >
                  <div
                    style={{ height: `${barPct}%` }}
                    className={`w-full rounded-t-xs transition-all ${
                      isNow ? 'bg-slate-600' : 'bg-slate-300'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
            <span>10 min ago</span>
            <span>Now</span>
          </div>
        </div>

        {/* Right Card: Customer Behavior 3-Stage Radial Funnel */}
        <div className="lg:col-span-3 bg-white border border-slate-200/90 rounded-lg p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-700">Customer behavior</span>
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">10 min</span>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center text-center py-2">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-slate-200/80 border border-slate-300 flex items-center justify-center mb-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
              </div>
              <div className="text-sm font-mono-tabular font-semibold text-slate-900">
                {metrics.activeCarts}
              </div>
              <div className="text-[10px] text-slate-500">Product views</div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-slate-200/70 border border-slate-300 flex items-center justify-center mb-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
              </div>
              <div className="text-sm font-mono-tabular font-semibold text-slate-900">
                {metrics.checkingOut}
              </div>
              <div className="text-[10px] text-slate-500">Checking out</div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-teal-100 border border-teal-300 flex items-center justify-center mb-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-600" />
              </div>
              <div className="text-sm font-mono-tabular font-semibold text-slate-900">
                {metrics.purchasedRecent}
              </div>
              <div className="text-[10px] text-slate-500">Purchased</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-3 flex flex-wrap items-center justify-between text-[10px] text-slate-400">
        <span>Click any globe marker or country polygon for live telemetry</span>
        <span>
          {visitorCountries.length} active market(s):{' '}
          {visitorCountries
            .slice(0, 5)
            .map((v) => `${v.country} (${v.active_count})`)
            .join(' · ') || 'Awaiting live sessions'}
        </span>
      </div>
    </div>
  );
};
