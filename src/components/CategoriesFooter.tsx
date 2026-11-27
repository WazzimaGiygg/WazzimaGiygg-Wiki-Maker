import React from 'react';
import { FolderTree, Loader2, Plus, X } from 'lucide-react';
import type { WikiCategoryTag } from '../lib/markdownUtils';
import { formatCategoryDisplayName } from '../lib/categoryUtils';

interface CategoriesFooterProps {
  categories: WikiCategoryTag[];
  availableCategoryNames?: string[];
  canQuickAdd?: boolean;
  onSelectCategory: (slug: string) => void;
  onOpenAllCategories: () => void;
  onQuickAddCategory?: (categoryName: string) => Promise<void>;
}

export const CategoriesFooter: React.FC<CategoriesFooterProps> = ({
  categories,
  availableCategoryNames = [],
  canQuickAdd = false,
  onSelectCategory,
  onOpenAllCategories,
  onQuickAddCategory,
}) => {
  const [adding, setAdding] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const datalistId = React.useId();

  React.useEffect(() => {
    if (adding) {
      inputRef.current?.focus();
    }
  }, [adding]);

  const existingSlugSet = React.useMemo(
    () => new Set(categories.map((c) => c.slug)),
    [categories]
  );

  const suggestions = React.useMemo(
    () =>
      availableCategoryNames.filter((name) => {
        const normalized = name.trim().toLowerCase();
        return normalized && !categories.some((c) => c.name.toLowerCase() === normalized);
      }),
    [availableCategoryNames, categories]
  );

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || !onQuickAddCategory || submitting) return;
    setSubmitting(true);
    setAddError(null);
    try {
      await onQuickAddCategory(trimmed);
      setInputValue('');
      setAdding(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Unable to add category.');
    } finally {
      setSubmitting(false);
    }
  };

  if (categories.length === 0 && !canQuickAdd) {
    return null;
  }

  return (
    <section
      aria-label="Article categories"
      data-wiki-chrome="categories-footer"
      data-wiki-surface="inset"
      className="mt-7 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-[#0b0f17]/75 text-xs text-slate-600 dark:text-slate-300"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 leading-relaxed">
        <button
          type="button"
          onClick={onOpenAllCategories}
          title="Browse all categories on this wiki"
          className="inline-flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer shrink-0"
        >
          <FolderTree className="w-3.5 h-3.5 shrink-0 opacity-85" />
          <span>{categories.length === 1 ? 'Category' : 'Categories'}:</span>
        </button>

        {categories.length > 0 ? (
          <ul className="inline-flex flex-wrap items-center gap-y-1">
            {categories.map((cat, idx) => (
              <li key={cat.slug} className="inline-flex items-center">
                {idx > 0 && (
                  <span
                    aria-hidden="true"
                    className="mx-2 text-slate-300 dark:text-slate-700 select-none"
                  >
                    |
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onSelectCategory(cat.slug)}
                  title={`Open Category:${cat.name || formatCategoryDisplayName(cat.slug)}`}
                  className="text-blue-700 dark:text-blue-400 hover:underline font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded-xs"
                >
                  {cat.name || formatCategoryDisplayName(cat.slug)}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-slate-500 dark:text-slate-400 italic">Uncategorized</span>
        )}

        {canQuickAdd && onQuickAddCategory && !adding && (
          <button
            type="button"
            onClick={() => {
              setAddError(null);
              setAdding(true);
            }}
            title="Add a Wikipedia-style [[Category:...]] tag to this page"
            className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-700/50 dark:hover:border-blue-500/50 transition-colors cursor-pointer print:hidden"
          >
            <Plus className="w-3 h-3" />
            <span>Add category</span>
          </button>
        )}
      </div>

      {adding && canQuickAdd && onQuickAddCategory && (
        <form
          onSubmit={(e) => void handleQuickAddSubmit(e)}
          className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2 print:hidden"
        >
          <input
            ref={inputRef}
            type="text"
            list={datalistId}
            value={inputValue}
            disabled={submitting}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (addError) setAddError(null);
            }}
            placeholder="Category name (e.g. Science, Governance, Tutorials)..."
            aria-label="New category name"
            className="flex-1 min-w-[200px] px-2.5 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
          />
          <datalist id={datalistId}>
            {suggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <button
            type="submit"
            disabled={submitting || !inputValue.trim() || existingSlugSet.has(inputValue.trim().toLowerCase())}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            <span>{submitting ? 'Saving...' : 'Add'}</span>
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              setAdding(false);
              setInputValue('');
              setAddError(null);
            }}
            aria-label="Cancel adding category"
            className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          {addError && (
            <p role="alert" className="w-full text-[11px] text-red-700 dark:text-red-400">
              {addError}
            </p>
          )}
        </form>
      )}
    </section>
  );
};
