import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  type PageComment,
  type PageRevision,
  type PageVisibility,
  VALIDATION_LIMITS,
  type WikiPage,
} from '../types/wiki';
import { db, handleFirestoreError, OperationType } from './firebase';
import { isValidWikiSlug, toWikiSlug } from './markdownUtils';

function sanitizeString(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

function sanitizeCategory(category: string): string {
  const normalized = category
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, VALIDATION_LIMITS.CATEGORY_MAX_LENGTH);

  return VALIDATION_LIMITS.CATEGORY_PATTERN.test(normalized) ? normalized : 'geral';
}

function sanitizeTags(tags: string[]): string[] {
  const cleaned = tags
    .map((t) => t.trim().slice(0, VALIDATION_LIMITS.TAG_MAX_LENGTH))
    .filter((t) => t.length >= 1);
  return Array.from(new Set(cleaned)).slice(0, VALIDATION_LIMITS.TAGS_MAX_COUNT);
}

function getUserDisplayName(user: User): string {
  const raw = user.displayName || user.email?.split('@')[0] || 'Colaborador';
  return sanitizeString(raw, VALIDATION_LIMITS.AUTHOR_NAME_MAX_LENGTH) || 'Colaborador';
}

export async function syncUserDocuments(user: User): Promise<void> {
  const displayName = getUserDisplayName(user);
  const photoURL = (user.photoURL ?? '').slice(0, VALIDATION_LIMITS.PHOTO_URL_MAX_LENGTH);
  const collabPath = `collaborators/${user.uid}`;
  const collabRef = doc(db, 'collaborators', user.uid);

  try {
    const snap = await getDoc(collabRef);
    if (!snap.exists()) {
      await setDoc(collabRef, {
        uid: user.uid,
        displayName,
        photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existing = snap.data();
      if (existing.displayName !== displayName || existing.photoURL !== photoURL) {
        await updateDoc(collabRef, {
          displayName,
          photoURL,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, collabPath);
  }

  if (user.email) {
    const privatePath = `users/${user.uid}/private/info`;
    const privateRef = doc(db, 'users', user.uid, 'private', 'info');
    const safeEmail = sanitizeString(user.email, VALIDATION_LIMITS.EMAIL_MAX_LENGTH);
    try {
      const privSnap = await getDoc(privateRef);
      if (!privSnap.exists()) {
        await setDoc(privateRef, {
          uid: user.uid,
          email: safeEmail,
          updatedAt: serverTimestamp(),
        });
      } else if (privSnap.data().email !== safeEmail) {
        await updateDoc(privateRef, {
          email: safeEmail,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, privatePath);
    }
  }
}

export interface SavePageInput {
  slug: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  visibility: PageVisibility;
  isLocked: boolean;
  summary: string;
}

export async function createWikiPage(input: SavePageInput, user: User): Promise<string> {
  const slug = toWikiSlug(input.slug);
  if (!isValidWikiSlug(slug)) {
    throw new Error('Identificador (:slug) inválido. Use apenas letras, números e hífens.');
  }

  const title = sanitizeString(input.title, VALIDATION_LIMITS.TITLE_MAX_LENGTH);
  if (!title) {
    throw new Error('O título da página é obrigatório.');
  }

  const content = input.content.slice(0, VALIDATION_LIMITS.CONTENT_MAX_LENGTH);
  const category = sanitizeCategory(input.category);
  const tags = sanitizeTags(input.tags);
  const authorName = getUserDisplayName(user);
  const summary =
    sanitizeString(input.summary, VALIDATION_LIMITS.SUMMARY_MAX_LENGTH) ||
    'Criação inicial da página';

  const pagePath = `pages/${slug}`;
  const pageRef = doc(db, 'pages', slug);

  try {
    const existingSnap = await getDoc(pageRef);
    if (existingSnap.exists()) {
      throw new Error(`Já existe uma página com o identificador ":${slug}".`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Já existe')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, pagePath);
  }

  const batch = writeBatch(db);
  batch.set(pageRef, {
    slug,
    title,
    content,
    category,
    tags,
    visibility: input.visibility,
    isLocked: input.isLocked,
    authorId: user.uid,
    authorName,
    lastEditorId: user.uid,
    lastEditorName: authorName,
    version: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const revRef = doc(db, 'pages', slug, 'revisions', 'v_1');
  batch.set(revRef, {
    pageSlug: slug,
    pageVisibility: input.visibility,
    pageAuthorId: user.uid,
    title,
    content,
    editorId: user.uid,
    editorName: authorName,
    summary,
    version: 1,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, pagePath);
  }

  return slug;
}

export async function updateWikiPage(
  existing: WikiPage,
  input: SavePageInput,
  user: User,
  canManageMeta: boolean
): Promise<void> {
  const title = sanitizeString(input.title, VALIDATION_LIMITS.TITLE_MAX_LENGTH);
  if (!title) {
    throw new Error('O título da página é obrigatório.');
  }

  const content = input.content.slice(0, VALIDATION_LIMITS.CONTENT_MAX_LENGTH);
  const category = sanitizeCategory(input.category);
  const tags = sanitizeTags(input.tags);
  const editorName = getUserDisplayName(user);
  const nextVersion = existing.version + 1;
  const nextVisibility: PageVisibility = canManageMeta ? input.visibility : existing.visibility;
  const nextLocked = canManageMeta ? input.isLocked : existing.isLocked;
  const summary =
    sanitizeString(input.summary, VALIDATION_LIMITS.SUMMARY_MAX_LENGTH) ||
    `Revisão v${nextVersion}`;

  const pagePath = `pages/${existing.slug}`;
  const pageRef = doc(db, 'pages', existing.slug);
  const batch = writeBatch(db);

  const updatePayload: Record<string, unknown> = {
    title,
    content,
    category,
    tags,
    lastEditorId: user.uid,
    lastEditorName: editorName,
    version: nextVersion,
    updatedAt: serverTimestamp(),
  };

  if (canManageMeta) {
    updatePayload.visibility = nextVisibility;
    updatePayload.isLocked = nextLocked;
  }

  batch.update(pageRef, updatePayload);

  const revRef = doc(db, 'pages', existing.slug, 'revisions', `v_${nextVersion}`);
  batch.set(revRef, {
    pageSlug: existing.slug,
    pageVisibility: nextVisibility,
    pageAuthorId: existing.authorId,
    title,
    content,
    editorId: user.uid,
    editorName,
    summary,
    version: nextVersion,
    createdAt: serverTimestamp(),
  });

  // Keep denormalized pageVisibility in sync if the author/admin changed visibility
  if (canManageMeta && nextVisibility !== existing.visibility) {
    try {
      const [revsSnap, commentsSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, 'pages', existing.slug, 'revisions'),
            where('pageVisibility', '==', existing.visibility)
          )
        ),
        getDocs(
          query(
            collection(db, 'pages', existing.slug, 'comments'),
            where('pageVisibility', '==', existing.visibility)
          )
        ),
      ]);
      revsSnap.forEach((d) => {
        batch.update(d.ref, { pageVisibility: nextVisibility });
      });
      commentsSnap.forEach((d) => {
        batch.update(d.ref, { pageVisibility: nextVisibility });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, pagePath);
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, pagePath);
  }
}

export async function restorePageRevision(
  page: WikiPage,
  revision: PageRevision,
  user: User,
  canManageMeta: boolean
): Promise<void> {
  await updateWikiPage(
    page,
    {
      slug: page.slug,
      title: revision.title,
      content: revision.content,
      category: page.category,
      tags: page.tags,
      visibility: page.visibility,
      isLocked: page.isLocked,
      summary: `Restaurada a versão v${revision.version}`,
    },
    user,
    canManageMeta
  );
}

export async function deleteWikiPage(page: WikiPage): Promise<void> {
  const pagePath = `pages/${page.slug}`;
  const batch = writeBatch(db);
  const filterField = page.visibility === 'public' ? 'pageVisibility' : 'pageAuthorId';
  const filterValue = page.visibility === 'public' ? 'public' : page.authorId;

  try {
    const [revsSnap, commentsSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, 'pages', page.slug, 'revisions'),
          where(filterField, '==', filterValue)
        )
      ),
      getDocs(
        query(
          collection(db, 'pages', page.slug, 'comments'),
          where(filterField, '==', filterValue)
        )
      ),
    ]);

    revsSnap.forEach((d) => batch.delete(d.ref));
    commentsSnap.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'pages', page.slug));

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pagePath);
  }
}

export async function fetchPageRevisions(page: WikiPage): Promise<PageRevision[]> {
  const revPath = `pages/${page.slug}/revisions`;
  const filterField = page.visibility === 'public' ? 'pageVisibility' : 'pageAuthorId';
  const filterValue = page.visibility === 'public' ? 'public' : page.authorId;

  try {
    const q = query(
      collection(db, 'pages', page.slug, 'revisions'),
      where(filterField, '==', filterValue)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<PageRevision, 'id'>),
    }));
    return list.sort((a, b) => b.version - a.version);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, revPath);
  }
}

export async function addPageComment(page: WikiPage, body: string, user: User): Promise<void> {
  const cleanedBody = sanitizeString(body, VALIDATION_LIMITS.COMMENT_BODY_MAX_LENGTH);
  if (!cleanedBody) {
    throw new Error('O comentário não pode estar vazio.');
  }

  const commentRef = doc(collection(db, 'pages', page.slug, 'comments'));
  const commentPath = `pages/${page.slug}/comments/${commentRef.id}`;
  const authorName = getUserDisplayName(user);

  try {
    await setDoc(commentRef, {
      pageSlug: page.slug,
      pageVisibility: page.visibility,
      pageAuthorId: page.authorId,
      authorId: user.uid,
      authorName,
      body: cleanedBody,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, commentPath);
  }
}

export async function deletePageComment(slug: string, commentId: string): Promise<void> {
  const commentPath = `pages/${slug}/comments/${commentId}`;
  try {
    await deleteDoc(doc(db, 'pages', slug, 'comments', commentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, commentPath);
  }
}

export async function seedStarterWiki(user: User): Promise<void> {
  const authorName = getUserDisplayName(user);

  const starterPages: {
    slug: string;
    title: string;
    category: string;
    tags: string[];
    content: string;
    summary: string;
  }[] = [
    {
      slug: 'start',
      title: 'Bem-vindo ao WazzimaGiygg Maker',
      category: 'geral',
      tags: ['inicio', 'wiki', 'colaboracao'],
      summary: 'Página inicial da wiki',
      content: `O **WazzimaGiygg Maker** é uma wiki colaborativa minimalista inspirada no modelo clássico do Wikidot, construída em TypeScript com persistência em tempo real no Firebase Firestore.

## Começando rápido

- **Criação instantânea por slug**: digite qualquer identificador no campo **Criação rápida** na barra lateral (ex: \`meu-projeto\`) e pressione Enter.
- **Links internos estilo Wikidot**: escreva \`[[guia-markdown]]\` ou \`[[boas-praticas|Boas Práticas]]\` para conectar páginas. Links para páginas que ainda não existem aparecem destacados e permitem criá-las com um único clique.
- **Histórico versionado**: cada salvamento grava uma nova revisão imutável (\`v1\`, \`v2\`, \`v3\`) que pode ser inspecionada e restaurada a qualquer momento.

> Dica: Experimente clicar em **Editar** acima para modificar esta página em tempo real, ou acesse [[guia-markdown|Guia Completo de Markdown]].

## Mapa rápido da documentação

| Página | Finalidade | Acesso |
| --- | --- | --- |
| [[start]] | Ponto de entrada principal da wiki | Pública |
| [[guia-markdown]] | Referência de sintaxe Markdown e links internos | Pública |
| [[boas-praticas]] | Convenções de organização e colaboração | Pública |

## Próximos passos

- [x] Conectar conta Google para colaborar
- [ ] Explorar o [[guia-markdown|Guia de Markdown]]
- [ ] Criar sua primeira página personalizada como [[notas-da-equipe|Notas da Equipe]]`,
    },
    {
      slug: 'guia-markdown',
      title: 'Guia de Markdown & Links Internos',
      category: 'guias',
      tags: ['markdown', 'sintaxe', 'referencia'],
      summary: 'Referência essencial de Markdown para colaboradores',
      content: `Todas as páginas do **WazzimaGiygg Maker** são escritas em Markdown com suporte a tabelas, listas de tarefas, blocos de código e links internos no estilo Wikidot.

## Links estilo Wikidot

Use colchetes duplos para referenciar outras páginas da wiki pelo identificador (\`:slug\`):

\`\`\`markdown
[[start]]
[[boas-praticas|Veja nossas Boas Práticas]]
[[nova-pagina|Criar uma página ainda inexistente]]
\`\`\`

Quando a página de destino ainda não existir no Firebase, o link será exibido em destaque tracejado — basta clicar para abrir o editor já pronto com aquele \`slug\`.

## Formatação de texto e cabeçalhos

\`\`\`markdown
## Subtítulo de Seção
### Subseção

Texto em **negrito**, *itálico*, ~~riscado~~ e \`código inline\`.
\`\`\`

## Listas e Tarefas

- Item simples de lista
- Outro item com [[start|link de retorno]]

- [x] Tarefa concluída
- [ ] Tarefa pendente

## Tabelas e Citações

> Blocos de citação são ótimos para destacar avisos editoriais ou decisões de arquitetura.

| Recurso | Sintaxe | Resultado |
| --- | --- | --- |
| Negrito | \`**texto**\` | **texto** |
| Link interno | \`[[slug]]\` | Navegação direta |
| Código | \`\\\`const x = 1\\\`\` | \`const x = 1\` |`,
    },
    {
      slug: 'boas-praticas',
      title: 'Boas Práticas de Colaboração',
      category: 'referencia',
      tags: ['organizacao', 'regras', 'equipe'],
      summary: 'Diretrizes para manter a wiki organizada',
      content: `Para manter o acervo claro conforme a equipe cresce, adote estas convenções simples:

## 1. Escolha slugs curtos e descritivos

Prefira identificadores em letras minúsculas separados por hífen, como \`arquitetura-api\`, \`atas-reuniao\` ou \`glossario\`. Evite acentos ou espaços no identificador.

## 2. Sempre escreva um resumo da revisão

Antes de salvar em **Editar**, preencha o campo *Resumo da alteração* (por exemplo: \`Adiciona seção de autenticação\`). Isso torna a aba **Histórico** muito mais útil para toda a equipe.

## 3. Visibilidade e Proteção

- **Pública (Colaborativa)**: qualquer colaborador autenticado pode ler, comentar e editar.
- **Privada (Rascunho)**: visível apenas para o autor original até estar pronta para publicação.
- **Bloquear edição**: o autor pode trancar uma página estável para que apenas ele ou administradores façam alterações.

Voltar para [[start|Página Inicial]] ou consultar o [[guia-markdown|Guia de Markdown]].`,
    },
  ];

  const batch = writeBatch(db);
  let createdCount = 0;

  for (const item of starterPages) {
    const pageRef = doc(db, 'pages', item.slug);
    try {
      const snap = await getDoc(pageRef);
      if (!snap.exists()) {
        createdCount += 1;
        batch.set(pageRef, {
          slug: item.slug,
          title: item.title,
          content: item.content,
          category: item.category,
          tags: item.tags,
          visibility: 'public',
          isLocked: false,
          authorId: user.uid,
          authorName,
          lastEditorId: user.uid,
          lastEditorName: authorName,
          version: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.set(doc(db, 'pages', item.slug, 'revisions', 'v_1'), {
          pageSlug: item.slug,
          pageVisibility: 'public',
          pageAuthorId: user.uid,
          title: item.title,
          content: item.content,
          editorId: user.uid,
          editorName: authorName,
          summary: item.summary,
          version: 1,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `pages/${item.slug}`);
    }
  }

  if (createdCount > 0) {
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'pages');
    }
  }
}

export type { PageComment };
