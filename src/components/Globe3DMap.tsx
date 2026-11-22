import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Globe, Minus, Plus, RotateCcw, Users } from 'lucide-react';
import type { CountryMetric, VisitorSessionMetric } from '../types.ts';

interface Globe3DMapProps {
  countries: CountryMetric[];
  visitors?: VisitorSessionMetric[];
  activeVisitorsCount?: number;
}

type GlobeTrafficMode = 'all' | 'visitors' | 'orders';

const DEFAULT_MARKETS: CountryMetric[] = [
  { country: 'Italy', region_code: 'it', lat: 45.67, lng: 12.24, orders: 0, revenue_usd_equiv: 0, units_sold: 0, hub_label: 'Treviso Atelier HQ' },
  { country: 'Norway', region_code: 'no', lat: 59.91, lng: 10.75, orders: 0, revenue_usd_equiv: 0, units_sold: 0, hub_label: 'Oslo Showroom Hub' },
  { country: 'Việt Nam', region_code: 'vn', lat: 10.78, lng: 106.7, orders: 0, revenue_usd_equiv: 0, units_sold: 0, hub_label: 'Ho Chi Minh City Hub' },
  { country: 'United States & Global', region_code: 'en', lat: 40.71, lng: -74.0, orders: 0, revenue_usd_equiv: 0, units_sold: 0, hub_label: 'Treviso -> Global Air' },
];

const FLAG_MAP: Record<string, string> = {
  it: 'IT',
  no: 'NO',
  vn: 'VN',
  en: 'US / INT',
};

const CONTINENT_POLYGONS: Array<{ points: Array<[number, number]> }> = [
  // North America
  {
    points: [
      [-168, 66], [-152, 71], [-128, 70], [-95, 68], [-82, 62], [-64, 60], [-55, 51],
      [-67, 45], [-74, 41], [-80, 32], [-81, 25], [-88, 21], [-97, 25], [-104, 20],
      [-92, 15], [-83, 9], [-78, 8], [-85, 11], [-96, 16], [-110, 24], [-117, 32],
      [-124, 41], [-125, 49], [-136, 58], [-156, 58], [-166, 61],
    ],
  },
  // Greenland
  {
    points: [
      [-55, 76], [-32, 82], [-18, 77], [-24, 69], [-43, 60], [-52, 66],
    ],
  },
  // South America
  {
    points: [
      [-78, 10], [-70, 12], [-61, 10], [-50, 1], [-35, -6], [-38, -14], [-41, -22],
      [-53, -33], [-64, -41], [-68, -54], [-74, -52], [-73, -38], [-71, -20], [-81, -5],
    ],
  },
  // Europe + Scandinavia + Italy peninsula
  {
    points: [
      [-10, 36], [-9, 43], [-2, 43], [-5, 48], [2, 51], [8, 54], [6, 59], [5, 62],
      [15, 69], [28, 71], [32, 69], [24, 64], [21, 60], [18, 59], [13, 56], [11, 58],
      [19, 54], [28, 60], [45, 66], [60, 68], [62, 54], [48, 46], [40, 44], [30, 42],
      [24, 38], [22, 36], [19, 41], [18, 40], [16, 38], [13, 41], [10, 44], [7, 44],
      [3, 42], [-5, 36],
    ],
  },
  // UK & Ireland
  { points: [[-6, 50], [-5, 58], [1, 57], [2, 52], [-2, 50]] },
  // Africa
  {
    points: [
      [-17, 15], [-13, 28], [-6, 36], [10, 37], [15, 32], [32, 31], [38, 22], [43, 12],
      [51, 12], [44, 2], [40, -10], [35, -24], [28, -33], [18, -35], [15, -22],
      [12, -12], [9, 4], [2, 6], [-8, 5], [-16, 12],
    ],
  },
  // Madagascar
  { points: [[44, -25], [47, -14], [50, -16], [47, -25]] },
  // Asia + Arabian Peninsula + India + Southeast Asia + Vietnam
  {
    points: [
      [34, 36], [42, 42], [52, 40], [60, 54], [72, 68], [105, 75], [140, 72], [175, 66],
      [162, 55], [142, 52], [135, 43], [128, 36], [122, 40], [120, 32], [115, 22],
      [108, 21], [109, 13], [105, 8.6], [101, 13], [103, 2], [98, 7], [96, 16],
      [90, 22], [81, 15], [77, 8], [72, 20], [66, 25], [56, 26], [51, 24],
      [59, 22], [54, 16], [44, 13], [39, 21], [35, 30],
    ],
  },
  // Japan
  { points: [[130, 32], [137, 36], [141, 41], [145, 44], [141, 45], [136, 37], [130, 34]] },
  // Indonesia / Borneo
  { points: [[109, 1], [117, 5], [118, -3], [111, -3]] },
  { points: [[95, 5], [106, -6], [114, -8], [105, -5]] },
  // Australia
  {
    points: [
      [114, -22], [122, -17], [131, -12], [136, -12], [142, -11], [145, -16],
      [153, -26], [150, -37], [139, -35], [130, -32], [116, -34], [113, -26],
    ],
  },
  // New Zealand
  { points: [[167, -46], [173, -41], [178, -37], [174, -42]] },
];

function latLngToVec3(lat: number, lng: number, radius: number, out = new THREE.Vector3()): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return out.set(x, y, z);
}

function createLightEarthTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Shopify-style crisp daylight ocean surface
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#EDF2F7');
    grad.addColorStop(0.5, '#E2E8F0');
    grad.addColorStop(1, '#EDF2F7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle longitude & latitude graticule
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.16)';
    ctx.lineWidth = 1;
    for (let lng = -180; lng <= 180; lng += 15) {
      const x = ((lng + 180) / 360) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let lat = -75; lat <= 75; lat += 15) {
      const y = ((90 - lat) / 180) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Equator hairline
    ctx.strokeStyle = 'rgba(20, 43, 78, 0.18)';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    const toPx = (lng: number, lat: number): [number, number] => [
      ((lng + 180) / 360) * w,
      ((90 - lat) / 180) * h,
    ];

    // Crisp slate-tinted white landmasses with clear coastline edges
    for (const poly of CONTINENT_POLYGONS) {
      if (poly.points.length < 3) continue;
      ctx.beginPath();
      poly.points.forEach(([lng, lat], idx) => {
        const [x, y] = toPx(lng, lat);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = '#CBD5E1';
      ctx.fill();
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Strategic hub regional highlights
    const strategicZones: Array<{ lng: number; lat: number; r: number }> = [
      { lng: 12.24, lat: 45.67, r: 16 },
      { lng: 10.75, lat: 59.91, r: 18 },
      { lng: 106.7, lat: 10.78, r: 15 },
      { lng: -74.0, lat: 40.71, r: 18 },
    ];
    for (const z of strategicZones) {
      const [cx, cy] = toPx(z.lng, z.lat);
      const rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, z.r * 2.1);
      rg.addColorStop(0, 'rgba(20, 43, 78, 0.35)');
      rg.addColorStop(1, 'rgba(20, 43, 78, 0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(cx, cy, z.r * 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.max(1, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export const Globe3DMap: React.FC<Globe3DMapProps> = ({
  countries,
  visitors = [],
  activeVisitorsCount = 0,
}) => {
  const markets = countries.length > 0 ? countries : DEFAULT_MARKETS;
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [selectedCode, setSelectedCode] = useState<string>(markets[0]?.region_code || 'it');
  const [trafficMode, setTrafficMode] = useState<GlobeTrafficMode>('all');
  const [webglError, setWebglError] = useState(false);

  const selectedCodeRef = useRef(selectedCode);
  selectedCodeRef.current = selectedCode;
  const trafficModeRef = useRef<GlobeTrafficMode>(trafficMode);
  trafficModeRef.current = trafficMode;
  const onSelectRef = useRef<(code: string) => void>(() => {});
  onSelectRef.current = (code: string) => setSelectedCode(code);

  const flyToRef = useRef<(lat: number, lng: number) => void>(() => {});
  const zoomDeltaRef = useRef<(factor: number) => void>(() => {});
  const resetCamRef = useRef<() => void>(() => {});
  const requestRenderRef = useRef<() => void>(() => {});

  const marketsJson = JSON.stringify(markets);
  const visitorsJson = JSON.stringify(visitors.slice(0, 40));

  useEffect(() => {
    requestRenderRef.current();
  }, [trafficMode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    let isSoftwareGl = false;
    try {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) {
        isSoftwareGl = true;
      } else {
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param) || '');
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      }

      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    const width = Math.max(300, container.clientWidth);
    const height = Math.max(340, container.clientHeight);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = false;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);
    scene.fog = new THREE.FogExp2(0xf1f5f9, 0.038);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 60);
    latLngToVec3(36, 18, 3.65, camera.position);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 2.05;
    controls.maxDistance = 6.2;
    controls.autoRotate = false;
    controls.rotateSpeed = 0.65;
    controls.zoomSpeed = 0.85;

    // Bright daylight studio lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 1.35);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(4.5, 4.5, 5.0);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.7);
    rimLight.position.set(-5.0, -2.0, -4.0);
    scene.add(rimLight);

    const R = 1.18;
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const earthTex = createLightEarthTexture(maxAniso);

    const globeGeo = new THREE.SphereGeometry(R, 64, 48);
    const globeMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.65,
      metalness: 0.05,
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    globeGroup.add(globeMesh);

    const wireGeo = new THREE.SphereGeometry(R * 1.003, 24, 16);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      wireframe: true,
      transparent: true,
      opacity: 0.16,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    globeGroup.add(wireMesh);

    const orbitRingGeo = new THREE.TorusGeometry(R * 1.18, 0.004, 8, 96);
    const orbitRingMat = new THREE.MeshStandardMaterial({
      color: 0x142b4e,
      metalness: 0.35,
      roughness: 0.45,
      transparent: true,
      opacity: 0.25,
    });
    const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat);
    orbitRing.rotation.x = Math.PI / 2 - 0.18;
    globeGroup.add(orbitRing);

    const ordersGroup = new THREE.Group();
    const visitorsGroup = new THREE.Group();
    globeGroup.add(ordersGroup);
    globeGroup.add(visitorsGroup);

    const clickableProxies: THREE.Mesh[] = [];
    const pinRingMaterials: Array<{ code: string; mat: THREE.MeshStandardMaterial }> = [];
    const disposableGeos: THREE.BufferGeometry[] = [globeGeo, wireGeo, orbitRingGeo];
    const disposableMats: THREE.Material[] = [globeMat, wireMat, orbitRingMat];

    const parsedMarkets: CountryMetric[] = JSON.parse(marketsJson);
    const parsedVisitors: VisitorSessionMetric[] = JSON.parse(visitorsJson);
    const trevisoVec = latLngToVec3(45.67, 12.24, R);
    const _up = new THREE.Vector3(0, 1, 0);

    const maxOrders = Math.max(1, ...parsedMarkets.map((m) => m.orders));

    for (const mk of parsedMarkets) {
      const surfacePos = latLngToVec3(mk.lat, mk.lng, R);
      const normalDir = surfacePos.clone().normalize();
      const height = 0.07 + (mk.orders / maxOrders) * 0.18;

      const pinGroup = new THREE.Group();
      pinGroup.position.copy(surfacePos);
      pinGroup.quaternion.setFromUnitVectors(_up, normalDir);

      const baseGeo = new THREE.CylinderGeometry(0.036, 0.044, 0.012, 20);
      const baseMat = new THREE.MeshStandardMaterial({
        color: mk.region_code === 'it' ? 0x142b4e : 0x059669,
        metalness: 0.4,
        roughness: 0.35,
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0.004;
      pinGroup.add(baseMesh);

      const colGeo = new THREE.CylinderGeometry(0.011, 0.016, height, 14);
      const colMat = new THREE.MeshStandardMaterial({
        color: mk.orders > 0 ? 0x142b4e : 0x64748b,
        metalness: 0.3,
        roughness: 0.4,
      });
      const colMesh = new THREE.Mesh(colGeo, colMat);
      colMesh.position.y = height / 2 + 0.008;
      pinGroup.add(colMesh);

      const headGeo = new THREE.SphereGeometry(0.028, 16, 12);
      const headMat = new THREE.MeshStandardMaterial({
        color: mk.region_code === selectedCodeRef.current ? 0x0284c7 : 0x142b4e,
        emissive: mk.region_code === selectedCodeRef.current ? 0x0369a1 : 0x0f172a,
        emissiveIntensity: 0.25,
        metalness: 0.35,
        roughness: 0.25,
      });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.position.y = height + 0.022;
      pinGroup.add(headMesh);
      pinRingMaterials.push({ code: mk.region_code, mat: headMat });

      const proxyGeo = new THREE.SphereGeometry(0.11, 10, 8);
      const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
      const proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);
      proxyMesh.position.y = height * 0.6 + 0.02;
      proxyMesh.layers.set(1);
      proxyMesh.userData.regionCode = mk.region_code;
      pinGroup.add(proxyMesh);
      clickableProxies.push(proxyMesh);

      disposableGeos.push(baseGeo, colGeo, headGeo, proxyGeo);
      disposableMats.push(baseMat, colMat, headMat, proxyMat);
      ordersGroup.add(pinGroup);

      if (mk.region_code !== 'it') {
        const endVec = surfacePos.clone();
        const midVec = trevisoVec.clone().add(endVec).multiplyScalar(0.5);
        const arcLift = R + Math.min(0.62, trevisoVec.distanceTo(endVec) * 0.35);
        midVec.normalize().multiplyScalar(arcLift);

        const curve = new THREE.QuadraticBezierCurve3(trevisoVec, midVec, endVec);
        const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.0055, 8, false);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          metalness: 0.25,
          roughness: 0.35,
          transparent: true,
          opacity: 0.55,
        });
        const arcMesh = new THREE.Mesh(tubeGeo, tubeMat);
        disposableGeos.push(tubeGeo);
        disposableMats.push(tubeMat);
        ordersGroup.add(arcMesh);
      }
    }

    // Live visitor beacons (Shopify Live View style sky-blue & emerald pins)
    for (const v of parsedVisitors) {
      const pos = latLngToVec3(v.lat, v.lng, R);
      const normalDir = pos.clone().normalize();
      const vGroup = new THREE.Group();
      vGroup.position.copy(pos);
      vGroup.quaternion.setFromUnitVectors(_up, normalDir);

      const haloGeo = new THREE.RingGeometry(0.022, 0.036, 20);
      haloGeo.rotateX(-Math.PI / 2);
      const haloMat = new THREE.MeshBasicMaterial({
        color: v.is_active ? 0x0ea5e9 : 0x64748b,
        transparent: true,
        opacity: v.is_active ? 0.65 : 0.35,
        side: THREE.DoubleSide,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.position.y = 0.004;
      vGroup.add(haloMesh);

      const dotGeo = new THREE.SphereGeometry(v.is_active ? 0.022 : 0.015, 12, 10);
      const dotMat = new THREE.MeshStandardMaterial({
        color: v.is_active ? 0x0284c7 : 0x475569,
        emissive: v.is_active ? 0x0369a1 : 0x1e293b,
        emissiveIntensity: v.is_active ? 0.45 : 0.1,
        roughness: 0.25,
      });
      const dotMesh = new THREE.Mesh(dotGeo, dotMat);
      dotMesh.position.y = 0.024;
      vGroup.add(dotMesh);

      disposableGeos.push(haloGeo, dotGeo);
      disposableMats.push(haloMat, dotMat);
      visitorsGroup.add(vGroup);
    }

    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    let flyTargetPos: THREE.Vector3 | null = null;
    let lastTime = performance.now();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) {
          gl.deleteSync(sync);
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        const now = performance.now();
        const delta = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;

        const mode = trafficModeRef.current;
        ordersGroup.visible = mode === 'all' || mode === 'orders';
        visitorsGroup.visible = mode === 'all' || mode === 'visitors';

        if (flyTargetPos) {
          camera.position.x = THREE.MathUtils.damp(camera.position.x, flyTargetPos.x, 7, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, flyTargetPos.y, 7, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, flyTargetPos.z, 7, delta);
          if (camera.position.distanceTo(flyTargetPos) < 0.03) {
            camera.position.copy(flyTargetPos);
            flyTargetPos = null;
          } else {
            renderDirty = true;
          }
        }

        for (const pm of pinRingMaterials) {
          const isSel = pm.code === selectedCodeRef.current;
          pm.mat.color.setHex(isSel ? 0x0284c7 : 0x142b4e);
          pm.mat.emissive.setHex(isSel ? 0x0369a1 : 0x0f172a);
        }

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty && !disposed) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };

    requestRenderRef.current = requestRender;

    controls.addEventListener('start', () => {
      flyTargetPos = null;
    });
    controls.addEventListener('change', requestRender);

    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();
    let downPos = { x: 0, y: 0 };

    const onPointerDown = (ev: PointerEvent) => {
      downPos = { x: ev.clientX, y: ev.clientY };
    };
    const onPointerUp = (ev: PointerEvent) => {
      const distMoved = Math.hypot(ev.clientX - downPos.x, ev.clientY - downPos.y);
      if (distMoved > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableProxies, false);
      if (hits.length > 0) {
        const code = String(hits[0].object.userData.regionCode || '');
        if (code) {
          onSelectRef.current(code);
          const mk = parsedMarkets.find((m) => m.region_code === code);
          if (mk) {
            const dist = camera.position.length();
            flyTargetPos = latLngToVec3(mk.lat, mk.lng, dist);
          }
          requestRender();
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    flyToRef.current = (lat: number, lng: number) => {
      const dist = Math.max(2.6, Math.min(4.4, camera.position.length()));
      flyTargetPos = latLngToVec3(lat, lng, dist);
      requestRender();
    };
    zoomDeltaRef.current = (factor: number) => {
      flyTargetPos = null;
      const nextDist = THREE.MathUtils.clamp(camera.position.length() * factor, 2.05, 6.2);
      camera.position.normalize().multiplyScalar(nextDist);
      requestRender();
    };
    resetCamRef.current = () => {
      flyTargetPos = latLngToVec3(36, 18, 3.65);
      requestRender();
    };

    const onResize = () => {
      if (!container || disposed) return;
      const w = Math.max(300, container.clientWidth);
      const h = Math.max(340, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', onResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      earthTex.dispose();
      disposableGeos.forEach((g) => g.dispose());
      disposableMats.forEach((m) => m.dispose());
      scene.environment?.dispose();
      renderer.dispose();
    };
  }, [marketsJson, visitorsJson]);

  const activeMarket =
    markets.find((m) => m.region_code === selectedCode) || markets[0] || DEFAULT_MARKETS[0];

  const handleSelectHub = (mk: CountryMetric) => {
    setSelectedCode(mk.region_code);
    flyToRef.current(mk.lat, mk.lng);
  };

  return (
    <div className="border border-neutral-200 bg-[#F1F5F9] text-[#1A1A1A] overflow-hidden">
      {/* Light Shopify-Style Top HUD Bar */}
      <div className="px-4 py-2.5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2 bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="w-4 h-4 text-[#0284C7] shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#142B4E] truncate">
            Live Visitors & Commerce Map
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-mono-tabular">
            <Users className="w-3 h-3" />
            <span>{activeVisitorsCount} live</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <div className="inline-flex border border-neutral-200 bg-[#F8FAFC] p-0.5 text-[11px]">
            {(
              [
                { id: 'all', label: 'All Traffic' },
                { id: 'visitors', label: 'Live Visitors' },
                { id: 'orders', label: 'Orders' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTrafficMode(opt.id)}
                className={`px-2 py-1 cursor-pointer transition-colors ${
                  trafficMode === opt.id
                    ? 'bg-[#142B4E] text-white font-medium'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => zoomDeltaRef.current(0.84)}
            aria-label="Zoom in 3D globe"
            className="p-1.5 bg-white hover:bg-neutral-100 text-[#142B4E] border border-neutral-200 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => zoomDeltaRef.current(1.18)}
            aria-label="Zoom out 3D globe"
            className="p-1.5 bg-white hover:bg-neutral-100 text-[#142B4E] border border-neutral-200 cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => resetCamRef.current()}
            aria-label="Reset 3D globe view"
            className="px-2.5 py-1.5 bg-white hover:bg-neutral-100 text-[#142B4E] border border-neutral-200 text-[11px] uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Light 3D Canvas Viewport */}
      <div className="relative w-full h-[360px] bg-[#F1F5F9]">
        {webglError ? (
          <div className="h-full flex items-center justify-center p-6 text-center text-xs text-neutral-600">
            WebGL 3D context unavailable in this browser session. Regional metrics remain visible below.
          </div>
        ) : (
          <div
            ref={mountRef}
            data-testid="globe-3d-canvas"
            className="w-full h-full cursor-grab active:cursor-grabbing"
          />
        )}
      </div>

      {/* Bottom Consolidated Market & Live Visitor Dock */}
      <div className="border-t border-neutral-200 bg-white p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-[#142B4E] font-semibold uppercase tracking-wider">
              {activeMarket.country}
            </span>
            <span className="mx-2 text-neutral-400">·</span>
            <span className="text-neutral-600">{activeMarket.hub_label}</span>
          </div>
          <div className="font-mono-tabular flex items-center gap-4 text-[11px] text-neutral-600">
            <span>
              Orders: <strong className="text-[#142B4E]">{activeMarket.orders}</strong>
            </span>
            <span>
              Units: <strong className="text-[#142B4E]">{activeMarket.units_sold}</strong>
            </span>
            <span>
              USD Equiv:{' '}
              <strong className="text-[#059669]">
                ${activeMarket.revenue_usd_equiv.toLocaleString('en-US')}
              </strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {markets.map((mk) => {
            const active = mk.region_code === activeMarket.region_code;
            return (
              <button
                key={mk.region_code}
                type="button"
                onClick={() => handleSelectHub(mk)}
                className={`p-2 text-left border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#142B4E] border-[#142B4E] text-white'
                    : 'bg-[#F8FAFC] border-neutral-200 text-[#1A1A1A] hover:bg-neutral-100'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span>{FLAG_MAP[mk.region_code] || mk.region_code.toUpperCase()}</span>
                  <span className={`font-mono-tabular ${active ? 'text-sky-300' : 'text-[#059669]'}`}>
                    {mk.orders} ord
                  </span>
                </div>
                <div className={`text-[11px] font-mono-tabular mt-0.5 ${active ? 'text-slate-200' : 'text-neutral-600'}`}>
                  ${mk.revenue_usd_equiv.toLocaleString('en-US')} eq.
                </div>
              </button>
            );
          })}
        </div>

        {visitors.length > 0 && (
          <div className="pt-2 border-t border-neutral-200 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="uppercase tracking-wider text-neutral-500 font-semibold mr-1">
              Recent Visitors:
            </span>
            {visitors.slice(0, 6).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => flyToRef.current(v.lat, v.lng)}
                className="px-2 py-0.5 bg-[#F8FAFC] hover:bg-sky-50 border border-neutral-200 text-neutral-700 inline-flex items-center gap-1 cursor-pointer"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    v.is_active ? 'bg-[#0284C7]' : 'bg-neutral-400'
                  }`}
                />
                <span>
                  {v.city}, {v.country}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
