import type { OrderRecord, RegionCode, RegionConfig } from '../types.ts';
import { formatRegionalPrice } from './commerce.ts';

export type OrderEmailTemplateType = 'order_confirmation' | 'shipping_tracking' | 'review_request';

interface LocalizedEmailCopy {
  brandTagline: string;
  confirmSubject: (orderNo: string) => string;
  trackingSubject: (orderNo: string, trackingNo: string) => string;
  reviewSubject: (orderNo: string) => string;
  confirmHeading: string;
  trackingHeading: string;
  reviewHeading: string;
  greeting: (name: string) => string;
  confirmIntro: (orderNo: string, warehouse: string) => string;
  trackingIntro: (orderNo: string, trackingNo: string) => string;
  reviewIntro: (orderNo: string) => string;
  reviewCta: string;
  reviewFootnote: string;
  trackDhlCta: string;
  shippingTitle: string;
  billingTitle: string;
  itemsTitle: string;
  tailoringLabel: string;
  subtotalLabel: string;
  discountLabel: string;
  shippingLabel: string;
  vatLabel: string;
  totalLabel: string;
  bankTitle: string;
  bankRefLabel: string;
  footerNote: string;
}

const EMAIL_COPY: Record<RegionCode, LocalizedEmailCopy> = {
  en: {
    brandTagline: 'Sartorial Italian Shirting · Since 1974',
    confirmSubject: (no) => `Monte Napoleone 1974 · Order Confirmation ${no}`,
    trackingSubject: (no, trk) => `Your Order ${no} Has Shipped via DHL (${trk})`,
    reviewSubject: (no) => `Share Your Fit & Quality Review · Order ${no}`,
    confirmHeading: 'Order Confirmed',
    trackingHeading: 'Your Tailored Order Is On Its Way',
    reviewHeading: 'Rate Your Monte Napoleone Shirt',
    greeting: (name) => `Dear ${name},`,
    confirmIntro: (no, wh) =>
      `Thank you for your order ${no}. Our master tailors at ${wh} have received your bespoke measurements and specifications.`,
    trackingIntro: (no, trk) =>
      `Good news — your order ${no} has left our atelier and is now in transit with DHL Express (Waybill: ${trk}).`,
    reviewIntro: (no) =>
      `Thank you for choosing Monte Napoleone 1974 for order ${no}. Verified buyer reviews are exclusive to our customers — click any shirt below to submit your personal rating (1 verified review per product).`,
    reviewCta: 'Rate This Shirt →',
    reviewFootnote: 'Only verified purchasers with this invitation link or signed-in order history can rate a shirt, once per item.',
    trackDhlCta: 'Track DHL Shipment',
    shippingTitle: 'Shipping Address',
    billingTitle: 'Billing Address',
    itemsTitle: 'Ordered Garments & Tailoring',
    tailoringLabel: 'Tailoring',
    subtotalLabel: 'Subtotal',
    discountLabel: 'Discount',
    shippingLabel: 'DHL Delivery',
    vatLabel: 'Included VAT',
    totalLabel: 'Order Total',
    bankTitle: 'Local Bank Transfer Instructions',
    bankRefLabel: 'Payment Reference',
    footerNote: 'Monte Napoleone 1974 · Treviso · Oslo · Milan · Ho Chi Minh City',
  },
  no: {
    brandTagline: 'Italiensk skreddersøm · Siden 1974',
    confirmSubject: (no) => `Monte Napoleone 1974 · Ordrebekreftelse ${no}`,
    trackingSubject: (no, trk) => `Din ordre ${no} er sendt med DHL (${trk})`,
    reviewSubject: (no) => `Vurder passform & kvalitet · Ordre ${no}`,
    confirmHeading: 'Ordrebekreftelse',
    trackingHeading: 'Din skreddersydde ordre er på vei',
    reviewHeading: 'Gi din vurdering av skjorten',
    greeting: (name) => `Kjære ${name},`,
    confirmIntro: (no, wh) =>
      `Takk for din bestilling ${no}. Vårt atelier (${wh}) har mottatt dine mål og spesifikasjoner.`,
    trackingIntro: (no, trk) =>
      `Gode nyheter — din ordre ${no} er nå sendt fra vårt lager med DHL Express (Sporingsnummer: ${trk}).`,
    reviewIntro: (no) =>
      `Takk for at du valgte Monte Napoleone 1974 (ordre ${no}). Kun verifiserte kjøpere kan legge inn omtale — klikk på skjorten under for å gi din vurdering (én gang per produkt).`,
    reviewCta: 'Vurder denne skjorten →',
    reviewFootnote: 'Kun kunder som har kjøpt produktet kan gi vurdering, én vurdering per skjorte.',
    trackDhlCta: 'Spor sending hos DHL',
    shippingTitle: 'Leveringsadresse',
    billingTitle: 'Fakturaadresse',
    itemsTitle: 'Bestilte skjorter & skreddersøm',
    tailoringLabel: 'Skreddersøm',
    subtotalLabel: 'Delsum',
    discountLabel: 'Rabatt',
    shippingLabel: 'DHL Frakt',
    vatLabel: 'Herav MVA',
    totalLabel: 'Totalt å betale',
    bankTitle: 'Bankoverføring / Fakturainformasjon',
    bankRefLabel: 'KID / Betalingsreferanse',
    footerNote: 'Monte Napoleone 1974 · Oslo · Treviso · Milano',
  },
  it: {
    brandTagline: 'Camiceria Sartoriale Italiana · Dal 1974',
    confirmSubject: (no) => `Monte Napoleone 1974 · Conferma Ordine ${no}`,
    trackingSubject: (no, trk) => `Il tuo ordine ${no} è stato spedito con DHL (${trk})`,
    reviewSubject: (no) => `Valuta vestibilità e tessuto · Ordine ${no}`,
    confirmHeading: 'Ordine Confermato',
    trackingHeading: 'Il tuo capo sartoriale è in viaggio',
    reviewHeading: 'Lascia una Recensione Verificata',
    greeting: (name) => `Gentile ${name},`,
    confirmIntro: (no, wh) =>
      `Grazie per il tuo ordine ${no}. I nostri maestri camiciai presso ${wh} hanno preso in carico le tue misure.`,
    trackingIntro: (no, trk) =>
      `Ottime notizie — il tuo ordine ${no} ha lasciato la nostra sartoria ed è affidato a DHL Express (Lettera di vettura: ${trk}).`,
    reviewIntro: (no) =>
      `Grazie per aver scelto Monte Napoleone 1974 (ordine ${no}). Le recensioni sono riservate esclusivamente agli acquirenti verificati — seleziona la camicia qui sotto per valutare (una recensione per articolo).`,
    reviewCta: 'Valuta questa Camicia →',
    reviewFootnote: 'Solo gli acquirenti verificati possono inviare una recensione, una volta per prodotto.',
    trackDhlCta: 'Traccia spedizione DHL',
    shippingTitle: 'Indirizzo di spedizione',
    billingTitle: 'Indirizzo di fatturazione',
    itemsTitle: 'Capi ordinati & dettagli sartoriali',
    tailoringLabel: 'Sartoria',
    subtotalLabel: 'Subtotale',
    discountLabel: 'Sconto',
    shippingLabel: 'Spedizione DHL',
    vatLabel: 'IVA inclusa',
    totalLabel: 'Totale ordine',
    bankTitle: 'Coordinate per Bonifico Bancario',
    bankRefLabel: 'Causale / Riferimento',
    footerNote: 'Monte Napoleone 1974 · Treviso · Milano · Oslo',
  },
  vn: {
    brandTagline: 'Nghệ thuật may đo sơ mi Ý · Từ 1974',
    confirmSubject: (no) => `Monte Napoleone 1974 · Xác nhận đơn hàng ${no}`,
    trackingSubject: (no, trk) => `Đơn hàng ${no} đã được gửi qua DHL (${trk})`,
    reviewSubject: (no) => `Đánh giá áo sơ mi đã mua · Đơn ${no}`,
    confirmHeading: 'Xác nhận đơn hàng',
    trackingHeading: 'Đơn hàng may đo của bạn đang trên đường giao',
    reviewHeading: 'Đánh giá sản phẩm đã mua',
    greeting: (name) => `Kính gửi ${name},`,
    confirmIntro: (no, wh) =>
      `Cảm ơn quý khách đã đặt hàng (${no}). Xưởng may đo tại ${wh} đã tiếp nhận số đo và yêu cầu chi tiết của quý khách.`,
    trackingIntro: (no, trk) =>
      `Tin vui — đơn hàng ${no} đã rời xưởng và đang được vận chuyển qua DHL Express (Mã vận đơn: ${trk}).`,
    reviewIntro: (no) =>
      `Cảm ơn quý khách đã tin chọn Monte Napoleone 1974 (đơn ${no}). Chỉ khách hàng đã mua mới có thể gửi đánh giá (tối đa 1 lần cho mỗi sản phẩm). Vui lòng nhấn vào sản phẩm bên dưới để đánh giá.`,
    reviewCta: 'Đánh giá sản phẩm →',
    reviewFootnote: 'Chỉ khách hàng đã mua mới được phép đánh giá và mỗi khách hàng chỉ đánh giá một lần cho mỗi sản phẩm.',
    trackDhlCta: 'Theo dõi vận đơn DHL',
    shippingTitle: 'Địa chỉ giao hàng',
    billingTitle: 'Địa chỉ thanh toán',
    itemsTitle: 'Sản phẩm & thông số may đo',
    tailoringLabel: 'May đo',
    subtotalLabel: 'Tạm tính',
    discountLabel: 'Giảm giá',
    shippingLabel: 'Phí giao hàng DHL',
    vatLabel: 'Thuế VAT đã bao gồm',
    totalLabel: 'Tổng thanh toán',
    bankTitle: 'Hướng dẫn chuyển khoản ngân hàng',
    bankRefLabel: 'Nội dung chuyển khoản',
    footerNote: 'Monte Napoleone 1974 · TP. Hồ Chí Minh · Treviso · Oslo',
  },
};

function escHtml(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface ReviewEmailLinkItem {
  title: string;
  sku: string;
  image?: string;
  reviewUrl: string;
}

export function buildOrderEmailTemplate(params: {
  type: OrderEmailTemplateType;
  order: OrderRecord;
  region: Pick<
    RegionConfig,
    'code' | 'name' | 'warehouse_name' | 'bank_name' | 'bank_account_display' | 'bank_iban' | 'bank_bic'
  >;
  trackingUrl?: string;
  reviewLinks?: ReviewEmailLinkItem[];
}): { subject: string; html: string; text: string } {
  const { type, order, region } = params;
  const copy = EMAIL_COPY[order.region_code] || EMAIL_COPY.en;
  const trackingNo = order.dhl_tracking_number || 'DHL-PENDING';
  const resolvedTrackUrl =
    params.trackingUrl ||
    `https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(
      trackingNo
    )}`;

  const subject =
    type === 'review_request'
      ? copy.reviewSubject(order.order_number)
      : type === 'shipping_tracking'
      ? copy.trackingSubject(order.order_number, trackingNo)
      : copy.confirmSubject(order.order_number);

  const heading =
    type === 'review_request'
      ? copy.reviewHeading
      : type === 'shipping_tracking'
      ? copy.trackingHeading
      : copy.confirmHeading;
  const intro =
    type === 'review_request'
      ? copy.reviewIntro(order.order_number)
      : type === 'shipping_tracking'
      ? copy.trackingIntro(order.order_number, trackingNo)
      : copy.confirmIntro(order.order_number, region.warehouse_name);

  const billingName = order.billing_name || order.customer_name;
  const billingAddress = order.billing_address || order.shipping_address;
  const billingCity = order.billing_city || order.shipping_city;
  const billingPostal = order.billing_postal_code || order.shipping_postal_code;
  const billingCountry = order.billing_country || order.shipping_country;

  const itemsHtml = (order.items || [])
    .map((item) => {
      const t = item.tailoring;
      const mods: string[] = [];
      if (t.lengthAdjustmentCm) mods.push(`Len ${t.lengthAdjustmentCm > 0 ? '+' : ''}${t.lengthAdjustmentCm}cm`);
      if (t.sleeveAdjustmentCm) mods.push(`Slv ${t.sleeveAdjustmentCm > 0 ? '+' : ''}${t.sleeveAdjustmentCm}cm`);
      if (t.waistAdjustmentCm) mods.push(`Waist ${t.waistAdjustmentCm > 0 ? '+' : ''}${t.waistAdjustmentCm}cm`);
      if (t.chestAdjustmentCm) mods.push(`Chest ${t.chestAdjustmentCm > 0 ? '+' : ''}${t.chestAdjustmentCm}cm`);
      if (t.shoulderAdjustmentCm) mods.push(`Shld ${t.shoulderAdjustmentCm > 0 ? '+' : ''}${t.shoulderAdjustmentCm}cm`);
      if (t.monogram) mods.push(`Monogram: ${t.monogram}`);
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #ececec;font-size:13px;color:#1a1a1a;">
            <strong style="text-transform:uppercase;letter-spacing:0.04em;">${escHtml(item.title)}</strong>
            <div style="font-size:11px;color:#666;margin-top:3px;">
              SKU ${escHtml(item.sku)} · ${escHtml(t.fit)} · ${escHtml(t.size)} · ${escHtml(t.collar)} · ${escHtml(t.cuff)}
            </div>
            ${
              mods.length > 0
                ? `<div style="font-size:11px;color:#142B4E;margin-top:2px;">${copy.tailoringLabel}: ${escHtml(
                    mods.join(', ')
                  )}</div>`
                : ''
            }
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #ececec;text-align:right;font-size:13px;color:#1a1a1a;white-space:nowrap;vertical-align:top;">
            ${item.quantity} &times; ${escHtml(formatRegionalPrice(item.unitPrice, order.region_code))}
          </td>
        </tr>`;
    })
    .join('');

  const bankHtml =
    order.payment_method === 'bank_transfer'
      ? `
      <div style="margin-top:20px;padding:16px;background:#F5F7FA;border:1px solid #D6DCE5;font-size:12px;color:#1A1A1A;">
        <div style="font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#142B4E;margin-bottom:6px;">
          ${escHtml(copy.bankTitle)}
        </div>
        <div>${escHtml(region.bank_name)} · ${escHtml(region.bank_account_display)}</div>
        <div>IBAN: ${escHtml(region.bank_iban)} · BIC: ${escHtml(region.bank_bic)}</div>
        <div style="margin-top:6px;font-weight:700;">
          ${escHtml(copy.bankRefLabel)}: ${escHtml(order.payment_reference)}
        </div>
      </div>`
      : '';

  const reviewBlocksHtml =
    type === 'review_request' && params.reviewLinks && params.reviewLinks.length > 0
      ? `
      <div style="margin:20px 0;space-y:10px;">
        ${params.reviewLinks
          .map(
            (rl) => `
          <div style="padding:14px 16px;border:1px solid #E5E7EB;background:#FAFAFA;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:13px;font-weight:700;text-transform:uppercase;color:#142B4E;">${escHtml(rl.title)}</div>
              <div style="font-size:11px;color:#6B7280;margin-top:2px;">SKU ${escHtml(rl.sku)}</div>
            </div>
            <a href="${escHtml(rl.reviewUrl)}" style="display:inline-block;padding:10px 18px;background:#142B4E;color:#ffffff;text-decoration:none;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">
              ${escHtml(copy.reviewCta)}
            </a>
          </div>`
          )
          .join('')}
        <p style="font-size:11px;color:#64748B;margin-top:8px;">${escHtml(copy.reviewFootnote)}</p>
      </div>`
      : '';

  const trackingCtaHtml =
    type === 'shipping_tracking'
      ? `
      <div style="margin:22px 0;">
        <a href="${escHtml(resolvedTrackUrl)}" style="display:inline-block;padding:12px 24px;background:#142B4E;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;">
          ${escHtml(copy.trackDhlCta)} · ${escHtml(trackingNo)}
        </a>
      </div>`
      : '';

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#F4F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1A1A1A;">
  <div style="max-width:640px;margin:28px auto;background:#ffffff;border:1px solid #E5E7EB;">
    <div style="background:#142B4E;color:#ffffff;padding:28px 32px;text-align:center;">
      <div style="font-size:20px;letter-spacing:0.22em;text-transform:uppercase;font-weight:600;">MONTE NAPOLEONE</div>
      <div style="font-size:11px;letter-spacing:0.35em;opacity:0.8;margin-top:4px;">1974</div>
      <div style="font-size:11px;color:#CBD5E1;margin-top:10px;letter-spacing:0.06em;">${escHtml(copy.brandTagline)}</div>
    </div>

    <div style="padding:32px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.16em;color:#64748B;margin-bottom:6px;">
        ${escHtml(order.order_number)} · ${escHtml(region.name)} (${escHtml(order.currency_code)})
      </div>
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#142B4E;">${escHtml(heading)}</h1>
      <p style="font-size:14px;line-height:1.6;margin:0 0 10px;">${escHtml(copy.greeting(order.customer_name))}</p>
      <p style="font-size:14px;line-height:1.6;color:#374151;margin:0 0 18px;">${escHtml(intro)}</p>

      ${reviewBlocksHtml}
      ${trackingCtaHtml}

      <div style="display:table;width:100%;border-collapse:separate;border-spacing:0;margin:18px 0;background:#FAFAFA;border:1px solid #E5E7EB;">
        <div style="display:table-cell;width:50%;padding:16px;vertical-align:top;border-right:1px solid #E5E7EB;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#6B7280;margin-bottom:6px;">
            ${escHtml(copy.shippingTitle)}
          </div>
          <div style="font-size:13px;font-weight:600;">${escHtml(order.customer_name)}</div>
          <div style="font-size:12px;color:#4B5563;line-height:1.5;">
            ${escHtml(order.shipping_address)}<br/>
            ${escHtml(order.shipping_postal_code)} ${escHtml(order.shipping_city)}<br/>
            ${escHtml(order.shipping_country)}
          </div>
        </div>
        <div style="display:table-cell;width:50%;padding:16px;vertical-align:top;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#6B7280;margin-bottom:6px;">
            ${escHtml(copy.billingTitle)}
          </div>
          <div style="font-size:13px;font-weight:600;">${escHtml(billingName)}</div>
          <div style="font-size:12px;color:#4B5563;line-height:1.5;">
            ${escHtml(billingAddress)}<br/>
            ${escHtml(billingPostal)} ${escHtml(billingCity)}<br/>
            ${escHtml(billingCountry)}
          </div>
        </div>
      </div>

      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#6B7280;margin:22px 0 8px;">
        ${escHtml(copy.itemsTitle)}
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${itemsHtml}
      </table>

      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px;">
        <tr>
          <td style="padding:4px 0;color:#6B7280;">${escHtml(copy.subtotalLabel)}</td>
          <td style="padding:4px 0;text-align:right;">${escHtml(formatRegionalPrice(order.subtotal, order.region_code))}</td>
        </tr>
        ${
          order.discount_amount > 0
            ? `<tr>
                <td style="padding:4px 0;color:#4F8A47;">${escHtml(copy.discountLabel)}</td>
                <td style="padding:4px 0;text-align:right;color:#4F8A47;">-${escHtml(
                  formatRegionalPrice(order.discount_amount, order.region_code)
                )}</td>
              </tr>`
            : ''
        }
        <tr>
          <td style="padding:4px 0;color:#6B7280;">${escHtml(copy.shippingLabel)}</td>
          <td style="padding:4px 0;text-align:right;">${
            order.shipping_cost === 0
              ? 'Free'
              : escHtml(formatRegionalPrice(order.shipping_cost, order.region_code))
          }</td>
        </tr>
        ${
          order.vat_amount > 0
            ? `<tr>
                <td style="padding:4px 0;color:#6B7280;">${escHtml(copy.vatLabel)}</td>
                <td style="padding:4px 0;text-align:right;">${escHtml(
                  formatRegionalPrice(order.vat_amount, order.region_code)
                )}</td>
              </tr>`
            : ''
        }
        <tr>
          <td style="padding:12px 0 0;border-top:2px solid #142B4E;font-weight:700;font-size:15px;">${escHtml(
            copy.totalLabel
          )}</td>
          <td style="padding:12px 0 0;border-top:2px solid #142B4E;text-align:right;font-weight:700;font-size:15px;color:#142B4E;">
            ${escHtml(formatRegionalPrice(order.total, order.region_code))}
          </td>
        </tr>
      </table>

      ${bankHtml}
    </div>

    <div style="background:#F8FAFC;border-top:1px solid #E5E7EB;padding:18px 32px;text-align:center;font-size:11px;color:#64748B;">
      ${escHtml(copy.footerNote)}
    </div>
  </div>
</body>
</html>`;

  const textLines = [
    `MONTE NAPOLEONE 1974 — ${heading}`,
    `${copy.greeting(order.customer_name)}`,
    intro,
    type === 'shipping_tracking' ? `${copy.trackDhlCta}: ${trackingNo} (${resolvedTrackUrl})` : '',
    `${copy.shippingTitle}: ${order.customer_name}, ${order.shipping_address}, ${order.shipping_postal_code} ${order.shipping_city}, ${order.shipping_country}`,
    `${copy.billingTitle}: ${billingName}, ${billingAddress}, ${billingPostal} ${billingCity}, ${billingCountry}`,
    `${copy.totalLabel}: ${formatRegionalPrice(order.total, order.region_code)}`,
  ].filter(Boolean);

  return { subject, html, text: textLines.join('\n\n') };
}
