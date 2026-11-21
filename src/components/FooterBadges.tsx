import React from 'react';

interface FooterBadgesProps {
  siteTitle?: string;
  showWikiomiteBadge?: boolean;
  onNavigateHome: () => void;
  onNavigateLegal: () => void;
  onNavigateDossier: () => void;
}

/**
 * Retro 88x31 footer buttons matching the wikizero.wazzimagiygg.com ecosystem bar.
 */
export const FooterBadges: React.FC<FooterBadgesProps> = ({
  siteTitle = 'WazzimaGiygg Maker',
  showWikiomiteBadge = false,
  onNavigateHome,
  onNavigateLegal,
  onNavigateDossier,
}) => {
  const [logoError, setLogoError] = React.useState(false);

  return (
    <div
      aria-label="Footer service and compliance buttons"
      className="flex flex-wrap items-center justify-center sm:justify-end gap-2 pt-1"
    >
      {/* 1. Official Site Home Badge */}
      <button
        type="button"
        onClick={onNavigateHome}
        title={`${siteTitle} — Enciclopédia Colaborativa Aberta`}
        className="inline-flex items-center justify-between w-[88px] h-[31px] bg-gradient-to-br from-slate-900 via-slate-800 to-black border border-slate-700 hover:border-blue-500 rounded transition p-1 shadow-xs group cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {!logoError ? (
          <img
            src="/assets/aistudio/image_c25fcad0.png"
            alt={siteTitle}
            referrerPolicy="no-referrer"
            onError={() => setLogoError(true)}
            className="w-5 h-5 object-contain rounded-xs shrink-0"
          />
        ) : (
          <span className="w-5 h-5 rounded-xs bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
            {siteTitle.trim().charAt(0).toUpperCase() || 'W'}
          </span>
        )}
        <div className="flex flex-col text-right leading-none pr-0.5 whitespace-nowrap">
          <span className="text-[5.5px] font-mono tracking-tighter text-blue-400 font-bold uppercase">
            OFFICIAL
          </span>
          <span className="text-[7.5px] font-sans font-bold text-white group-hover:text-blue-300 tracking-tight">
            WikiMaker
          </span>
        </div>
      </button>

      {showWikiomiteBadge && (
        <button
          type="button"
          onClick={onNavigateHome}
          title="Wikidiota (Tema Paródia) — Mantido pela Wikiomite Foundation durante o Reinado do Chronus"
          className="inline-flex items-center justify-between w-[88px] h-[31px] bg-gradient-to-br from-[#450a0a] via-[#7f1d1d] to-[#1c1917] border border-red-400/70 hover:border-red-300 rounded transition p-1 shadow-xs group cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
        >
          <div className="w-5 h-5 rounded flex items-center justify-center bg-red-500/20 text-red-200 border border-red-400/40 text-[7px] font-mono font-bold shrink-0">
            WF
          </div>
          <div className="flex flex-col text-right leading-none pr-0.5 whitespace-nowrap">
            <span className="text-[5px] font-mono tracking-tighter text-red-200 font-bold uppercase">
              WIKIOMITE
            </span>
            <span className="text-[7px] font-sans font-bold text-white group-hover:text-red-100 tracking-tight">
              Chronus Era
            </span>
          </div>
        </button>
      )}

      {/* 2. Suporte Tickets 24h */}
      <a
        href="https://support.wazzimagiygg.com/"
        target="_blank"
        rel="noopener noreferrer"
        title="Central de Suporte, Tickets e Atendimento dos Serviços WazzimaGiygg"
        className="inline-flex items-center justify-between w-[88px] h-[31px] bg-gradient-to-br from-[#1e1b4b] via-[#0f172a] to-[#020617] border border-indigo-500/70 hover:border-indigo-400 rounded transition p-1 shadow-xs group shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
      >
        <div className="w-5 h-5 rounded flex items-center justify-center bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shrink-0">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-indigo-300" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12v6c0 1.1.9 2 2 2h3v-8H4v-2c0-4.41 3.59-8 8-8s8 3.59 8 8v2h-3v8h3c1.1 0 2-.9 2-2v-6c0-5.52-4.48-10-10-10zm-6 12H4v-2h2v2zm14 0h-2v-2h2v2z" />
          </svg>
        </div>
        <div className="flex flex-col text-right leading-none pr-0.5 whitespace-nowrap">
          <span className="text-[5.2px] font-mono tracking-tighter text-indigo-400 font-bold uppercase">
            SUPORTE
          </span>
          <span className="text-[7.5px] font-sans font-bold text-indigo-100 group-hover:text-white tracking-tight">
            Tickets 24h
          </span>
        </div>
      </a>

      {/* 3. Conforme LGPD & MCI */}
      <button
        type="button"
        onClick={onNavigateLegal}
        title="Conformidade integral com a LGPD (Lei nº 13.709/2018) e Marco Civil da Internet (Lei nº 12.965/2014)"
        className="inline-flex items-center justify-between w-[88px] h-[31px] bg-gradient-to-br from-[#062c1e] via-[#051f15] to-[#02100b] border border-emerald-500/70 hover:border-emerald-400 rounded transition p-1 shadow-xs group cursor-pointer text-left shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
      >
        <div className="w-5 h-5 rounded flex items-center justify-center bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-emerald-400" aria-hidden="true">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
          </svg>
        </div>
        <div className="flex flex-col text-right leading-none pr-0.5 whitespace-nowrap">
          <span className="text-[5.2px] font-mono tracking-tighter text-emerald-400 font-bold uppercase">
            CONFORME
          </span>
          <span className="text-[7.5px] font-sans font-bold text-emerald-100 group-hover:text-white tracking-tight">
            LGPD &amp; MCI
          </span>
        </div>
      </button>

      {/* 4. Powered by Firebase DB */}
      <a
        href="https://firebase.google.com/products/firestore"
        target="_blank"
        rel="noopener noreferrer"
        title="Banco de Dados e Infraestrutura Cloud fornecidos por Google Firebase Firestore"
        className="inline-flex items-center justify-between w-[88px] h-[31px] bg-gradient-to-br from-[#1a140b] via-[#241a0d] to-[#0f0c08] border border-amber-500/50 hover:border-amber-400 rounded transition p-1 shadow-xs group shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" aria-hidden="true">
          <path d="M5.4 17.5L8.2 2.8C8.3 2.3 9 2.1 9.4 2.5L13.1 9.3L5.4 17.5Z" fill="#FFA000" />
          <path d="M13.1 9.3L15.3 5.3C15.6 4.8 16.3 4.9 16.5 5.5L18.8 17.5L13.1 9.3Z" fill="#F57C00" />
          <path
            d="M3.2 19.8L5.4 17.5L13.1 9.3L15.3 13.5L3.8 20.3C3.3 20.6 2.8 20.2 3.2 19.8Z"
            fill="#FFCA28"
          />
          <path
            d="M18.8 17.5L15.3 13.5L13.1 9.3L9.4 2.5C9 2.1 8.3 2.3 8.2 2.8L3.2 19.8C2.9 20.9 3.9 21.8 4.9 21.3L12 17.3L19.1 21.3C20.1 21.8 21.1 20.9 20.8 19.8L18.8 17.5Z"
            fill="#FFA000"
          />
          <path
            d="M12 17.3L4.9 21.3C3.9 21.8 2.9 20.9 3.2 19.8L3.8 20.3C3.3 20.2 2.8 20.6 3.2 19.8L4.9 21.3L12 17.3Z"
            fill="#FF8F00"
          />
        </svg>
        <div className="flex flex-col text-right leading-none pr-0.5 whitespace-nowrap">
          <span className="text-[5.5px] font-mono tracking-tighter text-amber-400 font-bold uppercase">
            POWERED BY
          </span>
          <span className="text-[7.5px] font-sans font-bold text-amber-200 group-hover:text-amber-100 tracking-tight">
            Firebase DB
          </span>
        </div>
      </a>

      {/* 5. Domínio GoDaddy */}
      <a
        href="https://www.godaddy.com"
        target="_blank"
        rel="noopener noreferrer"
        title="Domínio oficial registrado via GoDaddy"
        className="inline-flex items-center justify-between w-[88px] h-[31px] bg-gradient-to-br from-[#003734] via-[#002725] to-[#011413] border border-emerald-500/60 hover:border-emerald-400 rounded transition p-1 shadow-xs group shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
      >
        <div className="w-5 h-5 rounded flex items-center justify-center bg-emerald-400/10 text-emerald-400 border border-emerald-500/30 shrink-0">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-[#00A4A6]" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2V7h2v5.5z" />
          </svg>
        </div>
        <div className="flex flex-col text-right leading-none pr-0.5 whitespace-nowrap">
          <span className="text-[5.5px] font-mono tracking-tighter text-emerald-400 font-bold uppercase">
            DOMÍNIO
          </span>
          <span className="text-[7.5px] font-sans font-bold text-emerald-100 group-hover:text-white tracking-tight">
            GoDaddy
          </span>
        </div>
      </a>

      {/* 6. Dossiê Wiki: Investigação LGPD & Marco Civil */}
      <button
        type="button"
        onClick={onNavigateDossier}
        title="Ler o Dossiê Regulatório LGPD & Marco Civil — WMF e Wikipédia"
        className="inline-flex items-center justify-between w-[88px] h-[31px] bg-gradient-to-br from-amber-950 via-slate-900 to-black border border-amber-500/60 hover:border-amber-400 rounded transition p-1 shadow-xs group cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
      >
        <div className="w-5 h-5 rounded flex items-center justify-center bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
            <path d="M12 2L1 21h22L12 2zm0 3.5l7.53 13.5H4.47L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
          </svg>
        </div>
        <div className="flex flex-col text-right leading-none pr-0.5 whitespace-nowrap">
          <span className="text-[5.5px] font-mono tracking-tighter text-amber-400 font-bold uppercase">
            DOSSIÊ WIKI
          </span>
          <span className="text-[7.5px] font-sans font-bold text-amber-100 group-hover:text-white tracking-tight">
            A Verdade
          </span>
        </div>
      </button>

      {/* 6b. Ecossistema WazzimaGiygg /averdade */}
      <a
        href="https://wazzimagiygg.com/averdade/"
        target="_blank"
        rel="noopener noreferrer"
        title="Ecossistema wazzimagiygg.com — Confira a verdade sobre os absurdos da Wikipédia"
        className="inline-flex items-center justify-between w-[88px] h-[31px] bg-gradient-to-br from-slate-900 via-indigo-950 to-black border border-sky-500/60 hover:border-sky-400 rounded transition p-1 shadow-xs group shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
      >
        <div className="w-5 h-5 rounded flex items-center justify-center bg-sky-500/20 text-sky-300 border border-sky-400/40 text-[7px] font-mono font-bold shrink-0">
          WG
        </div>
        <div className="flex flex-col text-right leading-none pr-0.5 whitespace-nowrap">
          <span className="text-[5px] font-mono tracking-tighter text-sky-300 font-bold uppercase">
            WAZZIMAGIYGG
          </span>
          <span className="text-[7.5px] font-sans font-bold text-white group-hover:text-sky-200 tracking-tight">
            /averdade
          </span>
        </div>
      </a>

      {/* 7. Open Source GitHub */}
      <a
        href="https://github.com/WazzimaGiygg/WikiWazzimaGiygg"
        target="_blank"
        rel="noopener noreferrer"
        title="Código-fonte aberto e repositório oficial no GitHub: WazzimaGiygg/WikiWazzimaGiygg"
        className="inline-flex items-center justify-between w-[88px] h-[31px] bg-gradient-to-br from-[#24292e] to-[#181a1f] dark:from-[#1b1f24] dark:to-[#0d1117] border border-slate-700 hover:border-slate-400 rounded transition p-1 shadow-xs group shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 text-white fill-current" aria-hidden="true">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          />
        </svg>
        <div className="flex flex-col text-right leading-none pr-0.5 whitespace-nowrap">
          <span className="text-[5.5px] font-mono tracking-tighter text-slate-400 font-bold uppercase">
            OPEN SOURCE
          </span>
          <span className="text-[7.5px] font-sans font-bold text-white group-hover:text-slate-200 tracking-tight">
            GitHub
          </span>
        </div>
      </a>

      {/* 8. Creative Commons CC BY-SA 4.0 */}
      <a
        href="https://creativecommons.org/licenses/by-sa/4.0/"
        target="_blank"
        rel="noopener noreferrer"
        title="Conteúdo licenciado sob Creative Commons Atribuição-CompartilhaIgual (CC BY-SA 4.0)"
        className="inline-flex items-center justify-between w-[88px] h-[31px] bg-[#f8f9fa] dark:bg-[#1a202c] border border-slate-300 dark:border-slate-700 hover:border-slate-500 dark:hover:border-slate-400 rounded transition p-1 shadow-xs group shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <div className="flex items-center gap-0.5 shrink-0">
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 text-slate-700 dark:text-slate-300"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2.5-9c.83 0 1.5.67 1.5 1.5v1c0 .83-.67 1.5-1.5 1.5H8v-4h1.5zm0 1.5H8.75v1H9.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5zm5.5-1.5c.83 0 1.5.67 1.5 1.5v1c0 .83-.67 1.5-1.5 1.5H13.5v-4H15zm0 1.5h-.75v1H15c.28 0 .5-.22.5-.5s-.22-.5-.5-.5z" />
          </svg>
          <svg
            viewBox="0 0 24 24"
            className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 14c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
              transform="scale(0.8) translate(3, 1)"
            />
          </svg>
        </div>
        <div className="flex flex-col text-right leading-none pr-0.5 whitespace-nowrap">
          <span className="text-[5.5px] font-sans tracking-tighter text-slate-500 dark:text-slate-400 font-bold uppercase">
            CREATIVE
          </span>
          <span className="text-[7.5px] font-sans font-bold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">
            CC BY-SA
          </span>
        </div>
      </a>

      {/* 9. GNU GPL v2+ */}
      <a
        href="https://www.gnu.org/licenses/old-licenses/gpl-2.0.html"
        target="_blank"
        rel="noopener noreferrer"
        title="Software livre sob GNU General Public License v2 ou posterior"
        className="inline-flex items-center justify-between w-[88px] h-[31px] bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-600 hover:border-blue-400 rounded transition p-1 shadow-xs group shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      >
        <div className="w-5 h-5 rounded flex items-center justify-center bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[8px] font-mono font-bold shrink-0">
          GNU
        </div>
        <div className="flex flex-col text-right leading-none pr-0.5 whitespace-nowrap">
          <span className="text-[5.5px] font-mono tracking-tighter text-blue-300 font-bold uppercase">
            LICENSE
          </span>
          <span className="text-[7.5px] font-sans font-bold text-white group-hover:text-blue-200 tracking-tight">
            GPL v2+
          </span>
        </div>
      </a>

      {/* 10. Official PDF Dossier */}
      <a
        href="https://wazzimagiygg.com/Investiga%C3%A7%C3%A3o%20LGPD%20e%20Marco%20Civ%C3%ADl%20WMF%20e%20Wikip%C3%A9dia.pdf"
        target="_blank"
        rel="noopener noreferrer"
        title="Download do PDF oficial da Investigação LGPD e Marco Civil (WMF e Wikipédia)"
        className="inline-flex items-center justify-between w-[88px] h-[31px] bg-gradient-to-br from-rose-950 via-slate-900 to-black border border-rose-500/60 hover:border-rose-400 rounded transition p-1 shadow-xs group shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
      >
        <div className="w-5 h-5 rounded flex items-center justify-center bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[7px] font-mono font-bold shrink-0">
          PDF
        </div>
        <div className="flex flex-col text-right leading-none pr-0.5 whitespace-nowrap">
          <span className="text-[5.5px] font-mono tracking-tighter text-rose-400 font-bold uppercase">
            AUDITORIA
          </span>
          <span className="text-[7.5px] font-sans font-bold text-rose-100 group-hover:text-white tracking-tight">
            Dossiê PDF
          </span>
        </div>
      </a>
    </div>
  );
};
