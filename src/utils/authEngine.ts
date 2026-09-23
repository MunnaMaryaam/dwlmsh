import { AuthUser } from '../types';

const SESSION_SNAPSHOT_KEY = 'dwl_secure_session_snapshot';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
  } catch {
    throw new Error('Could not reach the server. Check your internet connection and try again.');
  }

  const rawText = await response.text();
  let payload: any = {};
  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    if (payload.error) throw new Error(payload.error);
    // The server returned something other than our expected JSON error shape
    // (e.g. a platform-level 404/500 page) — surface the status code instead
    // of a silent generic message, so a deployment issue is easy to spot.
    throw new Error(`Server responded with an unexpected error (HTTP ${response.status}). Please verify the deployment is up to date.`);
  }
  return payload as T;
}

export function getCurrentSession(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentSession(user: AuthUser | null): void {
  try {
    if (!user) sessionStorage.removeItem(SESSION_SNAPSHOT_KEY);
    else sessionStorage.setItem(SESSION_SNAPSHOT_KEY, JSON.stringify(user));
  } catch {
    // Session snapshot is only a UI convenience; the real session is an httpOnly cookie.
  }
}

export async function restoreSession(): Promise<AuthUser | null> {
  try {
    const result = await request<{ authenticated: boolean; user?: AuthUser }>('/api/auth/me');
    if (!result.authenticated || !result.user) {
      setCurrentSession(null);
      return null;
    }
    setCurrentSession(result.user);
    return result.user;
  } catch {
    setCurrentSession(null);
    return null;
  }
}

export async function authenticateUser(username: string, password: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const result = await request<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setCurrentSession(result.user);
    return { success: true, user: result.user };
  } catch (error: any) {
    return { success: false, error: error.message || 'Invalid credentials.' };
  }
}

export async function logoutCurrentSession(): Promise<void> {
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } finally {
    setCurrentSession(null);
  }
}

export async function requestSignup(data: {
  username: string;
  name: string;
  password: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const result = await request<{ pending: boolean; message: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return { success: true, message: result.message };
  } catch (error: any) {
    return { success: false, error: error.message || 'Could not submit account request.' };
  }
}

export async function requestPasswordRecovery(username: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const result = await request<{ success: boolean; message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ username })
    });
    return { success: result.success, message: result.message };
  } catch (error: any) {
    return { success: false, error: error.message || 'Could not submit recovery request.' };
  }
}

export async function getManagedUsers(): Promise<AuthUser[]> {
  const result = await request<{ users: AuthUser[] }>('/api/admin/users');
  return result.users;
}

export async function approveUser(userId: string) {
  return request<{ success: boolean; user: AuthUser }>(`/api/admin/users/${encodeURIComponent(userId)}/approve`, { method: 'POST', body: '{}' });
}

export async function rejectUser(userId: string) {
  return request<{ success: boolean }>(`/api/admin/users/${encodeURIComponent(userId)}/reject`, { method: 'POST', body: '{}' });
}

export async function resetManagedUserPassword(userId: string, newPassword: string) {
  return request<{ success: boolean }>(`/api/admin/users/${encodeURIComponent(userId)}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ newPassword })
  });
}

export async function deleteManagedUser(userId: string) {
  return request<{ success: boolean }>(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

// Backward-compatible aliases for older components; all mutations are server-authorized.
export async function addAuthorizedUser(input: { username: string; name: string; role?: string; password: string; designation?: string }) {
  return requestSignup({ username: input.username, name: input.name, password: input.password });
}

export async function deleteAuthorizedUser(userId: string) {
  try {
    await deleteManagedUser(userId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to remove user.' };
  }
}

export function updateUserProfile(_userId: string, _updates: { name?: string; designation?: string }): { success: boolean; error?: string; user?: AuthUser } {
  return { success: false, error: 'Profile changes are locked by the system owner.' };
}

export function changeUserPassword(_userId: string, _currentPass: string, _newPass: string): { success: boolean; error?: string } {
  return { success: false, error: 'Password changes are controlled by the system owner. Use Forgot Password to request recovery.' };
}
