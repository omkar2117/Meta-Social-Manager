/**
 * Local Ad Set promoted_object payload tests.
 * Does NOT call Meta or POST /api/boost/create.
 *
 * Run after server build:
 *   node scripts/test-boost-promoted-object.mjs
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
  buildBoostPromotedObject,
  buildBoostAdSetPayloadForTest,
  buildBoostCreativePayloadForTest,
  buildBoostTargetingForTest,
  resolveMetaAdSetSchedule,
  META_DAILY_BUDGET_MIN_MS,
  META_SCHEDULE_SAFETY_BUFFER_MS,
  normalizeBoostWebsiteUrl,
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

function promotedKeys(obj) {
  return Object.keys(obj).sort();
}

console.log('Boost Ad Set promoted_object tests (local only — no Meta create)\n');

const profileObj = getObjectiveConfig('profile_visits');
const webObj = getObjectiveConfig('website_visits');
const msgObj = getObjectiveConfig('messages');

const profileInput = baseInput({ objective: 'profile_visits' });
const webInput = baseInput({
  objective: 'website_visits',
  websiteUrl: 'https://example.com/shop',
});
const msgInput = baseInput({ objective: 'messages' });

const profileAdSet = buildBoostAdSetPayloadForTest(profileInput, profileObj);
const webAdSet = buildBoostAdSetPayloadForTest(webInput, webObj);
const msgAdSet = buildBoostAdSetPayloadForTest(msgInput, msgObj);

const profilePromo = profileAdSet.promoted_object;
const webPromo = webAdSet.promoted_object;
const msgPromo = msgAdSet.promoted_object;

// --- 1. Profile Visits ---
{
  assert(
    !Object.prototype.hasOwnProperty.call(profilePromo, 'instagram_user_id'),
    '1a. Profile Visits promoted_object does not contain instagram_user_id'
  );
  assert(
    promotedKeys(profilePromo).join(',') === 'page_id',
    `1b. Profile Visits promoted_object keys are only page_id (got ${promotedKeys(profilePromo)})`
  );
  assert(profilePromo.page_id === profileInput.pageId, '1c. Profile Visits keeps Page ID');
  assert(
    profileAdSet.destination_type === 'INSTAGRAM_PROFILE' &&
      profileAdSet.optimization_goal === 'PROFILE_VISIT',
    '1d. Profile Visits destination/optimization unchanged'
  );
  const creative = buildBoostCreativePayloadForTest(profileInput, profileObj);
  assert(
    creative.instagram_user_id === profileInput.igUserId,
    '1e. Instagram identity is on the creative, not promoted_object'
  );
  assert(
    creative.source_instagram_media_id === profileInput.mediaId,
    '1f. Instagram media ID remains on the creative'
  );
  assert(
    !Object.prototype.hasOwnProperty.call(profileAdSet, 'instagram_user_id'),
    '1g. Ad Set payload does not invent a top-level instagram_user_id field'
  );
}

// --- 2. Website Visits ---
{
  assert(
    !Object.prototype.hasOwnProperty.call(webPromo, 'instagram_user_id'),
    '2a. Website Visits promoted_object has no instagram_user_id'
  );
  assert(
    promotedKeys(webPromo).join(',') === 'page_id',
    '2b. Website Visits promoted_object is page_id only'
  );
  assert(webAdSet.destination_type === 'WEBSITE', '2c. Website Visits destination_type is WEBSITE');
  assert(
    webAdSet.optimization_goal === 'LINK_CLICKS',
    '2d. Website Visits optimization_goal is LINK_CLICKS'
  );
  const creative = buildBoostCreativePayloadForTest(webInput, webObj);
  assert(
    creative.call_to_action?.value?.link === 'https://example.com/shop',
    '2e. Website URL remains LEARN_MORE link on creative'
  );
  assert(
    normalizeBoostWebsiteUrl('website_visits', 'https://example.com/shop') ===
      'https://example.com/shop',
    '2f. Website URL normalization unchanged'
  );
}

// --- 3. Messages ---
{
  assert(
    !Object.prototype.hasOwnProperty.call(msgPromo, 'instagram_user_id'),
    '3a. Messages promoted_object has no instagram_user_id'
  );
  assert(
    promotedKeys(msgPromo).join(',') === 'page_id',
    '3b. Messages promoted_object is page_id only'
  );
  assert(
    msgAdSet.destination_type === 'INSTAGRAM_DIRECT' &&
      msgAdSet.optimization_goal === 'CONVERSATIONS',
    '3c. Messages mapping unchanged'
  );
  const creative = buildBoostCreativePayloadForTest(msgInput, msgObj);
  assert(
    creative.instagram_user_id === msgInput.igUserId,
    '3d. Messages Instagram identity remains on the creative'
  );
}

// --- 4. No objective nests instagram_user_id in promoted_object ---
{
  for (const [key, obj, input] of [
    ['profile_visits', profileObj, profileInput],
    ['website_visits', webObj, webInput],
    ['messages', msgObj, msgInput],
  ]) {
    const promo = buildBoostPromotedObject(input, obj);
    assert(
      !Object.prototype.hasOwnProperty.call(promo, 'instagram_user_id'),
      `4. ${key}: no promoted_object.instagram_user_id`
    );
  }
}

// Unchanged neighboring behavior
{
  const targeting = buildBoostTargetingForTest(profileInput);
  assert(targeting.targeting_automation.advantage_audience === 1, 'Advantage Audience unchanged');
  const sched = resolveMetaAdSetSchedule(profileInput.startDate, '2026-08-13T20:00:00.000Z');
  assert(
    sched.durationMs === META_DAILY_BUDGET_MIN_MS + META_SCHEDULE_SAFETY_BUFFER_MS,
    'Schedule still 24h + 60s'
  );
  assert((profileInput.status || 'PAUSED') === 'PAUSED', 'PAUSED default unchanged');
  assert(profileInput.adAccountId === 'act_1565876271664990', 'Ad Account id unchanged in payload input');
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('No live Meta API calls were made. No campaigns/ads were created.');
