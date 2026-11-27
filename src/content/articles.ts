import type { RegionCode } from '../types.ts';

export type ArticleSlug = 'fabric-guide' | 'sustainable-fashion';

export const ARTICLE_SLUGS: ArticleSlug[] = ['fabric-guide', 'sustainable-fashion'];

export const ARTICLE_PATH_ALIASES: Record<string, ArticleSlug> = {
  article: 'fabric-guide',
  'fabric-guide': 'fabric-guide',
  'oversikt-over-skjortestoffer': 'fabric-guide',
  fabrics: 'fabric-guide',
  'shirt-fabrics': 'fabric-guide',
  'sustainable-fashion': 'sustainable-fashion',
  sustainability: 'sustainable-fashion',
  'save-the-planet': 'sustainable-fashion',
  rad: 'sustainable-fashion',
  inspiration: 'sustainable-fashion',
};

export function resolveArticleSlug(raw?: string | null): ArticleSlug | null {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  return ARTICLE_PATH_ALIASES[key] || null;
}

export interface ArticleSection {
  heading: string;
  paragraphs: string[];
}

export interface ArticleContent {
  slug: ArticleSlug;
  eyebrow: string;
  title: string;
  lead: string;
  heroImage: string;
  sections: ArticleSection[];
}

const FABRIC_GUIDE_EN_SECTIONS: ArticleSection[] = [
  {
    heading: 'Broadcloth',
    paragraphs: [
      'Often called poplin, broadcloth is a tightly woven plain weave with very little sheen — clean and professional. Ideal when you want as little texture as possible. Usually a thinner, lighter cloth; white broadcloth can be slightly translucent. It presses very smooth but can wrinkle more easily than textured weaves.',
    ],
  },
  {
    heading: 'Twill',
    paragraphs: [
      'Recognised by its diagonal weave. Twills almost always have some lustre and a softer hand than broadcloth. They iron relatively easily and resist wrinkles well — excellent everyday dress shirts.',
    ],
  },
  {
    heading: 'Dobby',
    paragraphs: [
      'Dobby (similar to, but distinct from, jacquard) ranges from broadcloth-weight to near-twill constructions. Many include woven stripes; solid dobbies often show a subtle tone-on-tone pattern.',
    ],
  },
  {
    heading: 'Flannel',
    paragraphs: [
      'A cold-season favourite. Soft, brushed twill or poplin — usually 100% cotton, sometimes blended with wool or cashmere. Informal, warm, and ideal for cooler weather.',
    ],
  },
  {
    heading: 'Melange',
    paragraphs: [
      'Available in many weaves and spun from multi-coloured yarns for a softly irregular, organic look. Different from mouliné, where single-colour yarns are twisted together.',
    ],
  },
  {
    heading: 'Oxford cloth',
    paragraphs: [
      'A basket weave with a slightly heavier yarn and more texture than pinpoint. Durable and classic for button-down shirts; more casual than broadcloth or fine twill.',
    ],
  },
  {
    heading: 'Herringbone',
    paragraphs: [
      'A mirrored twill that creates a V-shaped pattern — more texture for both dress and casual wear, named for its resemblance to fish bones.',
    ],
  },
  {
    heading: 'Linen',
    paragraphs: [
      'Exceptionally breathable for warm climates. Made from flax fibre with a dry hand unlike cotton. Wrinkles more readily — part of its relaxed character. Cotton–linen blends keep coolness while reducing creasing.',
    ],
  },
  {
    heading: 'Poplin',
    paragraphs: [
      'Practically interchangeable with broadcloth in everyday descriptions: a smooth, flat plain weave. Technically, poplin may use different yarn weights in warp and weft, while broadcloth is more symmetrical.',
    ],
  },
  {
    heading: 'Pinpoint oxford',
    paragraphs: [
      'Same weave family as oxford cloth, with finer yarn and a tighter construction. More formal than classic oxford, less formal than broadcloth or fine twill — a strong everyday business shirt.',
    ],
  },
  {
    heading: 'Denim',
    paragraphs: [
      'Structurally a twill, often indigo-dyed. Shirting denim is usually softer and lighter than jean denim, with a different face and reverse colour.',
    ],
  },
  {
    heading: 'Egyptian, Sea Island & Supima cotton',
    paragraphs: [
      'These names describe the cotton fibre — not the weave. Extra-long staple cottons (Gossypium barbadense) spin into finer, stronger yarns and sit at the luxury end of shirting.',
      'Sea Island is exceptionally rare. Look for Certified Sea Island Cotton versus “Sea Island quality” marketing language.',
    ],
  },
  {
    heading: 'Two-ply & single-ply',
    paragraphs: [
      'Ply is how many yarns are twisted into one thread before weaving. Two-ply (2-ply) is generally more durable than single-ply; three-ply is rarer and extremely robust.',
    ],
  },
];

const FABRIC_GUIDE: Record<RegionCode, ArticleContent> = {
  en: {
    slug: 'fabric-guide',
    eyebrow: 'Advice & Inspiration',
    title: 'Shirt fabric overview',
    lead:
      'A clear guide to the weaves most often used in dress shirts — so you can choose the ideal cloth for how you live and work.',
    heroImage: '/uploads/articles/fabric-guide-hero.jpg',
    sections: FABRIC_GUIDE_EN_SECTIONS,
  },
  no: {
    slug: 'fabric-guide',
    eyebrow: 'Råd & Inspirasjon',
    title: 'Oversikt over skjortestoffer',
    lead:
      'Her gir vi den endelige oversikten over de ulike typer stoffer som vanligvis brukes i dresskjorter. Ved å forstå hva de forskjellige vevene betyr for et stoff, kan du være sikker på å finne det ideelle dresskjortestoffet for dine behov.',
    heroImage: '/uploads/articles/fabric-guide-hero.jpg',
    sections: [
      {
        heading: 'Broadcloth',
        paragraphs: [
          'Broadcloth ofte referert til som poplin, er et tettvevd stoff med en veldig enkel over-under-vev og svært lite glans, noe som gjør den fin og profesjonell. Broadcloth er flotte for gutter som leter etter så lite tekstur som mulig i stoffene. De er vanligvis et tynnere, lettere stoff. Spesielt hvite broadcloth kan være litt gjennomsiktige. Broadcloth bærer generelt det jevneste av alle vevinger takket være mangelen på tekstur, men kan også være mest utsatt for rynker.',
        ],
      },
      {
        heading: 'Twill',
        paragraphs: [
          'Twill-mønsteret er lett gjenkjennelig fordi det viser diagonal vev eller tekstur. Twills vil nesten alltid ha litt glans. På grunn av diagonal tekstur er twill litt mykere enn broadcloth, relativt lett å stryke og motstandsdyktig mot rynker.',
        ],
      },
      {
        heading: 'Dobby',
        paragraphs: [
          'Dobby (svært lik jacquard, men teknisk annerledes) kan variere mye — fra broadcloth-lignende vekt til nesten twill. Mange dobby-stoffer har striper vevd inn; solide farger har ofte et diskret mønster i samme tone.',
        ],
      },
      {
        heading: 'Flanell',
        paragraphs: [
          'En høst/vinter-favoritt. Myke, fuzzy stoffer som oftest er børstet twill eller poplin — vanligvis 100 % bomull, noen ganger med ull eller kasjmir. Uformelle og gode for kaldt vær.',
        ],
      },
      {
        heading: 'Melange',
        paragraphs: [
          'Melange kan komme i mange vever og er vevd med flerfargede garn for et organisk, lett ujevnt uttrykk. Forskjellig fra mouliné, der enfargede garn er tvunnet sammen.',
        ],
      },
      {
        heading: 'Oxford klut',
        paragraphs: [
          'Ligner pinpoint oxford, men med litt tyngre tråd og løsere vev. Mer holdbar tekstur — klassisk for button-down, mer uformell enn broadcloth eller fin twill.',
        ],
      },
      {
        heading: 'Fiskebein (Herringbone)',
        paragraphs: [
          'I hovedsak en twill som speiles i vevingen for å skape et V-formet utseende. Mer tekstur for både dress og casual.',
        ],
      },
      {
        heading: 'Lin',
        paragraphs: [
          'Utrolig pustende for varmt klima. Laget av linplanteens fiber med en unik tørr hånd. Rynker lettere enn bomull — en del av det avslappede uttrykket. Bomull/lin-blandinger beholder kjøligheten med mindre rynker.',
        ],
      },
      {
        heading: 'Poplin',
        paragraphs: [
          'Så lik broadcloth at vi i praksis likestiller dem: et glatt, flatt vanlig vevestoff. Teknisk kan poplin ha ulike garnvekter i renning og innslag.',
        ],
      },
      {
        heading: 'Pinpoint Oxford',
        paragraphs: [
          'Samme vev som oxford, men finere garn og strammere konstruksjon. Mer formell enn oxford cloth, mindre formell enn broadcloth eller twill — flotte hverdagsskjorter.',
        ],
      },
      {
        heading: 'Denim',
        paragraphs: [
          'Konstruksjonsmessig en twill, ofte indigo-farget. Skjortedenim er vanligvis mykere og lettere enn jeansstoff.',
        ],
      },
      {
        heading: 'Egyptisk, Sjøøya og amerikansk Supima',
        paragraphs: [
          'Dette beskriver bomullstypen — ikke veven. Extra-long staple-bomull spunnes til finere, sterkere garn og regnes som luksusråvarer.',
          'Sea Island er ekstremt sjelden. Se etter Certified Sea Island Cotton fremfor vag “Sea Island quality”-merking.',
        ],
      },
      {
        heading: 'Two ply & enkelt ply',
        paragraphs: [
          'Ply betyr hvor mange garn som er tvunnet sammen til én tråd. Two-ply er generelt mer holdbart enn single-ply; three-ply er sjeldnere og svært slitesterkt.',
        ],
      },
    ],
  },
  it: {
    slug: 'fabric-guide',
    eyebrow: 'Consigli & Ispirazione',
    title: 'Guida ai tessuti da camicia',
    lead:
      'Una panoramica chiara delle trame più usate nelle camicie eleganti, per scegliere il tessuto giusto.',
    heroImage: '/uploads/articles/fabric-guide-hero.jpg',
    sections: FABRIC_GUIDE_EN_SECTIONS,
  },
  vn: {
    slug: 'fabric-guide',
    eyebrow: 'Tư vấn & Cảm hứng',
    title: 'Tổng quan chất liệu áo sơ mi',
    lead:
      'Hướng dẫn các kiểu dệt thường dùng cho áo sơ mi công sở — giúp bạn chọn đúng chất liệu.',
    heroImage: '/uploads/articles/fabric-guide-hero.jpg',
    sections: FABRIC_GUIDE_EN_SECTIONS,
  },
};

const SUSTAINABLE_EN_SECTIONS: ArticleSection[] = [
  {
    heading: 'Why quality matters',
    paragraphs: [
      'Growing cotton requires enormous amounts of water. Producing one conventional shirt can take around 3,000 litres. Much of that cotton is grown where water is already scarce.',
      'According to a UN study, the fashion industry accounts for roughly 10% of global greenhouse gas emissions, 20% of wastewater, and uses more energy than aviation and shipping combined.',
    ],
  },
  {
    heading: 'A better habit',
    paragraphs: [
      'High consumption of fast fashion keeps that footprint growing. One of the most effective responses is to buy less — and to buy pieces that last longer.',
      'The most sustainable garment is often the one you already own. Choose timeless shirts you will wear for years, and help leave the planet in better shape for the generations that follow.',
    ],
  },
];

const SUSTAINABLE: Record<RegionCode, ArticleContent> = {
  en: {
    slug: 'sustainable-fashion',
    eyebrow: 'Advice & Inspiration',
    title: 'Buy less. Choose quality that lasts.',
    lead:
      'Timeless shirts over trend pieces — a quieter way to dress that is kinder to the planet.',
    heroImage: '/uploads/articles/sustainable-fashion-hero.jpg',
    sections: SUSTAINABLE_EN_SECTIONS,
  },
  no: {
    slug: 'sustainable-fashion',
    eyebrow: 'Råd & Inspirasjon',
    title: 'Velg kvalitet som varer',
    lead:
      'Velg tidløse høykvalitets skjorter i stedet for moteklær og kjøp mindre klær.',
    heroImage: '/uploads/articles/sustainable-fashion-hero.jpg',
    sections: [
      {
        heading: 'Hvorfor kvalitet teller',
        paragraphs: [
          'Å dyrke bomull krever mye vann. Produksjonen av én konvensjonell skjorte krever omtrent 3000 liter vann. Ja, du leste riktig. Og det meste av bomull dyrkes på steder hvor det er lite vann.',
          'I følge en FN-undersøkelse er moteindustrien ansvarlig for omtrent 10 % av alle klimagassutslipp, 20 % av alt avløpsvann, og bruker mer energi enn flyselskaper og shippingindustrien til sammen.',
        ],
      },
      {
        heading: 'En bedre vane',
        paragraphs: [
          'Et høyt forbruk av moteklær gjør at fotavtrykket ikke stopper opp. En måte å redusere forurensningen på er å kjøpe mindre og kjøpe kvalitet som holder lenger.',
          'Det mest bærekraftige plagget er det vi allerede eier. Så sørg for at du velger tidløs mote hvis du vil overlevere planeten i enda bedre stand for generasjonene som kommer etter oss.',
        ],
      },
    ],
  },
  it: {
    slug: 'sustainable-fashion',
    eyebrow: 'Consigli & Ispirazione',
    title: 'Compra meno. Scegli qualità che dura.',
    lead: 'Camicie senza tempo invece della moda usa e getta.',
    heroImage: '/uploads/articles/sustainable-fashion-hero.jpg',
    sections: SUSTAINABLE_EN_SECTIONS,
  },
  vn: {
    slug: 'sustainable-fashion',
    eyebrow: 'Tư vấn & Cảm hứng',
    title: 'Mua ít hơn. Chọn chất lượng bền lâu.',
    lead: 'Áo sơ mi vượt thời gian thay vì thời trang nhanh.',
    heroImage: '/uploads/articles/sustainable-fashion-hero.jpg',
    sections: SUSTAINABLE_EN_SECTIONS,
  },
};

export function getArticleContent(slug: ArticleSlug, region: RegionCode): ArticleContent {
  if (slug === 'sustainable-fashion') {
    return SUSTAINABLE[region] || SUSTAINABLE.en;
  }
  return FABRIC_GUIDE[region] || FABRIC_GUIDE.en;
}
