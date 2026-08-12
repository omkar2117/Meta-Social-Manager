/**
 * Production always uses same-origin relative `/api/*` (empty base URL).
 * Local Vite may set VITE_API_BASE_URL=http://localhost:3001 for Express.
 * Never bake localhost into production builds even if the env var is mistakenly set.
 */
const configuredBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';
export const API_BASE_URL = import.meta.env.PROD
  ? ''
  : configuredBase;

export const ENDPOINTS = {
  HEALTH: '/api/health',
  META_VALIDATE: '/api/meta/validate',
  META_PAGES: '/api/meta/pages',
  META_INSTAGRAM_ACCOUNT: '/api/meta/instagram-account',
  META_INSTAGRAM_PROFILE: '/api/meta/instagram-profile',
  META_INSTAGRAM_MEDIA: '/api/meta/instagram-media',
  META_INSTAGRAM_INSIGHTS: '/api/meta/instagram-insights',
  META_CONNECT: '/api/meta/connect',
  BOOST_OBJECTIVES: '/api/boost/objectives',
  BOOST_AD_ACCOUNTS: '/api/boost/ad-accounts',
  BOOST_MINIMUM_BUDGET: '/api/boost/minimum-budget',
  BOOST_ELIGIBILITY: '/api/boost/eligibility',
  BOOST_SEARCH_INTERESTS: '/api/boost/search-interests',
  BOOST_SEARCH_LOCATIONS: '/api/boost/search-locations',
  BOOST_REVIEW: '/api/boost/review',
  BOOST_CREATE: '/api/boost/create',
  BOOST_READINESS: '/api/boost/readiness',
} as const;
