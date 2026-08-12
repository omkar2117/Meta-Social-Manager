import { ConnectScreen } from '../components/ConnectScreen';
import { Dashboard } from '../components/Dashboard';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useMetaConnect } from '../hooks/useMetaConnect';
import { toast } from 'sonner';
import { useCallback } from 'react';

export function HomePage() {
  const { status, data, error, accessToken, connect, refresh, disconnect } = useMetaConnect();

  const handleConnect = useCallback(async (token: string) => {
    toast.loading('Connecting to Meta...', { id: 'connect' });
    await connect(token);

    // Check the result after connect completes
    // We need to check via a slight delay since state updates are async
    setTimeout(() => {
      const toastEl = document.querySelector('[data-sonner-toast][data-id="connect"]');
      if (toastEl) {
        // The toast is still showing, update it based on current state
      }
    }, 100);
  }, [connect]);

  const handleRefresh = useCallback(async () => {
    toast.loading('Refreshing data...', { id: 'refresh' });
    await refresh();
  }, [refresh]);

  const handleDisconnect = useCallback(() => {
    disconnect();
    toast.success('Disconnected successfully');
  }, [disconnect]);

  // Handle toast updates based on status changes
  if (status === 'connected' && data) {
    toast.success(`Connected as @${data.profile.username}`, { id: 'connect' });
    toast.success('Data refreshed successfully', { id: 'refresh' });
  }

  if (status === 'error' && error) {
    toast.error(error, { id: 'connect' });
    toast.error(error, { id: 'refresh' });
  }

  // Idle → show connect screen
  if (status === 'idle') {
    return <ConnectScreen onConnect={handleConnect} isConnecting={false} error={null} />;
  }

  // Connecting (initial) → show connect screen with loading
  if (status === 'connecting' && !data) {
    return <ConnectScreen onConnect={handleConnect} isConnecting={true} error={null} />;
  }

  // Error without data → show error
  if (status === 'error' && !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <ErrorDisplay
          message={error || 'An unexpected error occurred'}
          onRetry={() => handleConnect('')}
          onDisconnect={handleDisconnect}
        />
      </div>
    );
  }

  // Connected with data → show dashboard
  if (data) {
    return (
      <Dashboard
        data={data}
        accessToken={accessToken}
        isRefreshing={status === 'connecting'}
        onRefresh={handleRefresh}
        onDisconnect={handleDisconnect}
      />
    );
  }

  // Fallback loading
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <SkeletonLoader type="profile" />
      <SkeletonLoader type="card" />
    </div>
  );
}
