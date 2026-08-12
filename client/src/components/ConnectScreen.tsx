import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, KeyRound, ArrowRight, Zap, Shield, BarChart3, Loader2 } from 'lucide-react';

interface ConnectScreenProps {
  onConnect: (token: string) => void;
  isConnecting: boolean;
  error: string | null;
}

export function ConnectScreen({ onConnect, isConnecting, error }: ConnectScreenProps) {
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      onConnect(token.trim());
    }
  };

  const features = [
    { icon: Zap, title: 'Auto-Discovery', desc: 'Automatically finds your Pages & Instagram' },
    { icon: BarChart3, title: 'Rich Analytics', desc: 'Detailed insights and growth charts' },
    { icon: Shield, title: 'Secure', desc: 'Token stored in memory only, never saved' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-violet-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/3 rounded-full blur-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-xl shadow-violet-500/20 mb-5"
          >
            <Camera className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Meta Social Manager
          </h1>
          <p className="text-gray-400 text-sm">
            Connect your Meta account to manage your Instagram presence
          </p>
        </div>

        {/* Connect Card */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="access-token" className="block text-sm font-medium text-gray-300 mb-2">
                Meta Graph API Access Token
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="access-token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your access token here..."
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all duration-200"
                  disabled={isConnecting}
                  autoComplete="off"
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20"
              >
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={!token.trim() || isConnecting}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Connect
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="glass-card p-4 text-center"
            >
              <feature.icon className="w-5 h-5 text-violet-400 mx-auto mb-2" />
              <h3 className="text-xs font-semibold text-white mb-0.5">{feature.title}</h3>
              <p className="text-[10px] text-gray-500 leading-tight">{feature.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-gray-600 mt-6">
          Your token is stored in memory only and never persisted.
          <br />
          Generate tokens at{' '}
          <a
            href="https://developers.facebook.com/tools/explorer/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-500 hover:text-violet-400 transition-colors"
          >
            Meta Graph API Explorer
          </a>
          {' · '}
          <a
            href="/privacy-policy.html"
            className="text-violet-500 hover:text-violet-400 transition-colors"
          >
            Privacy Policy
          </a>
        </p>
      </motion.div>
    </div>
  );
}
