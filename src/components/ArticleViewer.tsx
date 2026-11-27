import React from 'react';
import { expandTemplatesInWikitext } from '../services/templateService';
import type { WikiPage } from '../types/wiki';
import { MarkdownRenderer } from './MarkdownRenderer';

export interface ArticleViewerProps {
  content: string;
  existingSlugs: Set<string>;
  wikiPages?: WikiPage[];
  currentSlug?: string;
  currentTitle?: string;
  dynamicParams?: Record<string, string>;
  onNavigateSlug: (slug: string) => void;
  onSelectCategory?: (slug: string) => void;
  onOpenAllCategories?: () => void;
  showToc?: boolean;
  tocDefaultExpanded?: boolean;
  tocMinHeadings?: number;
  enableReferences?: boolean;
  referencesTitle?: string;
  enableInfoboxes?: boolean;
  enableTemplates?: boolean;
  showReferencesFooter?: boolean;
  showCategoriesFooter?: boolean;
  primaryCategory?: string;
  externalLinkPrefix?: string;
  encodeExternalLinkTarget?: boolean;
}

/**
 * Renders wiki article wikitext/Markdown after expanding MediaWiki-style
 * `{{NomeDaPredefinição|parâmetro}}` templates via `src/services/templateService`.
 */
export const ArticleViewer: React.FC<ArticleViewerProps> = ({
  content,
  existingSlugs,
  wikiPages,
  currentSlug,
  currentTitle,
  dynamicParams,
  onNavigateSlug,
  onSelectCategory,
  onOpenAllCategories,
  showToc = true,
  tocDefaultExpanded = true,
  tocMinHeadings = 2,
  enableReferences = true,
  referencesTitle = 'References',
  enableInfoboxes = true,
  enableTemplates = true,
  showReferencesFooter = true,
  showCategoriesFooter = false,
  primaryCategory,
  externalLinkPrefix,
  encodeExternalLinkTarget = false,
}) => {
  const expandedContent = React.useMemo(
    () =>
      enableTemplates
        ? expandTemplatesInWikitext(content, wikiPages, {
            currentSlug,
            currentTitle,
            dynamicParams,
          })
        : content,
    [content, wikiPages, currentSlug, currentTitle, dynamicParams, enableTemplates]
  );

  return (
    <MarkdownRenderer
      content={expandedContent}
      existingSlugs={existingSlugs}
      wikiPages={wikiPages}
      currentSlug={currentSlug}
      onNavigateSlug={onNavigateSlug}
      onSelectCategory={onSelectCategory}
      onOpenAllCategories={onOpenAllCategories}
      showToc={showToc}
      tocDefaultExpanded={tocDefaultExpanded}
      tocMinHeadings={tocMinHeadings}
      enableReferences={enableReferences}
      referencesTitle={referencesTitle}
      enableInfoboxes={enableInfoboxes}
      enableTemplates={false}
      showReferencesFooter={showReferencesFooter}
      showCategoriesFooter={showCategoriesFooter}
      primaryCategory={primaryCategory}
      externalLinkPrefix={externalLinkPrefix}
      encodeExternalLinkTarget={encodeExternalLinkTarget}
    />
  );
};
