import React from 'react';

interface ReadingProgressBarProps {
  visible: boolean;
  articleKey?: string;
}

export const ReadingProgressBar: React.FC<ReadingProgressBarProps> = ({
  visible,
  articleKey,
}) => {
  const fillRef = React.useRef<HTMLDivElement | null>(null);
  const [percent, setPercent] = React.useState(0);

  React.useEffect(() => {
    if (!visible) {
      setPercent(0);
      if (fillRef.current) {
        fillRef.current.style.transform = 'scaleX(0)';
      }
      return;
    }

    let rafId = 0;

    const computeProgress = () => {
      rafId = 0;
      const articleEl = document.querySelector(
        '[data-wiki-document="article"]'
      ) as HTMLElement | null;

      let ratio = 0;
      if (articleEl) {
        const rect = articleEl.getBoundingClientRect();
        const articleBottomDoc = window.scrollY + rect.bottom;
        const targetEndScrollY = Math.max(0, articleBottomDoc - window.innerHeight);

        if (targetEndScrollY <= 16) {
          ratio = 1;
        } else {
          ratio = Math.min(1, Math.max(0, window.scrollY / targetEndScrollY));
        }
      } else {
        const docScrollable =
          document.documentElement.scrollHeight - window.innerHeight;
        ratio =
          docScrollable <= 16
            ? 1
            : Math.min(1, Math.max(0, window.scrollY / docScrollable));
      }

      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${ratio})`;
      }

      const nextPercent = Math.round(ratio * 100);
      setPercent((prev) => (prev === nextPercent ? prev : nextPercent));
    };

    const scheduleUpdate = () => {
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(computeProgress);
    };

    scheduleUpdate();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    const articleEl = document.querySelector('[data-wiki-document="article"]');
    if (articleEl && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(articleEl);
    }

    return () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      resizeObserver?.disconnect();
    };
  }, [visible, articleKey]);

  if (!visible) {
    return null;
  }

  return (
    <div
      role="progressbar"
      aria-label="Progresso de leitura do artigo"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      title={`${percent}% do artigo visualizado`}
      className="w-full h-[3px] bg-slate-200/80 dark:bg-slate-800/90 overflow-hidden print:hidden"
    >
      <div
        ref={fillRef}
        data-wiki-surface="progress"
        className="h-full w-full origin-left scale-x-0 bg-blue-700 dark:bg-blue-400 transition-transform duration-75 ease-out motion-reduce:transition-none will-change-transform"
      />
    </div>
  );
};
