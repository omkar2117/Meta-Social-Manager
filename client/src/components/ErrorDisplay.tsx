import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, KeyRound, ShieldAlert, WifiOff, Clock, ServerCrash } from 'lucide-react';

interface ErrorDisplayProps {
  message: string;
  code?: string;
  onRetry?: () => void;
  onDisconnect?: () => void;
}

const ERROR_ICONS: Record<string, React.ReactNode> = {
  TOKEN_EXPIRED: <KeyRound className="w-8 h-8" />,
  INVALID_TOKEN: <KeyRound className="w-8 h-8" />,
  MISSING_PERMISSION: <ShieldAlert className="w-8 h-8" />,
  NETWORK_ERROR: <WifiOff className="w-8 h-8" />,
  RATE_LIMIT: <Clock className="w-8 h-8" />,
  NO_PAGES: <ServerCrash className="w-8 h-8" />,
  NO_INSTAGRAM_ACCOUNT: <ServerCrash className="w-8 h-8" />,
};

export function ErrorDisplay({ message, code, onRetry, onDisconnect }: ErrorDisplayProps) {
  const icon = code ? ERROR_ICONS[code] || <AlertTriangle className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center justify-center min-h-[400px]"
    >
      <div className="glass-card p-10 max-w-lg text-center space-y-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 mx-auto"
        >
          {icon}
        </motion.div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">Something went wrong</h3>
          <p className="text-gray-400 text-sm leading-relaxed">{message}</p>
        </div>

        <div className="flex items-center justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
          {onDisconnect && (
            <button
              onClick={onDisconnect}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 text-sm font-medium transition-colors border border-white/[0.08]"
            >
              New Token
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
