export const TEMPLATE_EXAMPLE_PAGE_SLUG = 'exemplo-uso-predefinicao';
export const TEMPLATE_EXAMPLE_PAGE_TITLE = 'Practical MediaWiki Template Usage Example';
export const TEMPLATE_EXAMPLE_PAGE_CATEGORY = 'guides';
export const TEMPLATE_EXAMPLE_PAGE_TAGS = ['predefinicao', 'template', 'mediawiki', 'example'];
export const TEMPLATE_EXAMPLE_PAGE_SUMMARY =
  'Hands-on article demonstrating MediaWiki templates with named parameters, positional arguments, and dynamic transclusion';

export const TEMPLATE_EXAMPLE_PAGE_CONTENT = `{{Infobox|type=project|title=Practical Template Guide|subtitle=MediaWiki-Style Transclusion|Status=Active|Syntax=\`{{Name|parameters}}\`|Shortcut=\`Ctrl+Shift+T\`|Starter Template=[[template-welcome|Template:Welcome]]}}

This article demonstrates in practice how to use MediaWiki-style **templates** inside **WazzimaGiygg Maker**. Each section below shows the wikitext source first and then the live expanded output processed in real time by \`templateService\` inside \`ArticleViewer\`.<ref>MediaWiki Help: Templates — page transclusion with positional and named parameters. See also the [[markdown-guide|Markdown & Templates Guide]].</ref>

{{Main|template-welcome|Template:Welcome}}

## 1. Transcluded Community Template (\`{{Template:...}}\`)

Community-authored templates are stored in the \`pages\` collection with slugs starting with \`predefinicao-\` or \`template-\` (such as [[template-welcome|Template:Welcome]]). When invoked in any article, \`{{{parameter|default value}}}\` placeholders are dynamically substituted and content wrapped in \`<noinclude>\` is automatically stripped.

### Editor Source

\`\`\`markdown
{{Template:Welcome|contributor=Editorial Team|topic=Practical Template Usage}}
\`\`\`

### Rendered Article Output

{{Template:Welcome|contributor=Editorial Team|topic=Practical Template Usage}}

## 2. Notice Banner with Parameters & Magic Words

You can combine named parameters (\`type=\`, \`title=\`, \`text=\`) with dynamic context magic words such as \`{{PAGENAME}}\`, \`{{CURRENTMONTHNAME}}\`, and \`{{CURRENTYEAR}}\`:

### Editor Source

\`\`\`markdown
{{Notice|type=warning|title=Editorial Review on {{PAGENAME}}|text=This demonstration was expanded automatically in {{CURRENTMONTHNAME}} {{CURRENTYEAR}} to illustrate nested parameters.}}
\`\`\`

### Rendered Article Output

{{Notice|type=warning|title=Editorial Review on {{PAGENAME}}|text=This demonstration was expanded automatically in {{CURRENTMONTHNAME}} {{CURRENTYEAR}} to illustrate nested parameters.}}

## 3. Highlighted Quotation & Cross-Reference

Navigation and quotation templates keep visual formatting consistent across related articles:

### Editor Source

\`\`\`markdown
{{Quote|text=Reusable templates prevent duplicate markup and let maintainers update notices across dozens of articles from a single source.|author=Editorial Board|source=Style Manual}}

{{See also|markdown-guide|ecossistema-wazzimagiygg}}
\`\`\`

### Rendered Article Output

{{Quote|text=Reusable templates prevent duplicate markup and let maintainers update notices across dozens of articles from a single source.|author=Editorial Board|source=Style Manual}}

{{See also|markdown-guide|ecossistema-wazzimagiygg}}

## 4. Inline Maintenance Tags & Stub Footer

When placed mid-sentence, \`{{Citation needed}}\` renders a compact inline tag, while \`{{Stub|Topic}}\` adds the standard expansion banner:

- **Inline usage example**: According to historical community records, this convention was adopted in the earliest wiki revisions.{{Citation needed}}

\`\`\`markdown
{{Stub|MediaWiki Template Documentation}}
\`\`\`

{{Stub|MediaWiki Template Documentation}}

## 5. How to Create Your Own Template

1. Inside any page editor, press \`Ctrl+Shift+T\` (or click **\`{{ }}\` Templates**) and choose **Create Template**.
2. Enter a template name (for instance, \`Technical Note\`, which generates a compatible slug).
3. Author the template body using placeholders such as \`{{{title|Note}}}\` and \`{{{1|Default text}}}\` — the editor validates \`{{}}\` and \`{{{}}}\` brace balance in real time with a live preview.
4. Save the template to Firestore and insert \`{{Template:Technical Note|title=Example|Content here}}\` in any article.

{{WazzimaGiygg Ecosystem}}`;
