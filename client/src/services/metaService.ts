import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../constants/api';
import type { MetaConnectResponse } from '../types/meta';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

export async function connectMeta(accessToken: string): Promise<MetaConnectResponse> {
  const { data } = await api.post<MetaConnectResponse>(ENDPOINTS.META_CONNECT, { accessToken });
  return data;
}

export async function validateToken(accessToken: string): Promise<{ success: boolean; user: { id: string; name: string } }> {
  const { data } = await api.post(ENDPOINTS.META_VALIDATE, { accessToken });
  return data;
}

export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  const { data } = await api.get(ENDPOINTS.HEALTH);
  return data;
}
