/**
 * Boost creation readiness for Cloudflare Pages Functions.
 * Set META_APP_MODE=live and META_PRIVACY_POLICY_CONFIGURED=true in Cloudflare
 * environment variables when Meta App is Live and Privacy Policy URL is configured.
 */

export type MetaAppMode = 'development' | 'live';

export interface BoostReadiness {
  appMode: MetaAppMode;
  privacyPolicyConfigured: boolean;
  boostCreationEnabled: boolean;
  warningMessage: string | null;
  checklist: {
    privacyPolicyUrl: 'Configured' | 'Not configured';
    metaAppMode: 'Live/Public' | 'Development';
    realBoostCreation: 'Available' | 'Locked';
  };
  source: 'env';
}

const DEVELOPMENT_WARNING =
  'Your Meta app is currently in Development Mode. Complete the Privacy Policy configuration and switch the app to Live/Public mode before creating a real Boost.';

export function getBoostReadiness(env: Record<string, unknown> | undefined): BoostReadiness {
  const modeRaw = String(env?.META_APP_MODE ?? 'development').trim().toLowerCase();
  const appMode: MetaAppMode =
    modeRaw === 'live' || modeRaw === 'public' || modeRaw === 'production' ? 'live' : 'development';

  const privacyRaw = String(env?.META_PRIVACY_POLICY_CONFIGURED ?? 'false').trim().toLowerCase();
  const privacyPolicyConfigured = ['true', '1', 'yes', 'on'].includes(privacyRaw);

  const boostCreationEnabled = appMode === 'live' && privacyPolicyConfigured;

  return {
    appMode,
    privacyPolicyConfigured,
    boostCreationEnabled,
    warningMessage: boostCreationEnabled ? null : DEVELOPMENT_WARNING,
    checklist: {
      privacyPolicyUrl: privacyPolicyConfigured ? 'Configured' : 'Not configured',
      metaAppMode: appMode === 'live' ? 'Live/Public' : 'Development',
      realBoostCreation: boostCreationEnabled ? 'Available' : 'Locked',
    },
    source: 'env',
  };
}
