import type { RegionCode } from '../types.ts';

export type InfoPageSlug =
  | 'returns'
  | 'withdrawal'
  | 'dealers'
  | 'careers'
  | 'faq'
  | 'privacy';

export const INFO_PAGE_SLUGS: InfoPageSlug[] = [
  'returns',
  'withdrawal',
  'dealers',
  'careers',
  'faq',
  'privacy',
];

export const INFO_PAGE_PATH_ALIASES: Record<string, InfoPageSlug> = {
  returns: 'returns',
  'returns-exchanges': 'returns',
  'retur-og-bytte': 'returns',
  withdrawal: 'withdrawal',
  'withdrawal-form': 'withdrawal',
  'angrefrist-skjema': 'withdrawal',
  dealers: 'dealers',
  partners: 'dealers',
  'dealers-partners': 'dealers',
  'forhandlere-og-partnere': 'dealers',
  careers: 'careers',
  karrierer: 'careers',
  'careers-opportunities': 'careers',
  faq: 'faq',
  faqs: 'faq',
  privacy: 'privacy',
  'privacy-policy': 'privacy',
  personvernerklaering: 'privacy',
};

export interface InfoSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  note?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface DealerLocation {
  name: string;
  city: string;
  /** Local path under /public, e.g. /partners/rolfsen-tonsberg.jpg */
  image?: string;
}

export interface InfoPageContent {
  slug: InfoPageSlug;
  eyebrow: string;
  title: string;
  lead: string;
  sections: InfoSection[];
  faqGroups?: Array<{ title: string; items: FaqItem[] }>;
  dealers?: DealerLocation[];
  ctaEmail?: string;
  pdfUrl?: string;
  pdfLabel?: string;
}

const PLACEHOLDER = '/partners/partner-placeholder.png';

/** Full Norwegian partner network from montenapoleone1974.com/forhandlere-og-partnere/ */
const DEALERS: DealerLocation[] = [
  { name: '4 MEN Storo Senter', city: 'Oslo', image: '/partners/4men-storo.jpg' },
  { name: 'Rolfsen', city: 'Tønsberg', image: '/partners/rolfsen-tonsberg.jpg' },
  { name: '4 MEN CC Vest', city: 'Oslo', image: '/partners/4men-cc-vest.jpg' },
  { name: 'Jørbæk Trekanten Senter', city: 'Asker / Bærum', image: '/partners/jorbaek-trekanten.jpg' },
  { name: 'Jørbæk Holmen Senter', city: 'Asker / Bærum', image: '/partners/jorbaek-holmen.jpg' },
  { name: 'Briskeby Gods Herre', city: 'Oslo', image: '/partners/briskeby-gods-herre.jpg' },
  { name: 'Briskeby Gods Dame', city: 'Oslo', image: '/partners/briskeby-gods-dame.jpg' },
  { name: 'The Player', city: 'Oslo', image: '/partners/the-player.jpg' },
  { name: 'Object Etc Dame', city: 'Oslo', image: '/partners/object-etc-dame.jpg' },
  { name: 'T. Riise', city: 'Hareid', image: PLACEHOLDER },
  { name: 'Bjerkis (Høyer)', city: 'Bodø', image: '/partners/hoyer.png' },
  { name: 'O. Johanson', city: 'Bodø', image: '/partners/o-johanson.jpg' },
  { name: 'POM', city: 'Oslo', image: PLACEHOLDER },
  { name: 'Boomerang', city: 'Fredrikstad', image: PLACEHOLDER },
  { name: 'Wood Shop', city: 'Elverum', image: PLACEHOLDER },
  { name: 'Fine Man', city: 'Stavanger', image: '/partners/fine-mann.jpg' },
  { name: 'Icon of Norway', city: 'Haugesund', image: '/partners/icon-of-norway.jpg' },
  { name: 'For Men Sandvika Senter', city: 'Oslo', image: '/partners/for-menn.png' },
  { name: 'Briskeby Herregård', city: 'Oslo', image: PLACEHOLDER },
  { name: 'Briskeby Herregård CC Vest', city: 'Oslo', image: PLACEHOLDER },
  { name: 'Briskeby Herregård Vinderen', city: 'Oslo', image: PLACEHOLDER },
  { name: 'Briskeby Gods Fornebu', city: 'Fornebu', image: PLACEHOLDER },
  { name: 'Karma Marit Meløy', city: 'Larvik', image: PLACEHOLDER },
  { name: 'Frati', city: 'Ålgård', image: PLACEHOLDER },
  { name: 'Sporten Bagn', city: 'Bagn', image: PLACEHOLDER },
  { name: 'Kase', city: 'Ski', image: '/partners/kase.png' },
  { name: 'Bea', city: 'Holmsbu', image: PLACEHOLDER },
  { name: 'Arve Tvete', city: 'Sarpsborg', image: PLACEHOLDER },
  { name: 'Tendenza', city: 'Lillehammer', image: PLACEHOLDER },
  { name: 'Studio Sisko', city: 'Gjøvik', image: PLACEHOLDER },
  { name: 'Hamborg', city: 'Drøbak', image: '/partners/hamborg-drobak.jpg' },
  { name: 'De Fem Hjørner', city: 'Sandvika Senter', image: PLACEHOLDER },
  { name: 'Mille Måne', city: 'Sem', image: PLACEHOLDER },
  { name: 'Høyer', city: 'Vestby', image: '/partners/hoyer.png' },
  { name: 'Høyer', city: 'Ålgård', image: '/partners/hoyer.png' },
  { name: 'Vidars', city: 'Tønsberg', image: PLACEHOLDER },
  { name: 'Bogart', city: 'Tønsberg', image: '/partners/bogart.png' },
  { name: 'LUI', city: 'Bogstadveien, Oslo', image: '/partners/lui.png' },
  { name: 'Høyer Gulskogen', city: 'Stavanger', image: '/partners/hoyer-gulskogen.jpg' },
  { name: 'Mannen i Gata', city: 'Drammen', image: '/partners/mannen-i-gata.jpg' },
  { name: 'Trebutikk', city: 'Elverum', image: '/partners/trebutikk.jpg' },
];

const WITHDRAWAL_PDF =
  'https://montenapoleone1974.com/wp-content/uploads/2025/03/return-policy-A5.pdf';

type LocalizedBundle = Record<InfoPageSlug, InfoPageContent>;

const EN: LocalizedBundle = {
  returns: {
    slug: 'returns',
    eyebrow: 'Customer Care',
    title: 'Returns & Exchanges',
    lead: 'Ready-to-wear shirts can be returned within 14 days. Bespoke tailoring is made to your measures and is non-returnable except for manufacturing defects.',
    ctaEmail: 'monte@montenapoleone1974.com',
    sections: [
      {
        heading: 'Ready-to-wear returns',
        paragraphs: [
          'You may return a ready-to-wear order within 14 calendar days of receiving the parcel.',
          'Email us first, then ship the item back carefully in its original packaging when possible.',
        ],
        bullets: [
          'Return shipping is at the customer’s expense unless we shipped the wrong item.',
          'Items must be unused, clean, and suitable for resale after inspection.',
          'We aim to process approved returns within 14 days; bank refunds can take up to 10 additional days.',
          'In-store partner boutiques cannot issue online refunds — refunds are always processed through our system.',
        ],
      },
      {
        heading: 'International returns',
        paragraphs: [
          'Declare returned parcels as “Return / repair of Norwegian goods” on the customs form and packaging. Missing declarations can delay delivery or incur extra fees.',
        ],
      },
      {
        heading: 'Bespoke & made-to-measure',
        paragraphs: [
          'Individually tailored shirts cannot be cancelled or returned once production has started, except for verified manufacturing defects.',
        ],
        bullets: [
          'Photograph the issue while wearing the shirt and email us for review.',
          'Minor shade variation between dye lots is not considered a defect.',
          'Website visuals are illustrative and may differ slightly from the finished garment.',
        ],
      },
      {
        heading: 'Right of withdrawal',
        paragraphs: [
          'EU/EEA consumers have a 14-day cooling-off period for standard ready-to-wear purchases. Sealed or customised goods are excluded when opened or made to personal specifications.',
        ],
      },
    ],
  },
  withdrawal: {
    slug: 'withdrawal',
    eyebrow: 'Legal',
    title: 'Withdrawal Form',
    lead: 'Use this form when exercising your statutory right of withdrawal for eligible ready-to-wear orders.',
    ctaEmail: 'monte@montenapoleone1974.com',
    pdfUrl: WITHDRAWAL_PDF,
    pdfLabel: 'Download withdrawal form (PDF)',
    sections: [
      {
        heading: 'How to withdraw',
        paragraphs: [
          'Notify Monte Napoleone within 14 calendar days of receiving your order by emailing a clear statement or by completing the PDF form.',
          'Return the goods unused, with accessories, preferably in original packaging. You cover return shipping unless we agree otherwise.',
        ],
        bullets: [
          'Include your order number, full name, and contact details.',
          'We refund the product price after inspection; original shipping is refunded only for the cheapest standard method when required by law.',
          'Bespoke / made-to-measure shirts are excluded from withdrawal once production has begun.',
        ],
      },
      {
        heading: 'Send to',
        paragraphs: [
          'Monte Napoleone 1974 · Returns · Attn: Ms. Sakura · Email: monte@montenapoleone1974.com',
          'Support hours: weekdays 10:00–18:00 CET.',
        ],
      },
    ],
  },
  dealers: {
    slug: 'dealers',
    eyebrow: 'Retail Network',
    title: 'Dealers & Partners',
    lead: 'Find Monte Napoleone shirts at selected Norwegian menswear partners, or visit our Oslo showroom.',
    ctaEmail: 'monte@montenapoleone1974.com',
    dealers: DEALERS,
    sections: [
      {
        heading: 'Become a partner',
        paragraphs: [
          'Independent boutiques and department stores are welcome to enquire about wholesale and seasonal collections.',
          'Write to monte@montenapoleone1974.com with your store profile and preferred assortment.',
        ],
      },
      {
        heading: 'Oslo showroom',
        paragraphs: [
          'Gulbrandsens Agencies Showroom · Maridalsveien 87, 0461 Oslo, Norway',
        ],
      },
    ],
  },
  careers: {
    slug: 'careers',
    eyebrow: 'Join the Atelier',
    title: 'Careers & Opportunities',
    lead: 'We are always interested in people who care about Italian shirting, hospitality, and precise craftsmanship.',
    ctaEmail: 'monte@montenapoleone1974.com',
    sections: [
      {
        heading: 'Open roles',
        paragraphs: [
          'There are currently no open positions listed. We still welcome thoughtful introductions.',
        ],
      },
      {
        heading: 'How to apply',
        paragraphs: [
          'Send a short letter explaining why you want to work with Monte Napoleone and what you bring to the team.',
        ],
        bullets: [
          'Email: monte@montenapoleone1974.com',
          'Optional CC: support@montenapoleone1974.com',
          'Include a CV and relevant portfolio or retail experience.',
        ],
      },
    ],
  },
  faq: {
    slug: 'faq',
    eyebrow: 'Help Centre',
    title: 'Frequently Asked Questions',
    lead: 'Shipping, payments, sizing, and order changes — answered clearly for every region.',
    ctaEmail: 'monte@montenapoleone1974.com',
    sections: [],
    faqGroups: [
      {
        title: 'Delivery',
        items: [
          {
            question: 'How long is delivery?',
            answer:
              'In-stock shirts usually leave within 4 working days plus 2–3 days transit. Pre-order shirts can take up to 12 working days plus transit. Bespoke adjustments add about 5–7 working days.',
          },
          {
            question: 'Do you ship to my country?',
            answer:
              'We ship across Europe (groups A & B), the US, Canada, Australia, and key Asian markets including Vietnam, Japan, Korea, Hong Kong, Singapore, Malaysia, Thailand, and Indonesia. If your country is missing, email us.',
          },
          {
            question: 'How much is shipping?',
            answer:
              'Qualified orders ship with DHL Express. Checkout shows the live rate for your region before you pay.',
          },
        ],
      },
      {
        title: 'Ordering & payment',
        items: [
          {
            question: 'Which payment methods do you accept?',
            answer: 'Vipps (Norway), PayPal, Visa, Mastercard, Klarna where available, and bank transfer.',
          },
          {
            question: 'Do I need an account?',
            answer:
              'No. Guest checkout is available. An account simply makes reorders and order history easier.',
          },
          {
            question: 'Can I change my order after placing it?',
            answer:
              'Only if the parcel has not yet been collected by the courier. Email monte@montenapoleone1974.com with subject “URGENT ORDER CHANGE” and your order number.',
          },
        ],
      },
      {
        title: 'Returns',
        items: [
          {
            question: 'How do I return or exchange?',
            answer:
              'See our Returns & Exchanges page. Ready-to-wear has a 14-day window; bespoke shirts are non-returnable except for manufacturing defects.',
          },
          {
            question: 'Wrong address / undelivered parcel?',
            answer:
              'Parcels returned to us are refunded so you can reorder to the correct address. Foreign bank fees may be deducted by your bank.',
          },
        ],
      },
    ],
  },
  privacy: {
    slug: 'privacy',
    eyebrow: 'Trust & Data',
    title: 'Privacy Policy',
    lead: 'We protect the personal data you share when shopping, contacting support, or joining the newsletter.',
    ctaEmail: 'monte@montenapoleone1974.com',
    sections: [
      {
        heading: '1. Information we collect',
        bullets: [
          'Personal: name, email, phone, billing/shipping address, payment references.',
          'Technical: browser, device, IP, pages visited, referring site.',
          'Cookies used for experience, analytics, and personalisation.',
        ],
      },
      {
        heading: '2. How we use it',
        bullets: [
          'Process and fulfil orders',
          'Customer service and order updates',
          'Newsletter / offers when you consent',
          'Improve the storefront and meet legal duties',
        ],
      },
      {
        heading: '3. Sharing',
        paragraphs: [
          'We do not sell your data. We share only with processors needed for payment, shipping (e.g. DHL), email, and when required by law.',
        ],
      },
      {
        heading: '4. Security & rights',
        paragraphs: [
          'We apply appropriate technical and organisational safeguards. Depending on your region you may request access, correction, deletion, portability, or withdraw marketing consent.',
        ],
        note: 'Contact monte@montenapoleone1974.com · Gulbrandsens Agencies Showroom, Maridalsveien 87, 0461 Oslo, Norway.',
      },
    ],
  },
};

const NO: LocalizedBundle = {
  ...EN,
  returns: {
    ...EN.returns,
    eyebrow: 'Kundeservice',
    title: 'Retur og bytte',
    lead: 'Ready-to-wear kan returneres innen 14 dager. Skreddersøm lages etter dine mål og kan ikke returneres utenom produksjonsfeil.',
    sections: [
      {
        heading: 'Retur av ready-to-wear',
        paragraphs: [
          'Du kan returnere bestillingen innen 14 kalenderdager etter mottak.',
          'Send oss e-post først, og returner varen forsvarlig — gjerne i originalemballasje.',
        ],
        bullets: [
          'Returfrakt betales av kunden med mindre vi har sendt feil vare.',
          'Varen skal være ubrukt, ren og egnet for videresalg.',
          'Vi behandler godkjente returer innen 14 dager; bankrefusjon kan ta inntil 10 dager ekstra.',
          'Partnerbutikker kan ikke utbetale nettrefusjon — den går alltid via vårt system.',
        ],
      },
      {
        heading: 'Internasjonal retur',
        paragraphs: [
          'Deklarer pakken som «Retur og reparasjon av norske varer» på tollskjema og emballasje.',
        ],
      },
      {
        heading: 'Skreddersydde skjorter',
        paragraphs: [
          'Individuelt tilpassede skjorter kan ikke avbestilles eller returneres når produksjonen er startet, unntatt ved dokumentert produksjonsfeil.',
        ],
      },
      {
        heading: 'Angrerett',
        paragraphs: [
          'Forbrukere i EU/EØS har 14 dagers angrerett for standard ready-to-wear. Skreddersøm og åpnede forseglede varer er unntatt.',
        ],
      },
    ],
  },
  withdrawal: {
    ...EN.withdrawal,
    eyebrow: 'Juridisk',
    title: 'Angrefrist skjema',
    lead: 'Bruk dette skjemaet når du utøver angreretten for kvalifiserte ready-to-wear ordrer.',
    pdfLabel: 'Last ned angreskjema (PDF)',
  },
  dealers: {
    ...EN.dealers,
    eyebrow: 'Forhandlernettverk',
    title: 'Forhandlere og partnere',
    lead: 'Finn Monte Napoleone hos utvalgte norske herreforhandlere, eller besøk showroom i Oslo.',
    sections: [
      {
        heading: 'Bli partner',
        paragraphs: [
          'Uavhengige butikker kan høre om grossist og sesongkolleksjoner på monte@montenapoleone1974.com.',
        ],
      },
      {
        heading: 'Showroom Oslo',
        paragraphs: ['Gulbrandsens Agencies Showroom · Maridalsveien 87, 0461 Oslo'],
      },
    ],
  },
  careers: {
    ...EN.careers,
    eyebrow: 'Bli med oss',
    title: 'Karriere og jobbmuligheter',
    lead: 'Vi ser etter folk som bryr seg om italiensk skjortehåndverk, service og nøyaktighet.',
    sections: [
      {
        heading: 'Ledige stillinger',
        paragraphs: ['Det er foreløpig ingen utlyste stillinger. Vi tar likevel imot henvendelser.'],
      },
      {
        heading: 'Slik søker du',
        paragraphs: [
          'Send et kort brev om hvorfor du vil jobbe hos Monte Napoleone, og hva du tilfører teamet.',
        ],
        bullets: [
          'E-post: monte@montenapoleone1974.com',
          'Valgfri kopi: support@montenapoleone1974.com',
        ],
      },
    ],
  },
  faq: {
    ...EN.faq,
    eyebrow: 'Hjelpesenter',
    title: 'Ofte stilte spørsmål',
    lead: 'Frakt, betaling, størrelser og ordreendringer — tydelige svar for alle regioner.',
    faqGroups: [
      {
        title: 'Leveranse',
        items: [
          {
            question: 'Hvor lang er leveringstiden?',
            answer:
              'På lager: normalt utsendt innen 4 virkedager + 2–3 dager frakt. Forhåndsordre: inntil 12 virkedager + frakt. Skreddersøm: +5–7 virkedager.',
          },
          {
            question: 'Sender dere til mitt land?',
            answer:
              'Vi sender i Europa, USA, Canada, Australia og utvalgte asiatiske markeder inkludert Vietnam. Mangler landet ditt? Send e-post.',
          },
          {
            question: 'Hva koster frakt?',
            answer: 'Kassen viser gjeldende DHL Express-pris for din region før betaling.',
          },
        ],
      },
      {
        title: 'Bestilling og betaling',
        items: [
          {
            question: 'Hvilke betalingsmåter godtar dere?',
            answer: 'Vipps (Norge), PayPal, Visa, Mastercard, Klarna der det er tilgjengelig, og bankoverføring.',
          },
          {
            question: 'Må jeg ha konto?',
            answer: 'Nei. Gjestekasse er tilgjengelig. Konto gjør gjenkjøp enklere.',
          },
          {
            question: 'Kan jeg endre ordren?',
            answer:
              'Kun hvis pakken ikke er hentet av speditør. E-post monte@montenapoleone1974.com med emne «HASTER ENDRINGSORDRE».',
          },
        ],
      },
      {
        title: 'Retur',
        items: [
          {
            question: 'Hvordan returnerer jeg?',
            answer:
              'Se siden Retur og bytte. Ready-to-wear: 14 dager. Skreddersøm: kun ved produksjonsfeil.',
          },
        ],
      },
    ],
  },
  privacy: {
    ...EN.privacy,
    eyebrow: 'Tillit og data',
    title: 'Personvernerklæring',
    lead: 'Vi beskytter personopplysningene du deler ved kjøp, kundeservice eller nyhetsbrev.',
    sections: [
      {
        heading: '1. Informasjon vi samler inn',
        bullets: [
          'Personlig: navn, e-post, telefon, adresse, betalingsreferanser.',
          'Teknisk: nettleser, enhet, IP, besøkte sider.',
          'Informasjonskapsler for opplevelse og analyse.',
        ],
      },
      {
        heading: '2. Bruk',
        bullets: [
          'Behandle ordrer',
          'Kundeservice',
          'Nyhetsbrev ved samtykke',
          'Forbedre nettbutikken og overholde lovkrav',
        ],
      },
      {
        heading: '3. Deling',
        paragraphs: [
          'Vi selger ikke data. Vi deler kun med nødvendige leverandører (betaling, DHL, e-post) og når loven krever det.',
        ],
      },
      {
        heading: '4. Rettigheter',
        paragraphs: [
          'Du kan be om innsyn, retting, sletting eller trekke markedsføringssamtykke via monte@montenapoleone1974.com.',
        ],
      },
    ],
  },
};

const IT: LocalizedBundle = {
  ...EN,
  returns: {
    ...EN.returns,
    eyebrow: 'Assistenza',
    title: 'Resi e cambi',
    lead: 'Le camicie ready-to-wear possono essere rese entro 14 giorni. La sartoria su misura non è restituibile salvo difetti di produzione.',
  },
  withdrawal: {
    ...EN.withdrawal,
    eyebrow: 'Legale',
    title: 'Modulo di recesso',
    lead: 'Usa questo modulo per esercitare il diritto di recesso sugli ordini ready-to-wear idonei.',
    pdfLabel: 'Scarica il modulo di recesso (PDF)',
  },
  dealers: {
    ...EN.dealers,
    eyebrow: 'Rete retail',
    title: 'Rivenditori e partner',
    lead: 'Trova Monte Napoleone presso partner selezionati in Norvegia o visita lo showroom di Oslo.',
  },
  careers: {
    ...EN.careers,
    eyebrow: 'Unisciti a noi',
    title: 'Carriere e opportunità',
    lead: 'Cerchiamo persone appassionate di camiceria italiana, ospitalità e precisione.',
  },
  faq: {
    ...EN.faq,
    eyebrow: 'Centro assistenza',
    title: 'Domande frequenti',
    lead: 'Spedizioni, pagamenti e modifiche ordine — risposte chiare per ogni regione.',
  },
  privacy: {
    ...EN.privacy,
    eyebrow: 'Privacy',
    title: 'Informativa sulla privacy',
    lead: 'Proteggiamo i dati personali che condividi per acquisti, assistenza o newsletter.',
  },
};

const VN: LocalizedBundle = {
  ...EN,
  returns: {
    ...EN.returns,
    eyebrow: 'Chăm sóc khách hàng',
    title: 'Đổi trả hàng',
    lead: 'Áo ready-to-wear có thể đổi trả trong 14 ngày. Áo may đo không hoàn trả trừ lỗi sản xuất.',
  },
  withdrawal: {
    ...EN.withdrawal,
    eyebrow: 'Pháp lý',
    title: 'Mẫu đơn rút lui giao dịch',
    lead: 'Dùng mẫu này khi thực hiện quyền rút lui với đơn ready-to-wear đủ điều kiện.',
    pdfLabel: 'Tải mẫu đơn (PDF)',
  },
  dealers: {
    ...EN.dealers,
    eyebrow: 'Đối tác bán lẻ',
    title: 'Đại lý & đối tác',
    lead: 'Tìm Monte Napoleone tại các đối tác Na Uy hoặc ghé showroom Oslo.',
  },
  careers: {
    ...EN.careers,
    eyebrow: 'Gia nhập đội ngũ',
    title: 'Tuyển dụng',
    lead: 'Chúng tôi luôn chào đón người yêu may đo Ý, dịch vụ và sự tỉ mỉ.',
  },
  faq: {
    ...EN.faq,
    eyebrow: 'Trung tâm trợ giúp',
    title: 'Câu hỏi thường gặp',
    lead: 'Vận chuyển, thanh toán và chỉnh sửa đơn — trả lời rõ ràng theo từng khu vực.',
  },
  privacy: {
    ...EN.privacy,
    eyebrow: 'Bảo mật',
    title: 'Chính sách quyền riêng tư',
    lead: 'Chúng tôi bảo vệ dữ liệu bạn chia sẻ khi mua hàng, hỗ trợ hoặc nhận bản tin.',
  },
};

const BY_REGION: Record<RegionCode, LocalizedBundle> = {
  en: EN,
  no: NO,
  it: IT,
  vn: VN,
};

export function resolveInfoPageSlug(raw?: string | null): InfoPageSlug | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return INFO_PAGE_PATH_ALIASES[key] || null;
}

export function getInfoPageContent(slug: InfoPageSlug, region: RegionCode): InfoPageContent {
  return BY_REGION[region]?.[slug] || EN[slug];
}

export function infoPagePathSegment(slug: InfoPageSlug): string {
  return slug;
}
