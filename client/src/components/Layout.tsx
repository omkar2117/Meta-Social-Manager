import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  isConnected: boolean;
}

export function Layout({ children, isConnected }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background ambient effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/[0.04] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/[0.04] rounded-full blur-[150px]" />
      </div>

      {/* Header - only when connected */}
      {isConnected && (
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0a0f]/80 border-b border-white/[0.06]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Camera className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-white tracking-tight">
                  Meta Social Manager
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-400">Connected</span>
                </div>
              </div>
            </div>
          </div>
        </motion.header>
      )}

      {/* Main Content */}
      <main className="relative z-10">
        {children}
      </main>
    </div>
  );
}
