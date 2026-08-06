import axios from 'axios';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

// ── Types ──────────────────────────────────────────────

export interface MetaUser {
  id: string;
  name: string;
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
  tasks?: string[];
}

export interface PagesResponse {
  data: FacebookPage[];
  paging?: {
    cursors: { before: string; after: string };
    next?: string;
  };
}

export interface InstagramAccountResponse {
  instagram_business_account?: {
    id: string;
  };
  id: string;
}

export interface InstagramProfile {
  id: string;
  username: string;
  biography: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  profile_picture_url: string;
  name?: string;
  website?: string;
}

export interface InstagramMediaItem {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_product_type?: 'REELS' | 'FEED' | 'STORY';
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

export interface InstagramMediaResponse {
  data: InstagramMediaItem[];
  paging?: {
    cursors: { before: string; after: string };
    next?: string;
  };
}

export interface InsightValue {
  value: number;
  end_time?: string;
}

export interface InsightMetric {
  name: string;
  period: string;
  values: InsightValue[];
  title: string;
  description: string;
  id: string;
}

export interface InsightsResponse {
  data: InsightMetric[];
  paging?: {
    previous: string;
    next: string;
  };
}

// ── API Functions ──────────────────────────────────────

export async function validateToken(accessToken: string): Promise<MetaUser> {
  const { data } = await axios.get<MetaUser>(`${GRAPH_API_BASE}/me`, {
    params: { access_token: accessToken },
  });
  return data;
}

export async function fetchPages(accessToken: string): Promise<PagesResponse> {
  const { data } = await axios.get<PagesResponse>(`${GRAPH_API_BASE}/me/accounts`, {
    params: { access_token: accessToken },
  });
  return data;
}

export async function fetchInstagramAccount(
  pageId: string,
  accessToken: string
): Promise<InstagramAccountResponse> {
  const { data } = await axios.get<InstagramAccountResponse>(`${GRAPH_API_BASE}/${pageId}`, {
    params: {
      fields: 'instagram_business_account',
      access_token: accessToken,
    },
  });
  return data;
}

export async function fetchInstagramProfile(
  igUserId: string,
  accessToken: string
): Promise<InstagramProfile> {
  const { data } = await axios.get<InstagramProfile>(`${GRAPH_API_BASE}/${igUserId}`, {
    params: {
      fields: 'id,username,biography,followers_count,follows_count,media_count,profile_picture_url,name,website',
      access_token: accessToken,
    },
  });
  return data;
}

export async function fetchInstagramMedia(
  igUserId: string,
  accessToken: string,
  limit: number = 30
): Promise<InstagramMediaResponse> {
  const { data } = await axios.get<InstagramMediaResponse>(`${GRAPH_API_BASE}/${igUserId}/media`, {
    params: {
      fields: 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
      limit,
      access_token: accessToken,
    },
  });
  return data;
}

/**
 * Fetch Instagram User Insights using the current supported metrics.
 *
 * IMPORTANT — Meta API deprecations (effective Jan & Apr 2025):
 *   - profile_views, website_clicks, email_contacts, phone_call_clicks → REMOVED
 *   - impressions → REMOVED (replaced by "views" for media, not yet available as user-level metric)
 *
 * Supported user-level metrics (v21.0+):
 *   - reach (period=day, requires since/until)
 *   - follower_count (period=day, requires 100+ followers)
 *   - accounts_engaged (metric_type=total_value, period=day)
 *   - total_interactions, likes, comments, shares, saves, replies, follows_and_unfollows
 *     (metric_type=total_value, period=day)
 *
 * Strategy: We make multiple targeted calls because mixing metrics with different
 * parameter requirements in one call causes the API to reject the entire request.
 */
export async function fetchInstagramInsights(
  igUserId: string,
  accessToken: string
): Promise<InsightsResponse> {
  const allMetrics: InsightMetric[] = [];

  // ── Call 1: total_value metrics (engagement) ────────
  // These work with metric_type=total_value and do NOT require since/until
  try {
    const { data } = await axios.get<InsightsResponse>(`${GRAPH_API_BASE}/${igUserId}/insights`, {
      params: {
        metric: 'accounts_engaged,total_interactions,likes,comments,shares,saves,replies,follows_and_unfollows',
        period: 'day',
        metric_type: 'total_value',
        access_token: accessToken,
      },
    });
    if (data?.data) allMetrics.push(...data.data);
  } catch (err) {
    console.warn('[Insights] total_value metrics failed, trying subset:', (err as Error).message);
    // Fallback: try a minimal subset
    try {
      const { data } = await axios.get<InsightsResponse>(`${GRAPH_API_BASE}/${igUserId}/insights`, {
        params: {
          metric: 'accounts_engaged',
          period: 'day',
          metric_type: 'total_value',
          access_token: accessToken,
        },
      });
      if (data?.data) allMetrics.push(...data.data);
    } catch {
      console.warn('[Insights] accounts_engaged fallback also failed');
    }
  }

  // ── Call 2: reach (time series with since/until) ────
  // reach requires period=day with since and until as Unix timestamps
  try {
    const now = Math.floor(Date.now() / 1000);
    const twoDaysAgo = now - 2 * 86400; // 2 days ago

    const { data } = await axios.get<InsightsResponse>(`${GRAPH_API_BASE}/${igUserId}/insights`, {
      params: {
        metric: 'reach',
        period: 'day',
        since: twoDaysAgo,
        until: now,
        access_token: accessToken,
      },
    });
    if (data?.data) allMetrics.push(...data.data);
  } catch (err) {
    console.warn('[Insights] reach metric failed:', (err as Error).message);
  }

  // ── Call 3: follower_count (requires 100+ followers) ──
  try {
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - 30 * 86400;

    const { data } = await axios.get<InsightsResponse>(`${GRAPH_API_BASE}/${igUserId}/insights`, {
      params: {
        metric: 'follower_count',
        period: 'day',
        since: thirtyDaysAgo,
        until: now,
        access_token: accessToken,
      },
    });
    if (data?.data) allMetrics.push(...data.data);
  } catch (err) {
    console.warn('[Insights] follower_count metric failed (likely < 100 followers):', (err as Error).message);
  }

  return { data: allMetrics };
}
