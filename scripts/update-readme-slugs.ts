/**
 * update-readme-slugs.ts
 *
 * Bulk-updates ReadMe Guide page slugs so that any underscore ( _ ) in a slug
 * is replaced with a hyphen ( - ), matching the dash-based URL convention used
 * on the public API docs site.
 *
 * Usage:
 *   README_API_KEY=<key> ts-node scripts/update-readme-slugs.ts [options]
 *
 * Options:
 *   --dry-run           Preview changes without writing anything (default: off)
 *   --version=<ver>     Target a specific ReadMe version, e.g. --version=v2.0
 *   --delay=<ms>        Milliseconds to wait between API calls (default: 500)
 *   --category=<slug>   Only process this single category slug
 *
 * Environment variables:
 *   README_API_KEY      (required) Your ReadMe API key
 *   README_VERSION      (optional) Docs version; overridden by --version flag
 */

import https from 'https';
import { URL } from 'url';

const README_API_BASE = 'https://dash.readme.com/api/v1';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Category {
  slug: string;
  title: string;
  type: string;
}

interface DocEntry {
  slug: string;
  title: string;
  children?: DocEntry[];
}

interface DocDetail {
  slug: string;
  title: string;
  type: string;
  body: string;
  category: string;
  hidden: boolean;
  order: number;
  parentDoc?: string;
  [key: string]: unknown;
}

interface Config {
  apiKey: string;
  version: string | undefined;
  dryRun: boolean;
  delayMs: number;
  onlyCategory: string | undefined;
}

// ---------------------------------------------------------------------------
// HTTP helpers (no extra dependencies – uses built-in https module)
// ---------------------------------------------------------------------------

function makeAuthHeader(apiKey: string): string {
  return 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64');
}

function httpRequest(
  method: string,
  urlStr: string,
  headers: Record<string, string>,
  body?: string
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const options: https.RequestOptions = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers,
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const resHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) {
          if (typeof v === 'string') resHeaders[k] = v;
          else if (Array.isArray(v)) resHeaders[k] = v.join(', ');
        }
        resolve({
          status: res.statusCode ?? 0,
          headers: resHeaders,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function buildHeaders(config: Config, extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: makeAuthHeader(config.apiKey),
    Accept: 'application/json',
    ...extra,
  };
  if (config.version) h['x-readme-version'] = config.version;
  return h;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// ReadMe API calls
// ---------------------------------------------------------------------------

async function fetchAllCategories(config: Config): Promise<Category[]> {
  const categories: Category[] = [];
  let page = 1;

  while (true) {
    const url = `${README_API_BASE}/categories?perPage=100&page=${page}`;
    const res = await httpRequest('GET', url, buildHeaders(config));

    if (res.status !== 200) {
      throw new Error(`GET /categories failed (${res.status}): ${res.body}`);
    }

    const batch = JSON.parse(res.body) as Category[];
    categories.push(...batch);

    const total = parseInt(res.headers['x-total-count'] ?? '0', 10);
    if (categories.length >= total || batch.length === 0) break;
    page++;
  }

  return categories;
}

async function fetchCategoryDocs(categorySlug: string, config: Config): Promise<DocEntry[]> {
  const url = `${README_API_BASE}/categories/${categorySlug}/docs`;
  const res = await httpRequest('GET', url, buildHeaders(config));

  if (res.status !== 200) {
    throw new Error(`GET /categories/${categorySlug}/docs failed (${res.status}): ${res.body}`);
  }

  return JSON.parse(res.body) as DocEntry[];
}

async function fetchDoc(slug: string, config: Config): Promise<DocDetail> {
  const url = `${README_API_BASE}/docs/${slug}`;
  const res = await httpRequest('GET', url, buildHeaders(config));

  if (res.status !== 200) {
    throw new Error(`GET /docs/${slug} failed (${res.status}): ${res.body}`);
  }

  return JSON.parse(res.body) as DocDetail;
}

async function updateDoc(oldSlug: string, newSlug: string, doc: DocDetail, config: Config): Promise<void> {
  const url = `${README_API_BASE}/docs/${oldSlug}`;
  const payload: Record<string, unknown> = {
    title: doc.title,
    type: doc.type,
    body: doc.body,
    category: doc.category,
    hidden: doc.hidden,
    order: doc.order,
    slug: newSlug,
  };
  if (doc.parentDoc) payload.parentDoc = doc.parentDoc;

  const body = JSON.stringify(payload);
  const res = await httpRequest('PUT', url, buildHeaders(config, { 'Content-Type': 'application/json' }), body);

  if (res.status !== 200) {
    throw new Error(`PUT /docs/${oldSlug} failed (${res.status}): ${res.body}`);
  }
}

// ---------------------------------------------------------------------------
// Slug helpers
// ---------------------------------------------------------------------------

function toKebabCase(slug: string): string {
  return slug.replace(/_/g, '-');
}

function needsUpdate(slug: string): boolean {
  return slug.includes('_');
}

function flattenDocSlugs(docs: DocEntry[]): string[] {
  const slugs: string[] = [];
  for (const doc of docs) {
    slugs.push(doc.slug);
    if (doc.children && doc.children.length > 0) {
      slugs.push(...flattenDocSlugs(doc.children));
    }
  }
  return slugs;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const dryRun = args.includes('--dry-run');
  const versionArg = args.find((a) => a.startsWith('--version='));
  const delayArg = args.find((a) => a.startsWith('--delay='));
  const categoryArg = args.find((a) => a.startsWith('--category='));

  const apiKey = process.env.README_API_KEY;
  if (!apiKey) {
    console.error('ERROR: README_API_KEY environment variable is not set.\n');
    console.error(
      'Usage: README_API_KEY=<key> ts-node scripts/update-readme-slugs.ts [--dry-run] [--version=v2.0] [--delay=500] [--category=<slug>]'
    );
    process.exit(1);
  }

  const config: Config = {
    apiKey,
    version: versionArg ? versionArg.split('=')[1] : process.env.README_VERSION,
    dryRun,
    delayMs: delayArg ? parseInt(delayArg.split('=')[1], 10) : 500,
    onlyCategory: categoryArg ? categoryArg.split('=').slice(1).join('=') : undefined,
  };

  console.log('================================================');
  console.log(' ReadMe Slug Updater (underscore → dash)');
  console.log('================================================');
  console.log(`Mode       : ${config.dryRun ? 'DRY RUN – no changes will be written' : 'LIVE – slugs will be updated'}`);
  if (config.version) console.log(`Version    : ${config.version}`);
  if (config.onlyCategory) console.log(`Category   : ${config.onlyCategory} (single-category mode)`);
  console.log(`API delay  : ${config.delayMs} ms between requests`);
  console.log('================================================\n');

  // Fetch categories
  let categories: Category[];
  if (config.onlyCategory) {
    categories = [{ slug: config.onlyCategory, title: config.onlyCategory, type: 'guide' }];
  } else {
    console.log('Fetching all categories …');
    categories = await fetchAllCategories(config);
    console.log(`Found ${categories.length} categories.\n`);
  }

  let totalScanned = 0;
  let totalNeedUpdate = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  const errorLog: Array<{ slug: string; error: string }> = [];

  for (const category of categories) {
    console.log(`── Category: "${category.title}" (${category.slug})`);

    let docs: DocEntry[];
    try {
      docs = await fetchCategoryDocs(category.slug, config);
    } catch (err) {
      console.error(`   [error] Could not fetch docs: ${(err as Error).message}`);
      totalErrors++;
      continue;
    }

    const slugs = flattenDocSlugs(docs);
    totalScanned += slugs.length;

    for (const slug of slugs) {
      if (!needsUpdate(slug)) {
        process.stdout.write(`   [ok]   ${slug}\n`);
        continue;
      }

      const newSlug = toKebabCase(slug);
      totalNeedUpdate++;

      if (config.dryRun) {
        console.log(`   [→]    ${slug}  →  ${newSlug}`);
        continue;
      }

      try {
        await sleep(config.delayMs);
        const doc = await fetchDoc(slug, config);

        await sleep(config.delayMs);
        await updateDoc(slug, newSlug, doc, config);

        totalUpdated++;
        console.log(`   [done] ${slug}  →  ${newSlug}`);
      } catch (err) {
        totalErrors++;
        const message = (err as Error).message;
        console.error(`   [fail] ${slug}: ${message}`);
        errorLog.push({ slug, error: message });
      }

      await sleep(config.delayMs);
    }

    console.log('');
    await sleep(config.delayMs);
  }

  console.log('================================================');
  console.log(' Summary');
  console.log('================================================');
  console.log(`Docs scanned         : ${totalScanned}`);
  console.log(`Slugs with underscore: ${totalNeedUpdate}`);

  if (config.dryRun) {
    console.log('\nDry-run complete. Re-run without --dry-run to apply changes.');
  } else {
    console.log(`Successfully updated : ${totalUpdated}`);
    if (totalErrors > 0) {
      console.log(`Errors               : ${totalErrors}`);
      console.log('\nFailed slugs:');
      for (const { slug, error } of errorLog) {
        console.log(`  ${slug}: ${error}`);
      }
      process.exit(1);
    }
  }
}

main().catch((err: unknown) => {
  console.error('Fatal error:', (err as Error).message ?? err);
  process.exit(1);
});
