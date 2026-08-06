import { Users, UserPlus, Grid3X3, Eye, Heart, TrendingUp, BarChart3, Repeat2, Image, Film, Layers, Clapperboard, CalendarDays, Target, Bookmark } from 'lucide-react';
import { StatCard } from './StatCard';
import type { InstagramProfile, InsightMetric, ComputedAnalytics } from '../types/instagram';

interface StatsGridProps {
  profile: InstagramProfile;
  insights: InsightMetric[];
  computed: ComputedAnalytics;
}

function getInsightValue(insights: InsightMetric[], metricName: string): number | null {
  const metric = insights.find((i) => i.name === metricName);
  if (!metric || !metric.values || !metric.values.length) return null;
  if (metric.values.length === 1) {
    const val = metric.values[0].value;
    return typeof val === 'number' ? val : null;
  }
  const lastValue = metric.values[metric.values.length - 1];
  return typeof lastValue?.value === 'number' ? lastValue.value : null;
}

export function StatsGrid({ profile, insights, computed }: StatsGridProps) {
  // Profile-based metrics (always available)
  const followers = profile.followers_count;
  const following = profile.follows_count;
  const posts = profile.media_count;

  // Insight-based metrics (only if provided by API, otherwise null -> "Not Available")
  const reach = getInsightValue(insights, 'reach');
  const shares = getInsightValue(insights, 'shares');
  const saves = getInsightValue(insights, 'saves');

  // Media calculated metrics
  const { images, videos, carousels, reels } = computed.mediaTypeDistribution;

  const stats = [
    { label: 'Followers', value: followers, icon: Users, gradient: 'from-violet-500 to-purple-600' },
    { label: 'Following', value: following, icon: UserPlus, gradient: 'from-cyan-500 to-blue-600' },
    { label: 'Posts', value: posts, icon: Grid3X3, gradient: 'from-pink-500 to-rose-600' },
    { label: 'Reach', value: reach, icon: Eye, gradient: 'from-emerald-500 to-green-600' },
    { label: 'Engagement', value: computed.totalEngagement, icon: Heart, gradient: 'from-amber-500 to-orange-600' },
    { label: 'Total Likes', value: computed.totalLikes, icon: TrendingUp, gradient: 'from-indigo-500 to-violet-600' },
    { label: 'Total Comments', value: computed.totalComments, icon: BarChart3, gradient: 'from-blue-500 to-indigo-600' },
    { label: 'Shares', value: shares, icon: Repeat2, gradient: 'from-teal-500 to-emerald-600' },
    { label: 'Saves', value: saves, icon: Bookmark, gradient: 'from-yellow-500 to-amber-600' },
    { label: 'Images', value: images, icon: Image, gradient: 'from-sky-500 to-blue-600' },
    { label: 'Videos', value: videos, icon: Film, gradient: 'from-orange-500 to-red-600' },
    { label: 'Carousels', value: carousels, icon: Layers, gradient: 'from-fuchsia-500 to-pink-600' },
    { label: 'Reels', value: reels, icon: Clapperboard, gradient: 'from-rose-500 to-red-600' },
    { label: 'Eng. Rate', value: computed.engagementRate, icon: Target, gradient: 'from-lime-500 to-green-600', suffix: '%' },
    { label: 'Posts/Month', value: computed.postsThisMonth, icon: CalendarDays, gradient: 'from-purple-500 to-indigo-600' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-3">
      {stats.map((stat, i) => (
        <StatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          icon={stat.icon}
          gradient={stat.gradient}
          index={i}
          suffix={stat.suffix}
        />
      ))}
    </div>
  );
}
