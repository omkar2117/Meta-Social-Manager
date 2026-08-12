import { useState, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { Layout } from './components/Layout';
import { ConnectScreen } from './components/ConnectScreen';
import { Dashboard } from './components/Dashboard';
import { ErrorDisplay } from './components/ErrorDisplay';
import { SkeletonLoader } from './components/SkeletonLoader';
import { connectMeta } from './services/metaService';
import type { DashboardData } from './types/instagram';
import type { ConnectionStatus } from './types/meta';

function App() {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenRef] = useState<{ current: string }>({ current: '' });

  const handleConnect = useCallback(async (accessToken: string) => {
    if (!accessToken.trim()) {
      setError('Please enter a valid access token.');
      return;
    }

    tokenRef.current = accessToken;
    setStatus('connecting');
    setError(null);

    const toastId = toast.loading('Connecting to Meta API...', {
      description: 'Discovering your Pages & Instagram account',
    });

    try {
      const response = await connectMeta(accessToken);

      if (response.success && response.data) {
        setData({
          profile: response.data.profile,
          media: response.data.media,
          insights: response.data.insights,
          page: response.data.page,
          user: response.data.user,
          lastSyncTime: new Date().toISOString(),
        });
        setStatus('connected');
        toast.success(`Connected as @${response.data.profile.username}`, {
          id: toastId,
          description: `${response.data.media.length} posts loaded · ${response.data.page.name}`,
        });
      }
    } catch (err: unknown) {
      let message = 'An unexpected error occurred. Please try again.';

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        message = axiosErr.response?.data?.message || message;
      } else if (err instanceof Error) {
        message = err.message;
      }

      setError(message);
      setStatus('error');
      toast.error('Connection failed', { id: toastId, description: message });
    }
  }, [tokenRef]);

  const handleRefresh = useCallback(async () => {
    if (!tokenRef.current) {
      toast.error('No token available. Please reconnect.');
      return;
    }

    setStatus('connecting');
    const toastId = toast.loading('Refreshing data...', {
      description: 'Fetching latest profile, media & insights',
    });

    try {
      const response = await connectMeta(tokenRef.current);

      if (response.success && response.data) {
        setData({
          profile: response.data.profile,
          media: response.data.media,
          insights: response.data.insights,
          page: response.data.page,
          user: response.data.user,
          lastSyncTime: new Date().toISOString(),
        });
        setStatus('connected');
        toast.success('Data refreshed', {
          id: toastId,
          description: `Updated at ${new Date().toLocaleTimeString()}`,
        });
      }
    } catch (err: unknown) {
      let message = 'Failed to refresh. Please try again.';

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        message = axiosErr.response?.data?.message || message;
      } else if (err instanceof Error) {
        message = err.message;
      }

      setStatus('connected'); // Preserve dashboard and current data on error
      toast.error('Refresh failed', { id: toastId, description: message });
    }
  }, [tokenRef]);

  const handleDisconnect = useCallback(() => {
    tokenRef.current = '';
    setData(null);
    setError(null);
    setStatus('idle');
    toast.success('Disconnected', { description: 'Your session has been cleared' });
  }, [tokenRef]);

  const isConnected = status === 'connected' && !!data;

  return (
    <>
      <Toaster
        position="top-right"
        theme="dark"
        richColors
        toastOptions={{
          style: {
            background: 'rgba(15, 15, 25, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            color: '#fff',
          },
        }}
      />
      <Layout isConnected={isConnected}>
        {/* Idle */}
        {status === 'idle' && (
          <ConnectScreen
            onConnect={handleConnect}
            isConnecting={false}
            error={null}
          />
        )}

        {/* Connecting (initial) */}
        {status === 'connecting' && !data && (
          <ConnectScreen
            onConnect={handleConnect}
            isConnecting={true}
            error={null}
          />
        )}

        {/* Error without data */}
        {status === 'error' && !data && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <ErrorDisplay
              message={error || 'An unexpected error occurred'}
              onDisconnect={handleDisconnect}
            />
          </div>
        )}

        {/* Connected with data (or refreshing) */}
        {data && (
          <Dashboard
            data={data}
            accessToken={tokenRef.current}
            isRefreshing={status === 'connecting'}
            onRefresh={handleRefresh}
            onDisconnect={handleDisconnect}
          />
        )}

        {/* Fallback loading */}
        {status === 'connecting' && !data && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 hidden">
            <SkeletonLoader type="profile" />
            <SkeletonLoader type="card" />
          </div>
        )}
      </Layout>
    </>
  );
}

export default App;
