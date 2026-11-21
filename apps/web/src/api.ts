const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

let accessToken = '';

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error('Unable to sign in.');
  const result = await response.json();
  accessToken = result.accessToken;
  return result.user;
}

export async function logout() {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  accessToken = '';
}

export async function apiRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  if (!response.ok) throw new Error(`API request failed (${response.status}).`);
  return response.json();
}
