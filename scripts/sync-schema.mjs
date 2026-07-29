import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const indexPath = resolve(root, 'index.html');
const schemaPath = resolve(root, 'supabase', 'schema.sql');

const [index, schema] = await Promise.all([
  readFile(indexPath, 'utf8'),
  readFile(schemaPath, 'utf8'),
]);

const startMarker = 'function sbSchema(){ return `';
const endMarker = '` }\n\n/* ---------- شاشة قاعدة البيانات ---------- */';
const start = index.indexOf(startMarker);
const end = index.indexOf(endMarker, start + startMarker.length);

if (start < 0 || end < 0) {
  throw new Error('Could not locate sbSchema() in index.html');
}

const escapedSchema = schema
  .replaceAll('\\', '\\\\')
  .replaceAll('`', '\\`')
  .replaceAll('${', '\\${')
  .trimEnd();

const next = [
  index.slice(0, start),
  startMarker,
  escapedSchema,
  '\n',
  index.slice(end),
].join('');

await writeFile(indexPath, next, 'utf8');
