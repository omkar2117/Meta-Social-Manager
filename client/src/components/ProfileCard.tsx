import { motion } from 'framer-motion';
import { RefreshCw, ExternalLink, Users, UserPlus, Grid3X3, LogOut, CheckCircle2, Clock, ShieldCheck, Camera, Download } from 'lucide-react';
import { formatNumber, formatRelativeTime } from '../utils/formatters';
import type { InstagramProfile } from '../types/instagram';

interface ProfileCardProps {
  profile: InstagramProfile;
  pageName: string;
  pageId: string;
  lastSyncTime?: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onExport: () => void;
  onDisconnect: () => void;
}

export function ProfileCard({
  profile,
  pageName,
  pageId,
  lastSyncTime,
  isRefreshing,
  onRefresh,
  onExport,
  onDisconnect,
}: ProfileCardProps) {
  const instagramUrl = `https://www.instagram.com/${profile.username}/`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5 }}
      className="glass-card p-6 md:p-8"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Avatar */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="relative shrink-0"
        >
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full ring-2 ring-violet-500/30 ring-offset-2 ring-offset-[#0a0a0f] overflow-hidden">
            <img
              src={profile.profile_picture_url}
              alt={profile.username}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${profile.username}&background=7c3aed&color=fff&size=128`;
              }}
            />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#0a0a0f] flex items-center justify-center" title="Connected">
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
        </motion.div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-xl md:text-2xl font-bold text-white truncate">
              @{profile.username}
            </h2>
            {profile.is_verified && (
              <span title="Verified Account">
                <CheckCircle2 className="w-5 h-5 text-violet-400 fill-violet-400/20" />
              </span>
            )}
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:text-white text-xs font-medium transition-colors"
            >
              <Camera className="w-3 h-3" />
              Open Instagram
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {profile.name && (
            <p className="text-sm text-gray-400 mb-1">{profile.name}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
            <span>
              Connected via <span className="text-gray-300 font-medium">{pageName}</span>
            </span>
            <span className="text-gray-700">•</span>
            <span className="font-mono text-gray-400">Account ID: {profile.id}</span>
            {pageId && (
              <>
                <span className="text-gray-700">•</span>
                <span className="font-mono text-gray-400">Page ID: {pageId}</span>
              </>
            )}
          </div>

          {profile.biography && (
            <p className="text-sm text-gray-300 leading-relaxed max-w-xl line-clamp-2 mb-3">
              {profile.biography}
            </p>
          )}

          {/* Connected Status & Last Sync */}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Connected</span>
            </div>
            {lastSyncTime && (
              <div className="flex items-center gap-1.5 text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span>Last sync: {formatRelativeTime(lastSyncTime)}</span>
              </div>
            )}
          </div>

          {/* Inline Stats */}
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="w-3.5 h-3.5 text-gray-500" />
              <span className="font-semibold text-white">{formatNumber(profile.followers_count)}</span>
              <span className="text-gray-500">followers</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <UserPlus className="w-3.5 h-3.5 text-gray-500" />
              <span className="font-semibold text-white">{formatNumber(profile.follows_count)}</span>
              <span className="text-gray-500">following</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Grid3X3 className="w-3.5 h-3.5 text-gray-500" />
              <span className="font-semibold text-white">{formatNumber(profile.media_count)}</span>
              <span className="text-gray-500">posts</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0 self-start">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/20"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Syncing...' : 'Refresh'}
          </button>
          <button
            onClick={onExport}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 text-sm font-medium transition-all duration-200 border border-white/[0.08]"
            title="Export Report CSV"
          >
            <Download className="w-4 h-4 text-violet-400" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={onDisconnect}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.06] hover:bg-red-500/10 text-gray-400 hover:text-red-400 text-sm font-medium transition-all duration-200 border border-white/[0.08] hover:border-red-500/20"
            title="Disconnect"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
