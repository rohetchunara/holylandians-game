import type { Profile } from './types';

const USER_KEY = 'holylandians_user';
const AUTH_KEY = 'holylandians_authed';

export function loadStoredUser(): Profile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

export function saveStoredUser(user: Profile): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(USER_KEY);
}

export function isAuthed(): boolean {
  return localStorage.getItem(AUTH_KEY) === '1';
}

export function setAuthed(): void {
  localStorage.setItem(AUTH_KEY, '1');
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_KEY);
}
