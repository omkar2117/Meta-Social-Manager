// ── Instagram Profile ──────────────────────────────────

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
  is_verified?: boolean;
}

// ── Instagram Media ────────────────────────────────────

export interface InstagramMedia {
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

// ── Instagram Insights ─────────────────────────────────

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

// ── Computed Analytics ─────────────────────────────────

export interface ComputedAnalytics {
  totalLikes: number;
  totalComments: number;
  totalEngagement: number;
  avgLikesPerPost: number;
  avgCommentsPerPost: number;
  avgInteractionsPerPost: number;
  engagementRate: number; // ((total likes + comments) / followers) * 100
  postsThisWeek: number;
  postsThisMonth: number;
  mediaTypeDistribution: {
    images: number;
    videos: number;
    carousels: number;
    reels: number;
    imagePct: number;
    videoPct: number;
    carouselPct: number;
    reelsPct: number;
  };
  topLikedPost: InstagramMedia | null;
  topCommentedPost: InstagramMedia | null;
  topEngagedPost: InstagramMedia | null;
  newestPost: InstagramMedia | null;
  oldestPost: InstagramMedia | null;
}

// ── AI Smart Insight ───────────────────────────────────

export interface SmartInsight {
  id: string;
  type: 'positive' | 'warning' | 'info' | 'opportunity';
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
}

// ── Dashboard Data ─────────────────────────────────────

export interface DashboardData {
  profile: InstagramProfile;
  media: InstagramMedia[];
  insights: InsightMetric[];
  page: {
    id: string;
    name: string;
    category: string;
  };
  user: {
    id: string;
    name: string;
  };
  lastSyncTime?: string;
}
