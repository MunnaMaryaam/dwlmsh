import { SalesTimeframe } from '../types';

export type AppTheme = 'obsidian' | 'light' | 'midnight' | 'emerald';
export type TableDensity = 'compact' | 'standard' | 'comfortable';
export type CurrencyFormat = 'BDT' | 'USD' | 'EUR' | 'INR';
export type NumberNotation = 'south_asian' | 'international';
export type RedistributionStrategy = 'proportional' | 'aggressive_velocity' | 'balanced_safety';

export interface AppSettings {
  theme: AppTheme;
  density: TableDensity;
  currency: CurrencyFormat;
  numberNotation: NumberNotation;
  defaultTimeframe: SalesTimeframe;
  strategy: RedistributionStrategy;
  minBranchSafetyBuffer: number;
  agingWarningDays: number;
  autoSaveSession: boolean;
  highlightDeficits: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  density: 'standard',
  currency: 'BDT',
  numberNotation: 'south_asian',
  defaultTimeframe: '1Y',
  strategy: 'proportional',
  minBranchSafetyBuffer: 0,
  agingWarningDays: 180,
  autoSaveSession: true,
  highlightDeficits: true
};

const SETTINGS_KEY = 'dwl_analytics_app_settings';

export function getStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applyThemeToDocument(settings.theme);
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function applyThemeToDocument(theme: AppTheme): void {
  const root = document.documentElement;
  root.classList.remove('theme-obsidian', 'theme-light', 'theme-midnight', 'theme-emerald');
  root.classList.add(`theme-${theme}`);
  
  if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
  }
}

export function formatCurrencyValue(val: number, currency: CurrencyFormat = 'BDT'): string {
  const symbols: Record<CurrencyFormat, string> = {
    BDT: '৳',
    USD: '$',
    EUR: '€',
    INR: '₹'
  };
  const sym = symbols[currency] || '৳';
  return `${sym}${val.toLocaleString()}`;
}
