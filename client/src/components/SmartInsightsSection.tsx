import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, AlertCircle, ArrowUpRight, Lightbulb } from 'lucide-react';
import type { SmartInsight } from '../types/instagram';

interface SmartInsightsSectionProps {
  insights: SmartInsight[];
}

const TYPE_CONFIG = {
  positive: {
    icon: TrendingUp,
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    border: 'border-emerald-500/20',
  },
  warning: {
    icon: AlertCircle,
    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    border: 'border-amber-500/20',
  },
  info: {
    icon: Lightbulb,
    badgeBg: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    border: 'border-violet-500/20',
  },
  opportunity: {
    icon: ArrowUpRight,
    badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    border: 'border-cyan-500/20',
  },
};

export function SmartInsightsSection({ insights }: SmartInsightsSectionProps) {
  if (!insights.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-violet-400" />
        <h3 className="text-lg font-semibold text-white">AI Smart Recommendations</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
          Automated Analysis
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((item, i) => {
          const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.info;
          const Icon = config.icon;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
              className={`glass-card p-5 border ${config.border} hover:bg-white/[0.06] transition-all`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${config.badgeBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                </div>
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  {item.impact} Impact
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed pl-8">
                {item.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
