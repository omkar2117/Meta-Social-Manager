import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Rocket,
  Loader2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Search,
} from 'lucide-react';
import type { InstagramMedia } from '../types/instagram';
import type {
  AdAccountOption,
  BoostCreateSuccess,
  BoostFormState,
  BoostInterest,
  BoostObjectiveKey,
  BoostObjectiveOption,
  BoostReadiness,
  BoostReviewPayload,
} from '../types/boost';
import {
  checkBoostEligibility,
  createBoost,
  fetchBoostAdAccounts,
  fetchBoostMinimumBudget,
  fetchBoostObjectives,
  fetchBoostReadiness,
  getBoostErrorMessage,
  reviewBoost,
  searchBoostInterests,
} from '../services/boostService';
import { truncateText } from '../utils/formatters';

interface BoostModalProps {
  media: InstagramMedia;
  accessToken: string;
  pageId: string;
  igUserId: string;
  instagramUsername: string;
  profileWebsite?: string;
  onClose: () => void;
}

type Step = 'form' | 'review' | 'success' | 'error';

/** Matches server Meta schedule safety buffer (avoid exact-24h rejection). */
const SCHEDULE_SAFETY_BUFFER_MS = 60 * 1000;

function defaultDates(durationDays: number) {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  // End = N full days + 60s so Meta daily-budget ad sets stay >= 24h*N.
  const end = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000 + SCHEDULE_SAFETY_BUFFER_MS);
  const toLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  return { startDate: toLocal(start), endDate: toLocal(end) };
}

function currencyOffset(currency: string) {
  const map: Record<string, number> = { USD: 100, EUR: 100, GBP: 100, INR: 100, JPY: 1, KRW: 1 };
  return map[currency?.toUpperCase()] ?? 100;
}

export function BoostModal({
  media,
  accessToken,
  pageId,
  igUserId,
  instagramUsername,
  profileWebsite,
  onClose,
}: BoostModalProps) {
  const thumb = media.media_type === 'VIDEO' ? media.thumbnail_url : media.media_url;
  const dates = defaultDates(7);

  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partialIds, setPartialIds] = useState<Record<string, string> | undefined>();
  const [rollbackInfo, setRollbackInfo] = useState<{
    attempted: boolean;
    deleted: string[];
    failed: Array<{ id: string; type: string; message: string }>;
  } | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [failedStep, setFailedStep] = useState<string | null>(null);
  const [billingUrl, setBillingUrl] = useState<string | null>(null);

  const [objectives, setObjectives] = useState<BoostObjectiveOption[]>([]);
  const [accounts, setAccounts] = useState<AdAccountOption[]>([]);
  const [eligibilityNote, setEligibilityNote] = useState<string | null>(null);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [minDailyMinor, setMinDailyMinor] = useState<number | null>(null);
  const [interestQuery, setInterestQuery] = useState('');
  const [interestResults, setInterestResults] = useState<BoostInterest[]>([]);
  const [review, setReview] = useState<BoostReviewPayload | null>(null);
  const [success, setSuccess] = useState<BoostCreateSuccess | null>(null);
  const [readiness, setReadiness] = useState<BoostReadiness | null>(null);

  const [form, setForm] = useState<BoostFormState>({
    objective: 'profile_visits',
    audienceMode: 'automatic',
    locationCountries: ['US'],
    ageMin: 18,
    ageMax: 65,
    gender: 'all',
    interests: [],
    dailyBudget: 5,
    durationDays: 7,
    startDate: dates.startDate,
    endDate: dates.endDate,
    websiteUrl: '',
    adAccountId: '',
    status: 'PAUSED',
  });

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === form.adAccountId),
    [accounts, form.adAccountId]
  );
  const currency = selectedAccount?.currency || 'USD';

  const minDailyMajor =
    minDailyMinor !== null ? minDailyMinor / currencyOffset(currency) : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [objs, accts, eligibility, ready] = await Promise.all([
          fetchBoostObjectives(),
          fetchBoostAdAccounts(accessToken),
          checkBoostEligibility(accessToken, media.id),
          fetchBoostReadiness(),
        ]);
        if (cancelled) return;
        setObjectives(objs);
        setAccounts(accts);
        setReadiness(ready);
        setEligible(eligibility.eligible);
        setEligibilityNote(
          eligibility.eligible
            ? 'This post is eligible for promotion.'
            : eligibility.reason || 'Post is not eligible for promotion.'
        );
        const firstEligible = accts.find((a) => a.eligible);
        if (firstEligible) {
          setForm((f) => ({ ...f, adAccountId: firstEligible.id }));
        }
      } catch (err) {
        if (!cancelled) setError(getBoostErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, media.id]);

  useEffect(() => {
    if (!form.adAccountId) return;
    let cancelled = false;
    (async () => {
      try {
        const min = await fetchBoostMinimumBudget(accessToken, form.adAccountId);
        if (cancelled) return;
        setMinDailyMinor(min.minDailyBudgetMinor);
        if (min.minDailyBudgetMinor !== null) {
          const major = min.minDailyBudgetMinor / currencyOffset(min.currency || currency);
          setForm((f) => ({
            ...f,
            dailyBudget: Math.max(f.dailyBudget, Number(major.toFixed(2))),
          }));
        }
      } catch {
        if (!cancelled) setMinDailyMinor(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, form.adAccountId, currency]);

  useEffect(() => {
    const start = new Date(form.startDate);
    if (Number.isNaN(start.getTime())) return;
    const end = new Date(
      start.getTime() + form.durationDays * 24 * 60 * 60 * 1000 + SCHEDULE_SAFETY_BUFFER_MS
    );
    const pad = (n: number) => String(n).padStart(2, '0');
    const endLocal = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
    setForm((f) => (f.endDate === endLocal ? f : { ...f, endDate: endLocal }));
  }, [form.startDate, form.durationDays]);

  const searchInterests = useCallback(async () => {
    if (!interestQuery.trim()) return;
    try {
      const results = await searchBoostInterests(accessToken, interestQuery);
      setInterestResults(results);
    } catch (err) {
      setError(getBoostErrorMessage(err));
    }
  }, [accessToken, interestQuery]);

  const buildPayload = () => {
    const genders =
      form.audienceMode === 'custom'
        ? form.gender === 'male'
          ? [1]
          : form.gender === 'female'
            ? [2]
            : undefined
        : undefined;

    return {
      accessToken,
      adAccountId: form.adAccountId,
      pageId,
      igUserId,
      instagramUsername,
      mediaId: media.id,
      objective: form.objective,
      audienceMode: form.audienceMode,
      locationCountries: form.locationCountries,
      ageMin: form.audienceMode === 'custom' ? form.ageMin : undefined,
      ageMax: form.audienceMode === 'custom' ? form.ageMax : undefined,
      genders,
      interestIds:
        form.audienceMode === 'custom'
          ? form.interests.map((i) => ({ id: i.id, name: i.name }))
          : undefined,
      dailyBudget: form.dailyBudget,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      websiteUrl: form.objective === 'website_visits' ? form.websiteUrl.trim() : undefined,
      status: form.status,
    };
  };

  const handleReview = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (eligible === false) {
        setError(eligibilityNote || 'Post is not eligible for promotion.');
        return;
      }
      if (form.objective === 'website_visits') {
        const url = form.websiteUrl.trim();
        let valid = false;
        try {
          const parsed = new URL(url);
          valid = parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
          valid = false;
        }
        if (!valid) {
          setError('A valid website URL is required for Website Visits.');
          return;
        }
      }
      // Refresh readiness from production API (never fake unlock in the UI)
      const ready = await fetchBoostReadiness();
      setReadiness(ready);
      const { review: reviewData } = await reviewBoost(buildPayload());
      setReview(reviewData);
      setStep('review');
    } catch (err) {
      setError(getBoostErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    // Hard UI + client guard: never call create while locked
    if (!readiness?.boostCreationEnabled) {
      setError(
        readiness?.warningMessage ||
          'Your Meta app is currently in Development Mode. Complete the Privacy Policy configuration and switch the app to Live/Public mode before creating a real Boost.'
      );
      setErrorCode('BOOST_CREATION_LOCKED');
      setStep('error');
      return;
    }

    setSubmitting(true);
    setError(null);
    setErrorCode(null);
    setFailedStep(null);
    setPartialIds(undefined);
    setRollbackInfo(null);
    setBillingUrl(null);
    try {
      if (form.objective === 'website_visits') {
        const url = form.websiteUrl.trim();
        let valid = false;
        try {
          const parsed = new URL(url);
          valid = parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
          valid = false;
        }
        if (!valid) {
          setError('A valid website URL is required for Website Visits.');
          setErrorCode('VALIDATION_ERROR');
          setStep('error');
          return;
        }
      }
      const result = await createBoost({ ...buildPayload(), confirmCreate: true });
      if (!result.success) {
        // Never treat as success. Do not auto-retry Create Boost.
        setPartialIds(result.partial);
        setRollbackInfo(result.rollback ?? null);
        setErrorCode(result.error?.code || null);
        setFailedStep(result.failedStep || null);
        setBillingUrl(result.billingUrl || (
            form.adAccountId
              ? `https://www.facebook.com/adsmanager/billing?act=${String(form.adAccountId).replace(/^act_/, '')}`
              : null
          ));
        setError(
          result.error?.message ||
            'Boost creation failed. Meta did not confirm a successful campaign.'
        );
        setStep('error');
        return;
      }
      setSuccess(result);
      setStep('success');
    } catch (err) {
      const axiosData =
        err && typeof err === 'object' && 'response' in err
          ? (err as {
              response?: {
                data?: {
                  success?: false;
                  partial?: Record<string, string>;
                  rollback?: {
                    attempted: boolean;
                    deleted: string[];
                    failed: Array<{ id: string; type: string; message: string }>;
                  };
                  failedStep?: string;
                  error?: { message?: string; code?: string };
                  message?: string;
                  code?: string;
                };
              };
            }).response?.data
          : undefined;
      if (axiosData?.partial) setPartialIds(axiosData.partial);
      if (axiosData?.rollback) setRollbackInfo(axiosData.rollback);
      if (axiosData?.failedStep) setFailedStep(axiosData.failedStep);
      setErrorCode(axiosData?.error?.code || axiosData?.code || null);
      const errBilling =
        (axiosData as { billingUrl?: string })?.billingUrl ||
        (form.adAccountId
          ? `https://www.facebook.com/adsmanager/billing?act=${String(form.adAccountId).replace(/^act_/, '')}`
          : null);
      if (
        axiosData?.error?.code === 'AD_ACCOUNT_PAYMENT_REQUIRED' ||
        axiosData?.code === 'AD_ACCOUNT_PAYMENT_REQUIRED'
      ) {
        setBillingUrl(errBilling);
      }
      setError(getBoostErrorMessage(err));
      setStep('error');
    } finally {
      setSubmitting(false);
    }
  };

  const mediaTypeLabel =
    media.media_product_type === 'REELS'
      ? 'REEL'
      : media.media_type.replace('_', ' ');

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#12121a] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-[#12121a]/90 backdrop-blur">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                <Rocket className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Boost Post</h2>
                <p className="text-xs text-gray-500">Real Meta Marketing API · v25.0</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Selected Post */}
            <section className="glass-card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Selected Post
              </h3>
              <div className="flex gap-3">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/[0.04] shrink-0">
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                      No image
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-violet-300">
                    <span className="px-2 py-0.5 rounded-md bg-violet-500/15 border border-violet-500/20">
                      {mediaTypeLabel}
                    </span>
                    <span className="text-gray-500 truncate">ID: {media.id}</span>
                  </div>
                  <p className="text-sm text-gray-200">
                    {media.caption ? truncateText(media.caption, 140) : 'No caption'}
                  </p>
                  <a
                    href={media.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
                  >
                    <ExternalLink className="w-3 h-3" /> Permalink
                  </a>
                </div>
              </div>
              {eligibilityNote && (
                <div
                  className={`mt-3 text-xs rounded-lg px-3 py-2 border ${
                    eligible
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                  }`}
                >
                  {eligibilityNote}
                </div>
              )}
            </section>

            {loading && (
              <div className="flex items-center justify-center gap-2 py-10 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading ad accounts & eligibility…
              </div>
            )}

            {!loading && step === 'form' && (
              <>
                {/* Objective */}
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Objective
                  </h3>
                  <div className="grid gap-2">
                    {objectives.map((obj) => (
                      <label
                        key={obj.key}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          form.objective === obj.key
                            ? 'border-violet-500/50 bg-violet-500/10'
                            : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="objective"
                          className="mt-1"
                          checked={form.objective === obj.key}
                          onChange={() =>
                            setForm((f) => ({
                              ...f,
                              objective: obj.key as BoostObjectiveKey,
                              websiteUrl:
                                obj.key === 'website_visits'
                                  ? f.websiteUrl ||
                                    (profileWebsite &&
                                    /^https?:\/\//i.test(profileWebsite.trim())
                                      ? profileWebsite.trim()
                                      : '')
                                  : '',
                            }))
                          }
                        />
                        <div>
                          <div className="text-sm font-medium text-white">{obj.label}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{obj.description}</div>
                          <div className="text-[10px] text-gray-600 mt-1">
                            Meta: {obj.campaignObjective} · {obj.optimizationGoal} ·{' '}
                            {obj.destinationType}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  {form.objective === 'website_visits' && (
                    <input
                      type="url"
                      required
                      placeholder="Website URL (https://…)"
                      value={form.websiteUrl}
                      onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                      className="w-full mt-2 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                    />
                  )}
                </section>

                {/* Audience */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Audience
                  </h3>
                  <div className="flex gap-2">
                    {(['automatic', 'custom'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, audienceMode: mode }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          form.audienceMode === mode
                            ? 'bg-violet-600/30 border-violet-500/40 text-white'
                            : 'bg-white/[0.03] border-white/[0.08] text-gray-400'
                        }`}
                      >
                        {mode === 'automatic' ? 'Automatic Audience' : 'Custom Audience'}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Location countries (ISO codes, comma-separated)
                    </label>
                    <input
                      value={form.locationCountries.join(', ')}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          locationCountries: e.target.value
                            .split(',')
                            .map((s) => s.trim().toUpperCase())
                            .filter(Boolean),
                        }))
                      }
                      placeholder="US, GB, CA"
                      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                    />
                  </div>

                  {form.audienceMode === 'custom' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Min age</label>
                        <input
                          type="number"
                          min={13}
                          max={65}
                          value={form.ageMin}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, ageMin: Number(e.target.value) }))
                          }
                          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Max age</label>
                        <input
                          type="number"
                          min={13}
                          max={65}
                          value={form.ageMax}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, ageMax: Number(e.target.value) }))
                          }
                          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">Gender</label>
                        <select
                          value={form.gender}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              gender: e.target.value as BoostFormState['gender'],
                            }))
                          }
                          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white"
                        >
                          <option value="all" className="bg-[#12121a]">All</option>
                          <option value="male" className="bg-[#12121a]">Male</option>
                          <option value="female" className="bg-[#12121a]">Female</option>
                        </select>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <label className="text-xs text-gray-500 mb-1 block">Interests</label>
                        <div className="flex gap-2">
                          <input
                            value={interestQuery}
                            onChange={(e) => setInterestQuery(e.target.value)}
                            placeholder="Search Meta ad interests…"
                            className="flex-1 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white"
                          />
                          <button
                            type="button"
                            onClick={searchInterests}
                            className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-gray-300 hover:bg-white/[0.1]"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                        </div>
                        {interestResults.length > 0 && (
                          <div className="max-h-28 overflow-y-auto rounded-xl border border-white/[0.06] divide-y divide-white/[0.04]">
                            {interestResults.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/[0.04]"
                                onClick={() => {
                                  setForm((f) =>
                                    f.interests.some((i) => i.id === item.id)
                                      ? f
                                      : { ...f, interests: [...f.interests, item] }
                                  );
                                }}
                              >
                                {item.name}
                              </button>
                            ))}
                          </div>
                        )}
                        {form.interests.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {form.interests.map((i) => (
                              <span
                                key={i.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-violet-500/15 text-violet-200 text-[11px]"
                              >
                                {i.name}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm((f) => ({
                                      ...f,
                                      interests: f.interests.filter((x) => x.id !== i.id),
                                    }))
                                  }
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                {/* Budget */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Budget & Schedule
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">
                        Daily budget ({currency})
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.dailyBudget}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, dailyBudget: Number(e.target.value) }))
                        }
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white"
                      />
                      {minDailyMajor !== null && (
                        <p className="text-[10px] text-gray-500 mt-1">
                          Meta minimum for this account: {minDailyMajor} {currency}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Duration (days)</label>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={form.durationDays}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, durationDays: Number(e.target.value) || 1 }))
                        }
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Start</label>
                      <input
                        type="datetime-local"
                        value={form.startDate}
                        onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">End</label>
                      <input
                        type="datetime-local"
                        value={form.endDate}
                        onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Estimated total (daily × days):{' '}
                    <span className="text-gray-300">
                      {(form.dailyBudget * form.durationDays).toFixed(2)} {currency}
                    </span>{' '}
                    — calculated locally, not a Meta delivery estimate.
                  </p>
                </section>

                {/* Ad Account */}
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Ad Account
                  </h3>
                  {accounts.length === 0 ? (
                    <p className="text-sm text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                      No ad accounts returned for this token. An empty list is not treated as an API
                      failure — grant ads access or use a token linked to an ad account.
                    </p>
                  ) : (
                    <select
                      value={form.adAccountId}
                      onChange={(e) => setForm((f) => ({ ...f, adAccountId: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white cursor-default caret-transparent outline-none focus:outline-none focus:ring-0"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id} className="bg-[#12121a]" disabled={!acc.eligible}>
                          {acc.name} · {acc.id} · {acc.currency} · {acc.timezone_name} ·{' '}
                          {acc.account_status_label}
                          {!acc.eligible ? ' (not eligible)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedAccount && (
                    <p className="text-[11px] text-gray-400">
                      Selected: {selectedAccount.name} · {selectedAccount.id}
                      <span className="text-gray-500">
                        {' '}
                        · Status: {selectedAccount.account_status_label} · Currency:{' '}
                        {selectedAccount.currency} · Timezone: {selectedAccount.timezone_name}
                      </span>
                    </p>
                  )}

                  <label className="flex items-start gap-2 mt-2 text-xs text-gray-400">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={form.status === 'ACTIVE'}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          status: e.target.checked ? 'ACTIVE' : 'PAUSED',
                        }))
                      }
                    />
                    <span>
                      Create as <strong className="text-gray-200">ACTIVE</strong> (may start spending).
                      Default is <strong className="text-gray-200">PAUSED</strong> — activate later in
                      Ads Manager.
                    </span>
                  </label>
                </section>
              </>
            )}

            {!loading && step === 'review' && review && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-white">Review Boost</h3>
                <div className="glass-card p-4 space-y-2 text-sm">
                  <Row label="Objective" value={review.objective.label} />
                  <Row
                    label="Meta mapping"
                    value={`${review.objective.campaignObjective} / ${review.objective.optimizationGoal} / ${review.objective.destinationType}`}
                  />
                  {review.objective.key === 'website_visits' && (
                    <Row label="Website URL" value={review.websiteUrl || '—'} />
                  )}
                  <Row label="Audience" value={review.audienceMode} />
                  <Row label="Locations" value={review.locationCountries.join(', ')} />
                  <Row
                    label="Budget"
                    value={`${review.dailyBudget} ${review.currency} / day`}
                  />
                  <Row
                    label="Duration"
                    value={`${review.durationDays} day(s) · ${new Date(review.startDate).toLocaleString()} → ${new Date(review.endDate).toLocaleString()}`}
                  />
                  <Row label="Ad account" value={review.adAccountId} />
                  <Row
                    label="Est. spend"
                    value={`${review.estimatedSpendMajor} ${review.currency}`}
                  />
                  <p className="text-[11px] text-gray-500 pt-1">{review.estimatedSpendNote}</p>
                  <Row label="Creation status" value={review.creationStatus} />
                </div>

                {readiness && (
                  <div className="glass-card p-4 space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {readiness.boostCreationEnabled
                        ? 'Production readiness'
                        : 'Pre-Live checklist'}
                    </h4>
                    <ChecklistRow
                      label="Privacy Policy URL"
                      value={readiness.checklist.privacyPolicyUrl}
                      ok={readiness.privacyPolicyConfigured}
                    />
                    <ChecklistRow
                      label="Meta App Mode"
                      value={readiness.checklist.metaAppMode}
                      ok={readiness.appMode === 'live'}
                    />
                    <ChecklistRow
                      label="Real Boost Creation"
                      value={readiness.checklist.realBoostCreation}
                      ok={readiness.boostCreationEnabled}
                    />
                  </div>
                )}

                {!readiness?.boostCreationEnabled ? (
                  <div className="flex items-start gap-2 text-xs bg-amber-500/15 border border-amber-500/30 rounded-xl px-3 py-3 text-amber-100">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-200">
                        Your Meta app is currently in Development Mode. Complete the Privacy Policy
                        configuration and switch the app to Live/Public mode before creating a real
                        Boost.
                      </p>
                      <p className="text-amber-200/80">
                        Create Boost is locked. No campaign, ad set, creative, or ad will be created.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p>
                        Create Boost will call Meta Marketing API and create Campaign, Ad Set,
                        Creative, and Ad objects. No mock IDs will be shown.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            )}

            {!loading && step === 'success' && success && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="w-5 h-5" />
                  <h3 className="text-sm font-semibold">Boost Created</h3>
                </div>
                <div className="glass-card p-4 space-y-2 text-sm">
                  <Row label="Campaign ID" value={success.campaignId} />
                  <Row label="Ad Set ID" value={success.adSetId} />
                  <Row label="Ad ID" value={success.adId} />
                  <Row label="Creative ID" value={success.creativeId} />
                  <Row label="Ad Account" value={success.adAccountId} />
                  <Row label="Status" value={success.status} />
                  <Row
                    label="Budget"
                    value={`${success.dailyBudgetMajor} ${success.currency} / day`}
                  />
                  <Row
                    label="Schedule"
                    value={`${new Date(success.startTime).toLocaleString()} → ${new Date(success.endTime).toLocaleString()}`}
                  />
                </div>
                {success.campaignUrl && (
                  <a
                    href={success.campaignUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-violet-300 hover:text-violet-200"
                  >
                    <ExternalLink className="w-4 h-4" /> View Campaign
                  </a>
                )}
                {success.status === 'PAUSED' && (
                  <p className="text-xs text-gray-400">
                    Objects were created as PAUSED. Activate in Meta Ads Manager to start delivery
                    and spending.
                  </p>
                )}
              </section>
            )}

            {!loading && step === 'error' && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-red-300">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-sm font-semibold">Boost Failed</h3>
                </div>
                {errorCode === 'APP_IN_DEVELOPMENT_MODE' ? (
                  <div className="space-y-2 text-sm bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-3 text-amber-100">
                    <p className="font-semibold text-amber-200">
                      Your Meta app is currently in Development Mode. Switch the Meta app to
                      Live/Public mode before creating a real Boost ad.
                    </p>
                    <p className="text-xs text-amber-200/80">
                      Meta rejected the ad creative (API step: POST /adcreatives with
                      source_instagram_media_id). This cannot be bypassed in code — the Meta App
                      Dashboard must set the app to Live/Public.
                    </p>
                    {failedStep && (
                      <p className="text-xs text-amber-200/70">Failed step: {failedStep}</p>
                    )}
                  </div>
                ) : errorCode === 'AD_ACCOUNT_PAYMENT_REQUIRED' ? (
                  <div className="space-y-2 text-sm bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-3 text-amber-100">
                    <p className="font-semibold text-amber-200">
                      Meta requires a valid payment method on this Ad Account.
                    </p>
                    <p className="text-xs text-amber-200/80">
                      Your Meta Ad Account needs a valid payment method before this Boost can run.
                      This app does not collect card details — add or update billing in Meta Ads
                      Manager, then try Create Boost again.
                    </p>
                    {failedStep && (
                      <p className="text-xs text-amber-200/70">Failed step: {failedStep}</p>
                    )}
                    {billingUrl && (
                      <a
                        href={billingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex text-xs font-semibold text-violet-300 hover:text-violet-200 underline underline-offset-2"
                      >
                        Add/Update payment method in Meta Ads Manager
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-red-200/90 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}
                {rollbackInfo?.attempted && (
                  <div className="text-xs text-gray-400 glass-card p-3 space-y-1">
                    <p className="text-emerald-300/90 font-medium">
                      Rollback attempted (no automatic Create Boost retry)
                    </p>
                    {rollbackInfo.deleted.length > 0 && (
                      <p>Deleted: {rollbackInfo.deleted.join(', ')}</p>
                    )}
                    {rollbackInfo.failed.length > 0 && (
                      <p className="text-amber-300">
                        Could not delete:{' '}
                        {rollbackInfo.failed.map((f) => `${f.type}:${f.id}`).join(', ')}. Remove
                        these manually in Meta Ads Manager if still present.
                      </p>
                    )}
                  </div>
                )}
                {partialIds && (
                  <div className="text-xs text-gray-400 glass-card p-3">
                    <p className="mb-1 text-amber-300">Partial Meta object IDs (debug):</p>
                    <pre className="whitespace-pre-wrap break-all">
                      {JSON.stringify(partialIds, null, 2)}
                    </pre>
                  </div>
                )}
              </section>
            )}

            {error && step === 'form' && (
              <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}
          </div>

          <div className="sticky bottom-0 flex items-center justify-end gap-2 px-5 py-4 border-t border-white/[0.06] bg-[#12121a]">
            {step === 'form' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/[0.05]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting || loading || eligible === false || !form.adAccountId}
                  onClick={handleReview}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold disabled:opacity-40"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Review Boost
                </button>
              </>
            )}
            {step === 'review' && (
              <>
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/[0.05]"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={submitting || !readiness?.boostCreationEnabled}
                  onClick={handleCreate}
                  title={
                    readiness?.boostCreationEnabled
                      ? 'Create Boost via Meta Marketing API'
                      : 'Locked until Meta app is Live/Public and Privacy Policy is configured'
                  }
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:cursor-not-allowed ${
                    readiness?.boostCreationEnabled
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white disabled:opacity-40'
                      : 'bg-white/[0.06] border border-amber-500/30 text-amber-200/70 opacity-70'
                  }`}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  {readiness?.boostCreationEnabled ? 'Create Boost' : 'Create Boost (Locked)'}
                </button>
              </>
            )}
            {(step === 'success' || step === 'error') && (
              <>
                {step === 'error' && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep('form');
                      setError(null);
                      setErrorCode(null);
                      // Explicit user action only — never auto Create Boost again
                    }}
                    className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/[0.05]"
                  >
                    Back to form
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.08] text-white text-sm font-medium"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-200 text-right break-all">{value}</span>
    </div>
  );
}

function ChecklistRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-gray-400">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border ${
          ok
            ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
            : 'text-amber-200 bg-amber-500/10 border-amber-500/20'
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-amber-400'}`}
        />
        {value}
      </span>
    </div>
  );
}
