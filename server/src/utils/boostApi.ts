import axios from 'axios';

/** Marketing API version for Boost / Ads operations */
export const MARKETING_API_BASE = 'https://graph.facebook.com/v25.0';

/** Minor units per major currency unit (e.g. cents for USD). */
const CURRENCY_OFFSETS: Record<string, number> = {
  USD: 100,
  EUR: 100,
  GBP: 100,
  CAD: 100,
  AUD: 100,
  INR: 100,
  BRL: 100,
  MXN: 100,
  JPY: 1,
  KRW: 1,
};

export type BoostObjectiveKey = 'profile_visits' | 'website_visits' | 'messages';

export interface BoostObjectiveConfig {
  key: BoostObjectiveKey;
  label: string;
  description: string;
  campaignObjective: 'OUTCOME_TRAFFIC' | 'OUTCOME_ENGAGEMENT';
  optimizationGoal: string;
  destinationType: string;
  billingEvent: 'IMPRESSIONS';
  requiresWebsiteUrl: boolean;
}

/** UI objectives mapped to current Marketing API outcome configs (v25). */
export const BOOST_OBJECTIVES: BoostObjectiveConfig[] = [
  {
    key: 'profile_visits',
    label: 'More Profile Visits',
    description: 'Send people to your Instagram profile',
    campaignObjective: 'OUTCOME_TRAFFIC',
    optimizationGoal: 'PROFILE_VISIT',
    destinationType: 'INSTAGRAM_PROFILE',
    billingEvent: 'IMPRESSIONS',
    requiresWebsiteUrl: false,
  },
  {
    key: 'website_visits',
    label: 'More Website Visits',
    description: 'Drive traffic to a website URL',
    campaignObjective: 'OUTCOME_TRAFFIC',
    optimizationGoal: 'LINK_CLICKS',
    destinationType: 'WEBSITE',
    billingEvent: 'IMPRESSIONS',
    requiresWebsiteUrl: true,
  },
  {
    key: 'messages',
    label: 'More Messages',
    description: 'Start Instagram Direct conversations',
    campaignObjective: 'OUTCOME_ENGAGEMENT',
    optimizationGoal: 'CONVERSATIONS',
    destinationType: 'INSTAGRAM_DIRECT',
    billingEvent: 'IMPRESSIONS',
    requiresWebsiteUrl: false,
  },
];

export function getObjectiveConfig(key: string): BoostObjectiveConfig | undefined {
  return BOOST_OBJECTIVES.find((o) => o.key === key);
}

/** Website URL is only used for website_visits. Never invent facebook.com / instagram.com. */
export function normalizeBoostWebsiteUrl(
  objective: string | undefined,
  websiteUrl: unknown
): string | undefined {
  if (objective !== 'website_visits') return undefined;
  if (typeof websiteUrl !== 'string') return undefined;
  const trimmed = websiteUrl.trim();
  return trimmed.length ? trimmed : undefined;
}

export function isAbsoluteHttpUrl(value: string | undefined): boolean {
  try {
    const u = new URL((value || '').trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Objective-conditional website URL rules. Does not call Meta. */
export function validateBoostWebsiteUrl(input: {
  objective: string;
  websiteUrl?: string;
}): string[] {
  const objective = getObjectiveConfig(input.objective);
  if (!objective) return [];
  if (!objective.requiresWebsiteUrl) return [];
  if (!isAbsoluteHttpUrl(input.websiteUrl)) {
    return ['A valid website URL is required for Website Visits.'];
  }
  return [];
}

export function currencyOffset(currency: string): number {
  return CURRENCY_OFFSETS[currency?.toUpperCase()] ?? 100;
}

export function toMinorUnits(amountMajor: number, currency: string): number {
  return Math.round(amountMajor * currencyOffset(currency));
}

export function fromMinorUnits(amountMinor: number, currency: string): number {
  return amountMinor / currencyOffset(currency);
}

/** Meta requires daily-budget ad sets to run for at least 24 hours. Exact 24h can fail. */
export const META_DAILY_BUDGET_MIN_MS = 24 * 60 * 60 * 1000;
/** Extra second buffer so timezone/rounding cannot shrink the schedule under 24h. */
export const META_SCHEDULE_SAFETY_BUFFER_MS = 60 * 1000;

/**
 * Normalize Boost start/end for Meta Ad Set start_time/end_time.
 * Preserves the user's selected day-count, but guarantees:
 *   end - start >= max(requestedDays, 1) * 24h + 60s
 * Does not call Meta.
 */
export function resolveMetaAdSetSchedule(
  startDate: string,
  endDate: string
): { startTime: string; endTime: string; durationMs: number; durationDays: number } {
  const startRaw = new Date(startDate);
  const endRaw = new Date(endDate);
  if (Number.isNaN(startRaw.getTime()) || Number.isNaN(endRaw.getTime())) {
    throw new Error('Start and end dates must be valid.');
  }

  // Normalize to whole seconds (avoid ms truncation surprises with Meta).
  const startMs = Math.floor(startRaw.getTime() / 1000) * 1000;
  let endMs = Math.floor(endRaw.getTime() / 1000) * 1000;

  if (endMs <= startMs) {
    throw new Error('End date must be after start date.');
  }

  const requestedMs = endMs - startMs;
  // Keep the user's intended day count (1, 2, 7, …) based on the requested span.
  const durationDays = Math.max(1, Math.round(requestedMs / META_DAILY_BUDGET_MIN_MS));
  const requiredMs = durationDays * META_DAILY_BUDGET_MIN_MS + META_SCHEDULE_SAFETY_BUFFER_MS;

  if (endMs - startMs < requiredMs) {
    endMs = startMs + requiredMs;
  }

  // Absolute floor for daily-budget ad sets.
  const absoluteMinMs = META_DAILY_BUDGET_MIN_MS + META_SCHEDULE_SAFETY_BUFFER_MS;
  if (endMs - startMs < absoluteMinMs) {
    endMs = startMs + absoluteMinMs;
  }

  return {
    startTime: new Date(startMs).toISOString(),
    endTime: new Date(endMs).toISOString(),
    durationMs: endMs - startMs,
    durationDays,
  };
}

// ── Types ──────────────────────────────────────────────

export interface AdAccountInfo {
  id: string;
  account_id: string;
  name: string;
  account_status: number;
  account_status_label: string;
  currency: string;
  timezone_name: string;
  min_daily_budget?: number;
  eligible: boolean;
}

export interface BoostEligibilityResult {
  mediaId: string;
  eligible: boolean;
  reason: string | null;
  media_type?: string;
  media_product_type?: string;
  raw?: unknown;
}

export interface BoostCreateInput {
  accessToken: string;
  adAccountId: string;
  pageId: string;
  igUserId: string;
  mediaId: string;
  objective: BoostObjectiveKey;
  audienceMode: 'automatic' | 'custom';
  locationCountries: string[];
  ageMin?: number;
  ageMax?: number;
  genders?: number[];
  interestIds?: Array<{ id: string; name?: string }>;
  dailyBudgetMajor: number;
  startDate: string;
  endDate: string;
  websiteUrl?: string;
  /** Always PAUSED unless explicitly requesting ACTIVE */
  status?: 'PAUSED' | 'ACTIVE';
}

export interface BoostPartialIds {
  campaignId?: string;
  adSetId?: string;
  creativeId?: string;
  adId?: string;
}

/** Exact UI copy for Meta App Development Mode creative rejection (subcode 1885183). */
export const APP_DEVELOPMENT_MODE_MESSAGE =
  'Your Meta app is currently in Development Mode. Switch the Meta app to Live/Public mode before creating a real Boost ad.';

/** Clear copy when Meta rejects creation due to missing Ad Account payment method. */
export const AD_ACCOUNT_PAYMENT_REQUIRED_MESSAGE =
  'Meta requires a valid payment method on this Ad Account before this Boost can run.';

export interface BoostRollbackResult {
  attempted: boolean;
  deleted: string[];
  failed: Array<{ id: string; type: string; message: string }>;
}

export interface BoostCreateResult {
  success: boolean;
  campaignId?: string;
  adSetId?: string;
  creativeId?: string;
  adId?: string;
  adAccountId?: string;
  status?: string;
  dailyBudgetMinor?: number;
  dailyBudgetMajor?: number;
  currency?: string;
  startTime?: string;
  endTime?: string;
  campaignUrl?: string | null;
  partial?: BoostPartialIds;
  rollback?: BoostRollbackResult;
  failedStep?: 'campaign' | 'adset' | 'creative' | 'ad' | 'unknown';
  billingUrl?: string | null;
  error?: {
    code: string;
    message: string;
    details?: string;
    metaCode?: number;
    metaSubcode?: number;
  };
}

const ACCOUNT_STATUS_LABELS: Record<number, string> = {
  1: 'ACTIVE',
  2: 'DISABLED',
  3: 'UNSETTLED',
  7: 'PENDING_RISK_REVIEW',
  8: 'PENDING_SETTLEMENT',
  9: 'IN_GRACE_PERIOD',
  100: 'PENDING_CLOSURE',
  101: 'CLOSED',
  201: 'ANY_ACTIVE',
  202: 'ANY_CLOSED',
};

async function marketingGet<T = any>(
  path: string,
  accessToken: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const { data } = await axios.get<T>(`${MARKETING_API_BASE}${path}`, {
    params: { ...params, access_token: accessToken },
  });
  return data;
}

async function marketingPost<T = any>(
  path: string,
  accessToken: string,
  body: Record<string, unknown>
): Promise<T> {
  const form = new URLSearchParams();
  for (const [key, val] of Object.entries(body)) {
    if (val === undefined || val === null) continue;
    form.set(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
  }
  form.set('access_token', accessToken);

  const { data } = await axios.post<T>(`${MARKETING_API_BASE}${path}`, form.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

async function marketingDelete(
  objectId: string,
  accessToken: string
): Promise<{ success: boolean }> {
  const { data } = await axios.delete<{ success: boolean }>(
    `${MARKETING_API_BASE}/${objectId}`,
    { params: { access_token: accessToken } }
  );
  return data;
}

export function isAppDevelopmentModeError(meta: {
  code?: number;
  error_subcode?: number;
  message?: string;
  error_user_msg?: string;
  error_user_title?: string;
}): boolean {
  if (meta.error_subcode === 1885183) return true;
  const blob = `${meta.error_user_msg || ''} ${meta.error_user_title || ''} ${meta.message || ''}`.toLowerCase();
  return blob.includes('development mode') && blob.includes('must be') && blob.includes('public');
}

/** Detect Meta billing / payment-method failures (no card collection in this app). */
export function isPaymentMethodError(meta: {
  code?: number;
  error_subcode?: number;
  message?: string;
  error_user_msg?: string;
  error_user_title?: string;
  type?: string;
}): boolean {
  const blob = `${meta.error_user_msg || ''} ${meta.error_user_title || ''} ${meta.message || ''}`.toLowerCase();
  return (
    blob.includes('payment method') ||
    blob.includes('payment centre') ||
    blob.includes('payment center') ||
    blob.includes('billing and payment') ||
    blob.includes('add a valid payment') ||
    blob.includes('update payment method') ||
    blob.includes('no valid payment') ||
    blob.includes('billing information') ||
    (blob.includes('billing') && blob.includes('payment'))
  );
}

/** Real Ads Manager billing URL from the selected ad account ID (no hardcoded account). */
export function buildAdsBillingUrl(adAccountId: string): string {
  const act = String(adAccountId || '').replace(/^act_/, '');
  return `https://www.facebook.com/adsmanager/billing?act=${encodeURIComponent(act)}`;
}

/**
 * Best-effort cleanup when Campaign/Ad Set (and optional Creative/Ad) were created
 * but a later step failed. Does NOT retry Create Boost.
 */
export async function rollbackPartialBoost(
  partial: BoostPartialIds,
  accessToken: string
): Promise<BoostRollbackResult> {
  const deleted: string[] = [];
  const failed: Array<{ id: string; type: string; message: string }> = [];

  const steps: Array<{ id?: string; type: string }> = [
    { id: partial.adId, type: 'ad' },
    { id: partial.creativeId, type: 'creative' },
    { id: partial.adSetId, type: 'adset' },
    { id: partial.campaignId, type: 'campaign' },
  ];

  for (const step of steps) {
    if (!step.id) continue;
    try {
      await marketingDelete(step.id, accessToken);
      deleted.push(`${step.type}:${step.id}`);
      console.warn(`[Boost] Rolled back ${step.type} ${step.id}`);
    } catch (err) {
      const parsed = parseBoostMetaError(err);
      failed.push({ id: step.id, type: step.type, message: parsed.message });
      console.error(`[Boost] Rollback failed for ${step.type} ${step.id}:`, parsed.message);
    }
  }

  return { attempted: true, deleted, failed };
}

export function parseBoostMetaError(error: unknown): {
  status: number;
  code: string;
  message: string;
  details?: string;
  metaCode?: number;
  metaSubcode?: number;
} {
  if (axios.isAxiosError(error)) {
    const meta = error.response?.data?.error;
    if (meta) {
      const { code, error_subcode, message, type, error_user_title, error_user_msg } = meta;
      const human = error_user_msg || error_user_title || message || 'Meta Marketing API error';

      // Meta subcode 1885183 — app must be Live/Public to create ads from creatives
      if (isAppDevelopmentModeError(meta)) {
        return {
          status: 403,
          code: 'APP_IN_DEVELOPMENT_MODE',
          message: APP_DEVELOPMENT_MODE_MESSAGE,
          details: human,
          metaCode: code,
          metaSubcode: error_subcode ?? 1885183,
        };
      }

      // Missing / invalid payment method on the Meta Ad Account (billing is Meta-side only)
      if (isPaymentMethodError(meta)) {
        return {
          status: 402,
          code: 'AD_ACCOUNT_PAYMENT_REQUIRED',
          message: AD_ACCOUNT_PAYMENT_REQUIRED_MESSAGE,
          details: human,
          metaCode: code,
          metaSubcode: error_subcode,
        };
      }

      if (code === 190) {
        return {
          status: 401,
          code: error_subcode === 463 ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
          message:
            error_subcode === 463
              ? 'Your access token has expired. Generate a new token with ads permissions.'
              : 'Invalid access token. Check that ads_management is granted.',
          details: message,
          metaCode: code,
          metaSubcode: error_subcode,
        };
      }
      if (code === 10 || code === 200) {
        return {
          status: 403,
          code: 'MISSING_PERMISSION',
          message:
            'Missing required Ads permissions. Ensure ads_management, ads_read, and page/Instagram access are granted.',
          details: message,
          metaCode: code,
          metaSubcode: error_subcode,
        };
      }
      if (code === 4 || code === 17 || code === 32 || code === 613) {
        return {
          status: 429,
          code: 'RATE_LIMIT',
          message: 'Meta API rate limit reached. Wait a moment and try again.',
          details: message,
          metaCode: code,
          metaSubcode: error_subcode,
        };
      }
      if (type === 'OAuthException') {
        return {
          status: 401,
          code: 'OAUTH_EXCEPTION',
          message: human,
          details: message,
          metaCode: code,
          metaSubcode: error_subcode,
        };
      }

      return {
        status: error.response?.status || 400,
        code: 'META_ADS_ERROR',
        message: human,
        details: `Meta error code: ${code}${error_subcode ? ` / subcode ${error_subcode}` : ''}`,
        metaCode: code,
        metaSubcode: error_subcode,
      };
    }

    if (!error.response) {
      return {
        status: 503,
        code: 'NETWORK_ERROR',
        message: 'Unable to reach Meta Marketing API. Check your network connection.',
      };
    }
  }

  if (error instanceof Error) {
    return { status: 500, code: 'INTERNAL_ERROR', message: error.message };
  }

  return { status: 500, code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred.' };
}

export async function fetchAdAccounts(accessToken: string): Promise<AdAccountInfo[]> {
  const data = await marketingGet<{ data: any[] }>('/me/adaccounts', accessToken, {
    fields: 'id,account_id,name,account_status,currency,timezone_name,min_daily_budget',
    limit: 50,
  });

  const accounts = data.data || [];
  // Empty list is valid — not an API failure
  return accounts.map((acc) => {
    const status = Number(acc.account_status);
    return {
      id: acc.id,
      account_id: acc.account_id || String(acc.id).replace(/^act_/, ''),
      name: acc.name,
      account_status: status,
      account_status_label: ACCOUNT_STATUS_LABELS[status] || `STATUS_${status}`,
      currency: acc.currency || 'USD',
      timezone_name: acc.timezone_name || 'Unknown',
      min_daily_budget:
        typeof acc.min_daily_budget === 'number' ? acc.min_daily_budget : undefined,
      eligible: status === 1,
    };
  });
}

export async function fetchAdAccountMinimumBudget(
  adAccountId: string,
  accessToken: string
): Promise<{ currency: string; minDailyBudgetMinor: number | null; source: string }> {
  const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

  try {
    const account = await marketingGet<{ currency?: string; min_daily_budget?: number }>(
      `/${actId}`,
      accessToken,
      { fields: 'currency,min_daily_budget' }
    );

    if (typeof account.min_daily_budget === 'number' && account.min_daily_budget > 0) {
      return {
        currency: account.currency || 'USD',
        minDailyBudgetMinor: account.min_daily_budget,
        source: 'ad_account.min_daily_budget',
      };
    }
  } catch {
    // fall through to minimum_budgets edge
  }

  try {
    const mins = await marketingGet<{ data: any[] }>(`/${actId}/minimum_budgets`, accessToken);
    const row = mins.data?.[0];
    if (row) {
      const currency = row.currency || 'USD';
      // Prefer impressions min for our billing_event=IMPRESSIONS setups
      const minor =
        row.min_daily_budget_imp ??
        row.min_daily_budget_high_freq ??
        row.min_daily_budget_low_freq ??
        null;
      return {
        currency,
        minDailyBudgetMinor: typeof minor === 'number' ? minor : null,
        source: 'ad_account.minimum_budgets',
      };
    }
  } catch {
    // no invented minimum
  }

  return { currency: 'USD', minDailyBudgetMinor: null, source: 'unavailable' };
}

export async function checkBoostEligibility(
  mediaId: string,
  accessToken: string
): Promise<BoostEligibilityResult> {
  const data = await marketingGet<any>(`/${mediaId}`, accessToken, {
    fields: 'id,media_type,media_product_type,boost_eligibility_info',
  });

  const info = data.boost_eligibility_info;
  const eligible = Boolean(info?.eligible_to_boost === true);

  let reason: string | null = null;
  if (!eligible) {
    reason =
      info?.boost_ineligible_reason ||
      info?.reason ||
      (info
        ? 'Post is not eligible for promotion.'
        : 'Boost eligibility information was not returned by Meta for this media.');
  }

  return {
    mediaId: data.id || mediaId,
    eligible,
    reason,
    media_type: data.media_type,
    media_product_type: data.media_product_type,
    raw: info ?? null,
  };
}

export async function searchAdInterests(
  query: string,
  accessToken: string
): Promise<Array<{ id: string; name: string; audience_size?: number }>> {
  if (!query.trim()) return [];
  const data = await marketingGet<{ data: any[] }>('/search', accessToken, {
    type: 'adinterest',
    q: query.trim(),
    limit: 12,
  });
  return (data.data || []).map((item) => ({
    id: String(item.id),
    name: item.name,
    audience_size: item.audience_size,
  }));
}

export async function searchAdLocations(
  query: string,
  accessToken: string
): Promise<Array<{ key: string; name: string; type: string; country_code?: string }>> {
  if (!query.trim()) return [];
  const data = await marketingGet<{ data: any[] }>('/search', accessToken, {
    type: 'adgeolocation',
    q: query.trim(),
    location_types: JSON.stringify(['country', 'region', 'city']),
    limit: 12,
  });
  return (data.data || []).map((item) => ({
    key: String(item.key),
    name: item.name,
    type: item.type,
    country_code: item.country_code,
  }));
}

function buildTargeting(input: BoostCreateInput): Record<string, unknown> {
  const countries = input.locationCountries.map((c) => c.toUpperCase());
  if (countries.length === 0) {
    throw new Error('At least one location country is required for targeting.');
  }

  // Meta Marketing API v25 requires targeting_automation.advantage_audience (0 or 1).
  const advantageAudience = input.audienceMode === 'automatic' ? 1 : 0;

  const targeting: Record<string, unknown> = {
    geo_locations: { countries },
    publisher_platforms: ['instagram'],
    instagram_positions: ['stream', 'story', 'reels', 'explore'],
    targeting_automation: {
      advantage_audience: advantageAudience,
    },
  };

  if (input.audienceMode === 'automatic') {
    return targeting;
  }

  // Custom audience: Advantage Audience off (0); apply explicit demographics/interests.
  if (input.ageMin !== undefined) targeting.age_min = input.ageMin;
  if (input.ageMax !== undefined) targeting.age_max = input.ageMax;
  if (input.genders && input.genders.length > 0) targeting.genders = input.genders;

  if (input.interestIds && input.interestIds.length > 0) {
    targeting.flexible_spec = [
      {
        interests: input.interestIds.map((i) => ({
          id: i.id,
          ...(i.name ? { name: i.name } : {}),
        })),
      },
    ];
  }

  return targeting;
}

/** Exported for local payload verification only — does not call Meta. */
export function buildBoostTargetingForTest(input: BoostCreateInput): Record<string, unknown> {
  return buildTargeting(input);
}

/** Ad Set destination + promoted_object. Does not call Meta. */
export function buildBoostPromotedObject(
  input: Pick<BoostCreateInput, 'pageId' | 'igUserId'>,
  objective: BoostObjectiveConfig
): Record<string, string> {
  const promoted: Record<string, string> = { page_id: input.pageId };
  if (
    objective.destinationType === 'INSTAGRAM_PROFILE' ||
    objective.destinationType === 'INSTAGRAM_DIRECT'
  ) {
    if (input.igUserId) promoted.instagram_user_id = input.igUserId;
  }
  return promoted;
}

function buildCreativePayload(input: BoostCreateInput, objective: BoostObjectiveConfig) {
  const websiteUrl = normalizeBoostWebsiteUrl(objective.key, input.websiteUrl);
  const creative: Record<string, unknown> = {
    name: `IG Boost Creative ${input.mediaId} ${Date.now()}`,
    object_id: input.pageId,
    instagram_user_id: input.igUserId,
    source_instagram_media_id: input.mediaId,
  };

  if (objective.key === 'website_visits') {
    if (!websiteUrl || !isAbsoluteHttpUrl(websiteUrl)) {
      throw new Error('A website URL is required for the Website Visits objective.');
    }
    creative.call_to_action = {
      type: 'LEARN_MORE',
      value: { link: websiteUrl },
    };
  }

  if (objective.key === 'messages') {
    creative.call_to_action = {
      type: 'MESSAGE_PAGE',
      value: { app_destination: 'INSTAGRAM_DIRECT' },
    };
  }

  return creative;
}

/** Exported for local payload verification only — does not call Meta. */
export function buildBoostCreativePayloadForTest(
  input: BoostCreateInput,
  objective: BoostObjectiveConfig
): Record<string, unknown> {
  return buildCreativePayload(input, objective);
}

export function validateBoostInput(input: BoostCreateInput, currency: string, minDailyMinor: number | null): string[] {
  const errors: string[] = [];
  const objective = getObjectiveConfig(input.objective);
  if (!objective) errors.push('Unsupported boost objective.');

  if (!input.adAccountId) errors.push('Ad account is required.');
  if (!input.pageId) errors.push('Facebook Page ID is required.');
  if (!input.igUserId) errors.push('Instagram user ID is required.');
  if (!input.mediaId) errors.push('Instagram media ID is required.');

  if (!input.locationCountries?.length) {
    errors.push('At least one location (country) is required.');
  }

  if (!(input.dailyBudgetMajor > 0)) {
    errors.push('Daily budget must be a positive amount.');
  }

  const dailyMinor = toMinorUnits(input.dailyBudgetMajor, currency);
  if (minDailyMinor !== null && dailyMinor < minDailyMinor) {
    errors.push(
      `Daily budget is below Meta's minimum for this ad account (${fromMinorUnits(minDailyMinor, currency)} ${currency}).`
    );
  }

  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    errors.push('Start and end dates must be valid.');
  } else {
    if (end <= start) errors.push('End date must be after start date.');
    // Raw UI span may be exactly 24h; Meta requires a safe floor — createBoost adds buffer.
    // Reject only clearly too-short schedules (< 24h).
    const durationMs = end.getTime() - start.getTime();
    if (durationMs < META_DAILY_BUDGET_MIN_MS) {
      errors.push('Duration must be at least 24 hours for a daily budget ad set.');
    }
  }

  if (input.audienceMode === 'custom') {
    if (input.ageMin !== undefined && (input.ageMin < 13 || input.ageMin > 65)) {
      errors.push('Minimum age must be between 13 and 65.');
    }
    if (input.ageMax !== undefined && (input.ageMax < 13 || input.ageMax > 65)) {
      errors.push('Maximum age must be between 13 and 65.');
    }
    if (
      input.ageMin !== undefined &&
      input.ageMax !== undefined &&
      input.ageMin > input.ageMax
    ) {
      errors.push('Minimum age cannot exceed maximum age.');
    }
    if (input.genders) {
      for (const g of input.genders) {
        if (g !== 1 && g !== 2) errors.push('Gender values must be 1 (male) or 2 (female).');
      }
    }
  }

  if (objective?.requiresWebsiteUrl) {
    errors.push(...validateBoostWebsiteUrl(input));
  }

  return errors;
}

export async function createBoost(input: BoostCreateInput): Promise<BoostCreateResult> {
  const objective = getObjectiveConfig(input.objective);
  if (!objective) {
    return {
      success: false,
      error: { code: 'INVALID_OBJECTIVE', message: 'Unsupported boost objective.' },
    };
  }

  input = {
    ...input,
    websiteUrl: normalizeBoostWebsiteUrl(input.objective, input.websiteUrl),
  };
  const websiteErrors = validateBoostWebsiteUrl(input);
  if (websiteErrors.length) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: websiteErrors[0] },
    };
  }

  const actId = input.adAccountId.startsWith('act_')
    ? input.adAccountId
    : `act_${input.adAccountId}`;

  const account = await marketingGet<{ currency?: string; account_status?: number; name?: string }>(
    `/${actId}`,
    input.accessToken,
    { fields: 'currency,account_status,name,min_daily_budget' }
  );

  if (Number(account.account_status) !== 1) {
    return {
      success: false,
      error: {
        code: 'AD_ACCOUNT_NOT_ELIGIBLE',
        message: 'Ad account is not eligible (not ACTIVE).',
        details: `account_status=${account.account_status}`,
      },
    };
  }

  const currency = account.currency || 'USD';
  const minInfo = await fetchAdAccountMinimumBudget(actId, input.accessToken);
  const validationErrors = validateBoostInput(input, currency, minInfo.minDailyBudgetMinor);
  if (validationErrors.length) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: validationErrors[0],
        details: validationErrors.join(' | '),
      },
    };
  }

  const eligibility = await checkBoostEligibility(input.mediaId, input.accessToken);
  if (!eligibility.eligible) {
    return {
      success: false,
      error: {
        code: 'MEDIA_NOT_ELIGIBLE',
        message: eligibility.reason || 'Post is not eligible for promotion.',
      },
    };
  }

  const dailyBudgetMinor = toMinorUnits(input.dailyBudgetMajor, currency);
  const status = input.status || 'PAUSED';
  const schedule = resolveMetaAdSetSchedule(input.startDate, input.endDate);
  const startTime = schedule.startTime;
  const endTime = schedule.endTime;
  const partial: BoostPartialIds = {};
  let failedStep: BoostCreateResult['failedStep'] = 'unknown';

  try {
    // 1) Campaign
    failedStep = 'campaign';
    const campaign = await marketingPost<{ id: string }>(`/${actId}/campaigns`, input.accessToken, {
      name: `IG Boost — ${objective.label} — ${new Date().toISOString().slice(0, 10)}`,
      objective: objective.campaignObjective,
      status,
      special_ad_categories: [],
      is_adset_budget_sharing_enabled: 0,
    });
    partial.campaignId = campaign.id;

    // 2) Ad Set
    failedStep = 'adset';
    const targeting = buildTargeting(input);
    const adSetBody: Record<string, unknown> = {
      name: `IG Boost Ad Set — ${input.mediaId}`,
      campaign_id: campaign.id,
      daily_budget: dailyBudgetMinor,
      billing_event: objective.billingEvent,
      optimization_goal: objective.optimizationGoal,
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      destination_type: objective.destinationType,
      promoted_object: buildBoostPromotedObject(input, objective),
      targeting,
      start_time: startTime,
      end_time: endTime,
      status,
    };

    const adSet = await marketingPost<{ id: string }>(`/${actId}/adsets`, input.accessToken, adSetBody);
    partial.adSetId = adSet.id;

    // 3) Creative — THIS is the call that rejects Development Mode apps (Meta subcode 1885183)
    // POST /act_{AD_ACCOUNT_ID}/adcreatives with source_instagram_media_id
    failedStep = 'creative';
    const creativePayload = buildCreativePayload(input, objective);
    const creative = await marketingPost<{ id: string }>(
      `/${actId}/adcreatives`,
      input.accessToken,
      creativePayload
    );
    partial.creativeId = creative.id;

    // 4) Ad
    failedStep = 'ad';
    const ad = await marketingPost<{ id: string }>(`/${actId}/ads`, input.accessToken, {
      name: `IG Boost Ad — ${input.mediaId}`,
      adset_id: adSet.id,
      creative: { creative_id: creative.id },
      status,
    });
    partial.adId = ad.id;

    // Ads Manager deep link is derived from known Meta URL patterns using real IDs only
    const campaignUrl = `https://www.facebook.com/adsmanager/manage/campaigns?act=${actId.replace(/^act_/, '')}&selected_campaign_ids=${campaign.id}`;

    return {
      success: true,
      campaignId: campaign.id,
      adSetId: adSet.id,
      creativeId: creative.id,
      adId: ad.id,
      adAccountId: actId,
      status,
      dailyBudgetMinor,
      dailyBudgetMajor: input.dailyBudgetMajor,
      currency,
      startTime,
      endTime,
      campaignUrl,
    };
  } catch (error) {
    const parsed = parseBoostMetaError(error);
    console.error('[Boost] Creation failed', {
      failedStep,
      partial,
      code: parsed.code,
      metaCode: parsed.metaCode,
      metaSubcode: parsed.metaSubcode,
      message: parsed.message,
      details: parsed.details,
    });

    // Never claim success. Roll back partial objects so retries do not stack duplicates.
    let rollback: BoostRollbackResult | undefined;
    if (partial.campaignId || partial.adSetId || partial.creativeId || partial.adId) {
      rollback = await rollbackPartialBoost(partial, input.accessToken);
    }

    return {
      success: false,
      failedStep,
      partial: Object.keys(partial).length ? partial : undefined,
      rollback,
      adAccountId: actId,
      billingUrl:
        parsed.code === 'AD_ACCOUNT_PAYMENT_REQUIRED' ? buildAdsBillingUrl(actId) : undefined,
      error: {
        code: parsed.code,
        message: parsed.message,
        details: parsed.details,
        metaCode: parsed.metaCode,
        metaSubcode: parsed.metaSubcode,
      },
    };
  }
}
