import React from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  FileCode,
  GitBranch,
  GitCommitHorizontal,
  RefreshCw,
  Search,
  Tag,
} from 'lucide-react';
import {
  type RepoCommitDetail,
  type RepoCommitSummary,
  type RepoUpdatesSnapshot,
  WIKI_GITHUB_URL,
  fetchRepoCommitDetail,
  fetchRepoUpdatesSnapshot,
  formatIsoAbsolutePt,
  formatIsoRelativePt,
} from '../lib/repoUpdatesService';

interface RepoUpdatesPanelProps {
  isBureaucrat: boolean;
}

type UpdatesSubView = 'commits' | 'releases';

const FILE_STATUS_LABELS: Record<string, string> = {
  added: 'adicionado',
  modified: 'modificado',
  removed: 'removido',
  renamed: 'renomeado',
  copied: 'copiado',
  changed: 'alterado',
};

export const RepoUpdatesPanel: React.FC<RepoUpdatesPanelProps> = ({ isBureaucrat }) => {
  const [snapshot, setSnapshot] = React.useState<RepoUpdatesSnapshot | null>(null);
  const [selectedBranch, setSelectedBranch] = React.useState<string | undefined>(undefined);
  const [subView, setSubView] = React.useState<UpdatesSubView>('commits');
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [expandedSha, setExpandedSha] = React.useState<string | null>(null);
  const [commitDetailsBySha, setCommitDetailsBySha] = React.useState<
    Record<string, RepoCommitDetail>
  >({});
  const [loadingDetailSha, setLoadingDetailSha] = React.useState<string | null>(null);
  const [detailErrorBySha, setDetailErrorBySha] = React.useState<Record<string, string>>({});
  const [copiedSha, setCopiedSha] = React.useState<string | null>(null);

  const loadUpdates = React.useCallback(async (branch?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchRepoUpdatesSnapshot(branch);
      setSnapshot(data);
      setSelectedBranch(data.selectedBranch);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Não foi possível ler as atualizações do repositório no GitHub.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadUpdates(selectedBranch);
  }, [loadUpdates, selectedBranch]);

  const handleToggleCommit = async (commit: RepoCommitSummary) => {
    if (expandedSha === commit.sha) {
      setExpandedSha(null);
      return;
    }

    setExpandedSha(commit.sha);
    if (commitDetailsBySha[commit.sha]) return;

    setLoadingDetailSha(commit.sha);
    setDetailErrorBySha((prev) => {
      const next = { ...prev };
      delete next[commit.sha];
      return next;
    });

    try {
      const detail = await fetchRepoCommitDetail(commit.sha);
      setCommitDetailsBySha((prev) => ({
        ...prev,
        [commit.sha]: detail,
      }));
    } catch (err) {
      setDetailErrorBySha((prev) => ({
        ...prev,
        [commit.sha]:
          err instanceof Error ? err.message : 'Falha ao carregar arquivos alterados.',
      }));
    } finally {
      setLoadingDetailSha((curr) => (curr === commit.sha ? null : curr));
    }
  };

  const handleCopySha = async (sha: string) => {
    try {
      await navigator.clipboard.writeText(sha);
      setCopiedSha(sha);
      window.setTimeout(() => {
        setCopiedSha((curr) => (curr === sha ? null : curr));
      }, 1800);
    } catch {
      // Clipboard may be unavailable in restricted contexts
    }
  };

  const filteredCommits = React.useMemo(() => {
    const commits = snapshot?.commits ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return commits;
    return commits.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.body.toLowerCase().includes(q) ||
        c.shortSha.toLowerCase().includes(q) ||
        c.sha.toLowerCase().includes(q) ||
        c.authorName.toLowerCase().includes(q) ||
        (c.authorLogin ?? '').toLowerCase().includes(q)
    );
  }, [snapshot?.commits, search]);

  const filteredReleases = React.useMemo(() => {
    const releases = snapshot?.releases ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return releases;
    return releases.filter(
      (r) =>
        r.tagName.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.body.toLowerCase().includes(q)
    );
  }, [snapshot?.releases, search]);

  const latestRelease = snapshot?.releases[0] ?? null;

  return (
    <div className="space-y-5">
      {/* Repository Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0b0f17]">
        <div className="space-y-1 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
            <GitCommitHorizontal className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
            <span>Atualizações do Repositório Oficial</span>
            <span aria-hidden="true" className="text-slate-400 font-normal">
              ·
            </span>
            <a
              href={snapshot?.repo.htmlUrl ?? WIKI_GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
            >
              <span>{snapshot?.repo.fullName ?? 'WazzimaGiygg/WazzimaGiygg-Wiki-Maker'}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {snapshot?.repo.description ||
              'Leitura direta dos commits e releases mais recentes do repositório fonte do Wiki-site via API pública do GitHub.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {snapshot && snapshot.branches.length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-xs text-slate-700 dark:text-slate-200">
              <GitBranch className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              <label htmlFor="repo-branch-select" className="sr-only">
                Selecionar branch do repositório
              </label>
              <select
                id="repo-branch-select"
                value={snapshot.selectedBranch}
                disabled={loading}
                onChange={(e) => {
                  setExpandedSha(null);
                  setSelectedBranch(e.target.value);
                }}
                className="bg-transparent font-mono text-xs focus:outline-none cursor-pointer"
              >
                {snapshot.branches.map((branch) => (
                  <option
                    key={branch.name}
                    value={branch.name}
                    className="bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100"
                  >
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={() => void loadUpdates(selectedBranch)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
        </div>
      </div>

      {!isBureaucrat && (
        <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200">
          Painel informativo de acompanhamento do repositório destinado à supervisão de{' '}
          <strong>Burocratas</strong> e Administradores.
        </div>
      )}

      {/* Repository Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 dark:border-slate-800 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 bg-slate-50/60 dark:bg-[#0b0f17]">
        <div className="p-3.5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Branch Ativa</div>
          <div className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1 truncate">
            {loading && !snapshot ? '—' : snapshot?.selectedBranch ?? 'main'}
          </div>
        </div>
        <div className="p-3.5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Último Push</div>
          <div
            className="font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100 mt-1 truncate"
            title={snapshot ? formatIsoAbsolutePt(snapshot.repo.pushedAt) : undefined}
          >
            {loading && !snapshot ? '—' : formatIsoRelativePt(snapshot?.repo.pushedAt)}
          </div>
        </div>
        <div className="p-3.5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Commits Recentes</div>
          <div className="font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {loading && !snapshot ? '—' : snapshot?.commits.length ?? 0}
          </div>
        </div>
        <div className="p-3.5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Último Release</div>
          <div className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1 truncate">
            {loading && !snapshot ? '—' : latestRelease ? latestRelease.tagName : 'Nenhum'}
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 text-xs text-red-900 dark:text-red-200 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold">Erro ao consultar atualizações do GitHub</div>
              <div>{errorMsg}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void loadUpdates(selectedBranch)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-[#0b0f17] text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-950/50 whitespace-nowrap cursor-pointer"
            >
              Tentar novamente
            </button>
            <a
              href={`${WIKI_GITHUB_URL}/commits`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-700 text-white hover:bg-red-800 whitespace-nowrap"
            >
              <span>Ver no GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Filter Controls & Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
          <button
            type="button"
            onClick={() => setSubView('commits')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subView === 'commits'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Commits ({snapshot?.commits.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setSubView('releases')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subView === 'releases'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Releases ({snapshot?.releases.length ?? 0})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              subView === 'commits'
                ? 'Filtrar por mensagem, SHA ou autor...'
                : 'Filtrar releases por tag ou notas...'
            }
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && !snapshot ? (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#0b0f17]">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="p-4 space-y-2">
              <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-slate-100 dark:bg-slate-800/70 animate-pulse" />
            </div>
          ))}
        </div>
      ) : subView === 'commits' ? (
        filteredCommits.length === 0 ? (
          <div className="py-12 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-[#0b0f17] space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {snapshot?.commits.length
                ? 'Nenhum commit encontrado para o filtro informado.'
                : 'Nenhum commit carregado neste momento.'}
            </p>
            {search.trim() && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Limpar filtro
              </button>
            )}
          </div>
        ) : (
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#0b0f17]">
            {filteredCommits.map((commit) => {
              const isExpanded = expandedSha === commit.sha;
              const detail = commitDetailsBySha[commit.sha];
              const isDetailLoading = loadingDetailSha === commit.sha;
              const detailError = detailErrorBySha[commit.sha];

              return (
                <div key={commit.sha} className="transition-colors">
                  <div className="p-4 flex flex-wrap items-start justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                    <button
                      type="button"
                      onClick={() => void handleToggleCommit(commit)}
                      aria-expanded={isExpanded}
                      className="flex-1 min-w-0 flex items-start gap-2.5 text-left cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded"
                    >
                      <span className="mt-0.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </span>

                      <div className="min-w-0 space-y-1.5">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 break-words">
                          {commit.title}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1.5">
                            {commit.authorAvatarUrl ? (
                              <img
                                src={commit.authorAvatarUrl}
                                alt={commit.authorName}
                                referrerPolicy="no-referrer"
                                className="w-4 h-4 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                              />
                            ) : null}
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {commit.authorName}
                            </span>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className="font-mono tabular-nums"
                            title={formatIsoAbsolutePt(commit.dateIso)}
                          >
                            {formatIsoRelativePt(commit.dateIso)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-[11px] text-slate-600 dark:text-slate-300">
                            {commit.shortSha}
                          </span>
                          {commit.body && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                contém notas
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleCopySha(commit.sha)}
                        title="Copiar SHA completo do commit"
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono tabular-nums rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f1623] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                      >
                        {copiedSha === commit.sha ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{commit.shortSha}</span>
                          </>
                        )}
                      </button>

                      <a
                        href={commit.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir commit no GitHub"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1623] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                      >
                        <span>GitHub</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 pl-10 border-t border-slate-100 dark:border-slate-800/70 bg-slate-50/50 dark:bg-[#0f1623]/50 space-y-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        <span>Publicado em {formatIsoAbsolutePt(commit.dateIso)}</span>
                        <span aria-hidden="true">·</span>
                        <span>SHA: {commit.sha}</span>
                      </div>

                      {commit.body && (
                        <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {commit.body}
                        </div>
                      )}

                      {isDetailLoading ? (
                        <div className="space-y-1.5 py-1">
                          <div className="h-3 w-48 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                          <div className="h-3 w-full rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
                        </div>
                      ) : detailError ? (
                        <div className="text-xs text-red-700 dark:text-red-400">
                          {detailError}
                        </div>
                      ) : detail ? (
                        <div className="space-y-2 pt-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                            <span>
                              {detail.files.length}{' '}
                              {detail.files.length === 1 ? 'arquivo alterado' : 'arquivos alterados'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-700 dark:text-emerald-400">
                              +{detail.stats.additions}
                            </span>
                            <span aria-hidden="true">/</span>
                            <span className="text-red-700 dark:text-red-400">
                              -{detail.stats.deletions}
                            </span>
                          </div>

                          {detail.files.length > 0 && (
                            <ul className="divide-y divide-slate-200/80 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-[#0b0f17]">
                              {detail.files.map((file) => (
                                <li
                                  key={file.filename}
                                  className="px-3 py-1.5 flex items-center justify-between gap-3 text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="font-mono text-slate-800 dark:text-slate-200 truncate">
                                      {file.filename}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2.5 font-mono text-[11px] tabular-nums shrink-0">
                                    <span className="text-slate-500 dark:text-slate-400">
                                      {FILE_STATUS_LABELS[file.status] ?? file.status}
                                    </span>
                                    <span className="text-emerald-700 dark:text-emerald-400">
                                      +{file.additions}
                                    </span>
                                    <span className="text-red-700 dark:text-red-400">
                                      -{file.deletions}
                                    </span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : filteredReleases.length === 0 ? (
        <div className="py-12 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-[#0b0f17] space-y-2.5">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {snapshot?.releases.length
              ? 'Nenhum release encontrado para o filtro informado.'
              : 'Este repositório ainda não possui releases publicados.'}
          </p>
          <button
            type="button"
            onClick={() => setSubView('commits')}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Ver histórico de commits
          </button>
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#0b0f17]">
          {filteredReleases.map((release) => (
            <div key={release.id} className="p-4 sm:p-5 space-y-2.5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                    <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                      {release.name}
                    </h3>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      {release.tagName}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {release.authorLogin && (
                      <>
                        <span>Por {release.authorLogin}</span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span
                      className="font-mono tabular-nums"
                      title={formatIsoAbsolutePt(release.publishedAt ?? release.createdAt)}
                    >
                      {formatIsoRelativePt(release.publishedAt ?? release.createdAt)}
                    </span>
                    {release.prerelease && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>pré-lançamento</span>
                      </>
                    )}
                  </div>
                </div>

                <a
                  href={release.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1623] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <span>Abrir release</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {release.body && (
                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap pt-1">
                  {release.body}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer note with last sync timestamp */}
      {snapshot && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          <span>
            Sincronizado em {formatIsoAbsolutePt(snapshot.fetchedAtIso)}
          </span>
          {snapshot.rateLimitRemaining !== null && (
            <span>Cota GitHub REST restante: {snapshot.rateLimitRemaining} req/h</span>
          )}
        </div>
      )}
    </div>
  );
};
