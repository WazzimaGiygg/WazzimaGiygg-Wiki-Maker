import type { ThemePreference, WikiColorSchemePolicy } from '../types/wiki';

export const THEME_STORAGE_KEY = 'wazzimagiygg-theme';

export function isValidThemePreference(value: string | null | undefined): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isValidThemePreference(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage access restrictions
  }
  return 'system';
}

export function writeStoredThemePreference(preference: ThemePreference): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveEffectiveDarkMode(
  preference: ThemePreference,
  systemPrefersDark: boolean,
  colorSchemePolicy: WikiColorSchemePolicy = 'user'
): boolean {
  if (colorSchemePolicy === 'dark') return true;
  if (colorSchemePolicy === 'light') return false;
  if (preference === 'dark') return true;
  if (preference === 'light') return false;
  return systemPrefersDark;
}

export function getNextThemePreference(
  current: ThemePreference,
  systemPrefersDark: boolean
): ThemePreference {
  if (current === 'system') {
    return systemPrefersDark ? 'light' : 'dark';
  }
  if (current === 'dark') {
    return 'light';
  }
  return 'dark';
}
