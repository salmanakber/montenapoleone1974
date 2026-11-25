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
    orderModeSwitcherAria: string;
    b2cRetailOnePc: string;
    b2bCorporateMoq20: string;
    b2cRetailShort: string;
    b2bMoq20Short: string;
    b2bQuoteCta: string;
    quickJumpFitSize: string;
    quickJumpCollar: string;
    quickJumpCuff: string;
    pleaseComplete: string;
    skuLabel: string;
    defaultBadge: string;
    atelierSpec: string;
    basePattern: string;
    tailoringDone: string;
    tailoringReset: string;
    cuffMonogramLabel: string;
    cuffMonogramPlaceholder: string;
    customerReviews: string;
    verifiedReviewsTitle: string;
    reviewSingular: string;
    reviewPlural: string;
    verifiedLabel: string;
    noRatingsYet: string;
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
    backToShirtCatalog: string;
    sectionSizesQty: string;
    sectionFitCollarCuff: string;
    sectionEmbroideryNotes: string;
    supplierNotesPlaceholder: string;
    saveAddColourSticky: string;
    belowMoqSuffix: string;
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
    infoUrls: string[];
  };
  aboutPage: {
    eyebrow: string;
    title: string;
    lead: string;
    paragraphs: string[];
    pullQuote: string;
    videoCaption: string;
    storyEyebrow: string;
    storyHeading: string;
    storyBody: string[];
    traditionsHeading: string;
    traditions: Array<{ title: string; body: string }>;
    pillars: Array<{ title: string; body: string }>;
    features: Array<{ eyebrow: string; title: string; paragraphs: string[]; quote?: string }>;
    commitmentEyebrow: string;
    commitmentHeading: string;
    commitmentCards: Array<{ eyebrow: string; title: string; body: string }>;
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
      orderModeSwitcherAria: 'Order mode switcher',
      b2cRetailOnePc: 'B2C Retail (1 pc)',
      b2bCorporateMoq20: 'B2B Corporate (MOQ 20)',
      b2cRetailShort: 'B2C Retail',
      b2bMoq20Short: 'B2B (MOQ 20)',
      b2bQuoteCta: 'B2B Quote',
      quickJumpFitSize: 'Fit & Size',
      quickJumpCollar: 'Collar',
      quickJumpCuff: 'Cuff',
      pleaseComplete: 'Please complete',
      skuLabel: 'SKU',
      defaultBadge: 'Default',
      atelierSpec: 'Atelier Spec',
      basePattern: 'Base pattern:',
      tailoringDone: 'Done',
      tailoringReset: 'Reset',
      cuffMonogramLabel: 'Optional Cuff Monogram (max 4 initials)',
      cuffMonogramPlaceholder: 'e.g. M.N.',
      customerReviews: 'Customer reviews',
      verifiedReviewsTitle: 'Verified Customer Reviews',
      reviewSingular: 'review',
      reviewPlural: 'reviews',
      verifiedLabel: 'verified',
      noRatingsYet: 'No ratings yet',
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
      backToShirtCatalog: 'Back to B2B Shirt Catalog',
      sectionSizesQty: '1. Sizes & Qty',
      sectionFitCollarCuff: '2. Fit, Collar & Cuff',
      sectionEmbroideryNotes: '3. Embroidery & Notes',
      supplierNotesPlaceholder: 'Logo placement, thread color...',
      saveAddColourSticky: '+ Save & Add Colour',
      belowMoqSuffix: '({n} below 20 MOQ)',
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
        'Monte Napoleone was founded in Treviso, Italy in 1974. Ever since, we have created exclusive shirting defined by timeless elegance and uncompromising quality. More than aesthetics — it is a promise of perfection and heritage.',
      contactHeading: 'Contact',
      contactNote:
        'We prefer all important inquiries by email, so we can provide thorough and concrete answers. Our goal is always to respond within 24 hours.',
      addressHeading: 'Address',
      infoHeading: 'Information',
      followHeading: 'Follow us',
      newsletterLabel: 'Newsletter',
      newsletterPlaceholder: 'Enter your email',
      send: 'Send',
      cookieNotice:
        'We use cookies to improve your experience on our website. By continuing, you agree to our use of cookies.',
      infoLinks: [
        'Returns & Exchanges',
        'Withdrawal Form (PDF)',
        'Dealers & Partners',
        'Careers & Opportunities',
        'Frequently Asked Questions',
        'Privacy Policy',
      ],
      infoUrls: [
        'https://montenapoleone1974.com/retur-og-bytte/',
        'https://montenapoleone1974.com/wp-content/uploads/2025/03/return-policy-A5.pdf',
        'https://montenapoleone1974.com/forhandlere-og-partnere/',
        'https://montenapoleone1974.com/karrierer/',
        'https://montenapoleone1974.com/faqs/',
        'https://montenapoleone1974.com/personvernerklaering/',
      ],
    },
    aboutPage: {
      eyebrow: 'About Us · WHY WE EXIST',
      title: 'WHY WE EXIST',
      lead: 'A great shirt does more than complete an outfit. It changes how you feel when you wear it.',
      paragraphs: [
        'It should give you confidence, comfort and the feeling that everything is exactly as it should be.',
        'Whether you’re walking into an important meeting, meeting a business partner, or simply starting another day at work, we believe the right shirt should help you feel comfortable and confident.',
        'We believe buying one online should feel just as effortless. No unnecessary complexity. No uncertainty. No surprises.',
        'Our goal has never been to sell the most shirts. Our goal is to create shirts people genuinely enjoy wearing—and choose again when it’s time for the next one.',
      ],
      pullQuote: 'Because in the end, the most important shirt is not the one we make. It’s the one you look forward to wearing.',
      videoCaption: 'Treviso 1974 Atelier — Precision Pattern Development, Two-Ply Weaving & Inspection',
      storyEyebrow: 'Our Foundation',
      storyHeading: 'OUR STORY',
      storyBody: [
        'Monte Napoleone was founded in Treviso, Italy, in 1974 with one simple belief: Quality never goes out of style. More than fifty years later, that belief still guides every decision we make.',
        'We respect tradition. But we also believe craftsmanship should continue to evolve. We believe the best shirts are created when experience, ideas and craftsmanship come together with a shared commitment to quality.',
      ],
      traditionsHeading: 'Today, Monte Napoleone brings together the strengths of three traditions.',
      traditions: [
        {
          title: 'Italian Heritage',
          body: 'Gives us an appreciation for timeless design and elegance.',
        },
        {
          title: 'Scandinavian Thinking',
          body: 'Inspires simplicity, functionality and honesty.',
        },
        {
          title: 'Vietnamese Craftsmanship and Manufacturing Expertise',
          body: 'Allow us to transform ideas into products with precision and consistency.',
        },
      ],
      pillars: [
        {
          title: 'Italian Heritage',
          body: 'Timeless Treviso tailoring proportions and crisp collar engineering.',
        },
        {
          title: 'Scandinavian Thinking',
          body: 'Simplicity, functionality, honest transparent pricing, and effortless ordering.',
        },
        {
          title: 'Craftsmanship & Precision',
          body: 'Close manufacturing control from 100/2-ply fabric selection to final inspection.',
        },
      ],
      features: [
        {
          eyebrow: 'Expertise',
          title: 'WHY WE SPECIALIZE',
          paragraphs: [
            'We made a conscious decision. Instead of producing everything, we chose to focus on what we do best: shirts, polo shirts and T-shirts.',
            'Over decades, our team has refined the craft of shirtmaking through international manufacturing experience and by meeting the quality standards of demanding brands and retail partners around the world.',
            'Working closely with our own manufacturing allows us to oversee every stage of production, from fabric selection and pattern development to cutting, sewing, pressing, quality control and final packaging.',
            'Some fabrics are offered as Pre-Order, giving customers access to a wider selection of carefully chosen materials beyond our regular stock.',
          ],
          quote: 'Real expertise comes from specialization — measured by the knowledge, precision and pride of the people who make every shirt.',
        },
        {
          eyebrow: 'Customer',
          title: 'DESIGNED AROUND YOU',
          paragraphs: [
            'One of the biggest concerns when buying a shirt online is simple. Will it fit the way I expect?',
            'We understand that. That’s why every shirt ordered through our online store is made specifically for you. Not taken from a warehouse shelf. Not a product that has been sitting there for months.',
            'Every Made-to-Order shirt includes complimentary adjustments to shirt length and sleeve length. Additional tailoring options for waist, chest, bottom hem and shoulder are also available.',
          ],
          quote: 'We don’t believe customers should adapt to the shirt. We believe the shirt should adapt to the customer.',
        },
        {
          eyebrow: 'Monte Napoleone 1974',
          title: 'HERITAGE COLLECTION',
          paragraphs: [
            'Monte Napoleone 1974 marks the beginning of a new chapter in our story. Our HERITAGE COLLECTION celebrates more than fifty years of inspiration while embracing the possibilities of modern craftsmanship and a more personal experience for every customer.',
            'Every shirt is made to order using carefully selected natural fabrics and can be personalized with embroidered initials. The collection also introduces mother-of-pearl buttons, expanded tailoring options and an even greater attention to the details that define a truly exceptional shirt.',
          ],
          quote: 'Not because luxury needs to be louder. But because the smallest details often make the biggest difference over time.',
        },
      ],
      commitmentEyebrow: 'Brand Purpose',
      commitmentHeading: 'OUR COMMITMENT',
      commitmentCards: [
        {
          eyebrow: 'Designed Around You',
          title: 'Will it fit the way I expect?',
          body: 'Every shirt ordered through our online store is crafted for you — not pulled from dead warehouse inventory.',
        },
        {
          eyebrow: 'Personalization',
          title: 'The Shirt Should Adapt to You',
          body: 'Complimentary adjustments to shirt length and sleeve length, plus fine waist, chest, bottom hem and shoulder tailoring.',
        },
        {
          eyebrow: 'Transparency',
          title: 'A Better Way to Buy Online',
          body: 'No uncertainty on fit or hidden surprises at checkout. Earning your trust is worth far more than making a single sale.',
        },
        {
          eyebrow: 'Value',
          title: 'The Price You See Is the Price You Pay',
          body: 'No hidden fees or unexpected surprises — a straightforward, honest experience from order to doorstep.',
        },
        {
          eyebrow: 'Our Promise',
          title: 'Never Stop Improving',
          body: 'Trust is built through experience, consistency, quality, honesty and service — never through empty advertising.',
        },
        {
          eyebrow: 'Our Promise',
          title: 'Better, Every Day',
          body: 'If your first Monte Napoleone shirt makes choosing the second one easy, then we’ve achieved exactly what we set out to do.',
        },
      ],
      showroomHeading: 'GULBRANDSENS AGENCIES SHOWROOM · OSLO',
      showroomAddress: 'Maridalsveien 87, 0461 Oslo, Norway · monte@montenapoleone1974.com',
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
      orderModeSwitcherAria: 'Bestillingsmodus',
      b2cRetailOnePc: 'B2C Privat (1 stk)',
      b2bCorporateMoq20: 'B2B Bedrift (MOQ 20)',
      b2cRetailShort: 'B2C Privat',
      b2bMoq20Short: 'B2B (MOQ 20)',
      b2bQuoteCta: 'B2B-tilbud',
      quickJumpFitSize: 'Passform og størrelse',
      quickJumpCollar: 'Krage',
      quickJumpCuff: 'Mansjett',
      pleaseComplete: 'Vennligst fullfør',
      skuLabel: 'SKU',
      defaultBadge: 'Standard',
      atelierSpec: 'Atelier-spesifikasjon',
      basePattern: 'Grunnmønster:',
      tailoringDone: 'Ferdig',
      tailoringReset: 'Nullstill',
      cuffMonogramLabel: 'Valgfri mansjettmonogram (maks 4 bokstaver)',
      cuffMonogramPlaceholder: 'f.eks. M.N.',
      customerReviews: 'Kundeanmeldelser',
      verifiedReviewsTitle: 'Verifiserte kundeanmeldelser',
      reviewSingular: 'anmeldelse',
      reviewPlural: 'anmeldelser',
      verifiedLabel: 'verifisert',
      noRatingsYet: 'Ingen vurderinger ennå',
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
      backToShirtCatalog: 'Tilbake til B2B-skjortekatalog',
      sectionSizesQty: '1. Størrelser og antall',
      sectionFitCollarCuff: '2. Passform, krage og mansjett',
      sectionEmbroideryNotes: '3. Broderi og notater',
      supplierNotesPlaceholder: 'Logoplassering, trådfarge...',
      saveAddColourSticky: '+ Lagre og legg til farge',
      belowMoqSuffix: '({n} under MOQ 20)',
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
        'Monte Napoleone ble grunnlagt i Treviso, Italia i 1974. Siden den gang har vi skapt eksklusive skjorteprodukter preget av tidløs eleganse og kompromissløs kvalitet. Når du velger oss, velger du en arv.',
      contactHeading: 'Kontakt',
      contactNote:
        'Vi foretrekker alle viktige henvendelser på epost, slik at vi kan gi gode og konkrete svar. Vårt mål er alltid å svare på alle henvendelser innen 24 timer.',
      addressHeading: 'Adresse',
      infoHeading: 'Informasjon',
      followHeading: 'Følg oss',
      newsletterLabel: 'Nyhetsbrev',
      newsletterPlaceholder: 'Din e-postadresse',
      send: 'Send',
      cookieNotice:
        'Vi bruker informasjonskapsler for å forbedre opplevelsen på nettstedet vårt. Ved å fortsette godtar du vår bruk av informasjonskapsler.',
      infoLinks: [
        'Retur og bytte',
        'Angrefrist skjema',
        'Forhandlere og partnere',
        'Karriere og jobbmuligheter',
        'Ofte Stilte Spørsmål',
        'Personvernerklæring',
      ],
      infoUrls: [
        'https://montenapoleone1974.com/retur-og-bytte/',
        'https://montenapoleone1974.com/wp-content/uploads/2025/03/return-policy-A5.pdf',
        'https://montenapoleone1974.com/forhandlere-og-partnere/',
        'https://montenapoleone1974.com/karrierer/',
        'https://montenapoleone1974.com/faqs/',
        'https://montenapoleone1974.com/personvernerklaering/',
      ],
    },
    aboutPage: {
      eyebrow: 'Om oss · HVORFOR VI EKSISTERER',
      title: 'HVORFOR VI EKSISTERER',
      lead: 'En god skjorte gjør mer enn å fullføre et antrekk. Den endrer hvordan du føler deg når du har den på.',
      paragraphs: [
        'Den skal gi deg selvtillit, komfort og følelsen av at alt sitter akkurat slik det skal.',
        'Enten du går inn i et viktig møte, møter en forretningspartner eller bare starter en ny arbeidsdag, mener vi den rette skjorten skal hjelpe deg å føle deg vel.',
        'Å handle skjorte på nett skal føles like enkelt – uten unødvendig kompleksitet, usikkerhet eller overraskelser.',
        'Målet vårt har aldri vært å selge flest mulig skjorter, men å lage skjorter folk virkelig liker å gå med – og velger igjen neste gang.',
      ],
      pullQuote: 'For til syvende og sist er den viktigste skjorten ikke den vi syr – det er den du gleder deg til å ta på.',
      videoCaption: 'Treviso 1974 Atelier — Mønsterutvikling, Two-Ply veving og kvalitetskontroll',
      storyEyebrow: 'Vårt Fundament',
      storyHeading: 'VÅR HISTORIE',
      storyBody: [
        'Monte Napoleone ble grunnlagt i Treviso i Italia i 1974 med én enkel overbevisning: Kvalitet går aldri av moten. Mer enn femti år senere styrer denne troen fortsatt hvert valg vi tar.',
        'Vi respekterer tradisjonen, men mener håndverket alltid skal utvikle seg videre når erfaring, ideer og stolthet møtes.',
      ],
      traditionsHeading: 'I dag forener Monte Napoleone styrken fra tre tradisjoner.',
      traditions: [
        {
          title: 'Italiensk Arv',
          body: 'Gir oss sansen for tidløs italiensk design og eleganse.',
        },
        {
          title: 'Skandinavisk Tenkemåte',
          body: 'Inspirerer til enkelhet, funksjonalitet og ærlighet.',
        },
        {
          title: 'Vietnamesisk Håndverk & Presisjon',
          body: 'Gjør det mulig å forvandle ideer til produkter med høy presisjon og jevn kvalitet.',
        },
      ],
      pillars: [
        {
          title: 'Two-Ply 100/2-kvalitet',
          body: 'Tettvevde dobbeltvridde bomullstråder gir naturlig krøllmotstand og fast krage.',
        },
        {
          title: 'Kostnadsfritt Skreddersydd Lengde',
          body: 'Tilpass erme- og skjortelengde gratis på alle skjorter fra str. 30 til 45.',
        },
        {
          title: 'Norsk Lager & Oslo Showroom',
          body: 'Priser inkl. 25 % MVA, Vipps og utsendelse fra vårt showroom i Oslo.',
        },
      ],
      features: [
        {
          eyebrow: 'Ekspertise',
          title: 'HVORFOR VI SPESIALISERER OSS',
          paragraphs: [
            'Vi tok et bevisst valg: i stedet for å produsere alt, spesialiserer vi oss på det vi kan aller best – skjorter, piqueskjorter og t-skjorter.',
            'Gjennom vårt tette samarbeid med egen produksjon kontrollerer vi hvert eneste steg, fra stoffvalg og mønsterkonstruksjon til søm, stryking og kvalitetskontroll.',
            'Utvalgte metervare-stoffer tilbys også som Pre-Order for et enda bredere utvalg.',
          ],
          quote: 'Ekte ekspertise måles i kunnskapen, presisjonen og stoltheten til menneskene bak hver skjorte.',
        },
        {
          eyebrow: 'Kunde i Fokus',
          title: 'DESIGNET RUNDT DEG',
          paragraphs: [
            'En av de største bekymringene ved netthandel er enkel: Kommer den til å sitte slik jeg forventer?',
            'Hver skjorte inkluderer kostnadsfri justering av skjortelengde og ermelengde, samt mulighet for skreddersøm på midje, bryst, nederkant og skuldre.',
          ],
          quote: 'Vi mener ikke at kunden skal tilpasse seg skjorten – skjorten skal tilpasse seg deg.',
        },
        {
          eyebrow: 'Monte Napoleone 1974',
          title: 'HERITAGE COLLECTION',
          paragraphs: [
            'Vår HERITAGE COLLECTION feirer over 50 år med italiensk skjortetradisjon, oppgradert med perlemorsknapper, valgfri monogram-brodering og utvidet skreddersøm.',
          ],
          quote: 'Luksus trenger ikke å rope høyere – de minste detaljene utgjør den største forskjellen over tid.',
        },
      ],
      commitmentEyebrow: 'Vårt Løfte',
      commitmentHeading: 'VÅR FORPLIKTELSE',
      commitmentCards: [
        { eyebrow: 'Tilpasset Deg', title: 'Sitter den slik du forventer?', body: 'Skreddersydd på bestilling med eksakte mål i stedet for hyllevare.' },
        { eyebrow: 'Personalisering', title: 'Skjorten tilpasser seg deg', body: 'Gratis tilpasning av erme- og skjortelengde samt detaljmål på overkropp.' },
        { eyebrow: 'Åpenhet', title: 'En bedre måte å handle på nett', body: 'Ingen usikkerhet om passform og ingen skjulte overraskelser i kassen.' },
        { eyebrow: 'Verdi', title: 'Prisen du ser er prisen du betaler', body: 'Inkludert norsk MVA, ærlig prising og tydelig leveringstid med DHL.' },
        { eyebrow: 'Kvalitet', title: 'Slutter aldri å forbedre', body: 'Tillit bygges gjennom kvalitet, konsistens og personlig service.' },
        { eyebrow: 'Hver Dag', title: 'Bedre for hver skjorte', body: 'Når din første skjorte gjør valg nummer to enkelt, har vi nådd målet vårt.' },
      ],
      showroomHeading: 'GULBRANDSENS AGENCIES SHOWROOM · OSLO',
      showroomAddress: 'Maridalsveien 87, 0461 Oslo, Norge · monte@montenapoleone1974.com',
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
      orderModeSwitcherAria: 'Modalità ordine',
      b2cRetailOnePc: 'B2C Retail (1 pz)',
      b2bCorporateMoq20: 'B2B Corporate (MOQ 20)',
      b2cRetailShort: 'B2C Retail',
      b2bMoq20Short: 'B2B (MOQ 20)',
      b2bQuoteCta: 'Preventivo B2B',
      quickJumpFitSize: 'Vestibilità e taglia',
      quickJumpCollar: 'Colletto',
      quickJumpCuff: 'Polsino',
      pleaseComplete: 'Completare',
      skuLabel: 'SKU',
      defaultBadge: 'Predefinito',
      atelierSpec: 'Specifica atelier',
      basePattern: 'Modello base:',
      tailoringDone: 'Fine',
      tailoringReset: 'Reimposta',
      cuffMonogramLabel: 'Monogramma polsino (max 4 iniziali)',
      cuffMonogramPlaceholder: 'es. M.N.',
      customerReviews: 'Recensioni clienti',
      verifiedReviewsTitle: 'Recensioni verificate',
      reviewSingular: 'recensione',
      reviewPlural: 'recensioni',
      verifiedLabel: 'verificata',
      noRatingsYet: 'Nessuna valutazione ancora',
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
      backToShirtCatalog: 'Torna al catalogo camicie B2B',
      sectionSizesQty: '1. Taglie e quantità',
      sectionFitCollarCuff: '2. Vestibilità, colletto e polsino',
      sectionEmbroideryNotes: '3. Ricamo e note',
      supplierNotesPlaceholder: 'Posizione logo, colore filo...',
      saveAddColourSticky: '+ Salva e aggiungi colore',
      belowMoqSuffix: '({n} sotto MOQ 20)',
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
        'Preferiamo ricevere tutte le richieste importanti via e-mail per offrire risposte complete e concrete entro 24 ore.',
      addressHeading: 'Showroom',
      infoHeading: 'Informazioni',
      followHeading: 'Seguici',
      newsletterLabel: 'Newsletter',
      newsletterPlaceholder: 'La tua email',
      send: 'Invia',
      cookieNotice:
        'Utilizziamo i cookie per migliorare la tua esperienza sul nostro sito. Continuando accetti l’utilizzo dei cookie.',
      infoLinks: [
        'Resi e Cambi',
        'Modulo di Recesso (PDF)',
        'Rivenditori e Partner',
        'Lavora con Noi',
        'Domande Frequenti',
        'Privacy Policy',
      ],
      infoUrls: [
        'https://montenapoleone1974.com/retur-og-bytte/',
        'https://montenapoleone1974.com/wp-content/uploads/2025/03/return-policy-A5.pdf',
        'https://montenapoleone1974.com/forhandlere-og-partnere/',
        'https://montenapoleone1974.com/karrierer/',
        'https://montenapoleone1974.com/faqs/',
        'https://montenapoleone1974.com/personvernerklaering/',
      ],
    },
    aboutPage: {
      eyebrow: 'Chi Siamo · PERCHÉ ESISTIAMO',
      title: 'PERCHÉ ESISTIAMO',
      lead: 'Una grande camicia fa molto più che completare un look: trasforma come ti senti ogni volta che la indossi.',
      paragraphs: [
        'Deve donare sicurezza, comfort naturale e la sensazione che ogni dettaglio sia al posto giusto.',
        'In riunione o nel tempo libero, acquistare una camicia online deve essere semplice, trasparente e privo di sorprese.',
      ],
      pullQuote: 'Perché la camicia più importante non è quella che realizziamo: è quella che non vedi l’ora di indossare.',
      videoCaption: 'Atelier di Treviso dal 1974 — Controllo Qualità e Sartoria su Misura',
      storyEyebrow: 'Le Nostre Radici',
      storyHeading: 'LA NOSTRA STORIA',
      storyBody: [
        'Fondata a Treviso nel 1974 con una convinzione chiara: la qualità autentica non passa mai di moda.',
      ],
      traditionsHeading: 'Monte Napoleone unisce la forza di tre tradizioni.',
      traditions: [
        { title: 'Patrimonio Italiano', body: 'Eleganza senza tempo, proporzioni classiche e amore per i dettagli.' },
        { title: 'Mentalità Scandinava', body: 'Semplicità, funzionalità e trasparenza assoluta.' },
        { title: 'Maestria Produttiva Vietnamita', body: 'Precisione sartoriale costante in ogni fase di confezione.' },
      ],
      pillars: [
        { title: 'Tessuti Doppio Ritorto', body: 'Filati 100/2 ad alta densità per camicie business no-stiro.' },
        { title: 'Sartoria Lunghezza Inclusa', body: 'Regolazione gratuita maniche e lunghezza dalla 30 alla 45.' },
        { title: 'Atelier Treviso & Oslo', body: 'Spedizione DHL Express e rappresentanza nordica a Oslo.' },
      ],
      features: [
        {
          eyebrow: 'Competenza',
          title: 'PERCHÉ CI SPECIALIZZIAMO',
          paragraphs: [
            'Ci dedichiamo esclusivamente a ciò che sappiamo fare meglio: camicie, polo e T-shirt in fibre naturali.',
          ],
          quote: 'La vera esperienza si misura nella precisione e nell’orgoglio di chi cuce ogni capo.',
        },
        {
          eyebrow: 'Cliente al Centro',
          title: 'DISEGNATA INTORNO A TE',
          paragraphs: [
            'Ogni camicia include regolazioni gratuite di lunghezza maniche e busto, più vita, torace, fondo e spalle.',
          ],
          quote: 'Non è il cliente che deve adattarsi alla camicia: è la camicia che si adatta a te.',
        },
      ],
      commitmentEyebrow: 'La Nostra Promessa',
      commitmentHeading: 'IL NOSTRO IMPEGNO',
      commitmentCards: [
        { eyebrow: 'Su Misura', title: 'Vestirà come ti aspetti?', body: 'Realizzata su ordinazione con le tue misure invece che taglie standard.' },
        { eyebrow: 'Personalizzazione', title: 'La camicia si adatta a te', body: 'Regolazione gratuita della lunghezza maniche e busto, più dettagli su torace e vita.' },
        { eyebrow: 'Trasparenza', title: 'Un modo migliore di acquistare', body: 'Nessun dubbio sulla vestibilità e nessuna sorpresa al momento del checkout.' },
        { eyebrow: 'Valore', title: 'Il prezzo che vedi è quello che paghi', body: 'IVA 22% inclusa, nessuna spesa nascosta e spedizione DHL tracciabile.' },
        { eyebrow: 'La Nostra Promessa', title: 'Miglioramento Continuo', body: 'La fiducia si costruisce con qualità costante, cura sartoriale e ascolto.' },
        { eyebrow: 'Ogni Giorno', title: 'Sempre più precisa', body: 'Quando la tua prima camicia rende facile scegliere la seconda, abbiamo raggiunto il nostro obiettivo.' },
      ],
      showroomHeading: 'GULBRANDSENS AGENCIES SHOWROOM · OSLO',
      showroomAddress: 'Maridalsveien 87, 0461 Oslo, Norvegia · monte@montenapoleone1974.com',
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
      orderModeSwitcherAria: 'Chế độ đặt hàng',
      b2cRetailOnePc: 'B2C Lẻ (1 áo)',
      b2bCorporateMoq20: 'B2B Doanh nghiệp (MOQ 20)',
      b2cRetailShort: 'B2C Lẻ',
      b2bMoq20Short: 'B2B (MOQ 20)',
      b2bQuoteCta: 'Báo giá B2B',
      quickJumpFitSize: 'Phom & kích cỡ',
      quickJumpCollar: 'Cổ áo',
      quickJumpCuff: 'Măng sét',
      pleaseComplete: 'Vui lòng hoàn tất',
      skuLabel: 'SKU',
      defaultBadge: 'Mặc định',
      atelierSpec: 'Thông số xưởng',
      basePattern: 'Kiểu gốc:',
      tailoringDone: 'Xong',
      tailoringReset: 'Đặt lại',
      cuffMonogramLabel: 'Thêu chữ cái măng sét (tối đa 4 ký tự)',
      cuffMonogramPlaceholder: 'vd. M.N.',
      customerReviews: 'Đánh giá khách hàng',
      verifiedReviewsTitle: 'Đánh giá đã xác minh',
      reviewSingular: 'đánh giá',
      reviewPlural: 'đánh giá',
      verifiedLabel: 'đã xác minh',
      noRatingsYet: 'Chưa có đánh giá',
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
      backToShirtCatalog: 'Quay lại danh mục áo B2B',
      sectionSizesQty: '1. Size & số lượng',
      sectionFitCollarCuff: '2. Phom, cổ & măng sét',
      sectionEmbroideryNotes: '3. Thêu & ghi chú',
      supplierNotesPlaceholder: 'Vị trí logo, màu chỉ...',
      saveAddColourSticky: '+ Lưu & thêm màu',
      belowMoqSuffix: '({n} dưới MOQ 20)',
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
        'Chúng tôi ưu tiên trao đổi qua email để phản hồi đầy đủ và chính xác nhất trong vòng 24 giờ làm việc.',
      addressHeading: 'Showroom',
      infoHeading: 'Thông tin',
      followHeading: 'Kết nối',
      newsletterLabel: 'Bản tin ưu đãi',
      newsletterPlaceholder: 'Nhập email của bạn',
      send: 'Gửi',
      cookieNotice:
        'Chúng tôi sử dụng cookie để cải thiện trải nghiệm mua sắm của bạn trên website Monte Napoleone 1974.',
      infoLinks: [
        'Chính sách Đổi trả',
        'Mẫu Phiếu Hoàn Hàng (PDF)',
        'Đối tác & Đại lý',
        'Tuyển dụng',
        'Câu hỏi thường gặp',
        'Chính sách bảo mật',
      ],
      infoUrls: [
        'https://montenapoleone1974.com/retur-og-bytte/',
        'https://montenapoleone1974.com/wp-content/uploads/2025/03/return-policy-A5.pdf',
        'https://montenapoleone1974.com/forhandlere-og-partnere/',
        'https://montenapoleone1974.com/karrierer/',
        'https://montenapoleone1974.com/faqs/',
        'https://montenapoleone1974.com/personvernerklaering/',
      ],
    },
    aboutPage: {
      eyebrow: 'Về Chúng Tôi · LÝ DO RA ĐỜI',
      title: 'GIÁ TRỊ CỐT LÕI',
      lead: 'Một chiếc áo sơ mi hoàn hảo không chỉ hoàn thiện trang phục — mà còn mang lại sự tự tin suốt ngày dài.',
      paragraphs: [
        'Dù trong cuộc họp quan trọng hay ngày làm việc thường nhật, chiếc áo chuẩn phom giúp bạn luôn thoải mái và lịch lãm.',
        'Mua áo sơ mi trực tuyến cần phải đơn giản, minh bạch và không có bất kỳ chi phí ẩn nào.',
      ],
      pullQuote: 'Chiếc áo quan trọng nhất không phải chiếc chúng tôi làm ra — mà là chiếc bạn luôn mong được mặc mỗi sáng.',
      videoCaption: 'Xưởng may Treviso 1974 & Quy trình kiểm soát chất lượng từng đường kim mũi chỉ',
      storyEyebrow: 'Nền Tảng Di Sản',
      storyHeading: 'CÂU CHUYỆN THƯƠNG HIỆU',
      storyBody: [
        'Thành lập tại Treviso, Ý từ năm 1974 với niềm tin giản dị: Chất lượng đích thực không bao giờ lỗi mốt.',
      ],
      traditionsHeading: 'Monte Napoleone kết tinh sức mạnh từ ba nền văn hóa may mặc.',
      traditions: [
        { title: 'Di Sản Ý (Treviso)', body: 'Tư duy thẩm mỹ vượt thời gian và tỷ lệ phom dáng cổ điển.' },
        { title: 'Tư Duy Bắc Âu (Na Uy)', body: 'Sự tối giản, tiện dụng và minh bạch tuyệt đối.' },
        { title: 'Tay Nghề Thủ Công Việt Nam', body: 'Kỹ nghệ cắt may chuẩn xác và đồng nhất trên từng sản phẩm.' },
      ],
      pillars: [
        { title: 'Vải Sợi Đôi Two-Ply 100/2', body: 'Mịn màng, chống nhăn tự nhiên và giữ đứng cổ áo.' },
        { title: 'Miễn Phí Chỉnh Chiều Dài', body: 'Tùy chỉnh tay áo và thân áo theo từng cỡ cổ 30–45.' },
        { title: 'Kho TP.HCM, Oslo & Treviso', body: 'Đồng bộ tồn kho và chuyển phát nhanh DHL Express.' },
      ],
      features: [
        {
          eyebrow: 'Chuyên Môn',
          title: 'TẬP TRUNG VÀO ĐIỀU TỐT NHẤT',
          paragraphs: [
            'Chúng tôi chuyên sâu vào áo sơ mi, polo và T-shirt — kiểm soát khép kín từ dệt vải đến đóng gói hoàn thiện.',
          ],
          quote: 'Đẳng cấp thực thụ được đo bằng sự tỉ mỉ và niềm tự hào của người thợ may.',
        },
        {
          eyebrow: 'May Đo Theo Bạn',
          title: 'CHIẾC ÁO PHÙ HỢP VỚI BẠN',
          paragraphs: [
            'Miễn phí chỉnh chiều dài tay & thân áo, kèm tùy chọn tinh chỉnh eo, ngực, gấu và vai.',
          ],
          quote: 'Bạn không cần phải thay đổi để vừa áo — chiếc áo sẽ được tinh chỉnh để vừa vặn với bạn.',
        },
      ],
      commitmentEyebrow: 'Cam Kết',
      commitmentHeading: 'CAM KẾT THƯƠNG HIỆU',
      commitmentCards: [
        { eyebrow: 'Chuẩn Phom', title: 'Áo có vừa vặn như mong đợi?', body: 'May theo từng đơn và thông số riêng thay vì hàng sản xuất đại trà.' },
        { eyebrow: 'Cá Nhân Hóa', title: 'Chiếc áo thích ứng theo bạn', body: 'Miễn phí tùy chỉnh dài tay và dài áo, kèm tinh chỉnh eo, ngực, gấu áo và vai.' },
        { eyebrow: 'Minh Bạch', title: 'Trải nghiệm mua sắm tốt hơn', body: 'Không còn phân vân về phom dáng và hoàn toàn minh bạch khi thanh toán.' },
        { eyebrow: 'Giá Trị', title: 'Giá hiển thị là giá thanh toán', body: 'Không phụ phí bất ngờ và hiển thị rõ ràng thời gian giao hàng DHL.' },
        { eyebrow: 'Cam Kết', title: 'Không ngừng hoàn thiện', body: 'Niềm tin được xây dựng từ chất lượng vải sợi đôi và dịch vụ tận tâm.' },
        { eyebrow: 'Mỗi Ngày', title: 'Tốt hơn qua từng sản phẩm', body: 'Khi chiếc áo đầu tiên giúp bạn dễ dàng chọn tiếp chiếc thứ hai, đó là thành công của chúng tôi.' },
      ],
      showroomHeading: 'GULBRANDSENS AGENCIES SHOWROOM · OSLO',
      showroomAddress: 'Maridalsveien 87, 0461 Oslo, Na Uy · monte@montenapoleone1974.com',
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
