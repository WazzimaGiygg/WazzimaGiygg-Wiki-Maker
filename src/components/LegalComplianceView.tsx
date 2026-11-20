import React from 'react';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
  CheckCircle2,
  Download,
  FileText,
  Lock,
  Mail,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { DOSSIER_PAGE_SLUG, DOSSIER_PAGE_TITLE } from '../lib/dossierArticle';
import { db } from '../lib/firebase';
import { LEGAL_GOVERNANCE } from '../lib/legalConfig';
import { fetchUserEdits } from '../lib/wikiService';
import type { CollaboratorProfile, WikiPage } from '../types/wiki';

export type LegalSectionTab = 'privacy' | 'terms';

interface LegalComplianceViewProps {
  section: LegalSectionTab;
  user: User | null;
  collaboratorProfile: CollaboratorProfile | null;
  userPages: WikiPage[];
  onSwitchSection: (section: LegalSectionTab) => void;
  onSelectPage: (slug: string) => void;
  onSignIn: () => void;
}

export const LegalComplianceView: React.FC<LegalComplianceViewProps> = ({
  section,
  user,
  collaboratorProfile,
  userPages,
  onSwitchSection,
  onSelectPage,
  onSignIn,
}) => {
  const [exporting, setExporting] = React.useState(false);
  const [exportDone, setExportDone] = React.useState(false);

  const handleExportMyData = async () => {
    if (!user) return;
    setExporting(true);
    setExportDone(false);
    try {
      const [privateSnap, edits] = await Promise.all([
        getDoc(doc(db, 'users', user.uid, 'private', 'info')),
        fetchUserEdits(user.uid, user.uid),
      ]);

      const payload = {
        exportedAt: new Date().toISOString(),
        platform: LEGAL_GOVERNANCE.siteName,
        canonicalUrl: LEGAL_GOVERNANCE.siteUrl,
        legalFramework: [LEGAL_GOVERNANCE.lgpdLaw, LEGAL_GOVERNANCE.marcoCivilLaw],
        dpo: {
          name: LEGAL_GOVERNANCE.dpoName,
          email: LEGAL_GOVERNANCE.dpoEmail,
        },
        account: {
          uid: user.uid,
          displayName: user.displayName ?? collaboratorProfile?.displayName ?? null,
          email: privateSnap.exists() ? privateSnap.data().email ?? user.email : user.email,
          emailVerified: user.emailVerified,
        },
        collaboratorProfile: collaboratorProfile
          ? {
              personalPageSlug: collaboratorProfile.personalPageSlug,
              discussionPageSlug: collaboratorProfile.discussionPageSlug,
              photoURL: collaboratorProfile.photoURL,
            }
          : null,
        authoredPages: userPages.map((p) => ({
          slug: p.slug,
          title: p.title,
          category: p.category,
          tags: p.tags,
          visibility: p.visibility,
          version: p.version,
          createdAt: p.createdAt ? p.createdAt.toDate().toISOString() : null,
          updatedAt: p.updatedAt ? p.updatedAt.toDate().toISOString() : null,
        })),
        editHistory: edits.map((e) => ({
          id: e.id,
          pageSlug: e.pageSlug,
          pageTitle: e.pageTitle,
          pageVisibility: e.pageVisibility,
          summary: e.summary,
          version: e.version,
          createdAt: e.createdAt ? e.createdAt.toDate().toISOString() : null,
        })),
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wazzimagiygg-lgpd-export-${user.uid.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportDone(true);
    } finally {
      setExporting(false);
    }
  };

  const dpoSubject = encodeURIComponent(
    `[LGPD / Marco Civil Request] ${LEGAL_GOVERNANCE.siteName}${
      user ? ` (UID: ${user.uid.slice(0, 8)})` : ''
    }`
  );
  const dpoBody = encodeURIComponent(
    `Hello ${LEGAL_GOVERNANCE.dpoName},\n\nI would like to submit a request regarding personal data or content governance under ${LEGAL_GOVERNANCE.lgpdLaw} / ${LEGAL_GOVERNANCE.marcoCivilLaw}.\n\n` +
      (user
        ? `Account UID: ${user.uid}\nPersonal Page Slug: ${
            collaboratorProfile?.personalPageSlug ?? 'N/A'
          }\n\nRequest details:\n`
        : 'Request details:\n')
  );
  const dpoMailto = `mailto:${LEGAL_GOVERNANCE.dpoEmail}?subject=${dpoSubject}&body=${dpoBody}`;

  return (
    <div className="space-y-6">
      {/* Header & Controller/DPO Governance Card */}
      <div className="pb-5 border-b border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-mono">wiki / governance / lgpd-marco-civil</span>
          <span className="font-mono tabular-nums">
            Effective: {LEGAL_GOVERNANCE.effectiveDate}
          </span>
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100">
          Privacy Policy, LGPD &amp; Marco Civil Compliance
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          {LEGAL_GOVERNANCE.siteName} operates in alignment with Brazil&apos;s{' '}
          <strong>General Data Protection Law ({LEGAL_GOVERNANCE.lgpdLaw})</strong> and the{' '}
          <strong>Brazilian Internet Bill of Rights ({LEGAL_GOVERNANCE.marcoCivilLaw})</strong>,
          upholding data minimization, user transparency, and safe notice-and-takedown governance.
        </p>

        {/* Official Controller & DPO Disclosure Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0b0f17] text-xs">
          <div className="space-y-1">
            <div className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
              Data Controller &amp; Responsible Officer
            </div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {LEGAL_GOVERNANCE.controllerName}
            </div>
            <div className="text-slate-500 dark:text-slate-400">
              Platform: {LEGAL_GOVERNANCE.siteUrl}
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
              Data Protection Officer (DPO / Encarregado — Art. 41, LGPD)
            </div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {LEGAL_GOVERNANCE.dpoName}
            </div>
            <div>
              <a
                href={dpoMailto}
                className="inline-flex items-center gap-1.5 font-mono text-blue-700 dark:text-blue-400 hover:underline"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>{LEGAL_GOVERNANCE.dpoEmail}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => onSwitchSection('privacy')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              section === 'privacy'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy &amp; LGPD (Law 13.709/2018)</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchSection('terms')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              section === 'terms'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Terms &amp; Marco Civil (Law 12.965/2014)</span>
          </button>
        </div>
      </div>

      {section === 'privacy' ? (
        <div className="space-y-6 max-w-4xl">
          {/* Data Collected & Purpose */}
          <section className="space-y-2.5">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              1. Personal Data Processed &amp; Purpose (Art. 7 &amp; Art. 9, LGPD)
            </h2>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3.5 bg-white dark:bg-[#0b0f17]">
                <div className="sm:col-span-4 font-semibold text-slate-800 dark:text-slate-200">
                  Private Account Identity
                </div>
                <div className="sm:col-span-8 text-slate-600 dark:text-slate-300">
                  Verified Google account email and UID stored strictly in isolated Firestore paths (
                  <code className="font-mono">/users/&#123;uid&#125;/private/info</code>), readable
                  only by the account holder and authorized platform administrators for governance,
                  security, and moderation.
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3.5 bg-white dark:bg-[#0b0f17]">
                <div className="sm:col-span-4 font-semibold text-slate-800 dark:text-slate-200">
                  Public Collaborator Attribution
                </div>
                <div className="sm:col-span-8 text-slate-600 dark:text-slate-300">
                  Public display name, optional profile photo URL, personal wiki slug, revision
                  history, and discussion comments created when collaborating on wiki pages. Private
                  email addresses are never published on wiki pages or infoboxes.
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3.5 bg-white dark:bg-[#0b0f17]">
                <div className="sm:col-span-4 font-semibold text-slate-800 dark:text-slate-200">
                  Essential Browser Storage
                </div>
                <div className="sm:col-span-8 text-slate-600 dark:text-slate-300">
                  Strictly necessary Firebase Authentication session storage plus local preferences
                  (<code className="font-mono">wazzimagiygg-theme</code> and privacy notice
                  acknowledgment). No advertising trackers or third-party profiling cookies are used.
                </div>
              </div>
            </div>
          </section>

          {/* Data Subject Rights & Portability */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              2. Data Subject Rights &amp; Self-Service Tools (Art. 18, LGPD)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Under Article 18 of the LGPD, every user has the right to confirmation of processing,
              access and data portability, correction of incomplete or outdated information,
              anonymization, blocking, and deletion of personal data.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b0f17] space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Download className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span>Data Portability (Export JSON)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Download a structured JSON package containing your account profile, private email
                  record, authored pages, and collaborative edit logs.
                </p>
                {user ? (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={exporting}
                      onClick={() => void handleExportMyData()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{exporting ? 'Preparing export...' : 'Export My Data (.json)'}</span>
                    </button>
                    {exportDone && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Downloaded</span>
                      </span>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Sign in to export your data
                  </button>
                )}
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b0f17] space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Mail className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span>Erasure, Anonymization &amp; DPO Contact</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  To request account anonymization, complete erasure (LGPD Art. 18, VI), or
                  correction of records, contact our Data Protection Officer directly. Verified
                  removals are logged in an immutable audit trail without retaining deleted PII.
                </p>
                <a
                  href={dpoMailto}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Contact DPO ({LEGAL_GOVERNANCE.dpoEmail})</span>
                </a>
              </div>
            </div>
          </section>

          {/* Technical Security */}
          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              3. Information Security &amp; Retention (Art. 15, Art. 16 &amp; Art. 46, LGPD)
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <li>
                Write operations require verified Google authentication and are validated server-side
                through Firebase Firestore Security Rules.
              </li>
              <li>
                Personal data is retained only while your collaborator account remains active or as
                required by statutory retention obligations under Brazilian law.
              </li>
              <li>
                Upon verified LGPD erasure execution, private records and personal identifiers are
                scrubbed or anonymized across pages, revisions, and comments.
              </li>
            </ul>
          </section>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              1. Collaborative Authorship &amp; Responsibility (Art. 2, Art. 3 &amp; Art. 19)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              In accordance with the <strong>Marco Civil da Internet (Law No. 12.965/2014)</strong>,{' '}
              {LEGAL_GOVERNANCE.siteName} respects freedom of expression, privacy, and network
              neutrality. Each authenticated collaborator is responsible for the content, sources,
              and intellectual property rights of the Markdown pages, infoboxes, and discussion
              comments they publish.
            </p>
          </section>

          <section className="space-y-2.5">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              2. Content Moderation &amp; Notice-and-Takedown Channel (Art. 19 &amp; Art. 21)
            </h2>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b0f17] space-y-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                Wiki administrators and bureaucrats maintain moderation controls to lock pages,
                revert abusive revisions, delete unlawful material, and suspend non-compliant
                accounts.
              </p>
              <p>
                Under Articles 19 and 21 of the Marco Civil da Internet, any affected party may
                submit a specific notice identifying the exact page slug (
                <code className="font-mono">https://wikimaker.wazzimagiygg.com/#/page/...</code>)
                and the grounds for removal (such as privacy breach, non-consensual sensitive
                media, harassment, or copyright infringement) directly to the responsible officer:
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-3">
                <a
                  href={dpoMailto}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Report Content to {LEGAL_GOVERNANCE.dpoName}</span>
                </a>
                <button
                  type="button"
                  onClick={() => onSelectPage('start')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Return to Wiki Home</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectPage(DOSSIER_PAGE_SLUG)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors whitespace-nowrap shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Read {DOSSIER_PAGE_TITLE}</span>
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              3. Access Governance &amp; Auditability (Art. 13–15 &amp; Security Rules)
            </h2>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17] flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <Lock className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                All collaborative mutations record actor attribution, timestamps, and immutable
                revision histories, enforcing role-based governance without selling or sharing user
                activity logs with unauthorized third parties.
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
