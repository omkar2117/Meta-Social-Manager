import type { DashboardData, ComputedAnalytics } from '../types/instagram';

export function exportDashboardToCSV(data: DashboardData, computed: ComputedAnalytics) {
  const rows: string[][] = [];

  // Section 1: Profile Summary
  rows.push(['--- PROFILE SUMMARY ---']);
  rows.push(['Username', `@${data.profile.username}`]);
  rows.push(['Display Name', data.profile.name || 'N/A']);
  rows.push(['Instagram Account ID', data.profile.id]);
  rows.push(['Connected Facebook Page', data.page.name]);
  rows.push(['Facebook Page ID', data.page.id]);
  rows.push(['Followers', data.profile.followers_count.toString()]);
  rows.push(['Following', data.profile.follows_count.toString()]);
  rows.push(['Total Media Posts', data.profile.media_count.toString()]);
  rows.push(['Last Sync', data.lastSyncTime || new Date().toISOString()]);
  rows.push([]);

  // Section 2: Computed Metrics
  rows.push(['--- PERFORMANCE METRICS ---']);
  rows.push(['Engagement Rate (%)', `${computed.engagementRate}%`]);
  rows.push(['Avg Likes / Post', computed.avgLikesPerPost.toString()]);
  rows.push(['Avg Comments / Post', computed.avgCommentsPerPost.toString()]);
  rows.push(['Posts This Week', computed.postsThisWeek.toString()]);
  rows.push(['Posts This Month', computed.postsThisMonth.toString()]);
  rows.push(['Images Count', computed.mediaTypeDistribution.images.toString()]);
  rows.push(['Videos Count', computed.mediaTypeDistribution.videos.toString()]);
  rows.push(['Carousels Count', computed.mediaTypeDistribution.carousels.toString()]);
  rows.push(['Reels Count', computed.mediaTypeDistribution.reels.toString()]);
  rows.push([]);

  // Section 3: Media Posts List
  rows.push(['--- MEDIA POSTS DETAILS ---']);
  rows.push(['Post ID', 'Media Type', 'Timestamp', 'Likes', 'Comments', 'Permalink', 'Caption Preview']);

  data.media.forEach(m => {
    const captionClean = m.caption ? `"${m.caption.replace(/"/g, '""').slice(0, 100)}"` : '';
    rows.push([
      m.id,
      m.media_type,
      m.timestamp,
      (m.like_count || 0).toString(),
      (m.comments_count || 0).toString(),
      m.permalink,
      captionClean,
    ]);
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `instagram_report_${data.profile.username}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
