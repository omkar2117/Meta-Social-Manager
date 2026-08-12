import { motion } from 'framer-motion';
import { ExternalLink, Heart, MessageCircle, Image, Video, Layers, Rocket } from 'lucide-react';
import { formatRelativeTime, truncateText } from '../utils/formatters';
import type { InstagramMedia } from '../types/instagram';

interface MediaCardProps {
  media: InstagramMedia;
  index: number;
  onBoost?: (media: InstagramMedia) => void;
}

const MEDIA_TYPE_ICONS = {
  IMAGE: Image,
  VIDEO: Video,
  CAROUSEL_ALBUM: Layers,
};

export function MediaCard({ media, index, onBoost }: MediaCardProps) {
  const TypeIcon = MEDIA_TYPE_ICONS[media.media_type] || Image;
  const imageUrl = media.media_type === 'VIDEO' ? media.thumbnail_url : media.media_url;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="group relative aspect-square rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06]"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={media.caption || 'Instagram post'}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500/10 to-purple-500/10">
          <TypeIcon className="w-10 h-10 text-gray-600" />
        </div>
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-2.5 p-4">
        <div className="flex items-center gap-4">
          {media.like_count !== undefined && (
            <div className="flex items-center gap-1.5 text-white text-sm">
              <Heart className="w-4 h-4 fill-current" />
              <span className="font-semibold">{media.like_count}</span>
            </div>
          )}
          {media.comments_count !== undefined && (
            <div className="flex items-center gap-1.5 text-white text-sm">
              <MessageCircle className="w-4 h-4" />
              <span className="font-semibold">{media.comments_count}</span>
            </div>
          )}
        </div>

        {media.caption && (
          <p className="text-xs text-gray-300 text-center line-clamp-2">
            {truncateText(media.caption, 80)}
          </p>
        )}

        <span className="text-xs text-gray-500">{formatRelativeTime(media.timestamp)}</span>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <a
            href={media.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Open Post
          </a>
          {onBoost && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onBoost(media);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-violet-500/20"
            >
              <Rocket className="w-3 h-3" />
              Boost Post
            </button>
          )}
        </div>
      </div>

      <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
        <TypeIcon className="w-3 h-3" />
      </div>
    </motion.div>
  );
}
