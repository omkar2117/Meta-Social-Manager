import { useState, useCallback, useRef } from 'react';
import { connectMeta } from '../services/metaService';
import type { DashboardData } from '../types/instagram';
import type { ConnectionStatus } from '../types/meta';

interface UseMetaConnectReturn {
  status: ConnectionStatus;
  data: DashboardData | null;
  error: string | null;
  connect: (accessToken: string) => Promise<void>;
  refresh: () => Promise<void>;
  disconnect: () => void;
}

export function useMetaConnect(): UseMetaConnectReturn {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<string>('');

  const connect = useCallback(async (accessToken: string) => {
    if (!accessToken.trim()) {
      setError('Please enter a valid access token.');
      return;
    }

    tokenRef.current = accessToken;
    setStatus('connecting');
    setError(null);

    try {
      const response = await connectMeta(accessToken);

      if (response.success && response.data) {
        setData({
          profile: response.data.profile,
          media: response.data.media,
          insights: response.data.insights,
          page: response.data.page,
          user: response.data.user,
        });
        setStatus('connected');
      } else {
        throw new Error('Unexpected response format');
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
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenRef.current) {
      setError('No access token available. Please reconnect.');
      return;
    }
    await connect(tokenRef.current);
  }, [connect]);

  const disconnect = useCallback(() => {
    tokenRef.current = '';
    setData(null);
    setError(null);
    setStatus('idle');
  }, []);

  return { status, data, error, connect, refresh, disconnect };
}
