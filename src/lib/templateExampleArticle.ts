export const TEMPLATE_EXAMPLE_PAGE_SLUG = 'exemplo-uso-predefinicao';
export const TEMPLATE_EXAMPLE_PAGE_TITLE = 'Exemplo de Uso de Pré-definição (MediaWiki)';
export const TEMPLATE_EXAMPLE_PAGE_CATEGORY = 'guides';
export const TEMPLATE_EXAMPLE_PAGE_TAGS = ['predefinicao', 'template', 'mediawiki', 'exemplo'];
export const TEMPLATE_EXAMPLE_PAGE_SUMMARY =
  'Artigo prático demonstrando o uso de pré-definições MediaWiki com parâmetros nomeados, posicionais e transclusão dinâmica';

export const TEMPLATE_EXAMPLE_PAGE_CONTENT = `{{Info|tipo=project|título=Guia Prático de Pré-definições|subtítulo=Transclusão no Estilo MediaWiki|Situação=Ativo|Sintaxe=\`{{Nome|parâmetros}}\`|Atalho=\`Ctrl+Shift+T\`|Modelo Base=[[predefinicao-boas-vindas|Predefinição:Boas-vindas]]}}

Este artigo demonstra, na prática, como utilizar **pré-definições** (*templates*) no estilo MediaWiki dentro do **WazzimaGiygg Maker**. Cada bloco abaixo exibe primeiro a sintaxe em wikitexto e, logo em seguida, o resultado processado em tempo real pelo \`templateService\` no \`ArticleViewer\`.<ref>MediaWiki Help: Templates — transclusão de páginas com parâmetros posicionais e nomeados. Veja também o [[markdown-guide|Guia de Markdown e Pré-definições]].</ref>

{{Principal|predefinicao-boas-vindas|Predefinição:Boas-vindas}}

## 1. Pré-definição comunitária transcluída (\`{{Predefinição:...}}\`)

Pré-definições criadas pela comunidade ficam armazenadas na coleção \`pages\` com identificadores iniciados por \`predefinicao-\` (como [[predefinicao-boas-vindas|Predefinição:Boas-vindas]]). Ao invocá-las em qualquer artigo, os marcadores \`{{{parâmetro|valor padrão}}}\` são substituídos dinamicamente e o conteúdo entre \`<noinclude>\` é omitido automaticamente.

### Código no editor

\`\`\`markdown
{{Predefinição:Boas-vindas|colaborador=Equipe Editorial|tema=Uso Prático de Pré-definições}}
\`\`\`

### Resultado renderizado no artigo

{{Predefinição:Boas-vindas|colaborador=Equipe Editorial|tema=Uso Prático de Pré-definições}}

## 2. Caixa de aviso com parâmetros e variáveis mágicas

Você pode combinar parâmetros nomeados (\`tipo=\`, \`título=\`, \`texto=\`) com variáveis dinâmicas de contexto como \`{{PAGENAME}}\`, \`{{CURRENTMONTHNAME}}\` e \`{{CURRENTYEAR}}\`:

### Código no editor

\`\`\`markdown
{{Aviso|tipo=cuidado|título=Verificação Editorial em {{PAGENAME}}|texto=Esta demonstração foi expandida automaticamente em {{CURRENTMONTHNAME}} de {{CURRENTYEAR}} para ilustrar parâmetros aninhados.}}
\`\`\`

### Resultado renderizado no artigo

{{Aviso|tipo=cuidado|título=Verificação Editorial em {{PAGENAME}}|texto=Esta demonstração foi expandida automaticamente em {{CURRENTMONTHNAME}} de {{CURRENTYEAR}} para ilustrar parâmetros aninhados.}}

## 3. Citação destacada e remissão cruzada

Pré-definições de navegação e citação mantêm a identidade visual uniforme entre verbetes relacionados:

### Código no editor

\`\`\`markdown
{{Citação|texto=Modelos reutilizáveis evitam duplicação de marcação e permitem atualizar avisos em dezenas de artigos a partir de um único ponto.|autor=Conselho Editorial|fonte=Manual de Padronização}}

{{Ver também|markdown-guide|ecossistema-wazzimagiygg}}
\`\`\`

### Resultado renderizado no artigo

{{Citação|texto=Modelos reutilizáveis evitam duplicação de marcação e permitem atualizar avisos em dezenas de artigos a partir de um único ponto.|autor=Conselho Editorial|fonte=Manual de Padronização}}

{{Ver também|markdown-guide|ecossistema-wazzimagiygg}}

## 4. Marcação de manutenção inline e de rodapé

Quando usada no meio de uma frase, \`{{Carece de fontes}}\` insere uma etiqueta discreta em linha; já \`{{Esboço|Tema}}\` gera o aviso padrão de expansão do artigo:

- **Exemplo inline no texto**: Segundo registros históricos da comunidade, esta técnica foi adotada desde as primeiras revisões da wiki.{{Carece de fontes}}

\`\`\`markdown
{{Esboço|Documentação de Modelos MediaWiki}}
\`\`\`

{{Esboço|Documentação de Modelos MediaWiki}}

## 5. Como criar sua própria pré-definição

1. No editor de qualquer página, pressione \`Ctrl+Shift+T\` (ou clique em **\`{{ }}\` Predefinições**) e selecione a aba **Criar Modelo**.
2. Defina o nome do modelo (por exemplo, \`Nota Técnica\`, que gera o identificador \`predefinicao-nota-tecnica\`).
3. Escreva o corpo da pré-definição usando parâmetros como \`{{{titulo|Nota}}}\` e \`{{{1|Texto padrão}}}\` — o editor valida o balanceamento de \`{{}}\` e \`{{{}}}\` em tempo real e exibe uma prévia ao vivo.
4. Salve o modelo no Firestore e insira \`{{Predefinição:Nota Técnica|titulo=Exemplo|Conteúdo aqui}}\` em qualquer artigo.

{{Ecossistema WazzimaGiygg}}`;
