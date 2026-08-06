// ── Meta API Error ─────────────────────────────────────

export interface MetaApiError {
  status: number;
  code: string;
  message: string;
  details?: string;
}

// ── Meta Connect Response ──────────────────────────────

export interface MetaConnectResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      name: string;
    };
    page: {
      id: string;
      name: string;
      category: string;
    };
    profile: {
      id: string;
      username: string;
      biography: string;
      followers_count: number;
      follows_count: number;
      media_count: number;
      profile_picture_url: string;
      name?: string;
      website?: string;
    };
    media: Array<{
      id: string;
      caption?: string;
      media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
      media_url?: string;
      thumbnail_url?: string;
      permalink: string;
      timestamp: string;
      like_count?: number;
      comments_count?: number;
    }>;
    insights: Array<{
      name: string;
      period: string;
      values: Array<{ value: number; end_time?: string }>;
      title: string;
      description: string;
      id: string;
    }>;
  };
}

// ── App State ──────────────────────────────────────────

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';
