import React from 'react';
import { AlertTriangle, CheckCircle2, History, RefreshCw, X } from 'lucide-react';

export type ToastTone = 'info' | 'success' | 'warning';

export interface ToastNotification {
  id: string;
  tone: ToastTone;
  title: string;
  description: string;
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

const TONE_ICON: Record<ToastTone, React.ReactNode> = {
  info: <RefreshCw className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />,
  success: <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />,
};

const ToastCard: React.FC<{
  toast: ToastNotification;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const [paused, setPaused] = React.useState(false);
  const duration = toast.durationMs ?? 7000;

  React.useEffect(() => {
    if (paused || duration <= 0) return;
    const timer = window.setTimeout(() => {
      onDismiss(toast.id);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, duration, paused, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto w-full sm:w-96 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-[#0f1623]/95 backdrop-blur-md shadow-lg p-3.5 text-xs text-slate-800 dark:text-slate-100 transition-opacity duration-200"
    >
      <div className="flex items-start gap-2.5">
        {TONE_ICON[toast.tone]}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold text-slate-900 dark:text-slate-100 leading-snug">
              {toast.title}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-slate-600 dark:text-slate-300 leading-relaxed break-words">
            {toast.description}
          </p>

          {(toast.meta || toast.actionLabel) && (
            <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
              {toast.meta ? (
                <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                  {toast.meta}
                </span>
              ) : (
                <span />
              )}

              {toast.actionLabel && toast.onAction && (
                <button
                  type="button"
                  onClick={() => {
                    toast.onAction?.();
                    onDismiss(toast.id);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 hover:border-blue-700 dark:hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  <History className="w-3 h-3 shrink-0" />
                  <span>{toast.actionLabel}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      data-wiki-chrome="floating"
      aria-label="Real-time notifications"
      className="pointer-events-none fixed top-20 right-4 left-4 sm:left-auto sm:right-6 z-50 flex flex-col items-end gap-2.5 print:hidden"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
