/**
 * Prove websiteUrl validation runs BEFORE any Meta campaign POST.
 * Does NOT call live Meta or POST /api/boost/create.
 *
 * Run after server build:
 *   node scripts/test-boost-create-validation-order.mjs
 */

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let mod;
try {
  mod = require(path.join(__dirname, '../server/dist/utils/boostApi.js'));
} catch {
  console.error('Could not load server/dist/utils/boostApi.js — run: cd server && npm run build');
  process.exit(1);
}

const {
  getObjectiveConfig,
  validateBoostInput,
  validateBoostWebsiteUrl,
  createBoost,
  buildBoostCreativePayloadForTest,
  buildBoostAdSetPayloadForTest,
  collectWebsiteLinkPaths,
  collectExternalWebsiteLinkPaths,
} = mod;

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

function baseInput(overrides = {}) {
  return {
    accessToken: 'test-token',
    adAccountId: 'act_1565876271664990',
    pageId: '1075180269021869',
    igUserId: '17841417953955963',
    mediaId: 'media_1',
    instagramUsername: 'test_ig_user',
    objective: 'profile_visits',
    audienceMode: 'automatic',
    locationCountries: ['IN'],
    dailyBudgetMajor: 5,
    startDate: '2026-08-12T20:00:00.000Z',
    endDate: '2026-08-13T20:00:01.000Z',
    status: 'PAUSED',
    ...overrides,
  };
}

function countingTransport() {
  const posts = [];
  const gets = [];
  return {
    posts,
    gets,
    transport: {
      get: async (path) => {
        gets.push(path);
        throw new Error(`Unexpected Meta GET: ${path}`);
      },
      post: async (path, _token, body) => {
        posts.push({ path, body });
        throw new Error(`Unexpected Meta POST: ${path}`);
      },
      delete: async (id) => {
        throw new Error(`Unexpected Meta DELETE: ${id}`);
      },
    },
  };
}

console.log('Boost create-time websiteUrl validation order (mocked Meta — no live create)\n');

const profileObj = getObjectiveConfig('profile_visits');
const webObj = getObjectiveConfig('website_visits');
const msgObj = getObjectiveConfig('messages');

// --- invalid Website Visits → zero campaign POSTs ---
{
  const { posts, gets, transport } = countingTransport();
  const result = await createBoost(
    baseInput({ objective: 'website_visits', websiteUrl: '' }),
    transport
  );
  const campaignPosts = posts.filter((p) => String(p.path).includes('/campaigns')).length;
  assert(result.success === false, 'invalid Website Visits does not succeed');
  assert(result.error?.code === 'VALIDATION_ERROR', 'invalid Website Visits → VALIDATION_ERROR');
  assert(campaignPosts === 0, `invalid Website Visits campaign POST count = 0 (got ${campaignPosts})`);
  assert(posts.length === 0, 'invalid Website Visits makes zero Meta POSTs');
  assert(gets.length === 0, 'invalid Website Visits makes zero Meta GETs before failing');
}

// --- Profile Visits without URL → validation passes ---
{
  const input = baseInput({ objective: 'profile_visits' });
  delete input.websiteUrl;
  const errors = validateBoostInput(input, 'INR', null);
  const websiteErrors = validateBoostWebsiteUrl(input);
  assert(errors.length === 0 && websiteErrors.length === 0, 'Profile Visits without URL → validation passes');
}

// --- Messages without URL → validation passes ---
{
  const input = baseInput({ objective: 'messages' });
  delete input.websiteUrl;
  const errors = validateBoostInput(input, 'INR', null);
  const websiteErrors = validateBoostWebsiteUrl(input);
  assert(errors.length === 0 && websiteErrors.length === 0, 'Messages without URL → validation passes');
}

// --- Website Visits with valid URL → payload contains URL ---
{
  const input = baseInput({
    objective: 'website_visits',
    websiteUrl: 'https://example.com/shop',
  });
  const creative = buildBoostCreativePayloadForTest(input, webObj);
  const hits = collectWebsiteLinkPaths(creative);
  assert(
    creative.call_to_action?.value?.link === 'https://example.com/shop',
    'Website Visits payload contains the URL'
  );
  assert(hits.length > 0, 'Website Visits creative is flagged as containing a website link');
}

// --- Profile Visits → no website URL/link fields ---
{
  const input = baseInput({
    objective: 'profile_visits',
    websiteUrl: 'https://should-not-appear.example',
  });
  const creative = buildBoostCreativePayloadForTest(input, profileObj);
  const adSet = buildBoostAdSetPayloadForTest(input, profileObj);
  const hits = [
    ...collectExternalWebsiteLinkPaths(creative),
    ...collectExternalWebsiteLinkPaths(adSet),
  ];
  assert(
    creative.call_to_action?.type === 'VIEW_INSTAGRAM_PROFILE',
    'Profile Visits creative uses VIEW_INSTAGRAM_PROFILE'
  );
  assert(
    creative.call_to_action?.value?.link === 'https://www.instagram.com/test_ig_user',
    'Profile Visits CTA uses Instagram profile link'
  );
  assert(hits.length === 0, `Profile Visits payload has no external website URL/link fields (got ${hits})`);
}

// --- Messages → no website URL/link fields ---
{
  const input = baseInput({
    objective: 'messages',
    websiteUrl: 'https://should-not-appear.example',
  });
  const creative = buildBoostCreativePayloadForTest(input, msgObj);
  const adSet = buildBoostAdSetPayloadForTest(input, msgObj);
  const hits = [
    ...collectWebsiteLinkPaths(creative),
    ...collectWebsiteLinkPaths(adSet),
  ];
  assert(
    creative.call_to_action?.type === 'MESSAGE_PAGE',
    'Messages creative uses MESSAGE_PAGE'
  );
  assert(hits.length === 0, `Messages payload has no website URL/link fields (got ${hits})`);
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('No live Meta API calls were made. No campaigns/ads were created.');
