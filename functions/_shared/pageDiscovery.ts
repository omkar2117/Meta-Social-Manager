/**
 * Discover Facebook Pages the current user token can actually access.
 * Does not hardcode Page / Instagram / Ad Account IDs.
 * Does not call Marketing create endpoints.
 */

export type GraphGetFn = (
  path: string,
  query?: Record<string, string | number>
) => Promise<any>;

export type PageDiscoverySource =
  | 'me_accounts'
  | 'assigned_pages'
  | 'business_owned_pages'
  | 'business_client_pages'
  | 'ad_account_promote_pages';

export interface DiscoveredPage {
  id: string;
  name: string;
  access_token?: string;
  category?: string;
  instagram_business_account?: { id: string };
  source: PageDiscoverySource;
}

const FALLBACK_PAGE_FIELDS = 'id,name,category,instagram_business_account';

function asList(res: unknown): any[] {
  if (res && typeof res === 'object' && Array.isArray((res as { data?: unknown }).data)) {
    return (res as { data: any[] }).data;
  }
  return [];
}

function addPages(
  map: Map<string, DiscoveredPage>,
  items: any[],
  source: PageDiscoverySource
): void {
  for (const item of items) {
    const id = item?.id != null ? String(item.id) : '';
    if (!id) continue;
    if (map.has(id)) continue;
    map.set(id, {
      id,
      name: item.name != null ? String(item.name) : '',
      access_token: item.access_token != null ? String(item.access_token) : undefined,
      category: item.category != null ? String(item.category) : undefined,
      instagram_business_account: item.instagram_business_account?.id
        ? { id: String(item.instagram_business_account.id) }
        : undefined,
      source,
    });
  }
}

async function verifyAccessiblePages(
  graphGet: GraphGetFn,
  candidates: Map<string, DiscoveredPage>
): Promise<DiscoveredPage[]> {
  const verified: DiscoveredPage[] = [];
  for (const page of candidates.values()) {
    try {
      const live = await graphGet(`/${page.id}`, {
        fields: 'id,name,category,instagram_business_account',
      });
      if (!live?.id || !live?.name) continue;
      verified.push({
        ...page,
        id: String(live.id),
        name: String(live.name),
        category: live.category != null ? String(live.category) : page.category,
        instagram_business_account: live.instagram_business_account?.id
          ? { id: String(live.instagram_business_account.id) }
          : undefined,
      });
    } catch {
      // Token cannot access this Page — skip it.
    }
  }
  return verified;
}

/**
 * 1. GET /me/accounts (unchanged primary path).
 * 2. If empty, discover candidate Page IDs from token-accessible Meta edges,
 *    then verify each with GET /{page-id}?fields=id,name,instagram_business_account.
 */
export async function discoverFacebookPages(graphGet: GraphGetFn): Promise<DiscoveredPage[]> {
  const accounts = await graphGet('/me/accounts');
  const fromAccounts = asList(accounts);
  if (fromAccounts.length > 0) {
    const map = new Map<string, DiscoveredPage>();
    addPages(map, fromAccounts, 'me_accounts');
    return [...map.values()];
  }

  const candidates = new Map<string, DiscoveredPage>();

  try {
    const assigned = await graphGet('/me/assigned_pages', { fields: FALLBACK_PAGE_FIELDS });
    addPages(candidates, asList(assigned), 'assigned_pages');
  } catch {
    // Optional fallback
  }

  try {
    const businesses = await graphGet('/me/businesses', { fields: 'id,name' });
    for (const biz of asList(businesses)) {
      if (!biz?.id) continue;
      try {
        const owned = await graphGet(`/${biz.id}/owned_pages`, { fields: FALLBACK_PAGE_FIELDS });
        addPages(candidates, asList(owned), 'business_owned_pages');
      } catch {
        // Optional per-business edge
      }
      try {
        const client = await graphGet(`/${biz.id}/client_pages`, { fields: FALLBACK_PAGE_FIELDS });
        addPages(candidates, asList(client), 'business_client_pages');
      } catch {
        // Optional per-business edge
      }
    }
  } catch {
    // Optional fallback
  }

  try {
    const adAccounts = await graphGet('/me/adaccounts', { fields: 'id' });
    for (const act of asList(adAccounts)) {
      if (!act?.id) continue;
      try {
        const promote = await graphGet(`/${act.id}/promote_pages`, { fields: FALLBACK_PAGE_FIELDS });
        addPages(candidates, asList(promote), 'ad_account_promote_pages');
      } catch {
        // Optional per-ad-account edge
      }
    }
  } catch {
    // Optional fallback
  }

  return verifyAccessiblePages(graphGet, candidates);
}

export function selectFirstPageWithInstagram(
  pages: DiscoveredPage[]
): DiscoveredPage | null {
  for (const page of pages) {
    if (page.instagram_business_account?.id) return page;
  }
  return null;
}
