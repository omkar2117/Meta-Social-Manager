import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  type?: 'card' | 'profile' | 'media' | 'chart';
}

function SkeletonPulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.07] ${className}`} />;
}

export function SkeletonLoader({ type = 'card' }: SkeletonLoaderProps) {
  if (type === 'profile') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card p-8"
      >
        <div className="flex items-center gap-6">
          <SkeletonPulse className="h-24 w-24 rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            <SkeletonPulse className="h-6 w-48" />
            <SkeletonPulse className="h-4 w-32" />
            <SkeletonPulse className="h-4 w-full max-w-md" />
          </div>
        </div>
      </motion.div>
    );
  }

  if (type === 'media') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-3 gap-3"
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonPulse key={i} className="aspect-square" />
        ))}
      </motion.div>
    );
  }

  if (type === 'chart') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card p-6"
      >
        <SkeletonPulse className="h-5 w-36 mb-6" />
        <SkeletonPulse className="h-64 w-full" />
      </motion.div>
    );
  }

  // Default: stat cards
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass-card p-5 space-y-3">
          <SkeletonPulse className="h-4 w-20" />
          <SkeletonPulse className="h-8 w-24" />
          <SkeletonPulse className="h-3 w-16" />
        </div>
      ))}
    </motion.div>
  );
}
