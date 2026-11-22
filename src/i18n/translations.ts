import type { RegionCode } from '../types.ts';

export interface RegionCopy {
  nav: {
    b2b: string;
    b2c: string;
    search: string;
    account: string;
    wishlist: string;
    admin: string;
    aboutUs: string;
    regionLabel: string;
    selectRegionHeading: string;
    allShirts: string;
    home: string;
    megaCategories: Array<{ label: string; category: string; image: string }>;
  };
  hero: {
    slide1Title: string;
    slide1Sub: string;
    slide1Cta: string;
    slide2Title: string;
    slide2Sub: string;
    slide2Cta: string;
  };
  home: {
    casualTitle: string;
    casualDesc: string;
    b2bTitle: string;
    b2bDesc: string;
    businessTitle: string;
    businessDesc: string;
    guideTitle: string;
    guideSub: string;
    inspirationTitle: string;
    inspirationSub: string;
  };
  catalog: {
    allCategories: string;
    availablePrefix: string;
    preorderTag: string;
    outOfStockTag: string;
    searchPlaceholder: string;
    emptyResult: string;
    loadMore: string;
    quickView: string;
  };
  pdp: {
    freeShippingBanner: string;
    backToCatalog: string;
    available: string;
    preorder: string;
    outOfStock: string;
    returnForm: string;
    sizeGuide: string;
    fitAndSizeRequired: string;
    chooseCollar: string;
    chooseCuff: string;
    tailoringOptional: string;
    shirtLength: string;
    sleeveLength: string;
    waist: string;
    chest: string;
    bottomHem: string;
    shoulder: string;
    freeOfCharge: string;
    addToBag: string;
    addedFeedback: string;
    recommendationsTitle: string;
    selectFit: string;
    selectSize: string;
    chooseFitAndSizeTitle: string;
    chooseFitSizeHint: string;
    continueBtn: string;
    readMore: string;
    showLess: string;
    change: string;
    showMoreMeasurements: string;
    showFewerMeasurements: string;
    cuffShowcaseCaption: string;
  };
  b2b: {
    portalTitle: string;
    infoRequired: string;
    moqBanner: string;
    sizeBreakdown: string;
    totalPieces: string;
    bodyFit: string;
    notesForSupplier: string;
    collarType: string;
    cuffType: string;
    saveAddColour: string;
    doneChoosing: string;
    allCategoriesTab: string;
  };
  checkout: {
    bagTitle: string;
    emptyBag: string;
    subtotal: string;
    proceedToCheckout: string;
    checkoutTitle: string;
    shippingDetails: string;
    dhlDelivery: string;
    paymentMethod: string;
    placeOrder: string;
    discountPlaceholder: string;
    apply: string;
    orderConfirmed: string;
    bankTransferInstructions: string;
    dhlTrackingPending: string;
    fullName: string;
    email: string;
    phone: string;
    city: string;
    address: string;
    postalCode: string;
    orderSummary: string;
    dhlShipping: string;
    includedVat: string;
    totalLabel: string;
  };
  footer: {
    aboutHeading: string;
    aboutText: string;
    contactHeading: string;
    contactNote: string;
    addressHeading: string;
    infoHeading: string;
    followHeading: string;
    newsletterLabel: string;
    newsletterPlaceholder: string;
    send: string;
    cookieNotice: string;
    infoLinks: string[];
  };
  aboutPage: {
    eyebrow: string;
    title: string;
    lead: string;
    paragraphs: string[];
    pillars: Array<{ title: string; body: string }>;
    showroomHeading: string;
    showroomAddress: string;
    ctaCatalog: string;
    ctaB2B: string;
  };
  promo: {
    floatingTrigger: string;
    emailPlaceholder: string;
    submitting: string;
    successPrefix: string;
    firstOrderNote: string;
    close: string;
  };
  bulk: {
    unlockedLabel: string;
    upsellTemplate: string;
    bulkDiscountRow: string;
  };
  ai: {
    agentPlaceholder: string;
    askButton: string;
    thinking: string;
    viewShirt: string;
    addToBag: string;
    poweredByPrefix: string;
    clearChat: string;
  };
}

export const TRANSLATIONS: Record<RegionCode, RegionCopy> = {
  en: {
    nav: {
      b2b: 'B2B',
      b2c: 'B2C',
      search: 'Search',
      account: 'My Account',
      wishlist: 'Wishlist',
      admin: 'Staff Portal',
      aboutUs: 'About Us',
      regionLabel: 'Region / Currency',
      selectRegionHeading: 'SELECT YOUR REGION / CURRENCY',
      allShirts: 'All Men’s Shirts',
      home: 'Home',
      megaCategories: [
        { label: "MEN'S SHIRTS", category: 'all', image: '/src/assets/images/editorial_casual_linen_1795248294319.jpg' },
        { label: 'LINEN SHIRTS', category: 'linen', image: '/src/assets/images/shirt_beige_linen_1795248293982.jpg' },
        { label: 'BUSINESS TWO-PLY', category: 'business', image: '/src/assets/images/shirt_blue_business_1795248293673.jpg' },
        { label: 'OXFORD & FLANNEL', category: 'oxford', image: '/src/assets/images/hero_oxford_olive_1795248294228.jpg' },
      ],
    },
    hero: {
      slide1Title: 'ALL YEAR AROUND',
      slide1Sub: 'ITALIAN OXFORD & TWO-PLY COLLECTION — TREVISO 1974',
      slide1Cta: 'Explore Collection',
      slide2Title: 'BREATHABLE ITALIAN LINEN',
      slide2Sub: 'COMPLIMENTARY BESPOKE SLEEVE & SHIRT LENGTH TAILORING',
      slide2Cta: 'Shop Linen Shirts',
    },
    home: {
      casualTitle: 'CASUAL LINEN SHIRTS',
      casualDesc:
        'Our most breathable casual shirts for warm climates. Tailored from 100% natural European linen with complimentary custom sleeve and body length.',
      b2bTitle: 'CORPORATE AGREEMENT',
      b2bDesc:
        'Elevate your corporate identity with embroidered uniform shirts. Tailored B2B agreements built for hospitality, aviation, and executive teams.',
      businessTitle: 'BUSINESS SHIRTS',
      businessDesc:
        'Our signature wrinkle-resistant 100/2-ply cotton dress shirts. Tightly woven in Treviso with complimentary bespoke sleeve and shirt length.',
      guideTitle: 'GUIDE: HOW TO MEASURE YOUR SHIRT.',
      guideSub: 'Precision sizing & fabric weave overview',
      inspirationTitle: 'ADVICE & INSPIRATION',
      inspirationSub: 'Italian heritage tailoring since 1974',
    },
    catalog: {
      allCategories: 'All Shirts',
      availablePrefix: 'In stock',
      preorderTag: 'Pre-order',
      outOfStockTag: 'Sold out',
      searchPlaceholder: 'Search fabric, SKU, or color...',
      emptyResult: 'No shirts match this regional filter.',
      loadMore: 'Load More Products',
      quickView: 'Configure & Buy',
    },
    pdp: {
      freeShippingBanner: 'Free DHL shipping on qualifying orders · Worldwide dispatch',
      backToCatalog: 'Back to catalog',
      available: 'Available',
      preorder: 'Available for Pre-order',
      outOfStock: 'Out of stock in this region',
      returnForm: 'Return form',
      sizeGuide: 'Size Guide',
      fitAndSizeRequired: '* Fit & Size (Required)',
      chooseCollar: 'Choose collar (optional)',
      chooseCuff: 'Choose cuff (optional)',
      tailoringOptional: 'Tailoring (optional)',
      shirtLength: 'Shirt length',
      sleeveLength: 'Sleeve length',
      waist: 'Waist',
      chest: 'Chest',
      bottomHem: 'Bottom hem',
      shoulder: 'Shoulder',
      freeOfCharge: 'Free of charge',
      addToBag: 'Add to bag',
      addedFeedback: 'Added to bag',
      recommendationsTitle: 'Shirts: Our recommendations',
      selectFit: 'Fit',
      selectSize: 'Collar / Size',
      chooseFitAndSizeTitle: 'Choose fit and size',
      chooseFitSizeHint: 'Choose fit + size',
      continueBtn: 'CONTINUE',
      readMore: 'Read more...',
      showLess: 'Show less',
      change: 'Change',
      showMoreMeasurements: 'Show more measurements',
      showFewerMeasurements: 'Show fewer measurements',
      cuffShowcaseCaption: 'Cuff Atelier Showcase',
    },
    b2b: {
      portalTitle: 'MONTE CONNECTED B2B',
      infoRequired: 'INFORMATION REQUIRED FOR QUOTATION',
      moqBanner: 'TOTAL MOQ 20 PCS/COLOR',
      sizeBreakdown: 'Size Breakdown',
      totalPieces: 'TOTAL PIECES',
      bodyFit: 'BODY FIT',
      notesForSupplier: 'NOTES FOR SUPPLIER',
      collarType: 'COLLAR TYPE',
      cuffType: 'CUFF TYPE',
      saveAddColour: 'SAVE & ADD NEW COLOUR',
      doneChoosing: "I'M DONE CHOOSING",
      allCategoriesTab: 'All Shirts',
    },
    checkout: {
      bagTitle: 'Your Shopping Bag',
      emptyBag: 'Your shopping bag is currently empty.',
      subtotal: 'Subtotal',
      proceedToCheckout: 'Proceed to Checkout',
      checkoutTitle: 'International Checkout',
      shippingDetails: 'Delivery Address',
      dhlDelivery: 'DHL Express & Courier Options',
      paymentMethod: 'Payment Method',
      placeOrder: 'Complete Order',
      discountPlaceholder: 'Promo code (e.g. MONTE10)',
      apply: 'Apply',
      orderConfirmed: 'Order Confirmed',
      bankTransferInstructions: 'Bank Transfer Instructions',
      dhlTrackingPending: 'Awaiting DHL Waybill Dispatch',
      fullName: 'Full Name *',
      email: 'Email Address *',
      phone: 'Phone Number *',
      city: 'City *',
      address: 'Street Address *',
      postalCode: 'Postal Code *',
      orderSummary: 'Order Summary',
      dhlShipping: 'DHL Shipping',
      includedVat: 'Included VAT',
      totalLabel: 'Total',
    },
    footer: {
      aboutHeading: 'About Us',
      aboutText:
        'Monte Napoleone was founded in Treviso, Italy in 1974. Ever since, we have crafted exclusive shirts defined by timeless elegance and uncompromising two-ply textiles.',
      contactHeading: 'Contact',
      contactNote:
        'We respond to all customer and bespoke tailoring inquiries within 24 hours.',
      addressHeading: 'Showroom',
      infoHeading: 'Information',
      followHeading: 'Follow Us',
      newsletterLabel: 'Newsletter',
      newsletterPlaceholder: 'Enter your email',
      send: 'Send',
      cookieNotice:
        'Regional pricing, warehouse inventory, and payment methods adapt dynamically to your selected country.',
      infoLinks: [
        'Returns & Exchanges',
        'Withdrawal Form',
        'Stockists & Partners',
        'Careers',
        'FAQ',
        'Privacy Policy',
      ],
    },
    aboutPage: {
      eyebrow: 'TREVISO, ITALY · ESTABLISHED 1974',
      title: 'Timeless Italian Shirt Craftsmanship — Now Tailored Worldwide',
      lead: 'Monte Napoleone was founded in Treviso, Italy in 1974 with a singular dedication: weaving two-ply cotton and European linen into shirts that hold their poise from morning meetings in Oslo to evenings in Milan.',
      paragraphs: [
        'For more than five decades, our family-led atelier has combined Northern Italian pattern precision with modern Scandinavian direct-to-wardrobe simplicity. Every dress and leisure shirt begins with extra-long-staple 100/2-ply cotton or breathable Normandy flax woven for lasting drape and crisp collars.',
        'True fit is never one-size-fits-all. That is why every online and showroom shirt at Monte Napoleone 1974 includes complimentary custom sleeve length and shirt body length tailoring before dispatch — alongside optional waist, chest, bottom hem, and shoulder adjustments.',
        'In addition to our direct consumer (B2C) collection, we partner with Nordic and European hotels, aviation teams, and executive offices through Monte Connected B2B corporate uniform programs with custom cuff and chest embroidery.',
      ],
      pillars: [
        {
          title: 'Two-Ply 100/2 Weaving',
          body: 'Double-twisted yarns deliver natural wrinkle recovery, silky skin feel, and wash-after-wash collar structure.',
        },
        {
          title: 'Complimentary Length Tailoring',
          body: 'Adjust sleeve and shirt length free of charge on every shirt — calibrated per collar size from 30 to 45.',
        },
        {
          title: 'Oslo & Treviso Showrooms',
          body: 'Regional fulfillment from Treviso Atelier, Gulbrandsens Agencies AS in Oslo, and Ho Chi Minh City Hub.',
        },
      ],
      showroomHeading: 'Nordic Showroom & Representation',
      showroomAddress: 'Gulbrandsens Agencies AS · Maridalsveien 87, 0461 Oslo, Norway · monte@montenapoleone1974.com',
      ctaCatalog: 'Explore Shirt Collection',
      ctaB2B: 'Corporate B2B Agreements',
    },
    promo: {
      floatingTrigger: '10% OFF FIRST ORDER',
      emailPlaceholder: 'Enter your email address',
      submitting: 'Subscribing...',
      successPrefix: 'Your code has been unlocked and synced with Mailchimp:',
      firstOrderNote: 'Valid on your first Monte Napoleone 1974 order.',
      close: 'Close',
    },
    bulk: {
      unlockedLabel: 'Bulk savings unlocked',
      upsellTemplate: 'Add {qty} more shirt(s) to unlock {pct}% bulk purchase discount',
      bulkDiscountRow: 'Bulk Purchase Discount',
    },
    ai: {
      agentPlaceholder: 'Ask Agent: find linen shirts or add size 40 to bag...',
      askButton: 'Ask Agent',
      thinking: 'Checking Treviso atelier & stock...',
      viewShirt: 'View Shirt',
      addToBag: 'Add to Bag',
      poweredByPrefix: 'Tailor Agent',
      clearChat: 'Reset',
    },
  },
  no: {
    nav: {
      b2b: 'B2B',
      b2c: 'B2C',
      search: 'Søk',
      account: 'Min Konto',
      wishlist: 'Ønskeliste',
      admin: 'Admin',
      aboutUs: 'Om oss',
      regionLabel: 'Region / Valuta',
      selectRegionHeading: 'VELG DIN REGION / VALUTA',
      allShirts: 'Alle Herreskjorter',
      home: 'Hjem',
      megaCategories: [
        { label: 'HERRE SKJORTER', category: 'all', image: '/src/assets/images/editorial_casual_linen_1795248294319.jpg' },
        { label: 'LINSKJORTER', category: 'linen', image: '/src/assets/images/shirt_beige_linen_1795248293982.jpg' },
        { label: 'BUSINESS SKJORTER', category: 'business', image: '/src/assets/images/shirt_blue_business_1795248293673.jpg' },
        { label: 'OXFORD & FLANELL', category: 'oxford', image: '/src/assets/images/hero_oxford_olive_1795248294228.jpg' },
      ],
    },
    hero: {
      slide1Title: 'ALL YEAR AROUND',
      slide1Sub: 'OXFORD & TWO-PLY KOLLEKSJON — SKREDDERSYDD SIDEN 1974',
      slide1Cta: 'Se Kolleksjonen',
      slide2Title: 'EKSKLUSIVE LINSKJORTER',
      slide2Sub: 'KOSTNADSFRITT SKREDDERSYDD ERME- OG SKJORTELENGDE',
      slide2Cta: 'Kjøp Linskjorter',
    },
    home: {
      casualTitle: 'FRITIDSSKJORTER',
      casualDesc:
        'Våre mest komfortable fritidsskjorter for vår og sommer – perfekt plagg for varme dager. Vi tilbyr kostnadsfritt skreddersydd erme- og skjortelengde.',
      b2bTitle: 'BEDRIFTSAVTALE',
      b2bDesc:
        'Styrk ditt bedriftsimage med skjorteuniform med brodert logo. Skreddersydde bedriftsavtaler for selskaper som bruker skjorter daglig.',
      businessTitle: 'BUSINESS SKJORTER',
      businessDesc:
        'Vår strykefrie signaturskjorte tettvevet i 100/2-ply kvalitet. Vi tilbyr kostnadsfritt og eksklusivt skreddersydd erme- og skjortelengde.',
      guideTitle: 'GUIDE: SLIK MÅLER DU DIN SKJORTE RIKTIG.',
      guideSub: 'Oversikt over skjortestoffer og passform',
      inspirationTitle: 'RÅD & INSPIRASJON',
      inspirationSub: 'Italiensk håndverk fra Treviso siden 1974',
    },
    catalog: {
      allCategories: 'Alle Skjorter',
      availablePrefix: 'På lager',
      preorderTag: 'Pre-order',
      outOfStockTag: 'Utsolgt',
      searchPlaceholder: 'Søk etter stoff, SKU eller farge...',
      emptyResult: 'Ingen skjorter funnet i dette utvalget.',
      loadMore: 'Last inn flere produkter',
      quickView: 'Velg passform',
    },
    pdp: {
      freeShippingBanner: 'Gratis frakt over 2 500 kr · Hjemlevering med DHL Express',
      backToCatalog: 'Tilbake til oversikt',
      available: 'Tilgjengelig',
      preorder: 'Forhåndsbestilling',
      outOfStock: 'Utsolgt i Norge',
      returnForm: 'Returskjema',
      sizeGuide: 'Størrelsesguide',
      fitAndSizeRequired: '* Passform & Størrelse (Påkrevd)',
      chooseCollar: 'Velg krage (valgfritt)',
      chooseCuff: 'Velg mansjett (valgfritt)',
      tailoringOptional: 'Skreddersøm (valgfritt)',
      shirtLength: 'Skjortelengde',
      sleeveLength: 'Ermelengde',
      waist: 'Midje',
      chest: 'Bryst',
      bottomHem: 'Nederkant',
      shoulder: 'Skulder',
      freeOfCharge: 'Kostnadsfritt',
      addToBag: 'Legg i handlepose',
      addedFeedback: 'Lagt i handleposen',
      recommendationsTitle: 'Skjorter: Våre anbefalinger',
      selectFit: 'Passform',
      selectSize: 'Størrelse',
      chooseFitAndSizeTitle: 'Velg passform og størrelse',
      chooseFitSizeHint: 'Velg passform + størrelse',
      continueBtn: 'FORTSETT',
      readMore: 'Les mer...',
      showLess: 'Vis mindre',
      change: 'Endre',
      showMoreMeasurements: 'Vis flere mål',
      showFewerMeasurements: 'Vis færre mål',
      cuffShowcaseCaption: 'Mansjett-galleri',
    },
    b2b: {
      portalTitle: 'MONTE CONNECTED B2B',
      infoRequired: 'INFORMASJON PÅKREVD FOR TILBUD',
      moqBanner: 'TOTAL MOQ 20 STK/FARGE',
      sizeBreakdown: 'Størrelsesfordeling',
      totalPieces: 'TOTALT ANTALL',
      bodyFit: 'PASSFORM',
      notesForSupplier: 'NOTATER TIL LEVERANDØR',
      collarType: 'KRAGETYPE',
      cuffType: 'MANSJETT',
      saveAddColour: 'LAGRE & LEGG TIL NY FARGE',
      doneChoosing: 'JEG ER FERDIG MED Å VELGE',
      allCategoriesTab: 'Alle',
    },
    checkout: {
      bagTitle: 'Din Handlepose',
      emptyBag: 'Handleposen din er tom.',
      subtotal: 'Delsum',
      proceedToCheckout: 'Gå til Kassen',
      checkoutTitle: 'Norsk Kasse (inkl. 25% MVA)',
      shippingDetails: 'Leveringsadresse',
      dhlDelivery: 'DHL Levering (Oslo-lager)',
      paymentMethod: 'Betalingsmåte (Vipps, Kort, Faktura/Bank)',
      placeOrder: 'Fullfør Bestilling',
      discountPlaceholder: 'Rabattkode (f.eks. MONTE10)',
      apply: 'Bruk',
      orderConfirmed: 'Bestilling Bekreftet',
      bankTransferInstructions: 'Bankoverføring / KID-informasjon',
      dhlTrackingPending: 'Venter på DHL-sending fra Oslo',
      fullName: 'Fullt navn *',
      email: 'E-postadresse *',
      phone: 'Telefonnummer *',
      city: 'Poststed / By *',
      address: 'Gateadresse *',
      postalCode: 'Postnummer *',
      orderSummary: 'Ordresammendrag',
      dhlShipping: 'DHL Frakt',
      includedVat: 'Inkludert MVA',
      totalLabel: 'Totalt',
    },
    footer: {
      aboutHeading: 'Om oss',
      aboutText:
        'Monte Napoleone ble grunnlagt i Treviso, Italia i 1974. Siden den gang har vi skapt eksklusive skjorteprodukter preget av tidløs eleganse og kompromissløs kvalitet.',
      contactHeading: 'Kontakt',
      contactNote:
        'Vi besvarer alle henvendelser på e-post innen 24 timer.',
      addressHeading: 'Adresse',
      infoHeading: 'Informasjon',
      followHeading: 'Følg oss',
      newsletterLabel: 'Nyhetsbrev',
      newsletterPlaceholder: 'Din e-postadresse',
      send: 'Send',
      cookieNotice:
        'Norske priser inkluderer 25 % MVA med utsendelse fra vårt Oslo-showroom.',
      infoLinks: [
        'Retur og bytte',
        'Angrefrist skjema',
        'Forhandlere og partnere',
        'Karriere og jobbmuligheter',
        'Ofte Stilte Spørsmål',
        'Personvernerklæring',
      ],
    },
    aboutPage: {
      eyebrow: 'TREVISO, ITALIA · ETABLERT 1974',
      title: 'Om Monte Napoleone 1974 — Italiensk Skjortekunst Siden 1974',
      lead: 'Monte Napoleone ble grunnlagt i Treviso, Italia i 1974. Siden den gang har vi skapt eksklusive skjorter preget av tidløs italiensk eleganse, kompromissløs tekstilkvalitet og perfekt passform.',
      paragraphs: [
        'Gjennom mer enn fem tiår har vår filosofi vært enkel: å kombinere norditaliensk skreddertradisjon med slitesterke to-tråds stoffer (100/2-ply cotton) og pustende europeisk lin som holder fasongen hele dagen – fra styremøter i Oslo til sommerkvelder ved Middelhavet.',
        'Ingen kropper er helt like. Derfor inkluderer hver eneste skjorte hos Monte Napoleone 1974 kostnadsfritt skreddersydd erme- og skjortelengde før utsendelse, samt valgfri tilpasning av midje, bryst, nederkant og skuldre i vår skreddersøm-konfigurator.',
        'Via vårt nordiske showroom i Maridalsveien 87 i Oslo (Gulbrandsens Agencies AS) betjener vi både privatkunder (B2C) og bedriftskunder (B2B) som ønsker skjorteuniformer med brodert firmalogo og rask levering med DHL Express.',
      ],
      pillars: [
        {
          title: 'Two-Ply 100/2-kvalitet',
          body: 'Tettvevde dobbeltvridde bomullstråder gir naturlig krøllmotstand, fast krage og silkemyk komfort.',
        },
        {
          title: 'Gratis Skreddersøm på Lengde',
          body: 'Tilpass erme- og skjortelengde kostnadsfritt på alle modeller – basert på eksakte mål fra størrelse 30 til 45.',
        },
        {
          title: 'Norsk Lager & Oslo Showroom',
          body: 'Priser inkludert 25 % norsk MVA, Vipps-betaling og rask levering fra vårt showroom på Sagene i Oslo.',
        },
      ],
      showroomHeading: 'Norsk Showroom & Representasjon',
      showroomAddress: 'Gulbrandsens Agencies AS · Maridalsveien 87, 0461 Oslo, Norge · monte@montenapoleone1974.com',
      ctaCatalog: 'Utforsk Alle Skjorter',
      ctaB2B: 'Se Bedriftsavtale (B2B)',
    },
    promo: {
      floatingTrigger: '10% PÅ FØRSTE KJØP',
      emailPlaceholder: 'Skriv inn din e-postadresse',
      submitting: 'Registrerer...',
      successPrefix: 'Din rabattkode er aktivert og synkronisert med Mailchimp:',
      firstOrderNote: 'Gjelder din første bestilling hos Monte Napoleone 1974.',
      close: 'Lukk',
    },
    bulk: {
      unlockedLabel: 'Mengderabatt aktivert',
      upsellTemplate: 'Legg til {qty} skjorte(r) til for å få {pct}% mengderabatt',
      bulkDiscountRow: 'Mengderabatt',
    },
    ai: {
      agentPlaceholder: 'Spør Agent: finn linskjorter eller legg str 40 i pose...',
      askButton: 'Spør Agent',
      thinking: 'Sjekker Oslo-lager og skreddersøm...',
      viewShirt: 'Se skjorte',
      addToBag: 'Legg i posen',
      poweredByPrefix: 'Skredderagent',
      clearChat: 'Nullstill',
    },
  },
  it: {
    nav: {
      b2b: 'B2B',
      b2c: 'B2C',
      search: 'Cerca',
      account: 'Il Mio Account',
      wishlist: 'Preferiti',
      admin: 'Portale Staff',
      aboutUs: 'Chi Siamo',
      regionLabel: 'Regione / Valuta',
      selectRegionHeading: 'SELEZIONA REGIONE / VALUTA',
      allShirts: 'Tutte le Camicie',
      home: 'Home',
      megaCategories: [
        { label: 'CAMICIE UOMO', category: 'all', image: '/src/assets/images/editorial_casual_linen_1795248294319.jpg' },
        { label: 'CAMICIE IN LINO', category: 'linen', image: '/src/assets/images/shirt_beige_linen_1795248293982.jpg' },
        { label: 'BUSINESS DOPPIO RITORTO', category: 'business', image: '/src/assets/images/shirt_blue_business_1795248293673.jpg' },
        { label: 'OXFORD & FLANELLA', category: 'oxford', image: '/src/assets/images/hero_oxford_olive_1795248294228.jpg' },
      ],
    },
    hero: {
      slide1Title: 'TUTTO L’ANNO',
      slide1Sub: 'COLLEZIONE OXFORD & DOPPIO RITORTO — TREVISO 1974',
      slide1Cta: 'Scopri la Collezione',
      slide2Title: 'LINO ITALIANO PREGIATO',
      slide2Sub: 'LUNGHEZZA MANICHE E BUSTO SU MISURA GRATUITA',
      slide2Cta: 'Acquista Lino',
    },
    home: {
      casualTitle: 'CAMICIE IN LINO CASUAL',
      casualDesc:
        'Le nostre camicie più traspiranti per la primavera e l’estate in 100% lino naturale. Offriamo regolazione sartoriale gratuita di maniche e lunghezza.',
      b2bTitle: 'ACCORDI AZIENDALI B2B',
      b2bDesc:
        'Rafforza l’immagine aziendale con camicie uniformi con logo ricamato. Soluzioni su misura per hotel, compagnie e team direzionali.',
      businessTitle: 'CAMICIE BUSINESS',
      businessDesc:
        'La nostra iconica camicia bianca no-stiro in tessuto doppio ritorto 100/2-ply di Treviso, con sartoria gratuita su misura.',
      guideTitle: 'GUIDA: COME MISURARE LA TUA CAMICIA.',
      guideSub: 'Guida alle taglie e ai tessuti pregiati',
      inspirationTitle: 'CONSIGLI & ISPIRAZIONE',
      inspirationSub: 'Arte camiciaia dal 1974 a Treviso',
    },
    catalog: {
      allCategories: 'Tutte le Camicie',
      availablePrefix: 'Disponibili',
      preorderTag: 'Pre-ordine',
      outOfStockTag: 'Esaurito',
      searchPlaceholder: 'Cerca tessuto, SKU o colore...',
      emptyResult: 'Nessuna camicia trovata per questa selezione.',
      loadMore: 'Carica altri prodotti',
      quickView: 'Configura',
    },
    pdp: {
      freeShippingBanner: 'Spedizione DHL gratuita oltre €200 · Spedizione dall’Atelier di Treviso',
      backToCatalog: 'Torna al catalogo',
      available: 'Disponibile',
      preorder: 'Disponibile in Pre-ordine',
      outOfStock: 'Esaurito in Italia',
      returnForm: 'Modulo di reso',
      sizeGuide: 'Guida Taglie',
      fitAndSizeRequired: '* Vestibilità & Taglia (Obbligatorio)',
      chooseCollar: 'Scegli il colletto (opzionale)',
      chooseCuff: 'Scegli il polsino (opzionale)',
      tailoringOptional: 'Sartoria su misura (opzionale)',
      shirtLength: 'Lunghezza camicia',
      sleeveLength: 'Lunghezza manica',
      waist: 'Vita',
      chest: 'Torace',
      bottomHem: 'Fondo',
      shoulder: 'Spalle',
      freeOfCharge: 'Gratuito',
      addToBag: 'Aggiungi al carrello',
      addedFeedback: 'Aggiunto al carrello',
      recommendationsTitle: 'Camicie: I nostri consigli',
      selectFit: 'Vestibilità',
      selectSize: 'Taglia',
      chooseFitAndSizeTitle: 'Scegli vestibilità e taglia',
      chooseFitSizeHint: 'Scegli vestibilità + taglia',
      continueBtn: 'CONTINUA',
      readMore: 'Leggi di più...',
      showLess: 'Mostra meno',
      change: 'Modifica',
      showMoreMeasurements: 'Mostra altre misure',
      showFewerMeasurements: 'Mostra meno misure',
      cuffShowcaseCaption: 'Dettagli Polsino',
    },
    b2b: {
      portalTitle: 'MONTE CONNECTED B2B',
      infoRequired: 'INFORMAZIONI RICHIESTE PER PREVENTIVO',
      moqBanner: 'MOQ TOTALE 20 PZ/COLORE',
      sizeBreakdown: 'Ripartizione Taglie',
      totalPieces: 'PEZZI TOTALI',
      bodyFit: 'VESTIBILITÀ',
      notesForSupplier: 'NOTE PER IL FORNITORE',
      collarType: 'TIPO DI COLLETTO',
      cuffType: 'TIPO DI POLSINO',
      saveAddColour: 'SALVA E AGGIUNGI COLORE',
      doneChoosing: 'HO TERMINATO LA SCELTA',
      allCategoriesTab: 'Tutte',
    },
    checkout: {
      bagTitle: 'La Tua Borsa',
      emptyBag: 'La tua borsa è attualmente vuota.',
      subtotal: 'Subtotale',
      proceedToCheckout: 'Procedi al Checkout',
      checkoutTitle: 'Checkout Italia (IVA 22% inclusa)',
      shippingDetails: 'Indirizzo di Spedizione',
      dhlDelivery: 'Corriere DHL Express Italia',
      paymentMethod: 'Metodo di Pagamento (Carta, PayPal, Bonifico SEPA)',
      placeOrder: 'Conferma Ordine',
      discountPlaceholder: 'Codice promo (es. MONTE10)',
      apply: 'Applica',
      orderConfirmed: 'Ordine Confermato',
      bankTransferInstructions: 'Coordinate Bonifico Bancario SEPA',
      dhlTrackingPending: 'In attesa di lettera di vettura DHL',
      fullName: 'Nome Completo *',
      email: 'Indirizzo Email *',
      phone: 'Telefono *',
      city: 'Città *',
      address: 'Indirizzo *',
      postalCode: 'CAP *',
      orderSummary: 'Riepilogo Ordine',
      dhlShipping: 'Spedizione DHL',
      includedVat: 'IVA Inclusa',
      totalLabel: 'Totale',
    },
    footer: {
      aboutHeading: 'Chi Siamo',
      aboutText:
        'Monte Napoleone nasce a Treviso nel 1974. Da cinquant’anni realizziamo camicie d’eccellenza con i migliori cotoni doppio ritorto e lini europei.',
      contactHeading: 'Contatti',
      contactNote:
        'Rispondiamo a tutte le richieste entro 24 ore lavorative.',
      addressHeading: 'Atelier',
      infoHeading: 'Informazioni',
      followHeading: 'Seguici',
      newsletterLabel: 'Newsletter',
      newsletterPlaceholder: 'La tua email',
      send: 'Invia',
      cookieNotice:
        'Prezzi in Euro comprensivi di IVA 22% con spedizione diretta dal magazzino di Treviso.',
      infoLinks: [
        'Resi e Cambi',
        'Modulo di Recesso',
        'Rivenditori e Partner',
        'Lavora con Noi',
        'Domande Frequenti',
        'Privacy Policy',
      ],
    },
    aboutPage: {
      eyebrow: 'TREVISO, ITALIA · DAL 1974',
      title: 'La Storia di Monte Napoleone 1974 — L’Arte della Camicia Italiana',
      lead: 'Fondata a Treviso nel 1974, Monte Napoleone realizza da cinquant’anni camicie esclusive caratterizzate da eleganza senza tempo, tessuti doppio ritorto 100/2 e vestibilità sartoriale.',
      paragraphs: [
        'Ogni nostro capo nasce dalla selezione dei migliori cotoni doppio ritorto e lini europei, lavorati per garantire morbidezza sulla pelle, resistenza alle pieghe e una tenuta impeccabile del colletto dal mattino alla sera.',
        'La vestibilità perfetta richiede attenzione al dettaglio: per questo includiamo la regolazione gratuita della lunghezza maniche e del busto su ogni camicia, insieme alla possibilità di personalizzare vita, torace, fondo e spalle.',
        'Oltre alle collezioni B2C per l’uomo contemporaneo, Monte Connected B2B supporta hotel, compagnie aeree e team aziendali in tutta Europa con forniture su misura e ricamo logo.',
      ],
      pillars: [
        {
          title: 'Tessuti Doppio Ritorto',
          body: 'Filati ritorti ad alta densità per camicie business no-stiro e lini freschi per la stagione calda.',
        },
        {
          title: 'Sartoria Lunghezza Inclusa',
          body: 'Regolazione gratuita della lunghezza di maniche e camicia per ogni taglia dalla 30 alla 45.',
        },
        {
          title: 'Atelier Treviso & Hub Internazionali',
          body: 'Spedizione diretta dall’Italia con corriere DHL Express e showroom di rappresentanza a Oslo.',
        },
      ],
      showroomHeading: 'Sede & Rappresentanza Nordica',
      showroomAddress: 'Gulbrandsens Agencies AS · Maridalsveien 87, 0461 Oslo, Norvegia · monte@montenapoleone1974.com',
      ctaCatalog: 'Esplora la Collezione',
      ctaB2B: 'Soluzioni Aziendali B2B',
    },
    promo: {
      floatingTrigger: '10% SUL PRIMO ORDINE',
      emailPlaceholder: 'Inserisci la tua email',
      submitting: 'Iscrizione...',
      successPrefix: 'Codice sconto attivato e sincronizzato con Mailchimp:',
      firstOrderNote: 'Valido sul tuo primo ordine Monte Napoleone 1974.',
      close: 'Chiudi',
    },
    bulk: {
      unlockedLabel: 'Sconto quantità attivo',
      upsellTemplate: 'Aggiungi ancora {qty} camicie per ottenere il {pct}% di sconto quantità',
      bulkDiscountRow: 'Sconto Acquisto Multiplo',
    },
    ai: {
      agentPlaceholder: 'Chiedi all’Agente: camicie in lino o taglia 40...',
      askButton: 'Chiedi',
      thinking: 'Consultando l’atelier di Treviso...',
      viewShirt: 'Vedi Camicia',
      addToBag: 'Aggiungi',
      poweredByPrefix: 'Agente Sartoriale',
      clearChat: 'Ripristina',
    },
  },
  vn: {
    nav: {
      b2b: 'B2B',
      b2c: 'B2C',
      search: 'Tìm kiếm',
      account: 'Tài khoản',
      wishlist: 'Yêu thích',
      admin: 'Quản trị',
      aboutUs: 'Về Chúng Tôi',
      regionLabel: 'Khu vực / Tiền tệ',
      selectRegionHeading: 'CHỌN KHU VỰC / TIỀN TỆ',
      allShirts: 'Tất cả Áo Sơ Mi',
      home: 'Trang chủ',
      megaCategories: [
        { label: 'ÁO SƠ MI NAM', category: 'all', image: '/src/assets/images/editorial_casual_linen_1795248294319.jpg' },
        { label: 'ÁO SƠ MI LINEN', category: 'linen', image: '/src/assets/images/shirt_beige_linen_1795248293982.jpg' },
        { label: 'ÁO CÔNG SỞ TWO-PLY', category: 'business', image: '/src/assets/images/shirt_blue_business_1795248293673.jpg' },
        { label: 'OXFORD & FLANNEL', category: 'oxford', image: '/src/assets/images/hero_oxford_olive_1795248294228.jpg' },
      ],
    },
    hero: {
      slide1Title: 'PHONG CÁCH QUANH NĂM',
      slide1Sub: 'BỘ SƯU TẬP OXFORD & VẢI SỢI ĐÔI Ý — TREVISO 1974',
      slide1Cta: 'Khám phá Bộ sưu tập',
      slide2Title: 'LINEN Ý CAO CẤP THOÁNG MÁT',
      slide2Sub: 'MIỄN PHÍ ĐO CHỈNH CHIỀU DÀI TAY VÀ THÂN ÁO',
      slide2Cta: 'Mua Áo Linen',
    },
    home: {
      casualTitle: 'ÁO SƠ MI LINEN THƯỜNG NGÀY',
      casualDesc:
        'Dòng áo linen 100% tự nhiên thoáng khí tối ưu cho khí hậu nhiệt đới Việt Nam. Miễn phí điều chỉnh chiều dài tay và thân áo theo số đo.',
      b2bTitle: 'HỢP ĐỒNG ĐỒNG PHỤC B2B',
      b2bDesc:
        'Nâng tầm hình ảnh doanh nghiệp với áo sơ mi đồng phục thêu logo riêng. Giải pháp chuyên biệt cho khách sạn, hàng không và khối văn phòng.',
      businessTitle: 'ÁO SƠ MI CÔNG SỞ CAO CẤP',
      businessDesc:
        'Áo sơ mi trắng chống nhăn trứ danh dệt mật độ cao Two-Ply 100/2 từ Ý, tặng kèm dịch vụ cắt chỉnh chiều dài tay áo chuẩn xác.',
      guideTitle: 'HƯỚNG DẪN: CÁCH ĐO ÁO SƠ MI CHUẨN XÁC.',
      guideSub: 'Tìm hiểu chất liệu vải & bảng thông số đo',
      inspirationTitle: 'TƯ VẤN & CẢM HỨNG',
      inspirationSub: 'Di sản may đo Ý từ năm 1974',
    },
    catalog: {
      allCategories: 'Tất cả Áo Sơ Mi',
      availablePrefix: 'Còn hàng',
      preorderTag: 'Đặt trước',
      outOfStockTag: 'Hết hàng',
      searchPlaceholder: 'Tìm chất liệu, mã SKU hoặc màu sắc...',
      emptyResult: 'Không tìm thấy sản phẩm phù hợp tại kho Việt Nam.',
      loadMore: 'Xem thêm sản phẩm',
      quickView: 'Tùy chỉnh & Mua',
    },
    pdp: {
      freeShippingBanner: 'Miễn phí vận chuyển DHL cho đơn từ 5.000.000 ₫ · Kho TP.HCM & Treviso',
      backToCatalog: 'Quay lại danh mục',
      available: 'Sẵn kho',
      preorder: 'Đặt may trước (Pre-order)',
      outOfStock: 'Tạm hết hàng tại Việt Nam',
      returnForm: 'Phiếu đổi trả',
      sizeGuide: 'Bảng Size',
      fitAndSizeRequired: '* Phom dáng & Kích cỡ (Bắt buộc)',
      chooseCollar: 'Chọn cổ áo (tùy chọn)',
      chooseCuff: 'Chọn măng sét (tùy chọn)',
      tailoringOptional: 'May đo riêng (tùy chọn)',
      shirtLength: 'Độ dài thân áo',
      sleeveLength: 'Độ dài tay áo',
      waist: 'Vòng eo',
      chest: 'Vòng ngực',
      bottomHem: 'Gấu áo',
      shoulder: 'Rộng vai',
      freeOfCharge: 'Miễn phí',
      addToBag: 'Thêm vào giỏ hàng',
      addedFeedback: 'Đã thêm vào giỏ',
      recommendationsTitle: 'Áo sơ mi: Gợi ý dành cho bạn',
      selectFit: 'Phom dáng',
      selectSize: 'Cỡ cổ / Size',
      chooseFitAndSizeTitle: 'Chọn phom dáng & kích cỡ',
      chooseFitSizeHint: 'Chọn phom + kích cỡ',
      continueBtn: 'TIẾP TỤC',
      readMore: 'Xem thêm...',
      showLess: 'Thu gọn',
      change: 'Thay đổi',
      showMoreMeasurements: 'Xem thêm thông số đo',
      showFewerMeasurements: 'Thu gọn thông số đo',
      cuffShowcaseCaption: 'Chi tiết Măng sét',
    },
    b2b: {
      portalTitle: 'MONTE CONNECTED B2B',
      infoRequired: 'THÔNG TIN BÁO GIÁ DOANH NGHIỆP',
      moqBanner: 'TỐI THIỂU 20 ÁO/MÀU',
      sizeBreakdown: 'Phân bổ kích cỡ',
      totalPieces: 'TỔNG SỐ LƯỢNG',
      bodyFit: 'PHOM DÁNG',
      notesForSupplier: 'GHI CHÚ CHO NHÀ MAY',
      collarType: 'KIỂU CỔ ÁO',
      cuffType: 'KIỂU MĂNG SÉT',
      saveAddColour: 'LƯU & THÊM MÀU KHÁC',
      doneChoosing: 'HOÀN TẤT CHỌN MẪU',
      allCategoriesTab: 'Tất cả',
    },
    checkout: {
      bagTitle: 'Giỏ hàng của bạn',
      emptyBag: 'Giỏ hàng hiện đang trống.',
      subtotal: 'Tạm tính',
      proceedToCheckout: 'Tiến hành Thanh toán',
      checkoutTitle: 'Thanh toán tại Việt Nam (Đã gồm VAT 10%)',
      shippingDetails: 'Địa chỉ nhận hàng',
      dhlDelivery: 'Vận chuyển DHL Express Việt Nam',
      paymentMethod: 'Phương thức thanh toán (Thẻ, PayPal, Chuyển khoản Ngân hàng)',
      placeOrder: 'Hoàn tất Đơn hàng',
      discountPlaceholder: 'Mã ưu đãi (vd: MONTE10)',
      apply: 'Áp dụng',
      orderConfirmed: 'Đặt hàng Thành công',
      bankTransferInstructions: 'Thông tin Chuyển khoản Ngân hàng Nội địa',
      dhlTrackingPending: 'Đang chờ cấp mã vận đơn DHL',
      fullName: 'Họ và tên *',
      email: 'Địa chỉ Email *',
      phone: 'Số điện thoại *',
      city: 'Tỉnh / Thành phố *',
      address: 'Địa chỉ nhận hàng *',
      postalCode: 'Mã bưu chính *',
      orderSummary: 'Tóm tắt Đơn hàng',
      dhlShipping: 'Phí vận chuyển DHL',
      includedVat: 'Thuế VAT đã bao gồm',
      totalLabel: 'Tổng thanh toán',
    },
    footer: {
      aboutHeading: 'Về chúng tôi',
      aboutText:
        'Monte Napoleone được thành lập tại Treviso, Ý năm 1974. Chúng tôi kiến tạo những chiếc áo sơ mi tinh xảo từ chất liệu linen và cotton sợi đôi thượng hạng.',
      contactHeading: 'Liên hệ',
      contactNote:
        'Mọi yêu cầu tư vấn số đo và đơn hàng doanh nghiệp sẽ được phản hồi trong vòng 24 giờ.',
      addressHeading: 'Showroom',
      infoHeading: 'Thông tin',
      followHeading: 'Kết nối',
      newsletterLabel: 'Bản tin ưu đãi',
      newsletterPlaceholder: 'Nhập email của bạn',
      send: 'Gửi',
      cookieNotice:
        'Giá bán bằng VNĐ và tồn kho được đồng bộ trực tiếp theo kho hàng khu vực Việt Nam.',
      infoLinks: [
        'Chính sách Đổi trả',
        'Phiếu hoàn hàng',
        'Đối tác & Đại lý',
        'Tuyển dụng',
        'Câu hỏi thường gặp',
        'Chính sách bảo mật',
      ],
    },
    aboutPage: {
      eyebrow: 'TREVISO, Ý · THÀNH LẬP NĂM 1974',
      title: 'Về Monte Napoleone 1974 — Di Sản May Đo Áo Sơ Mi Ý',
      lead: 'Được thành lập tại Treviso, Ý từ năm 1974, Monte Napoleone kiến tạo những chiếc áo sơ mi nam đẳng cấp từ chất liệu cotton sợi đôi 100/2-ply và linen tự nhiên châu Âu với độ chuẩn xác may đo tinh tế.',
      paragraphs: [
        'Hơn nửa thế kỷ qua, xưởng may tại miền Bắc nước Ý của chúng tôi luôn giữ vững triết lý kết hợp nghệ thuật cắt may thủ công cùng chất liệu sợi xoắn đôi chống nhăn tự nhiên, giúp người mặc luôn lịch lãm từ phòng họp đến những buổi tiệc tối.',
        'Mỗi vóc dáng đều có tỷ lệ riêng biệt. Vì vậy, tất cả sản phẩm Monte Napoleone 1974 đều được miễn phí đo chỉnh chiều dài tay áo và chiều dài thân áo trước khi giao hàng, kèm tùy chọn tinh chỉnh vòng eo, vòng ngực, gấu áo và vai.',
        'Bên cạnh dòng sản phẩm B2C bán lẻ toàn cầu qua kho TP.HCM, Oslo và Treviso, chúng tôi còn cung cấp giải pháp đồng phục doanh nghiệp Monte Connected B2B với dịch vụ thêu logo tinh xảo cho khối khách sạn, hàng không và tập đoàn.',
      ],
      pillars: [
        {
          title: 'Vải Sợi Đôi Two-Ply 100/2',
          body: 'Cấu trúc sợi xe đôi giúp bề mặt vải mịn màng, thoáng khí và giữ phom cổ áo bền đẹp sau nhiều năm.',
        },
        {
          title: 'Miễn Phí Chỉnh Chiều Dài Áo',
          body: 'Tùy chỉnh miễn phí chiều dài tay áo và thân áo theo từng cỡ cổ từ 30 đến 45 chuẩn xác.',
        },
        {
          title: 'Kho Hàng TP.HCM, Oslo & Treviso',
          body: 'Đồng bộ tồn kho theo thời gian thực cùng dịch vụ chuyển phát nhanh DHL Express chuyên nghiệp.',
        },
      ],
      showroomHeading: 'Showroom & Đại Diện Bắc Âu',
      showroomAddress: 'Gulbrandsens Agencies AS · Maridalsveien 87, 0461 Oslo, Na Uy · monte@montenapoleone1974.com',
      ctaCatalog: 'Khám Phá Bộ Sưu Tập',
      ctaB2B: 'Giải Pháp Doanh Nghiệp B2B',
    },
    promo: {
      floatingTrigger: 'GIẢM 10% ĐƠN ĐẦU TIÊN',
      emailPlaceholder: 'Nhập địa chỉ email của bạn',
      submitting: 'Đang đăng ký...',
      successPrefix: 'Mã ưu đãi của bạn đã được kích hoạt qua Mailchimp:',
      firstOrderNote: 'Áp dụng cho đơn hàng đầu tiên tại Monte Napoleone 1974.',
      close: 'Đóng',
    },
    bulk: {
      unlockedLabel: 'Đã áp dụng ưu đãi mua nhiều',
      upsellTemplate: 'Thêm {qty} áo nữa để nhận giảm giá mua nhiều {pct}%',
      bulkDiscountRow: 'Ưu đãi Mua Nhiều (Bulk)',
    },
    ai: {
      agentPlaceholder: 'Hỏi Trợ lý: tìm áo linen hoặc thêm size 40...',
      askButton: 'Hỏi Trợ lý',
      thinking: 'Đang kiểm tra kho và tư vấn...',
      viewShirt: 'Xem áo',
      addToBag: 'Thêm vào giỏ',
      poweredByPrefix: 'Trợ lý May Đo',
      clearChat: 'Làm mới',
    },
  },
};
