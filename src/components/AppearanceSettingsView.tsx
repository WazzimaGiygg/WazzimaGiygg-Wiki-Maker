import React from 'react';
import {
  ArrowLeft,
  Check,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  ShieldAlert,
  Sun,
} from 'lucide-react';
import type { ThemePreference, WikiColorSchemePolicy } from '../types/wiki';
import type { WikiThemeDefinition } from '../lib/wikiThemes';
import { THEME_STORAGE_KEY } from '../lib/themePreference';

export interface AppearanceSettingsViewProps {
  themePreference: ThemePreference;
  effectiveIsDark: boolean;
  systemPrefersDark: boolean;
  activeTheme?: WikiThemeDefinition;
  colorSchemePolicy?: WikiColorSchemePolicy;
  embedded?: boolean;
  onChangeThemePreference: (next: ThemePreference) => void;
  onBackToWiki?: () => void;
}

interface ThemeOptionSpec {
  id: ThemePreference;
  label: string;
  shortDesc: string;
  detail: string;
  icon: 'light' | 'dark' | 'system';
}

const THEME_OPTIONS: ThemeOptionSpec[] = [
  {
    id: 'light',
    label: 'Light',
    shortDesc: 'Always light',
    detail: 'Use crisp high-contrast light editorial surfaces regardless of device settings.',
    icon: 'light',
  },
  {
    id: 'dark',
    label: 'Dark',
    shortDesc: 'Always dark',
    detail: 'Use low-glare dark surfaces across articles, editors, and navigation chrome.',
    icon: 'dark',
  },
  {
    id: 'system',
    label: 'System',
    shortDesc: 'Follow OS',
    detail: 'Automatically match your operating system light or dark appearance setting.',
    icon: 'system',
  },
];

export const AppearanceSettingsView: React.FC<AppearanceSettingsViewProps> = ({
  themePreference,
  effectiveIsDark,
  systemPrefersDark,
  activeTheme,
  colorSchemePolicy = 'user',
  embedded = false,
  onChangeThemePreference,
  onBackToWiki,
}) => {
  const isLockedByPolicy = colorSchemePolicy !== 'user';
  const systemStateLabel = systemPrefersDark ? 'Dark' : 'Light';
  const effectiveModeLabel = effectiveIsDark ? 'Dark' : 'Light';

  const activeSwatches = activeTheme
    ? effectiveIsDark
      ? activeTheme.darkSwatches
      : activeTheme.lightSwatches
    : effectiveIsDark
    ? ['bg-[#0b0f17]', 'bg-[#0f1623]', 'bg-[#60a5fa]']
    : ['bg-[#f8f9fa]', 'bg-[#ffffff]', 'bg-[#1d4ed8]'];

  const renderOptionIcon = (icon: ThemeOptionSpec['icon'], selected: boolean) => {
    const colorClass = selected
      ? 'text-blue-700 dark:text-blue-400'
      : 'text-slate-500 dark:text-slate-400';
    if (icon === 'light') return <Sun className={`w-4 h-4 shrink-0 ${colorClass}`} />;
    if (icon === 'dark') return <Moon className={`w-4 h-4 shrink-0 ${colorClass}`} />;
    return <Monitor className={`w-4 h-4 shrink-0 ${colorClass}`} />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Appearance &amp; Color Theme
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose Light, Dark, or follow your operating system preference. Saved locally in{' '}
              <code className="font-mono">{THEME_STORAGE_KEY}</code>.
            </p>
          </div>
          {themePreference !== 'system' && !isLockedByPolicy && (
            <button
              type="button"
              onClick={() => onChangeThemePreference('system')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to System</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              wiki / appearance
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
              Appearance Settings
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Switch between Light and Dark themes or follow your operating system preference. Your
              selection is stored locally in this browser.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {themePreference !== 'system' && !isLockedByPolicy && (
              <button
                type="button"
                onClick={() => onChangeThemePreference('system')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to System</span>
              </button>
            )}
            {onBackToWiki && (
              <button
                type="button"
                onClick={onBackToWiki}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Wiki</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Site Policy Notice when Admin Overrides User Color Scheme */}
      {isLockedByPolicy && (
        <div
          role="status"
          className="p-4 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/30 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5"
        >
          <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold">
              Site policy currently enforces {colorSchemePolicy === 'dark' ? 'Dark' : 'Light'} mode
            </div>
            <p className="text-amber-900/90 dark:text-amber-200/80">
              Wiki administrators configured the Site Theme extension to require{' '}
              {colorSchemePolicy === 'dark' ? 'Dark' : 'Light'} mode. You can still save your
              preferred setting below for when user choice is enabled.
            </p>
          </div>
        </div>
      )}

      {/* Theme Selector */}
      <section aria-labelledby="theme-selector-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3
              id="theme-selector-heading"
              className="text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              Color Mode
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select how the wiki interface renders on this device.
            </p>
          </div>
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b0f17]">
            OS preference: {systemStateLabel}
          </span>
        </div>

        <div
          role="radiogroup"
          aria-label="Color theme preference"
          className="grid grid-cols-1 md:grid-cols-3 gap-3.5"
        >
          {THEME_OPTIONS.map((option) => {
            const isSelected = themePreference === option.id;
            const previewDark =
              option.id === 'dark' || (option.id === 'system' && systemPrefersDark);

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onChangeThemePreference(option.id)}
                className={`text-left p-4 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-blue-700 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17] hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/70 dark:hover:bg-slate-900/50'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {renderOptionIcon(option.icon, isSelected)}
                      <span>{option.label}</span>
                    </span>
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-md border text-xs ${
                        isSelected
                          ? 'border-blue-700 dark:border-blue-500 bg-blue-700 dark:bg-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-700 bg-transparent text-transparent'
                      }`}
                      aria-hidden="true"
                    >
                      <Check className="w-3 h-3" />
                    </span>
                  </div>

                  {/* Mini Theme Surface Preview */}
                  <div
                    aria-hidden="true"
                    className={`rounded-lg border p-2.5 space-y-1.5 ${
                      option.id === 'system'
                        ? 'border-slate-300 dark:border-slate-700 bg-gradient-to-r from-[#f8f9fa] via-[#f8f9fa] to-[#0f1623]'
                        : previewDark
                        ? 'border-slate-700 bg-[#0b0f17]'
                        : 'border-slate-200 bg-[#f8f9fa]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`h-2 w-14 rounded-sm ${
                          option.id === 'system'
                            ? 'bg-slate-400'
                            : previewDark
                            ? 'bg-slate-700'
                            : 'bg-slate-300'
                        }`}
                      />
                      <span
                        className={`h-2 w-6 rounded-sm ${
                          previewDark ? 'bg-blue-400' : 'bg-blue-700'
                        }`}
                      />
                    </div>
                    <div
                      className={`h-7 rounded border px-2 flex items-center gap-1.5 ${
                        option.id === 'system'
                          ? 'border-slate-300/80 bg-white/85'
                          : previewDark
                          ? 'border-slate-800 bg-[#0f1623]'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-10 rounded-sm ${
                          option.id === 'system'
                            ? 'bg-slate-800'
                            : previewDark
                            ? 'bg-slate-200'
                            : 'bg-slate-800'
                        }`}
                      />
                      <span
                        className={`h-1.5 w-16 rounded-sm ${
                          option.id === 'system'
                            ? 'bg-slate-400'
                            : previewDark
                            ? 'bg-slate-600'
                            : 'bg-slate-300'
                        }`}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {option.detail}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-mono text-slate-500 dark:text-slate-400">
                    {option.id === 'system'
                      ? `Resolves to ${systemStateLabel}`
                      : option.shortDesc}
                  </span>
                  {isSelected && (
                    <span className="font-semibold text-blue-700 dark:text-blue-400">
                      Selected
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Configuration Summary */}
      <section
        aria-label="Active appearance summary"
        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0b0f17] grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <div className="space-y-1">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Saved Preference
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {themePreference === 'system'
              ? `System (${systemStateLabel})`
              : themePreference === 'dark'
              ? 'Dark'
              : 'Light'}
          </div>
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            localStorage[&quot;{THEME_STORAGE_KEY}&quot;] = &quot;{themePreference}&quot;
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Active Rendering Mode
          </div>
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {effectiveIsDark ? (
              <Moon className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            )}
            <span>{effectiveModeLabel} mode</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {isLockedByPolicy
              ? 'Controlled by site extension policy'
              : themePreference === 'system'
              ? 'Synced live with OS media query'
              : 'Manual browser override active'}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Active Wiki Skin
          </div>
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Palette className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span>{activeTheme?.name ?? 'Editorial Classic'}</span>
          </div>
          <div className="flex items-center gap-1.5 pt-0.5" aria-hidden="true">
            {activeSwatches.map((swatchClass, idx) => (
              <span
                key={`${swatchClass}-${idx}`}
                className={`w-4 h-4 rounded border border-slate-300 dark:border-slate-700 ${swatchClass}`}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
