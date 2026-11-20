import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { LEGAL_GOVERNANCE } from '../lib/legalConfig';

interface PrivacyNoticeBannerProps {
  onOpenPrivacy: () => void;
}

const CONSENT_STORAGE_KEY = 'wazzimagiygg-privacy-ack-v1';

export const PrivacyNoticeBanner: React.FC<PrivacyNoticeBannerProps> = ({ onOpenPrivacy }) => {
  const [visible, setVisible] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(CONSENT_STORAGE_KEY) !== 'accepted';
  });

  if (!visible) return null;

  const handleAccept = () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  return (
    <aside
      data-wiki-chrome="floating"
      aria-label="LGPD and Marco Civil privacy notice"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-lg z-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-[#0f1623]/95 backdrop-blur-md shadow-lg p-4 space-y-3 print:hidden"
    >
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="font-semibold text-slate-900 dark:text-slate-100">
            Privacy Notice (LGPD &amp; Marco Civil)
          </div>
          <p>
            We use only essential authentication and local theme storage (no advertising cookies).
            DPO: <strong>{LEGAL_GOVERNANCE.dpoName}</strong> (
            <span className="font-mono">{LEGAL_GOVERNANCE.dpoEmail}</span>).
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onOpenPrivacy}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          Privacy &amp; Terms
        </button>
        <button
          type="button"
          onClick={handleAccept}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
        >
          Accept &amp; Continue
        </button>
      </div>
    </aside>
  );
};
