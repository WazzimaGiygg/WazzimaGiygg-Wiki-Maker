export const WIKI_GITHUB_OWNER = 'WazzimaGiygg';
export const WIKI_GITHUB_REPO = 'WazzimaGiygg-Wiki-Maker';
export const WIKI_GITHUB_URL = `https://github.com/${WIKI_GITHUB_OWNER}/${WIKI_GITHUB_REPO}`;

const GITHUB_API_BASE = `https://api.github.com/repos/${WIKI_GITHUB_OWNER}/${WIKI_GITHUB_REPO}`;

export interface RepoMetadata {
  fullName: string;
  description: string | null;
  htmlUrl: string;
  defaultBranch: string;
  pushedAt: string;
  updatedAt: string;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
}

export interface RepoBranch {
  name: string;
  commitSha: string;
  protected: boolean;
}

export interface RepoCommitSummary {
  sha: string;
  shortSha: string;
  title: string;
  body: string;
  authorName: string;
  authorLogin: string | null;
  authorAvatarUrl: string | null;
  authorHtmlUrl: string | null;
  dateIso: string;
  htmlUrl: string;
}

export interface RepoCommitFileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
}

export interface RepoCommitDetail {
  sha: string;
  stats: {
    total: number;
    additions: number;
    deletions: number;
  };
  files: RepoCommitFileChange[];
}

export interface RepoRelease {
  id: number;
  tagName: string;
  name: string;
  body: string;
  prerelease: boolean;
  draft: boolean;
  publishedAt: string | null;
  createdAt: string;
  authorLogin: string | null;
  htmlUrl: string;
}

export interface RepoUpdatesSnapshot {
  repo: RepoMetadata;
  branches: RepoBranch[];
  selectedBranch: string;
  commits: RepoCommitSummary[];
  releases: RepoRelease[];
  fetchedAtIso: string;
  rateLimitRemaining: number | null;
}

interface GitHubRepoApiResponse {
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  pushed_at: string;
  updated_at: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
}

interface GitHubBranchApiResponse {
  name: string;
  commit: { sha: string };
  protected: boolean;
}

interface GitHubCommitApiResponse {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name?: string;
      date?: string;
    } | null;
    committer: {
      name?: string;
      date?: string;
    } | null;
  };
  author: {
    login?: string;
    avatar_url?: string;
    html_url?: string;
  } | null;
}

interface GitHubCommitDetailApiResponse extends GitHubCommitApiResponse {
  stats?: {
    total?: number;
    additions?: number;
    deletions?: number;
  };
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
  }>;
}

interface GitHubReleaseApiResponse {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  prerelease: boolean;
  draft: boolean;
  published_at: string | null;
  created_at: string;
  html_url: string;
  author: {
    login?: string;
  } | null;
}

export class GitHubUpdatesError extends Error {
  readonly status: number;
  readonly isRateLimited: boolean;
  readonly resetAtIso: string | null;

  constructor(
    message: string,
    status: number,
    isRateLimited = false,
    resetAtIso: string | null = null
  ) {
    super(message);
    this.name = 'GitHubUpdatesError';
    this.status = status;
    this.isRateLimited = isRateLimited;
    this.resetAtIso = resetAtIso;
  }
}

async function fetchGitHubJson<T>(
  url: string
): Promise<{ data: T; rateLimitRemaining: number | null }> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  const remainingHeader = response.headers.get('X-RateLimit-Remaining');
  const rateLimitRemaining =
    remainingHeader !== null && remainingHeader !== ''
      ? Number.parseInt(remainingHeader, 10)
      : null;

  if (!response.ok) {
    const resetHeader = response.headers.get('X-RateLimit-Reset');
    const resetEpoch =
      resetHeader && /^\d+$/.test(resetHeader)
        ? Number.parseInt(resetHeader, 10) * 1000
        : null;
    const resetAtIso = resetEpoch ? new Date(resetEpoch).toISOString() : null;
    const isRateLimited =
      response.status === 429 ||
      (response.status === 403 && rateLimitRemaining === 0);

    let apiMessage = '';
    try {
      const payload = (await response.json()) as { message?: string };
      apiMessage = payload?.message ?? '';
    } catch {
      apiMessage = '';
    }

    if (isRateLimited) {
      throw new GitHubUpdatesError(
        'Anonymous GitHub API rate limit temporarily reached.',
        response.status,
        true,
        resetAtIso
      );
    }

    throw new GitHubUpdatesError(
      apiMessage
        ? `Failed to query GitHub (${response.status}): ${apiMessage}`
        : `Failed to query GitHub repository (HTTP ${response.status}).`,
      response.status,
      false,
      resetAtIso
    );
  }

  const data = (await response.json()) as T;
  return {
    data,
    rateLimitRemaining:
      rateLimitRemaining !== null && !Number.isNaN(rateLimitRemaining)
        ? rateLimitRemaining
        : null,
  };
}

function splitCommitMessage(rawMessage: string): { title: string; body: string } {
  const normalized = (rawMessage || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return { title: '(No commit message)', body: '' };
  }
  const firstBreak = normalized.indexOf('\n');
  if (firstBreak === -1) {
    return { title: normalized, body: '' };
  }
  return {
    title: normalized.slice(0, firstBreak).trim(),
    body: normalized.slice(firstBreak + 1).trim(),
  };
}

function mapCommitSummary(item: GitHubCommitApiResponse): RepoCommitSummary {
  const { title, body } = splitCommitMessage(item.commit?.message ?? '');
  const dateIso =
    item.commit?.author?.date ||
    item.commit?.committer?.date ||
    new Date().toISOString();

  return {
    sha: item.sha,
    shortSha: item.sha.slice(0, 7),
    title,
    body,
    authorName: item.commit?.author?.name || item.author?.login || 'Contributor',
    authorLogin: item.author?.login ?? null,
    authorAvatarUrl: item.author?.avatar_url ?? null,
    authorHtmlUrl: item.author?.html_url ?? null,
    dateIso,
    htmlUrl: item.html_url,
  };
}

/**
 * Fetches repository metadata, branches, latest commits for the chosen branch,
 * and published releases directly from GitHub's public REST API.
 */
export async function fetchRepoUpdatesSnapshot(
  preferredBranch?: string
): Promise<RepoUpdatesSnapshot> {
  const repoResult = await fetchGitHubJson<GitHubRepoApiResponse>(GITHUB_API_BASE);
  const repoData = repoResult.data;
  const targetBranch = (preferredBranch || repoData.default_branch || 'main').trim();

  const [branchesResult, commitsResult, releasesResult] = await Promise.all([
    fetchGitHubJson<GitHubBranchApiResponse[]>(`${GITHUB_API_BASE}/branches?per_page=20`).catch(
      () => ({
        data: [{ name: targetBranch, commit: { sha: '' }, protected: false }],
        rateLimitRemaining: repoResult.rateLimitRemaining,
      })
    ),
    fetchGitHubJson<GitHubCommitApiResponse[]>(
      `${GITHUB_API_BASE}/commits?sha=${encodeURIComponent(targetBranch)}&per_page=25`
    ),
    fetchGitHubJson<GitHubReleaseApiResponse[]>(
      `${GITHUB_API_BASE}/releases?per_page=10`
    ).catch(() => ({
      data: [] as GitHubReleaseApiResponse[],
      rateLimitRemaining: null,
    })),
  ]);

  const repo: RepoMetadata = {
    fullName: repoData.full_name,
    description: repoData.description,
    htmlUrl: repoData.html_url || WIKI_GITHUB_URL,
    defaultBranch: repoData.default_branch || 'main',
    pushedAt: repoData.pushed_at,
    updatedAt: repoData.updated_at,
    stargazersCount: repoData.stargazers_count ?? 0,
    forksCount: repoData.forks_count ?? 0,
    openIssuesCount: repoData.open_issues_count ?? 0,
  };

  const branches: RepoBranch[] = (branchesResult.data ?? []).map((b) => ({
    name: b.name,
    commitSha: b.commit?.sha ?? '',
    protected: Boolean(b.protected),
  }));

  const commits = (commitsResult.data ?? []).map(mapCommitSummary);

  const releases: RepoRelease[] = (releasesResult.data ?? [])
    .filter((r) => !r.draft)
    .map((r) => ({
      id: r.id,
      tagName: r.tag_name,
      name: r.name?.trim() || r.tag_name,
      body: (r.body ?? '').trim(),
      prerelease: Boolean(r.prerelease),
      draft: Boolean(r.draft),
      publishedAt: r.published_at ?? null,
      createdAt: r.created_at,
      authorLogin: r.author?.login ?? null,
      htmlUrl: r.html_url,
    }));

  return {
    repo,
    branches,
    selectedBranch: targetBranch,
    commits,
    releases,
    fetchedAtIso: new Date().toISOString(),
    rateLimitRemaining: commitsResult.rateLimitRemaining ?? repoResult.rateLimitRemaining,
  };
}

/**
 * Loads per-file diff statistics for a specific commit SHA.
 */
export async function fetchRepoCommitDetail(sha: string): Promise<RepoCommitDetail> {
  const { data } = await fetchGitHubJson<GitHubCommitDetailApiResponse>(
    `${GITHUB_API_BASE}/commits/${encodeURIComponent(sha)}`
  );

  return {
    sha: data.sha,
    stats: {
      total: data.stats?.total ?? 0,
      additions: data.stats?.additions ?? 0,
      deletions: data.stats?.deletions ?? 0,
    },
    files: (data.files ?? []).map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions ?? 0,
      deletions: f.deletions ?? 0,
      changes: f.changes ?? 0,
    })),
  };
}

export function formatIsoRelativePt(isoDate: string | null | undefined): string {
  if (!isoDate) return 'now';
  const parsed = Date.parse(isoDate);
  if (Number.isNaN(parsed)) return '—';

  const diffSec = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return new Date(parsed).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatIsoAbsolutePt(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const parsed = Date.parse(isoDate);
  if (Number.isNaN(parsed)) return '—';

  return new Date(parsed).toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
