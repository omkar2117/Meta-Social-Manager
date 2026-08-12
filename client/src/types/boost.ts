export type BoostObjectiveKey = 'profile_visits' | 'website_visits' | 'messages';

export interface BoostObjectiveOption {
  key: BoostObjectiveKey;
  label: string;
  description: string;
  requiresWebsiteUrl: boolean;
  campaignObjective: string;
  optimizationGoal: string;
  destinationType: string;
}

export interface AdAccountOption {
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

export interface BoostEligibility {
  mediaId: string;
  eligible: boolean;
  reason: string | null;
  media_type?: string;
  media_product_type?: string;
}

export interface BoostInterest {
  id: string;
  name: string;
  audience_size?: number;
}

export interface BoostLocationResult {
  key: string;
  name: string;
  type: string;
  country_code?: string;
}

export interface BoostReviewPayload {
  objective: {
    key: BoostObjectiveKey;
    label: string;
    campaignObjective: string;
    optimizationGoal: string;
    destinationType: string;
  };
  audienceMode: 'automatic' | 'custom';
  locationCountries: string[];
  ageMin?: number;
  ageMax?: number;
  genders?: number[];
  interests?: Array<{ id: string; name?: string }>;
  dailyBudget: number;
  currency: string;
  minDailyBudgetMinor: number | null;
  startDate: string;
  endDate: string;
  durationDays: number;
  estimatedSpendMajor: number;
  estimatedSpendNote: string;
  adAccountId: string;
  mediaId: string;
  websiteUrl?: string;
  creationStatus: string;
  eligibility: BoostEligibility;
}

export interface BoostCreateSuccess {
  success: true;
  campaignId: string;
  adSetId: string;
  creativeId: string;
  adId: string;
  adAccountId: string;
  status: string;
  dailyBudgetMinor: number;
  dailyBudgetMajor: number;
  currency: string;
  startTime: string;
  endTime: string;
  campaignUrl?: string | null;
}

export interface BoostCreateFailure {
  success: false;
  failedStep?: 'campaign' | 'adset' | 'creative' | 'ad' | 'unknown';
  partial?: {
    campaignId?: string;
    adSetId?: string;
    creativeId?: string;
    adId?: string;
  };
  rollback?: {
    attempted: boolean;
    deleted: string[];
    failed: Array<{ id: string; type: string; message: string }>;
  };
  adAccountId?: string;
  /** Ads Manager billing deep-link when Meta reports missing payment method */
  billingUrl?: string | null;
  error: {
    code: string;
    message: string;
    details?: string;
    metaCode?: number;
    metaSubcode?: number;
  };
}

export type BoostCreateResponse = BoostCreateSuccess | BoostCreateFailure;

export interface BoostFormState {
  objective: BoostObjectiveKey;
  audienceMode: 'automatic' | 'custom';
  locationCountries: string[];
  ageMin: number;
  ageMax: number;
  gender: 'all' | 'male' | 'female';
  interests: BoostInterest[];
  dailyBudget: number;
  durationDays: number;
  startDate: string;
  endDate: string;
  websiteUrl: string;
  adAccountId: string;
  /** Creation status sent to Meta — default PAUSED to avoid accidental spend */
  status: 'PAUSED' | 'ACTIVE';
}

export interface BoostReadiness {
  appMode: 'development' | 'live';
  privacyPolicyConfigured: boolean;
  boostCreationEnabled: boolean;
  warningMessage: string | null;
  checklist: {
    privacyPolicyUrl: 'Configured' | 'Not configured';
    metaAppMode: 'Live' | 'Development';
    realBoostCreation: 'Unlocked' | 'Locked';
  };
  source: 'env';
}
