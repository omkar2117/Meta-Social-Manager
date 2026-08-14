/**
 * Local Meta Page discovery tests (mocked Graph client).
 * Does NOT call live Meta APIs or create campaigns/ads.
 *
 * Run after server build:
 *   node scripts/test-meta-connect-discovery.mjs
 */

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let discoverFacebookPages;
let selectFirstPageWithInstagram;

try {
  const mod = require(path.join(__dirname, '../server/dist/utils/pageDiscovery.js'));
  discoverFacebookPages = mod.discoverFacebookPages;
  selectFirstPageWithInstagram = mod.selectFirstPageWithInstagram;
} catch {
  console.error('Could not load server/dist/utils/pageDiscovery.js — run: cd server && npm run build');
  process.exit(1);
}

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${msg}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${msg}`);
  }
}

function mockGraph(handlers) {
  const calls = [];
  const graphGet = async (path, query) => {
    calls.push({ path, query });
    const handler = handlers[path];
    if (handler === undefined) {
      throw new Error(`Unexpected Graph path: ${path}`);
    }
    if (handler instanceof Error) throw handler;
    if (typeof handler === 'function') return handler(query);
    return handler;
  };
  graphGet.calls = calls;
  return graphGet;
}

console.log('Meta connect Page discovery tests (local mocks — no live Meta calls)\n');

// --- 1. Normal /me/accounts success (no fallbacks) ---
{
  const graphGet = mockGraph({
    '/me/accounts': {
      data: [
        { id: 'page_a', name: 'Primary Page', access_token: 'PAT', category: 'Brand' },
      ],
    },
  });
  const pages = await discoverFacebookPages(graphGet);
  assert(pages.length === 1 && pages[0].id === 'page_a', 'me/accounts success returns listed Page');
  assert(pages[0].source === 'me_accounts', 'me/accounts success uses me_accounts source');
  assert(
    !graphGet.calls.some((c) => c.path !== '/me/accounts'),
    'me/accounts success does not call fallbacks'
  );
}

// --- 2. /me/accounts empty + valid fallback (promote_pages) ---
{
  const graphGet = mockGraph({
    '/me/accounts': { data: [] },
    '/me/assigned_pages': { data: [] },
    '/me/businesses': { data: [] },
    '/me/adaccounts': { data: [{ id: 'act_1565876271664990' }] },
    '/act_1565876271664990/promote_pages': {
      data: [{ id: '1075180269021869', name: 'Break The Scroll' }],
    },
    '/1075180269021869': {
      id: '1075180269021869',
      name: 'Break The Scroll',
      instagram_business_account: { id: '17841417953955963' },
    },
  });
  const pages = await discoverFacebookPages(graphGet);
  const selected = selectFirstPageWithInstagram(pages);
  assert(pages.length === 1, 'empty me/accounts + fallback discovers one Page');
  assert(pages[0].id === '1075180269021869', 'fallback Page id comes from Meta response, not hardcoded lookup');
  assert(pages[0].name === 'Break The Scroll', 'verified Page name is present');
  assert(
    selected?.instagram_business_account?.id === '17841417953955963',
    'verified instagram_business_account is present'
  );
  assert(pages[0].source === 'ad_account_promote_pages', 'fallback source is promote_pages');
}

// --- 3. Page without Instagram account ---
{
  const graphGet = mockGraph({
    '/me/accounts': { data: [] },
    '/me/assigned_pages': {
      data: [{ id: 'page_no_ig', name: 'No IG Page' }],
    },
    '/me/businesses': { data: [] },
    '/me/adaccounts': { data: [] },
    '/page_no_ig': { id: 'page_no_ig', name: 'No IG Page' },
  });
  const pages = await discoverFacebookPages(graphGet);
  const selected = selectFirstPageWithInstagram(pages);
  assert(pages.length === 1 && pages[0].id === 'page_no_ig', 'Page without IG is still discovered if accessible');
  assert(selected === null, 'Page without Instagram is not selected for connect');
}

// --- 4. Inaccessible Page ---
{
  const graphGet = mockGraph({
    '/me/accounts': { data: [] },
    '/me/assigned_pages': { data: [] },
    '/me/businesses': { data: [] },
    '/me/adaccounts': { data: [{ id: 'act_1' }] },
    '/act_1/promote_pages': { data: [{ id: 'hidden_page', name: 'Hidden' }] },
    '/hidden_page': new Error('(#200) Missing Permissions'),
  });
  const pages = await discoverFacebookPages(graphGet);
  assert(pages.length === 0, 'inaccessible Page is not returned');
}

// --- 5. Multiple Pages — first with Instagram wins ---
{
  const graphGet = mockGraph({
    '/me/accounts': {
      data: [
        { id: 'p1', name: 'No IG' },
        { id: 'p2', name: 'Has IG' },
        { id: 'p3', name: 'Also IG' },
      ],
    },
  });
  const pages = await discoverFacebookPages(graphGet);
  // Simulate connect loop: attach IG from a subsequent page GET
  const withIg = pages.map((p) =>
    p.id === 'p2' || p.id === 'p3'
      ? { ...p, instagram_business_account: { id: `ig_${p.id}` } }
      : p
  );
  const selected = selectFirstPageWithInstagram(withIg);
  assert(pages.length === 3, 'multiple Pages from me/accounts are all returned');
  assert(selected?.id === 'p2', 'first Page that has Instagram is selected');
}

{
  const graphGet = mockGraph({
    '/me/accounts': { data: [] },
    '/me/assigned_pages': {
      data: [
        { id: 'p1', name: 'No IG' },
        { id: 'p2', name: 'Has IG' },
      ],
    },
    '/me/businesses': { data: [] },
    '/me/adaccounts': { data: [] },
    '/p1': { id: 'p1', name: 'No IG' },
    '/p2': {
      id: 'p2',
      name: 'Has IG',
      instagram_business_account: { id: 'ig_p2' },
    },
  });
  const pages = await discoverFacebookPages(graphGet);
  const selected = selectFirstPageWithInstagram(pages);
  assert(pages.length === 2, 'fallback multiple Pages are verified and returned');
  assert(selected?.id === 'p2', 'fallback selects first verified Page with Instagram');
}

// --- 6. Multiple Ad Accounts ---
{
  const graphGet = mockGraph({
    '/me/accounts': { data: [] },
    '/me/assigned_pages': { data: [] },
    '/me/businesses': { data: [] },
    '/me/adaccounts': {
      data: [{ id: 'act_111' }, { id: 'act_1565876271664990' }],
    },
    '/act_111/promote_pages': { data: [{ id: 'page_from_act1', name: 'Act1 Page' }] },
    '/act_1565876271664990/promote_pages': {
      data: [{ id: '1075180269021869', name: 'Break The Scroll' }],
    },
    '/page_from_act1': {
      id: 'page_from_act1',
      name: 'Act1 Page',
      instagram_business_account: { id: 'ig_1' },
    },
    '/1075180269021869': {
      id: '1075180269021869',
      name: 'Break The Scroll',
      instagram_business_account: { id: '17841417953955963' },
    },
  });
  const pages = await discoverFacebookPages(graphGet);
  const actCalls = graphGet.calls.filter((c) => c.path.endsWith('/promote_pages')).map((c) => c.path);
  assert(actCalls.includes('/act_111/promote_pages'), 'queries promote_pages for first ad account');
  assert(
    actCalls.includes('/act_1565876271664990/promote_pages'),
    'queries promote_pages for second ad account (INR account remains discoverable)'
  );
  assert(pages.length === 2, 'pages from multiple ad accounts are merged');
  assert(
    pages.some((p) => p.id === '1075180269021869') && pages.some((p) => p.id === 'page_from_act1'),
    'unique Pages from each ad account are kept'
  );
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('No live Meta API calls were made. No campaigns/ads were created.');
