import { auth } from '../config/firebase';

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

  const data = await response.json().catch(() => null);

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