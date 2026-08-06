import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { StatsGrid } from './StatsGrid';
import { ProfileCard } from './ProfileCard';
import { MediaGrid } from './MediaGrid';
import { AnalyticsSection } from './AnalyticsSection';
import { TopPerformingPosts } from './TopPerformingPosts';
import { SmartInsightsSection } from './SmartInsightsSection';
import { computeAnalytics, generateSmartInsights } from '../utils/analyticsCalculator';
import { exportDashboardToCSV } from '../utils/exportUtility';
import type { DashboardData } from '../types/instagram';

interface DashboardProps {
  data: DashboardData;
  isRefreshing: boolean;
  onRefresh: () => void;
  onDisconnect: () => void;
}

export function Dashboard({ data, isRefreshing, onRefresh, onDisconnect }: DashboardProps) {
  const sharesCount = useMemo(() => {
    const metric = data.insights.find(i => i.name === 'shares');
    return metric?.values?.[0]?.value ?? null;
  }, [data.insights]);

  const savesCount = useMemo(() => {
    const metric = data.insights.find(i => i.name === 'saves');
    return metric?.values?.[0]?.value ?? null;
  }, [data.insights]);

  const computed = useMemo(
    () => computeAnalytics(data.media, data.profile.followers_count, sharesCount, savesCount),
    [data.media, data.profile.followers_count, sharesCount, savesCount]
  );

  const smartInsights = useMemo(
    () => generateSmartInsights(computed, data.media.length),
    [computed, data.media.length]
  );

  const handleExport = () => {
    exportDashboardToCSV(data, computed);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative"
    >
      {/* Sync indicator bar */}
      {isRefreshing && (
        <div className="absolute top-0 left-4 right-4 h-1 bg-violet-600/30 overflow-hidden rounded-full z-20">
          <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 w-1/3 animate-[pulse_1s_infinite]" />
        </div>
      )}

      {/* Profile */}
      <ProfileCard
        profile={data.profile}
        pageName={data.page.name}
        pageId={data.page.id}
        lastSyncTime={data.lastSyncTime}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}
        onExport={handleExport}
        onDisconnect={onDisconnect}
      />

      {/* Stats Overview */}
      <StatsGrid profile={data.profile} insights={data.insights} computed={computed} />

      {/* Top Performing Posts */}
      <TopPerformingPosts computed={computed} />

      {/* Media Grid (with Search, Filter, Sort) */}
      <MediaGrid media={data.media} />

      {/* Analytics Charts */}
      <AnalyticsSection insights={data.insights} media={data.media} computed={computed} />

      {/* AI Smart Recommendations */}
      <SmartInsightsSection insights={smartInsights} />
    </motion.div>
  );
}
