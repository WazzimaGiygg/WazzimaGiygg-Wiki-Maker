# WazzimaGiygg Maker

**WazzimaGiygg Maker** é uma plataforma de Wiki colaborativa em **TypeScript + React + Express + Firebase**, inspirada na simplicidade editorial do Wikidot e nos recursos enciclopédicos do MediaWiki. O projeto oferece edição em Markdown/Wikitext em tempo real, versionamento completo de páginas, governança hierárquica (Membros, Administradores e Burocratas), arquitetura modular de extensões persistidas no Firestore, conformidade com LGPD/Marco Civil da Internet e proteção contra crawlers e chatbots de IA.

---

## Sumário

- [Principais Recursos](#principais-recursos)
- [Stack Tecnológica](#stack-tecnológica)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Configuração e Variáveis de Ambiente](#configuração-e-variáveis-de-ambiente)
- [Firebase, Firestore e Plano Blaze (Upload de Imagens)](#firebase-firestore-e-plano-blaze-upload-de-imagens)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Governança, Segurança e Regras do Firestore](#governança-segurança-e-regras-do-firestore)
- [Conformidade Legal e Licenciamento](#conformidade-legal-e-licenciamento)

---

## Principais Recursos

### Autoria, Markdown e Wikitext
- **Editor Multimodal (`MarkdownEditor`)**: Alternância instantânea entre os modos **Formatted** (WYSIWYG com sincronização bidirecional DOM ↔ Markdown via `markdownRichBridge`), **Code** (fonte Markdown pura), **Split** (lado a lado) e **Preview**.
- **Edição Rápida (`QuickEditModal`)**: Botão *Quick Edit* diretamente no leitor de artigos para editar título, conteúdo e resumo sem sair da página.
- **Predefinições Estilo MediaWiki (`{{Template}}`)**: Transclusão e expansão de templates com parâmetros, `<noinclude>`, `<includeonly>`, catálogo padrão e templates da comunidade armazenados no Wiki, além de construtor visual (`TemplatePickerModal` e `TemplateManagementPanel`).
- **Infoboxes (`:::infobox`)**: Blocos estruturados estilo enciclopédia com construtor modal (`InfoboxBuilderModal`) e cartões automáticos em páginas pessoais.
- **Citações e Referências (`<ref>`)**: Numeração automática `[1]`, links bidirecionais de salto, construtor de citações (`CitationBuilderModal`) e rodapé bibliográfico (`ReferencesFooter`).
- **Banners e Upload de Imagens**: Suporte a imagem de cabeçalho nas páginas e inserção de imagens no corpo dos artigos com biblioteca de mídia compartilhada (`/wiki_media`) controlada pela extensão `:image-upload`.
- **Filtro Editorial**: Verificação de linguagem configurada (`profanityFilter`) antes da publicação.

### Organização, Navegação e Leitura
- **Páginas por Slug (`:slug`)**: Páginas públicas colaborativas e páginas privadas restritas ao autor/administração.
- **Categorias Dinâmicas**:
  - **Explorador de Categorias (`CategoryExplorer`)** integrado ao Hub de Páginas Especiais (`SpecialPagesHub`).
  - **Páginas de Categorias (`category-*`, `categoria-*`, `Category:*`)** que listam automaticamente em **ordem alfabética** todos os artigos associados pela tag da categoria ou por links `[[Category:...]]` / `[[Categoria:...]]` no conteúdo.
- **Gerenciamento de Tags (`TagManagementPanel`)**: Filtragem por tags e menu de ações em lote para renomear ou remover uma tag específica em múltiplas páginas simultaneamente.
- **Barra Lateral Enxuta (`Sidebar`)**: Exibe apenas uma lista compacta das páginas recentes com acesso dedicado para listar todas as páginas (`PageIndexView`), busca instantânea, criação rápida por slug e Watchlist.
- **Sumário e Leitura**: Sumário automático (TOC), índice lateral fixo (*On this page*), barra de progresso de leitura, modo de impressão limpo (`print-view`), botão de artigo aleatório e atalhos de teclado globais (`?`).

### Colaboração e Exportação
- **Histórico de Revisões (`RevisionHistory`)**: Snapshots imutáveis por versão (`v_1`, `v_2`, ...), comparação e restauração para versões anteriores.
- **Discussão e Avaliações**: Aba de comentários por página (`PageComments`) e avaliação de 1 a 5 estrelas (`PageRatingPanel`).
- **Páginas Pessoais e Watchlist**: Perfil público sem PII em `/collaborators/{uid}`, log de edições (`UserEditsPanel`) e páginas vigiadas (`WatchlistProfilePanel`).
- **Exportação**: Exportação individual em **PDF** respeitando o tema ativo (`pdfExportService`), download do arquivo `.md` bruto e exportação em massa de páginas públicas em **ZIP** (`archiveExportService`).

### Aparência, Temas e PWA
- **Seletor de Tema (`AppearanceSettingsView`)**: Alternância entre **Claro**, **Escuro** ou **Seguir preferência do sistema** com persistência em `localStorage`.
- **14 Temas Visuais Embutidos (`wikiThemes.ts`)**:
  - Editoriais: *Editorial Classic*, *Archival Parchment*, *Botanical Atlas*, *Cobalt Monograph*
  - Clássicos & OS: *Windows 1.0 (1985)*, *Windows 95*, *Windows XP (Luna)*, *Windows 10 (Fluent)*, *Android Alpha (2008)*
  - Plataformas & Jogos: *Fandom (Desktop)*, *Google (Material)*, *Wikidiota (Parody)*, *Team Fortress 2*, *Stardew Valley*
- **Progressive Web App (PWA)**: Manifesto (`public/site.webmanifest`), Service Worker (`public/sw.js`) e botão de instalação no app (`PWAInstallButton`).

### Sistema de Extensões do Site (`ExtensionsManagerPanel`)
- **35 Extensões Configuráveis** salvas no Firestore (`/extensions/{extensionId}`) e carregadas no boot da Wiki (alteráveis exclusivamente por **Burocratas**).
- Entre os destaques:
  - `:site-title` — Título/marca principal da Wiki.
  - `:site-theme` — Catálogo de temas e política de esquema de cores.
  - `:external-link-prefix` — Prefixo/parâmetro automático em links externos.
  - `:image-upload` — **Extensão de Upload de Imagens** (vem **desativada por padrão**; requer ativação da extensão + confirmação explícita do plano pago **Firebase Blaze**).
  - `:anti-chatbot-shield` — **Escudo Anti-Chatbot e Bloqueador de IA**, com resposta HTTP `403` no servidor Express (`server.ts`), bloqueio via `robots.txt` / `ai.txt` / `llms.txt`, detecção em tempo de execução e geração de pacote `.zip` de extensão Chrome/Edge Manifest V3.

### Governança e Console de Administradores / Burocratas (`AdminConsoleView`)
- **Controle de Papéis**: Promoção/rebaixamento de `admin` e `bureaucrat`, além de bloqueio/desbloqueio de contas (`blocked_users`).
- **Verificação de Contas (Investigação de Fantoches / *Sockpuppets*)**: Gestão de casos suspeitos, contas-mestre, evidências e resoluções (`AdminSockpuppetPanel`).
- **Pedidos de LGPD (`AdminLgpdRequestsPanel` & `LegalComplianceView`)**: Canal formal para usuários enviarem solicitações de anonimização, expurgo, acesso ou correção de dados, com fila de triagem e log de auditoria imutável (`/lgpd_logs`).
- **Área de Discussão de Administradores (`AdminDiscussionPanel`)**: Fórum interno restrito a administradores e burocratas com categorias, fixação de tópicos e respostas atômicas.

---

## Stack Tecnológica

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), `lucide-react`, `motion`
- **Backend / Servidor HTTP**: Express (`server.ts` com `tsx` em desenvolvimento e middleware de proteção anti-chatbot + cabeçalhos CSP/segurança)
- **Backend-as-a-Service**: Firebase v13 (Firestore Database, Firebase Authentication com Google, Firebase Storage)
- **Processamento Markdown / Wikitext**: `react-markdown`, `remark-gfm`, `remark-parse`, `unified`
- **Exportação**: `jspdf` (PDF), `jszip` (arquivos ZIP e pacote da extensão Manifest V3)
- **Qualidade e Segurança**: TypeScript (`tsc --noEmit`), ESLint 10 + `@firebase/eslint-plugin-security-rules`

---

## Estrutura do Projeto

```text
.
├── .env.example                 # Variáveis de ambiente de referência
├── eslint.config.js             # Configuração do ESLint (incluindo regras de segurança Firebase)
├── firebase-applet-config.json  # Configuração do projeto Firebase (projectId, db, storageBucket)
├── firebase-blueprint.json      # Blueprint/IR das entidades e coleções do Firestore
├── firestore.rules              # Regras de segurança do Firestore (Oito Pilares)
├── firestore.rules.test.ts      # Suíte de testes das regras de segurança
├── index.html                   # Entrada HTML, metadados SEO e guarda anti-crawler inicial
├── metadata.json                # Metadados do applet
├── package.json                 # Dependências e scripts npm
├── public/                      # PWA (site.webmanifest, sw.js), robots.txt, ai.txt, llms.txt, assets
├── security_spec.md             # Especificação de invariantes e payloads de segurança
├── server.ts                    # Servidor Express (porta 3000) com anti-chatbot e integração Vite
└── src/
    ├── App.tsx                  # Aplicação principal, roteamento por hash e estado global da Wiki
    ├── index.css                # Tailwind CSS v4 e tokens visuais dos temas
    ├── main.tsx                 # Ponto de entrada React e registro PWA
    ├── components/              # Componentes de UI (Editor, Leitor, Modais, Admin, Extensões, etc.)
    ├── lib/                     # Serviços Firebase, Markdown/Wikitext, temas, uploads, governança e LGPD
    ├── services/                # Serviço de templates estilo MediaWiki (templateService.ts)
    └── types/                   # Tipagens TypeScript e limites de validação sincronizados (wiki.ts)
```

---

## Configuração e Variáveis de Ambiente

1. **Pré-requisitos**:
   - Node.js 20+ recomendado
   - npm

2. **Instalar dependências**:
   ```bash
   npm install
   ```

3. **Variáveis de Ambiente**:
   Consulte o arquivo `.env.example`:
   - `GEMINI_API_KEY`: Chave opcional de API caso integrações server-side Gemini sejam utilizadas em runtime.
   - `APP_URL`: URL pública onde a aplicação está hospedada (injetada pelo ambiente).
   - `PORT`: Porta do servidor Express (padrão `3000`).

---

## Firebase, Firestore e Plano Blaze (Upload de Imagens)

A configuração do Firebase utilizada pelo cliente encontra-se em `firebase-applet-config.json`:
- **Banco de Dados Firestore**: `ai-studio-35c55515-05b5-44cc-b4c3-06d3e692a016`
- **Autenticação**: Google Sign-In (`GoogleAuthProvider`), exigindo e-mail verificado (`email_verified == true`) para operações de escrita.
- **Storage Bucket**: configurado em `storageBucket` dentro de `firebase-applet-config.json`.

### Como Habilitar o Upload de Imagens no Wiki
Por padrão, o upload de arquivos de imagem vem **desativado** (`enabled: false` e `blazePlanConfirmed: false`). Para liberar o envio de imagens via Firebase Storage:

1. No **Firebase Console**, faça o upgrade do projeto para o **plano pago Blaze (Pay-as-you-go)** e certifique-se de que o **Firebase Storage** esteja inicializado com regras adequadas para usuários autenticados com e-mail verificado.
2. Na aplicação, acesse **Admin Console → Extensions Manager** com uma conta de **Burocrata**.
3. Localize a extensão **Wiki Image Upload (`:image-upload`)**:
   - Marque a opção **Confirm Firebase Blaze paid plan & Storage active**.
   - Ajuste, se desejar, o limite de tamanho por arquivo (`1` a `25 MB`) e a pasta de destino no Storage (padrão: `wiki-images`).
   - Ative o interruptor da extensão (`Active`) e clique em **Save to Firebase**.

> **Importante:** O upload de imagens só é liberado (tanto na interface quanto nas regras do Firestore em `/wiki_media`) quando **ambos** estiverem ativos: a extensão `:image-upload` **e** a confirmação do plano Blaze.

---

## Scripts Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor Express com Vite em modo de desenvolvimento (`tsx server.ts`, porta `3000`). |
| `npm run build` | Gera o build de produção do frontend em `dist/` via Vite. |
| `npm run start` | Executa o servidor Express em modo de produção (`node server.ts`). |
| `npm run lint` | Executa a checagem de tipos TypeScript (`tsc --noEmit`). |
| `npm run clean` | Remove os diretórios/arquivos de build (`dist`, `server.js`). |
| `npx eslint firestore.rules` | Valida as regras do Firestore com `@firebase/eslint-plugin-security-rules`. |

---

## Governança, Segurança e Regras do Firestore

- **Modelo de Segurança Zero-Trust**: Todas as coleções (`/pages`, `/collaborators`, `/users/*/private`, `/admins`, `/blocked_users`, `/lgpd_logs`, `/lgpd_requests`, `/sockpuppet_cases`, `/admin_discussions`, `/extensions`, `/wiki_media`) possuem validação estrita de chaves, tipos, tamanhos máximos, expressões regulares, imutabilidade de campos de autoria e timestamps do servidor (`request.time`) em `firestore.rules`.
- **Isolamento de PII**: Informações pessoais sensíveis (como e-mail) ficam isoladas em `/users/{userId}/private/info`, acessíveis apenas pelo próprio titular ou administradores autorizados.
- **Blueprint Sincronizado**: Todas as entidades e caminhos do Firestore estão documentados em `firebase-blueprint.json` e espelhados em `VALIDATION_LIMITS` (`src/types/wiki.ts`).

---

## Conformidade Legal e Licenciamento

- **Conformidade**: Projetado em alinhamento com a **Lei Geral de Proteção de Dados — LGPD (Lei nº 13.709/2018)** e o **Marco Civil da Internet (Lei nº 12.965/2014)**, com painel dedicado (`LegalComplianceView`), política de privacidade, termos de uso e fluxo formal de solicitação de direitos do titular.
- **Licença de Conteúdo e Software**: Conteúdo colaborativo sob **CC BY-SA 4.0** e software sob **GNU GPL v2+**.
