export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const ENDPOINTS = {
  HEALTH: '/api/health',
  META_VALIDATE: '/api/meta/validate',
  META_PAGES: '/api/meta/pages',
  META_INSTAGRAM_ACCOUNT: '/api/meta/instagram-account',
  META_INSTAGRAM_PROFILE: '/api/meta/instagram-profile',
  META_INSTAGRAM_MEDIA: '/api/meta/instagram-media',
  META_INSTAGRAM_INSIGHTS: '/api/meta/instagram-insights',
  META_CONNECT: '/api/meta/connect',
} as const;
