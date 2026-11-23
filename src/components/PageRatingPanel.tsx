import React from 'react';
import { Loader2, LogIn, Star, Trash2 } from 'lucide-react';
import { VALIDATION_LIMITS, type PageRating } from '../types/wiki';

interface PageRatingPanelProps {
  pageSlug: string;
  ratings: PageRating[];
  currentUserId: string | null;
  isSignedIn: boolean;
  isBlocked: boolean;
  onRate: (score: number) => Promise<void>;
  onRemoveRating: () => Promise<void>;
  onSignIn: () => void;
}

const SCORE_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

const STARS = [1, 2, 3, 4, 5] as const;

export const PageRatingPanel: React.FC<PageRatingPanelProps> = ({
  pageSlug,
  ratings,
  currentUserId,
  isSignedIn,
  isBlocked,
  onRate,
  onRemoveRating,
  onSignIn,
}) => {
  const [hoveredScore, setHoveredScore] = React.useState<number | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setHoveredScore(null);
    setSubmitting(false);
    setStatusMessage(null);
    setError(null);
  }, [pageSlug]);

  const userRating = React.useMemo(
    () => (currentUserId ? ratings.find((r) => r.userId === currentUserId) ?? null : null),
    [ratings, currentUserId]
  );

  const ratingSummary = React.useMemo(() => {
    const valid = ratings.filter(
      (r) =>
        Number.isInteger(r.score) &&
        r.score >= VALIDATION_LIMITS.RATING_MIN_SCORE &&
        r.score <= VALIDATION_LIMITS.RATING_MAX_SCORE
    );
    const count = valid.length;
    if (count === 0) {
      return { count: 0, average: 0 };
    }
    const total = valid.reduce((sum, item) => sum + item.score, 0);
    return {
      count,
      average: total / count,
    };
  }, [ratings]);

  const displayScore = hoveredScore ?? userRating?.score ?? Math.round(ratingSummary.average);
  const canSubmit = isSignedIn && !isBlocked && !submitting;

  const handleSelectScore = async (score: number) => {
    if (!canSubmit) return;
    setError(null);
    setStatusMessage(null);
    setSubmitting(true);
    try {
      await onRate(score);
      setStatusMessage(`Saved ${score}/5 (${SCORE_LABELS[score]})`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save your rating.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!canSubmit || !userRating) return;
    setError(null);
    setStatusMessage(null);
    setSubmitting(true);
    try {
      await onRemoveRating();
      setStatusMessage('Rating removed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove your rating.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeDescriptor =
    hoveredScore !== null
      ? SCORE_LABELS[hoveredScore]
      : userRating
      ? `${userRating.score}/5 · ${SCORE_LABELS[userRating.score] ?? 'Rated'}`
      : null;

  return (
    <section
      aria-label="Article rating"
      data-wiki-chrome="article-rating"
      className="mt-8 pt-5 border-t border-slate-200 dark:border-slate-800 print:hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Rate this article
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-slate-700 dark:text-slate-200">
            {ratingSummary.count > 0 ? (
              <>
                <span className="font-mono text-base font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                  {ratingSummary.average.toFixed(1)} / 5
                </span>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {ratingSummary.count} {ratingSummary.count === 1 ? 'rating' : 'ratings'}
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                No ratings yet — be the first verified collaborator to rate this article.
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isSignedIn && !isBlocked ? (
            <div className="flex items-center gap-2">
              <div
                role="radiogroup"
                aria-label="Rate this article from 1 to 5 stars"
                onMouseLeave={() => setHoveredScore(null)}
                className="inline-flex items-center border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 px-1.5 py-0.5"
              >
                {STARS.map((starValue) => {
                  const isFilled = starValue <= displayScore;
                  const isSelected = userRating?.score === starValue;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={`Rate ${starValue} out of 5 stars (${SCORE_LABELS[starValue]})`}
                      disabled={submitting}
                      onMouseEnter={() => setHoveredScore(starValue)}
                      onFocus={() => setHoveredScore(starValue)}
                      onBlur={() => setHoveredScore(null)}
                      onClick={() => void handleSelectScore(starValue)}
                      className="p-1.5 rounded text-slate-300 dark:text-slate-600 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400 disabled:opacity-50 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-4 h-4 transition-colors ${
                          isFilled
                            ? 'fill-amber-400 text-amber-500 dark:fill-amber-400 dark:text-amber-400'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {submitting ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </span>
              ) : (
                activeDescriptor && (
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
                    {hoveredScore !== null ? activeDescriptor : `Your rating: ${activeDescriptor}`}
                  </span>
                )
              )}

              {userRating && !submitting && (
                <button
                  type="button"
                  onClick={() => void handleRemove()}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Remove your rating"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          ) : isBlocked ? (
            <span className="text-xs text-red-700 dark:text-red-400">
              Account restricted from submitting ratings.
            </span>
          ) : (
            <div className="flex items-center gap-3">
              <div
                aria-hidden="true"
                className="inline-flex items-center gap-0.5 text-slate-300 dark:text-slate-600"
              >
                {STARS.map((starValue) => (
                  <Star
                    key={starValue}
                    className={`w-4 h-4 ${
                      starValue <= Math.round(ratingSummary.average)
                        ? 'fill-amber-400/80 text-amber-500/80 dark:fill-amber-400/80 dark:text-amber-400/80'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-blue-600 dark:hover:border-blue-400 hover:text-blue-700 dark:hover:text-blue-400 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in to rate</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {statusMessage && !error && (
        <div
          role="status"
          className="mt-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium"
        >
          {statusMessage}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-2 text-xs text-red-700 dark:text-red-400 font-medium"
        >
          {error}
        </div>
      )}
    </section>
  );
};
