import type { DashboardData, ComputedAnalytics } from '../types/instagram';

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
    return '"' + field.replace(/"/g, '""') + '"';
  }
  return field;
}

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
  rows.push(['Total Likes', computed.totalLikes.toString()]);
  rows.push(['Total Comments', computed.totalComments.toString()]);
  rows.push(['Total Engagement', computed.totalEngagement.toString()]);
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
    const captionPreview = m.caption ? m.caption.slice(0, 100) : '';
    rows.push([
      m.id,
      m.media_type,
      m.timestamp,
      (m.like_count || 0).toString(),
      (m.comments_count || 0).toString(),
      m.permalink,
      captionPreview,
    ]);
  });

  // Build CSV using Blob (safe for all Unicode characters)
  const csvString = rows.map(row => row.map(escapeCsvField).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `instagram_report_${data.profile.username}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
