/** Cloudflare Pages Functions — Meta Marketing API v25 Boost helpers (fetch-based) */

export const MARKETING_API_BASE = 'https://graph.facebook.com/v25.0';

const CURRENCY_OFFSETS: Record<string, number> = {
  USD: 100, EUR: 100, GBP: 100, CAD: 100, AUD: 100, INR: 100, BRL: 100, MXN: 100, JPY: 1, KRW: 1,
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

export function getObjectiveConfig(key: string) {
  return BOOST_OBJECTIVES.find((o) => o.key === key);
}

export function currencyOffset(currency: string) {
  return CURRENCY_OFFSETS[currency?.toUpperCase()] ?? 100;
}

export function toMinorUnits(amountMajor: number, currency: string) {
  return Math.round(amountMajor * currencyOffset(currency));
}

export function fromMinorUnits(amountMinor: number, currency: string) {
  return amountMinor / currencyOffset(currency);
}

const ACCOUNT_STATUS_LABELS: Record<number, string> = {
  1: 'ACTIVE', 2: 'DISABLED', 3: 'UNSETTLED', 7: 'PENDING_RISK_REVIEW',
  8: 'PENDING_SETTLEMENT', 9: 'IN_GRACE_PERIOD', 100: 'PENDING_CLOSURE', 101: 'CLOSED',
};

async function marketingGet(path: string, accessToken: string, params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) query.set(k, String(v));
  }
  query.set('access_token', accessToken);
  const res = await fetch(`${MARKETING_API_BASE}${path}?${query.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data?.error?.message || 'Meta Marketing API error');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function marketingPost(path: string, accessToken: string, body: Record<string, unknown>) {
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || v === null) continue;
    form.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  form.set('access_token', accessToken);
  const res = await fetch(`${MARKETING_API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data?.error?.message || 'Meta Marketing API error');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function marketingDelete(objectId: string, accessToken: string) {
  const res = await fetch(`${MARKETING_API_BASE}/${objectId}?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'DELETE',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data?.error?.message || 'Meta Marketing API delete error');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Exact UI copy for Meta App Development Mode creative rejection (subcode 1885183). */
export const APP_DEVELOPMENT_MODE_MESSAGE =
  'Your Meta app is currently in Development Mode. Switch the Meta app to Live/Public mode before creating a real Boost ad.';

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

export async function rollbackPartialBoost(
  partial: Record<string, string | undefined>,
  accessToken: string
) {
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
    } catch (err: any) {
      const parsed = parseBoostMetaError(err);
      failed.push({ id: step.id, type: step.type, message: parsed.message });
      console.error(`[Boost] Rollback failed for ${step.type} ${step.id}:`, parsed.message);
    }
  }
  return { attempted: true, deleted, failed };
}

export function parseBoostMetaError(error: any) {
  if (error?.data?.error) {
    const { code, error_subcode, message, type, error_user_title, error_user_msg } = error.data.error;
    const human = error_user_msg || error_user_title || message || 'Meta Marketing API error';

    if (isAppDevelopmentModeError(error.data.error)) {
      return {
        status: 403,
        code: 'APP_IN_DEVELOPMENT_MODE',
        message: APP_DEVELOPMENT_MODE_MESSAGE,
        details: human,
        metaCode: code,
        metaSubcode: error_subcode ?? 1885183,
      };
    }

    if (code === 190) {
      return {
        status: 401,
        code: error_subcode === 463 ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        message: error_subcode === 463
          ? 'Your access token has expired. Generate a new token with ads permissions.'
          : 'Invalid access token. Check that ads_management is granted.',
        details: message, metaCode: code, metaSubcode: error_subcode,
      };
    }
    if (code === 10 || code === 200) {
      return {
        status: 403, code: 'MISSING_PERMISSION',
        message: 'Missing required Ads permissions. Ensure ads_management, ads_read, and page/Instagram access are granted.',
        details: message, metaCode: code, metaSubcode: error_subcode,
      };
    }
    if (code === 4 || code === 17 || code === 32 || code === 613) {
      return {
        status: 429, code: 'RATE_LIMIT',
        message: 'Meta API rate limit reached. Wait a moment and try again.',
        details: message, metaCode: code, metaSubcode: error_subcode,
      };
    }
    if (type === 'OAuthException') {
      return { status: 401, code: 'OAUTH_EXCEPTION', message: human, details: message, metaCode: code, metaSubcode: error_subcode };
    }
    return {
      status: error.status || 400, code: 'META_ADS_ERROR', message: human,
      details: `Meta error code: ${code}${error_subcode ? ` / subcode ${error_subcode}` : ''}`,
      metaCode: code, metaSubcode: error_subcode,
    };
  }
  return {
    status: error?.status || 500,
    code: 'API_ERROR',
    message: error?.message || 'An unexpected error occurred.',
  };
}

export async function fetchAdAccounts(accessToken: string) {
  const data = await marketingGet('/me/adaccounts', accessToken, {
    fields: 'id,account_id,name,account_status,currency,timezone_name,min_daily_budget',
    limit: 50,
  });
  return (data.data || []).map((acc: any) => {
    const status = Number(acc.account_status);
    return {
      id: acc.id,
      account_id: acc.account_id || String(acc.id).replace(/^act_/, ''),
      name: acc.name,
      account_status: status,
      account_status_label: ACCOUNT_STATUS_LABELS[status] || `STATUS_${status}`,
      currency: acc.currency || 'USD',
      timezone_name: acc.timezone_name || 'Unknown',
      min_daily_budget: typeof acc.min_daily_budget === 'number' ? acc.min_daily_budget : undefined,
      eligible: status === 1,
    };
  });
}

export async function fetchAdAccountMinimumBudget(adAccountId: string, accessToken: string) {
  const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  try {
    const account = await marketingGet(`/${actId}`, accessToken, { fields: 'currency,min_daily_budget' });
    if (typeof account.min_daily_budget === 'number' && account.min_daily_budget > 0) {
      return { currency: account.currency || 'USD', minDailyBudgetMinor: account.min_daily_budget, source: 'ad_account.min_daily_budget' };
    }
  } catch { /* fallthrough */ }
  try {
    const mins = await marketingGet(`/${actId}/minimum_budgets`, accessToken);
    const row = mins.data?.[0];
    if (row) {
      const minor = row.min_daily_budget_imp ?? row.min_daily_budget_high_freq ?? row.min_daily_budget_low_freq ?? null;
      return { currency: row.currency || 'USD', minDailyBudgetMinor: typeof minor === 'number' ? minor : null, source: 'ad_account.minimum_budgets' };
    }
  } catch { /* fallthrough */ }
  return { currency: 'USD', minDailyBudgetMinor: null, source: 'unavailable' };
}

export async function checkBoostEligibility(mediaId: string, accessToken: string) {
  const data = await marketingGet(`/${mediaId}`, accessToken, {
    fields: 'id,media_type,media_product_type,boost_eligibility_info',
  });
  const info = data.boost_eligibility_info;
  const eligible = Boolean(info?.eligible_to_boost === true);
  let reason: string | null = null;
  if (!eligible) {
    reason = info?.boost_ineligible_reason || info?.reason ||
      (info ? 'Post is not eligible for promotion.' : 'Boost eligibility information was not returned by Meta for this media.');
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

export async function searchAdInterests(query: string, accessToken: string) {
  if (!query.trim()) return [];
  const data = await marketingGet('/search', accessToken, { type: 'adinterest', q: query.trim(), limit: 12 });
  return (data.data || []).map((item: any) => ({ id: String(item.id), name: item.name, audience_size: item.audience_size }));
}

export async function searchAdLocations(query: string, accessToken: string) {
  if (!query.trim()) return [];
  const data = await marketingGet('/search', accessToken, {
    type: 'adgeolocation', q: query.trim(), location_types: JSON.stringify(['country', 'region', 'city']), limit: 12,
  });
  return (data.data || []).map((item: any) => ({
    key: String(item.key), name: item.name, type: item.type, country_code: item.country_code,
  }));
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
  status?: 'PAUSED' | 'ACTIVE';
}

function buildTargeting(input: BoostCreateInput) {
  const countries = input.locationCountries.map((c) => c.toUpperCase());
  if (!countries.length) throw new Error('At least one location country is required for targeting.');
  const targeting: Record<string, unknown> = {
    geo_locations: { countries },
    publisher_platforms: ['instagram'],
    instagram_positions: ['stream', 'story', 'reels', 'explore'],
  };
  if (input.audienceMode === 'automatic') {
    targeting.targeting_automation = { advantage_audience: 1 };
    return targeting;
  }
  if (input.ageMin !== undefined) targeting.age_min = input.ageMin;
  if (input.ageMax !== undefined) targeting.age_max = input.ageMax;
  if (input.genders?.length) targeting.genders = input.genders;
  if (input.interestIds?.length) {
    targeting.flexible_spec = [{ interests: input.interestIds.map((i) => ({ id: i.id, ...(i.name ? { name: i.name } : {}) })) }];
  }
  return targeting;
}

function buildCreativePayload(input: BoostCreateInput, objective: BoostObjectiveConfig) {
  const creative: Record<string, unknown> = {
    name: `IG Boost Creative ${input.mediaId} ${Date.now()}`,
    object_id: input.pageId,
    instagram_user_id: input.igUserId,
    source_instagram_media_id: input.mediaId,
  };
  if (objective.key === 'website_visits') {
    if (!input.websiteUrl) throw new Error('A website URL is required for the Website Visits objective.');
    creative.call_to_action = { type: 'LEARN_MORE', value: { link: input.websiteUrl } };
  }
  if (objective.key === 'messages') {
    creative.call_to_action = { type: 'MESSAGE_PAGE', value: { app_destination: 'INSTAGRAM_DIRECT' } };
  }
  return creative;
}

export function validateBoostInput(input: BoostCreateInput, currency: string, minDailyMinor: number | null): string[] {
  const errors: string[] = [];
  const objective = getObjectiveConfig(input.objective);
  if (!objective) errors.push('Unsupported boost objective.');
  if (!input.adAccountId) errors.push('Ad account is required.');
  if (!input.pageId) errors.push('Facebook Page ID is required.');
  if (!input.igUserId) errors.push('Instagram user ID is required.');
  if (!input.mediaId) errors.push('Instagram media ID is required.');
  if (!input.locationCountries?.length) errors.push('At least one location (country) is required.');
  if (!(input.dailyBudgetMajor > 0)) errors.push('Daily budget must be a positive amount.');
  const dailyMinor = toMinorUnits(input.dailyBudgetMajor, currency);
  if (minDailyMinor !== null && dailyMinor < minDailyMinor) {
    errors.push(`Daily budget is below Meta's minimum for this ad account (${fromMinorUnits(minDailyMinor, currency)} ${currency}).`);
  }
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    errors.push('Start and end dates must be valid.');
  } else {
    if (end <= start) errors.push('End date must be after start date.');
    if (end.getTime() - start.getTime() < 24 * 60 * 60 * 1000) {
      errors.push('Duration must be at least 24 hours for a daily budget ad set.');
    }
  }
  if (input.audienceMode === 'custom') {
    if (input.ageMin !== undefined && (input.ageMin < 13 || input.ageMin > 65)) errors.push('Minimum age must be between 13 and 65.');
    if (input.ageMax !== undefined && (input.ageMax < 13 || input.ageMax > 65)) errors.push('Maximum age must be between 13 and 65.');
    if (input.ageMin !== undefined && input.ageMax !== undefined && input.ageMin > input.ageMax) {
      errors.push('Minimum age cannot exceed maximum age.');
    }
  }
  if (objective?.requiresWebsiteUrl) {
    try {
      const u = new URL(input.websiteUrl || '');
      if (!['http:', 'https:'].includes(u.protocol)) errors.push('Website URL must use http or https.');
    } catch {
      errors.push('A valid website URL is required for Website Visits.');
    }
  }
  return errors;
}

export async function createBoost(input: BoostCreateInput) {
  const objective = getObjectiveConfig(input.objective);
  if (!objective) {
    return { success: false, error: { code: 'INVALID_OBJECTIVE', message: 'Unsupported boost objective.' } };
  }
  const actId = input.adAccountId.startsWith('act_') ? input.adAccountId : `act_${input.adAccountId}`;
  const account = await marketingGet(`/${actId}`, input.accessToken, { fields: 'currency,account_status,name,min_daily_budget' });
  if (Number(account.account_status) !== 1) {
    return { success: false, error: { code: 'AD_ACCOUNT_NOT_ELIGIBLE', message: 'Ad account is not eligible (not ACTIVE).', details: `account_status=${account.account_status}` } };
  }
  const currency = account.currency || 'USD';
  const minInfo = await fetchAdAccountMinimumBudget(actId, input.accessToken);
  const validationErrors = validateBoostInput(input, currency, minInfo.minDailyBudgetMinor);
  if (validationErrors.length) {
    return { success: false, error: { code: 'VALIDATION_ERROR', message: validationErrors[0], details: validationErrors.join(' | ') } };
  }
  const eligibility = await checkBoostEligibility(input.mediaId, input.accessToken);
  if (!eligibility.eligible) {
    return { success: false, error: { code: 'MEDIA_NOT_ELIGIBLE', message: eligibility.reason || 'Post is not eligible for promotion.' } };
  }

  const dailyBudgetMinor = toMinorUnits(input.dailyBudgetMajor, currency);
  const status = input.status || 'PAUSED';
  const startTime = new Date(input.startDate).toISOString();
  const endTime = new Date(input.endDate).toISOString();
  const partial: Record<string, string> = {};
  let failedStep: 'campaign' | 'adset' | 'creative' | 'ad' | 'unknown' = 'unknown';

  try {
    failedStep = 'campaign';
    const campaign = await marketingPost(`/${actId}/campaigns`, input.accessToken, {
      name: `IG Boost — ${objective.label} — ${new Date().toISOString().slice(0, 10)}`,
      objective: objective.campaignObjective,
      status,
      special_ad_categories: [],
      is_adset_budget_sharing_enabled: 0,
    });
    partial.campaignId = campaign.id;

    failedStep = 'adset';
    const targeting = buildTargeting(input);
    const adSet = await marketingPost(`/${actId}/adsets`, input.accessToken, {
      name: `IG Boost Ad Set — ${input.mediaId}`,
      campaign_id: campaign.id,
      daily_budget: dailyBudgetMinor,
      billing_event: objective.billingEvent,
      optimization_goal: objective.optimizationGoal,
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      destination_type: objective.destinationType,
      promoted_object: { page_id: input.pageId },
      targeting,
      start_time: startTime,
      end_time: endTime,
      status,
    });
    partial.adSetId = adSet.id;

    // Creative step rejects Development Mode apps (Meta subcode 1885183)
    failedStep = 'creative';
    const creative = await marketingPost(`/${actId}/adcreatives`, input.accessToken, buildCreativePayload(input, objective));
    partial.creativeId = creative.id;

    failedStep = 'ad';
    const ad = await marketingPost(`/${actId}/ads`, input.accessToken, {
      name: `IG Boost Ad — ${input.mediaId}`,
      adset_id: adSet.id,
      creative: { creative_id: creative.id },
      status,
    });
    partial.adId = ad.id;

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
  } catch (error: any) {
    const parsed = parseBoostMetaError(error);
    console.error('[Boost] Creation failed', { failedStep, partial, ...parsed });

    let rollback;
    if (partial.campaignId || partial.adSetId || partial.creativeId || partial.adId) {
      rollback = await rollbackPartialBoost(partial, input.accessToken);
    }

    return {
      success: false,
      failedStep,
      partial: Object.keys(partial).length ? partial : undefined,
      rollback,
      adAccountId: actId,
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

export function parseCreateBody(body: any): BoostCreateInput {
  return {
    accessToken: body.accessToken,
    adAccountId: body.adAccountId,
    pageId: body.pageId,
    igUserId: body.igUserId,
    mediaId: body.mediaId,
    objective: body.objective,
    audienceMode: body.audienceMode === 'custom' ? 'custom' : 'automatic',
    locationCountries: Array.isArray(body.locationCountries) ? body.locationCountries : [],
    ageMin: body.ageMin !== undefined && body.ageMin !== '' ? Number(body.ageMin) : undefined,
    ageMax: body.ageMax !== undefined && body.ageMax !== '' ? Number(body.ageMax) : undefined,
    genders: Array.isArray(body.genders) ? body.genders.map(Number) : undefined,
    interestIds: Array.isArray(body.interestIds) ? body.interestIds : undefined,
    dailyBudgetMajor: Number(body.dailyBudget),
    startDate: body.startDate,
    endDate: body.endDate,
    websiteUrl: body.websiteUrl,
    status: body.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
  };
}
