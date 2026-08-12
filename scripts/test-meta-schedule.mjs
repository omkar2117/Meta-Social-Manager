/**
 * Local Meta daily-budget schedule tests.
 * Does NOT call Meta or create campaigns/ads.
 *
 * Run: node scripts/test-meta-schedule.mjs
 * (Requires server build so boostApi.js exists, or uses inline mirror below.)
 */

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const BUFFER = 60 * 1000;

let resolveMetaAdSetSchedule;
let META_DAILY_BUDGET_MIN_MS;
let META_SCHEDULE_SAFETY_BUFFER_MS;

try {
  const mod = require(path.join(__dirname, '../server/dist/utils/boostApi.js'));
  resolveMetaAdSetSchedule = mod.resolveMetaAdSetSchedule;
  META_DAILY_BUDGET_MIN_MS = mod.META_DAILY_BUDGET_MIN_MS;
  META_SCHEDULE_SAFETY_BUFFER_MS = mod.META_SCHEDULE_SAFETY_BUFFER_MS;
} catch {
  console.error('Could not load server/dist/utils/boostApi.js — run: cd server && npm run build');
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

function spanHours(startIso, endIso) {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / HOUR;
}

console.log('Meta Ad Set schedule tests (local only — no Meta API calls)\n');

// --- 1 day → >= 24h (+ buffer) ---
{
  const start = '2026-08-12T20:00:00.000+05:30';
  const endExact = '2026-08-13T20:00:00.000+05:30'; // exact 24h (UI 1-day case that Meta rejected)
  const s = resolveMetaAdSetSchedule(start, endExact);
  const hours = spanHours(s.startTime, s.endTime);
  assert(hours >= 24, `1 day: schedule >= 24h (got ${hours}h)`);
  assert(s.durationMs >= DAY + BUFFER, `1 day: durationMs >= 24h+60s (got ${s.durationMs}ms)`);
  assert(s.durationDays === 1, `1 day: durationDays === 1 (got ${s.durationDays})`);
  assert(hours >= 24 + BUFFER / HOUR - 1e-9, `1 day: includes safety buffer (got ${hours}h)`);
}

// --- 2 days → >= 48h ---
{
  const start = '2026-08-12T20:00:00.000Z';
  const end = '2026-08-14T20:00:00.000Z';
  const s = resolveMetaAdSetSchedule(start, end);
  const hours = spanHours(s.startTime, s.endTime);
  assert(hours >= 48, `2 days: schedule >= 48h (got ${hours}h)`);
  assert(s.durationMs >= 2 * DAY + BUFFER, `2 days: durationMs >= 48h+60s`);
  assert(s.durationDays === 2, `2 days: durationDays === 2`);
}

// --- 7 days → >= 168h ---
{
  const start = '2026-08-12T20:00:00.000Z';
  const end = '2026-08-19T20:00:00.000Z';
  const s = resolveMetaAdSetSchedule(start, end);
  const hours = spanHours(s.startTime, s.endTime);
  assert(hours >= 168, `7 days: schedule >= 168h (got ${hours}h)`);
  assert(s.durationMs >= 7 * DAY + BUFFER, `7 days: durationMs >= 168h+60s`);
  assert(s.durationDays === 7, `7 days: durationDays === 7`);
  // Do not inflate to a different campaign length (e.g. not ~8 days)
  assert(hours < 168 + 2, `7 days: stays ~7 days (got ${hours}h)`);
}

// --- No negative/zero duration ---
{
  let threw = false;
  try {
    resolveMetaAdSetSchedule('2026-08-13T20:00:00.000Z', '2026-08-12T20:00:00.000Z');
  } catch {
    threw = true;
  }
  assert(threw, 'end before start throws');

  threw = false;
  try {
    resolveMetaAdSetSchedule('2026-08-12T20:00:00.000Z', '2026-08-12T20:00:00.000Z');
  } catch {
    threw = true;
  }
  assert(threw, 'zero duration throws');
}

// --- Timezone conversion must not shrink below requested duration ---
{
  // Same instant pair expressed in different offsets / local-style strings
  const cases = [
    ['2026-08-12T14:30:00.000Z', '2026-08-13T14:30:00.000Z'],
    ['2026-08-12T20:00:00.000+05:30', '2026-08-13T20:00:00.000+05:30'],
    ['2026-08-12T10:00:00.000-04:00', '2026-08-13T10:00:00.000-04:00'],
  ];
  for (const [a, b] of cases) {
    const s = resolveMetaAdSetSchedule(a, b);
    assert(
      s.durationMs >= DAY + BUFFER,
      `timezone pair ${a} → ${b}: duration >= 24h+60s (got ${s.durationMs}ms)`
    );
  }

  // datetime-local style (no Z): parsed as local; ensure ISO span still >= 24h+buffer
  const localStart = '2026-08-12T20:00';
  const localEnd = '2026-08-13T20:00';
  const sLocal = resolveMetaAdSetSchedule(localStart, localEnd);
  assert(
    sLocal.durationMs >= DAY + BUFFER,
    `datetime-local 1 day: Meta schedule >= 24h+60s (got ${sLocal.durationMs}ms)`
  );
  assert(
    new Date(sLocal.endTime).getTime() - new Date(sLocal.startTime).getTime() >= DAY,
    'timezone conversion does not reduce below requested 1-day duration'
  );
}

// --- Constants sanity ---
assert(META_DAILY_BUDGET_MIN_MS === DAY, 'META_DAILY_BUDGET_MIN_MS === 24h');
assert(META_SCHEDULE_SAFETY_BUFFER_MS === BUFFER, 'META_SCHEDULE_SAFETY_BUFFER_MS === 60s');

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('No Meta API calls were made.');
