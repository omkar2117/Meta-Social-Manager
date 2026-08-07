const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

// Helper to make queries to Meta Graph API
async function metaFetch(url: string, params: Record<string, any>) {
  const query = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null) {
      query.set(key, String(val));
    }
  }
  const fullUrl = `${url}?${query.toString()}`;
  const res = await fetch(fullUrl);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const err = new Error(errData?.error?.message || 'Meta API error');
    (err as any).status = res.status;
    (err as any).data = errData;
    throw err;
  }
  return res.json();
}

function parseMetaError(error: any) {
  if (error.data?.error) {
    const { code, error_subcode, message } = error.data.error;
    if (code === 190) {
      if (error_subcode === 463) {
        return {
          status: 401,
          code: 'TOKEN_EXPIRED',
          message: 'Your access token has expired. Please generate a new one from the Meta Developer Portal.',
        };
      }
      if (error_subcode === 460) {
        return {
          status: 401,
          code: 'PASSWORD_CHANGED',
          message: 'Your access token was invalidated because the password was changed. Please generate a new token.',
        };
      }
      return {
        status: 401,
        code: 'INVALID_TOKEN',
        message: 'Invalid access token. Please check your token and try again.',
        details: message,
      };
    }
    if (code === 10 || code === 200) {
      return {
        status: 403,
        code: 'MISSING_PERMISSION',
        message: 'Missing required permissions. Ensure your token has pages_show_list, instagram_basic, and instagram_manage_insights permissions.',
        details: message,
      };
    }
    if (code === 4 || code === 32 || code === 17) {
      return {
        status: 429,
        code: 'RATE_LIMIT',
        message: 'API rate limit reached. Please wait a moment and try again.',
        details: message,
      };
    }
    if (code === 803 || code === 100) {
      return {
        status: 404,
        code: 'NOT_FOUND',
        message: 'The requested resource was not found. Please verify your account setup.',
        details: message,
      };
    }
    return {
      status: error.status || 500,
      code: 'META_API_ERROR',
      message: message || 'An error occurred with the Meta API. Please try again.',
      details: `Error code: ${code}`,
    };
  }
  return {
    status: error.status || 500,
    code: 'API_ERROR',
    message: error.message || 'An unexpected error occurred. Please try again.',
  };
}

// Target API functions converted to use metaFetch
async function validateToken(accessToken: string) {
  return metaFetch(`${GRAPH_API_BASE}/me`, { access_token: accessToken });
}

async function fetchPages(accessToken: string) {
  return metaFetch(`${GRAPH_API_BASE}/me/accounts`, { access_token: accessToken });
}

async function fetchInstagramAccount(pageId: string, accessToken: string) {
  return metaFetch(`${GRAPH_API_BASE}/${pageId}`, {
    fields: 'instagram_business_account',
    access_token: accessToken,
  });
}

async function fetchInstagramProfile(igUserId: string, accessToken: string) {
  return metaFetch(`${GRAPH_API_BASE}/${igUserId}`, {
    fields: 'id,username,biography,followers_count,follows_count,media_count,profile_picture_url,name,website',
    access_token: accessToken,
  });
}

async function fetchInstagramMedia(igUserId: string, accessToken: string, limit = 30) {
  return metaFetch(`${GRAPH_API_BASE}/${igUserId}/media`, {
    fields: 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
    limit,
    access_token: accessToken,
  });
}

async function fetchInstagramInsights(igUserId: string, accessToken: string) {
  const allMetrics: any[] = [];
  try {
    const data = await metaFetch(`${GRAPH_API_BASE}/${igUserId}/insights`, {
      metric: 'accounts_engaged,total_interactions,likes,comments,shares,saves,replies,follows_and_unfollows',
      period: 'day',
      metric_type: 'total_value',
      access_token: accessToken,
    });
    if (data?.data) allMetrics.push(...data.data);
  } catch (err: any) {
    try {
      const data = await metaFetch(`${GRAPH_API_BASE}/${igUserId}/insights`, {
        metric: 'accounts_engaged',
        period: 'day',
        metric_type: 'total_value',
        access_token: accessToken,
      });
      if (data?.data) allMetrics.push(...data.data);
    } catch {
      // Ignored
    }
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const twoDaysAgo = now - 2 * 86400;
    const data = await metaFetch(`${GRAPH_API_BASE}/${igUserId}/insights`, {
      metric: 'reach',
      period: 'day',
      since: twoDaysAgo,
      until: now,
      access_token: accessToken,
    });
    if (data?.data) allMetrics.push(...data.data);
  } catch {}

  try {
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - 30 * 86400;
    const data = await metaFetch(`${GRAPH_API_BASE}/${igUserId}/insights`, {
      metric: 'follower_count',
      period: 'day',
      since: thirtyDaysAgo,
      until: now,
      access_token: accessToken,
    });
    if (data?.data) allMetrics.push(...data.data);
  } catch {}

  return { data: allMetrics };
}

// Router handler matching express endpoints
export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Set CORS headers
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  });

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers, status: 204 });
  }

  try {
    // GET /api/health
    if (path === '/api/health' && request.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'ok',
        environment: 'production',
        timestamp: new Date().toISOString()
      }), { headers });
    }

    // POST calls only for endpoints below
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }), { headers, status: 405 });
    }

    const body: any = await request.json().catch(() => ({}));

    if (path === '/api/meta/validate') {
      const { accessToken } = body;
      if (!accessToken) {
        return new Response(JSON.stringify({ code: 'MISSING_TOKEN', message: 'Access token is required.' }), { headers, status: 400 });
      }
      const user = await validateToken(accessToken);
      return new Response(JSON.stringify({ success: true, user }), { headers });
    }

    if (path === '/api/meta/pages') {
      const { accessToken } = body;
      if (!accessToken) {
        return new Response(JSON.stringify({ code: 'MISSING_TOKEN', message: 'Access token is required.' }), { headers, status: 400 });
      }
      const pages = await fetchPages(accessToken);
      return new Response(JSON.stringify({ success: true, pages: pages.data }), { headers });
    }

    if (path === '/api/meta/instagram-account') {
      const { accessToken, pageId } = body;
      if (!accessToken || !pageId) {
        return new Response(JSON.stringify({ code: 'MISSING_PARAMS', message: 'Access token and page ID are required.' }), { headers, status: 400 });
      }
      const account = await fetchInstagramAccount(pageId, accessToken);
      return new Response(JSON.stringify({ success: true, account }), { headers });
    }

    if (path === '/api/meta/instagram-profile') {
      const { accessToken, igUserId } = body;
      if (!accessToken || !igUserId) {
        return new Response(JSON.stringify({ code: 'MISSING_PARAMS', message: 'Access token and Instagram user ID are required.' }), { headers, status: 400 });
      }
      const profile = await fetchInstagramProfile(igUserId, accessToken);
      return new Response(JSON.stringify({ success: true, profile }), { headers });
    }

    if (path === '/api/meta/instagram-media') {
      const { accessToken, igUserId } = body;
      if (!accessToken || !igUserId) {
        return new Response(JSON.stringify({ code: 'MISSING_PARAMS', message: 'Access token and Instagram user ID are required.' }), { headers, status: 400 });
      }
      const media = await fetchInstagramMedia(igUserId, accessToken);
      return new Response(JSON.stringify({ success: true, media: media.data }), { headers });
    }

    if (path === '/api/meta/instagram-insights') {
      const { accessToken, igUserId } = body;
      if (!accessToken || !igUserId) {
        return new Response(JSON.stringify({ code: 'MISSING_PARAMS', message: 'Access token and Instagram user ID are required.' }), { headers, status: 400 });
      }
      const insights = await fetchInstagramInsights(igUserId, accessToken);
      return new Response(JSON.stringify({ success: true, insights: insights.data }), { headers });
    }

    if (path === '/api/meta/connect') {
      const { accessToken } = body;
      if (!accessToken) {
        return new Response(JSON.stringify({ code: 'MISSING_TOKEN', message: 'Access token is required.' }), { headers, status: 400 });
      }

      const user = await validateToken(accessToken);
      const pagesResponse = await fetchPages(accessToken);
      if (!pagesResponse.data || pagesResponse.data.length === 0) {
        return new Response(JSON.stringify({
          code: 'NO_PAGES',
          message: 'No Facebook Pages found. Your account must manage at least one Facebook Page connected to an Instagram Business Account.',
        }), { headers, status: 404 });
      }

      let igUserId: string | null = null;
      let connectedPage = pagesResponse.data[0];

      for (const page of pagesResponse.data) {
        const accountResponse = await fetchInstagramAccount(page.id, accessToken);
        if (accountResponse.instagram_business_account) {
          igUserId = accountResponse.instagram_business_account.id;
          connectedPage = page;
          break;
        }
      }

      if (!igUserId) {
        return new Response(JSON.stringify({
          code: 'NO_INSTAGRAM_ACCOUNT',
          message: 'No Instagram Business Account linked to any of your Facebook Pages. Please connect an Instagram Business or Creator account to your Facebook Page first.',
        }), { headers, status: 404 });
      }

      const profile = await fetchInstagramProfile(igUserId, accessToken);
      const mediaResponse = await fetchInstagramMedia(igUserId, accessToken);
      const insightsResponse = await fetchInstagramInsights(igUserId, accessToken);

      return new Response(JSON.stringify({
        success: true,
        data: {
          user,
          page: {
            id: connectedPage.id,
            name: connectedPage.name,
            category: connectedPage.category,
          },
          profile,
          media: mediaResponse.data,
          insights: insightsResponse.data,
        },
      }), { headers });
    }

    return new Response(JSON.stringify({ code: 'NOT_FOUND', message: 'Endpoint not found.' }), { headers, status: 404 });

  } catch (error: any) {
    const appError = parseMetaError(error);
    return new Response(JSON.stringify(appError), { headers, status: appError.status });
  }
};
