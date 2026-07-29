import vm from 'node:vm';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const indexPath = resolve(root, 'index.html');
const outputPath = resolve(root, 'supabase', 'seed.sql');
const html = await readFile(indexPath, 'utf8');
const match = html.match(/function seed\(\)\{[\s\S]*?\n\}\nlet DB=/);

if (!match) {
  throw new Error('Could not locate seed() in index.html');
}

const seedFunction = match[0].replace(/\nlet DB=$/, '');
let randomState = 0x5f3759df;
const seededMath = Object.create(Math);
seededMath.random = () => {
  randomState = (1664525 * randomState + 1013904223) >>> 0;
  return randomState / 0x100000000;
};

const baseNow = new Date('2026-07-29T09:00:00.000Z');
const context = {
  Math: seededMath,
  dAgo(days) {
    const date = new Date(baseNow);
    date.setUTCDate(date.getUTCDate() - days);
    return date.toISOString();
  },
  uid(prefix) {
    return `${prefix}_${seededMath.random().toString(36).slice(2, 9)}`;
  },
};

vm.createContext(context);
const data = vm.runInContext(`(${seedFunction})()`, context);

for (const product of data.products) {
  product.sold = 0;
}
for (const affiliate of data.affiliates) {
  affiliate.clicks = 0;
  affiliate.paid = 0;
  delete affiliate.password;
  delete affiliate.iban;
  delete affiliate.phone;
  delete affiliate.email;
}
for (const coupon of data.coupons) {
  coupon.used = 0;
}

const quote = (value) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const rows = (table, values) => {
  if (!values.length) return `-- ${table}: intentionally empty`;
  return [
    `insert into public.${table} (id, data) values`,
    values.map((value) => `  ('${value.id.replaceAll("'", "''")}', ${quote(value)})`).join(',\n'),
    'on conflict (id) do update',
    'set data = excluded.data, updated_at = now();',
  ].join('\n');
};

const sql = [
  '-- Seed data for the Rufuf demo storefront.',
  '-- No sample customers or orders are inserted.',
  '',
  `insert into public.settings (id, data) values ('main', ${quote(data.settings)})`,
  'on conflict (id) do update',
  'set data = excluded.data, updated_at = now();',
  '',
  rows('categories', data.categories),
  '',
  rows('products', data.products),
  '',
  rows('shipping_methods', data.shipping),
  '',
  rows('payment_methods', data.payments),
  '',
  rows('reviews', data.reviews),
  '',
  rows('pages', data.pages),
  '',
  rows('banners', data.banners),
  '',
  rows('coupons', data.coupons),
  '',
  rows('affiliates', data.affiliates),
  '',
].join('\n');

await writeFile(outputPath, sql, 'utf8');
