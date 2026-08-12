import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../constants/api';
import type {
  AdAccountOption,
  BoostCreateFailure,
  BoostCreateResponse,
  BoostEligibility,
  BoostInterest,
  BoostLocationResult,
  BoostObjectiveOption,
  BoostReadiness,
  BoostReviewPayload,
} from '../types/boost';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

export async function fetchBoostObjectives(): Promise<BoostObjectiveOption[]> {
  const { data } = await api.get<{ success: boolean; objectives: BoostObjectiveOption[] }>(
    ENDPOINTS.BOOST_OBJECTIVES
  );
  return data.objectives;
}

/** Config-only readiness — does not create Meta campaigns/ads */
export async function fetchBoostReadiness(): Promise<BoostReadiness> {
  const { data } = await api.get<{ success: boolean; readiness: BoostReadiness }>(
    ENDPOINTS.BOOST_READINESS
  );
  return data.readiness;
}

export async function fetchBoostAdAccounts(accessToken: string): Promise<AdAccountOption[]> {
  const { data } = await api.post<{ success: boolean; accounts: AdAccountOption[] }>(
    ENDPOINTS.BOOST_AD_ACCOUNTS,
    { accessToken }
  );
  return data.accounts || [];
}

export async function fetchBoostMinimumBudget(accessToken: string, adAccountId: string) {
  const { data } = await api.post<{
    success: boolean;
    currency: string;
    minDailyBudgetMinor: number | null;
    source: string;
  }>(ENDPOINTS.BOOST_MINIMUM_BUDGET, { accessToken, adAccountId });
  return data;
}

export async function checkBoostEligibility(
  accessToken: string,
  mediaId: string
): Promise<BoostEligibility> {
  const { data } = await api.post<{ success: boolean; eligibility: BoostEligibility }>(
    ENDPOINTS.BOOST_ELIGIBILITY,
    { accessToken, mediaId }
  );
  return data.eligibility;
}

export async function searchBoostInterests(
  accessToken: string,
  query: string
): Promise<BoostInterest[]> {
  const { data } = await api.post<{ success: boolean; interests: BoostInterest[] }>(
    ENDPOINTS.BOOST_SEARCH_INTERESTS,
    { accessToken, query }
  );
  return data.interests || [];
}

export async function searchBoostLocations(
  accessToken: string,
  query: string
): Promise<BoostLocationResult[]> {
  const { data } = await api.post<{ success: boolean; locations: BoostLocationResult[] }>(
    ENDPOINTS.BOOST_SEARCH_LOCATIONS,
    { accessToken, query }
  );
  return data.locations || [];
}

export interface BoostRequestPayload {
  accessToken: string;
  adAccountId: string;
  pageId: string;
  igUserId: string;
  mediaId: string;
  objective: string;
  audienceMode: 'automatic' | 'custom';
  locationCountries: string[];
  ageMin?: number;
  ageMax?: number;
  genders?: number[];
  interestIds?: Array<{ id: string; name?: string }>;
  dailyBudget: number;
  startDate: string;
  endDate: string;
  websiteUrl?: string;
  status?: 'PAUSED' | 'ACTIVE';
}

export async function reviewBoost(
  payload: BoostRequestPayload
): Promise<{ success: boolean; review: BoostReviewPayload }> {
  const { data } = await api.post(ENDPOINTS.BOOST_REVIEW, payload);
  return data;
}

export async function createBoost(
  payload: BoostRequestPayload & { confirmCreate: true }
): Promise<BoostCreateResponse> {
  try {
    const { data } = await api.post<BoostCreateResponse>(ENDPOINTS.BOOST_CREATE, payload);
    return data;
  } catch (err) {
    // Preserve real Meta failure payloads (incl. rollback) — never invent success
    if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object') {
      const data = err.response.data as Record<string, unknown>;
      if (data.success === false || data.error) {
        return {
          success: false,
          failedStep: data.failedStep as BoostCreateFailure['failedStep'],
          partial: data.partial as BoostCreateFailure['partial'],
          rollback: data.rollback as BoostCreateFailure['rollback'],
          adAccountId: data.adAccountId as string | undefined,
          billingUrl: (data.billingUrl as string | null | undefined) ?? null,
          error: (data.error as BoostCreateFailure['error']) || {
            code: String(data.code || 'META_ADS_ERROR'),
            message: String(data.message || 'Boost creation failed.'),
            details: data.details ? String(data.details) : undefined,
          },
        };
      }
    }
    throw err;
  }
}

export function getBoostErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as {
      response?: {
        data?: {
          message?: string;
          code?: string;
          error?: { message?: string; code?: string };
          details?: string;
        };
      };
    };
    const data = axiosErr.response?.data;
    if (data?.error?.code === 'APP_IN_DEVELOPMENT_MODE' || data?.code === 'APP_IN_DEVELOPMENT_MODE') {
      return (
        data.error?.message ||
        data.message ||
        'Your Meta app is currently in Development Mode. Switch the Meta app to Live/Public mode before creating a real Boost ad.'
      );
    }
    if (
      data?.error?.code === 'AD_ACCOUNT_PAYMENT_REQUIRED' ||
      data?.code === 'AD_ACCOUNT_PAYMENT_REQUIRED'
    ) {
      return (
        data.error?.message ||
        data.message ||
        'Meta requires a valid payment method on this Ad Account before this Boost can run.'
      );
    }
    return (
      data?.error?.message ||
      data?.message ||
      data?.details ||
      'Boost request failed.'
    );
  }
  if (err instanceof Error) return err.message;
  return 'Boost request failed.';
}
