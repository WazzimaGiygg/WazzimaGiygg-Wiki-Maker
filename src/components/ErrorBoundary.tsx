import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred in the application.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('WazzimaGiygg Maker ErrorBoundary:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      let friendlyMessage = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message) as {
          error?: string;
          operationType?: string;
          path?: string;
        };
        if (parsed.error) {
          friendlyMessage = `Database error (${parsed.operationType ?? 'operation'} at ${parsed.path ?? 'resource'}): ${parsed.error}`;
        }
      } catch {
        // Keep original message if not JSON
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] dark:bg-[#0b0f17] p-6">
          <div className="max-w-lg w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h1 className="font-display text-lg font-semibold">
                Unable to complete the operation
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-words">
              {friendlyMessage}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
