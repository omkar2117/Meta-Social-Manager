import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Layers } from 'lucide-react';

interface MediaDistributionChartProps {
  distribution: {
    images: number;
    videos: number;
    carousels: number;
    reels: number;
    imagePct: number;
    videoPct: number;
    carouselPct: number;
    reelsPct: number;
  };
}

const COLORS = ['#8b5cf6', '#f472b6', '#06b6d4', '#f59e0b'];

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { pct: number } }> }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f0f1a]/95 border border-white/10 rounded-xl px-3 py-2 backdrop-blur-xl shadow-xl">
      <p className="text-xs text-white font-medium">{payload[0].name}</p>
      <p className="text-xs text-gray-400">{payload[0].value} posts ({payload[0].payload.pct}%)</p>
    </div>
  );
};

export function MediaDistributionChart({ distribution }: MediaDistributionChartProps) {
  const data = [
    { name: 'Images', value: distribution.images, pct: distribution.imagePct },
    { name: 'Reels', value: distribution.reels, pct: distribution.reelsPct },
    { name: 'Carousels', value: distribution.carousels, pct: distribution.carouselPct },
    { name: 'Videos', value: distribution.videos, pct: distribution.videoPct },
  ].filter(d => d.value > 0);

  const total = distribution.images + distribution.videos + distribution.carousels + distribution.reels;

  if (total === 0) {
    return (
      <div className="glass-card p-6 flex items-center justify-center text-gray-500 text-sm">
        No media data available.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-4 h-4 text-violet-400" />
        <h4 className="text-sm font-semibold text-white">Media Type Distribution</h4>
      </div>

      <div className="flex items-center gap-6">
        {/* Pie Chart */}
        <div className="w-36 h-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={60}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                animationDuration={800}
              >
                {data.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3">
          {data.map((item, i) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-xs text-gray-300">{item.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white font-semibold">{item.value}</span>
                <span className="text-[10px] text-gray-500 w-10 text-right">{item.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
