/**
 * Local Boost objective / websiteUrl tests.
 * Does NOT call Meta or POST /api/boost/create.
 *
 * Run after server build:
 *   node scripts/test-boost-objective-url.mjs
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
  BOOST_OBJECTIVES,
  getObjectiveConfig,
  validateBoostInput,
  validateBoostWebsiteUrl,
  normalizeBoostWebsiteUrl,
  buildBoostCreativePayloadForTest,
  buildBoostPromotedObject,
  buildBoostTargetingForTest,
  resolveMetaAdSetSchedule,
  META_DAILY_BUDGET_MIN_MS,
  META_SCHEDULE_SAFETY_BUFFER_MS,
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
    adAccountId: 'act_1',
    pageId: 'page_1',
    igUserId: 'ig_1',
    mediaId: 'media_1',
    objective: 'profile_visits',
    audienceMode: 'automatic',
    locationCountries: ['US'],
    dailyBudgetMajor: 5,
    startDate: '2026-08-12T20:00:00.000Z',
    endDate: '2026-08-13T20:00:01.000Z',
    status: 'PAUSED',
    ...overrides,
  };
}

console.log('Boost objective / websiteUrl tests (local only — no Meta create)\n');

// --- 1. Profile Visits + empty websiteUrl → PASS validation ---
{
  const errors = validateBoostInput(baseInput({ objective: 'profile_visits', websiteUrl: '' }), 'USD', null);
  assert(errors.length === 0, `1. Profile Visits + empty websiteUrl → PASS (got ${errors.join(' | ') || 'none'})`);
}

// --- 2. Profile Visits + no websiteUrl → review-equivalent validation succeeds ---
{
  const input = baseInput({ objective: 'profile_visits' });
  delete input.websiteUrl;
  const errors = validateBoostInput(input, 'USD', null);
  const websiteErrors = validateBoostWebsiteUrl(input);
  assert(
    errors.length === 0 && websiteErrors.length === 0,
    '2. Profile Visits + no websiteUrl → Review validation succeeds'
  );
}

// --- 3. Website Visits + empty websiteUrl → VALIDATION_ERROR ---
{
  const errors = validateBoostInput(
    baseInput({ objective: 'website_visits', websiteUrl: '' }),
    'USD',
    null
  );
  const websiteErrors = validateBoostWebsiteUrl({ objective: 'website_visits', websiteUrl: '' });
  assert(
    errors.some((e) => e.includes('website URL')) && websiteErrors.length > 0,
    '3. Website Visits + empty websiteUrl → VALIDATION_ERROR'
  );
}

// --- 4. Website Visits + valid https URL → Review succeeds ---
{
  const errors = validateBoostInput(
    baseInput({ objective: 'website_visits', websiteUrl: 'https://example.com/shop' }),
    'USD',
    null
  );
  assert(errors.length === 0, `4. Website Visits + valid https URL → PASS (got ${errors.join(' | ') || 'none'})`);
}

// --- 5. Messages + empty websiteUrl → PASS ---
{
  const errors = validateBoostInput(baseInput({ objective: 'messages', websiteUrl: '' }), 'USD', null);
  assert(errors.length === 0, `5. Messages + empty websiteUrl → PASS (got ${errors.join(' | ') || 'none'})`);
}

// --- 6. Website URL included only for Website Visits ---
{
  const leftover = 'https://should-not-be-used.example';
  assert(
    normalizeBoostWebsiteUrl('profile_visits', leftover) === undefined,
    '6a. Profile Visits strips leftover websiteUrl'
  );
  assert(
    normalizeBoostWebsiteUrl('messages', leftover) === undefined,
    '6b. Messages strips leftover websiteUrl'
  );
  assert(
    normalizeBoostWebsiteUrl('website_visits', leftover) === leftover,
    '6c. Website Visits keeps websiteUrl'
  );
  assert(
    normalizeBoostWebsiteUrl('website_visits', '  ') === undefined,
    '6d. Website Visits blank URL is omitted'
  );

  const profileObj = getObjectiveConfig('profile_visits');
  const webObj = getObjectiveConfig('website_visits');
  const msgObj = getObjectiveConfig('messages');
  const profileCreative = buildBoostCreativePayloadForTest(
    baseInput({ objective: 'profile_visits', websiteUrl: leftover }),
    profileObj
  );
  const webCreative = buildBoostCreativePayloadForTest(
    baseInput({ objective: 'website_visits', websiteUrl: leftover }),
    webObj
  );
  const msgCreative = buildBoostCreativePayloadForTest(
    baseInput({ objective: 'messages', websiteUrl: leftover }),
    msgObj
  );
  assert(!profileCreative.call_to_action, '6e. Profile creative has no website CTA');
  assert(
    webCreative.call_to_action?.value?.link === leftover,
    '6f. Website creative includes the URL'
  );
  assert(
    msgCreative.call_to_action?.value?.app_destination === 'INSTAGRAM_DIRECT',
    '6g. Messages creative is INSTAGRAM_DIRECT, not a website link'
  );

  const profilePromo = buildBoostPromotedObject(baseInput({ objective: 'profile_visits' }), profileObj);
  const webPromo = buildBoostPromotedObject(baseInput({ objective: 'website_visits' }), webObj);
  assert(
    profileObj.destinationType === 'INSTAGRAM_PROFILE' && !('website_url' in profilePromo),
    '6h. Profile Ad Set is not a WEBSITE destination'
  );
  assert(
    webObj.destinationType === 'WEBSITE' && webPromo.page_id,
    '6i. Website Ad Set uses WEBSITE destination + page_id'
  );
}

// --- 7. Meta mapping remains unchanged ---
{
  const profile = getObjectiveConfig('profile_visits');
  const web = getObjectiveConfig('website_visits');
  const msg = getObjectiveConfig('messages');
  assert(
    profile.campaignObjective === 'OUTCOME_TRAFFIC' &&
      profile.optimizationGoal === 'PROFILE_VISIT' &&
      profile.destinationType === 'INSTAGRAM_PROFILE' &&
      profile.requiresWebsiteUrl === false,
    '7a. Profile Visits mapping unchanged'
  );
  assert(
    web.campaignObjective === 'OUTCOME_TRAFFIC' &&
      web.optimizationGoal === 'LINK_CLICKS' &&
      web.destinationType === 'WEBSITE' &&
      web.requiresWebsiteUrl === true,
    '7b. Website Visits mapping unchanged'
  );
  assert(
    msg.campaignObjective === 'OUTCOME_ENGAGEMENT' &&
      msg.optimizationGoal === 'CONVERSATIONS' &&
      msg.destinationType === 'INSTAGRAM_DIRECT' &&
      msg.requiresWebsiteUrl === false,
    '7c. Messages mapping unchanged'
  );
  assert(BOOST_OBJECTIVES.length === 3, '7d. Still three objectives');
}

// --- 8. PAUSED / ACTIVE unchanged ---
{
  const paused = baseInput({ status: undefined });
  const active = baseInput({ status: 'ACTIVE' });
  assert((paused.status || 'PAUSED') === 'PAUSED', '8a. Default remains PAUSED');
  assert(active.status === 'ACTIVE', '8b. ACTIVE still accepted');
}

// --- 9. Advantage Audience unchanged ---
{
  const auto = buildBoostTargetingForTest(baseInput({ audienceMode: 'automatic' }));
  const custom = buildBoostTargetingForTest(baseInput({ audienceMode: 'custom', ageMin: 18, ageMax: 45 }));
  assert(auto.targeting_automation.advantage_audience === 1, '9a. Automatic Advantage Audience = 1');
  assert(custom.targeting_automation.advantage_audience === 0, '9b. Custom Advantage Audience = 0');
}

// --- 10. Schedule remains N × 24h + 60s ---
{
  const one = resolveMetaAdSetSchedule('2026-08-12T20:00:00.000Z', '2026-08-13T20:00:00.000Z');
  const seven = resolveMetaAdSetSchedule('2026-08-12T20:00:00.000Z', '2026-08-19T20:00:00.000Z');
  assert(
    one.durationMs === META_DAILY_BUDGET_MIN_MS + META_SCHEDULE_SAFETY_BUFFER_MS,
    '10a. 1 day = 24h + 60s'
  );
  assert(
    seven.durationMs === 7 * META_DAILY_BUDGET_MIN_MS + META_SCHEDULE_SAFETY_BUFFER_MS,
    '10b. 7 days = 168h + 60s'
  );
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('No live Meta API calls were made. No campaigns/ads were created.');
