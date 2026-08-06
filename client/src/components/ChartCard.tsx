import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from '../constants/chart';
import type { LucideIcon } from 'lucide-react';

interface ChartCardProps {
  title: string;
  icon: LucideIcon;
  data: Array<{ name: string; value: number }>;
  color: string;
  gradientId: string;
  index: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f0f19]/95 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-white">{payload[0].value?.toLocaleString()}</p>
    </div>
  );
}

export function ChartCard({ title, icon: Icon, data, color, gradientId, index }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-2 mb-6">
        <Icon className="w-4 h-4" style={{ color }} />
        <h4 className="text-sm font-semibold text-white">{title}</h4>
      </div>

      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
              axisLine={{ stroke: CHART_COLORS.grid }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 5, fill: color, stroke: '#0a0a0f', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[220px] flex items-center justify-center">
          <p className="text-sm text-gray-600">No data available</p>
        </div>
      )}
    </motion.div>
  );
}
