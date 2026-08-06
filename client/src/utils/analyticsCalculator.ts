import type { InstagramMedia, ComputedAnalytics, SmartInsight } from '../types/instagram';

export function computeAnalytics(media: InstagramMedia[], followersCount: number, sharesCount?: number | null, savesCount?: number | null): ComputedAnalytics {
  const totalPosts = media.length;

  if (totalPosts === 0) {
    return {
      totalLikes: 0,
      totalComments: 0,
      totalEngagement: 0,
      avgLikesPerPost: 0,
      avgCommentsPerPost: 0,
      avgInteractionsPerPost: 0,
      engagementRate: 0,
      postsThisWeek: 0,
      postsThisMonth: 0,
      mediaTypeDistribution: {
        images: 0,
        videos: 0,
        carousels: 0,
        reels: 0,
        imagePct: 0,
        videoPct: 0,
        carouselPct: 0,
        reelsPct: 0,
      },
      topLikedPost: null,
      topCommentedPost: null,
      topEngagedPost: null,
      newestPost: null,
      oldestPost: null,
    };
  }

  // 1. Totals calculated from media objects
  const totalLikes = media.reduce((acc, m) => acc + (m.like_count || 0), 0);
  const totalComments = media.reduce((acc, m) => acc + (m.comments_count || 0), 0);
  const extraEngagement = (sharesCount || 0) + (savesCount || 0);
  const totalEngagement = totalLikes + totalComments + extraEngagement;

  const avgLikesPerPost = Number((totalLikes / totalPosts).toFixed(1));
  const avgCommentsPerPost = Number((totalComments / totalPosts).toFixed(1));
  const avgInteractionsPerPost = Number((totalEngagement / totalPosts).toFixed(1));

  // 2. Engagement Rate = (Total Engagement / Followers) * 100 (or per-post average)
  const engagementRate = followersCount > 0
    ? Number(((totalEngagement / (totalPosts * followersCount)) * 100).toFixed(2))
    : 0;

  // 3. Posting Frequency
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const postsThisWeek = media.filter(m => new Date(m.timestamp) >= oneWeekAgo).length;
  const postsThisMonth = media.filter(m => new Date(m.timestamp) >= oneMonthAgo).length;

  // 4. Media Type Distribution
  let images = 0;
  let videos = 0;
  let carousels = 0;
  let reels = 0;

  media.forEach(m => {
    const isReel = m.media_product_type === 'REELS' ||
                   (m.media_type === 'VIDEO' && (m.caption?.toLowerCase().includes('#reel') || m.caption?.toLowerCase().includes('#reels')));

    if (isReel) {
      reels++;
    } else if (m.media_type === 'CAROUSEL_ALBUM') {
      carousels++;
    } else if (m.media_type === 'VIDEO') {
      videos++;
    } else {
      images++;
    }
  });

  const imagePct = Number(((images / totalPosts) * 100).toFixed(1));
  const videoPct = Number(((videos / totalPosts) * 100).toFixed(1));
  const carouselPct = Number(((carousels / totalPosts) * 100).toFixed(1));
  const reelsPct = Number(((reels / totalPosts) * 100).toFixed(1));

  // 5. Top Performing Posts
  const sortedByLikes = [...media].sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
  const sortedByComments = [...media].sort((a, b) => (b.comments_count || 0) - (a.comments_count || 0));
  const sortedByEngagement = [...media].sort((a, b) => ((b.like_count || 0) + (b.comments_count || 0)) - ((a.like_count || 0) + (a.comments_count || 0)));
  const sortedByDate = [...media].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    totalLikes,
    totalComments,
    totalEngagement,
    avgLikesPerPost,
    avgCommentsPerPost,
    avgInteractionsPerPost,
    engagementRate,
    postsThisWeek,
    postsThisMonth,
    mediaTypeDistribution: {
      images,
      videos,
      carousels,
      reels,
      imagePct,
      videoPct,
      carouselPct,
      reelsPct,
    },
    topLikedPost: sortedByLikes[0] || null,
    topCommentedPost: sortedByComments[0] || null,
    topEngagedPost: sortedByEngagement[0] || null,
    newestPost: sortedByDate[0] || null,
    oldestPost: sortedByDate[sortedByDate.length - 1] || null,
  };
}

export function generateSmartInsights(computed: ComputedAnalytics, totalPosts: number): SmartInsight[] {
  const insights: SmartInsight[] = [];

  if (totalPosts === 0) return insights;

  // Insight 1: Engagement Rate Assessment
  if (computed.engagementRate > 3.0) {
    insights.push({
      id: 'high-er',
      type: 'positive',
      title: 'Exceptional Engagement Rate',
      description: `Your average post engagement rate is ${computed.engagementRate}%, which is significantly higher than the industry average of 1.5%. Your audience is highly active.`,
      impact: 'High',
    });
  } else if (computed.engagementRate > 1.0) {
    insights.push({
      id: 'normal-er',
      type: 'info',
      title: 'Healthy Community Engagement',
      description: `Your current engagement rate is ${computed.engagementRate}%. Maintaining interactive call-to-actions in post captions will help boost comments.`,
      impact: 'Medium',
    });
  } else {
    insights.push({
      id: 'low-er',
      type: 'opportunity',
      title: 'Engagement Growth Opportunity',
      description: `Your engagement rate stands at ${computed.engagementRate}%. Try asking questions in captions and utilizing carousels to increase swipe interactions.`,
      impact: 'High',
    });
  }

  // Insight 2: Format Performance
  const { carouselPct, videoPct, reelsPct } = computed.mediaTypeDistribution;
  if (carouselPct > 40) {
    insights.push({
      id: 'carousel-dominant',
      type: 'positive',
      title: 'Carousel Content Strategy',
      description: `Carousels account for ${carouselPct}% of your posts. Carousels typically yield higher re-impression rates in Instagram feeds.`,
      impact: 'Medium',
    });
  } else {
    insights.push({
      id: 'carousel-opportunity',
      type: 'opportunity',
      title: 'Leverage Multi-Slide Carousels',
      description: `Only ${carouselPct}% of your posts are carousels. Experiment with educational multi-slide posts to increase time spent per post.`,
      impact: 'Medium',
    });
  }

  // Insight 3: Posting Frequency Check
  if (computed.postsThisWeek >= 3) {
    insights.push({
      id: 'consistent-posting',
      type: 'positive',
      title: 'Consistent Publishing Cadence',
      description: `You published ${computed.postsThisWeek} posts in the last 7 days. Consistency helps maintain algorithmic momentum.`,
      impact: 'High',
    });
  } else {
    insights.push({
      id: 'posting-cadence-warning',
      type: 'warning',
      title: 'Increase Weekly Posting Frequency',
      description: `You published ${computed.postsThisWeek} post(s) this week. Aim for at least 3-4 posts per week to maximize reach.`,
      impact: 'High',
    });
  }

  // Insight 4: Short-form Video (Reels)
  if (videoPct + reelsPct === 0) {
    insights.push({
      id: 'no-reels',
      type: 'opportunity',
      title: 'Incorporate Short-Form Video',
      description: 'Your recent feed contains no video content. Video posts and Reels receive preferential discovery distribution in Instagram explore pages.',
      impact: 'High',
    });
  }

  return insights;
}
