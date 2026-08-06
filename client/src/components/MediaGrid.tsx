import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Calendar, Grid3X3, ChevronDown } from 'lucide-react';
import { MediaCard } from './MediaCard';
import type { InstagramMedia } from '../types/instagram';

interface MediaGridProps {
  media: InstagramMedia[];
}

type DateFilter = 'all' | '7d' | '30d' | '90d';
type TypeFilter = 'all' | 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS';

export function MediaGrid({ media }: MediaGridProps) {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'likes' | 'comments'>('newest');
  const [showAll, setShowAll] = useState(false);

  const filteredMedia = useMemo(() => {
    return media.filter(item => {
      // 1. Search Query (caption)
      if (search.trim() && !item.caption?.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }

      // 2. Type Filter
      if (typeFilter === 'REELS') {
        const isReels = item.media_product_type === 'REELS' || (item.media_type === 'VIDEO' && item.caption?.toLowerCase().includes('#reel'));
        if (!isReels) return false;
      } else if (typeFilter !== 'all' && item.media_type !== typeFilter) {
        return false;
      }

      // 3. Date Filter
      if (dateFilter !== 'all') {
        const itemDate = new Date(item.timestamp).getTime();
        const now = Date.now();
        const daysMs = dateFilter === '7d' ? 7 * 86400000 : dateFilter === '30d' ? 30 * 86400000 : 90 * 86400000;
        if (now - itemDate > daysMs) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'likes') return (b.like_count || 0) - (a.like_count || 0);
      if (sortBy === 'comments') return (b.comments_count || 0) - (a.comments_count || 0);
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [media, search, dateFilter, typeFilter, sortBy]);

  const displayMedia = showAll ? filteredMedia : filteredMedia.slice(0, 12);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-4"
    >
      {/* Header & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-violet-400" />
          Media Grid
          <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400">
            {filteredMedia.length} {filteredMedia.length === 1 ? 'post' : 'posts'}
          </span>
        </h3>

        {/* Filter / Search Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-48 min-w-[140px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search captions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/40"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="appearance-none pl-8 pr-7 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-gray-300 focus:outline-none focus:border-violet-500/40 cursor-pointer"
            >
              <option value="all" className="bg-[#0a0a0f] text-white">All Types</option>
              <option value="IMAGE" className="bg-[#0a0a0f] text-white">Images</option>
              <option value="VIDEO" className="bg-[#0a0a0f] text-white">Videos</option>
              <option value="CAROUSEL_ALBUM" className="bg-[#0a0a0f] text-white">Carousels</option>
              <option value="REELS" className="bg-[#0a0a0f] text-white">Reels</option>
            </select>
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="appearance-none pl-8 pr-7 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-gray-300 focus:outline-none focus:border-violet-500/40 cursor-pointer"
            >
              <option value="all" className="bg-[#0a0a0f] text-white">All Time</option>
              <option value="7d" className="bg-[#0a0a0f] text-white">Last 7 Days</option>
              <option value="30d" className="bg-[#0a0a0f] text-white">Last 30 Days</option>
              <option value="90d" className="bg-[#0a0a0f] text-white">Last 90 Days</option>
            </select>
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
          </div>

          {/* Sort By */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'likes' | 'comments')}
              className="appearance-none px-3 pr-7 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-gray-300 focus:outline-none focus:border-violet-500/40 cursor-pointer"
            >
              <option value="newest" className="bg-[#0a0a0f] text-white">Newest First</option>
              <option value="likes" className="bg-[#0a0a0f] text-white">Most Liked</option>
              <option value="comments" className="bg-[#0a0a0f] text-white">Most Commented</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Grid Display */}
      {filteredMedia.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {displayMedia.map((item, i) => (
              <MediaCard key={item.id} media={item} index={i} />
            ))}
          </div>

          {filteredMedia.length > 12 && (
            <div className="mt-5 text-center">
              <button
                onClick={() => setShowAll(!showAll)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 text-sm font-medium transition-all duration-200 border border-white/[0.08]"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                {showAll ? 'Show Less' : `Show All ${filteredMedia.length} Posts`}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="glass-card p-12 text-center">
          <Grid3X3 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No media available matching filters.</p>
        </div>
      )}
    </motion.div>
  );
}
