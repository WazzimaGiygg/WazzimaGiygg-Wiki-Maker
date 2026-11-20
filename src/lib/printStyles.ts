export const PRINT_STYLESHEET_ID = 'wiki-print-stylesheet';

/**
 * Generates a dedicated CSS print stylesheet that strips away navigation,
 * sidebars, interactive edit tools, and dark-mode ink-heavy surfaces for
 * a clean, document-ready printed output (both in live Print View and @media print).
 */
export function buildWikiPrintStylesheet(): string {
  return `
@page {
  size: auto;
  margin: 18mm 16mm 20mm 16mm;
}

/* On-screen Print View preview canvas */
.wiki-print-view {
  background: #e2e8f0 !important;
  color: #0f172a !important;
  min-height: 100vh;
}

.wiki-print-view [data-wiki-chrome="nav"],
.wiki-print-view [data-wiki-chrome="sidebar"],
.wiki-print-view [data-wiki-chrome="edit-tools"],
.wiki-print-view [data-wiki-chrome="page-outline"],
.wiki-print-view [data-wiki-chrome="footer"],
.wiki-print-view [data-wiki-chrome="floating"],
.wiki-print-view [data-wiki-chrome="personal-actions"] {
  display: none !important;
}

.wiki-print-view [data-wiki-document="sheet"] {
  max-width: 820px !important;
  width: 100% !important;
  margin: 1.5rem auto 3rem auto !important;
  background: #ffffff !important;
  color: #0f172a !important;
  border: 1px solid #cbd5e1 !important;
  border-radius: 0.375rem !important;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08) !important;
  padding: 2.5rem 2.75rem !important;
}

.wiki-print-view [data-wiki-document="article"] {
  grid-column: span 12 / span 12 !important;
  max-width: 100% !important;
}

.wiki-print-view [data-wiki-document="sheet"] *,
.wiki-print-view [data-wiki-document="sheet"] *::before,
.wiki-print-view [data-wiki-document="sheet"] *::after {
  border-color: #cbd5e1 !important;
}

.wiki-print-view [data-wiki-document="sheet"] h1,
.wiki-print-view [data-wiki-document="sheet"] h2,
.wiki-print-view [data-wiki-document="sheet"] h3,
.wiki-print-view [data-wiki-document="sheet"] h4,
.wiki-print-view [data-wiki-document="sheet"] strong {
  color: #0f172a !important;
}

.wiki-print-view [data-wiki-document="sheet"] p,
.wiki-print-view [data-wiki-document="sheet"] li,
.wiki-print-view [data-wiki-document="sheet"] td,
.wiki-print-view [data-wiki-document="sheet"] th,
.wiki-print-view [data-wiki-document="sheet"] dd,
.wiki-print-view [data-wiki-document="sheet"] .wiki-prose {
  color: #1e293b !important;
}

.wiki-print-view [data-wiki-document="sheet"] dt {
  color: #475569 !important;
}

.wiki-print-view [data-wiki-document="sheet"] nav[aria-label="Table of contents"] {
  background: #f8fafc !important;
}

.wiki-print-view [data-wiki-document="sheet"] nav[aria-label="Table of contents"] ol {
  max-height: none !important;
  overflow: visible !important;
}

.wiki-print-view [data-wiki-document="sheet"] nav[aria-label="Table of contents"] button {
  display: none !important;
}

.wiki-print-view [data-wiki-document="sheet"] aside {
  background: #ffffff !important;
  color: #0f172a !important;
}

.wiki-print-view [data-wiki-document="sheet"] aside > div:first-child,
.wiki-print-view [data-wiki-document="sheet"] pre,
.wiki-print-view [data-wiki-document="sheet"] code,
.wiki-print-view [data-wiki-document="sheet"] th,
.wiki-print-view [data-wiki-document="sheet"] blockquote {
  background: #f8fafc !important;
  color: #0f172a !important;
}

.wiki-print-view [data-wiki-document="sheet"] a,
.wiki-print-view [data-wiki-document="sheet"] button {
  color: #1d4ed8 !important;
}

/* Native @media print output */
@media print {
  html,
  body {
    background: #ffffff !important;
    color: #0f172a !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 10.5pt !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .wiki-print-view {
    background: #ffffff !important;
  }

  [data-wiki-chrome="nav"],
  [data-wiki-chrome="sidebar"],
  [data-wiki-chrome="edit-tools"],
  [data-wiki-chrome="page-outline"],
  [data-wiki-chrome="footer"],
  [data-wiki-chrome="floating"],
  [data-wiki-chrome="personal-actions"],
  [data-wiki-print-bar="true"] {
    display: none !important;
  }

  main {
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  [data-wiki-document="sheet"] {
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background: #ffffff !important;
    color: #0f172a !important;
  }

  [data-wiki-document="article"] {
    grid-column: span 12 / span 12 !important;
    max-width: 100% !important;
  }

  [data-wiki-document="sheet"] *,
  [data-wiki-document="sheet"] *::before,
  [data-wiki-document="sheet"] *::after {
    border-color: #cbd5e1 !important;
  }

  [data-wiki-document="sheet"] h1,
  [data-wiki-document="sheet"] h2,
  [data-wiki-document="sheet"] h3,
  [data-wiki-document="sheet"] h4,
  [data-wiki-document="sheet"] strong,
  [data-wiki-document="sheet"] p,
  [data-wiki-document="sheet"] li,
  [data-wiki-document="sheet"] td,
  [data-wiki-document="sheet"] th,
  [data-wiki-document="sheet"] dt,
  [data-wiki-document="sheet"] dd,
  .wiki-prose {
    color: #0f172a !important;
  }

  .wiki-prose h1,
  .wiki-prose h2,
  .wiki-prose h3,
  .wiki-prose h4,
  #referencias h2 {
    break-after: avoid;
    page-break-after: avoid;
  }

  .wiki-prose pre,
  .wiki-prose blockquote,
  .wiki-prose table,
  .wiki-prose tr,
  [data-wiki-document="sheet"] aside,
  #referencias li {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .wiki-prose pre,
  .wiki-prose code,
  .wiki-prose th,
  .wiki-prose blockquote,
  [data-wiki-document="sheet"] aside > div:first-child {
    background: #f8fafc !important;
    color: #0f172a !important;
  }

  nav[aria-label="Table of contents"] {
    background: #f8fafc !important;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  nav[aria-label="Table of contents"] ol {
    max-height: none !important;
    overflow: visible !important;
  }

  nav[aria-label="Table of contents"] button {
    display: none !important;
  }

  a {
    text-decoration: underline !important;
    color: #1e3a8a !important;
  }
}
`.trim();
}
