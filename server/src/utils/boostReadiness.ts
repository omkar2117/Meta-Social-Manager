/**
 * Boost creation readiness — driven by deploy/runtime configuration, not hardcoded Live.
 *
 * When Meta setup is complete, set without code changes:
 *   META_APP_MODE=live
 *   META_PRIVACY_POLICY_CONFIGURED=true
 *
 * Defaults are safe (Development + Privacy not configured → Create Boost locked).
 */

export type MetaAppMode = 'development' | 'live';

export interface BoostReadiness {
  appMode: MetaAppMode;
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

export interface BoostReadinessEnv {
  META_APP_MODE?: string;
  META_PRIVACY_POLICY_CONFIGURED?: string;
}

const DEVELOPMENT_WARNING =
  'Your Meta app is currently in Development Mode. Complete the Privacy Policy configuration and switch the app to Live/Public mode before creating a real Boost.';

function readFlag(value: string | undefined): boolean {
  if (value === undefined || value === '') return false;
  return ['true', '1', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function readAppMode(value: string | undefined): MetaAppMode {
  const v = String(value || 'development').trim().toLowerCase();
  if (v === 'live' || v === 'public' || v === 'production') return 'live';
  return 'development';
}

export function getBoostReadiness(env: BoostReadinessEnv = {}): BoostReadiness {
  const appMode = readAppMode(env.META_APP_MODE);
  const privacyPolicyConfigured = readFlag(env.META_PRIVACY_POLICY_CONFIGURED);
  const boostCreationEnabled = appMode === 'live' && privacyPolicyConfigured;

  return {
    appMode,
    privacyPolicyConfigured,
    boostCreationEnabled,
    warningMessage: boostCreationEnabled ? null : DEVELOPMENT_WARNING,
    checklist: {
      privacyPolicyUrl: privacyPolicyConfigured ? 'Configured' : 'Not configured',
      metaAppMode: appMode === 'live' ? 'Live' : 'Development',
      realBoostCreation: boostCreationEnabled ? 'Unlocked' : 'Locked',
    },
    source: 'env',
  };
}

/** Node/Express: read from process.env */
export function getBoostReadinessFromProcessEnv(): BoostReadiness {
  return getBoostReadiness({
    META_APP_MODE: process.env.META_APP_MODE,
    META_PRIVACY_POLICY_CONFIGURED: process.env.META_PRIVACY_POLICY_CONFIGURED,
  });
}
