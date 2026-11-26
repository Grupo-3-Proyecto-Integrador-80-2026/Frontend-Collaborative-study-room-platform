import { auth } from '../config/firebase';
import type { ChatMessage } from './chat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  provider: 'password' | 'google.com';
  role: 'student' | 'teacher' | 'admin';
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ApiErrorResponse {
  success: false;
  code: string;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly errors?: Array<{ field: string; message: string }>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    errors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth: boolean = false
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (requiresAuth) {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new ApiError(401, 'AUTH_REQUIRED', 'Debes iniciar sesión para continuar.');
    }
    const token = await currentUser.getIdToken();
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 204 (por ejemplo DELETE /api/users/me) llega sin cuerpo.
  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.code || 'ERROR_DESCONOCIDO',
      data?.message || `Error del servidor (${response.status})`,
      data?.errors
    );
  }

  return data as T;
}

// Endpoints del Sprint 1
export const authApi = {
  checkUsernameAvailability: (username: string) =>
    apiFetch<{ success: boolean; username: string; available: boolean }>(
      `/api/users/username-availability?username=${encodeURIComponent(username)}`
    ),

  register: (body: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
    avatarUrl: string;
  }) =>
    apiFetch<{ success: boolean; user: UserProfile }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getMyProfile: () =>
    apiFetch<{ success: boolean; user: UserProfile }>('/api/users/me', {}, true),

  completeProfile: (body: {
    username: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  }) =>
    apiFetch<{ success: boolean; user: UserProfile }>(
      '/api/users/me',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      true
    ),
};

export type ProfileUpdate = Partial<{
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  avatarUrl: string | null;
}>;

// Endpoints del Sprint 2 · US-04 y US-05
export const profileApi = {
  update: (body: ProfileUpdate) =>
    apiFetch<{ success: boolean; user: UserProfile }>(
      '/api/users/me',
      { method: 'PATCH', body: JSON.stringify(body) },
      true
    ),

  deleteAccount: () => apiFetch<null>('/api/users/me', { method: 'DELETE' }, true),
};

export interface Room {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
}

// Endpoints del Sprint 2 · US-06
export const roomsApi = {
  listMine: () => apiFetch<{ success: boolean; rooms: Room[] }>('/api/rooms', {}, true),
  getById: (id: string, signal?: AbortSignal) =>
    apiFetch<{ success: boolean; room: Room }>(`/api/rooms/${encodeURIComponent(id)}`, { signal }, true),
  history: (id: string, before: string | null, signal: AbortSignal) => {
    const query = new URLSearchParams({ limit: '50' });
    if (before) query.set('before', before);
    return apiFetch<{ success: boolean; messages: ChatMessage[]; nextBefore: string | null }>(
      `/api/rooms/${encodeURIComponent(id)}/messages?${query}`, { signal }, true
    );
  },
  rename: (id: string, name: string) =>
    apiFetch<null>(`/api/rooms/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ name }) }, true),
  remove: (id: string) =>
    apiFetch<null>(`/api/rooms/${encodeURIComponent(id)}`, { method: 'DELETE' }, true),

  create: (name: string) =>
    apiFetch<{ success: boolean; room: Room }>(
      '/api/rooms',
      { method: 'POST', body: JSON.stringify({ name }) },
      true
    ),
};
