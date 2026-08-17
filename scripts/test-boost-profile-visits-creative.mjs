/**
 * Profile Visits creative CTA link (Meta v25) — local mocked tests only.
 * Does NOT call live Meta or POST /api/boost/create.
 *
 * Run after server build:
 *   node scripts/test-boost-profile-visits-creative.mjs
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
  createBoost,
  buildBoostCreativePayloadForTest,
  buildBoostAdSetPayloadForTest,
  collectExternalWebsiteLinkPaths,
  buildInstagramProfileCtaLink,
  isInstagramProfileCtaLink,
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
    instagramUsername: 'break.the.scroll',
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

function mockCreateTransport() {
  const posts = [];
  const gets = [];
  return {
    posts,
    gets,
    transport: {
      get: async (path) => {
        gets.push(path);
        const p = String(path);
        if (p.includes('/minimum_budgets')) return { data: [] };
        if (p.includes('act_')) {
          return {
            currency: 'INR',
            account_status: 1,
            name: 'Break The Scroll India1',
            min_daily_budget: 100,
          };
        }
        if (p.includes('media_1')) {
          return {
            id: 'media_1',
            media_type: 'IMAGE',
            boost_eligibility_info: { eligible_to_boost: true },
          };
        }
        throw new Error(`Unexpected Meta GET: ${path}`);
      },
      post: async (path, _token, body) => {
        posts.push({ path, body });
        return { id: `mock_${posts.length}` };
      },
      delete: async (id) => {
        throw new Error(`Unexpected Meta DELETE: ${id}`);
      },
    },
  };
}

console.log('Profile Visits creative CTA / mocked create flow (no live Meta)\n');

const profileObj = getObjectiveConfig('profile_visits');
const webObj = getObjectiveConfig('website_visits');
const msgObj = getObjectiveConfig('messages');
const expectedProfileLink = buildInstagramProfileCtaLink('break.the.scroll');

{
  const leftover = 'https://should-not-appear.example/shop';
  const input = baseInput({
    objective: 'profile_visits',
    websiteUrl: leftover,
    instagramUsername: 'break.the.scroll',
  });
  const creative = buildBoostCreativePayloadForTest(input, profileObj);
  const adSet = buildBoostAdSetPayloadForTest(input, profileObj);
  const externalHits = [
    ...collectExternalWebsiteLinkPaths(creative),
    ...collectExternalWebsiteLinkPaths(adSet),
  ];

  assert(profileObj.campaignObjective === 'OUTCOME_TRAFFIC', 'mapping: OUTCOME_TRAFFIC');
  assert(profileObj.optimizationGoal === 'PROFILE_VISIT', 'mapping: PROFILE_VISIT');
  assert(profileObj.destinationType === 'INSTAGRAM_PROFILE', 'mapping: INSTAGRAM_PROFILE');
  assert(
    creative.call_to_action?.type === 'VIEW_INSTAGRAM_PROFILE',
    'CTA type is VIEW_INSTAGRAM_PROFILE'
  );
  assert(
    creative.call_to_action?.value?.link === expectedProfileLink,
    `CTA value.link is Instagram profile URL (${expectedProfileLink})`
  );
  assert(
    isInstagramProfileCtaLink(creative.call_to_action?.value?.link),
    'CTA link is classified as Instagram profile destination'
  );
  assert(
    creative.call_to_action?.value?.link !== leftover,
    'CTA link is not the leftover websiteUrl'
  );
  assert(creative.object_id === input.pageId, 'creative keeps Page ID as object_id');
  assert(creative.instagram_user_id === input.igUserId, 'creative keeps Instagram user ID');
  assert(creative.source_instagram_media_id === input.mediaId, 'creative keeps Instagram media ID');
  assert(
    Object.keys(adSet.promoted_object).sort().join(',') === 'page_id',
    'promoted_object keys are page_id only'
  );
  assert(externalHits.length === 0, `no external website URL fields (got ${externalHits})`);
}

{
  const input = baseInput({
    objective: 'website_visits',
    websiteUrl: 'https://example.com/shop',
  });
  const creative = buildBoostCreativePayloadForTest(input, webObj);
  assert(
    creative.call_to_action?.type === 'LEARN_MORE' &&
      creative.call_to_action?.value?.link === 'https://example.com/shop',
    'Website Visits still uses the real website URL only'
  );
  assert(
    !isInstagramProfileCtaLink(creative.call_to_action?.value?.link),
    'Website Visits link is not an Instagram profile URL'
  );
}

{
  const leftover = 'https://should-not-appear.example/shop';
  const input = baseInput({ objective: 'messages', websiteUrl: leftover });
  const creative = buildBoostCreativePayloadForTest(input, msgObj);
  const adSet = buildBoostAdSetPayloadForTest(input, msgObj);
  const externalHits = [
    ...collectExternalWebsiteLinkPaths(creative),
    ...collectExternalWebsiteLinkPaths(adSet),
  ];
  assert(
    creative.call_to_action?.type === 'MESSAGE_PAGE' &&
      creative.call_to_action?.value?.app_destination === 'INSTAGRAM_DIRECT',
    'Messages CTA unchanged (MESSAGE_PAGE / INSTAGRAM_DIRECT)'
  );
  assert(!creative.call_to_action?.value?.link, 'Messages CTA has no link field');
  assert(externalHits.length === 0, `Messages has no external website URL (got ${externalHits})`);
}

{
  const { posts, gets, transport } = mockCreateTransport();
  const result = await createBoost(
    baseInput({ objective: 'website_visits', websiteUrl: '' }),
    transport
  );
  const campaignPosts = posts.filter((p) => String(p.path).includes('/campaigns')).length;
  assert(result.success === false && result.error?.code === 'VALIDATION_ERROR', 'invalid Website Visits → VALIDATION_ERROR');
  assert(campaignPosts === 0 && posts.length === 0 && gets.length === 0, 'invalid Website Visits stops before any Meta GET/POST');
}

{
  const { posts, gets, transport } = mockCreateTransport();
  const result = await createBoost(
    baseInput({
      objective: 'profile_visits',
      websiteUrl: 'https://should-not-appear.example',
      instagramUsername: 'break.the.scroll',
    }),
    transport
  );
  const campaignPosts = posts.filter((p) => String(p.path).includes('/campaigns'));
  const creativePosts = posts.filter((p) => String(p.path).includes('/adcreatives'));
  const liveHosts = [...gets, ...posts.map((p) => p.path)].some((p) =>
    String(p).includes('graph.facebook.com')
  );

  assert(result.success === true, `Profile Visits mocked create succeeds (got ${result.error?.message || 'ok'})`);
  assert(campaignPosts.length === 1, 'Profile Visits reaches Campaign POST');
  assert(creativePosts.length === 1, 'Profile Visits reaches Creative POST');
  assert(
    creativePosts[0]?.body?.call_to_action?.type === 'VIEW_INSTAGRAM_PROFILE',
    'Creative POST CTA type is VIEW_INSTAGRAM_PROFILE'
  );
  assert(
    creativePosts[0]?.body?.call_to_action?.value?.link === expectedProfileLink,
    'Creative POST includes required Instagram profile link field'
  );
  assert(
    collectExternalWebsiteLinkPaths(creativePosts[0]?.body).length === 0,
    'Creative POST has no external website URL'
  );
  assert(!liveHosts, 'no live graph.facebook.com endpoint was called');
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('No live Meta API calls were made. No campaigns/ads were created.');
