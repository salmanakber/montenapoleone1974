import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  isWooCommerceCsvHeader,
  parseWooCommerceCsv,
  resolveVariantPriceAndStock,
} from './commerce.ts';
import type { Product } from '../types.ts';

test('parses real WooCommerce products CSV with images, gallery, variations, and hierarchical categories', () => {
  const csvPath = path.resolve(process.cwd(), 'public/assets/aistudio/products_d57ace78.csv');
  const csvText = fs.readFileSync(csvPath, 'utf8');

  assert.equal(isWooCommerceCsvHeader(csvText), true);
  const parsed = parseWooCommerceCsv(csvText, 'no');

  // Expect ~164 parent shirts in the catalog without dropping parents
  assert.ok(parsed.rows.length >= 160, `Expected >= 160 parent products, got ${parsed.rows.length}`);
  assert.ok(parsed.categories.length >= 5, `Expected >= 5 categories, got ${parsed.categories.length}`);

  // Check F61 product which has Image URL, Gallery Image URLs, fits, sizes, and child variations
  const f61 = parsed.rows.find((r) => r.sku === 'F61');
  assert.ok(f61, 'Expected product F61 to be parsed');
  assert.ok(f61.images.length >= 2, `Expected F61 to extract primary + gallery images, got ${f61.images.length}`);
  assert.ok(
    f61.images.every((url) => url.startsWith('http')),
    'All extracted F61 image URLs must be valid HTTP(S) URLs'
  );
  assert.ok(f61.variations.length > 0, 'Expected F61 to attach variation rows');
  assert.ok(f61.fits.length >= 1, 'Expected F61 to parse Fit options');
  assert.ok(f61.sizes.length >= 1, 'Expected F61 to parse Size options');

  // Verify double-space category hierarchy ("Herre Skjorter  Flanell skjorte") split properly
  const hasChildCategory = parsed.categories.some((c) => Boolean(c.parentSlug));
  assert.equal(hasChildCategory, true, 'Expected parent > child categories from double-space separator');
  // Ensure every parent product has at least one image or valid fallback check
  const withImages = parsed.rows.filter((r) => r.images.length > 0);
  assert.ok(withImages.length >= 140, `Expected most imported products to include images, got ${withImages.length}`);
});

test('parses custom fits, gallery URLs, and missing Parent SKU name fallback', () => {
  const csv = [
    'Product ID,SKU,Parent SKU,Type,Name,Formatted Name,Status,Regular Price,Sale Price,Stock Quantity,Categories,Image URL,Gallery Image URLs,Variation Attributes,Attribute 1 name,Attribute 1 value(s),Attribute 2 name,Attribute 2 value(s)',
    '5001,MN-C99,,variable,"Milano Custom Fit Shirt","",publish,199,179,,"Herre Skjorter  Business","https://example.com/main.jpg","https://example.com/g1.jpg;https://example.com/g2.jpg","","Fit","Custom Tailored Fit | Slim Fit","Size","38 / S | 40 / M"',
    '5002,MN-C99,,variation,"Milano Custom Fit Shirt","",publish,215,,12,"","","","Fit: Custom Tailored Fit | Size: 40 / M","Fit","Custom Tailored Fit","Size","40 / M"',
  ].join('\n');

  assert.equal(isWooCommerceCsvHeader(csv), true);
  const res = parseWooCommerceCsv(csv, 'en');
  assert.equal(res.rows.length, 1);
  const item = res.rows[0];
  assert.equal(item.sku, 'MN-C99');
  assert.deepEqual(item.images, [
    'https://example.com/main.jpg',
    'https://example.com/g1.jpg',
    'https://example.com/g2.jpg',
  ]);
  assert.ok(item.fits.includes('Custom Tailored Fit'));
  assert.equal(item.variations.length, 1);
  assert.equal(item.variations[0].fit, 'Custom Tailored Fit');
  assert.equal(item.variations[0].sizeLabel, '40 / M');
  assert.notEqual(item.variations[0].skuVariant, 'MN-C99');
});

test('resolveVariantPriceAndStock resolves custom fit price & stock override', () => {
  const mockProduct: Product = {
    id: 1,
    sku: 'MN-TEST',
    slug: 'mn-test',
    category_slug: 'business',
    fabric_spec: 'Cotton',
    is_featured: true,
    is_b2b_eligible: true,
    is_outlet: false,
    preorder_allowed: false,
    primary_image: '',
    secondary_image: '',
    gallery: [],
    collars: [],
    cuffs: [],
    sizes: ['40 / M'],
    active: true,
    title: 'Test',
    subtitle: '',
    description: '',
    price: 180,
    compare_at_price: null,
    stock_qty: 5,
    warehouse_location: 'Treviso',
    delivery_note: '',
    variants: [
      {
        product_id: 1,
        fit: 'Tailored Fit',
        size_label: '40 / M',
        sku_variant: 'MN-TEST-TAIL-40M',
        price_en: 210,
        price_no: 1990,
        price_it: 195,
        price_vn: 5100000,
        stock_en: 14,
        stock_no: 8,
        stock_it: 9,
        stock_vn: 3,
        active: true,
      },
    ],
  };

  const resolved = resolveVariantPriceAndStock(mockProduct, 'en', 'Tailored Fit', '40 / M');
  assert.equal(resolved.price, 210);
  assert.equal(resolved.stockQty, 14);
});
