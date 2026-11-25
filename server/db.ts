import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const DB_PATH = path.join(DATA_DIR, 'montenapoleone.db');
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS regions (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      language_name TEXT NOT NULL,
      currency_code TEXT NOT NULL,
      currency_symbol TEXT NOT NULL,
      vat_rate REAL NOT NULL DEFAULT 0,
      free_shipping_threshold REAL NOT NULL DEFAULT 0,
      dhl_base_rate REAL NOT NULL DEFAULT 0,
      dhl_express_rate REAL NOT NULL DEFAULT 0,
      dhl_eta_days TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      bank_account_display TEXT NOT NULL,
      bank_iban TEXT NOT NULL,
      bank_bic TEXT NOT NULL,
      bank_reference_prefix TEXT NOT NULL,
      enabled_payments TEXT NOT NULL,
      warehouse_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      scope TEXT NOT NULL DEFAULT 'both' CHECK (scope IN ('both', 'b2c', 'b2b')),
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      name_en TEXT NOT NULL,
      name_no TEXT NOT NULL,
      name_it TEXT NOT NULL,
      name_vn TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category_slug TEXT NOT NULL,
      category_slugs_json TEXT NOT NULL DEFAULT '[]',
      fabric_spec TEXT NOT NULL,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_b2b_eligible INTEGER NOT NULL DEFAULT 1,
      is_outlet INTEGER NOT NULL DEFAULT 0,
      preorder_allowed INTEGER NOT NULL DEFAULT 0,
      primary_image TEXT NOT NULL,
      secondary_image TEXT NOT NULL,
      gallery_json TEXT NOT NULL,
      collars_json TEXT NOT NULL,
      cuffs_json TEXT NOT NULL,
      sizes_json TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_localizations (
      product_id INTEGER NOT NULL,
      region_code TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      compare_at_price REAL,
      stock_qty INTEGER NOT NULL DEFAULT 0,
      warehouse_location TEXT NOT NULL,
      delivery_note TEXT NOT NULL,
      PRIMARY KEY (product_id, region_code),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (region_code) REFERENCES regions(code) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      url TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      width INTEGER NOT NULL DEFAULT 1200,
      height INTEGER NOT NULL DEFAULT 1200,
      folder TEXT NOT NULL DEFAULT 'uploads',
      alt_text TEXT NOT NULL DEFAULT '',
      caption TEXT NOT NULL DEFAULT '',
      uploaded_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'staff', 'customer')),
      permissions_json TEXT NOT NULL,
      assigned_regions_json TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      region_code TEXT NOT NULL,
      currency_code TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      shipping_city TEXT NOT NULL,
      shipping_postal_code TEXT NOT NULL,
      shipping_country TEXT NOT NULL,
      billing_same_as_shipping INTEGER NOT NULL DEFAULT 1,
      billing_name TEXT,
      billing_email TEXT,
      billing_phone TEXT,
      billing_address TEXT,
      billing_city TEXT,
      billing_postal_code TEXT,
      billing_country TEXT,
      is_b2b INTEGER NOT NULL DEFAULT 0,
      company_name TEXT,
      org_number TEXT,
      subtotal REAL NOT NULL,
      shipping_cost REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      vat_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      payment_reference TEXT NOT NULL,
      shipping_method TEXT NOT NULL,
      dhl_tracking_number TEXT,
      dhl_status TEXT NOT NULL DEFAULT 'pending_label',
      order_status TEXT NOT NULL DEFAULT 'pending',
      items_json TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS b2b_inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      region_code TEXT NOT NULL,
      estimated_qty INTEGER NOT NULL,
      embroidery_requested INTEGER NOT NULL DEFAULT 1,
      notes TEXT NOT NULL,
      items_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'new',
      quoted_unit_price REAL,
      converted_order_number TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot TEXT NOT NULL DEFAULT 'mega_card' CHECK (slot IN ('mega_card', 'nav_link')),
      target_type TEXT NOT NULL DEFAULT 'category' CHECK (target_type IN ('category', 'view')),
      target_value TEXT NOT NULL DEFAULT 'all',
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      title_en TEXT NOT NULL,
      title_no TEXT NOT NULL,
      title_it TEXT NOT NULL,
      title_vn TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      region_code TEXT NOT NULL,
      discount_code TEXT NOT NULL DEFAULT 'MONTE10',
      status TEXT NOT NULL DEFAULT 'subscribed',
      mailchimp_status TEXT NOT NULL DEFAULT 'sandbox_queued',
      mailchimp_member_id TEXT,
      synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_email TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tailoring_size_specs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fit TEXT NOT NULL,
      size_label TEXT NOT NULL,
      shirt_length_cm REAL NOT NULL,
      sleeve_length_cm REAL NOT NULL,
      waist_cm REAL NOT NULL,
      chest_cm REAL NOT NULL,
      bottom_hem_cm REAL NOT NULL,
      shoulder_cm REAL NOT NULL,
      sketch_shirt_length TEXT NOT NULL DEFAULT '',
      sketch_sleeve_length TEXT NOT NULL DEFAULT '',
      sketch_waist TEXT NOT NULL DEFAULT '',
      sketch_chest TEXT NOT NULL DEFAULT '',
      sketch_bottom_hem TEXT NOT NULL DEFAULT '',
      sketch_shoulder TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(fit, size_label)
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      fit TEXT NOT NULL,
      size_label TEXT NOT NULL,
      sku_variant TEXT NOT NULL,
      price_en REAL,
      price_no REAL,
      price_it REAL,
      price_vn REAL,
      stock_en INTEGER NOT NULL DEFAULT 10,
      stock_no INTEGER NOT NULL DEFAULT 10,
      stock_it INTEGER NOT NULL DEFAULT 10,
      stock_vn INTEGER NOT NULL DEFAULT 10,
      active INTEGER NOT NULL DEFAULT 1,
      UNIQUE(product_id, fit, size_label),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      sku TEXT NOT NULL,
      variant_label TEXT,
      region_code TEXT NOT NULL,
      delta_qty INTEGER NOT NULL,
      previous_qty INTEGER NOT NULL,
      new_qty INTEGER NOT NULL,
      reason TEXT NOT NULL,
      reference_id TEXT NOT NULL DEFAULT '',
      actor_email TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hero_slides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      image_url TEXT NOT NULL,
      target_type TEXT NOT NULL DEFAULT 'category' CHECK (target_type IN ('category', 'view')),
      target_value TEXT NOT NULL DEFAULT 'all',
      show_text INTEGER NOT NULL DEFAULT 1,
      show_button INTEGER NOT NULL DEFAULT 1,
      title_en TEXT NOT NULL,
      title_no TEXT NOT NULL,
      title_it TEXT NOT NULL,
      title_vn TEXT NOT NULL,
      subtitle_en TEXT NOT NULL DEFAULT '',
      subtitle_no TEXT NOT NULL DEFAULT '',
      subtitle_it TEXT NOT NULL DEFAULT '',
      subtitle_vn TEXT NOT NULL DEFAULT '',
      cta_en TEXT NOT NULL DEFAULT 'Explore Collection',
      cta_no TEXT NOT NULL DEFAULT 'Se Kolleksjonen',
      cta_it TEXT NOT NULL DEFAULT 'Scopri la Collezione',
      cta_vn TEXT NOT NULL DEFAULT 'Khám phá ngay'
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS visitor_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      country TEXT NOT NULL,
      country_code TEXT NOT NULL,
      city TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      region_code TEXT NOT NULL,
      current_path TEXT NOT NULL DEFAULT '/',
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT,
      recipient_email TEXT NOT NULL,
      region_code TEXT NOT NULL,
      template_type TEXT NOT NULL,
      subject TEXT NOT NULL,
      html_preview TEXT NOT NULL,
      status TEXT NOT NULL,
      provider_id TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tailoring_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      option_type TEXT NOT NULL CHECK (option_type IN ('collar', 'cuff')),
      name TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      detail TEXT NOT NULL DEFAULT '',
      stitch_spec TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(option_type, name)
    );

    CREATE TABLE IF NOT EXISTS product_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      order_number TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      title TEXT NOT NULL DEFAULT '',
      comment TEXT NOT NULL DEFAULT '',
      fit_feedback TEXT NOT NULL DEFAULT 'true_to_size',
      region_code TEXT NOT NULL DEFAULT 'en',
      verified_purchase INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(product_id, customer_email),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      order_number TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      customer_email TEXT NOT NULL,
      customer_name TEXT NOT NULL DEFAULT '',
      region_code TEXT NOT NULL DEFAULT 'en',
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(order_number, product_id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS abandoned_carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      email TEXT,
      customer_name TEXT NOT NULL DEFAULT '',
      region_code TEXT NOT NULL DEFAULT 'en',
      items_json TEXT NOT NULL DEFAULT '[]',
      subtotal REAL NOT NULL DEFAULT 0,
      item_count INTEGER NOT NULL DEFAULT 0,
      checkout_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      reminder_stage INTEGER NOT NULL DEFAULT 0,
      last_reminder_at TEXT,
      recovered_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  ensureColumn('categories', 'parent_id', 'INTEGER REFERENCES categories(id) ON DELETE SET NULL');
  ensureColumn('categories', 'scope', "TEXT NOT NULL DEFAULT 'both'");
  ensureColumn('categories', 'active', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('orders', 'billing_same_as_shipping', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('orders', 'billing_name', 'TEXT');
  ensureColumn('orders', 'billing_email', 'TEXT');
  ensureColumn('orders', 'billing_phone', 'TEXT');
  ensureColumn('orders', 'billing_address', 'TEXT');
  ensureColumn('orders', 'billing_city', 'TEXT');
  ensureColumn('orders', 'billing_postal_code', 'TEXT');
  ensureColumn('orders', 'billing_country', 'TEXT');
  ensureColumn('b2b_inquiries', 'items_json', "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn('b2b_inquiries', 'quoted_unit_price', 'REAL');
  ensureColumn('b2b_inquiries', 'converted_order_number', 'TEXT');
  ensureColumn('newsletter_subscribers', 'status', "TEXT NOT NULL DEFAULT 'subscribed'");
  ensureColumn('newsletter_subscribers', 'mailchimp_status', "TEXT NOT NULL DEFAULT 'sandbox_queued'");
  ensureColumn('newsletter_subscribers', 'mailchimp_member_id', 'TEXT');
  ensureColumn('newsletter_subscribers', 'synced_at', 'TEXT');
  ensureColumn('products', 'category_slugs_json', "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn('product_localizations', 'seo_title', "TEXT NOT NULL DEFAULT ''");
  ensureColumn('product_localizations', 'seo_description', "TEXT NOT NULL DEFAULT ''");
  ensureColumn('product_localizations', 'seo_keywords', "TEXT NOT NULL DEFAULT ''");
  db.exec(
    "UPDATE products SET category_slugs_json = json_array(category_slug) WHERE category_slugs_json = '[]' OR category_slugs_json = ''"
  );

  seedInitialData();
  syncTailoringSizeGuideSketches();
}

/** Map Downloads/Size folder assets onto tailoring_size_specs sketch_* columns */
export function syncTailoringSizeGuideSketches(): { updated: number; created: number } {
  const roots = [
    path.resolve(process.cwd(), 'public', 'size-guides'),
    path.resolve(process.cwd(), 'dist', 'size-guides'),
  ];
  const root = roots.find((r) => fs.existsSync(r));
  if (!root) return { updated: 0, created: 0 };

  const fitDirMap: Record<string, string> = {
    modern: 'Regular Fit',
    slim: 'Slim Fit',
    contemporary: 'Contemporary Fit',
  };

  const sizeLabelFromFolder = (folderName: string): string | null => {
    const token = folderName.split('-')[0] || '';
    const m = token.match(/^(\d{2})([A-Za-z0-9]+)$/i);
    if (!m) return null;
    const collar = m[1];
    const alpha = m[2].toUpperCase();
    const key = `${collar}-${alpha}`;
    const map: Record<string, string> = {
      '36-XS': '36 / XS',
      '37-S': '37 / XS',
      '37-XS': '37 / XS',
      '38-S': '38 / S',
      '39-M': '39 / M',
      '40-M': '40 / M',
      '41-L': '41 / L',
      '42-L': '42 / L',
      '43-XL': '43 / XL',
      '44-XL': '44 / XXL',
      '44-XXL': '44 / XXL',
      '45-2XL': '45 / 3XL',
      '45-XXL': '45 / 3XL',
      '45-3XL': '45 / 3XL',
      '46-2XL': '46 / 4XL',
      '46-XXL': '46 / 4XL',
      '46-4XL': '46 / 4XL',
      '48-3XL': '48 / 5XL',
      '48-5XL': '48 / 5XL',
    };
    return map[key] || `${collar} / ${alpha}`;
  };

  const pickSketchFile = (files: string[], prefer: string[], exclude: string[] = []): string | null => {
    const normalized = files.map((f) => ({
      f,
      b: path
        .basename(f)
        .toLowerCase()
        .replace(/^39regular-man-/, '')
        .replace(/\s+/g, ''),
    }));
    for (const pref of prefer) {
      const hit = normalized.find(({ b }) => {
        if (exclude.some((ex) => b.includes(ex))) return false;
        return b === pref || b.includes(pref);
      });
      if (hit) return hit.f;
    }
    return null;
  };

  const publicUrlFor = (absFile: string): string => {
    const rel = path.relative(root, absFile).split(path.sep).join('/');
    return `/size-guides/${rel}`;
  };

  const defaultCmFor = (fit: string, sizeLabel: string) => {
    const num = Number((sizeLabel.match(/\d{2}/) || ['40'])[0]);
    const offset = num - 40;
    const chestAdj = fit === 'Slim Fit' ? -4 : fit === 'Contemporary Fit' ? -2 : 0;
    const waistAdj = fit === 'Slim Fit' ? -6 : fit === 'Contemporary Fit' ? -3 : 0;
    const hemAdj = fit === 'Slim Fit' ? -4 : fit === 'Contemporary Fit' ? -2 : 0;
    return {
      shirt_length_cm: Math.round((77 + offset * 0.5) * 10) / 10,
      sleeve_length_cm: Math.round((65 + offset * 0.5) * 10) / 10,
      waist_cm: Math.round((102 + offset * 3 + waistAdj) * 10) / 10,
      chest_cm: Math.round((110 + offset * 3 + chestAdj) * 10) / 10,
      bottom_hem_cm: Math.round((106 + offset * 3 + hemAdj) * 10) / 10,
      shoulder_cm: Math.round((46 + offset * 0.7) * 10) / 10,
    };
  };

  let updated = 0;
  let created = 0;

  const upsert = db.prepare(`
    INSERT INTO tailoring_size_specs (
      fit, size_label, shirt_length_cm, sleeve_length_cm, waist_cm, chest_cm, bottom_hem_cm, shoulder_cm,
      sketch_shirt_length, sketch_sleeve_length, sketch_waist, sketch_chest, sketch_bottom_hem, sketch_shoulder, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(fit, size_label) DO UPDATE SET
      sketch_shirt_length = excluded.sketch_shirt_length,
      sketch_sleeve_length = excluded.sketch_sleeve_length,
      sketch_waist = excluded.sketch_waist,
      sketch_chest = excluded.sketch_chest,
      sketch_bottom_hem = excluded.sketch_bottom_hem,
      sketch_shoulder = excluded.sketch_shoulder,
      updated_at = datetime('now')
  `);

  const fitDirs = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const fitDir of fitDirs) {
    const fit = fitDirMap[fitDir.name.toLowerCase()];
    if (!fit) continue;
    const fitPath = path.join(root, fitDir.name);
    const sizeDirs = fs.readdirSync(fitPath, { withFileTypes: true }).filter((d) => d.isDirectory());
    for (const sizeDir of sizeDirs) {
      const sizeLabel = sizeLabelFromFolder(sizeDir.name);
      if (!sizeLabel) continue;
      const sizePath = path.join(fitPath, sizeDir.name);
      const files = fs
        .readdirSync(sizePath)
        .filter((n) => /\.(jpe?g|png|webp)$/i.test(n))
        .map((n) => path.join(sizePath, n));
      if (files.length === 0) continue;

      const shirtFile = pickSketchFile(files, ['backlength.jpg', 'backlength', 'back.jpg', 'back.jpeg'], [
        'shoulder',
        'sholder',
      ]);
      const sleeveFile = pickSketchFile(files, ['sleeve.jpg', 'sleeve']);
      const waistFile = pickSketchFile(files, ['halfwaist.jpg', 'halfwaist', 'waist.jpg', 'waist']);
      const chestFile = pickSketchFile(files, ['halfchest.jpg', 'halfchest', 'chest.jpg', 'chest']);
      const bottomFile = pickSketchFile(files, [
        'halfbottom.jpg',
        'halfbottom',
        'bottom.jpg',
        'bottom.jpeg',
        'bottom',
      ]);
      const shoulderFile = pickSketchFile(files, [
        'backshoulder.jpg',
        'backsholder.jpg',
        'backshoulder',
        'backsholder',
        'shoulder.jpg',
        'shoulder',
      ]);

      const sketches = {
        sketch_shirt_length: shirtFile ? publicUrlFor(shirtFile) : '',
        sketch_sleeve_length: sleeveFile ? publicUrlFor(sleeveFile) : '',
        sketch_waist: waistFile ? publicUrlFor(waistFile) : '',
        sketch_chest: chestFile ? publicUrlFor(chestFile) : '',
        sketch_bottom_hem: bottomFile ? publicUrlFor(bottomFile) : '',
        sketch_shoulder: shoulderFile ? publicUrlFor(shoulderFile) : '',
      };
      if (!Object.values(sketches).some(Boolean)) continue;

      const existing = db
        .prepare('SELECT id FROM tailoring_size_specs WHERE fit = ? AND size_label = ?')
        .get(fit, sizeLabel) as { id: number } | undefined;
      const cm = defaultCmFor(fit, sizeLabel);
      upsert.run(
        fit,
        sizeLabel,
        cm.shirt_length_cm,
        cm.sleeve_length_cm,
        cm.waist_cm,
        cm.chest_cm,
        cm.bottom_hem_cm,
        cm.shoulder_cm,
        sketches.sketch_shirt_length,
        sketches.sketch_sleeve_length,
        sketches.sketch_waist,
        sketches.sketch_chest,
        sketches.sketch_bottom_hem,
        sketches.sketch_shoulder
      );
      if (existing) updated++;
      else created++;
    }
  }

  if (updated + created > 0) {
    console.log(`[size-guides] Synced sketches: ${updated} updated, ${created} created`);
  }
  return { updated, created };
}

function ensureColumn(tableName: string, columnName: string, definition: string): void {
  const cols = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function seedInitialData(): void {
  const existingRegions = db.prepare('SELECT COUNT(*) AS count FROM regions').get() as { count: number };
  if (existingRegions.count === 0) {
    const insertRegion = db.prepare(`
      INSERT INTO regions (
        code, name, language_name, currency_code, currency_symbol, vat_rate,
        free_shipping_threshold, dhl_base_rate, dhl_express_rate, dhl_eta_days,
        bank_name, bank_account_display, bank_iban, bank_bic, bank_reference_prefix,
        enabled_payments, warehouse_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertRegion.run(
      'en', 'International', 'English', 'USD', '$', 0,
      250, 22, 38, '3–5 business days via DHL Express',
      'DNB Bank ASA International', '1506.88.41920', 'NO9315068841920', 'DNBANOKKXXX', 'MNUS',
      JSON.stringify(['stripe', 'paypal', 'bank_transfer']),
      'Treviso Global Hub'
    );
    insertRegion.run(
      'no', 'Norway', 'Norsk', 'NOK', 'kr', 0.25,
      2500, 149, 279, '1–3 virkedager med DHL Express',
      'DNB Bank ASA Oslo', '1506.88.41920', 'NO9315068841920', 'DNBANOKKXXX', 'MN',
      JSON.stringify(['vipps', 'stripe', 'paypal', 'bank_transfer']),
      'Oslo Showroom (Maridalsveien 87)'
    );
    insertRegion.run(
      'it', 'Italy', 'Italiano', 'EUR', '€', 0.22,
      200, 14, 26, '1–2 giorni lavorativi con DHL Express',
      'Intesa Sanpaolo Treviso', 'IT60 X030 6912 0801 0000 0045 812', 'IT60X0306912080100000045812', 'BCITITMM', 'MNIT',
      JSON.stringify(['stripe', 'paypal', 'bank_transfer']),
      'Treviso Atelier Warehouse'
    );
    insertRegion.run(
      'vn', 'Việt Nam', 'Tiếng Việt', 'VND', '₫', 0.1,
      5000000, 180000, 390000, '2–4 ngày làm việc qua DHL Express',
      'Vietcombank Chi nhánh TP.HCM', '0071001289451 — MONTE NAPOLEONE VN', 'VN-VCB-0071001289451', 'BFTVVNVX', 'MNVN',
      JSON.stringify(['stripe', 'paypal', 'bank_transfer']),
      'Ho Chi Minh City Hub'
    );
  }

  const existingCategories = db.prepare('SELECT COUNT(*) AS count FROM categories').get() as { count: number };
  if (existingCategories.count === 0) {
    const insertCat = db.prepare(`
      INSERT INTO categories (slug, parent_id, scope, active, sort_order, name_en, name_no, name_it, name_vn)
      VALUES (?, NULL, ?, 1, ?, ?, ?, ?, ?)
    `);
    insertCat.run('linen', 'both', 1, 'Linen Shirts', 'Linskjorter', 'Camicie in Lino', 'Áo Sơ Mi Linen');
    insertCat.run('flannel', 'both', 2, 'Flannel Shirts', 'Flanell skjorter', 'Camicie in Flanella', 'Áo Sơ Mi Flannel');
    insertCat.run('business', 'both', 3, 'Business Shirts', 'Business skjorter', 'Camicie Business', 'Áo Sơ Mi Công Sở');
    insertCat.run('oxford', 'both', 4, 'Oxford Shirts', 'Oxford skjorter', 'Camicie Oxford', 'Áo Sơ Mi Oxford');
    insertCat.run('stretch', 'both', 5, 'Stretch Shirts', 'Stretch Skjorter', 'Camicie Stretch', 'Áo Sơ Mi Co Giãn');
    insertCat.run('outlet', 'b2c', 6, 'Outlet', 'Outlet', 'Outlet', 'Ưu đãi Outlet');
    insertCat.run('b2b', 'b2b', 7, 'Corporate Agreement', 'Bedriftsavtale', 'Accordi B2B', 'Đồng phục B2B');
  }

  const existingMenu = db.prepare('SELECT COUNT(*) AS count FROM menu_items').get() as { count: number };
  if (existingMenu.count === 0) {
    const insertMenu = db.prepare(`
      INSERT INTO menu_items (
        slot, target_type, target_value, sort_order, active, title_en, title_no, title_it, title_vn, image_url
      ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    `);
    insertMenu.run(
      'mega_card', 'category', 'all', 1,
      "MEN'S SHIRTS", 'HERRE SKJORTER', 'CAMICIE UOMO', 'ÁO SƠ MI NAM',
      '/src/assets/images/editorial_casual_linen_1795248294319.jpg'
    );
    insertMenu.run(
      'mega_card', 'category', 'linen', 2,
      'LINEN SHIRTS', 'LINSKJORTER', 'CAMICIE IN LINO', 'ÁO SƠ MI LINEN',
      '/src/assets/images/shirt_beige_linen_1795248293982.jpg'
    );
    insertMenu.run(
      'mega_card', 'category', 'business', 3,
      'BUSINESS TWO-PLY', 'BUSINESS SKJORTER', 'BUSINESS DOPPIO RITORTO', 'ÁO CÔNG SỞ TWO-PLY',
      '/src/assets/images/shirt_blue_business_1795248293673.jpg'
    );
    insertMenu.run(
      'mega_card', 'category', 'oxford', 4,
      'OXFORD & FLANNEL', 'OXFORD & FLANELL', 'OXFORD & FLANELLA', 'OXFORD & FLANNEL',
      '/src/assets/images/hero_oxford_olive_1795248294228.jpg'
    );
  }

  const existingMedia = db.prepare('SELECT COUNT(*) AS count FROM media').get() as { count: number };
  if (existingMedia.count === 0) {
    const insertMedia = db.prepare(`
      INSERT INTO media (filename, original_name, url, mime_type, size_bytes, width, height, folder, alt_text, caption, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const seedAssets: Array<[string, string, string, string, number, number, number, string, string, string]> = [
      ['hero_oxford_olive.jpg', 'hero-oxford-olive.jpg', '/src/assets/images/hero_oxford_olive_1795248294228.jpg', 'image/jpeg', 428100, 1920, 1080, 'hero', 'All Year Around Olive Oxford Collection', 'Autumn/Winter Treviso Campaign'],
      ['hero_linen_coastal.jpg', 'hero-linen-coastal.jpg', '/src/assets/images/hero_linen_coastal_1795248294948.jpg', 'image/jpeg', 462900, 1920, 1080, 'hero', 'Coastal Italian Linen Campaign', 'Breathable Linen Collection'],
      ['editorial_casual_linen.jpg', 'editorial-casual-linen.jpg', '/src/assets/images/editorial_casual_linen_1795248294319.jpg', 'image/jpeg', 392400, 1200, 1600, 'editorial', 'Cobalt Navy Casual Linen Shirt', 'Casual Linen Editorial'],
      ['editorial_corporate_b2b.jpg', 'editorial-corporate-b2b.jpg', '/src/assets/images/editorial_corporate_b2b_1795248294517.jpg', 'image/jpeg', 371200, 1200, 1600, 'editorial', 'Corporate Uniform Tailored Shirt', 'B2B Executive Agreement'],
      ['editorial_business_twoply.jpg', 'editorial-business-twoply.jpg', '/src/assets/images/editorial_business_twoply_1795248294929.jpg', 'image/jpeg', 385600, 1200, 1600, 'editorial', 'Signature White Two-Ply Business Shirt', '100/2-Ply Business Collection'],
      ['shirt_beige_linen.jpg', 'beige-linen-l3.jpg', '/src/assets/images/shirt_beige_linen_1795248293982.jpg', 'image/jpeg', 298000, 1200, 1200, 'products', 'Beige Linen Shirt #L3 Studio Front', '100% European Linen #L3'],
      ['shirt_striped_linen.jpg', 'striped-linen-l23.jpg', '/src/assets/images/shirt_striped_linen_1795248293538.jpg', 'image/jpeg', 312400, 1200, 1200, 'products', 'Beige/Blue Striped Linen Shirt #L23', 'Striped Linen-Cotton #L23'],
      ['shirt_blue_business.jpg', 'blue-business-b11.jpg', '/src/assets/images/shirt_blue_business_1795248293673.jpg', 'image/jpeg', 284100, 1200, 1200, 'products', 'Blue 2-Ply Non-Iron Business Shirt #B11', 'Two-Ply Easy-Care Twill #B11'],
      ['shirt_white_signature.jpg', 'white-signature-b1.jpg', '/src/assets/images/shirt_white_signature_1795248293653.jpg', 'image/jpeg', 265900, 1200, 1200, 'products', 'Signature White 100/2-Ply Business Shirt #B1', 'Treviso Signature 100/2-Ply #B1'],
      ['editorial_tailoring_guide.jpg', 'tailoring-guide.jpg', '/src/assets/images/editorial_tailoring_guide_1795248294030.jpg', 'image/jpeg', 405000, 1920, 1080, 'tailoring', 'Bespoke Shirt Measuring Tape & Cuff', 'How to Measure Guide'],
    ];
    for (const [fn, orig, url, mime, bytes, w, h, folder, alt, cap] of seedAssets) {
      insertMedia.run(fn, orig, url, mime, bytes, w, h, folder, alt, cap, 'Treviso Studio');
    }
  }

  const existingProducts = db.prepare('SELECT COUNT(*) AS count FROM products').get() as { count: number };
  if (existingProducts.count === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (
        sku, slug, category_slug, category_slugs_json, fabric_spec, is_featured, is_b2b_eligible, is_outlet,
        preorder_allowed, primary_image, secondary_image, gallery_json, collars_json, cuffs_json, sizes_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertLoc = db.prepare(`
      INSERT INTO product_localizations (
        product_id, region_code, title, subtitle, description, price, compare_at_price,
        stock_qty, warehouse_location, delivery_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const collars = JSON.stringify(['Spread', 'Semi Spread', 'Button Down', 'Cutaway']);
    const cuffs = JSON.stringify(['Angle', 'Modern', 'Rounded', 'Single French']);
    const sizes = JSON.stringify([
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
    ]);

    const catalogSeed = [
      {
        sku: 'MN-L3',
        slug: 'beige-linen-l3',
        category_slug: 'linen',
        fabric_spec: '100% Normandy & Belgian Long-Staple Linen · 145 GSM',
        is_featured: 1,
        is_b2b_eligible: 0,
        is_outlet: 0,
        preorder_allowed: 0,
        primary_image: '/src/assets/images/shirt_beige_linen_1795248293982.jpg',
        secondary_image: '/src/assets/images/editorial_casual_linen_1795248294319.jpg',
        locs: {
          en: {
            title: 'BEIGE Linen Shirt #L3',
            subtitle: '100% Natural European Linen',
            description: 'Discover the timeless elegance and breathable comfort of our signature Beige Linen Shirt #L3. Woven from 100% natural long-staple European linen with complimentary custom sleeve and body length.',
            price: 185,
            compare_at_price: null,
            stock_qty: 18,
            warehouse_location: 'Treviso Global Hub',
            delivery_note: 'Dispatches within 24h · Free bespoke sleeve tailoring',
          },
          no: {
            title: 'BEIGE Linskjorte #L3',
            subtitle: '100% Naturlig Europeisk Lin',
            description: 'Oppdag den tidløse elegansen og uovertrufne komforten i vår linskjorte #L3. Laget av 100 % naturlig lin som puster optimalt og blir mykere for hvert bruk. Inkluderer kostnadsfritt skreddersydd erme- og skjortelengde.',
            price: 1699,
            compare_at_price: null,
            stock_qty: 18,
            warehouse_location: 'Oslo Showroom',
            delivery_note: 'Sendes fra Oslo innen 24 timer · Gratis lengdetilpasning',
          },
          it: {
            title: 'Camicia Lino BEIGE #L3',
            subtitle: '100% Lino Naturale Europeo',
            description: 'Scopri l’eleganza senza tempo della nostra camicia in puro lino #L3. Tessuta con fibre lunghe europee e rifinita con bottoni in madreperla e sartoria gratuita su misura.',
            price: 169,
            compare_at_price: null,
            stock_qty: 24,
            warehouse_location: 'Treviso Atelier',
            delivery_note: 'Spedizione immediata da Treviso · Sartoria gratuita',
          },
          vn: {
            title: 'Áo Sơ Mi Linen BEIGE #L3',
            subtitle: '100% Vải Lanh Tự Nhiên Châu Âu',
            description: 'Áo sơ mi Linen #L3 thoáng khí vượt trội cho thời tiết nhiệt đới Việt Nam. Dệt từ 100% sợi lanh châu Âu nguyên chất, tặng kèm dịch vụ điều chỉnh chiều dài tay và thân áo.',
            price: 4490000,
            compare_at_price: null,
            stock_qty: 11,
            warehouse_location: 'Ho Chi Minh City Hub',
            delivery_note: 'Giao nhanh từ kho TP.HCM trong 2–4 ngày',
          },
        },
      },
      {
        sku: 'MN-L23',
        slug: 'beige-blue-striped-linen-l23',
        category_slug: 'linen',
        fabric_spec: '55% Italian Linen / 45% Giza Cotton · Breathable Stripe',
        is_featured: 1,
        is_b2b_eligible: 0,
        is_outlet: 0,
        preorder_allowed: 0,
        primary_image: '/src/assets/images/shirt_striped_linen_1795248293538.jpg',
        secondary_image: '/src/assets/images/editorial_tailoring_guide_1795248294030.jpg',
        locs: {
          en: {
            title: 'BEIGE / BLUE STRIPED Linen #L23',
            subtitle: 'Linen-Cotton Riviera Blend',
            description: 'Crisp navy architectural stripes woven through cream Italian linen-cotton. Resistant to deep creasing while keeping peak summer airflow.',
            price: 169,
            compare_at_price: null,
            stock_qty: 6,
            warehouse_location: 'Treviso Global Hub',
            delivery_note: 'Limited studio batch · Ready to ship',
          },
          no: {
            title: 'BEIGE / BLÅ STRIPER Linskjorte #L23',
            subtitle: 'Lin & Bomull Sommerskjorte',
            description: 'Eksklusiv stripete lin- og bomullsskjorte som kombinerer den svale følelsen av lin med bomullens glatte fall. Kostnadsfri tilpasning av erme- og skjortelengde.',
            price: 1499,
            compare_at_price: null,
            stock_qty: 6,
            warehouse_location: 'Oslo Showroom',
            delivery_note: 'Kun 6 stk igjen på Oslo-lager',
          },
          it: {
            title: 'Camicia Lino RIGHE BEIGE/BLU #L23',
            subtitle: 'Misto Lino e Cotone Giza',
            description: 'Righe verticali blu notte su base crema in misto lino e cotone egiziano. Ideale dalla Riviera agli aperitivi serali.',
            price: 155,
            compare_at_price: null,
            stock_qty: 14,
            warehouse_location: 'Treviso Atelier',
            delivery_note: 'Disponibile in Atelier · Consegna 24/48h',
          },
          vn: {
            title: 'Áo Sơ Mi Linen KẺ SỌC BE/XANH #L23',
            subtitle: 'Linen Ý pha Cotton Ai Cập',
            description: 'Họa tiết kẻ sọc thanh lịch trên nền vải Linen pha Cotton cao cấp giúp giảm nhăn tối đa và luôn mát mẻ cả ngày.',
            price: 4190000,
            compare_at_price: null,
            stock_qty: 4,
            warehouse_location: 'Ho Chi Minh City Hub',
            delivery_note: 'Còn 4 sản phẩm tại kho TP.HCM',
          },
        },
      },
      {
        sku: 'MN-B11',
        slug: 'blue-2ply-non-iron-business-b11',
        category_slug: 'business',
        fabric_spec: '100% Egyptian Cotton · 80/2-Ply Easy-Care Twill',
        is_featured: 1,
        is_b2b_eligible: 1,
        is_outlet: 0,
        preorder_allowed: 0,
        primary_image: '/src/assets/images/shirt_blue_business_1795248293673.jpg',
        secondary_image: '/src/assets/images/editorial_corporate_b2b_1795248294517.jpg',
        locs: {
          en: {
            title: 'BLUE 2-PLY NON-IRON Business #B11',
            subtitle: '80/2-Ply Signature Twill',
            description: 'Tightly woven two-ply Italian twill with natural wrinkle recovery from morning briefings to late flights. Available for individual and B2B corporate orders.',
            price: 165,
            compare_at_price: null,
            stock_qty: 12,
            warehouse_location: 'Treviso Global Hub',
            delivery_note: 'B2B logo embroidery eligible',
          },
          no: {
            title: 'BLÅ 2-PLY STRYKEFRI Business #B11',
            subtitle: '80/2-Ply Tettvevet Twill',
            description: 'Vår bestselgende lyseblå business-skjorte i strykefri two-ply kvalitet. Holder seg skarp hele arbeidsdagen og inkluderer gratis skreddersydd lengde.',
            price: 1499,
            compare_at_price: null,
            stock_qty: 2,
            warehouse_location: 'Oslo Showroom',
            delivery_note: 'Lav lagerbeholdning i Oslo (2 stk)',
          },
          it: {
            title: 'Camicia Business BLU NO-STIRO #B11',
            subtitle: 'Twill Doppio Ritorto 80/2',
            description: 'Tessuto twill doppio ritorto anti-piega pensato per il professionista moderno. Disponibile anche per forniture aziendali con ricamo logo.',
            price: 149,
            compare_at_price: null,
            stock_qty: 29,
            warehouse_location: 'Treviso Atelier',
            delivery_note: 'Spedizione immediata da Treviso',
          },
          vn: {
            title: 'Áo Sơ Mi Công Sở XANH CHỐNG NHĂN #B11',
            subtitle: 'Cotton Ai Cập Sợi Đôi 80/2-Ply',
            description: 'Dòng áo công sở dệt chéo Twill hai sợi chống nhăn tự nhiên, giữ phom sắc nét suốt 12 giờ làm việc.',
            price: 3990000,
            compare_at_price: null,
            stock_qty: 9,
            warehouse_location: 'Ho Chi Minh City Hub',
            delivery_note: 'Hỗ trợ thêu logo doanh nghiệp B2B',
          },
        },
      },
      {
        sku: 'MN-B1',
        slug: 'white-100-2ply-signature-business-b1',
        category_slug: 'business',
        fabric_spec: '100% Giza 45 Cotton · 100/2-Ply Non-Iron Poplin',
        is_featured: 1,
        is_b2b_eligible: 1,
        is_outlet: 0,
        preorder_allowed: 1,
        primary_image: '/src/assets/images/shirt_white_signature_1795248293653.jpg',
        secondary_image: '/src/assets/images/editorial_business_twoply_1795248294929.jpg',
        locs: {
          en: {
            title: 'WHITE 100/2-PLY SIGNATURE #B1',
            subtitle: 'Treviso Heritage Dress Shirt',
            description: 'Our benchmark optic-white dress shirt since 1974. Double-twisted 100/2-ply cotton yarn delivers silky luster, opaque coverage, and effortless non-iron performance.',
            price: 175,
            compare_at_price: null,
            stock_qty: 34,
            warehouse_location: 'Treviso Global Hub',
            delivery_note: 'Core signature staple · Ships today',
          },
          no: {
            title: 'HVIT 100/2-PLY SIGNATUR Business #B1',
            subtitle: 'Strykefri Flaggskipskjorte',
            description: 'Vår strykefrie signatur hvit skjorte tettvevet i 100/2-ply kvalitet. Ugjennomsiktig, silkemyk finish og kostnadsfri skreddersydd erme- og skjortelengde.',
            price: 1599,
            compare_at_price: null,
            stock_qty: 42,
            warehouse_location: 'Oslo Showroom',
            delivery_note: 'På lager i Oslo · Rask levering',
          },
          it: {
            title: 'Camicia BIANCA 100/2-PLY SIGNATURE #B1',
            subtitle: 'Icona Sartoriale dal 1974',
            description: 'La nostra camicia bianca simbolo dal 1974. Cotone 100/2-ply ad alta densità, coprente, setoso e facile da stirare.',
            price: 159,
            compare_at_price: null,
            stock_qty: 50,
            warehouse_location: 'Treviso Atelier',
            delivery_note: 'Sempre disponibile in Atelier',
          },
          vn: {
            title: 'Áo Sơ Mi TRẮNG ĐẶC TRƯNG 100/2-PLY #B1',
            subtitle: 'Tuyệt tác Biểu tượng Treviso 1974',
            description: 'Mẫu áo sơ mi trắng trứ danh làm nên tên tuổi Monte Napoleone từ 1974. Sợi bông xoắn đôi 100/2 dày dặn không lộ da và hạn chế nhăn tối đa.',
            price: 4290000,
            compare_at_price: null,
            stock_qty: 16,
            warehouse_location: 'Ho Chi Minh City Hub',
            delivery_note: 'Sẵn kho TP.HCM · Giao nhanh DHL',
          },
        },
      },
      {
        sku: 'MN-OX4',
        slug: 'olive-heavy-oxford-all-year-ox4',
        category_slug: 'oxford',
        fabric_spec: '100% Organic Cotton · Heavy Basketweave Oxford',
        is_featured: 1,
        is_b2b_eligible: 0,
        is_outlet: 0,
        preorder_allowed: 1,
        primary_image: '/src/assets/images/hero_oxford_olive_1795248294228.jpg',
        secondary_image: '/src/assets/images/editorial_tailoring_guide_1795248294030.jpg',
        locs: {
          en: {
            title: 'DARK OLIVE OXFORD All Year #OX4',
            subtitle: 'Structured All-Season Oxford',
            description: 'Rich olive-moss basketweave Oxford cotton built to bridge smart casual tailoring and relaxed weekend layering across all four seasons.',
            price: 160,
            compare_at_price: 185,
            stock_qty: 0,
            warehouse_location: 'Treviso Global Hub',
            delivery_note: 'Pre-order · Estimated dispatch 10 days',
          },
          no: {
            title: 'MØRK OLIVEN OXFORD Helårs #OX4',
            subtitle: 'Kraftig Basketweave Oxford',
            description: 'All Year Around-kolleksjonen i dyp olivengrønn Oxford-vev. Perfekt både under blazer og alene til chinos. Åpen for forhåndsbestilling.',
            price: 1449,
            compare_at_price: 1699,
            stock_qty: 0,
            warehouse_location: 'Oslo Showroom',
            delivery_note: 'Forhåndsbestilling · Levering ca. 10 dager',
          },
          it: {
            title: 'Camicia OXFORD OLIVA #OX4',
            subtitle: 'Collezione Quattro Stagioni',
            description: 'Tessuto Oxford corposo color verde oliva scuro, ideale tutto l’anno con giacca decostruita o denim sartoriale.',
            price: 145,
            compare_at_price: 165,
            stock_qty: 8,
            warehouse_location: 'Treviso Atelier',
            delivery_note: 'Disponibile nel laboratorio di Treviso',
          },
          vn: {
            title: 'Áo Sơ Mi OXFORD XANH RÊU #OX4',
            subtitle: 'Dòng Oxford Bốn Mùa',
            description: 'Chất liệu Oxford dệt rổ cao cấp màu xanh rêu trầm sang trọng, giữ đứng cổ áo tự nhiên và dễ phối cùng blazer hoặc quần tây.',
            price: 3890000,
            compare_at_price: 4390000,
            stock_qty: 0,
            warehouse_location: 'Ho Chi Minh City Hub',
            delivery_note: 'Đặt may trước (Pre-order) · Giao sau 10 ngày',
          },
        },
      },
      {
        sku: 'MN-B2B1',
        slug: 'corporate-uniform-sky-poplin-b2b1',
        category_slug: 'b2b',
        fabric_spec: '96% Cotton / 4% Elastane · Corporate Stretch Poplin',
        is_featured: 0,
        is_b2b_eligible: 1,
        is_outlet: 1,
        preorder_allowed: 1,
        primary_image: '/src/assets/images/editorial_corporate_b2b_1795248294517.jpg',
        secondary_image: '/src/assets/images/shirt_blue_business_1795248293673.jpg',
        locs: {
          en: {
            title: 'SILVER BLUE STRETCH Uniform #B2B1',
            subtitle: 'Corporate & Stretch Series (Outlet)',
            description: 'Engineered with subtle 4% elastane comfort stretch for corporate hospitality, aviation, and executive uniforms. Custom company embroidery included on B2B contracts.',
            price: 129,
            compare_at_price: 165,
            stock_qty: 45,
            warehouse_location: 'Treviso Global Hub',
            delivery_note: 'Outlet / B2B volume ready',
          },
          no: {
            title: 'SØLVBLÅ STRETCH Bedriftsskjorte #B2B1',
            subtitle: 'Bedriftsavtale & Stretch Outlet',
            description: 'Utviklet for bedrifter og daglig bruk med behagelig stretch og mulighet for diskret brodert firmalogo på bryst eller mansjett.',
            price: 1190,
            compare_at_price: 1499,
            stock_qty: 60,
            warehouse_location: 'Oslo Showroom',
            delivery_note: 'Klar for rask bedriftslevering fra Oslo',
          },
          it: {
            title: 'Camicia STRETCH ARGENTO Aziendale #B2B1',
            subtitle: 'Linea B2B & Stretch Outlet',
            description: 'Popeline elasticizzato ad alto comfort per team aziendali e uso quotidiano intenso, con opzione ricamo logo.',
            price: 115,
            compare_at_price: 149,
            stock_qty: 52,
            warehouse_location: 'Treviso Atelier',
            delivery_note: 'Prezzo speciale Outlet / B2B',
          },
          vn: {
            title: 'Áo Sơ Mi CO GIÃN ĐỒNG PHỤC #B2B1',
            subtitle: 'Dòng Doanh nghiệp & Stretch Outlet',
            description: 'Chất vải Poplin pha co giãn 4 chiều thoải mái vận động suốt ngày dài, hỗ trợ đặt hàng số lượng lớn và thêu logo công ty.',
            price: 2990000,
            compare_at_price: 3890000,
            stock_qty: 30,
            warehouse_location: 'Ho Chi Minh City Hub',
            delivery_note: 'Giá ưu đãi Outlet & Doanh nghiệp',
          },
        },
      },
      {
        sku: 'MN-F30',
        slug: 'midnight-navy-flannel-f30',
        category_slug: 'flannel',
        fabric_spec: '100% Double-Brushed Italian Cotton Flannel · 175 GSM',
        is_featured: 0,
        is_b2b_eligible: 0,
        is_outlet: 1,
        preorder_allowed: 0,
        primary_image: '/src/assets/images/editorial_casual_linen_1795248294319.jpg',
        secondary_image: '/src/assets/images/shirt_beige_linen_1795248293982.jpg',
        locs: {
          en: {
            title: 'MIDNIGHT NAVY BRUSHED Flannel #F30',
            subtitle: 'Brushed Winter Cotton Flannel',
            description: 'Double-brushed northern Italian cotton flannel offering cashmere-like warmth and softness without bulk. Ideal under wool tailoring.',
            price: 149,
            compare_at_price: 185,
            stock_qty: 3,
            warehouse_location: 'Treviso Global Hub',
            delivery_note: 'Archive Outlet · Only 3 left',
          },
          no: {
            title: 'MIDNATTSBLÅ BØRSTET Flanellskjorte #F30',
            subtitle: 'Myk Børstet Italiensk Flanell',
            description: 'Dobbeltbørstet italiensk bomullsflanell som gir eksepsjonell varme og mykhet gjennom den nordiske vinteren. Begrenset parti.',
            price: 1290,
            compare_at_price: 1699,
            stock_qty: 3,
            warehouse_location: 'Oslo Showroom',
            delivery_note: 'Outlet-kupp · Kun 3 igjen',
          },
          it: {
            title: 'Camicia FLANELLA BLU NOTTE #F30',
            subtitle: 'Flanella di Cotone Spazzolata',
            description: 'Flanella di cotone italiano spazzolata su entrambi i lati per un comfort termico impeccabile sotto la giacca.',
            price: 135,
            compare_at_price: 165,
            stock_qty: 7,
            warehouse_location: 'Treviso Atelier',
            delivery_note: 'Disponibile in Outlet Atelier',
          },
          vn: {
            title: 'Áo Sơ Mi FLANNEL XANH ĐÊM #F30',
            subtitle: 'Vải Cotton Flannel Chải Bông Ý',
            description: 'Chất liệu Flannel chải bông hai mặt mềm mịn như cashmere, giữ ấm thanh lịch trong mùa thu đông hoặc phòng điều hòa.',
            price: 3490000,
            compare_at_price: 4290000,
            stock_qty: 5,
            warehouse_location: 'Ho Chi Minh City Hub',
            delivery_note: 'Ưu đãi Outlet · Số lượng giới hạn',
          },
        },
      },
      {
        sku: 'MN-S14',
        slug: 'coastal-sky-stretch-linen-s14',
        category_slug: 'stretch',
        fabric_spec: '72% Linen / 25% Cotton / 3% Elastane · Comfort Stretch',
        is_featured: 1,
        is_b2b_eligible: 0,
        is_outlet: 0,
        preorder_allowed: 1,
        primary_image: '/src/assets/images/hero_linen_coastal_1795248294948.jpg',
        secondary_image: '/src/assets/images/shirt_blue_business_1795248293673.jpg',
        locs: {
          en: {
            title: 'SKY COASTAL STRETCH Linen #S14',
            subtitle: 'Stretch Linen Travel Shirt',
            description: 'Natural linen texture reinforced with subtle travel-ready stretch recovery. Effortless from Oslo fjords to Milanese terraces.',
            price: 179,
            compare_at_price: null,
            stock_qty: 14,
            warehouse_location: 'Treviso Global Hub',
            delivery_note: 'Ships within 24h via DHL Express',
          },
          no: {
            title: 'HIMMELBLÅ STRETCH Linskjorte #S14',
            subtitle: 'Elastisk Reise- og Fritidsskjorte',
            description: 'Kombinerer naturlig linstruktur med diskret stretch som gir full bevegelsesfrihet og mindre krølling på reise.',
            price: 1649,
            compare_at_price: null,
            stock_qty: 15,
            warehouse_location: 'Oslo Showroom',
            delivery_note: 'På lager i Oslo · Gratis skreddersøm',
          },
          it: {
            title: 'Camicia LINO STRETCH CIELO #S14',
            subtitle: 'Lino Elasticizzato da Viaggio',
            description: 'La freschezza del lino italiano unita a una leggera elasticità per viaggiare sempre impeccabili.',
            price: 165,
            compare_at_price: null,
            stock_qty: 19,
            warehouse_location: 'Treviso Atelier',
            delivery_note: 'Spedizione gratuita in Italia',
          },
          vn: {
            title: 'Áo Sơ Mi LINEN CO GIÃN XANH BIỂN #S14',
            subtitle: 'Linen Co Giãn Chống Nhăn',
            description: 'Kết hợp vẻ phóng khoáng của vải lanh Ý cùng độ đàn hồi nhẹ nhàng giúp di chuyển thoải mái và giữ phom dáng hoàn hảo.',
            price: 4290000,
            compare_at_price: null,
            stock_qty: 12,
            warehouse_location: 'Ho Chi Minh City Hub',
            delivery_note: 'Sẵn kho TP.HCM · Miễn phí chỉnh tay áo',
          },
        },
      },
    ];

    const DETAIL_SHOTS = [
      '/src/assets/images/editorial_tailoring_guide_1795248294030.jpg',
      '/src/assets/images/editorial_business_twoply_1795248294929.jpg',
      '/src/assets/images/editorial_casual_linen_1795248294319.jpg',
      '/src/assets/images/editorial_corporate_b2b_1795248294517.jpg',
    ];

    const multiCategorySeed: Record<string, string[]> = {
      'MN-L3': ['linen'],
      'MN-L23': ['linen', 'business'],
      'MN-B11': ['business', 'b2b'],
      'MN-B1': ['business', 'b2b'],
      'MN-OX4': ['oxford', 'business'],
      'MN-B2B1': ['b2b', 'stretch', 'outlet'],
      'MN-F30': ['flannel', 'outlet'],
      'MN-S14': ['stretch', 'linen'],
    };

    for (const p of catalogSeed) {
      const gallery = Array.from(
        new Set([p.primary_image, p.secondary_image, ...DETAIL_SHOTS])
      ).slice(0, 4);
      const cats = multiCategorySeed[p.sku] || [p.category_slug];
      const info = insertProduct.run(
        p.sku,
        p.slug,
        p.category_slug,
        JSON.stringify(cats),
        p.fabric_spec,
        p.is_featured,
        p.is_b2b_eligible,
        p.is_outlet,
        p.preorder_allowed,
        p.primary_image,
        p.secondary_image,
        JSON.stringify(gallery),
        collars,
        cuffs,
        sizes
      );
      const productId = Number(info.lastInsertRowid);
      for (const regionCode of ['en', 'no', 'it', 'vn'] as const) {
        const l = p.locs[regionCode];
        insertLoc.run(
          productId,
          regionCode,
          l.title,
          l.subtitle,
          l.description,
          l.price,
          l.compare_at_price,
          l.stock_qty,
          l.warehouse_location,
          l.delivery_note
        );
      }
    }
  }

  const existingOrders = db.prepare('SELECT COUNT(*) AS count FROM orders').get() as { count: number };
  if (existingOrders.count === 0) {
    const insertOrder = db.prepare(`
      INSERT INTO orders (
        order_number, region_code, currency_code, customer_name, customer_email, customer_phone,
        shipping_address, shipping_city, shipping_postal_code, shipping_country, is_b2b, company_name, org_number,
        subtotal, shipping_cost, discount_amount, vat_amount, total, payment_method, payment_status,
        payment_reference, shipping_method, dhl_tracking_number, dhl_status, order_status, items_json, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);

    insertOrder.run(
      'MN-2026-1001', 'no', 'NOK', 'Henrik Solberg', 'henrik.solberg@nordicexec.no', '+47 912 45 880',
      'Bogstadveien 42', 'Oslo', '0366', 'Norway', 0, null, null,
      1699, 0, 0, 340, 1699, 'vipps', 'paid',
      'VIPPS-992841', 'dhl_express', 'DHL-NO-774829104', 'in_transit', 'shipped',
      JSON.stringify([
        {
          productId: 1,
          sku: 'MN-L3',
          title: 'BEIGE Linskjorte #L3',
          image: '/src/assets/images/shirt_beige_linen_1795248293982.jpg',
          unitPrice: 1699,
          quantity: 1,
          tailoring: { fit: 'Slim Fit', size: '40 / M', collar: 'Spread', cuff: 'Modern', sleeveAdjustmentCm: -1, lengthAdjustmentCm: 0 },
        },
      ]),
      'Sleeve shortened by 1 cm in Oslo studio',
      '-5 days'
    );

    insertOrder.run(
      'MN-2026-1002', 'it', 'EUR', 'Marco Bellini', 'm.bellini@studioarchitettura.it', '+39 0422 558901',
      'Via Calmaggiore 18', 'Treviso', '31100', 'Italy', 1, 'Studio Bellini S.r.l.', 'IT04829100264',
      318, 0, 0, 57.34, 318, 'bank_transfer', 'awaiting_transfer',
      'MNIT0010024', 'dhl_economy', null, 'pending_label', 'pending',
      JSON.stringify([
        {
          productId: 4,
          sku: 'MN-B1',
          title: 'Camicia BIANCA 100/2-PLY SIGNATURE #B1',
          image: '/src/assets/images/shirt_white_signature_1795248293653.jpg',
          unitPrice: 159,
          quantity: 2,
          tailoring: { fit: 'Regular Fit', size: '41 / L', collar: 'Semi Spread', cuff: 'Single French', sleeveAdjustmentCm: 0, lengthAdjustmentCm: 2 },
        },
      ]),
      'Awaiting SEPA transfer confirmation',
      '-3 days'
    );

    insertOrder.run(
      'MN-2026-1003', 'vn', 'VND', 'Nguyễn Minh Tuấn', 'tuan.nguyen@saigonventures.vn', '+84 90 311 4820',
      '72 Lê Thánh Tôn, Quận 1', 'Hồ Chí Minh', '700000', 'Việt Nam', 0, null, null,
      8480000, 0, 848000, 693818, 7632000, 'stripe', 'paid',
      'STRP-VN-88412', 'dhl_express', 'DHL-VN-662018391', 'label_created', 'processing',
      JSON.stringify([
        {
          productId: 1,
          sku: 'MN-L3',
          title: 'Áo Sơ Mi Linen BEIGE #L3',
          image: '/src/assets/images/shirt_beige_linen_1795248293982.jpg',
          unitPrice: 4490000,
          quantity: 1,
          tailoring: { fit: 'Slim Fit', size: '39 / M', collar: 'Cutaway', cuff: 'Modern', sleeveAdjustmentCm: -2, lengthAdjustmentCm: 0 },
        },
        {
          productId: 3,
          sku: 'MN-B11',
          title: 'Áo Sơ Mi Công Sở XANH CHỐNG NHĂN #B11',
          image: '/src/assets/images/shirt_blue_business_1795248293673.jpg',
          unitPrice: 3990000,
          quantity: 1,
          tailoring: { fit: 'Slim Fit', size: '39 / M', collar: 'Spread', cuff: 'Modern', sleeveAdjustmentCm: -2, lengthAdjustmentCm: 0 },
        },
      ]),
      'MONTE10 applied · Ready for HCMC courier pickup',
      '-1 day'
    );

    insertOrder.run(
      'MN-2026-1004', 'en', 'USD', 'Julian Vance', 'j.vance@manhattan-capital.com', '+1 212 555 0149',
      '450 Lexington Ave, Suite 1800', 'New York', '10017', 'United States', 0, null, null,
      515, 0, 0, 0, 515, 'paypal', 'paid',
      'PAYPAL-US-77410', 'dhl_express', 'DHL-US-88492011', 'in_transit', 'shipped',
      JSON.stringify([
        {
          productId: 4,
          sku: 'MN-B1',
          title: 'WHITE 100/2-PLY SIGNATURE #B1',
          image: '/src/assets/images/shirt_white_signature_1795248293653.jpg',
          unitPrice: 175,
          quantity: 2,
          tailoring: { fit: 'Contemporary Fit', size: '41 / L', collar: 'Cutaway', cuff: 'Single French', sleeveAdjustmentCm: 0, lengthAdjustmentCm: 0 },
        },
        {
          productId: 3,
          sku: 'MN-B11',
          title: 'BLUE 2-PLY NON-IRON Business #B11',
          image: '/src/assets/images/shirt_blue_business_1795248293673.jpg',
          unitPrice: 165,
          quantity: 1,
          tailoring: { fit: 'Contemporary Fit', size: '41 / L', collar: 'Spread', cuff: 'Modern', sleeveAdjustmentCm: 0, lengthAdjustmentCm: 0 },
        },
      ]),
      'Express garment box dispatch from Treviso HQ',
      '0 days'
    );
  }

  const existingB2B = db.prepare('SELECT COUNT(*) AS count FROM b2b_inquiries').get() as { count: number };
  if (existingB2B.count === 0) {
    const sampleItems = [
      {
        id: 'batch-1',
        productId: 4,
        sku: 'MN-B1',
        title: 'HVIT 100/2-PLY SIGNATUR Business #B1',
        image: '/src/assets/images/shirt_white_signature_1795248293653.jpg',
        fit: 'REGULAR FIT',
        collar: 'Spread',
        cuff: 'Modern',
        sizeBreakdown: { 'S / 37': 10, 'M / 39': 30, 'L / 41': 45, 'XL / 43': 25, '2XL / 45': 10 },
        totalPieces: 120,
        notes: 'Custom navy crest embroidery on left cuff.',
      },
    ];
    db.prepare(`
      INSERT INTO b2b_inquiries (company_name, contact_name, email, phone, region_code, estimated_qty, embroidery_requested, notes, items_json, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Fjord Grand Hotel Oslo',
      'Astrid Lindqvist',
      'procurement@fjordgrand.no',
      '+47 22 40 99 00',
      'no',
      120,
      1,
      'Custom navy crest embroidery on left cuff for concierge & reception staff.',
      JSON.stringify(sampleItems),
      'reviewing'
    );
  }

  const existingSubscribers = db
    .prepare('SELECT COUNT(*) AS count FROM newsletter_subscribers')
    .get() as { count: number };
  if (existingSubscribers.count === 0) {
    const insertSub = db.prepare(`
      INSERT INTO newsletter_subscribers (email, region_code, discount_code, status, mailchimp_status)
      VALUES (?, ?, 'MONTE10', 'subscribed', 'sandbox_queued')
    `);
    insertSub.run('olav.nielsen@oslofjord.no', 'no');
    insertSub.run('giulia.rossi@trevisostudio.it', 'it');
  }

  const existingSpecs = db
    .prepare('SELECT COUNT(*) AS count FROM tailoring_size_specs')
    .get() as { count: number };
  if (existingSpecs.count === 0) {
    const fits = ['Regular Fit', 'Slim Fit', 'Contemporary Fit'] as const;
    const sizeList = [
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
    const insertSpec = db.prepare(`
      INSERT INTO tailoring_size_specs (
        fit, size_label, shirt_length_cm, sleeve_length_cm, waist_cm, chest_cm, bottom_hem_cm, shoulder_cm
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const fit of fits) {
      for (const sz of sizeList) {
        const num = Number((sz.match(/\d{2}/) || ['40'])[0]);
        const offset = num - 40;
        const chestAdj = fit === 'Slim Fit' ? -4 : fit === 'Contemporary Fit' ? -2 : 0;
        const waistAdj = fit === 'Slim Fit' ? -6 : fit === 'Contemporary Fit' ? -3 : 0;
        const hemAdj = fit === 'Slim Fit' ? -4 : fit === 'Contemporary Fit' ? -2 : 0;
        insertSpec.run(
          fit,
          sz,
          Math.round((77 + offset * 0.5) * 10) / 10,
          Math.round((65 + offset * 0.5) * 10) / 10,
          Math.round((102 + offset * 3 + waistAdj) * 10) / 10,
          Math.round((110 + offset * 3 + chestAdj) * 10) / 10,
          Math.round((106 + offset * 3 + hemAdj) * 10) / 10,
          Math.round((46 + offset * 0.7) * 10) / 10
        );
      }
    }
  }

  const existingVariants = db
    .prepare('SELECT COUNT(*) AS count FROM product_variants')
    .get() as { count: number };
  if (existingVariants.count === 0) {
    const prodRows = db.prepare('SELECT id, sku, sizes_json FROM products').all() as Array<{
      id: number;
      sku: string;
      sizes_json: string;
    }>;
    const locRows = db
      .prepare('SELECT product_id, region_code, price, stock_qty FROM product_localizations')
      .all() as Array<{ product_id: number; region_code: string; price: number; stock_qty: number }>;

    const insertVariant = db.prepare(`
      INSERT INTO product_variants (
        product_id, fit, size_label, sku_variant, price_en, price_no, price_it, price_vn,
        stock_en, stock_no, stock_it, stock_vn, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const fits = ['Regular Fit', 'Slim Fit', 'Contemporary Fit'] as const;
    for (const p of prodRows) {
      let sizesArr: string[] = [];
      try {
        sizesArr = JSON.parse(p.sizes_json);
      } catch {
        sizesArr = ['34 / 2XS', '38 / S', '40 / M', '42 / L', '45 / 3XL'];
      }
      const pLocs = locRows.filter((l) => l.product_id === p.id);
      const stockOf = (rc: string) => pLocs.find((l) => l.region_code === rc)?.stock_qty ?? 10;
      const priceOf = (rc: string) => pLocs.find((l) => l.region_code === rc)?.price ?? null;

      for (const fit of fits) {
        const fitCode = fit === 'Slim Fit' ? 'SLM' : fit === 'Contemporary Fit' ? 'CNT' : 'REG';
        for (const sz of sizesArr) {
          const num = (sz.match(/\d{2}/) || ['40'])[0];
          const isExtendedSize = Number(num) >= 45;
          insertVariant.run(
            p.id,
            fit,
            sz,
            `${p.sku}-${fitCode}-${num}`,
            isExtendedSize && priceOf('en') ? Number(priceOf('en')) + 15 : null,
            isExtendedSize && priceOf('no') ? Number(priceOf('no')) + 150 : null,
            isExtendedSize && priceOf('it') ? Number(priceOf('it')) + 15 : null,
            isExtendedSize && priceOf('vn') ? Number(priceOf('vn')) + 350000 : null,
            Math.max(0, Math.min(stockOf('en'), 12)),
            Math.max(0, Math.min(stockOf('no'), 12)),
            Math.max(0, Math.min(stockOf('it'), 12)),
            Math.max(0, Math.min(stockOf('vn'), 12))
          );
        }
      }
    }
  }

  const existingMovements = db
    .prepare('SELECT COUNT(*) AS count FROM stock_movements')
    .get() as { count: number };
  if (existingMovements.count === 0) {
    const insertMv = db.prepare(`
      INSERT INTO stock_movements (
        product_id, sku, variant_label, region_code, delta_qty, previous_qty, new_qty, reason, reference_id, actor_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertMv.run(1, 'MN-L3', 'Slim Fit · 40 / M', 'no', -1, 19, 18, 'order_capture', 'MN-2026-1001', 'checkout@montenapoleone1974.com');
    insertMv.run(4, 'MN-B1', 'Regular Fit · 41 / L', 'it', -2, 52, 50, 'order_capture', 'MN-2026-1002', 'checkout@montenapoleone1974.com');
    insertMv.run(3, 'MN-B11', 'Slim Fit · 39 / M', 'vn', -1, 10, 9, 'order_capture', 'MN-2026-1003', 'checkout@montenapoleone1974.com');
  }

  const existingHeroSlides = db
    .prepare('SELECT COUNT(*) AS count FROM hero_slides')
    .get() as { count: number };
  if (existingHeroSlides.count === 0) {
    const insertSlide = db.prepare(`
      INSERT INTO hero_slides (
        sort_order, active, image_url, target_type, target_value, show_text, show_button,
        title_en, title_no, title_it, title_vn,
        subtitle_en, subtitle_no, subtitle_it, subtitle_vn,
        cta_en, cta_no, cta_it, cta_vn
      ) VALUES (?, 1, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertSlide.run(
      1,
      '/src/assets/images/hero_oxford_olive_1795248294228.jpg',
      'category',
      'oxford',
      'ALL YEAR AROUND',
      'ALL YEAR AROUND',
      'TUTTO L’ANNO',
      'PHONG CÁCH QUANH NĂM',
      'ITALIAN OXFORD & TWO-PLY COLLECTION — TREVISO 1974',
      'OXFORD & TWO-PLY KOLLEKSJON — SKREDDERSYDD SIDEN 1974',
      'COLLEZIONE OXFORD & DOPPIO RITORTO — TREVISO 1974',
      'BỘ SƯU TẬP OXFORD & VẢI SỢI ĐÔI Ý — TREVISO 1974',
      'Explore Collection',
      'Se Kolleksjonen',
      'Scopri la Collezione',
      'Khám phá Bộ sưu tập'
    );
    insertSlide.run(
      2,
      '/src/assets/images/hero_linen_coastal_1795248294948.jpg',
      'category',
      'linen',
      'BREATHABLE ITALIAN LINEN',
      'EKSKLUSIVE LINSKJORTER',
      'LINO ITALIANO PREGIATO',
      'LINEN Ý CAO CẤP THOÁNG MÁT',
      'COMPLIMENTARY BESPOKE SLEEVE & SHIRT LENGTH TAILORING',
      'KOSTNADSFRITT SKREDDERSYDD ERME- OG SKJORTELENGDE',
      'LUNGHEZZA MANICHE E BUSTO SU MISURA GRATUITA',
      'MIỄN PHÍ ĐO CHỈNH CHIỀU DÀI TAY VÀ THÂN ÁO',
      'Shop Linen Shirts',
      'Kjøp Linskjorter',
      'Acquista Lino',
      'Mua Áo Linen'
    );
  }

  const upsertSetting = db.prepare(`
    INSERT OR IGNORE INTO site_settings (key, value_json) VALUES (?, ?)
  `);

  upsertSetting.run(
    'promo_rules',
    JSON.stringify({
      popupEnabled: true,
      showFloatingButton: true,
      discountCode: 'MONTE10',
      discountPct: 10,
      firstOrderOnly: true,
      delaySeconds: 0,
      title_en: 'GET 10% OFF YOUR FIRST ORDER!',
      title_no: 'FÅ 10% RABATT PÅ DIN FØRSTE BESTILLING!',
      title_it: 'OTTIENI IL 10% DI SCONTO SUL PRIMO ORDINE!',
      title_vn: 'GIẢM 10% CHO ĐƠN HÀNG ĐẦU TIÊN!',
      subtitle_en:
        'Join the Monte Napoleone 1974 mailing list for private seasonal releases and 10% off your first tailored shirt.',
      subtitle_no:
        'Meld deg på Monte Napoleone 1974 nyhetsbrevet og motta 10% velkomstrabatt på din første bestilling.',
      subtitle_it:
        'Iscriviti alla newsletter Monte Napoleone 1974 per ricevere il 10% di benvenuto sul primo acquisto.',
      subtitle_vn:
        'Đăng ký nhận bản tin Monte Napoleone 1974 để nhận ưu đãi 10% cho đơn hàng đầu tiên.',
      button_en: 'GET 10% OFF',
      button_no: 'FÅ 10% RABATT',
      button_it: 'OTTIENI 10%',
      button_vn: 'NHẬN ƯU ĐÃI 10%',
    })
  );

  upsertSetting.run(
    'bulk_discount',
    JSON.stringify({
      enabled: true,
      stackWithCoupon: false,
      tiers: [
        { minQty: 3, discountPct: 10 },
        { minQty: 5, discountPct: 15 },
        { minQty: 10, discountPct: 20 },
      ],
    })
  );

  upsertSetting.run(
    'ai_settings',
    JSON.stringify({
      enabled: true,
      displayMode: 'agent',
      bubblePosition: 'right',
      activeProvider: 'gemini',
      geminiModel: 'gemini-4-hydrogen',
      openaiModel: 'gpt-4o-mini',
      geminiApiKey: '',
      openaiApiKey: '',
      greeting_en: 'Ask our Treviso tailor agent — find your linen fit, check sizes, or add shirts directly to your bag.',
      greeting_no: 'Spør vår skredderagent — finn lin- eller business-skjorter, sjekk størrelser eller legg rett i handleposen.',
      greeting_it: 'Chiedi al nostro sarto digitale — trova la camicia ideale o aggiungila subito al carrello.',
      greeting_vn: 'Hỏi chuyên gia may đo Ý — tìm áo linen, kiểm tra size hoặc thêm trực tiếp vào giỏ hàng.',
    })
  );

  upsertSetting.run('api_credentials', JSON.stringify({}));

  upsertSetting.run(
    'top_banner',
    JSON.stringify({
      enabled: true,
      visibility: 'both',
      text_en: 'COMPLIMENTARY BESPOKE SLEEVE & SHIRT LENGTH TAILORING · FREE DHL SHIPPING OVER $250',
      text_no: 'KOSTNADSFRI SKREDDERSYDD ERME- OG SKJORTELENGDE · FRI FRAKT OVER 2 500 KR',
      text_it: 'LUNGHEZZA MANICHE E BUSTO SU MISURA GRATUITA · SPEDIZIONE DHL GRATUITA',
      text_vn: 'MIỄN PHÍ ĐO CHỈNH CHIỀU DÀI TAY & THÂN ÁO · MIỄN PHÍ VẬN CHUYỂN DHL',
      linkView: 'catalog',
      linkCategory: 'all',
      bgColor: '#142B4E',
      textColor: '#FFFFFF',
    })
  );

  // Homepage editorial sections — seed only if missing; admin can override later
  upsertSetting.run(
    'home_page',
    JSON.stringify({
      featuredTitle_en: "All Men's Shirts",
      featuredTitle_no: 'Alle Herreskjorter',
      featuredTitle_it: 'Tutte le Camicie',
      featuredTitle_vn: 'Tất cả Áo Sơ Mi',
      featuredCta_en: 'Explore Collection',
      featuredCta_no: 'Se Kolleksjonen',
      featuredCta_it: 'Scopri la Collezione',
      featuredCta_vn: 'Khám phá Bộ sưu tập',
      featuredProductIds: [],
      featuredLimit: 8,
      showEditorialCards: true,
      showFeaturedProducts: true,
      showGuideInspiration: true,
      casualTitle_en: 'CASUAL LINEN SHIRTS',
      casualTitle_no: 'CASUAL LIN-SKJORTER',
      casualTitle_it: 'CAMICIE IN LINO CASUAL',
      casualTitle_vn: 'ÁO SƠ MI LINEN THƯỜNG NGÀY',
      casualDesc_en:
        'Our most breathable casual shirts for warm climates. Tailored from 100% natural European linen with complimentary custom sleeve and body length.',
      casualDesc_no:
        'Våre mest pustende casual-skjorter i 100% europeisk lin. Kostnadsfri justering av erme- og skjortelengde.',
      casualDesc_it:
        'Le nostre camicie più traspiranti per la primavera e l’estate in 100% lino naturale. Offriamo regolazione sartoriale gratuita di maniche e lunghezza.',
      casualDesc_vn:
        'Dòng áo linen 100% tự nhiên thoáng khí tối ưu cho khí hậu nhiệt đới. Miễn phí điều chỉnh chiều dài tay và thân áo theo số đo.',
      casualImage: '/src/assets/images/editorial_casual_linen_1795248294319.jpg',
      casualTargetType: 'category',
      casualTargetValue: 'linen',
      b2bTitle_en: 'CORPORATE AGREEMENT',
      b2bTitle_no: 'BEDRIFTSAVTALE',
      b2bTitle_it: 'ACCORDI AZIENDALI B2B',
      b2bTitle_vn: 'HỢP ĐỒNG ĐỒNG PHỤC B2B',
      b2bDesc_en:
        'Elevate your corporate identity with embroidered uniform shirts. Tailored B2B agreements built for hospitality, aviation, and executive teams.',
      b2bDesc_no:
        'Styrk ditt bedriftsimage med skjorteuniform med brodert logo. Skreddersydde bedriftsavtaler for selskaper som bruker skjorter daglig.',
      b2bDesc_it:
        'Rafforza l’immagine aziendale con camicie uniformi con logo ricamato. Soluzioni su misura per hotel, compagnie e team direzionali.',
      b2bDesc_vn:
        'Nâng tầm hình ảnh doanh nghiệp với áo sơ mi đồng phục thêu logo riêng. Giải pháp chuyên biệt cho khách sạn, hàng không và khối văn phòng.',
      b2bImage: '/src/assets/images/editorial_corporate_b2b_1795248294517.jpg',
      b2bTargetType: 'view',
      b2bTargetValue: 'b2b',
      businessTitle_en: 'BUSINESS SHIRTS',
      businessTitle_no: 'BUSINESS SKJORTER',
      businessTitle_it: 'CAMICIE BUSINESS',
      businessTitle_vn: 'ÁO SƠ MI CÔNG SỞ CAO CẤP',
      businessDesc_en:
        'Our signature wrinkle-resistant 100/2-ply cotton dress shirts. Tightly woven in Treviso with complimentary bespoke sleeve and shirt length.',
      businessDesc_no:
        'Vår strykefrie signaturskjorte tettvevet i 100/2-ply kvalitet. Vi tilbyr kostnadsfritt og eksklusivt skreddersydd erme- og skjortelengde.',
      businessDesc_it:
        'La nostra iconica camicia bianca no-stiro in tessuto doppio ritorto 100/2-ply di Treviso, con sartoria gratuita su misura.',
      businessDesc_vn:
        'Áo sơ mi trắng chống nhăn trứ danh dệt mật độ cao Two-Ply 100/2 từ Ý, tặng kèm dịch vụ cắt chỉnh chiều dài tay áo chuẩn xác.',
      businessImage: '/src/assets/images/editorial_business_twoply_1795248294929.jpg',
      businessTargetType: 'category',
      businessTargetValue: 'business',
      guideTitle_en: 'GUIDE: HOW TO MEASURE YOUR SHIRT.',
      guideTitle_no: 'GUIDE: SLIK MÅLER DU DIN SKJORTE RIKTIG.',
      guideTitle_it: 'GUIDA: COME MISURARE LA TUA CAMICIA.',
      guideTitle_vn: 'HƯỚNG DẪN: CÁCH ĐO ÁO SƠ MI CHUẨN XÁC.',
      guideSub_en: 'Precision sizing & fabric weave overview',
      guideSub_no: 'Oversikt over skjortestoffer og passform',
      guideSub_it: 'Guida alle taglie e ai tessuti pregiati',
      guideSub_vn: 'Tìm hiểu chất liệu vải & bảng thông số đo',
      guideImage: '/src/assets/images/editorial_tailoring_guide_1795248294030.jpg',
      inspirationTitle_en: 'ADVICE & INSPIRATION',
      inspirationTitle_no: 'RÅD & INSPIRASJON',
      inspirationTitle_it: 'CONSIGLI & ISPIRAZIONE',
      inspirationTitle_vn: 'TƯ VẤN & CẢM HỨNG',
      inspirationSub_en: 'Italian heritage tailoring since 1974',
      inspirationSub_no: 'Italiensk håndverk fra Treviso siden 1974',
      inspirationSub_it: 'Arte camiciaia dal 1974 a Treviso',
      inspirationSub_vn: 'Di sản may đo Ý từ năm 1974',
      inspirationImage: '/src/assets/images/hero_linen_coastal_1795248294948.jpg',
      inspirationTargetType: 'view',
      inspirationTargetValue: 'about',
    })
  );

  const existingVisitors = db.prepare('SELECT COUNT(*) AS count FROM visitor_sessions').get() as { count: number };
  if (existingVisitors.count === 0) {
    const insVis = db.prepare(`
      INSERT INTO visitor_sessions (session_id, country, country_code, city, lat, lng, region_code, current_path, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);
    insVis.run('seed-no-oslo', 'Norway', 'NO', 'Oslo', 59.9139, 10.7522, 'no', '/catalog/linen', '-2 minutes');
    insVis.run('seed-it-milano', 'Italy', 'IT', 'Milano', 45.4642, 9.19, 'it', '/product/beige-linen-shirt-l3', '-3 minutes');
    insVis.run('seed-en-ny', 'United States', 'US', 'New York', 40.7128, -74.006, 'en', '/catalog/business', '-4 minutes');
    insVis.run('seed-vn-hcmc', 'Việt Nam', 'VN', 'Ho Chi Minh City', 10.7769, 106.7009, 'vn', '/b2b', '-5 minutes');
    insVis.run('seed-gb-lon', 'United Kingdom', 'GB', 'London', 51.5072, -0.1276, 'en', '/product/signature-white-100-2-ply-b1', '-6 minutes');
  }

  const existingTailoringOpts = db
    .prepare('SELECT COUNT(*) AS count FROM tailoring_options')
    .get() as { count: number };
  if (existingTailoringOpts.count === 0) {
    const insertOpt = db.prepare(`
      INSERT INTO tailoring_options (
        option_type, name, subtitle, detail, stitch_spec, image_url, sort_order, is_default, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    insertOpt.run(
      'collar',
      'Spread',
      'Signature Italian Business',
      'Balanced open points (10.5 cm spread) engineered to frame silk ties cleanly or stand crisply unbuttoned.',
      'Height 3.6 cm · Points 7.2 cm',
      '',
      1,
      1
    );
    insertOpt.run(
      'collar',
      'Semi Spread',
      'Classic Versatility',
      'Timeless Treviso proportion between narrow and wide spread; tailored for everyday corporate suiting.',
      'Height 3.4 cm · Points 7.0 cm',
      '',
      2,
      0
    );
    insertOpt.run(
      'collar',
      'Button Down',
      'Refined Casual Roll',
      'Soft unlined interlining with concealed horn/mother-of-pearl buttons creating a natural S-curve roll.',
      'Height 3.5 cm · Points 8.0 cm',
      '',
      3,
      0
    );
    insertOpt.run(
      'collar',
      'Cutaway',
      'Wide Architectural',
      'Swept-back Milanese cutaway profile for bold tie knots or open-neck Riviera linen layering.',
      'Height 3.8 cm · Points 6.8 cm',
      '',
      4,
      0
    );

    insertOpt.run(
      'cuff',
      'Angle',
      'Chiseled Geometric Edge',
      'Crisp 45° beveled corner inspired by 1970s Via Monte Napoleone dress tailoring.',
      'Single button · 6.5 cm width',
      '',
      1,
      0
    );
    insertOpt.run(
      'cuff',
      'Modern',
      'Minimal Square Atelier',
      'Two-button adjustable square barrel cuff with reinforced 18-stitch-per-inch Italian lockstitch.',
      'Twin button · 6.8 cm width',
      '',
      2,
      1
    );
    insertOpt.run(
      'cuff',
      'Rounded',
      'Soft Venetian Curve',
      'Gentle curved single-button barrel cuff suited to breathable linen and casual Oxford weaves.',
      'Single button · 6.2 cm width',
      '',
      3,
      0
    );
    insertOpt.run(
      'cuff',
      'Single French',
      'Cufflink Formal Dress',
      'Single-layer mitered French cuff designed for silk knots or engraved gold cufflinks without bulk.',
      'Cufflink hole · 7.2 cm width',
      '',
      4,
      0
    );
  }

  const existingReviews = db.prepare('SELECT COUNT(*) AS count FROM product_reviews').get() as { count: number };
  if (existingReviews.count === 0) {
    const productIds = db
      .prepare('SELECT id FROM products WHERE active = 1 ORDER BY id ASC LIMIT 4')
      .all() as Array<{ id: number }>;
    if (productIds.length > 0) {
      const firstId = productIds[0].id;
      const secondId = productIds[Math.min(3, productIds.length - 1)].id;
      const insertReview = db.prepare(`
        INSERT INTO product_reviews (
          product_id, order_number, customer_email, customer_name, rating, title, comment, fit_feedback, region_code, verified_purchase, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now', ?))
      `);
      try {
        insertReview.run(
          firstId,
          'MN-2026-1001',
          'henrik.solberg@nordicexec.no',
          'Henrik Solberg',
          5,
          'Perfekt passform og utrolig lin-kvalitet',
          'Bestilte med -1 cm ermelengde under Skreddersøm og skjorten sitter som støpt. Luften går rett gjennom stoffet.',
          'true_to_size',
          'no',
          '-2 days'
        );
        insertReview.run(
          firstId,
          'MN-2026-1003',
          'tuan.nguyen@saigonventures.vn',
          'Nguyễn Minh Tuấn',
          5,
          'Vải linen Ý rất mát và đứng phom',
          'Chiều dài tay áo chỉnh -2cm chuẩn xác từng milimet. Rất hài lòng khi mặc tại TP.HCM.',
          'true_to_size',
          'vn',
          '-1 days'
        );
        insertReview.run(
          secondId,
          'MN-2026-1004',
          'j.vance@manhattan-capital.com',
          'Julian Vance',
          5,
          'Two-ply crispness all the way from morning briefing to dinner',
          'The 100/2-ply cotton drapes cleanly beneath a blazer and the French cuffs hold their structure effortlessly.',
          'true_to_size',
          'en',
          '-1 days'
        );
      } catch (err) {
        console.warn(
          '[seed] Skipping sample product reviews:',
          err instanceof Error ? err.message : err
        );
      }
    }
  }
}
