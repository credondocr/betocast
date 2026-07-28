const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  streams: {
    list: () => request<Stream[]>('/streams'),
    get: (id: string) => request<Stream>(`/streams/${id}`),
    create: (data: { youtube_url: string; title?: string; category_id?: number }) =>
      request<Stream>('/streams', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Stream>) =>
      request<Stream>(`/streams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/streams/${id}`, { method: 'DELETE' }),
  },
  pilots: {
    list: (streamId: string) => request<Pilot[]>(`/streams/${streamId}/pilots`),
    add: (streamId: string, data: { car_number: string; driver_name?: string; color?: string }) =>
      request<Pilot>(`/streams/${streamId}/pilots`, { method: 'POST', body: JSON.stringify(data) }),
    remove: (streamId: string, carNumber: string) =>
      request<{ success: boolean }>(`/streams/${streamId}/pilots/${carNumber}`, { method: 'DELETE' }),
  },
  votes: {
    get: (streamId: string) => request<VoteResponse>(`/streams/${streamId}/votes`),
  },
  predictions: {
    get: (streamId: string) => request<PredictionResponse>(`/streams/${streamId}/predictions`),
    resolve: (streamId: string, carNumber: string) =>
      request<PredictionResolveResponse>(`/streams/${streamId}/predictions/resolve`, {
        method: 'POST',
        body: JSON.stringify({ car_number: carNumber }),
      }),
  },
  categories: {
    list: () => request<Category[]>('/categories'),
    get: (id: number) => request<Category>(`/categories/${id}`),
    create: (data: { name: string; description?: string }) =>
      request<Category>('/categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { name?: string; description?: string }) =>
      request<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/categories/${id}`, { method: 'DELETE' }),
    pilots: {
      list: (categoryId: number) => request<CategoryPilot[]>(`/categories/${categoryId}/pilots`),
      add: (categoryId: number, data: { car_number: string; driver_name?: string; color?: string }) =>
        request<CategoryPilot>(`/categories/${categoryId}/pilots`, { method: 'POST', body: JSON.stringify(data) }),
      addBulk: (categoryId: number, pilots: Array<{ car_number: string; driver_name?: string; color?: string }>) =>
        request<{ success: boolean; added: number }>(`/categories/${categoryId}/pilots/bulk`, { method: 'POST', body: JSON.stringify({ pilots }) }),
      remove: (categoryId: number, carNumber: string) =>
        request<{ success: boolean }>(`/categories/${categoryId}/pilots/${carNumber}`, { method: 'DELETE' }),
      clear: (categoryId: number) =>
        request<{ success: boolean; removed: number }>(`/categories/${categoryId}/pilots`, { method: 'DELETE' }),
    },
  },
  sync: {
    pull: (streamId: string) => request<any>(`/streams/${streamId}/sync`),
  },
  mock: {
    start: (streamId: string, opts?: { intervalMs?: number; voteProbability?: number }) =>
      request<any>(`/streams/${streamId}/mock/start`, { method: 'POST', body: JSON.stringify(opts || {}) }),
    stop: (streamId: string) =>
      request<any>(`/streams/${streamId}/mock/stop`, { method: 'POST' }),
  },
};

import type { Stream, Pilot, VoteResponse, PredictionResponse, PredictionResolveResponse, Category, CategoryPilot } from '@/types';
