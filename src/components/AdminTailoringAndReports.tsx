import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Check,
  GripVertical,
  Image as ImageIcon,
  Mail,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Ruler,
  Scissors,
  Star,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import type {
  AdminReportData,
  OrderRecord,
  RegionCode,
  TailoringOptionRecord,
  TailoringOptionType,
  TailoringSizeSpec,
  TailoringZoneKey,
} from '../types.ts';
import { formatRegionalPrice } from '../utils/commerce.ts';
import { Globe3DMap } from './Globe3DMap.tsx';

const FITS: Array<TailoringSizeSpec['fit']> = ['Regular Fit', 'Slim Fit', 'Contemporary Fit'];
const SIZES = [
  '30 / 3XS',
  '34 / 2XS',
  '37 / XS',
  '38 / S',
  '39 / M',
  '40 / M',
  '41 / L',
  '42 / L',
  '43 / XL',
  '44 / XXL',
  '45 / 3XL',
];

const ZONE_META: Array<{
  zone: TailoringZoneKey;
  label: string;
  cmField: keyof TailoringSizeSpec;
  sketchField: keyof TailoringSizeSpec;
}> = [
  { zone: 'shirt_length', label: 'Shirt Length', cmField: 'shirt_length_cm', sketchField: 'sketch_shirt_length' },
  { zone: 'sleeve_length', label: 'Sleeve Length', cmField: 'sleeve_length_cm', sketchField: 'sketch_sleeve_length' },
  { zone: 'waist', label: 'Waist', cmField: 'waist_cm', sketchField: 'sketch_waist' },
  { zone: 'chest', label: 'Chest', cmField: 'chest_cm', sketchField: 'sketch_chest' },
  { zone: 'bottom_hem', label: 'Bottom Hem', cmField: 'bottom_hem_cm', sketchField: 'sketch_bottom_hem' },
  { zone: 'shoulder', label: 'Shoulder', cmField: 'shoulder_cm', sketchField: 'sketch_shoulder' },
];

export const TailoringMatrixPanel: React.FC<{
  authToken: string;
  specs: TailoringSizeSpec[];
  onRefresh: () => void;
  onOpenMediaPicker: (onPicked: (url: string) => void) => void;
}> = ({ authToken, specs, onRefresh, onOpenMediaPicker }) => {
  const [selectedFits, setSelectedFits] = useState<string[]>(['Regular Fit']);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['34 / 2XS', '40 / M']);
  const [cmInputs, setCmInputs] = useState<Record<string, string>>({
    shirt_length_cm: '',
    sleeve_length_cm: '',
    waist_cm: '',
    chest_cm: '',
    bottom_hem_cm: '',
    shoulder_cm: '',
  });
  const [sketchInputs, setSketchInputs] = useState<Record<string, string>>({
    sketch_shirt_length: '',
    sketch_sleeve_length: '',
    sketch_waist: '',
    sketch_chest: '',
    sketch_bottom_hem: '',
    sketch_shoulder: '',
  });
  const [filterFit, setFilterFit] = useState<string>('Regular Fit');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const toggle = (list: string[], val: string, setter: (v: string[]) => void) => {
    setter(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  };

  const handleBulkAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFits.length === 0 || selectedSizes.length === 0) {
      setFeedback('Select at least one Fit and one Size.');
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const measurements: Record<string, number> = {};
      for (const [k, v] of Object.entries(cmInputs)) {
        if (v.trim() !== '' && Number.isFinite(Number(v))) {
          measurements[k] = Number(v);
        }
      }
      const sketches: Record<string, string> = {};
      for (const [k, v] of Object.entries(sketchInputs)) {
        if (v.trim() !== '') {
          sketches[k] = v.trim();
        }
      }

      const res = await fetch('/api/admin/tailoring-specs/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          fits: selectedFits,
          sizes: selectedSizes,
          measurements,
          sketches,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || 'Bulk update failed.');
        return;
      }
      setFeedback(`Bulk-assigned tailoring measurements & sketches to ${data.updated} Fit × Size pattern rows.`);
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const filteredSpecs = useMemo(
    () => specs.filter((s) => filterFit === 'all' || s.fit === filterFit),
    [specs, filterFit]
  );

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-3">
        <h1 className="text-base font-semibold uppercase tracking-wide flex items-center gap-2">
          <Ruler className="w-4 h-4 text-[#142B4E]" />
          <span>Skreddersøm / Tailoring Size Matrix & Bulk Sketch Assigner</span>
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Configure base pattern cm (Shirt length, Sleeve length, Waist, Chest, Bottom hem, Shoulder) AND bulk-assign measurement sketches from the Media Library across collar sizes (30, 34, 40, 45).
        </p>
      </div>

      <form
        onSubmit={handleBulkAssign}
        className="border border-neutral-200 bg-[#FAFAFA] p-5 space-y-4 text-xs"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="font-semibold uppercase tracking-wider text-neutral-600 mb-2">
              1. Target Fits
            </div>
            <div className="flex flex-wrap gap-2">
              {FITS.map((fit) => {
                const active = selectedFits.includes(fit);
                return (
                  <button
                    key={fit}
                    type="button"
                    onClick={() => toggle(selectedFits, fit, setSelectedFits)}
                    className={`px-3 py-1.5 border cursor-pointer ${
                      active
                        ? 'bg-[#142B4E] text-white border-[#142B4E]'
                        : 'bg-white text-neutral-700 border-neutral-300'
                    }`}
                  >
                    {fit}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold uppercase tracking-wider text-neutral-600">
                2. Collar Sizes ({selectedSizes.length} selected)
              </span>
              <button
                type="button"
                onClick={() => setSelectedSizes([...SIZES])}
                className="text-[#142B4E] hover:underline cursor-pointer"
              >
                Select All Sizes
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SIZES.map((sz) => {
                const active = selectedSizes.includes(sz);
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => toggle(selectedSizes, sz, setSelectedSizes)}
                    className={`px-2.5 py-1 border font-mono-tabular text-[11px] cursor-pointer ${
                      active
                        ? 'bg-[#142B4E] text-white border-[#142B4E]'
                        : 'bg-white text-neutral-700 border-neutral-300'
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 6 Zone CM Inputs + Sketch Image Media Library Picker */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-black/10">
          {ZONE_META.map((zm) => {
            const cmVal = cmInputs[zm.cmField] || '';
            const sketchUrl = sketchInputs[zm.sketchField] || '';
            return (
              <div key={zm.zone} className="border border-neutral-200 bg-white p-3 space-y-2">
                <div className="font-semibold text-[#142B4E] uppercase">{zm.label}</div>
                <div>
                  <label className="block text-[10px] text-neutral-500 mb-0.5">
                    Pattern Base (cm) — leave blank to keep
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={cmVal}
                    onChange={(e) =>
                      setCmInputs((prev) => ({ ...prev, [zm.cmField]: e.target.value }))
                    }
                    placeholder="e.g. 98"
                    className="w-full px-2.5 py-1 border border-neutral-300 font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-neutral-500 mb-0.5">
                    Sketch Image URL (Optional)
                  </label>
                  <div className="flex gap-1.5 items-center">
                    {sketchUrl && (
                      <img
                        src={sketchUrl}
                        alt=""
                        className="w-7 h-7 object-cover border border-black/10 shrink-0"
                      />
                    )}
                    <input
                      type="text"
                      value={sketchUrl}
                      onChange={(e) =>
                        setSketchInputs((prev) => ({
                          ...prev,
                          [zm.sketchField]: e.target.value,
                        }))
                      }
                      placeholder="/src/assets/... or /uploads/..."
                      className="flex-1 min-w-0 px-2 py-1 border border-neutral-300 font-mono-tabular text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onOpenMediaPicker((pickedUrl) =>
                          setSketchInputs((prev) => ({
                            ...prev,
                            [zm.sketchField]: pickedUrl,
                          }))
                        )
                      }
                      aria-label={`Choose ${zm.label} sketch from Media Library`}
                      className="px-2 py-1 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E] hover:text-white inline-flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <ImageIcon className="w-3 h-3" />
                      <span>Pick</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {feedback ? (
            <span className="text-[#4F8A47] font-medium">{feedback}</span>
          ) : (
            <span className="text-neutral-500">
              Updates will immediately drive the live PDP Skreddersøm drawer for selected Fit + Size combinations.
            </span>
          )}
          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2 bg-[#142B4E] hover:bg-[#0f213d] text-white uppercase tracking-wider font-medium cursor-pointer"
          >
            {busy ? 'Assigning...' : 'Bulk Assign Measurements & Sketches'}
          </button>
        </div>
      </form>

      {/* Matrix Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-neutral-600">
            Active Pattern Size Specifications ({filteredSpecs.length})
          </span>
          <select
            value={filterFit}
            onChange={(e) => setFilterFit(e.target.value)}
            className="px-3 py-1.5 border border-neutral-300 bg-white"
          >
            <option value="all">All Fits</option>
            {FITS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="border border-neutral-200 bg-white overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F7F7F7] border-b border-neutral-200 text-neutral-600 uppercase text-[11px] sticky top-0">
              <tr>
                <th className="p-3">Fit · Size</th>
                <th className="p-3">Length</th>
                <th className="p-3">Sleeve</th>
                <th className="p-3">Waist</th>
                <th className="p-3">Chest</th>
                <th className="p-3">Bottom Hem</th>
                <th className="p-3">Shoulder</th>
                <th className="p-3">Assigned Sketches</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredSpecs.map((sp) => {
                const customSketchCount = [
                  sp.sketch_shirt_length,
                  sp.sketch_sleeve_length,
                  sp.sketch_waist,
                  sp.sketch_chest,
                  sp.sketch_bottom_hem,
                  sp.sketch_shoulder,
                ].filter((u) => Boolean(u && u.trim())).length;
                return (
                  <tr key={`${sp.fit}-${sp.size_label}`} className="hover:bg-neutral-50">
                    <td className="p-3 font-medium">
                      {sp.fit} · <span className="font-mono-tabular">{sp.size_label}</span>
                    </td>
                    <td className="p-3 font-mono-tabular">{sp.shirt_length_cm} cm</td>
                    <td className="p-3 font-mono-tabular">{sp.sleeve_length_cm} cm</td>
                    <td className="p-3 font-mono-tabular">{sp.waist_cm} cm</td>
                    <td className="p-3 font-mono-tabular">{sp.chest_cm} cm</td>
                    <td className="p-3 font-mono-tabular">{sp.bottom_hem_cm} cm</td>
                    <td className="p-3 font-mono-tabular">{sp.shoulder_cm} cm</td>
                    <td className="p-3">
                      {customSketchCount > 0 ? (
                        <span className="px-2 py-0.5 bg-[#4F8A47]/15 text-[#4F8A47] font-mono-tabular text-[11px]">
                          {customSketchCount}/6 custom
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-[11px]">Vector pattern</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const OrderDetailModal: React.FC<{
  order: OrderRecord;
  authToken: string;
  onClose: () => void;
  onUpdated: () => void;
}> = ({ order, authToken, onClose, onUpdated }) => {
  const [orderStatus, setOrderStatus] = useState(order.order_status);
  const [paymentStatus, setPaymentStatus] = useState(order.payment_status);
  const [notes, setNotes] = useState(order.notes || '');
  const [restockOnCancel, setRestockOnCancel] = useState(true);
  const [busy, setBusy] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null);

  const handleSave = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          order_status: orderStatus,
          payment_status: paymentStatus,
          notes,
          restock: orderStatus === 'cancelled' && restockOnCancel,
        }),
      });
      if (res.ok) {
        onUpdated();
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDhl = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/dhl-dispatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        onUpdated();
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleResendEmail = async (
    templateType: 'order_confirmation' | 'shipping_tracking' | 'review_request'
  ) => {
    setBusy(true);
    setEmailFeedback(null);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/resend-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ templateType }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailFeedback(
          `Localized ${templateType.replace('_', ' ')} (${order.region_code.toUpperCase()}) dispatched: ${data.emailLog?.status || 'ok'}.`
        );
      } else {
        setEmailFeedback(data.error || 'Could not dispatch email.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-white border border-black/15 shadow-2xl p-6 max-h-[90vh] overflow-y-auto space-y-5 text-xs">
        <div className="flex items-center justify-between border-b border-black/10 pb-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider font-mono-tabular">
              Order {order.order_number}
            </h2>
            <p className="text-[11px] text-neutral-500">
              {order.region_code.toUpperCase()} ({order.currency_code}) · Placed {order.created_at}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close order drawer"
            className="p-1 text-neutral-500 hover:text-black cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAFAFA] border border-neutral-200 p-4">
          <div>
            <div className="uppercase text-[10px] tracking-wider text-neutral-500 mb-1">
              Customer & Shipping
            </div>
            <div className="font-semibold text-[#1A1A1A]">{order.customer_name}</div>
            <div>{order.customer_email} · {order.customer_phone}</div>
            <div className="text-neutral-600 mt-1">
              {order.shipping_address}, {order.shipping_postal_code} {order.shipping_city}, {order.shipping_country}
            </div>
            {!order.billing_same_as_shipping && order.billing_address ? (
              <div className="mt-2 pt-2 border-t border-neutral-200 text-[11px] text-neutral-700">
                <span className="uppercase text-[10px] tracking-wider text-neutral-500 block">
                  Billing Address
                </span>
                <strong>{order.billing_name || order.customer_name}</strong> · {order.billing_address},{' '}
                {order.billing_postal_code} {order.billing_city}, {order.billing_country}
              </div>
            ) : (
              <div className="mt-1 text-[11px] text-neutral-500">Billing: Same as shipping address</div>
            )}
            {order.is_b2b && (
              <div className="mt-1 text-[#142B4E] font-medium">
                B2B: {order.company_name} (Org/VAT {order.org_number})
              </div>
            )}
          </div>

          <div>
            <div className="uppercase text-[10px] tracking-wider text-neutral-500 mb-1">
              Payment & DHL Settlement
            </div>
            <div>Method: <strong className="uppercase">{order.payment_method.replace('_', ' ')}</strong></div>
            <div className="font-mono-tabular">Reference: {order.payment_reference}</div>
            <div className="mt-1 font-mono-tabular">
              Total: <strong>{formatRegionalPrice(order.total, order.region_code)}</strong>{' '}
              (Shipping {formatRegionalPrice(order.shipping_cost, order.region_code)})
            </div>
            {order.dhl_tracking_number && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#FFCC00]/50 font-mono-tabular font-semibold">
                <Truck className="w-3.5 h-3.5" />
                <span>{order.dhl_tracking_number}</span>
              </div>
            )}
          </div>
        </div>

        {/* Itemized Shirts & Tailor Work Ticket */}
        <div className="space-y-2">
          <div className="font-semibold uppercase tracking-wider text-neutral-600">
            Tailor Atelier Work Ticket ({order.items.length} item line(s))
          </div>
          <div className="divide-y divide-neutral-200 border border-neutral-200">
            {order.items.map((item, idx) => (
              <div key={idx} className="p-3 flex gap-3 items-start bg-white">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-14 h-16 object-cover bg-[#E6E6E6] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold uppercase">{item.title}</span>
                    <span className="font-mono-tabular font-semibold">
                      {item.quantity} × {formatRegionalPrice(item.unitPrice, order.region_code)}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-600 mt-0.5 font-mono-tabular">
                    SKU {item.sku} · {item.tailoring.fit} · {item.tailoring.size} · Collar: {item.tailoring.collar} · Cuff: {item.tailoring.cuff}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] font-mono-tabular">
                    <span className="px-2 py-0.5 bg-neutral-100">
                      Len: {item.tailoring.lengthAdjustmentCm >= 0 ? `+${item.tailoring.lengthAdjustmentCm}` : item.tailoring.lengthAdjustmentCm}cm
                    </span>
                    <span className="px-2 py-0.5 bg-neutral-100">
                      Slv: {item.tailoring.sleeveAdjustmentCm >= 0 ? `+${item.tailoring.sleeveAdjustmentCm}` : item.tailoring.sleeveAdjustmentCm}cm
                    </span>
                    {(item.tailoring.waistAdjustmentCm || 0) !== 0 && (
                      <span className="px-2 py-0.5 bg-[#142B4E]/10 text-[#142B4E]">
                        Waist: {item.tailoring.waistAdjustmentCm! > 0 ? `+${item.tailoring.waistAdjustmentCm}` : item.tailoring.waistAdjustmentCm}cm
                      </span>
                    )}
                    {(item.tailoring.chestAdjustmentCm || 0) !== 0 && (
                      <span className="px-2 py-0.5 bg-[#142B4E]/10 text-[#142B4E]">
                        Chest: {item.tailoring.chestAdjustmentCm! > 0 ? `+${item.tailoring.chestAdjustmentCm}` : item.tailoring.chestAdjustmentCm}cm
                      </span>
                    )}
                    {(item.tailoring.bottomHemAdjustmentCm || 0) !== 0 && (
                      <span className="px-2 py-0.5 bg-[#142B4E]/10 text-[#142B4E]">
                        Hem: {item.tailoring.bottomHemAdjustmentCm! > 0 ? `+${item.tailoring.bottomHemAdjustmentCm}` : item.tailoring.bottomHemAdjustmentCm}cm
                      </span>
                    )}
                    {(item.tailoring.shoulderAdjustmentCm || 0) !== 0 && (
                      <span className="px-2 py-0.5 bg-[#142B4E]/10 text-[#142B4E]">
                        Shoulder: {item.tailoring.shoulderAdjustmentCm! > 0 ? `+${item.tailoring.shoulderAdjustmentCm}` : item.tailoring.shoulderAdjustmentCm}cm
                      </span>
                    )}
                    {item.tailoring.monogram && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900">
                        Monogram: {item.tailoring.monogram}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status, Payment & Auto-Restock Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-black/10">
          <div>
            <label className="block text-[11px] text-neutral-600 mb-1">Order Fulfillment Status</label>
            <select
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value as OrderRecord['order_status'])}
              className="w-full px-3 py-2 border border-neutral-300 bg-white uppercase font-semibold"
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing / Atelier</option>
              <option value="shipped">Shipped (DHL)</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-neutral-600 mb-1">Customer Payment Capture Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as OrderRecord['payment_status'])}
              className="w-full px-3 py-2 border border-neutral-300 bg-white uppercase font-semibold"
            >
              <option value="pending">Pending</option>
              <option value="awaiting_transfer">Awaiting Bank Transfer</option>
              <option value="paid">Paid / Captured</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {orderStatus === 'cancelled' && order.order_status !== 'cancelled' && (
          <label className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-900 cursor-pointer">
            <input
              type="checkbox"
              checked={restockOnCancel}
              onChange={(e) => setRestockOnCancel(e.target.checked)}
              className="accent-[#142B4E]"
            />
            <RotateCcw className="w-3.5 h-3.5" />
            <span>
              Automatically restore ordered units back into regional warehouse stock & variant counts
            </span>
          </label>
        )}

        <div>
          <label className="block text-[11px] text-neutral-600 mb-1">Internal Staff Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 bg-white"
            placeholder="Tailoring instructions, transfer verification reference..."
          />
        </div>

        {emailFeedback && (
          <div className="p-2.5 bg-[#F6F9F6] border border-[#4F8A47]/40 text-[#2D5728]">
            {emailFeedback}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-black/10">
          <div className="flex flex-wrap items-center gap-2">
            {!order.dhl_tracking_number && (
              <button
                type="button"
                disabled={busy}
                onClick={handleDhl}
                className="px-4 py-2 bg-[#FFCC00] hover:bg-[#f0c000] text-[#D40511] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Package className="w-3.5 h-3.5" />
                <span>Dispatch DHL Waybill</span>
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => handleResendEmail('order_confirmation')}
              className="px-3 py-2 border border-neutral-300 bg-white hover:bg-neutral-50 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-[#142B4E]" />
              <span>Send Order Email</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleResendEmail('shipping_tracking')}
              className="px-3 py-2 border border-neutral-300 bg-white hover:bg-neutral-50 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>Send Tracking Email</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleResendEmail('review_request')}
              className="px-3 py-2 border border-neutral-300 bg-white hover:bg-neutral-50 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <span>Send Review Invite</span>
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutral-300 cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleSave}
              className="px-5 py-2 bg-[#142B4E] hover:bg-[#0f213d] text-white uppercase tracking-wider font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{busy ? 'Saving...' : 'Save Order Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ReportsPanel: React.FC<{
  report: AdminReportData | null;
  onRefresh: () => void;
}> = ({ report, onRefresh }) => {
  if (!report) {
    return (
      <div className="p-8 border border-neutral-200 bg-white text-center text-xs text-neutral-500">
        Loading analytics and financial reporting...
      </div>
    );
  }

  const series = report.dailySeries || [];
  const maxDailyRev = Math.max(1, ...series.map((d) => d.revenue_usd_equiv));
  const categories = report.byCategory || [];
  const maxCatUnits = Math.max(1, ...categories.map((c) => c.units_sold));

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold uppercase tracking-wide flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#142B4E]" />
            <span>Global 3D Commerce Globe, Revenue Charts & Inventory Reporting</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Live SQLite rollup of cross-market order capture, 3D logistics telemetry, daily sales velocity, and regional SKU health.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="px-3 py-1.5 border border-neutral-300 bg-white hover:bg-neutral-50 text-xs cursor-pointer"
        >
          Refresh Metrics
        </button>
      </div>

      {/* Light Shopify-style 3D Globe + Revenue & Category Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7">
          <Globe3DMap
            countries={report.byCountry || []}
            visitors={report.visitorLocations || []}
            activeVisitorsCount={report.activeVisitorsCount || 0}
          />
        </div>

        <div className="xl:col-span-5 flex flex-col gap-5 text-xs">
          {/* Daily Revenue & Orders Velocity Chart */}
          <div className="border border-neutral-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Daily Revenue & Order Velocity (USD Eq.)
              </h2>
              <span className="font-mono-tabular text-[11px] text-neutral-500">
                {series.length} active day(s)
              </span>
            </div>

            {series.length === 0 ? (
              <div className="h-44 flex items-center justify-center bg-[#FAFAFA] border border-dashed border-neutral-200 text-neutral-400">
                No completed orders recorded yet.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="h-44 flex items-end gap-2 px-2 pt-4 pb-1 border-b border-neutral-200 bg-[#FAFAFA]">
                  {series.slice(-12).map((pt) => {
                    const pct = Math.max(8, Math.round((pt.revenue_usd_equiv / maxDailyRev) * 100));
                    return (
                      <div key={pt.date} className="flex-1 min-w-0 flex flex-col items-center gap-1 group">
                        <div className="text-[10px] font-mono-tabular text-neutral-600 truncate">
                          ${pt.revenue_usd_equiv}
                        </div>
                        <div className="w-full flex items-end justify-center h-28">
                          <div
                            title={`${pt.date}: ${pt.orders} orders ($${pt.revenue_usd_equiv})`}
                            style={{ height: `${pct}%` }}
                            className="w-full max-w-[32px] bg-[#142B4E] group-hover:bg-[#4F8A47] transition-colors"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between gap-1 text-[10px] font-mono-tabular text-neutral-500">
                  {series.slice(-12).map((pt) => (
                    <span key={pt.date} className="flex-1 text-center truncate">
                      {pt.date.slice(5)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Category Share Horizontal Bar Breakdown */}
          <div className="border border-neutral-200 bg-white p-5 space-y-3 flex-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Sales Share by Shirt Category
            </h2>
            {categories.length === 0 ? (
              <div className="py-6 text-neutral-400 text-center">No category units sold yet.</div>
            ) : (
              <div className="space-y-3">
                {categories.map((cat) => {
                  const pct = Math.max(6, Math.round((cat.units_sold / maxCatUnits) * 100));
                  return (
                    <div key={cat.category_slug} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="uppercase font-medium text-[#1A1A1A]">{cat.category_slug}</span>
                        <span className="font-mono-tabular text-neutral-600">
                          {cat.units_sold} pcs · ${cat.revenue_usd_equiv.toLocaleString('en-US')}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-neutral-100 overflow-hidden">
                        <div style={{ width: `${pct}%` }} className="h-full bg-[#142B4E]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock Health Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="border border-neutral-200 bg-white p-4">
          <div className="text-[11px] text-neutral-500 uppercase">Active Regional SKUs</div>
          <div className="text-2xl font-mono-tabular font-semibold mt-1">
            {report.stockHealth.total_skus}
          </div>
        </div>
        <div className="border border-neutral-200 bg-white p-4">
          <div className="text-[11px] text-neutral-500 uppercase">Low Stock Alerts (&le;5)</div>
          <div className="text-2xl font-mono-tabular font-semibold mt-1 text-amber-700">
            {report.stockHealth.low_stock_alerts}
          </div>
        </div>
        <div className="border border-neutral-200 bg-white p-4">
          <div className="text-[11px] text-neutral-500 uppercase">Out of Stock</div>
          <div className="text-2xl font-mono-tabular font-semibold mt-1 text-red-600">
            {report.stockHealth.out_of_stock}
          </div>
        </div>
        <div className="border border-neutral-200 bg-white p-4">
          <div className="text-[11px] text-neutral-500 uppercase">Stock Movements Logged</div>
          <div className="text-2xl font-mono-tabular font-semibold mt-1 text-[#142B4E]">
            {report.stockHealth.total_movements}
          </div>
        </div>
      </div>

      {/* Revenue by Storefront Region */}
      <div className="border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Storefront Performance by Currency & Region
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {report.byRegion.map((r) => (
            <div key={r.region_code} className="border border-neutral-200 bg-[#FAFAFA] p-4 space-y-1">
              <div className="flex justify-between font-semibold">
                <span>{r.region_code.toUpperCase()}</span>
                <span className="font-mono-tabular text-neutral-500">{r.currency_code}</span>
              </div>
              <div className="text-lg font-mono-tabular font-semibold text-[#142B4E]">
                {formatRegionalPrice(r.total_revenue, r.region_code as RegionCode)}
              </div>
              <div className="text-[11px] text-[#4F8A47] font-mono-tabular">
                Paid: {formatRegionalPrice(r.paid_revenue, r.region_code as RegionCode)}
              </div>
              <div className="text-[11px] text-neutral-500 font-mono-tabular">
                {r.orders} orders · {r.items_sold} shirts sold
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Mix & Top SKUs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        <div className="border border-neutral-200 bg-white p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Payment Method Breakdown & Order Statuses
          </h2>
          <div className="divide-y divide-neutral-100">
            {report.byPaymentMethod.map((pm) => (
              <div key={pm.payment_method} className="py-2 flex items-center justify-between">
                <span className="uppercase font-medium">{pm.payment_method.replace('_', ' ')}</span>
                <span className="font-mono-tabular text-neutral-600">{pm.count} orders</span>
              </div>
            ))}
            {report.byPaymentMethod.length === 0 && (
              <div className="py-4 text-neutral-400">No payments captured yet.</div>
            )}
          </div>

          <div className="pt-3 border-t border-neutral-100 flex flex-wrap gap-2">
            {report.byStatus.map((st) => (
              <span
                key={st.order_status}
                className="px-2.5 py-1 bg-[#FAFAFA] border border-neutral-200 uppercase text-[11px] font-mono-tabular"
              >
                {st.order_status}: {st.count}
              </span>
            ))}
          </div>
        </div>

        <div className="border border-neutral-200 bg-white p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Top Performing Shirt SKUs
          </h2>
          <div className="divide-y divide-neutral-100">
            {report.topSkus.map((sku) => (
              <div key={sku.sku} className="py-2 flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{sku.title}</div>
                  <div className="text-[11px] font-mono-tabular text-neutral-500">{sku.sku}</div>
                </div>
                <span className="font-mono-tabular font-semibold text-[#142B4E]">
                  {sku.units_sold} pcs
                </span>
              </div>
            ))}
            {report.topSkus.length === 0 && (
              <div className="py-4 text-neutral-400">No SKU sales recorded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const TailoringOptionsPanel: React.FC<{
  authToken: string;
  options: TailoringOptionRecord[];
  onUpdated: (nextOptions?: TailoringOptionRecord[]) => void;
  onOpenMediaPicker: (onPicked: (url: string) => void) => void;
}> = ({ authToken, options, onUpdated, onOpenMediaPicker }) => {
  const [activeType, setActiveType] = useState<TailoringOptionType>('collar');
  const [drafts, setDrafts] = useState<Record<number, TailoringOptionRecord>>({});
  const [dragId, setDragId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [newName, setNewName] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newDetail, setNewDetail] = useState('');
  const [newStitch, setNewStitch] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(false);

  const typedOptions = useMemo(
    () =>
      options
        .filter((o) => o.option_type === activeType)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [options, activeType]
  );

  const getDraft = (opt: TailoringOptionRecord): TailoringOptionRecord => drafts[opt.id] || opt;

  const updateDraft = (opt: TailoringOptionRecord, patch: Partial<TailoringOptionRecord>) => {
    const current = getDraft(opt);
    setDrafts((prev) => ({
      ...prev,
      [opt.id]: { ...current, ...patch },
    }));
  };

  const commitReorder = async (orderedIds: number[]) => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/tailoring-options/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ optionType: activeType, orderedIds }),
      });
      const data = await res.json();
      if (res.ok) {
        onUpdated(data.options);
        setFeedback({ type: 'ok', text: `Updated display order for ${activeType} options.` });
      } else {
        setFeedback({ type: 'err', text: data.error || 'Could not reorder options.' });
      }
    } finally {
      setBusy(false);
    }
  };

  const moveItem = (id: number, delta: -1 | 1) => {
    const idx = typedOptions.findIndex((o) => o.id === id);
    const target = idx + delta;
    if (idx < 0 || target < 0 || target >= typedOptions.length) return;
    const copy = typedOptions.map((o) => o.id);
    const [removed] = copy.splice(idx, 1);
    copy.splice(target, 0, removed);
    commitReorder(copy);
  };

  const handleDropOn = (targetId: number) => {
    if (dragId === null || dragId === targetId) return;
    const ids = typedOptions.map((o) => o.id);
    const fromIdx = ids.indexOf(dragId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, moved);
    setDragId(null);
    commitReorder(ids);
  };

  const handleSaveOption = async (opt: TailoringOptionRecord, overridePatch?: Partial<TailoringOptionRecord>) => {
    const payload = { ...getDraft(opt), ...(overridePatch || {}) };
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/tailoring-options/${opt.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: payload.name,
          subtitle: payload.subtitle,
          detail: payload.detail,
          stitch_spec: payload.stitch_spec,
          image_url: payload.image_url,
          is_default: payload.is_default,
          active: payload.active,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[opt.id];
          return next;
        });
        onUpdated(data.options);
        setFeedback({ type: 'ok', text: `Saved "${payload.name}" (${activeType}).` });
      } else {
        setFeedback({ type: 'err', text: data.error || 'Could not update tailoring option.' });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteOption = async (opt: TailoringOptionRecord) => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/tailoring-options/${opt.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        onUpdated(data.options);
        setFeedback({ type: 'ok', text: `Deleted "${opt.name}".` });
      } else {
        setFeedback({ type: 'err', text: data.error || 'Could not delete option.' });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/tailoring-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          option_type: activeType,
          name: newName.trim(),
          subtitle: newSubtitle.trim(),
          detail: newDetail.trim(),
          stitch_spec: newStitch.trim(),
          image_url: newImageUrl.trim(),
          is_default: newIsDefault,
          active: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewName('');
        setNewSubtitle('');
        setNewDetail('');
        setNewStitch('');
        setNewImageUrl('');
        setNewIsDefault(false);
        onUpdated(data.options);
        setFeedback({ type: 'ok', text: `Added new ${activeType} option.` });
      } else {
        setFeedback({ type: 'err', text: data.error || 'Could not add option.' });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSyncToAllProducts = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/tailoring-options/sync-products', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        onUpdated();
        setFeedback({
          type: 'ok',
          text: `Synced active collars & cuffs across ${data.updatedProducts} shirt catalog item(s).`,
        });
      } else {
        setFeedback({ type: 'err', text: data.error || 'Sync failed.' });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      <div className="border-b border-neutral-200 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold uppercase tracking-wide flex items-center gap-2">
            <Scissors className="w-4 h-4 text-[#142B4E]" />
            <span>Collar & Cuff Studio (Images, Order & Default Selection)</span>
          </h1>
          <p className="text-neutral-500 mt-0.5">
            Upload custom collar/cuff photographs from Media Library, drag cards or use arrows to reorder display, and mark the default pre-selected choice.
          </p>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={handleSyncToAllProducts}
          className="px-3.5 py-2 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E] hover:text-white uppercase tracking-wider font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Active Options to All Shirts</span>
        </button>
      </div>

      {/* Collars / Cuffs Switcher */}
      <div className="flex items-center gap-2">
        {(['collar', 'cuff'] as TailoringOptionType[]).map((t) => {
          const count = options.filter((o) => o.option_type === t).length;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setActiveType(t)}
              className={`px-4 py-2 border uppercase tracking-wider font-semibold cursor-pointer ${
                activeType === t
                  ? 'bg-[#142B4E] text-white border-[#142B4E]'
                  : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {t === 'collar' ? `Collars (${count})` : `Cuffs (${count})`}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div
          className={`p-3 border font-medium ${
            feedback.type === 'ok'
              ? 'bg-[#F4F8F4] border-[#4F8A47]/40 text-[#2E5D28]'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Draggable / Reorderable Option Cards */}
      <div className="space-y-3" data-testid="collar-cuff-studio-list">
        {typedOptions.map((opt, idx) => {
          const d = getDraft(opt);
          const hasUnsaved = Boolean(drafts[opt.id]);
          return (
            <div
              key={opt.id}
              draggable
              onDragStart={() => setDragId(opt.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDropOn(opt.id)}
              className={`border bg-white p-4 space-y-3 transition-colors ${
                d.is_default
                  ? 'border-[#142B4E] ring-1 ring-[#142B4E]/30'
                  : 'border-neutral-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-neutral-400 cursor-grab" />
                  <span className="font-mono-tabular px-2 py-0.5 bg-neutral-100 text-neutral-600 text-[11px]">
                    #{idx + 1}
                  </span>
                  <span className="font-semibold text-sm text-[#1A1A1A]">{d.name}</span>
                  {d.is_default && (
                    <span className="px-2 py-0.5 bg-[#142B4E] text-white text-[10px] uppercase tracking-wider font-semibold">
                      Default Selected
                    </span>
                  )}
                  {!d.active && (
                    <span className="px-2 py-0.5 bg-neutral-200 text-neutral-600 text-[10px] uppercase">
                      Hidden
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={busy || idx === 0}
                    onClick={() => moveItem(opt.id, -1)}
                    aria-label={`Move ${opt.name} up`}
                    className="p-1.5 border border-neutral-300 bg-white hover:bg-neutral-50 disabled:opacity-35 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={busy || idx === typedOptions.length - 1}
                    onClick={() => moveItem(opt.id, 1)}
                    aria-label={`Move ${opt.name} down`}
                    className="p-1.5 border border-neutral-300 bg-white hover:bg-neutral-50 disabled:opacity-35 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  {!opt.is_default && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleSaveOption(opt, { is_default: true })}
                      className="px-2.5 py-1.5 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E] hover:text-white text-[11px] uppercase tracking-wider cursor-pointer"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDeleteOption(opt)}
                    aria-label={`Delete ${opt.name}`}
                    className="p-1.5 border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Image Thumbnail + Picker */}
                <div className="lg:col-span-3 flex items-center gap-3">
                  <div className="w-20 h-16 border border-neutral-200 bg-[#F7F7F7] flex items-center justify-center overflow-hidden shrink-0">
                    {d.image_url ? (
                      <img
                        src={d.image_url}
                        alt={d.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-neutral-400 uppercase">SVG Sketch</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenMediaPicker((url) => updateDraft(opt, { image_url: url }))
                      }
                      className="w-full px-2.5 py-1.5 border border-[#142B4E] text-[#142B4E] hover:bg-[#142B4E]/5 text-[11px] inline-flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Pick Image</span>
                    </button>
                    {d.image_url && (
                      <button
                        type="button"
                        onClick={() => updateDraft(opt, { image_url: '' })}
                        className="w-full px-2 py-1 text-[10px] text-neutral-500 hover:text-red-600 border border-neutral-200 cursor-pointer"
                      >
                        Reset to SVG
                      </button>
                    )}
                  </div>
                </div>

                {/* Editable Attributes */}
                <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">Option Name</label>
                    <input
                      value={d.name}
                      onChange={(e) => updateDraft(opt, { name: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">Subtitle / Hint</label>
                    <input
                      value={d.subtitle}
                      onChange={(e) => updateDraft(opt, { subtitle: e.target.value })}
                      placeholder="e.g. Classic wide spread"
                      className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">Stitch Spec</label>
                    <input
                      value={d.stitch_spec}
                      onChange={(e) => updateDraft(opt, { stitch_spec: e.target.value })}
                      placeholder="e.g. 6.5 cm · Fusible interlining"
                      className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">Image URL</label>
                    <input
                      value={d.image_url}
                      onChange={(e) => updateDraft(opt, { image_url: e.target.value })}
                      placeholder="/assets/..."
                      className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white font-mono-tabular text-[11px]"
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-[10px] text-neutral-500 mb-0.5">Atelier Description</label>
                    <input
                      value={d.detail}
                      onChange={(e) => updateDraft(opt, { detail: e.target.value })}
                      placeholder="Craftsmanship notes shown to customers"
                      className="w-full px-2.5 py-1.5 border border-neutral-300 bg-white"
                    />
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer py-1.5">
                      <input
                        type="checkbox"
                        checked={d.active}
                        onChange={(e) => updateDraft(opt, { active: e.target.checked })}
                        className="accent-[#142B4E]"
                      />
                      <span>Active</span>
                    </label>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleSaveOption(opt)}
                      className={`px-3.5 py-1.5 uppercase tracking-wider font-medium inline-flex items-center gap-1 cursor-pointer ${
                        hasUnsaved
                          ? 'bg-[#4F8A47] hover:bg-[#3f7238] text-white'
                          : 'bg-[#142B4E] hover:bg-[#0f213d] text-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Collar / Cuff Option */}
      <form onSubmit={handleAddOption} className="border border-neutral-200 bg-white p-5 space-y-3">
        <div className="font-semibold uppercase tracking-wider text-[#142B4E] flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          <span>Add New {activeType === 'collar' ? 'Collar' : 'Cuff'} Option</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={activeType === 'collar' ? 'Collar Name (e.g. Extreme Cutaway)' : 'Cuff Name (e.g. Double French)'}
            className="px-3 py-2 border border-neutral-300 bg-white"
          />
          <input
            value={newSubtitle}
            onChange={(e) => setNewSubtitle(e.target.value)}
            placeholder="Subtitle / Style Hint"
            className="px-3 py-2 border border-neutral-300 bg-white"
          />
          <input
            value={newStitch}
            onChange={(e) => setNewStitch(e.target.value)}
            placeholder="Stitch Spec (e.g. Mother-of-pearl button)"
            className="px-3 py-2 border border-neutral-300 bg-white"
          />
          <input
            value={newDetail}
            onChange={(e) => setNewDetail(e.target.value)}
            placeholder="Detailed craftsmanship note..."
            className="px-3 py-2 border border-neutral-300 bg-white sm:col-span-2"
          />
          <div className="flex gap-2">
            <input
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="Image URL (or Pick)"
              className="flex-1 min-w-0 px-3 py-2 border border-neutral-300 bg-white font-mono-tabular"
            />
            <button
              type="button"
              onClick={() => onOpenMediaPicker((url) => setNewImageUrl(url))}
              className="px-3 py-2 border border-neutral-300 bg-[#FAFAFA] hover:bg-neutral-100 shrink-0 cursor-pointer"
            >
              Pick
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newIsDefault}
              onChange={(e) => setNewIsDefault(e.target.checked)}
              className="accent-[#142B4E]"
            />
            <span>Make this option Default Selected for shoppers</span>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2 bg-[#142B4E] hover:bg-[#0f213d] text-white uppercase tracking-wider font-medium cursor-pointer"
          >
            Add {activeType === 'collar' ? 'Collar' : 'Cuff'}
          </button>
        </div>
      </form>
    </div>
  );
};

