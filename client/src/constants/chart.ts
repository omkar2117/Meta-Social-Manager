export const CHART_COLORS = {
  primary: '#8b5cf6',
  primaryLight: '#a78bfa',
  primaryDark: '#7c3aed',
  secondary: '#06b6d4',
  secondaryLight: '#22d3ee',
  accent: '#f472b6',
  accentLight: '#f9a8d4',
  success: '#34d399',
  warning: '#fbbf24',
  grid: 'rgba(255, 255, 255, 0.06)',
  text: 'rgba(255, 255, 255, 0.5)',
  tooltip: 'rgba(15, 15, 25, 0.95)',
} as const;

export const CHART_GRADIENT_IDS = {
  followers: 'followersGradient',
  engagement: 'engagementGradient',
  reach: 'reachGradient',
  views: 'viewsGradient',
  likes: 'likesGradient',
  comments: 'commentsGradient',
  shares: 'sharesGradient',
} as const;
