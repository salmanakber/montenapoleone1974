import type { RegionCode } from '../types.ts';

export interface SizeChartTable {
  id: 'contemporary' | 'modern_fit' | 'slimfit';
  title: string;
  subtitle: string;
  unit: 'cm';
  sizes: string[];
  rows: Array<{
    metric: string;
    values: Array<number | string>;
  }>;
}

export const SIZE_GUIDE_CHARTS: SizeChartTable[] = [
  {
    id: 'contemporary',
    title: 'Contemporary',
    subtitle: 'Size Charts (cm)',
    unit: 'cm',
    sizes: ['S / 38', 'M / 40', 'L / 42', 'XL / 44', '2XL / 46', '3XL / 48'],
    rows: [
      { metric: 'Neck/Collar', values: [38, 40, 42, 44, 46, 48] },
      { metric: 'Chest Width', values: [106, 113, 122, 130, 134, 146] },
      { metric: 'Waist Width', values: [95, 103, 111, 119, 125, 136] },
      { metric: 'Bottom Width', values: [103, 111, 119, 127, 133, 146] },
      { metric: 'Shoulder Across', values: [44.5, 46.5, 49, 52, 55, 58] },
      { metric: 'Sleeve Length', values: [64.5, 66.5, 68.5, 70.5, 71.5, 74.5] },
      { metric: 'Back Length', values: [76.5, 77.5, 79, 81, 82.5, 85] },
    ],
  },
  {
    id: 'modern_fit',
    title: 'Modern Fit',
    subtitle: 'Size Charts (cm)',
    unit: 'cm',
    sizes: ['M / 39', 'M / 40', 'L / 41', 'L / 42', 'XL / 43', 'XL / 44', '2XL / 45', '2XL / 46'],
    rows: [
      { metric: 'Neck/Collar', values: [39, 40, 41, 42, 43, 44, 45, 46] },
      { metric: 'Chest Width', values: [110, 114, 116, 120, 124, 127, 132, 135] },
      { metric: 'Waist Width', values: [100, 103, 106, 109, 114, 118, 121, 124] },
      { metric: 'Bottom Width', values: [109, 112, 115, 120, 125, 130, 133, 136] },
      { metric: 'Shoulder Across', values: [46.5, 48, 49.5, 51, 53.5, 55, 56.5, 58] },
      { metric: 'Sleeve Length', values: [66, 66.5, 67, 67.5, 68, 69, 69.5, 70] },
      { metric: 'Back Length', values: [79, 80, 81, 82, 83, 84, 85, 86] },
    ],
  },
  {
    id: 'slimfit',
    title: 'Slimfit',
    subtitle: 'Size Charts (cm)',
    unit: 'cm',
    sizes: [
      'XS / 36',
      'S / 37',
      'S / 38',
      'M / 39',
      'M / 40',
      'L / 41',
      'L / 42',
      'XL / 43',
      'XL / 44',
    ],
    rows: [
      { metric: 'Neck/Collar', values: [36, 37, 38, 39, 40, 41, 42, 43, 44] },
      { metric: 'Chest Width', values: [93, 96, 102, 105, 109, 113, 118, 123, 126] },
      { metric: 'Waist Width', values: [83, 86, 91, 94, 99, 103, 106, 110, 113] },
      { metric: 'Bottom Width', values: [92, 96, 100, 104, 108, 112, 117, 122, 125] },
      { metric: 'Shoulder Across', values: [41, 42.5, 44, 45.5, 47, 48, 49, 51, 52] },
      { metric: 'Sleeve Length', values: [64, 64.5, 65, 65.5, 66, 67, 68, 69, 69.5] },
      { metric: 'Back Length', values: [75, 77, 78, 79, 80, 81, 82, 83, 84] },
    ],
  },
];

export interface ReturnFormPdfEntry {
  code: RegionCode;
  languageLabel: string;
  shortLabel: string;
  formTitle: string;
  url: string;
  downloadName: string;
}

export const RETURN_FORM_PDFS: Record<RegionCode, ReturnFormPdfEntry> = {
  en: {
    code: 'en',
    languageLabel: 'English (Form B)',
    shortLabel: 'English',
    formTitle: 'Right of Withdrawal & Return Form — English (Form B)',
    url: '/assets/aistudio/Return_English_8c2b95ab.pdf',
    downloadName: 'Monte-Napoleone-1974-Return-Form-English.pdf',
  },
  no: {
    code: 'no',
    languageLabel: 'Norsk (Skjema A)',
    shortLabel: 'Norsk',
    formTitle: 'Angreskjema & Returskjema — Norsk Bokmål (Skjema A)',
    url: '/assets/aistudio/Return_Norwegian_e44561c2.pdf',
    downloadName: 'Monte-Napoleone-1974-Angreskjema-Norsk.pdf',
  },
  it: {
    code: 'it',
    languageLabel: 'Italiano (Modulo D)',
    shortLabel: 'Italiano',
    formTitle: 'Modulo di Recesso e Reso — Italiano (Modulo D)',
    url: '/assets/aistudio/Return_Italian_Modulo_Recesso.pdf',
    downloadName: 'Monte-Napoleone-1974-Modulo-Recesso-Italiano.pdf',
  },
  vn: {
    code: 'vn',
    languageLabel: 'Tiếng Việt (Mẫu C)',
    shortLabel: 'Tiếng Việt',
    formTitle: 'Mẫu Đơn Hủy Giao Dịch & Trả Hàng — Tiếng Việt (Mẫu C)',
    url: '/assets/aistudio/Return_Tieng_Viet_6ea36a22.pdf',
    downloadName: 'Monte-Napoleone-1974-Mau-Don-Huy-Tieng-Viet.pdf',
  },
};

export function getReturnFormPdfForRegion(regionCode?: RegionCode): ReturnFormPdfEntry {
  if (regionCode && regionCode in RETURN_FORM_PDFS) {
    return RETURN_FORM_PDFS[regionCode];
  }
  return RETURN_FORM_PDFS.en;
}
