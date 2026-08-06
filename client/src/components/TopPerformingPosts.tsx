import { motion } from 'framer-motion';
import { Trophy, Heart, MessageCircle, ExternalLink, Flame, Sparkles } from 'lucide-react';
import { formatRelativeTime } from '../utils/formatters';
import type { ComputedAnalytics } from '../types/instagram';

interface TopPerformingPostsProps {
  computed: ComputedAnalytics;
}

export function TopPerformingPosts({ computed }: TopPerformingPostsProps) {
  const cards = [
    {
      badge: 'Most Liked',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      icon: Heart,
      post: computed.topLikedPost,
    },
    {
      badge: 'Most Commented',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      icon: MessageCircle,
      post: computed.topCommentedPost,
    },
    {
      badge: 'Top Engaged',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: Flame,
      post: computed.topEngagedPost,
    },
    {
      badge: 'Latest Post',
      badgeColor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
      icon: Sparkles,
      post: computed.newestPost,
    },
  ].filter(c => c.post !== null);

  if (!cards.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-semibold text-white">Top Performing Posts</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ badge, badgeColor, icon: Icon, post }, i) => {
          if (!post) return null;
          const imageUrl = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;

          return (
            <motion.div
              key={badge}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08 * i }}
              className="glass-card p-4 flex flex-col justify-between group hover:border-white/20 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 ${badgeColor}`}>
                    <Icon className="w-3 h-3" />
                    {badge}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {formatRelativeTime(post.timestamp)}
                  </span>
                </div>

                <div className="relative aspect-video rounded-lg overflow-hidden bg-white/5 mb-3">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={post.caption || 'Top post'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-violet-500/10 text-gray-500 text-xs">
                      No Preview
                    </div>
                  )}
                </div>

                {post.caption && (
                  <p className="text-xs text-gray-300 line-clamp-2 mb-3">
                    {post.caption}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs">
                <div className="flex items-center gap-3 text-gray-300 font-medium">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/30" />
                    {post.like_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-indigo-400" />
                    {post.comments_count || 0}
                  </span>
                </div>

                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 transition-colors inline-flex items-center gap-1 text-xs"
                >
                  View
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
