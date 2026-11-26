import React from 'react';
import { ExternalLink, ShieldBan } from 'lucide-react';
import type { ChatbotDetectionResult } from '../lib/chatbotBlocker';

interface ChatbotBlockedScreenProps {
  detection: ChatbotDetectionResult;
}

export const ChatbotBlockedScreen: React.FC<ChatbotBlockedScreenProps> = ({ detection }) => {
  const directUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}${window.location.hash}`
      : 'https://wikimaker.wazzimagiygg.com/';

  return (
    <main className="min-h-screen bg-[#FBF9F5] dark:bg-[#0b0f17] text-[#1C1917] dark:text-slate-100 flex items-center justify-center p-6 sm:p-10">
      <article className="max-w-xl w-full border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#0f1623] rounded-xl p-7 sm:p-10 space-y-6">
        <div className="space-y-3 border-b border-stone-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2.5 text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
            <ShieldBan className="w-4 h-4 text-[#9A3412] dark:text-amber-400 shrink-0" />
            <span>HTTP 403 · Anti-Chatbot Shield Active</span>
          </div>
          <h1
            className="font-serif text-3xl sm:text-4xl font-semibold text-stone-900 dark:text-slate-50 leading-tight"
            style={{ textWrap: 'balance' }}
          >
            Chatbot and automated access is blocked
          </h1>
        </div>

        <div className="space-y-4 text-[15px] leading-relaxed text-stone-700 dark:text-slate-300 max-w-prose">
          <p>
            <strong>WazzimaGiygg Maker</strong> blocks AI chatbots, automated link fetchers, and
            headless browsing sessions from opening, reading, or summarizing pages on this Wiki-site.
          </p>
          <p className="text-sm text-stone-600 dark:text-slate-400">
            Detected trigger:{' '}
            <span className="font-mono text-stone-800 dark:text-slate-200">
              {detection.detail || detection.matchedRule || 'Automated chatbot policy'}
            </span>
          </p>
        </div>

        <div className="pt-2 border-t border-stone-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs text-stone-500 dark:text-slate-400">
            Human visitors: open the link directly in a standard web browser.
          </span>
          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-stone-900 dark:bg-blue-700 text-white hover:bg-stone-800 dark:hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Open directly</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>
        </div>
      </article>
    </main>
  );
};
