import { TrendingUp, Users, Heart, Eye, ThumbsUp, MessageCircle, Share2, Bookmark, UserPlus, PieChart } from 'lucide-react';
import { ChartCard } from './ChartCard';
import { MediaDistributionChart } from './MediaDistributionChart';
import { CHART_COLORS } from '../constants/chart';
import type { InstagramMedia, InsightMetric, ComputedAnalytics } from '../types/instagram';

interface AnalyticsSectionProps {
  insights: InsightMetric[];
  media: InstagramMedia[];
  computed: ComputedAnalytics;
}

function generateMediaChartData(media: InstagramMedia[], field: 'like_count' | 'comments_count') {
  return media
    .slice(0, 15)
    .reverse()
    .map((item, i) => ({
      name: `P${i + 1}`,
      value: (item[field] as number) || 0,
    }));
}

function generateInsightChartData(insights: InsightMetric[], metricName: string) {
  const metric = insights.find((i) => i.name === metricName);
  if (!metric || !metric.values || !metric.values.length) return [];
  if (metric.values.length === 1) {
    return [{ name: 'Total', value: metric.values[0].value }];
  }
  return metric.values.map((v, i) => ({
    name: v.end_time
      ? new Date(v.end_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : `Day ${i + 1}`,
    value: v.value,
  }));
}

export function AnalyticsSection({ insights, media, computed }: AnalyticsSectionProps) {
  const charts = [
    {
      title: 'Reach',
      icon: Eye,
      data: generateInsightChartData(insights, 'reach'),
      color: CHART_COLORS.primary,
      gradientId: 'reachGradient',
    },
    {
      title: 'Engagement',
      icon: Heart,
      data: generateInsightChartData(insights, 'total_interactions').length > 0
        ? generateInsightChartData(insights, 'total_interactions')
        : generateInsightChartData(insights, 'accounts_engaged'),
      color: CHART_COLORS.accent,
      gradientId: 'engagementGradient',
    },
    {
      title: 'Follower Growth',
      icon: UserPlus,
      data: generateInsightChartData(insights, 'follower_count'),
      color: CHART_COLORS.success,
      gradientId: 'followersGradient',
    },
    {
      title: 'Follows & Unfollows',
      icon: Users,
      data: generateInsightChartData(insights, 'follows_and_unfollows'),
      color: CHART_COLORS.secondary,
      gradientId: 'viewsGradient',
    },
    {
      title: 'Saves',
      icon: Bookmark,
      data: generateInsightChartData(insights, 'saves'),
      color: CHART_COLORS.warning,
      gradientId: 'savesGradient',
    },
    {
      title: 'Likes per Post',
      icon: ThumbsUp,
      data: generateMediaChartData(media, 'like_count'),
      color: '#f472b6',
      gradientId: 'likesGradient',
    },
    {
      title: 'Comments per Post',
      icon: MessageCircle,
      data: generateMediaChartData(media, 'comments_count'),
      color: CHART_COLORS.primaryLight,
      gradientId: 'commentsGradient',
    },
  ];

  const activeCharts = charts.filter((c) => c.data.length > 0);

  if (activeCharts.length === 0 && media.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Share2 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Insights are not available for this account.</p>
        <p className="text-gray-600 text-xs mt-1">
          Insights require an Instagram Business or Creator account with recent activity.
          Data may be delayed by up to 48 hours.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-5 h-5 text-violet-400" />
        <h3 className="text-lg font-semibold text-white">Analytics</h3>
        <span className="text-xs text-gray-500 ml-1">
          ({activeCharts.length} metric{activeCharts.length !== 1 ? 's' : ''} available)
        </span>
      </div>

      {/* Area/Line Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {activeCharts.map((chart, i) => (
          <ChartCard
            key={chart.title}
            title={chart.title}
            icon={chart.icon}
            data={chart.data}
            color={chart.color}
            gradientId={chart.gradientId}
            index={i}
          />
        ))}
      </div>

      {/* Computed Analytics Row */}
      {media.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Media Distribution Pie */}
          <MediaDistributionChart distribution={computed.mediaTypeDistribution} />

          {/* Computed Averages Summary */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <PieChart className="w-4 h-4 text-violet-400" />
              <h4 className="text-sm font-semibold text-white">Performance Summary</h4>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Avg Likes / Post</span>
                <span className="text-white font-semibold">{computed.avgLikesPerPost}</span>
              </div>
              <div className="w-full h-px bg-white/[0.06]" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Avg Comments / Post</span>
                <span className="text-white font-semibold">{computed.avgCommentsPerPost}</span>
              </div>
              <div className="w-full h-px bg-white/[0.06]" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Avg Interactions / Post</span>
                <span className="text-white font-semibold">{computed.avgInteractionsPerPost}</span>
              </div>
              <div className="w-full h-px bg-white/[0.06]" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Engagement Rate</span>
                <span className="text-emerald-400 font-bold">{computed.engagementRate}%</span>
              </div>
              <div className="w-full h-px bg-white/[0.06]" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Posts This Week</span>
                <span className="text-white font-semibold">{computed.postsThisWeek}</span>
              </div>
              <div className="w-full h-px bg-white/[0.06]" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Posts This Month</span>
                <span className="text-white font-semibold">{computed.postsThisMonth}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
