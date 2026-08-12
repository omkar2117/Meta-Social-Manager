import { Router, Request, Response } from 'express';
import {
  BOOST_OBJECTIVES,
  checkBoostEligibility,
  createBoost,
  fetchAdAccountMinimumBudget,
  fetchAdAccounts,
  getObjectiveConfig,
  parseBoostMetaError,
  searchAdInterests,
  searchAdLocations,
  validateBoostInput,
  type BoostCreateInput,
  type BoostObjectiveKey,
} from '../utils/boostApi';
import { getBoostReadinessFromProcessEnv } from '../utils/boostReadiness';

const router = Router();

function requireToken(req: Request, res: Response): string | null {
  const { accessToken } = req.body || {};
  if (!accessToken || typeof accessToken !== 'string') {
    res.status(400).json({ code: 'MISSING_TOKEN', message: 'Access token is required.' });
    return null;
  }
  return accessToken;
}

router.get('/objectives', (_req, res) => {
  res.json({
    success: true,
    objectives: BOOST_OBJECTIVES.map((o) => ({
      key: o.key,
      label: o.label,
      description: o.description,
      requiresWebsiteUrl: o.requiresWebsiteUrl,
      campaignObjective: o.campaignObjective,
      optimizationGoal: o.optimizationGoal,
      destinationType: o.destinationType,
    })),
  });
});

/** Safe readiness probe — does not call Meta create APIs */
router.get('/readiness', (_req, res) => {
  const readiness = getBoostReadinessFromProcessEnv();
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.json({ success: true, readiness });
});

router.post('/ad-accounts', async (req, res) => {
  try {
    const accessToken = requireToken(req, res);
    if (!accessToken) return;

    const accounts = await fetchAdAccounts(accessToken);
    res.json({
      success: true,
      accounts,
      // Explicitly note empty is not a failure
      message:
        accounts.length === 0
          ? 'No ad accounts found for this token. Empty list is not an API error.'
          : undefined,
    });
  } catch (error) {
    const appError = parseBoostMetaError(error);
    res.status(appError.status).json(appError);
  }
});

router.post('/minimum-budget', async (req, res) => {
  try {
    const accessToken = requireToken(req, res);
    if (!accessToken) return;
    const { adAccountId } = req.body;
    if (!adAccountId) {
      res.status(400).json({ code: 'MISSING_PARAMS', message: 'adAccountId is required.' });
      return;
    }
    const result = await fetchAdAccountMinimumBudget(adAccountId, accessToken);
    res.json({ success: true, ...result });
  } catch (error) {
    const appError = parseBoostMetaError(error);
    res.status(appError.status).json(appError);
  }
});

router.post('/eligibility', async (req, res) => {
  try {
    const accessToken = requireToken(req, res);
    if (!accessToken) return;
    const { mediaId } = req.body;
    if (!mediaId) {
      res.status(400).json({ code: 'MISSING_PARAMS', message: 'mediaId is required.' });
      return;
    }
    const result = await checkBoostEligibility(mediaId, accessToken);
    res.json({ success: true, eligibility: result });
  } catch (error) {
    const appError = parseBoostMetaError(error);
    res.status(appError.status).json(appError);
  }
});

router.post('/search-interests', async (req, res) => {
  try {
    const accessToken = requireToken(req, res);
    if (!accessToken) return;
    const { query } = req.body;
    const interests = await searchAdInterests(String(query || ''), accessToken);
    res.json({ success: true, interests });
  } catch (error) {
    const appError = parseBoostMetaError(error);
    res.status(appError.status).json(appError);
  }
});

router.post('/search-locations', async (req, res) => {
  try {
    const accessToken = requireToken(req, res);
    if (!accessToken) return;
    const { query } = req.body;
    const locations = await searchAdLocations(String(query || ''), accessToken);
    res.json({ success: true, locations });
  } catch (error) {
    const appError = parseBoostMetaError(error);
    res.status(appError.status).json(appError);
  }
});

function parseCreateBody(body: any): BoostCreateInput {
  return {
    accessToken: body.accessToken,
    adAccountId: body.adAccountId,
    pageId: body.pageId,
    igUserId: body.igUserId,
    mediaId: body.mediaId,
    objective: body.objective as BoostObjectiveKey,
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

/** Validate + eligibility only — does NOT create Meta objects */
router.post('/review', async (req, res) => {
  try {
    const accessToken = requireToken(req, res);
    if (!accessToken) return;

    const input = parseCreateBody(req.body);
    const objective = getObjectiveConfig(input.objective);
    if (!objective) {
      res.status(400).json({ code: 'INVALID_OBJECTIVE', message: 'Unsupported boost objective.' });
      return;
    }

    const minInfo = await fetchAdAccountMinimumBudget(input.adAccountId, accessToken);
    const validationErrors = validateBoostInput(
      input,
      minInfo.currency,
      minInfo.minDailyBudgetMinor
    );
    if (validationErrors.length) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: validationErrors[0],
        details: validationErrors.join(' | '),
      });
      return;
    }

    const eligibility = await checkBoostEligibility(input.mediaId, accessToken);
    if (!eligibility.eligible) {
      res.status(400).json({
        code: 'MEDIA_NOT_ELIGIBLE',
        message: eligibility.reason || 'Post is not eligible for promotion.',
        eligibility,
      });
      return;
    }

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    const durationDays = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
    );
    const estimatedTotalMajor = input.dailyBudgetMajor * durationDays;

    res.json({
      success: true,
      review: {
        objective: {
          key: objective.key,
          label: objective.label,
          campaignObjective: objective.campaignObjective,
          optimizationGoal: objective.optimizationGoal,
          destinationType: objective.destinationType,
        },
        audienceMode: input.audienceMode,
        locationCountries: input.locationCountries,
        ageMin: input.ageMin,
        ageMax: input.ageMax,
        genders: input.genders,
        interests: input.interestIds,
        dailyBudget: input.dailyBudgetMajor,
        currency: minInfo.currency,
        minDailyBudgetMinor: minInfo.minDailyBudgetMinor,
        startDate: input.startDate,
        endDate: input.endDate,
        durationDays,
        // Client-calculated estimate (not a Meta delivery estimate)
        estimatedSpendMajor: estimatedTotalMajor,
        estimatedSpendNote:
          'Estimated total = daily budget × duration days. Not a Meta delivery estimate.',
        adAccountId: input.adAccountId,
        mediaId: input.mediaId,
        websiteUrl: input.websiteUrl,
        creationStatus: input.status || 'PAUSED',
        eligibility,
      },
    });
  } catch (error) {
    const appError = parseBoostMetaError(error);
    res.status(appError.status).json(appError);
  }
});

/** Final creation — only endpoint that creates Campaign / Ad Set / Creative / Ad */
router.post('/create', async (req, res) => {
  try {
    const accessToken = requireToken(req, res);
    if (!accessToken) return;

    const readiness = getBoostReadinessFromProcessEnv();
    if (!readiness.boostCreationEnabled) {
      res.status(403).json({
        success: false,
        code: 'BOOST_CREATION_LOCKED',
        message:
          readiness.warningMessage ||
          'Boost creation is locked until the Meta app is Live/Public and the Privacy Policy URL is configured.',
        readiness,
      });
      return;
    }

    if (req.body.confirmCreate !== true) {
      res.status(400).json({
        code: 'CONFIRMATION_REQUIRED',
        message:
          'Set confirmCreate=true after reviewing the boost. This prevents accidental campaign creation.',
      });
      return;
    }

    const input = parseCreateBody(req.body);
    const result = await createBoost(input);

    if (!result.success) {
      const status =
        result.error?.code === 'VALIDATION_ERROR' ||
        result.error?.code === 'MEDIA_NOT_ELIGIBLE' ||
        result.error?.code === 'INVALID_OBJECTIVE' ||
        result.error?.code === 'AD_ACCOUNT_NOT_ELIGIBLE'
          ? 400
          : result.error?.code === 'AD_ACCOUNT_PAYMENT_REQUIRED'
            ? 402
            : result.error?.code === 'APP_IN_DEVELOPMENT_MODE' ||
                result.error?.code === 'MISSING_PERMISSION'
              ? 403
              : result.error?.code === 'INVALID_TOKEN' ||
                  result.error?.code === 'TOKEN_EXPIRED' ||
                  result.error?.code === 'OAUTH_EXCEPTION'
                ? 401
                : 502;
      res.status(status).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    const appError = parseBoostMetaError(error);
    console.error('[Boost] /create unexpected error', appError);
    res.status(appError.status).json({ success: false, error: appError });
  }
});

export default router;
