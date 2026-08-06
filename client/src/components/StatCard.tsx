import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import { formatNumber } from '../utils/formatters';

interface StatCardProps {
  label: string;
  value: number | null | undefined;
  icon: LucideIcon;
  gradient: string;
  index: number;
  suffix?: string;
}

export function StatCard({ label, value, icon: Icon, gradient, index, suffix = '' }: StatCardProps) {
  const isAvailable = value !== null && value !== undefined;
  const numericValue = isAvailable ? value : 0;
  const animatedValue = useAnimatedCounter(numericValue);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="glass-card group p-5 hover:bg-white/[0.08] transition-all duration-300 hover:border-white/[0.15] hover:shadow-lg hover:shadow-purple-500/5"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} opacity-80 group-hover:opacity-100 transition-opacity`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
      <div className="text-xl md:text-2xl font-bold text-white tracking-tight">
        {isAvailable ? (
          <>
            {formatNumber(animatedValue)}
            {suffix && <span className="text-lg font-normal text-violet-400 ml-0.5">{suffix}</span>}
          </>
        ) : (
          <span className="text-sm font-normal text-gray-500">Not Available</span>
        )}
      </div>
    </motion.div>
  );
}
