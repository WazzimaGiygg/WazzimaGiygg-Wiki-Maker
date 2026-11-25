import type { WikiPage } from '../types/wiki';
import { serializeInfoboxBlock, toWikiSlug, type InfoboxField, type InfoboxType } from './markdownUtils';

export type TemplateBlockVariant =
  | 'info'
  | 'warning'
  | 'alert'
  | 'success'
  | 'stub'
  | 'wip'
  | 'disambiguation'
  | 'navigation'
  | 'quote'
  | 'ecosystem';

export interface WikiTemplateParamSpec {
  key: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  required?: boolean;
}

export interface WikiTemplateCatalogItem {
  id: string;
  name: string;
  aliases: string[];
  category: 'notices' | 'navigation' | 'infobox' | 'ecosystem';
  language?: 'pt' | 'en';
  description: string;
  exampleSnippet: string;
  params: WikiTemplateParamSpec[];
}

export const WIKI_TEMPLATE_CATALOG: WikiTemplateCatalogItem[] = [
  {
    id: 'aviso',
    name: 'Aviso',
    aliases: ['aviso', 'ambox', 'notice', 'alerta', 'nota'],
    category: 'notices',
    description:
      'Caixa de aviso editorial no estilo MediaWiki (Ambox) para alertas, revisões, notas ou confirmações.',
    exampleSnippet:
      '{{Aviso|tipo=cuidado|título=Conteúdo em revisão|texto=As informações desta seção passam por verificação colaborativa.}}',
    params: [
      {
        key: 'tipo',
        label: 'Tipo (nota, cuidado, critico, sucesso)',
        placeholder: 'nota',
        defaultValue: 'cuidado',
      },
      {
        key: 'título',
        label: 'Título do aviso',
        placeholder: 'Conteúdo em revisão',
        defaultValue: 'Editorial Notice',
      },
      {
        key: 'texto',
        label: 'Mensagem',
        placeholder: 'Descreva o motivo do aviso...',
        defaultValue: 'This section is currently under collaborative review.',
        required: true,
      },
    ],
  },
  {
    id: 'boas-vindas',
    name: 'Boas-vindas',
    aliases: ['boas-vindas', 'boas vindas', 'welcome'],
    category: 'notices',
    language: 'pt',
    description:
      'Caixa de boas-vindas para novos colaboradores e páginas de discussão com link direto para as Regras de Uso do WikiMaker.',
    exampleSnippet:
      '{{Boas-vindas|colaborador=Novo Colaborador|tema=WazzimaGiygg Maker}}',
    params: [
      {
        key: 'colaborador',
        label: 'Nome do colaborador',
        placeholder: 'Colaborador',
        defaultValue: 'Colaborador',
      },
      {
        key: 'tema',
        label: 'Projeto ou tema',
        placeholder: 'WazzimaGiygg Maker',
        defaultValue: 'WazzimaGiygg Maker',
      },
    ],
  },
  {
    id: 'esboco',
    name: 'Esboço',
    aliases: ['esboco', 'stub'],
    category: 'notices',
    description:
      'Marca o artigo como um esboço no padrão MediaWiki, convidando colaboradores a expandir o conteúdo.',
    exampleSnippet: '{{Esboço|Governança Digital}}',
    params: [
      {
        key: '1',
        label: 'Área ou tema (opcional)',
        placeholder: 'Tecnologia',
        defaultValue: 'Wiki Documentation',
      },
    ],
  },
  {
    id: 'em-construcao',
    name: 'Em construção',
    aliases: ['em construcao', 'wip', 'construcao', 'manutencao'],
    category: 'notices',
    description:
      'Informa que a página está em edição ativa e pode sofrer alterações estruturais em breve.',
    exampleSnippet: '{{Em construção|Previsão de conclusão: esta semana.}}',
    params: [
      {
        key: '1',
        label: 'Nota complementar (opcional)',
        placeholder: 'Previsão ou contexto da edição...',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'carece-de-fontes',
    name: 'Carece de fontes',
    aliases: ['carece de fontes', 'sem fontes', 'citation needed', 'fonte', 'cn'],
    category: 'notices',
    description:
      'Quando usado sozinho em uma linha (ou com data), exibe banner de manutenção; no meio do texto, insere ^[carece de fontes]^.',
    exampleSnippet: '{{Carece de fontes|data=November 2026}}',
    params: [
      {
        key: 'data',
        label: 'Data (opcional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'desambiguacao',
    name: 'Desambiguação',
    aliases: ['desambiguacao', 'desambig', 'disambig', 'disambiguation'],
    category: 'notices',
    description:
      'Aviso padrão de página de desambiguação listando significados distintos para o mesmo termo.',
    exampleSnippet: '{{Desambiguação|WazzimaGiygg}}',
    params: [
      {
        key: '1',
        label: 'Termo ambíguo',
        placeholder: 'Termo ou sigla',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'eliminacao-rapida',
    name: 'Eliminação rápida',
    aliases: ['eliminacao rapida', 'er', 'speedy delete', 'speedy deletion', 'db', 'delete'],
    category: 'notices',
    language: 'pt',
    description:
      'Marca o artigo para eliminação rápida e envia automaticamente um alerta para a página de discussão do autor ao salvar.',
    exampleSnippet:
      '{{Eliminação rápida|motivo=Página de teste ou sem conteúdo enciclopédico mínimo|regra=ER1}}',
    params: [
      {
        key: 'motivo',
        label: 'Motivo da eliminação rápida',
        placeholder: 'Descreva o critério ou justificativa...',
        defaultValue: 'Conteúdo impróprio, teste ou fora do escopo editorial da wiki.',
        required: true,
      },
      {
        key: 'regra',
        label: 'Regra / Critério (opcional)',
        placeholder: 'ER1',
        defaultValue: 'ER1',
      },
      {
        key: 'proponente',
        label: 'Proponente (opcional)',
        placeholder: 'Seu nome de colaborador',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'bloqueio',
    name: 'Bloqueio',
    aliases: ['bloqueio', 'bloqueado', 'block', 'blocked', 'user blocked'],
    category: 'notices',
    language: 'pt',
    description:
      'Aviso de bloqueio administrativo inserido automaticamente na página pessoal do colaborador bloqueado.',
    exampleSnippet:
      '{{Bloqueio|motivo=Violação reiterada das políticas editoriais|administrador=Administração|duracao=Indeterminado}}',
    params: [
      {
        key: 'motivo',
        label: 'Motivo do bloqueio',
        placeholder: 'Descreva o motivo administrativo...',
        defaultValue: 'Violação das regras editoriais ou de conduta.',
        required: true,
      },
      {
        key: 'administrador',
        label: 'Administrador responsável',
        placeholder: 'Administração',
        defaultValue: 'Administração',
      },
      {
        key: 'duracao',
        label: 'Duração',
        placeholder: 'Indeterminado',
        defaultValue: 'Indeterminado',
      },
      {
        key: 'data',
        label: 'Data (opcional)',
        placeholder: '2026-11-25',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'sem-referencias',
    name: 'Sem referências',
    aliases: [
      'sem referencias',
      'mais notas',
      'unreferenced',
      'refimprove',
      'more citations needed',
    ],
    category: 'notices',
    language: 'pt',
    description:
      'Aviso clássico da Wikipédia indicando que o artigo ou secção não cita fontes confiáveis e independentes.',
    exampleSnippet: '{{Sem referências|data=Novembro de 2026}}',
    params: [
      {
        key: 'secao',
        label: 'Secção ou escopo (opcional)',
        placeholder: 'Este artigo',
        defaultValue: '',
      },
      {
        key: 'data',
        label: 'Data (opcional)',
        placeholder: 'Novembro de 2026',
        defaultValue: 'Novembro de 2026',
      },
    ],
  },
  {
    id: 'reciclagem',
    name: 'Reciclagem',
    aliases: ['reciclagem', 'wikificacao', 'wikificar', 'contextualizar', 'revisao', 'copyedit'],
    category: 'notices',
    language: 'pt',
    description:
      'Predefinição da Wikipédia para artigos que precisam de reciclagem, wikificação, contextualização ou revisão estilística.',
    exampleSnippet:
      '{{Reciclagem|motivo=Organizar secções, adicionar ligações internas e formatar referências.|data=Novembro de 2026}}',
    params: [
      {
        key: 'motivo',
        label: 'O que precisa ser reciclado',
        placeholder: 'Descreva melhorias de estilo ou estrutura...',
        defaultValue: 'Organizar secções, adicionar ligações internas e padronizar o estilo enciclopédico.',
      },
      {
        key: 'data',
        label: 'Data (opcional)',
        placeholder: 'Novembro de 2026',
        defaultValue: 'Novembro de 2026',
      },
    ],
  },
  {
    id: 'parcial',
    name: 'Parcial',
    aliases: ['parcial', 'imparcialidade', 'controverso', 'ponto de vista'],
    category: 'notices',
    language: 'pt',
    description:
      'Sinaliza que a neutralidade ou o ponto de vista imparcial do artigo está em disputa na página de discussão.',
    exampleSnippet:
      '{{Parcial|secao=Recepção crítica|motivo=Necessita equilibrar fontes primárias e pareceres divergentes.}}',
    params: [
      {
        key: 'motivo',
        label: 'Motivo da contestação',
        placeholder: 'Explique a questão de imparcialidade...',
        defaultValue: 'A imparcialidade deste trecho está sob debate na página de discussão.',
      },
      {
        key: 'secao',
        label: 'Secção (opcional)',
        placeholder: 'Histórico',
        defaultValue: '',
      },
      {
        key: 'data',
        label: 'Data (opcional)',
        placeholder: 'Novembro de 2026',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'desatualizado',
    name: 'Desatualizado',
    aliases: ['desatualizado', 'desatualizada', 'atualizar'],
    category: 'notices',
    language: 'pt',
    description:
      'Informa que dados, versões, estatísticas ou eventos descritos no verbete precisam de atualização.',
    exampleSnippet:
      '{{Desatualizado|motivo=Dados estatísticos anteriores à atualização de 2026.|data=Novembro de 2026}}',
    params: [
      {
        key: 'motivo',
        label: 'Detalhes do que desatualizou',
        placeholder: 'Ex.: versões ou dados antigos...',
        defaultValue: 'Algumas informações deste artigo podem estar desatualizadas.',
      },
      {
        key: 'data',
        label: 'Data (opcional)',
        placeholder: 'Novembro de 2026',
        defaultValue: 'Novembro de 2026',
      },
    ],
  },
  {
    id: 'fusao',
    name: 'Fusão',
    aliases: ['fusao', 'fundir', 'merge', 'merge to', 'merge from'],
    category: 'notices',
    language: 'pt',
    description:
      'Propõe a fusão de dois verbetes com escopo sobreposto, criando um link direto para o artigo de destino.',
    exampleSnippet: '{{Fusão|ecossistema-wazzimagiygg|motivo=Escopos complementares que podem formar um único guia.}}',
    params: [
      {
        key: '1',
        label: 'Slug do artigo alvo da fusão',
        placeholder: 'ecossistema-wazzimagiygg',
        defaultValue: 'ecossistema-wazzimagiygg',
        required: true,
      },
      {
        key: 'motivo',
        label: 'Justificativa (opcional)',
        placeholder: 'Por que os artigos devem ser fundidos...',
        defaultValue: 'Os temas possuem forte sobreposição editorial.',
      },
    ],
  },
  {
    id: 'traducao',
    name: 'Tradução',
    aliases: ['traducao', 'em traducao', 'traduzido', 'translated page', 'expand language'],
    category: 'notices',
    language: 'pt',
    description:
      'Marca artigo em processo de tradução ou traduzido de outra língua (equivalente a {{Em tradução}} / {{Translated page}}).',
    exampleSnippet: '{{Tradução|idioma=Inglês|artigo=Wikipedia Documentation|progresso=Em andamento}}',
    params: [
      {
        key: 'idioma',
        label: 'Idioma de origem',
        placeholder: 'Inglês',
        defaultValue: 'Inglês',
      },
      {
        key: 'artigo',
        label: 'Artigo original (opcional)',
        placeholder: 'Título original',
        defaultValue: '',
      },
      {
        key: 'progresso',
        label: 'Status da tradução',
        placeholder: 'Em andamento',
        defaultValue: 'Em andamento',
      },
    ],
  },
  {
    id: 'evento-atual',
    name: 'Evento atual',
    aliases: ['evento atual', 'atualidade', 'evento recente', 'current', 'recentismo'],
    category: 'notices',
    language: 'pt',
    description:
      'Alerta para leitores sobre acontecimentos em curso ou notícias recentes cujos detalhes mudam rapidamente.',
    exampleSnippet: '{{Evento atual|Investigação regulatória em andamento sobre plataformas abertas.}}',
    params: [
      {
        key: '1',
        label: 'Descrição do evento (opcional)',
        placeholder: 'Contexto do acontecimento recente...',
        defaultValue: 'As informações podem ser atualizadas à medida que novos fatos forem confirmados.',
      },
    ],
  },
  {
    id: 'artigo-futuro',
    name: 'Artigo futuro',
    aliases: ['artigo futuro', 'evento futuro', 'futuro', 'future'],
    category: 'notices',
    language: 'pt',
    description:
      'Marca verbetes sobre projetos, obras ou eventos planejados cuja especificação pode mudar antes do lançamento.',
    exampleSnippet: '{{Artigo futuro|Previsão de lançamento para o próximo trimestre.}}',
    params: [
      {
        key: '1',
        label: 'Observação sobre o cronograma (opcional)',
        placeholder: 'Previsão ou detalhes preliminares...',
        defaultValue: 'Detalhes anunciados estão sujeitos a alterações até o lançamento oficial.',
      },
    ],
  },
  {
    id: 'eliminar',
    name: 'Eliminar',
    aliases: ['eliminar', 'eliminacao por consenso', 'pe', 'afd', 'ec'],
    category: 'notices',
    language: 'pt',
    description:
      'Aviso de Eliminação por Consenso (AfD / PE) quando a permanência do artigo está em discussão comunitária.',
    exampleSnippet:
      '{{Eliminar|motivo=Avaliar notoriedade enciclopédica e fontes independentes disponíveis.|data=Novembro de 2026}}',
    params: [
      {
        key: 'motivo',
        label: 'Motivo da proposta',
        placeholder: 'Explique os critérios em debate...',
        defaultValue: 'Verificação de notoriedade e aderência às políticas editoriais.',
        required: true,
      },
      {
        key: 'data',
        label: 'Data (opcional)',
        placeholder: 'Novembro de 2026',
        defaultValue: 'Novembro de 2026',
      },
    ],
  },
  {
    id: 'protegida',
    name: 'Protegida',
    aliases: ['protegida', 'semiprotegida', 'protecao', 'pp protected', 'protected'],
    category: 'notices',
    language: 'pt',
    description:
      'Selo informativo indicando que a página está protegida ou semiprotegida contra edições não autorizadas.',
    exampleSnippet:
      '{{Protegida|nivel=Proteção administrativa|motivo=Preservação de conteúdo institucional estável.}}',
    params: [
      {
        key: 'nivel',
        label: 'Nível de proteção',
        placeholder: 'Semiprotegida',
        defaultValue: 'Semiprotegida',
      },
      {
        key: 'motivo',
        label: 'Motivo da proteção',
        placeholder: 'Prevenção de vandalismo ou documento estável...',
        defaultValue: 'Edição restrita temporariamente para preservar a integridade do texto.',
      },
    ],
  },
  {
    id: 'multiplos-problemas',
    name: 'Múltiplos problemas',
    aliases: ['multiplos problemas', 'problemas', 'multiple issues'],
    category: 'notices',
    language: 'pt',
    description:
      'Agrupa várias pendências editoriais do artigo em um único aviso compacto no topo da página.',
    exampleSnippet:
      '{{Múltiplos problemas|1=Carece de fontes fiáveis e independentes|2=Necessita reciclagem e links internos|data=Novembro de 2026}}',
    params: [
      {
        key: '1',
        label: 'Primeiro problema',
        placeholder: 'Carece de fontes fiáveis',
        defaultValue: 'Carece de fontes fiáveis e independentes',
        required: true,
      },
      {
        key: '2',
        label: 'Segundo problema (opcional)',
        placeholder: 'Necessita reciclagem de estilo',
        defaultValue: 'Necessita reciclagem e links internos',
      },
      {
        key: '3',
        label: 'Terceiro problema (opcional)',
        placeholder: 'Pode estar desatualizado',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'artigo-destacado',
    name: 'Artigo destacado',
    aliases: [
      'artigo destacado',
      'artigo bom',
      'destaque',
      'featured article',
      'good article',
    ],
    category: 'notices',
    language: 'pt',
    description:
      'Selo editorial da Wikipédia que reconhece artigos completos, bem referenciados e verificados.',
    exampleSnippet: '{{Artigo destacado|nivel=Artigo Destacado|data=Novembro de 2026}}',
    params: [
      {
        key: 'nivel',
        label: 'Classificação (Artigo Destacado ou Artigo Bom)',
        placeholder: 'Artigo Destacado',
        defaultValue: 'Artigo Destacado',
      },
      {
        key: 'data',
        label: 'Data de reconhecimento (opcional)',
        placeholder: 'Novembro de 2026',
        defaultValue: 'Novembro de 2026',
      },
    ],
  },
  {
    id: 'carece-de-esclarecimento',
    name: 'Carece de esclarecimento',
    aliases: ['carece de esclarecimento', 'esclarecer', 'clarify', 'quem', 'who', 'quando', 'when', 'onde'],
    category: 'notices',
    language: 'pt',
    description:
      'Marca afirmações vagas no meio do texto com ^[carece de esclarecimento]^ (ou ^[quem?]^ / ^[quando?]^), ou exibe banner se usado com motivo.',
    exampleSnippet: '{{Carece de esclarecimento|motivo=Especificar versão exata ou ano do relatório citado.}}',
    params: [
      {
        key: 'motivo',
        label: 'Trecho a esclarecer (opcional; vazio = marcador inline)',
        placeholder: 'Deixe vazio para marcação inline no texto',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'principal',
    name: 'Principal',
    aliases: ['principal', 'artigo principal', 'main'],
    category: 'navigation',
    description:
      'Indica o artigo principal de uma seção no formato clássico da Wikipédia / MediaWiki.',
    exampleSnippet: '{{Principal|ecossistema-wazzimagiygg|WazzimaGiygg Ecosystem Products}}',
    params: [
      {
        key: '1',
        label: 'Slug do artigo principal',
        placeholder: 'ecossistema-wazzimagiygg',
        defaultValue: 'ecossistema-wazzimagiygg',
        required: true,
      },
      {
        key: '2',
        label: 'Título exibido (opcional)',
        placeholder: 'WazzimaGiygg Ecosystem Products',
        defaultValue: 'WazzimaGiygg Ecosystem Products',
      },
    ],
  },
  {
    id: 'ver-tambem',
    name: 'Ver também',
    aliases: ['ver tambem', 'see also', 'veja tambem'],
    category: 'navigation',
    description:
      'Insere faixa de remissão cruzada ("Ver também") conectando até 3 páginas relacionadas.',
    exampleSnippet: '{{Ver também|dossie-wikipedia-abusos|investigacao-lgpd-marco-civil-wmf-wikipedia}}',
    params: [
      {
        key: '1',
        label: 'Primeiro slug',
        placeholder: 'dossie-wikipedia-abusos',
        defaultValue: 'dossie-wikipedia-abusos',
        required: true,
      },
      {
        key: '2',
        label: 'Segundo slug (opcional)',
        placeholder: 'investigacao-lgpd-marco-civil-wmf-wikipedia',
        defaultValue: 'investigacao-lgpd-marco-civil-wmf-wikipedia',
      },
    ],
  },
  {
    id: 'citacao',
    name: 'Citação',
    aliases: ['citacao', 'quote', 'cquote'],
    category: 'navigation',
    description:
      'Bloco de citação destacada com atribuição de autor e obra/fonte no padrão MediaWiki.',
    exampleSnippet:
      '{{Citação|texto=Open knowledge thrives on transparent accountability and independent publishing.|autor=WazzimaGiygg Editorial|fonte=Project Charter}}',
    params: [
      {
        key: 'texto',
        label: 'Texto citado',
        placeholder: 'Digite a citação...',
        defaultValue: 'Open knowledge thrives on transparent accountability.',
        required: true,
      },
      {
        key: 'autor',
        label: 'Autor',
        placeholder: 'Nome do autor',
        defaultValue: 'WazzimaGiygg Editorial',
      },
      {
        key: 'fonte',
        label: 'Fonte / Obra (opcional)',
        placeholder: 'Documento ou artigo',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'sobre',
    name: 'Sobre',
    aliases: ['sobre', 'about', 'outros significados', 'for'],
    category: 'navigation',
    language: 'pt',
    description:
      'Nota de topo clássica da Wikipédia ("Sobre X, veja Y") para direcionar leitores a outros significados ou páginas relacionadas.',
    exampleSnippet: '{{Sobre|a documentação de sintaxe|markdown-guide|Guia de Markdown}}',
    params: [
      {
        key: '1',
        label: 'Contexto do outro significado',
        placeholder: 'outros usos ou contexto',
        defaultValue: 'a documentação completa de edição',
        required: true,
      },
      {
        key: '2',
        label: 'Slug do artigo de destino',
        placeholder: 'markdown-guide',
        defaultValue: 'markdown-guide',
        required: true,
      },
      {
        key: '3',
        label: 'Título exibido (opcional)',
        placeholder: 'Guia de Markdown',
        defaultValue: 'Guia de Markdown',
      },
    ],
  },
  {
    id: 'nao-confundir',
    name: 'Não confundir',
    aliases: ['nao confundir', 'nao confundir com'],
    category: 'navigation',
    language: 'pt',
    description:
      'Nota de desambiguação rápida ("Não confundir com...") para diferenciar tópicos com nomes parecidos.',
    exampleSnippet: '{{Não confundir|ecossistema-wazzimagiygg|Ecossistema WazzimaGiygg}}',
    params: [
      {
        key: '1',
        label: 'Slug da página distinta',
        placeholder: 'ecossistema-wazzimagiygg',
        defaultValue: 'ecossistema-wazzimagiygg',
        required: true,
      },
      {
        key: '2',
        label: 'Nome exibido (opcional)',
        placeholder: 'Ecossistema WazzimaGiygg',
        defaultValue: 'Ecossistema WazzimaGiygg',
      },
    ],
  },
  {
    id: 'redirecionamento',
    name: 'Redirecionamento',
    aliases: ['redirecionamento', 'redireciona', 'redireciona aqui'],
    category: 'navigation',
    language: 'pt',
    description:
      'Nota de topo em português indicando termos redirecionados para o artigo atual e apontando outros usos.',
    exampleSnippet: '{{Redirecionamento|A Verdade|dossie-wikipedia-abusos|Dossiê Wikipédia Abusos}}',
    params: [
      {
        key: '1',
        label: 'Termo redirecionado',
        placeholder: 'Termo ou sigla',
        defaultValue: 'A Verdade',
        required: true,
      },
      {
        key: '2',
        label: 'Slug de outros usos',
        placeholder: 'dossie-wikipedia-abusos',
        defaultValue: 'dossie-wikipedia-abusos',
        required: true,
      },
      {
        key: '3',
        label: 'Título exibido (opcional)',
        placeholder: 'Dossiê Wikipédia Abusos',
        defaultValue: 'Dossiê Wikipédia Abusos',
      },
    ],
  },
  {
    id: 'reflist',
    name: 'Reflist',
    aliases: ['reflist', 'referencias', 'lista de referencias', 'notas'],
    category: 'navigation',
    language: 'pt',
    description:
      'Compatível com {{Reflist}} / {{Referências}} da Wikipédia; orienta o leitor para o painel automático de notas <ref> no rodapé.',
    exampleSnippet: '{{Reflist}}',
    params: [],
  },
  {
    id: 'citar-web',
    name: 'Citar web',
    aliases: ['citar web', 'citar site'],
    category: 'navigation',
    language: 'pt',
    description:
      'Predefinição da Wikipédia lusófona para citações de páginas web; gera automaticamente uma nota <ref> numerada no rodapé.',
    exampleSnippet:
      '{{Citar web|título=Dossiê A Verdade|url=https://wazzimagiygg.com/averdade/|autor=Pesquisa WazzimaGiygg|publicado=wazzimagiygg.com|data=Novembro de 2026}}',
    params: [
      {
        key: 'título',
        label: 'Título da página ou matéria',
        placeholder: 'Título da fonte',
        defaultValue: 'Dossiê A Verdade',
        required: true,
      },
      {
        key: 'url',
        label: 'URL',
        placeholder: 'https://...',
        defaultValue: 'https://wazzimagiygg.com/averdade/',
      },
      {
        key: 'autor',
        label: 'Autor (opcional)',
        placeholder: 'Nome do autor',
        defaultValue: 'Pesquisa WazzimaGiygg',
      },
      {
        key: 'publicado',
        label: 'Site / Publicação (opcional)',
        placeholder: 'wazzimagiygg.com',
        defaultValue: 'wazzimagiygg.com',
      },
      {
        key: 'data',
        label: 'Data (opcional)',
        placeholder: 'Novembro de 2026',
        defaultValue: 'Novembro de 2026',
      },
    ],
  },
  {
    id: 'citar-livro',
    name: 'Citar livro',
    aliases: ['citar livro', 'cite book'],
    category: 'navigation',
    language: 'pt',
    description:
      'Citação bibliográfica padrão Wikipédia para livros e manuais técnicos; convertida em nota de rodapé <ref>.',
    exampleSnippet:
      '{{Citar livro|título=Arquitetura de Wikis Colaborativas|autor=Silva, M.|editora=Imprensa Aberta|ano=2025|isbn=978-0-00-000000-0}}',
    params: [
      {
        key: 'título',
        label: 'Título da obra',
        placeholder: 'Nome do livro',
        defaultValue: 'Arquitetura de Wikis Colaborativas',
        required: true,
      },
      {
        key: 'autor',
        label: 'Autor',
        placeholder: 'Sobrenome, Nome',
        defaultValue: 'WazzimaGiygg Editorial',
      },
      {
        key: 'editora',
        label: 'Editora (opcional)',
        placeholder: 'Nome da editora',
        defaultValue: 'Imprensa Aberta',
      },
      {
        key: 'ano',
        label: 'Ano (opcional)',
        placeholder: '2026',
        defaultValue: '2026',
      },
      {
        key: 'isbn',
        label: 'ISBN (opcional)',
        placeholder: '978-...',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'citar-noticia',
    name: 'Citar notícia',
    aliases: ['citar noticia', 'citar jornal', 'cite news', 'cite journal'],
    category: 'navigation',
    language: 'pt',
    description:
      'Citação jornalística ou de periódico no padrão Wikipédia; gera referência numerada automática no rodapé.',
    exampleSnippet:
      '{{Citar notícia|título=Relatório de Transparência Editorial|jornal=Jornal WazzimaGiygg|data=2026-11-25|url=https://jornal.wazzimagiygg.com/}}',
    params: [
      {
        key: 'título',
        label: 'Título da reportagem ou artigo',
        placeholder: 'Manchete da notícia',
        defaultValue: 'Relatório de Transparência Editorial',
        required: true,
      },
      {
        key: 'jornal',
        label: 'Jornal / Revista',
        placeholder: 'Jornal WazzimaGiygg',
        defaultValue: 'Jornal WazzimaGiygg',
      },
      {
        key: 'autor',
        label: 'Autor (opcional)',
        placeholder: 'Repórter ou redação',
        defaultValue: '',
      },
      {
        key: 'data',
        label: 'Data (opcional)',
        placeholder: 'Novembro de 2026',
        defaultValue: 'Novembro de 2026',
      },
      {
        key: 'url',
        label: 'URL (opcional)',
        placeholder: 'https://...',
        defaultValue: 'https://jornal.wazzimagiygg.com/',
      },
    ],
  },
  {
    id: 'info',
    name: 'Info',
    aliases: ['info', 'infobox', 'ficha'],
    category: 'infobox',
    description:
      'Sintaxe de chave/valor igual às predefinições {{Info/...}} da MediaWiki; renderiza um cartão Infobox completo.',
    exampleSnippet:
      '{{Info|tipo=project|título=WikiWazzimaGiygg|subtítulo=Enciclopédia Independente|Status=Active|Portal=[wazzimagiygg.com](https://wazzimagiygg.com/)}}',
    params: [
      {
        key: 'tipo',
        label: 'Tipo (general, project, organization, character, location, item, user)',
        placeholder: 'project',
        defaultValue: 'project',
      },
      {
        key: 'título',
        label: 'Título',
        placeholder: 'Nome do verbete',
        defaultValue: 'Wiki Project',
        required: true,
      },
      {
        key: 'subtítulo',
        label: 'Subtítulo',
        placeholder: 'Classificação breve',
        defaultValue: 'Reference entry',
      },
      {
        key: 'Status',
        label: 'Status',
        placeholder: 'Active',
        defaultValue: 'Active',
      },
      {
        key: 'Portal',
        label: 'Portal / Link',
        placeholder: '[wazzimagiygg.com](https://wazzimagiygg.com/)',
        defaultValue: '[wazzimagiygg.com](https://wazzimagiygg.com/)',
      },
    ],
  },
  {
    id: 'info-biografia',
    name: 'Info/Biografia',
    aliases: ['info/biografia', 'info/pessoa', 'infobox person'],
    category: 'infobox',
    language: 'pt',
    description:
      'Ficha biográfica clássica da Wikipédia ({{Info/Biografia}} / {{Infobox person}}) com nascimento, ocupação e nacionalidade.',
    exampleSnippet:
      '{{Info/Biografia|título=Nome da Personalidade|subtítulo=Pesquisador e Autor|Nascimento=1990|Nacionalidade=Brasileira|Ocupação=Desenvolvedor}}',
    params: [
      {
        key: 'título',
        label: 'Nome completo',
        placeholder: 'Nome da personalidade',
        defaultValue: 'Nome da Personalidade',
        required: true,
      },
      {
        key: 'subtítulo',
        label: 'Descrição curta',
        placeholder: 'Pesquisador e Autor',
        defaultValue: 'Pesquisador e Autor',
      },
      {
        key: 'Nascimento',
        label: 'Nascimento',
        placeholder: 'Data e local',
        defaultValue: '1990',
      },
      {
        key: 'Nacionalidade',
        label: 'Nacionalidade',
        placeholder: 'Brasileira',
        defaultValue: 'Brasileira',
      },
      {
        key: 'Ocupação',
        label: 'Ocupação',
        placeholder: 'Escritor, engenheiro...',
        defaultValue: 'Pesquisador',
      },
    ],
  },
  {
    id: 'info-empresa',
    name: 'Info/Empresa',
    aliases: ['info/empresa', 'info/organizacao', 'infobox company'],
    category: 'infobox',
    language: 'pt',
    description:
      'Caixa de informações da Wikipédia para empresas, instituições e fundações ({{Info/Empresa}} / {{Infobox company}}).',
    exampleSnippet:
      '{{Info/Empresa|título=Organização Exemplo|Tipo=Instituição independente|Fundação=2024|Sede=Brasil|Site=[wazzimagiygg.com](https://wazzimagiygg.com/)}}',
    params: [
      {
        key: 'título',
        label: 'Nome da organização',
        placeholder: 'Nome da empresa ou entidade',
        defaultValue: 'Organização Exemplo',
        required: true,
      },
      {
        key: 'Tipo',
        label: 'Tipo / Natureza',
        placeholder: 'Empresa, ONG, Fundação...',
        defaultValue: 'Organização independente',
      },
      {
        key: 'Fundação',
        label: 'Fundação',
        placeholder: '2024',
        defaultValue: '2024',
      },
      {
        key: 'Sede',
        label: 'Sede',
        placeholder: 'Cidade, País',
        defaultValue: 'Brasil',
      },
      {
        key: 'Site',
        label: 'Website oficial',
        placeholder: '[wazzimagiygg.com](https://wazzimagiygg.com/)',
        defaultValue: '[wazzimagiygg.com](https://wazzimagiygg.com/)',
      },
    ],
  },
  {
    id: 'info-jogo',
    name: 'Info/Jogo',
    aliases: ['info/jogo', 'info/software', 'infobox video game', 'infobox software'],
    category: 'infobox',
    language: 'pt',
    description:
      'Ficha técnica padrão Wikipédia para jogos eletrônicos e softwares ({{Info/Jogo}} / {{Infobox video game}}).',
    exampleSnippet:
      '{{Info/Jogo|título=Título do Jogo|Desenvolvedora=Estúdio Independente|Gênero=RPG / Simulação|Plataformas=PC, Web|Lançamento=2026}}',
    params: [
      {
        key: 'título',
        label: 'Título do jogo ou software',
        placeholder: 'Nome do título',
        defaultValue: 'Título do Projeto',
        required: true,
      },
      {
        key: 'Desenvolvedora',
        label: 'Desenvolvedora',
        placeholder: 'Nome do estúdio',
        defaultValue: 'Estúdio Independente',
      },
      {
        key: 'Gênero',
        label: 'Gênero / Categoria',
        placeholder: 'RPG, Aventura, Utilitário...',
        defaultValue: 'Simulação / Wiki',
      },
      {
        key: 'Plataformas',
        label: 'Plataformas',
        placeholder: 'PC, Web, Linux',
        defaultValue: 'PC, Web',
      },
      {
        key: 'Lançamento',
        label: 'Ano de lançamento',
        placeholder: '2026',
        defaultValue: '2026',
      },
    ],
  },
  {
    id: 'info-pais',
    name: 'Info/País',
    aliases: ['info/pais', 'info/local', 'infobox country', 'infobox settlement'],
    category: 'infobox',
    language: 'pt',
    description:
      'Infocaixa geográfica estilo Wikipédia ({{Info/País}} / {{Infobox country}}) para países, estados, cidades ou regiões.',
    exampleSnippet:
      '{{Info/País|título=República Exemplo|Capital=Cidade Central|Idioma=Português|População=1.200.000|Moeda=Real}}',
    params: [
      {
        key: 'título',
        label: 'Nome do país ou localidade',
        placeholder: 'Nome oficial',
        defaultValue: 'Localidade Exemplo',
        required: true,
      },
      {
        key: 'Capital',
        label: 'Capital / Sede',
        placeholder: 'Cidade principal',
        defaultValue: 'Cidade Central',
      },
      {
        key: 'Idioma',
        label: 'Idioma oficial',
        placeholder: 'Português',
        defaultValue: 'Português',
      },
      {
        key: 'População',
        label: 'População estimada',
        placeholder: '1.000.000',
        defaultValue: '1.000.000',
      },
    ],
  },
  {
    id: 'ecossistema-wazzimagiygg',
    name: 'Ecossistema WazzimaGiygg',
    aliases: ['ecossistema wazzimagiygg', 'wazzimagiygg', 'wikipedia dossie', 'a verdade'],
    category: 'ecosystem',
    description:
      'Caixa institucional padrão conectando os 5 portais WazzimaGiygg e o dossiê A Verdade sobre a Wikipédia.',
    exampleSnippet: '{{Ecossistema WazzimaGiygg}}',
    params: [],
  },
  // --- English MediaWiki Templates ---
  {
    id: 'notice-en',
    name: 'Notice',
    aliases: ['notice', 'ambox', 'aviso', 'alert'],
    category: 'notices',
    language: 'en',
    description:
      'English MediaWiki editorial banner (Ambox) for notes, warnings, critical alerts, or verified confirmations.',
    exampleSnippet:
      '{{Notice|type=warning|title=Under Editorial Review|text=Claims in this section are undergoing collaborative source verification.|date=November 2026}}',
    params: [
      {
        key: 'type',
        label: 'Type (note, warning, alert, success)',
        placeholder: 'warning',
        defaultValue: 'warning',
      },
      {
        key: 'title',
        label: 'Banner title',
        placeholder: 'Editorial Notice',
        defaultValue: 'Editorial Notice',
      },
      {
        key: 'text',
        label: 'Message',
        placeholder: 'Describe the editorial notice...',
        defaultValue: 'This section is currently under collaborative review.',
        required: true,
      },
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'stub-en',
    name: 'Stub',
    aliases: ['stub', 'esboco'],
    category: 'notices',
    language: 'en',
    description:
      'Marks an article as a short stub in standard English Wikipedia style, inviting contributors to expand it.',
    exampleSnippet: '{{Stub|Digital Governance}}',
    params: [
      {
        key: '1',
        label: 'Topic or subject area',
        placeholder: 'Digital Governance',
        defaultValue: 'Wiki Documentation',
      },
    ],
  },
  {
    id: 'under-construction-en',
    name: 'Under construction',
    aliases: ['under construction', 'wip', 'em construcao'],
    category: 'notices',
    language: 'en',
    description:
      'Informs readers that an English article is currently undergoing major drafting or structural expansion.',
    exampleSnippet: '{{Under construction|Expected completion: this week.}}',
    params: [
      {
        key: '1',
        label: 'Status note (optional)',
        placeholder: 'Expected completion or scope...',
        defaultValue: 'Sections are actively being drafted and sourced.',
      },
    ],
  },
  {
    id: 'citation-needed-en',
    name: 'Citation needed',
    aliases: ['citation needed', 'cn', 'carece de fontes'],
    category: 'notices',
    language: 'en',
    description:
      'Renders an inline ^[citation needed]^ marker mid-sentence, or a standalone verification banner with optional date.',
    exampleSnippet: '{{Citation needed|date=November 2026}}',
    params: [
      {
        key: 'date',
        label: 'Date tagged (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'cleanup-en',
    name: 'Cleanup',
    aliases: ['cleanup', 'clean up', 'wikify'],
    category: 'notices',
    language: 'en',
    description:
      'Classic Wikipedia cleanup banner flagging formatting, structure, or copy-editing improvements needed.',
    exampleSnippet:
      '{{Cleanup|section=Overview|reason=Convert bullet lists into clear encyclopedic prose and add section links.|date=November 2026}}',
    params: [
      {
        key: 'reason',
        label: 'Reason for cleanup',
        placeholder: 'Explain what needs formatting or copy-editing...',
        defaultValue: 'Improve formatting, headings, and encyclopedic prose clarity.',
      },
      {
        key: 'section',
        label: 'Section (optional)',
        placeholder: 'Overview',
        defaultValue: '',
      },
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'outdated-en',
    name: 'Outdated',
    aliases: ['outdated', 'update', 'obsolete'],
    category: 'notices',
    language: 'en',
    description:
      'Flags technical documentation or reference entries whose figures, APIs, or timelines need updating.',
    exampleSnippet:
      '{{Outdated|reason=Reflects platform policies prior to the 2026 revision.|date=November 2026}}',
    params: [
      {
        key: 'reason',
        label: 'Update needed',
        placeholder: 'Describe what changed or became outdated...',
        defaultValue: 'Please update figures and references to reflect current developments.',
      },
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'disputed-en',
    name: 'Disputed',
    aliases: ['disputed', 'pov', 'neutrality', 'factual accuracy'],
    category: 'notices',
    language: 'en',
    description:
      'Alerts readers when factual accuracy or neutrality is contested and refers editors to the Discussion tab.',
    exampleSnippet:
      '{{Disputed|section=Timeline|reason=Conflicting primary records cited in talk page discussion.|date=November 2026}}',
    params: [
      {
        key: 'reason',
        label: 'Dispute summary',
        placeholder: 'Describe the contested claims or neutrality concern...',
        defaultValue: 'Factual accuracy or neutrality is under review on the discussion tab.',
      },
      {
        key: 'section',
        label: 'Section (optional)',
        placeholder: 'Timeline',
        defaultValue: '',
      },
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'verify-en',
    name: 'Verify',
    aliases: ['verify', 'fact check', 'verification'],
    category: 'notices',
    language: 'en',
    description:
      'Editorial fact-check callout indicating whether citations and claims have been verified or are pending.',
    exampleSnippet:
      '{{Verify|status=verified|reviewer=Editorial Board|date=November 2026|note=All primary statutory links and citations checked.}}',
    params: [
      {
        key: 'status',
        label: 'Status (verified or pending)',
        placeholder: 'verified',
        defaultValue: 'verified',
      },
      {
        key: 'reviewer',
        label: 'Reviewer',
        placeholder: 'Editorial Board',
        defaultValue: 'Editorial Board',
      },
      {
        key: 'date',
        label: 'Date',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
      {
        key: 'note',
        label: 'Verification note',
        placeholder: 'Sources and citations checked...',
        defaultValue: 'Claims and citations have been checked against primary sources.',
      },
    ],
  },
  {
    id: 'spoiler-en',
    name: 'Spoiler',
    aliases: ['spoiler', 'aviso spoiler'],
    category: 'notices',
    language: 'en',
    description:
      'Standard plot spoiler warning banner before narrative details, quests, or story endings.',
    exampleSnippet: '{{Spoiler|Genshin Impact Archon Quest}}',
    params: [
      {
        key: '1',
        label: 'Work or storyline title (optional)',
        placeholder: 'Story title',
        defaultValue: 'this storyline',
      },
    ],
  },
  {
    id: 'disambiguation-en',
    name: 'Disambiguation',
    aliases: ['disambiguation', 'disambig', 'desambiguacao'],
    category: 'notices',
    language: 'en',
    description:
      'English disambiguation page header listing distinct articles that share an ambiguous term or acronym.',
    exampleSnippet: '{{Disambiguation|WazzimaGiygg}}',
    params: [
      {
        key: '1',
        label: 'Ambiguous term',
        placeholder: 'Term or acronym',
        defaultValue: 'WazzimaGiygg',
      },
    ],
  },
  {
    id: 'main-en',
    name: 'Main',
    aliases: ['main', 'principal'],
    category: 'navigation',
    language: 'en',
    description:
      'Classic Wikipedia hatnote pointing readers to the full main article for a summary section.',
    exampleSnippet: '{{Main|ecossistema-wazzimagiygg|WazzimaGiygg Ecosystem Products}}',
    params: [
      {
        key: '1',
        label: 'Target article slug',
        placeholder: 'ecossistema-wazzimagiygg',
        defaultValue: 'ecossistema-wazzimagiygg',
        required: true,
      },
      {
        key: '2',
        label: 'Display title (optional)',
        placeholder: 'WazzimaGiygg Ecosystem Products',
        defaultValue: 'WazzimaGiygg Ecosystem Products',
      },
    ],
  },
  {
    id: 'see-also-en',
    name: 'See also',
    aliases: ['see also', 'ver tambem'],
    category: 'navigation',
    language: 'en',
    description:
      'Cross-reference navigation hatnote connecting closely related wiki articles.',
    exampleSnippet: '{{See also|dossie-wikipedia-abusos|investigacao-lgpd-marco-civil-wmf-wikipedia}}',
    params: [
      {
        key: '1',
        label: 'First slug',
        placeholder: 'dossie-wikipedia-abusos',
        defaultValue: 'dossie-wikipedia-abusos',
        required: true,
      },
      {
        key: '2',
        label: 'Second slug (optional)',
        placeholder: 'investigacao-lgpd-marco-civil-wmf-wikipedia',
        defaultValue: 'investigacao-lgpd-marco-civil-wmf-wikipedia',
      },
    ],
  },
  {
    id: 'distinguish-en',
    name: 'Distinguish',
    aliases: ['distinguish', 'not to be confused'],
    category: 'navigation',
    language: 'en',
    description:
      'Wikipedia hatnote ("Not to be confused with...") helping readers distinguish similarly named topics.',
    exampleSnippet: '{{Distinguish|notmediawiki|NotMediaWiki Platform}}',
    params: [
      {
        key: '1',
        label: 'Target article slug',
        placeholder: 'ecossistema-wazzimagiygg',
        defaultValue: 'ecossistema-wazzimagiygg',
        required: true,
      },
      {
        key: '2',
        label: 'Display label (optional)',
        placeholder: 'Distinct Topic Title',
        defaultValue: 'WazzimaGiygg Ecosystem Products',
      },
    ],
  },
  {
    id: 'further-en',
    name: 'Further',
    aliases: ['further', 'further information', 'more info'],
    category: 'navigation',
    language: 'en',
    description:
      'Wikipedia hatnote ("Further information: ...") pointing to in-depth background reading.',
    exampleSnippet: '{{Further|markdown-guide|best-practices}}',
    params: [
      {
        key: '1',
        label: 'Primary background slug',
        placeholder: 'markdown-guide',
        defaultValue: 'markdown-guide',
        required: true,
      },
      {
        key: '2',
        label: 'Secondary slug (optional)',
        placeholder: 'best-practices',
        defaultValue: 'best-practices',
      },
    ],
  },
  {
    id: 'redirect-en',
    name: 'Redirect',
    aliases: ['redirect', 'redirect here'],
    category: 'navigation',
    language: 'en',
    description:
      'Wikipedia redirect hatnote ("X redirects here. For other uses, see...") linking alternative targets.',
    exampleSnippet: '{{Redirect|A Verdade|dossie-wikipedia-abusos|Wikipedia Abuses Dossier}}',
    params: [
      {
        key: '1',
        label: 'Redirected term',
        placeholder: 'Alias or shortcut term',
        defaultValue: 'A Verdade',
        required: true,
      },
      {
        key: '2',
        label: 'Other-uses slug',
        placeholder: 'dossie-wikipedia-abusos',
        defaultValue: 'dossie-wikipedia-abusos',
        required: true,
      },
      {
        key: '3',
        label: 'Other-uses label (optional)',
        placeholder: 'Wikipedia Abuses Dossier',
        defaultValue: 'Wikipedia Abuses Dossier',
      },
    ],
  },
  {
    id: 'portal-en',
    name: 'Portal',
    aliases: ['portal', 'related portal'],
    category: 'navigation',
    language: 'en',
    description:
      'Highlighted portal link card directing readers to a curated thematic hub.',
    exampleSnippet:
      '{{Portal|Governance & Compliance|investigacao-lgpd-marco-civil-wmf-wikipedia|description=Legal dossiers, privacy audits, and statutory references.}}',
    params: [
      {
        key: '1',
        label: 'Portal name',
        placeholder: 'Governance & Compliance',
        defaultValue: 'Governance & Compliance',
        required: true,
      },
      {
        key: '2',
        label: 'Portal page slug',
        placeholder: 'investigacao-lgpd-marco-civil-wmf-wikipedia',
        defaultValue: 'investigacao-lgpd-marco-civil-wmf-wikipedia',
      },
      {
        key: 'description',
        label: 'Short portal description',
        placeholder: 'Curated articles and references...',
        defaultValue: 'Explore curated dossiers, guides, and primary documentation.',
      },
    ],
  },
  {
    id: 'quote-en',
    name: 'Quote',
    aliases: ['quote', 'cquote', 'citacao'],
    category: 'navigation',
    language: 'en',
    description:
      'English editorial blockquote box with author and source attribution.',
    exampleSnippet:
      '{{Quote|text=Open knowledge thrives when documentation remains verifiable and independent.|author=WazzimaGiygg Editorial|source=Project Charter}}',
    params: [
      {
        key: 'text',
        label: 'Quoted text',
        placeholder: 'Enter the quotation...',
        defaultValue: 'Open knowledge thrives when documentation remains verifiable and independent.',
        required: true,
      },
      {
        key: 'author',
        label: 'Author',
        placeholder: 'Author name',
        defaultValue: 'WazzimaGiygg Editorial',
      },
      {
        key: 'source',
        label: 'Source / Work (optional)',
        placeholder: 'Book, dossier, or report',
        defaultValue: 'Project Charter',
      },
    ],
  },
  {
    id: 'cite-web-en',
    name: 'Cite web',
    aliases: ['cite web', 'cite', 'web ref'],
    category: 'navigation',
    language: 'en',
    description:
      'Classic Wikipedia {{Cite web}} citation template; expands to an automatic numbered <ref> footnote in the References footer.',
    exampleSnippet:
      '{{Cite web|title=A Verdade Dossier|url=https://wazzimagiygg.com/averdade/|author=WazzimaGiygg Research|publisher=wazzimagiygg.com|date=November 2026}}',
    params: [
      {
        key: 'title',
        label: 'Page or document title',
        placeholder: 'Document title',
        defaultValue: 'A Verdade Dossier',
        required: true,
      },
      {
        key: 'url',
        label: 'URL',
        placeholder: 'https://...',
        defaultValue: 'https://wazzimagiygg.com/averdade/',
      },
      {
        key: 'author',
        label: 'Author (optional)',
        placeholder: 'Author or organization',
        defaultValue: 'WazzimaGiygg Research',
      },
      {
        key: 'publisher',
        label: 'Publisher / Website (optional)',
        placeholder: 'Website name',
        defaultValue: 'wazzimagiygg.com',
      },
      {
        key: 'date',
        label: 'Publication date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'infobox-en',
    name: 'Infobox',
    aliases: ['infobox', 'info', 'ficha'],
    category: 'infobox',
    language: 'en',
    description:
      'English MediaWiki {{Infobox}} template accepting key-value fields to render a structured summary sidebar card.',
    exampleSnippet:
      '{{Infobox|type=project|title=WikiWazzimaGiygg|subtitle=Independent Encyclopedia|Status=Active|Portal=[wazzimagiygg.com](https://wazzimagiygg.com/)}}',
    params: [
      {
        key: 'type',
        label: 'Type (general, project, organization, character, location, item, user)',
        placeholder: 'project',
        defaultValue: 'project',
      },
      {
        key: 'title',
        label: 'Title',
        placeholder: 'Entry title',
        defaultValue: 'Wiki Project',
        required: true,
      },
      {
        key: 'subtitle',
        label: 'Subtitle',
        placeholder: 'Brief classification',
        defaultValue: 'Reference entry',
      },
      {
        key: 'Status',
        label: 'Status',
        placeholder: 'Active',
        defaultValue: 'Active',
      },
      {
        key: 'Portal',
        label: 'Portal / Link',
        placeholder: '[wazzimagiygg.com](https://wazzimagiygg.com/)',
        defaultValue: '[wazzimagiygg.com](https://wazzimagiygg.com/)',
      },
    ],
  },
  // --- Extended Wikipedia & MediaWiki Catalog ---
  {
    id: 'bpv',
    name: 'Biografia de pessoa viva',
    aliases: ['biografia de pessoa viva', 'bpv', 'blp', 'blp sources'],
    category: 'notices',
    language: 'pt',
    description:
      'Política rigorosa da Wikipédia para biografias de pessoas vivas, exigindo fontes independentes para qualquer afirmação sensível.',
    exampleSnippet: '{{Biografia de pessoa viva|data=Novembro de 2026}}',
    params: [
      {
        key: 'data',
        label: 'Data (opcional)',
        placeholder: 'Novembro de 2026',
        defaultValue: 'Novembro de 2026',
      },
    ],
  },
  {
    id: 'fontes-primarias',
    name: 'Fontes primárias',
    aliases: ['fontes primarias', 'sem fontes fiaveis', 'primary sources', 'self-published'],
    category: 'notices',
    language: 'pt',
    description:
      'Alerta que o artigo depende excessivamente de fontes primárias, institucionais ou autopublicadas.',
    exampleSnippet:
      '{{Fontes primárias|motivo=Adicionar análises independentes de imprensa ou periódicos revisados.|data=Novembro de 2026}}',
    params: [
      {
        key: 'motivo',
        label: 'Observação (opcional)',
        placeholder: 'Indique quais fontes secundárias faltam...',
        defaultValue: 'Requer fontes secundárias independentes e confiáveis.',
      },
      {
        key: 'data',
        label: 'Data (opcional)',
        placeholder: 'Novembro de 2026',
        defaultValue: 'Novembro de 2026',
      },
    ],
  },
  {
    id: 'vda',
    name: 'Conteúdo suspeito',
    aliases: ['conteudo suspeito', 'vda', 'copyvio', 'copyright', 'violacao de direitos'],
    category: 'notices',
    language: 'pt',
    description:
      'Marca seção ou artigo sob suspeita de violação de direitos autorais (VDA / Copyvio) para revisão ou reescrita.',
    exampleSnippet: '{{VDA|fonte=https://exemplo.org/texto-original|motivo=Trecho copiado sem adaptação editorial.}}',
    params: [
      {
        key: 'fonte',
        label: 'Fonte original suspeita',
        placeholder: 'https://...',
        defaultValue: '',
      },
      {
        key: 'motivo',
        label: 'Detalhes',
        placeholder: 'Descreva os trechos afetados...',
        defaultValue: 'Verificação preventiva de compatibilidade de licença e texto autoral.',
      },
    ],
  },
  {
    id: 'orfao',
    name: 'Órfão',
    aliases: ['orfao', 'pagina orfa', 'orphan', 'dead end', 'sem ligacoes'],
    category: 'notices',
    language: 'pt',
    description:
      'Indica que o artigo possui poucas ou nenhuma ligação interna vinda de outras páginas da wiki.',
    exampleSnippet: '{{Órfão|data=Novembro de 2026}}',
    params: [
      {
        key: 'data',
        label: 'Data (opcional)',
        placeholder: 'Novembro de 2026',
        defaultValue: 'Novembro de 2026',
      },
    ],
  },
  {
    id: 'introducao-longa',
    name: 'Introdução longa',
    aliases: ['introducao longa', 'lead too long', 'lead missing', 'sem introducao'],
    category: 'notices',
    language: 'pt',
    description:
      'Sinaliza que o resumo introdutório está extenso demais ou ausente e precisa seguir o padrão enciclopédico.',
    exampleSnippet: '{{Introdução longa|Sugestão: condensar em 2 parágrafos e mover detalhes para o corpo.}}',
    params: [
      {
        key: '1',
        label: 'Observação (opcional)',
        placeholder: 'Como ajustar a introdução...',
        defaultValue: 'Resuma os pontos principais antes do sumário de seções.',
      },
    ],
  },
  {
    id: 'expandir-secao',
    name: 'Expandir secção',
    aliases: ['expandir secao', 'expandir', 'expand section', 'empty section', 'secao vazia'],
    category: 'notices',
    language: 'pt',
    description:
      'Convida colaboradores a ampliar uma secção específica que está vazia ou incompleta.',
    exampleSnippet: '{{Expandir secção|secao=Histórico|motivo=Detalhar os marcos entre 2022 e 2026.}}',
    params: [
      {
        key: 'secao',
        label: 'Nome da secção',
        placeholder: 'Histórico',
        defaultValue: 'Desenvolvimento',
      },
      {
        key: 'motivo',
        label: 'O que acrescentar',
        placeholder: 'Tópicos ou fontes desejadas...',
        defaultValue: 'Esta secção encontra-se incompleta e pode ser expandida com fontes fiáveis.',
      },
    ],
  },
  {
    id: 'prosa',
    name: 'Prosa',
    aliases: ['prosa', 'em formato de lista', 'prose', 'list to prose'],
    category: 'notices',
    language: 'pt',
    description:
      'Recomenda converter listas extensas de tópicos em texto corrido em prosa enciclopédica.',
    exampleSnippet: '{{Prosa|secao=Cronologia}}',
    params: [
      {
        key: 'secao',
        label: 'Secção (opcional)',
        placeholder: 'Cronologia',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'divisao',
    name: 'Divisão',
    aliases: ['divisao', 'dividir', 'split', 'split section'],
    category: 'notices',
    language: 'pt',
    description:
      'Propõe dividir um artigo muito extenso ou uma secção independente em novos verbetes específicos.',
    exampleSnippet: '{{Divisão|sugestao=ecossistema-wazzimagiygg|motivo=Secção extensa o suficiente para artigo próprio.}}',
    params: [
      {
        key: 'sugestao',
        label: 'Slug sugerido para o novo artigo',
        placeholder: 'novo-artigo',
        defaultValue: '',
      },
      {
        key: 'motivo',
        label: 'Justificativa',
        placeholder: 'Por que dividir...',
        defaultValue: 'O volume de conteúdo justifica separar o tópico em página dedicada.',
      },
    ],
  },
  {
    id: 'publicidade',
    name: 'Publicidade',
    aliases: ['publicidade', 'propaganda', 'promocional', 'advert', 'spam', 'peacock'],
    category: 'notices',
    language: 'pt',
    description:
      'Aviso clássico de tom promocional ou publicitário; pede reescrita em linguagem neutra e factual.',
    exampleSnippet: '{{Publicidade|motivo=Remover adjetivos promocionais e embasar fatos em fontes independentes.}}',
    params: [
      {
        key: 'motivo',
        label: 'Trechos ou ajustes recomendados',
        placeholder: 'Descreva o que precisa de tom neutro...',
        defaultValue: 'Reescrever em tom enciclopédico neutro, sem adjetivos elogiosos.',
      },
    ],
  },
  {
    id: 'notoriedade',
    name: 'Notoriedade',
    aliases: ['notoriedade', 'sem relevancia', 'relevancia', 'notability'],
    category: 'notices',
    language: 'pt',
    description:
      'Questiona se o assunto cumpre os critérios mínimos de notoriedade enciclopédica por falta de cobertura independente.',
    exampleSnippet: '{{Notoriedade|motivo=Necessita cobertura significativa em fontes terceiras confiáveis.}}',
    params: [
      {
        key: 'motivo',
        label: 'Observação (opcional)',
        placeholder: 'Critérios pendentes...',
        defaultValue: 'O tema pode não atender aos critérios de notoriedade sem fontes independentes.',
      },
    ],
  },
  {
    id: 'globalizar',
    name: 'Globalizar',
    aliases: ['globalizar', 'lusofonia', 'visao regional', 'globalize'],
    category: 'notices',
    language: 'pt',
    description:
      'Indica que os exemplos e o enfoque do artigo estão restritos a um único país ou região.',
    exampleSnippet: '{{Globalizar|regiao=Brasil|motivo=Incluir perspectiva de outros países lusófonos e internacionais.}}',
    params: [
      {
        key: 'regiao',
        label: 'Região predominante atual',
        placeholder: 'Brasil / Portugal / EUA',
        defaultValue: 'um único país',
      },
      {
        key: 'motivo',
        label: 'Sugestão (opcional)',
        placeholder: 'Como ampliar o escopo...',
        defaultValue: 'Ampliar a cobertura para representar uma visão global do tema.',
      },
    ],
  },
  {
    id: 'ficcao',
    name: 'Ficção',
    aliases: ['ficcao', 'enredo', 'in-universe', 'plot'],
    category: 'notices',
    language: 'pt',
    description:
      'Alerta que o texto descreve uma obra ficcional como se fosse real, sem contexto editorial do mundo real.',
    exampleSnippet: '{{Ficção|obra=Universo da Obra}}',
    params: [
      {
        key: 'obra',
        label: 'Obra ou franquia (opcional)',
        placeholder: 'Título da obra',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'pesquisa-inedita',
    name: 'Pesquisa inédita',
    aliases: ['pesquisa inedita', 'original research', 'or', 'sintese'],
    category: 'notices',
    language: 'pt',
    description:
      'Marca afirmações interpretativas ou conclusões próprias não publicadas previamente por fontes externas.',
    exampleSnippet: '{{Pesquisa inédita|secao=Análise|data=Novembro de 2026}}',
    params: [
      {
        key: 'secao',
        label: 'Secção (opcional)',
        placeholder: 'Análise',
        defaultValue: '',
      },
      {
        key: 'data',
        label: 'Data (opcional)',
        placeholder: 'Novembro de 2026',
        defaultValue: 'Novembro de 2026',
      },
    ],
  },
  {
    id: 'curiosidades',
    name: 'Curiosidades',
    aliases: ['curiosidades', 'trivia'],
    category: 'notices',
    language: 'pt',
    description:
      'Sugere reorganizar seções de curiosidades soltas integrando fatos relevantes às seções temáticas.',
    exampleSnippet: '{{Curiosidades|motivo=Integrar os itens relevantes nas seções de História e Recepção.}}',
    params: [
      {
        key: 'motivo',
        label: 'Orientação (opcional)',
        placeholder: 'Como reorganizar...',
        defaultValue: 'Recomenda-se incorporar fatos relevantes ao texto principal do artigo.',
      },
    ],
  },
  {
    id: 'aviso-medico',
    name: 'Aviso médico',
    aliases: ['aviso medico', 'medical', 'aviso legal', 'legal disclaimer'],
    category: 'notices',
    language: 'pt',
    description:
      'Isenção de responsabilidade clássica da Wikipédia para artigos informativos sobre saúde, medicina ou direito.',
    exampleSnippet: '{{Aviso médico|tipo=medico}}',
    params: [
      {
        key: 'tipo',
        label: 'Tipo (medico ou legal)',
        placeholder: 'medico',
        defaultValue: 'medico',
      },
    ],
  },
  {
    id: 'humor',
    name: 'Humor',
    aliases: ['humor', 'piada', 'satira', 'humour'],
    category: 'notices',
    language: 'pt',
    description:
      'Identifica ensaios humorísticos ou sátiras comunitárias que não devem ser confundidos com política oficial.',
    exampleSnippet: '{{Humor|Ensaio leve da comunidade sobre boas práticas de edição.}}',
    params: [
      {
        key: '1',
        label: 'Nota contextual (opcional)',
        placeholder: 'Descrição do ensaio...',
        defaultValue: 'Esta página contém humor comunitário e não representa regra normativa oficial.',
      },
    ],
  },
  {
    id: 'arquivo-discussao',
    name: 'Arquivo',
    aliases: ['arquivo', 'talk archive', 'historico preservado', 'archive'],
    category: 'notices',
    language: 'pt',
    description:
      'Indica que a página ou subpágina preserva discussões encerradas para consulta histórica.',
    exampleSnippet: '{{Arquivo|periodo=2025–2026}}',
    params: [
      {
        key: 'periodo',
        label: 'Período arquivado (opcional)',
        placeholder: '2025–2026',
        defaultValue: 'Ciclo anterior',
      },
    ],
  },
  {
    id: 'spoiler-fim',
    name: 'Fim de spoiler',
    aliases: ['fim de spoiler', 'end spoiler', 'spoiler end'],
    category: 'notices',
    language: 'pt',
    description:
      'Marca o encerramento do trecho com revelações de enredo iniciado por {{Spoiler}}.',
    exampleSnippet: '{{Fim de spoiler}}',
    params: [],
  },
  {
    id: 'userbox',
    name: 'Userbox',
    aliases: ['userbox', 'caixa de usuario', 'babel'],
    category: 'notices',
    language: 'pt',
    description:
      'Clássica caixa de perfil pessoal ou nível de idioma ({{Userbox}} / {{Babel}}) usada em páginas de usuário.',
    exampleSnippet:
      '{{Userbox|sigla=PT-N|titulo=Idioma|texto=Este colaborador tem o português como língua materna.}}',
    params: [
      {
        key: 'sigla',
        label: 'Código / Sigla (ex.: PT-N, EN-3, DEV)',
        placeholder: 'PT-N',
        defaultValue: 'PT-N',
      },
      {
        key: 'titulo',
        label: 'Categoria',
        placeholder: 'Idioma / Interesse',
        defaultValue: 'Idioma',
      },
      {
        key: 'texto',
        label: 'Descrição no perfil',
        placeholder: 'Este colaborador...',
        defaultValue: 'Este colaborador contribui em português.',
        required: true,
      },
    ],
  },
  {
    id: 'navbox',
    name: 'Navbox',
    aliases: ['caixa de navegacao', 'navbox', 'navegacao'],
    category: 'navigation',
    language: 'pt',
    description:
      'Barra horizontal estilo Navbox conectando uma coleção ou série de artigos relacionados.',
    exampleSnippet:
      '{{Navbox|titulo=Série Documental WikiMaker|1=start|2=markdown-guide|3=ecossistema-wazzimagiygg}}',
    params: [
      {
        key: 'titulo',
        label: 'Título da caixa de navegação',
        placeholder: 'Série de artigos',
        defaultValue: 'Artigos relacionados',
        required: true,
      },
      {
        key: '1',
        label: 'Primeiro slug',
        placeholder: 'start',
        defaultValue: 'start',
      },
      {
        key: '2',
        label: 'Segundo slug',
        placeholder: 'markdown-guide',
        defaultValue: 'markdown-guide',
      },
      {
        key: '3',
        label: 'Terceiro slug (opcional)',
        placeholder: 'ecossistema-wazzimagiygg',
        defaultValue: 'ecossistema-wazzimagiygg',
      },
    ],
  },
  {
    id: 'artigo-em-serie',
    name: 'Artigo em série',
    aliases: ['artigo em serie', 'serie', 'part of a series'],
    category: 'navigation',
    language: 'pt',
    description:
      'Indica que o verbete integra uma série temática com links para o índice da série, anterior e próximo.',
    exampleSnippet:
      '{{Artigo em série|serie=Documentação WikiMaker|indice=markdown-guide|anterior=start|proximo=best-practices}}',
    params: [
      {
        key: 'serie',
        label: 'Nome da série',
        placeholder: 'Série temática',
        defaultValue: 'Guias Editoriais',
        required: true,
      },
      {
        key: 'indice',
        label: 'Slug do índice da série (opcional)',
        placeholder: 'markdown-guide',
        defaultValue: 'markdown-guide',
      },
      {
        key: 'anterior',
        label: 'Slug anterior (opcional)',
        placeholder: 'start',
        defaultValue: 'start',
      },
      {
        key: 'proximo',
        label: 'Próximo slug (opcional)',
        placeholder: 'best-practices',
        defaultValue: 'best-practices',
      },
    ],
  },
  {
    id: 'lista-dinamica',
    name: 'Lista dinâmica',
    aliases: ['lista dinamica', 'dynamic list', 'lista incompleta'],
    category: 'navigation',
    language: 'pt',
    description:
      'Aviso para listas enciclopédicas abertas que podem nunca estar completas e aceitam novos itens referenciados.',
    exampleSnippet: '{{Lista dinâmica|tema=extensões e predefinições da wiki}}',
    params: [
      {
        key: 'tema',
        label: 'Assunto da lista (opcional)',
        placeholder: 'itens documentados',
        defaultValue: 'entradas documentadas',
      },
    ],
  },
  {
    id: 'documentacao',
    name: 'Documentação',
    aliases: ['documentacao', 'documentation', 'doc'],
    category: 'navigation',
    language: 'pt',
    description:
      'Cabeçalho padrão de documentação técnica para páginas Predefinição:* e guias de uso.',
    exampleSnippet:
      '{{Documentação|texto=Consulte os parâmetros suportados e exemplos antes de transcluir em artigos principais.}}',
    params: [
      {
        key: 'texto',
        label: 'Nota de documentação',
        placeholder: 'Instruções de uso...',
        defaultValue: 'Esta caixa exibe a documentação oficial de parâmetros e exemplos de transclusão.',
      },
    ],
  },
  {
    id: 'indice-toc',
    name: 'Índice',
    aliases: ['indice', 'compact toc', 'tocright', 'toc'],
    category: 'navigation',
    language: 'pt',
    description:
      'Indica navegação estruturada por seções ou catálogo alfabético na página.',
    exampleSnippet: '{{Índice|Use os cabeçalhos do artigo ou a barra lateral para saltar entre seções.}}',
    params: [
      {
        key: '1',
        label: 'Nota de navegação (opcional)',
        placeholder: 'Instrução...',
        defaultValue: 'Navegue pelas seções pelo índice lateral automático da página.',
      },
    ],
  },
  {
    id: 'ancora',
    name: 'Âncora',
    aliases: ['ancora', 'anchor'],
    category: 'navigation',
    language: 'pt',
    description:
      'Insere um marcador de âncora HTML invisível para links diretos de seção (#identificador).',
    exampleSnippet: '{{Âncora|secao-especial}}',
    params: [
      {
        key: '1',
        label: 'ID da âncora',
        placeholder: 'identificador-secao',
        defaultValue: 'secao-referencia',
        required: true,
      },
    ],
  },
  {
    id: 'citar-periodico',
    name: 'Citar periódico',
    aliases: ['citar periodico', 'citar revista', 'citar tese', 'cite thesis'],
    category: 'navigation',
    language: 'pt',
    description:
      'Citação acadêmica para artigos científicos, revistas ou teses com volume, DOI e ano (<ref>).',
    exampleSnippet:
      '{{Citar periódico|título=Governança Aberta em Enciclopédias Digitais|autor=Costa, R.|revista=Revista Ciência Aberta|volume=12|ano=2025|doi=10.1000/exemplo}}',
    params: [
      {
        key: 'título',
        label: 'Título do estudo ou artigo',
        placeholder: 'Título científico',
        defaultValue: 'Estudo sobre Conhecimento Aberto',
        required: true,
      },
      {
        key: 'autor',
        label: 'Autor(es)',
        placeholder: 'Sobrenome, N.',
        defaultValue: 'Costa, R.',
      },
      {
        key: 'revista',
        label: 'Periódico / Instituição',
        placeholder: 'Nome da revista ou universidade',
        defaultValue: 'Revista Ciência Aberta',
      },
      {
        key: 'ano',
        label: 'Ano',
        placeholder: '2026',
        defaultValue: '2026',
      },
      {
        key: 'doi',
        label: 'DOI (opcional)',
        placeholder: '10.1000/...',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'citar-video',
    name: 'Citar vídeo',
    aliases: ['citar video', 'citar youtube', 'cite av media', 'cite video'],
    category: 'navigation',
    language: 'pt',
    description:
      'Citação bibliográfica para vídeos, documentários ou palestras gravadas; gera nota <ref>.',
    exampleSnippet:
      '{{Citar vídeo|título=Documentário WazzimaGiygg|autor=Canal Oficial|ano=2026|url=https://wazzimagiygg.com/}}',
    params: [
      {
        key: 'título',
        label: 'Título do vídeo ou documentário',
        placeholder: 'Título da mídia',
        defaultValue: 'Apresentação do Projeto',
        required: true,
      },
      {
        key: 'autor',
        label: 'Canal / Direção',
        placeholder: 'Autor ou canal',
        defaultValue: 'WazzimaGiygg',
      },
      {
        key: 'ano',
        label: 'Ano / Data',
        placeholder: '2026',
        defaultValue: '2026',
      },
      {
        key: 'url',
        label: 'URL (opcional)',
        placeholder: 'https://...',
        defaultValue: 'https://wazzimagiygg.com/',
      },
    ],
  },
  {
    id: 'citar-enciclopedia',
    name: 'Citar enciclopédia',
    aliases: ['citar enciclopedia', 'cite encyclopedia'],
    category: 'navigation',
    language: 'pt',
    description:
      'Citação de verbete em enciclopédia, dicionário ou obra de referência coletiva (<ref>).',
    exampleSnippet:
      '{{Citar enciclopedia|verbete=Wiki|obra=Enciclopédia Livre|editora=Imprensa Aberta|ano=2025}}',
    params: [
      {
        key: 'verbete',
        label: 'Nome do verbete',
        placeholder: 'Entrada citada',
        defaultValue: 'Wiki',
        required: true,
      },
      {
        key: 'obra',
        label: 'Enciclopédia / Dicionário',
        placeholder: 'Nome da obra',
        defaultValue: 'Enciclopédia de Referência',
      },
      {
        key: 'editora',
        label: 'Editora (opcional)',
        placeholder: 'Editora',
        defaultValue: '',
      },
      {
        key: 'ano',
        label: 'Ano (opcional)',
        placeholder: '2026',
        defaultValue: '2026',
      },
    ],
  },
  {
    id: 'quote-box',
    name: 'Quote box',
    aliases: ['citacoes', 'wikiquote', 'quote box'],
    category: 'navigation',
    language: 'pt',
    description:
      'Caixa destacada de citação com título de contexto, autor e obra citada.',
    exampleSnippet:
      '{{Quote box|titulo=Declaração Histórica|texto=A transparência editorial é a base da confiança pública.|autor=Conselho Editorial}}',
    params: [
      {
        key: 'titulo',
        label: 'Título da caixa',
        placeholder: 'Declaração',
        defaultValue: 'Citação em destaque',
      },
      {
        key: 'texto',
        label: 'Texto citado',
        placeholder: 'Trecho...',
        defaultValue: 'A transparência editorial é a base da confiança pública.',
        required: true,
      },
      {
        key: 'autor',
        label: 'Autor',
        placeholder: 'Nome do autor',
        defaultValue: 'Conselho Editorial',
      },
    ],
  },
  {
    id: 'tl-etiqueta',
    name: 'Tl',
    aliases: ['etiqueta', 'tl', 'predef'],
    category: 'navigation',
    language: 'pt',
    description:
      'Exibe sintaxe de predefinição inline formatada em código (`{{Aviso}}`), idêntica à {{Tl}} da Wikipédia.',
    exampleSnippet: '{{Tl|Aviso|tipo=cuidado}}',
    params: [
      {
        key: '1',
        label: 'Nome da predefinição',
        placeholder: 'Aviso',
        defaultValue: 'Aviso',
        required: true,
      },
      {
        key: '2',
        label: 'Exemplo de parâmetro (opcional)',
        placeholder: 'tipo=cuidado',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'tecla-kbd',
    name: 'Tecla',
    aliases: ['tecla', 'kbd', 'key press'],
    category: 'navigation',
    language: 'pt',
    description:
      'Formata combinações de teclas inline estilo Wikipédia (ex.: `Ctrl` + `S` ou `Enter`).',
    exampleSnippet: '{{Tecla|Ctrl|S}}',
    params: [
      {
        key: '1',
        label: 'Primeira tecla',
        placeholder: 'Ctrl',
        defaultValue: 'Ctrl',
        required: true,
      },
      {
        key: '2',
        label: 'Segunda tecla (opcional)',
        placeholder: 'S',
        defaultValue: 'S',
      },
    ],
  },
  {
    id: 'conversao',
    name: 'Converter',
    aliases: ['conversao', 'converter', 'convert'],
    category: 'navigation',
    language: 'pt',
    description:
      'Converte unidades comuns inline (km/mi, m/ft, kg/lb, °C/°F) exatamente como {{Convert}} na Wikipédia.',
    exampleSnippet: '{{Converter|100|km|mi}}',
    params: [
      {
        key: '1',
        label: 'Valor numérico',
        placeholder: '100',
        defaultValue: '100',
        required: true,
      },
      {
        key: '2',
        label: 'Unidade de origem (km, m, kg, C, mi, ft, lb, F)',
        placeholder: 'km',
        defaultValue: 'km',
        required: true,
      },
      {
        key: '3',
        label: 'Unidade de destino (opcional)',
        placeholder: 'mi',
        defaultValue: 'mi',
      },
    ],
  },
  {
    id: 'moeda',
    name: 'Moeda',
    aliases: ['moeda', 'brl', 'usd', 'eur', 'currency'],
    category: 'navigation',
    language: 'pt',
    description:
      'Formata valores monetários padronizados inline (`R$ 1.500`, `US$ 250`, `€ 100`).',
    exampleSnippet: '{{Moeda|1500|BRL}}',
    params: [
      {
        key: '1',
        label: 'Valor',
        placeholder: '1500',
        defaultValue: '1500',
        required: true,
      },
      {
        key: '2',
        label: 'Código da moeda (BRL, USD, EUR, GBP)',
        placeholder: 'BRL',
        defaultValue: 'BRL',
      },
    ],
  },
  {
    id: 'coordenadas',
    name: 'Coord',
    aliases: ['coordenadas', 'coord', 'coordinates'],
    category: 'navigation',
    language: 'pt',
    description:
      'Formata latitude e longitude inline estilo {{Coord}} da Wikipédia com link externo para mapa.',
    exampleSnippet: '{{Coord|-23.5505|-46.6333}}',
    params: [
      {
        key: '1',
        label: 'Latitude',
        placeholder: '-23.5505',
        defaultValue: '-23.5505',
        required: true,
      },
      {
        key: '2',
        label: 'Longitude',
        placeholder: '-46.6333',
        defaultValue: '-46.6333',
        required: true,
      },
    ],
  },
  {
    id: 'idade',
    name: 'Idade',
    aliases: ['idade', 'age', 'data de nascimento', 'birth date and age'],
    category: 'navigation',
    language: 'pt',
    description:
      'Formata data de nascimento e calcula a idade atual automaticamente (`15/05/1990 (36 anos)`).',
    exampleSnippet: '{{Idade|1990|5|15}}',
    params: [
      {
        key: '1',
        label: 'Ano',
        placeholder: '1990',
        defaultValue: '1990',
        required: true,
      },
      {
        key: '2',
        label: 'Mês (1-12)',
        placeholder: '5',
        defaultValue: '5',
        required: true,
      },
      {
        key: '3',
        label: 'Dia (1-31)',
        placeholder: '15',
        defaultValue: '15',
        required: true,
      },
    ],
  },
  {
    id: 'amostra-cor',
    name: 'Cor',
    aliases: ['cor', 'color sample', 'swatch'],
    category: 'navigation',
    language: 'pt',
    description:
      'Exibe referência textual e código hexadecimal de cor (`🎨 #2563EB`), útil em tabelas de identidade visual.',
    exampleSnippet: '{{Cor|#2563EB|Azul Editorial}}',
    params: [
      {
        key: '1',
        label: 'Código hexadecimal',
        placeholder: '#2563EB',
        defaultValue: '#2563EB',
        required: true,
      },
      {
        key: '2',
        label: 'Nome da cor (opcional)',
        placeholder: 'Azul Editorial',
        defaultValue: 'Azul Editorial',
      },
    ],
  },
  {
    id: 'identificador-bibliografico',
    name: 'DOI',
    aliases: ['isbn', 'doi', 'issn', 'arxiv'],
    category: 'navigation',
    language: 'pt',
    description:
      'Formata identificadores bibliográficos (ISBN, DOI, ISSN, arXiv) com link direto para consulta acadêmica.',
    exampleSnippet: '{{DOI|10.1038/nature12373}}',
    params: [
      {
        key: 'tipo',
        label: 'Tipo (DOI, ISBN, ISSN, arXiv)',
        placeholder: 'DOI',
        defaultValue: 'DOI',
      },
      {
        key: '1',
        label: 'Identificador',
        placeholder: '10.1038/nature12373',
        defaultValue: '10.1038/nature12373',
        required: true,
      },
    ],
  },
  {
    id: 'sim-nao-tabela',
    name: 'Sim',
    aliases: ['sim', 'yes', 'nao', 'no', 'parcialmente', 'maybe', 'check', 'cross'],
    category: 'navigation',
    language: 'pt',
    description:
      'Marcações visuais inline (`✅ Sim`, `❌ Não`, `⚠️ Parcial`) muito usadas em tabelas comparativas da Wikipédia (também aceita {{Não}} e {{Parcialmente}}).',
    exampleSnippet: '{{Sim}} · {{Não}} · {{Parcialmente}}',
    params: [
      {
        key: '1',
        label: 'Rótulo personalizado (opcional)',
        placeholder: 'Sim / Suportado',
        defaultValue: 'Sim',
      },
    ],
  },
  // --- Additional Wikipedia Infobox Presets ---
  {
    id: 'info-filme',
    name: 'Info/Filme',
    aliases: ['info/filme', 'info/serie', 'infobox film', 'infobox television'],
    category: 'infobox',
    language: 'pt',
    description:
      'Infocaixa cinematográfica estilo Wikipédia ({{Info/Filme}} / {{Infobox film}}) com direção, elenco e duração.',
    exampleSnippet:
      '{{Info/Filme|título=Filme Exemplo|Direção=Diretor Exemplo|Gênero=Documentário|Duração=110 min|Ano=2026}}',
    params: [
      {
        key: 'título',
        label: 'Título do filme ou série',
        placeholder: 'Título oficial',
        defaultValue: 'Documentário Exemplo',
        required: true,
      },
      {
        key: 'Direção',
        label: 'Direção',
        placeholder: 'Nome do(a) diretor(a)',
        defaultValue: 'Direção Independente',
      },
      {
        key: 'Gênero',
        label: 'Gênero',
        placeholder: 'Documentário, Drama...',
        defaultValue: 'Documentário',
      },
      {
        key: 'Duração',
        label: 'Duração',
        placeholder: '95 min',
        defaultValue: '95 min',
      },
      {
        key: 'Ano',
        label: 'Ano de lançamento',
        placeholder: '2026',
        defaultValue: '2026',
      },
    ],
  },
  {
    id: 'info-livro',
    name: 'Info/Livro',
    aliases: ['info/livro', 'info/obra', 'infobox book'],
    category: 'infobox',
    language: 'pt',
    description:
      'Ficha literária da Wikipédia ({{Info/Livro}} / {{Infobox book}}) com autor, idioma, editora e páginas.',
    exampleSnippet:
      '{{Info/Livro|título=Livro Exemplo|Autor=Autor Exemplo|Idioma=Português|Editora=Imprensa Aberta|Páginas=280|Ano=2026}}',
    params: [
      {
        key: 'título',
        label: 'Título do livro',
        placeholder: 'Nome da obra',
        defaultValue: 'Manual de Conhecimento Aberto',
        required: true,
      },
      {
        key: 'Autor',
        label: 'Autor(a)',
        placeholder: 'Nome do autor',
        defaultValue: 'Autor Exemplo',
      },
      {
        key: 'Idioma',
        label: 'Idioma original',
        placeholder: 'Português',
        defaultValue: 'Português',
      },
      {
        key: 'Editora',
        label: 'Editora',
        placeholder: 'Nome da editora',
        defaultValue: 'Imprensa Aberta',
      },
      {
        key: 'Páginas',
        label: 'Páginas',
        placeholder: '240',
        defaultValue: '240',
      },
    ],
  },
  {
    id: 'info-musica',
    name: 'Info/Música',
    aliases: ['info/musica', 'info/album', 'infobox album', 'infobox song'],
    category: 'infobox',
    language: 'pt',
    description:
      'Infocaixa musical da Wikipédia ({{Info/Álbum}} / {{Infobox album}}) para álbuns, singles e trilhas sonoras.',
    exampleSnippet:
      '{{Info/Música|título=Álbum Exemplo|Artista=Banda Exemplo|Lançamento=2026|Gênero=Rock Alternativo|Gravadora=Independente}}',
    params: [
      {
        key: 'título',
        label: 'Título do álbum ou canção',
        placeholder: 'Nome do álbum',
        defaultValue: 'Trilha Sonora Oficial',
        required: true,
      },
      {
        key: 'Artista',
        label: 'Artista / Banda',
        placeholder: 'Nome do artista',
        defaultValue: 'Artista Independente',
      },
      {
        key: 'Gênero',
        label: 'Gênero musical',
        placeholder: 'Rock, Eletrônica, MPB...',
        defaultValue: 'Instrumental',
      },
      {
        key: 'Lançamento',
        label: 'Lançamento',
        placeholder: '2026',
        defaultValue: '2026',
      },
      {
        key: 'Gravadora',
        label: 'Gravadora / Selo',
        placeholder: 'Selo independente',
        defaultValue: 'Independente',
      },
    ],
  },
  {
    id: 'info-personagem',
    name: 'Info/Personagem',
    aliases: ['info/personagem', 'infobox character'],
    category: 'infobox',
    language: 'pt',
    description:
      'Ficha de personagem fictício estilo Wikipédia ({{Info/Personagem}} / {{Infobox character}}) com obra, criador e afiliação.',
    exampleSnippet:
      '{{Info/Personagem|título=Personagem Exemplo|Obra=Série Exemplo|Criador=Estúdio Criativo|Espécie=Humano|Afiliação=Aliança Central}}',
    params: [
      {
        key: 'título',
        label: 'Nome do personagem',
        placeholder: 'Nome completo',
        defaultValue: 'Personagem Exemplo',
        required: true,
      },
      {
        key: 'Obra',
        label: 'Obra / Universo',
        placeholder: 'Jogo, livro ou série',
        defaultValue: 'Universo Exemplo',
      },
      {
        key: 'Criador',
        label: 'Criador(es)',
        placeholder: 'Autor ou estúdio',
        defaultValue: 'Estúdio Criativo',
      },
      {
        key: 'Afiliação',
        label: 'Afiliação / Facção',
        placeholder: 'Grupo ou equipe',
        defaultValue: 'Independente',
      },
    ],
  },
  {
    id: 'info-software',
    name: 'Info/Software',
    aliases: ['info/software', 'infobox software', 'info/aplicativo'],
    category: 'infobox',
    language: 'pt',
    description:
      'Ficha técnica de software estilo Wikipédia ({{Info/Software}} / {{Infobox software}}) com licença, linguagem e versão.',
    exampleSnippet:
      '{{Info/Software|título=WikiMaker Engine|Desenvolvedor=WazzimaGiygg|Versão=2.0|Linguagem=TypeScript|Licença=Open Source}}',
    params: [
      {
        key: 'título',
        label: 'Nome do software',
        placeholder: 'Nome do aplicativo',
        defaultValue: 'Software Exemplo',
        required: true,
      },
      {
        key: 'Desenvolvedor',
        label: 'Desenvolvedor',
        placeholder: 'Autor ou organização',
        defaultValue: 'Comunidade Aberta',
      },
      {
        key: 'Versão',
        label: 'Versão estável',
        placeholder: '1.0.0',
        defaultValue: '1.0.0',
      },
      {
        key: 'Linguagem',
        label: 'Linguagem / Stack',
        placeholder: 'TypeScript, Rust, Python...',
        defaultValue: 'TypeScript',
      },
      {
        key: 'Licença',
        label: 'Licença',
        placeholder: 'MIT, GPLv3, Apache 2.0...',
        defaultValue: 'MIT',
      },
    ],
  },
  {
    id: 'info-evento',
    name: 'Info/Evento',
    aliases: ['info/evento', 'info/acontecimento', 'infobox event'],
    category: 'infobox',
    language: 'pt',
    description:
      'Ficha resumida para eventos históricos, conferências e acontecimentos ({{Info/Evento}} / {{Infobox event}}).',
    exampleSnippet:
      '{{Info/Evento|título=Conferência Aberta 2026|Data=Novembro de 2026|Local=São Paulo|Participantes=Comunidade Wiki|Resultado=Publicação da Carta Aberta}}',
    params: [
      {
        key: 'título',
        label: 'Nome do evento',
        placeholder: 'Título do acontecimento',
        defaultValue: 'Evento Histórico Exemplo',
        required: true,
      },
      {
        key: 'Data',
        label: 'Data ou período',
        placeholder: 'Novembro de 2026',
        defaultValue: 'Novembro de 2026',
      },
      {
        key: 'Local',
        label: 'Local',
        placeholder: 'Cidade, País',
        defaultValue: 'Online / Global',
      },
      {
        key: 'Resultado',
        label: 'Desfecho / Impacto',
        placeholder: 'Principais consequências...',
        defaultValue: 'Registro documentado em fontes públicas',
      },
    ],
  },
  {
    id: 'info-universidade',
    name: 'Info/Universidade',
    aliases: ['info/universidade', 'info/escola', 'infobox university'],
    category: 'infobox',
    language: 'pt',
    description:
      'Infocaixa acadêmica da Wikipédia para universidades, faculdades e centros de pesquisa ({{Info/Universidade}}).',
    exampleSnippet:
      '{{Info/Universidade|título=Universidade Exemplo|Tipo=Pública|Fundação=1934|Localização=Brasil|Estudantes=25.000}}',
    params: [
      {
        key: 'título',
        label: 'Nome da instituição',
        placeholder: 'Nome completo',
        defaultValue: 'Universidade Exemplo',
        required: true,
      },
      {
        key: 'Tipo',
        label: 'Natureza (Pública / Privada)',
        placeholder: 'Pública',
        defaultValue: 'Pública',
      },
      {
        key: 'Fundação',
        label: 'Ano de fundação',
        placeholder: '1934',
        defaultValue: '1934',
      },
      {
        key: 'Localização',
        label: 'Localização',
        placeholder: 'Cidade, País',
        defaultValue: 'Brasil',
      },
    ],
  },
  {
    id: 'taxobox',
    name: 'Taxobox',
    aliases: ['info/taxonomia', 'info/especie', 'taxocaixa', 'taxobox'],
    category: 'infobox',
    language: 'pt',
    description:
      'A clássica Taxobox da Wikipédia para classificação científica de espécies (Reino, Filo, Classe, Ordem, Família, Espécie).',
    exampleSnippet:
      '{{Taxobox|título=Lobo-guará|subtítulo=Chrysocyon brachyurus|Reino=Animalia|Filo=Chordata|Classe=Mammalia|Família=Canidae|Espécie=C. brachyurus}}',
    params: [
      {
        key: 'título',
        label: 'Nome popular',
        placeholder: 'Nome da espécie',
        defaultValue: 'Lobo-guará',
        required: true,
      },
      {
        key: 'subtítulo',
        label: 'Nome científico',
        placeholder: 'Espécie binomial',
        defaultValue: 'Chrysocyon brachyurus',
      },
      {
        key: 'Reino',
        label: 'Reino',
        placeholder: 'Animalia',
        defaultValue: 'Animalia',
      },
      {
        key: 'Classe',
        label: 'Classe',
        placeholder: 'Mammalia',
        defaultValue: 'Mammalia',
      },
      {
        key: 'Família',
        label: 'Família',
        placeholder: 'Canidae',
        defaultValue: 'Canidae',
      },
    ],
  },
  {
    id: 'chembox',
    name: 'Chembox',
    aliases: ['info/quimica', 'chembox', 'infobox element'],
    category: 'infobox',
    language: 'pt',
    description:
      'Ficha técnica estilo Chembox da Wikipédia para elementos e compostos químicos (Fórmula, Massa Molar, Ponto de Fusão).',
    exampleSnippet:
      '{{Chembox|título=Água|subtítulo=Óxido de di-hidrogênio|Fórmula=H₂O|Massa molar=18,015 g/mol|Ponto de fusão=0 °C|Ponto de ebulição=100 °C}}',
    params: [
      {
        key: 'título',
        label: 'Nome da substância ou elemento',
        placeholder: 'Água',
        defaultValue: 'Água',
        required: true,
      },
      {
        key: 'Fórmula',
        label: 'Fórmula química / Símbolo',
        placeholder: 'H₂O',
        defaultValue: 'H₂O',
      },
      {
        key: 'Massa molar',
        label: 'Massa molar / atômica',
        placeholder: '18,015 g/mol',
        defaultValue: '18,015 g/mol',
      },
      {
        key: 'Ponto de fusão',
        label: 'Ponto de fusão',
        placeholder: '0 °C',
        defaultValue: '0 °C',
      },
    ],
  },
  {
    id: 'info-usuario',
    name: 'Info/Usuário',
    aliases: ['info/usuario', 'info/colaborador', 'infobox user'],
    category: 'infobox',
    language: 'pt',
    description:
      'Caixa de apresentação para páginas pessoais de colaboradores ({{Info/Usuário}} / {{Infobox user}}).',
    exampleSnippet:
      '{{Info/Usuário|título=Colaborador Wiki|Idiomas=Português, Inglês|Interesses=História, Software Livre|Status=Ativo}}',
    params: [
      {
        key: 'título',
        label: 'Nome do colaborador',
        placeholder: 'Seu nome na wiki',
        defaultValue: 'Colaborador Wiki',
        required: true,
      },
      {
        key: 'Idiomas',
        label: 'Idiomas',
        placeholder: 'Português, Inglês',
        defaultValue: 'Português',
      },
      {
        key: 'Interesses',
        label: 'Áreas de interesse',
        placeholder: 'Tecnologia, História...',
        defaultValue: 'Documentação e Ciência',
      },
      {
        key: 'Status',
        label: 'Status editorial',
        placeholder: 'Ativo',
        defaultValue: 'Ativo',
      },
    ],
  },
];

function normalizeTemplateKey(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function stripTemplateNamespace(rawName: string): {
  explicitNamespace: 'predefinicao' | 'template' | null;
  cleanName: string;
} {
  const trimmed = rawName.trim();
  const match = /^(predefini[cç][aã]o|predefinicao|template)\s*:\s*(.+)$/i.exec(trimmed);
  if (!match) {
    return { explicitNamespace: null, cleanName: trimmed };
  }
  const nsRaw = normalizeTemplateKey(match[1]);
  const explicitNamespace = nsRaw.startsWith('template') ? 'template' : 'predefinicao';
  return { explicitNamespace, cleanName: match[2].trim() };
}

interface ParsedTemplateCall {
  rawName: string;
  params: Record<string, string>;
  positional: string[];
  orderedEntries: { key: string; value: string; isNamed: boolean }[];
}

/**
 * Splits a MediaWiki template body `Name|arg1|key=val` respecting nested
 * `[[...]]`, `{{...}}`, and Markdown `[text](url)` delimiters.
 */
function parseTemplateCallBody(inner: string): ParsedTemplateCall | null {
  const parts: string[] = [];
  let current = '';
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    const next = inner[i + 1];

    if (ch === '{' && next === '{') {
      braceDepth += 1;
      current += '{{';
      i += 1;
      continue;
    }
    if (ch === '}' && next === '}' && braceDepth > 0) {
      braceDepth -= 1;
      current += '}}';
      i += 1;
      continue;
    }
    if (ch === '[' && next === '[') {
      bracketDepth += 1;
      current += '[[';
      i += 1;
      continue;
    }
    if (ch === ']' && next === ']' && bracketDepth > 0) {
      bracketDepth -= 1;
      current += ']]';
      i += 1;
      continue;
    }
    if (ch === '(') {
      parenDepth += 1;
    } else if (ch === ')' && parenDepth > 0) {
      parenDepth -= 1;
    }

    if (ch === '|' && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);

  const rawName = (parts[0] ?? '').trim();
  if (!rawName || rawName.includes('\n')) {
    return null;
  }

  const params: Record<string, string> = {};
  const positional: string[] = [];
  const orderedEntries: { key: string; value: string; isNamed: boolean }[] = [];
  let posIndex = 1;

  for (let i = 1; i < parts.length; i++) {
    const segment = parts[i];
    const eqIndex = findTopLevelEquals(segment);
    if (eqIndex > 0) {
      const key = segment.slice(0, eqIndex).trim();
      const value = segment.slice(eqIndex + 1).trim();
      if (key) {
        params[key] = value;
        params[normalizeTemplateKey(key)] = value;
        orderedEntries.push({ key, value, isNamed: true });
        continue;
      }
    }
    const posVal = segment.trim();
    params[String(posIndex)] = posVal;
    positional.push(posVal);
    orderedEntries.push({ key: String(posIndex), value: posVal, isNamed: false });
    posIndex += 1;
  }

  return { rawName, params, positional, orderedEntries };
}

function findTopLevelEquals(segment: string): number {
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;

  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    const next = segment[i + 1];
    if (ch === '{' && next === '{') {
      braceDepth += 1;
      i += 1;
      continue;
    }
    if (ch === '}' && next === '}' && braceDepth > 0) {
      braceDepth -= 1;
      i += 1;
      continue;
    }
    if (ch === '[' && next === '[') {
      bracketDepth += 1;
      i += 1;
      continue;
    }
    if (ch === ']' && next === ']' && bracketDepth > 0) {
      bracketDepth -= 1;
      i += 1;
      continue;
    }
    if (ch === '(') parenDepth += 1;
    else if (ch === ')' && parenDepth > 0) parenDepth -= 1;
    else if (ch === '=' && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
      return i;
    }
  }
  return -1;
}

function pickParam(call: ParsedTemplateCall, keys: string[], fallback = ''): string {
  for (const rawKey of keys) {
    if (rawKey in call.params && call.params[rawKey] !== '') {
      return call.params[rawKey];
    }
    const norm = normalizeTemplateKey(rawKey);
    if (norm in call.params && call.params[norm] !== '') {
      return call.params[norm];
    }
  }
  return fallback;
}

function sanitizePredefLine(value: string): string {
  return value.replace(/\r?\n+/g, ' ').trim();
}

export function serializePredefinicaoBlock(opts: {
  variant: TemplateBlockVariant;
  kicker: string;
  title?: string;
  body: string;
  author?: string;
  source?: string;
  meta?: string;
}): string {
  const lines: string[] = [`:::predefinicao ${opts.variant}`];
  lines.push(`kicker: ${sanitizePredefLine(opts.kicker) || 'Predefinição'}`);
  if (opts.title?.trim()) {
    lines.push(`title: ${sanitizePredefLine(opts.title)}`);
  }
  if (opts.author?.trim()) {
    lines.push(`author: ${sanitizePredefLine(opts.author)}`);
  }
  if (opts.source?.trim()) {
    lines.push(`source: ${sanitizePredefLine(opts.source)}`);
  }
  if (opts.meta?.trim()) {
    lines.push(`meta: ${sanitizePredefLine(opts.meta)}`);
  }
  lines.push(`body: ${sanitizePredefLine(opts.body)}`);
  lines.push(':::');
  return lines.join('\n');
}

export interface TemplateExpansionOptions {
  currentSlug?: string;
  currentTitle?: string;
  dynamicParams?: Record<string, string>;
  depth?: number;
  visitedSlugs?: Set<string>;
}

function isSpeedyDeletionKey(key: string): boolean {
  return (
    key === 'eliminacao rapida' ||
    key === 'er' ||
    key === 'speedy delete' ||
    key === 'speedy deletion' ||
    key === 'db' ||
    key === 'delete'
  );
}

function resolveBuiltinTemplate(
  cleanName: string,
  call: ParsedTemplateCall,
  isStandaloneLine: boolean,
  options?: TemplateExpansionOptions
): string | null {
  const key = normalizeTemplateKey(cleanName);

  // Magic words (MediaWiki dynamic tokens)
  const now = new Date();
  if (key === 'currentyear') return String(now.getFullYear());
  if (key === 'currentmonth') return String(now.getMonth() + 1).padStart(2, '0');
  if (key === 'currentmonthname') {
    return now.toLocaleDateString('en-US', { month: 'long' });
  }
  if (key === 'currentday') return String(now.getDate());
  if (key === 'sitename') return 'WazzimaGiygg Maker';
  if (key === 'pagename' || key === 'fullpagename') {
    return options?.currentTitle || options?.currentSlug || 'Wiki Page';
  }
  if (key === 'currentslug' || key === 'slug') {
    return options?.currentSlug || 'start';
  }

  // Dynamic article-level context variable (only when called without args and not a built-in template)
  if (options?.dynamicParams && call.orderedEntries.length === 0) {
    const directVal = options.dynamicParams[call.rawName.trim()] ?? options.dynamicParams[key];
    if (directVal !== undefined) {
      return directVal;
    }
  }

  // 1. {{Aviso}} / {{Ambox}} / {{Notice}} / {{Alerta}} / {{Nota}}
  if (key === 'aviso' || key === 'ambox' || key === 'notice' || key === 'alerta' || key === 'nota') {
    const rawType = normalizeTemplateKey(pickParam(call, ['tipo', 'type'], 'nota'));
    let variant: TemplateBlockVariant = 'info';
    let defaultTitle = 'Editorial Notice';
    let kicker = 'Template · Notice';

    if (rawType === 'cuidado' || rawType === 'aviso' || rawType === 'warning' || rawType === 'atencao') {
      variant = 'warning';
      defaultTitle = 'Attention';
      kicker = 'Template · Warning';
    } else if (rawType === 'critico' || rawType === 'erro' || rawType === 'alert' || rawType === 'danger') {
      variant = 'alert';
      defaultTitle = 'Important Alert';
      kicker = 'Template · Alert';
    } else if (rawType === 'sucesso' || rawType === 'ok' || rawType === 'verificado' || rawType === 'success') {
      variant = 'success';
      defaultTitle = 'Verified';
      kicker = 'Template · Verified';
    }

    const title = pickParam(call, ['título', 'titulo', 'title'], defaultTitle);
    const body = pickParam(
      call,
      ['texto', 'text', 'mensagem', 'message', '1', '2'],
      'Please review the details documented in this section.'
    );
    const meta = pickParam(call, ['data', 'date', 'nota', 'meta']);

    return serializePredefinicaoBlock({ variant, kicker, title, body, meta });
  }

  // 1b. {{Boas-vindas}} / {{Welcome}}
  if (key === 'boas vindas' || key === 'boas-vindas' || key === 'welcome') {
    const collaborator = pickParam(
      call,
      ['colaborador', 'contributor', 'nome', 'user', '1'],
      'Colaborador'
    );
    const topic = pickParam(call, ['tema', 'topic', '2'], 'WazzimaGiygg Maker');
    const dateVal = pickParam(call, ['data', 'date', 'meta']);
    const isEnglish = key === 'welcome';

    return serializePredefinicaoBlock({
      variant: 'success',
      kicker: isEnglish ? 'Template · Welcome' : 'Predefinição · Boas-vindas',
      title: isEnglish ? `Welcome, ${collaborator}!` : `Boas-vindas, ${collaborator}!`,
      body: isEnglish
        ? `Thank you for contributing to ${topic}. Before creating or editing pages, please review the [WikiMaker Usage Rules & Terms](#/terms), check the [[markdown-guide|Markdown & Templates Guide]], or explore [[ecossistema-wazzimagiygg|WazzimaGiygg Ecosystem Products]].`
        : `Olá, ${collaborator}! Obrigado por contribuir com ${topic}. Antes de criar ou editar artigos, consulte as [Regras de Uso do WikiMaker](#/terms), confira o [[markdown-guide|Guia de Markdown e Predefinições]] ou explore os [[ecossistema-wazzimagiygg|Produtos do Ecossistema WazzimaGiygg]].`,
      meta: dateVal || undefined,
    });
  }

  // 2. {{Esboço}} / {{Stub}}
  if (key === 'esboco' || key === 'stub') {
    const topic = pickParam(call, ['tema', 'topic', '1']);
    const title = topic ? `This article about ${topic} is a stub` : 'This article is a stub';
    return serializePredefinicaoBlock({
      variant: 'stub',
      kicker: 'Template · Stub',
      title,
      body: 'You can help expand this wiki entry by clicking **Edit** and adding verified content and references.',
      meta: topic || undefined,
    });
  }

  // 3. {{Em construção}} / {{WIP}} / {{Under construction}}
  if (
    key === 'em construcao' ||
    key === 'wip' ||
    key === 'under construction' ||
    key === 'construcao' ||
    key === 'manutencao'
  ) {
    const note = pickParam(call, ['texto', 'text', 'nota', 'note', '1']);
    const body = note
      ? `This page is actively being drafted and updated. ${note}`
      : 'This page is currently under active construction and may undergo structural edits soon.';
    return serializePredefinicaoBlock({
      variant: 'wip',
      kicker: 'Template · Under Construction',
      title: 'Work in Progress',
      body,
    });
  }

  // 4. {{Carece de fontes}} / {{Sem fontes}} / {{Citation needed}}
  if (
    key === 'carece de fontes' ||
    key === 'sem fontes' ||
    key === 'citation needed' ||
    key === 'fonte' ||
    key === 'cn'
  ) {
    const dateVal = pickParam(call, ['data', 'date', '1']);
    if (!isStandaloneLine && !dateVal && key !== 'sem fontes') {
      return `[[markdown-guide|^[citation needed]^]]`;
    }
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Citations Needed',
      title: 'This article or section needs verifiable references',
      body: 'Please add `<ref>...</ref>` citations or reliable independent sources so readers can verify every factual statement.',
      meta: dateVal ? `Tagged: ${dateVal}` : undefined,
    });
  }

  // 5. {{Desambiguação}} / {{Disambiguation}}
  if (key === 'desambiguacao' || key === 'desambig' || key === 'disambig' || key === 'disambiguation') {
    const term = pickParam(call, ['termo', 'term', '1']);
    return serializePredefinicaoBlock({
      variant: 'disambiguation',
      kicker: 'Template · Disambiguation',
      title: term ? `Disambiguation: ${term}` : 'Disambiguation Page',
      body: 'This disambiguation page lists wiki articles associated with the same title or identifier. Follow the direct links below to reach the intended topic.',
    });
  }

  // 6. {{Spoiler}} / {{Aviso spoiler}}
  if (key === 'spoiler' || key === 'aviso spoiler') {
    const work = pickParam(call, ['obra', '1']);
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Content Notice',
      title: work ? `Contains spoilers for ${work}` : 'Contains plot spoilers',
      body: 'The following section discloses key narrative developments or endings.',
    });
  }

  // 6b. {{Eliminação rápida}} / {{ER}} / {{Speedy delete}} / {{DB}}
  if (isSpeedyDeletionKey(key)) {
    const reason = pickParam(
      call,
      ['motivo', 'reason', 'justificativa', 'texto', 'text', '1'],
      'Este artigo foi proposto para eliminação rápida por não atender aos critérios mínimos da wiki.'
    );
    const rule = pickParam(call, ['regra', 'rule', 'criterio', 'critério', '2']);
    const proponent = pickParam(call, ['proponente', 'editor', 'usuario', 'usuário', 'by']);
    const dateVal = pickParam(call, ['data', 'date']);
    const metaParts = [
      proponent ? `Proponente: ${proponent}` : '',
      dateVal ? `Data: ${dateVal}` : '',
    ].filter(Boolean);

    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: 'Predefinição · Eliminação rápida',
      title: rule
        ? `Página proposta para eliminação rápida (${rule})`
        : 'Página proposta para eliminação rápida',
      body: `Motivo: ${reason} — Um alerta automático é enviado à página de discussão do autor ao inserir esta marcação. Consulte as [Regras de Uso do WikiMaker](#/terms) antes de remover este aviso.`,
      meta: metaParts.length > 0 ? metaParts.join(' · ') : undefined,
    });
  }

  // 6c. {{Bloqueio}} / {{Bloqueado}} / {{Block}} / {{Blocked}} / {{User blocked}}
  if (
    key === 'bloqueio' ||
    key === 'bloqueado' ||
    key === 'block' ||
    key === 'blocked' ||
    key === 'user blocked'
  ) {
    const reason = pickParam(
      call,
      ['motivo', 'reason', 'texto', 'text', '1'],
      'Violação das políticas editoriais ou de conduta da wiki.'
    );
    const admin = pickParam(call, ['administrador', 'admin', 'by', 'moderador', '2']);
    const duration = pickParam(call, ['duracao', 'duration', 'prazo', '3'], 'Indeterminado');
    const dateVal = pickParam(call, ['data', 'date', '4']);
    const metaParts = [
      admin ? `Responsável: ${admin}` : '',
      dateVal ? `Aplicado em: ${dateVal}` : '',
    ].filter(Boolean);

    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: 'Predefinição · Bloqueio de Conta',
      title: 'Esta conta está bloqueada para edições',
      body: `Motivo do bloqueio: ${reason}. Duração: ${duration}.${
        admin ? ` Aplicado por: ${admin}.` : ''
      } Consulte a página de discussão para mais detalhes e leia as [Regras de Uso do WikiMaker](#/terms).`,
      meta: metaParts.length > 0 ? metaParts.join(' · ') : undefined,
    });
  }

  // 7. {{Principal}} / {{Artigo principal}} / {{Main}}
  if (key === 'principal' || key === 'artigo principal' || key === 'main') {
    const targets: string[] = [];
    const firstSlugRaw = pickParam(call, ['1', 'artigo', 'slug', 'pagina']);
    if (firstSlugRaw) {
      const slug = toWikiSlug(firstSlugRaw);
      const customLabel = pickParam(call, ['2', 'título', 'titulo', 'label']);
      targets.push(customLabel ? `[[${slug}|${customLabel}]]` : `[[${slug}]]`);
    }
    if (targets.length === 0) {
      targets.push('[[start|Home]]');
    }
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Main Article',
      body: `Main article: ${targets.join(', ')}`,
    });
  }

  // 8. {{Ver também}} / {{See also}}
  if (key === 'ver tambem' || key === 'see also' || key === 'veja tambem') {
    const slugs = call.positional.filter(Boolean).map((item) => `[[${toWikiSlug(item)}|${item.trim()}]]`);
    const body = slugs.length > 0 ? `See also: ${slugs.join(' · ')}` : 'See also: [[start|Home]]';
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'See Also',
      body,
    });
  }

  // 9. {{Citação}} / {{Quote}} / {{Cquote}}
  if (key === 'citacao' || key === 'quote' || key === 'cquote') {
    const quoteText = pickParam(
      call,
      ['texto', 'text', 'citacao', '1'],
      'Knowledge belongs to everyone when documentation remains open.'
    );
    const author = pickParam(call, ['autor', 'author', '2']);
    const source = pickParam(call, ['fonte', 'source', 'obra', '3']);
    return serializePredefinicaoBlock({
      variant: 'quote',
      kicker: 'Template · Quote',
      body: quoteText,
      author: author || undefined,
      source: source || undefined,
    });
  }

  // 9b. {{Cleanup}} / {{Clean up}} / {{Wikify}}
  if (key === 'cleanup' || key === 'clean up' || key === 'wikify') {
    const reason = pickParam(
      call,
      ['reason', 'motivo', 'text', 'texto', '1'],
      'This article may require cleanup to meet editorial formatting and clarity standards.'
    );
    const section = pickParam(call, ['section', 'secao']);
    const dateVal = pickParam(call, ['date', 'data']);
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Cleanup',
      title: section
        ? `The "${section}" section may require cleanup`
        : 'This article may require cleanup',
      body: reason,
      meta: dateVal ? `Tagged: ${dateVal}` : undefined,
    });
  }

  // 9c. {{Outdated}} / {{Update}} / {{Obsolete}}
  if (key === 'outdated' || key === 'update' || key === 'obsolete') {
    const reason = pickParam(
      call,
      ['reason', 'motivo', 'text', 'texto', '1'],
      'Parts of this article may no longer reflect current information or recent updates.'
    );
    const dateVal = pickParam(call, ['date', 'data']);
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Outdated',
      title: 'This article may contain outdated information',
      body: reason,
      meta: dateVal ? `Tagged: ${dateVal}` : undefined,
    });
  }

  // 9d. {{Disputed}} / {{POV}} / {{Neutrality}} / {{Factual accuracy}}
  if (key === 'disputed' || key === 'pov' || key === 'neutrality' || key === 'factual accuracy') {
    const reason = pickParam(
      call,
      ['reason', 'motivo', 'text', 'texto', '1'],
      'The factual accuracy or neutrality of this content is under discussion on the talk page.'
    );
    const section = pickParam(call, ['section', 'secao']);
    const dateVal = pickParam(call, ['date', 'data']);
    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: 'Template · Disputed',
      title: section
        ? `Disputed content in "${section}"`
        : 'Factual accuracy or neutrality is disputed',
      body: reason,
      meta: dateVal ? `Tagged: ${dateVal}` : undefined,
    });
  }

  // 9e. {{Verify}} / {{Fact check}} / {{Verification}}
  if (key === 'verify' || key === 'fact check' || key === 'verification') {
    const statusRaw = normalizeTemplateKey(pickParam(call, ['status', '1'], 'verified'));
    const isVerified =
      statusRaw === 'verified' ||
      statusRaw === 'passed' ||
      statusRaw === 'ok' ||
      statusRaw === 'checked';
    const reviewer = pickParam(call, ['reviewer', 'by', 'editor']);
    const dateVal = pickParam(call, ['date', 'data']);
    const note = pickParam(
      call,
      ['note', 'text', 'texto', '2'],
      isVerified
        ? 'Claims and citations in this entry have been verified against cited primary sources.'
        : 'This entry is queued for independent fact-checking and source verification.'
    );
    const metaParts = [
      reviewer ? `Reviewer: ${reviewer}` : '',
      dateVal ? `Date: ${dateVal}` : '',
    ].filter(Boolean);
    return serializePredefinicaoBlock({
      variant: isVerified ? 'success' : 'info',
      kicker: 'Template · Verification',
      title: isVerified ? 'Fact-checked & Verified' : 'Pending Verification',
      body: note,
      meta: metaParts.length > 0 ? metaParts.join(' · ') : undefined,
    });
  }

  // 9f. {{Distinguish}} / {{Not to be confused}}
  if (key === 'distinguish' || key === 'not to be confused') {
    const slugRaw = pickParam(call, ['1', 'page', 'slug']);
    const label = pickParam(call, ['2', 'label', 'title']);
    const targetLink = slugRaw
      ? label
        ? `[[${toWikiSlug(slugRaw)}|${label}]]`
        : `[[${toWikiSlug(slugRaw)}]]`
      : '[[start|Home]]';
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Distinguish',
      body: `Not to be confused with ${targetLink}.`,
    });
  }

  // 9g. {{Further}} / {{Further information}} / {{More info}}
  if (key === 'further' || key === 'further information' || key === 'more info') {
    const slugs = call.positional
      .filter(Boolean)
      .map((item) => `[[${toWikiSlug(item)}|${item.trim()}]]`);
    const body =
      slugs.length > 0
        ? `Further information: ${slugs.join(' · ')}`
        : 'Further information: [[start|Home]]';
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Further Information',
      body,
    });
  }

  // 9h. {{Redirect}} / {{Redirect here}}
  if (key === 'redirect' || key === 'redirect here') {
    const term = pickParam(call, ['1', 'term'], options?.currentTitle || 'This title');
    const targetRaw = pickParam(call, ['2', 'target', 'page']);
    const targetLabel = pickParam(call, ['3', 'label']);
    const targetLink = targetRaw
      ? targetLabel
        ? `[[${toWikiSlug(targetRaw)}|${targetLabel}]]`
        : `[[${toWikiSlug(targetRaw)}]]`
      : '[[start|the main article index]]';
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Redirect Notice',
      body: `"${term}" redirects here. For other uses, see ${targetLink}.`,
    });
  }

  // 9i. {{Portal}} / {{Related portal}}
  if (key === 'portal' || key === 'related portal') {
    const portalName = pickParam(call, ['1', 'name', 'topic'], 'Documentation');
    const targetRaw = pickParam(call, ['2', 'slug', 'page']);
    const desc = pickParam(
      call,
      ['description', 'text', '3'],
      `Explore curated guides, dossiers, and references in the ${portalName} portal.`
    );
    const portalLink = targetRaw
      ? `[[${toWikiSlug(targetRaw)}|Open ${portalName} Portal]]`
      : '[[start|Browse Wiki Home]]';
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Template · Portal',
      title: `${portalName} Portal`,
      body: `${desc} — ${portalLink}`,
    });
  }

  // 9j. {{Cite web}} / {{Cite}} / {{Web ref}} / {{Citar web}} / {{Citar site}}
  if (
    key === 'cite web' ||
    key === 'cite' ||
    key === 'web ref' ||
    key === 'citar web' ||
    key === 'citar site'
  ) {
    const title = pickParam(call, ['title', 'título', 'titulo', '1'], 'Referenced Web Source');
    const url = pickParam(call, ['url', '2', 'link']);
    const author = pickParam(call, ['author', 'autor', 'last', 'sobrenome']);
    const publisher = pickParam(call, ['publisher', 'publicado', 'editora', 'work', 'obra', 'website']);
    const dateVal = pickParam(call, ['date', 'data', 'year', 'ano', 'acessodata']);
    const refName = pickParam(call, ['name', 'nome']).replace(/["<>]/g, '').trim();

    const formattedTitle =
      url && (url.startsWith('https://') || url.startsWith('http://'))
        ? `[${title}](${url})`
        : `"${title}"`;
    const segments: string[] = [];
    if (author) segments.push(`${author}.`);
    segments.push(formattedTitle);
    if (publisher) segments.push(`— ${publisher}`);
    if (dateVal) segments.push(`(${dateVal})`);

    const body = segments.join(' ').trim();
    return refName ? `<ref name="${refName}">${body}</ref>` : `<ref>${body}</ref>`;
  }

  // 9k. {{Citar livro}} / {{Cite book}}
  if (key === 'citar livro' || key === 'cite book') {
    const title = pickParam(call, ['título', 'titulo', 'title', '1'], 'Referenced Book');
    const author = pickParam(call, ['autor', 'author', 'sobrenome', 'last']);
    const publisher = pickParam(call, ['editora', 'publisher']);
    const year = pickParam(call, ['ano', 'year', 'data', 'date']);
    const isbn = pickParam(call, ['isbn']);
    const pages = pickParam(call, ['paginas', 'páginas', 'pages', 'p', 'pp']);
    const refName = pickParam(call, ['name', 'nome']).replace(/["<>]/g, '').trim();

    const segments: string[] = [];
    if (author) segments.push(`${author}.`);
    segments.push(`*${title}*`);
    if (publisher) segments.push(`— ${publisher}`);
    if (year) segments.push(`(${year})`);
    if (pages) segments.push(`p. ${pages}`);
    if (isbn) segments.push(`ISBN ${isbn}`);

    const body = segments.join(' ').trim();
    return refName ? `<ref name="${refName}">${body}</ref>` : `<ref>${body}</ref>`;
  }

  // 9l. {{Citar notícia}} / {{Citar jornal}} / {{Cite news}} / {{Cite journal}}
  if (
    key === 'citar noticia' ||
    key === 'citar jornal' ||
    key === 'cite news' ||
    key === 'cite journal'
  ) {
    const title = pickParam(call, ['título', 'titulo', 'title', '1'], 'News Report');
    const url = pickParam(call, ['url', 'link']);
    const author = pickParam(call, ['autor', 'author', 'last']);
    const outlet = pickParam(
      call,
      ['jornal', 'publicacao', 'publicação', 'newspaper', 'journal', 'work', 'publisher']
    );
    const dateVal = pickParam(call, ['data', 'date', 'year', 'ano']);
    const refName = pickParam(call, ['name', 'nome']).replace(/["<>]/g, '').trim();

    const formattedTitle =
      url && (url.startsWith('https://') || url.startsWith('http://'))
        ? `[${title}](${url})`
        : `"${title}"`;
    const segments: string[] = [];
    if (author) segments.push(`${author}.`);
    segments.push(formattedTitle);
    if (outlet) segments.push(`— *${outlet}*`);
    if (dateVal) segments.push(`(${dateVal})`);

    const body = segments.join(' ').trim();
    return refName ? `<ref name="${refName}">${body}</ref>` : `<ref>${body}</ref>`;
  }

  // 9m. {{Reflist}} / {{Referências}} / {{Lista de referências}} / {{Notas}}
  if (
    key === 'reflist' ||
    key === 'referencias' ||
    key === 'lista de referencias' ||
    key === 'notas'
  ) {
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Predefinição · Referências',
      body: 'As citações `<ref>` inseridas neste artigo são numeradas e exibidas automaticamente no painel de **Referências** no rodapé da página.',
    });
  }

  // 9n. {{Sem referências}} / {{Mais notas}} / {{Unreferenced}} / {{Refimprove}} / {{More citations needed}}
  if (
    key === 'sem referencias' ||
    key === 'mais notas' ||
    key === 'unreferenced' ||
    key === 'refimprove' ||
    key === 'more citations needed'
  ) {
    const isEnglish =
      key === 'unreferenced' || key === 'refimprove' || key === 'more citations needed';
    const scope = pickParam(call, ['secao', 'seção', 'section', '1']);
    const dateVal = pickParam(call, ['data', 'date']);
    const title = isEnglish
      ? scope
        ? `Section "${scope}" needs additional citations for verification`
        : 'This article needs additional citations for verification'
      : scope
      ? `A secção "${scope}" carece de fontes fiáveis e independentes`
      : 'Este artigo ou secção não cita fontes confiáveis';
    const body = isEnglish
      ? 'Please help improve this article by adding citations to reliable sources (`{{Cite web}}` or `<ref>...</ref>`). Unsourced material may be challenged and removed.'
      : 'Ajude a melhorar este verbete inserindo referências para fontes verificáveis (`{{Citar web}}` ou `<ref>...</ref>`). Material sem fontes pode ser contestado ou removido.';
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: isEnglish ? 'Template · Unreferenced' : 'Predefinição · Sem referências',
      title,
      body,
      meta: dateVal ? (isEnglish ? `Tagged: ${dateVal}` : `Marcado em: ${dateVal}`) : undefined,
    });
  }

  // 9o. {{Reciclagem}} / {{Wikificação}} / {{Wikificar}} / {{Contextualizar}} / {{Revisão}} / {{Copyedit}}
  if (
    key === 'reciclagem' ||
    key === 'wikificacao' ||
    key === 'wikificar' ||
    key === 'contextualizar' ||
    key === 'revisao' ||
    key === 'copyedit'
  ) {
    const reason = pickParam(
      call,
      ['motivo', 'reason', 'texto', 'text', '1'],
      'Esta página precisa ser reciclada e formatada de acordo com o livro de estilo editorial da wiki.'
    );
    const dateVal = pickParam(call, ['data', 'date']);
    const titleMap: Record<string, string> = {
      contextualizar: 'Este artigo precisa ser contextualizado',
      wikificacao: 'Este artigo precisa de wikificação e formatação',
      wikificar: 'Este artigo precisa de wikificação e formatação',
      revisao: 'Este artigo necessita de revisão gramatical e estrutural',
      copyedit: 'This article may require copy editing for grammar and style',
    };
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Predefinição · Reciclagem & Estilo',
      title: titleMap[key] ?? 'Esta página precisa ser reciclada',
      body: reason,
      meta: dateVal ? `Marcado em: ${dateVal}` : undefined,
    });
  }

  // 9p. {{Parcial}} / {{Imparcialidade}} / {{Controverso}} / {{Ponto de vista}}
  if (
    key === 'parcial' ||
    key === 'imparcialidade' ||
    key === 'controverso' ||
    key === 'ponto de vista'
  ) {
    const reason = pickParam(
      call,
      ['motivo', 'reason', 'texto', 'text', '1'],
      'A neutralidade deste artigo ou secção está contestada. Consulte os argumentos na página de discussão.'
    );
    const section = pickParam(call, ['secao', 'seção', 'section']);
    const dateVal = pickParam(call, ['data', 'date']);
    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: 'Predefinição · Neutralidade em Disputa',
      title: section
        ? `A imparcialidade da secção "${section}" é disputada`
        : 'A imparcialidade deste artigo é disputada',
      body: reason,
      meta: dateVal ? `Marcado em: ${dateVal}` : undefined,
    });
  }

  // 9q. {{Desatualizado}} / {{Desatualizada}} / {{Atualizar}}
  if (key === 'desatualizado' || key === 'desatualizada' || key === 'atualizar') {
    const reason = pickParam(
      call,
      ['motivo', 'reason', 'texto', 'text', '1'],
      'Partes deste artigo podem conter informações desatualizadas que requerem revisão recente.'
    );
    const dateVal = pickParam(call, ['data', 'date']);
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Predefinição · Desatualizado',
      title: 'Este artigo contém informações desatualizadas',
      body: reason,
      meta: dateVal ? `Marcado em: ${dateVal}` : undefined,
    });
  }

  // 9r. {{Fusão}} / {{Fundir}} / {{Merge}} / {{Merge to}} / {{Merge from}}
  if (
    key === 'fusao' ||
    key === 'fundir' ||
    key === 'merge' ||
    key === 'merge to' ||
    key === 'merge from'
  ) {
    const targetRaw = pickParam(call, ['1', 'alvo', 'target', 'artigo', 'page']);
    const targetLabel = pickParam(call, ['2', 'titulo', 'título', 'label']);
    const reason = pickParam(
      call,
      ['motivo', 'reason', 'texto'],
      'Os tópicos possuem forte sobreposição editorial e podem ser consolidados em um único artigo.'
    );
    const targetLink = targetRaw
      ? targetLabel
        ? `[[${toWikiSlug(targetRaw)}|${targetLabel}]]`
        : `[[${toWikiSlug(targetRaw)}]]`
      : '[[start|outro artigo relacionado]]';
    const isEnglish = key === 'merge' || key === 'merge to' || key === 'merge from';
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: isEnglish ? 'Template · Merge Proposal' : 'Predefinição · Proposta de Fusão',
      title: isEnglish ? 'Proposed article merge' : 'Fusão de artigos proposta',
      body: isEnglish
        ? `It has been suggested that this page be merged with ${targetLink}. ${reason}`
        : `Foi proposto que este artigo seja fundido com ${targetLink}. ${reason}`,
    });
  }

  // 9s. {{Tradução}} / {{Em tradução}} / {{Traduzido}} / {{Translated page}} / {{Expand language}}
  if (
    key === 'traducao' ||
    key === 'em traducao' ||
    key === 'traduzido' ||
    key === 'translated page' ||
    key === 'expand language'
  ) {
    const lang = pickParam(call, ['idioma', 'lingua', 'lang', 'language', '1'], 'outro idioma');
    const sourceArticle = pickParam(call, ['artigo', 'article', 'source', '2']);
    const progress = pickParam(call, ['progresso', 'status'], 'Em andamento');
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Predefinição · Tradução',
      title: `Artigo em tradução (${lang})`,
      body: sourceArticle
        ? `Este conteúdo está sendo traduzido ou adaptado a partir do artigo "${sourceArticle}" em ${lang}.`
        : `Este conteúdo está sendo traduzido ou adaptado a partir de uma versão publicada em ${lang}.`,
      meta: `Status: ${progress}`,
    });
  }

  // 9t. {{Evento atual}} / {{Atualidade}} / {{Evento recente}} / {{Current}} / {{Recentismo}}
  if (
    key === 'evento atual' ||
    key === 'atualidade' ||
    key === 'evento recente' ||
    key === 'current' ||
    key === 'recentismo'
  ) {
    const note = pickParam(
      call,
      ['1', 'texto', 'text', 'motivo'],
      'As informações podem mudar rapidamente conforme o acontecimento se desenvolve e novas fontes fiáveis são publicadas.'
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Predefinição · Evento Atual',
      title: 'Este artigo documenta um evento em curso',
      body: note,
    });
  }

  // 9u. {{Artigo futuro}} / {{Evento futuro}} / {{Futuro}} / {{Future}}
  if (
    key === 'artigo futuro' ||
    key === 'evento futuro' ||
    key === 'futuro' ||
    key === 'future'
  ) {
    const note = pickParam(
      call,
      ['1', 'texto', 'text', 'motivo'],
      'Este verbete trata de um projeto, produto ou evento planejado; detalhes divulgados estão sujeitos a alteração.'
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Predefinição · Evento Futuro',
      title: 'Evento ou lançamento futuro',
      body: note,
    });
  }

  // 9v. {{Eliminar}} / {{Eliminação por consenso}} / {{PE}} / {{AfD}} / {{EC}}
  if (
    key === 'eliminar' ||
    key === 'eliminacao por consenso' ||
    key === 'pe' ||
    key === 'afd' ||
    key === 'ec'
  ) {
    const reason = pickParam(
      call,
      ['motivo', 'reason', '1', 'texto'],
      'A relevância enciclopédica e as fontes deste artigo estão em avaliação comunitária para eliminação por consenso.'
    );
    const dateVal = pickParam(call, ['data', 'date']);
    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: 'Predefinição · Eliminação por Consenso',
      title: 'Página proposta para eliminação por consenso',
      body: `${reason} Participe da discussão antes da remoção deste aviso e consulte as [Regras de Uso do WikiMaker](#/terms).`,
      meta: dateVal ? `Proposto em: ${dateVal}` : undefined,
    });
  }

  // 9w. {{Protegida}} / {{Semiprotegida}} / {{Proteção}} / {{Pp-protected}} / {{Protected}}
  if (
    key === 'protegida' ||
    key === 'semiprotegida' ||
    key === 'protecao' ||
    key === 'pp protected' ||
    key === 'protected'
  ) {
    const level = pickParam(
      call,
      ['nivel', 'level', 'tipo', '1'],
      key === 'semiprotegida' ? 'Semiprotegida' : 'Protegida'
    );
    const reason = pickParam(
      call,
      ['motivo', 'reason', 'texto', '2'],
      'A edição desta página encontra-se restrita temporariamente para preservar a integridade editorial do conteúdo.'
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Predefinição · Proteção de Página',
      title: `Página ${level}`,
      body: reason,
    });
  }

  // 9x. {{Múltiplos problemas}} / {{Problemas}} / {{Multiple issues}}
  if (key === 'multiplos problemas' || key === 'problemas' || key === 'multiple issues') {
    const issues = call.positional.filter(Boolean);
    const body =
      issues.length > 0
        ? `Pendências registradas: ${issues.map((item) => `• ${item}`).join(' · ')}`
        : 'Este artigo possui múltiplas pendências de fontes, estilo ou atualização. Colabore editando o verbete.';
    const dateVal = pickParam(call, ['data', 'date']);
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Predefinição · Múltiplos Problemas',
      title: 'Este artigo apresenta múltiplos problemas editoriais',
      body,
      meta: dateVal ? `Marcado em: ${dateVal}` : undefined,
    });
  }

  // 9y. {{Artigo destacado}} / {{Artigo bom}} / {{Destaque}} / {{Featured article}} / {{Good article}}
  if (
    key === 'artigo destacado' ||
    key === 'artigo bom' ||
    key === 'destaque' ||
    key === 'featured article' ||
    key === 'good article'
  ) {
    const defaultLevel =
      key === 'artigo bom' || key === 'good article' ? 'Artigo Bom' : 'Artigo Destacado';
    const level = pickParam(call, ['nivel', 'level', '1'], defaultLevel);
    const dateVal = pickParam(call, ['data', 'date']);
    return serializePredefinicaoBlock({
      variant: 'success',
      kicker: 'Predefinição · Qualidade Editorial',
      title: `Reconhecido como ${level}`,
      body: 'Este verbete segue os critérios de clareza, estrutura enciclopédica, imparcialidade e verificabilidade de fontes.',
      meta: dateVal ? `Reconhecido em: ${dateVal}` : undefined,
    });
  }

  // 9z. {{Carece de esclarecimento}} / {{Esclarecer}} / {{Clarify}} / {{Quem?}} / {{Who?}} / {{Quando?}} / {{When?}} / {{Onde?}}
  if (
    key === 'carece de esclarecimento' ||
    key === 'esclarecer' ||
    key === 'clarify' ||
    key === 'quem' ||
    key === 'quem?' ||
    key === 'who' ||
    key === 'who?' ||
    key === 'quando' ||
    key === 'quando?' ||
    key === 'when' ||
    key === 'when?' ||
    key === 'onde' ||
    key === 'onde?'
  ) {
    const reason = pickParam(call, ['motivo', 'reason', 'texto', '1']);
    const cleanKey = key.replace(/\?$/, '');
    const inlineLabelMap: Record<string, string> = {
      quem: 'quem?',
      who: 'who?',
      quando: 'quando?',
      when: 'when?',
      onde: 'onde?',
      clarify: 'clarification needed',
    };
    if (!isStandaloneLine || !reason) {
      const label = inlineLabelMap[cleanKey] ?? 'carece de esclarecimento';
      return `[[markdown-guide|^[${label}]^]]`;
    }
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Predefinição · Esclarecimento Necessário',
      title: 'Este trecho carece de esclarecimento',
      body: reason,
    });
  }

  // 9aa. {{Sobre}} / {{About}} / {{Outros significados}} / {{For}}
  if (key === 'sobre' || key === 'about' || key === 'outros significados' || key === 'for') {
    const topic = pickParam(call, ['1', 'contexto', 'sobre'], 'outros significados');
    const targetRaw = pickParam(call, ['2', 'pagina', 'slug', 'page']);
    const targetLabel = pickParam(call, ['3', 'titulo', 'título', 'label']);
    const targetLink = targetRaw
      ? targetLabel
        ? `[[${toWikiSlug(targetRaw)}|${targetLabel}]]`
        : `[[${toWikiSlug(targetRaw)}]]`
      : '[[start|Página Inicial]]';
    const isEnglish = key === 'about' || key === 'for';
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: isEnglish ? 'Hatnote · About' : 'Nota de topo · Sobre',
      body: isEnglish
        ? `For ${topic}, see ${targetLink}.`
        : `Para ${topic}, veja ${targetLink}.`,
    });
  }

  // 9ab. {{Não confundir}} / {{Não confundir com}}
  if (key === 'nao confundir' || key === 'nao confundir com') {
    const slugRaw = pickParam(call, ['1', 'pagina', 'slug']);
    const label = pickParam(call, ['2', 'titulo', 'título', 'label']);
    const targetLink = slugRaw
      ? label
        ? `[[${toWikiSlug(slugRaw)}|${label}]]`
        : `[[${toWikiSlug(slugRaw)}]]`
      : '[[start|Página Inicial]]';
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Nota de topo · Não confundir',
      body: `Não confundir com ${targetLink}.`,
    });
  }

  // 9ac. {{Redirecionamento}} / {{Redireciona}} / {{Redireciona aqui}}
  if (key === 'redirecionamento' || key === 'redireciona' || key === 'redireciona aqui') {
    const term = pickParam(call, ['1', 'termo'], options?.currentTitle || 'Este termo');
    const targetRaw = pickParam(call, ['2', 'alvo', 'pagina', 'slug']);
    const targetLabel = pickParam(call, ['3', 'titulo', 'título', 'label']);
    const targetLink = targetRaw
      ? targetLabel
        ? `[[${toWikiSlug(targetRaw)}|${targetLabel}]]`
        : `[[${toWikiSlug(targetRaw)}]]`
      : '[[start|o índice principal de artigos]]';
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Nota de topo · Redirecionamento',
      body: `"${term}" redireciona para este artigo. Para outros significados, veja ${targetLink}.`,
    });
  }

  // 9ad. {{Biografia de pessoa viva}} / {{BPV}} / {{BLP}}
  if (
    key === 'biografia de pessoa viva' ||
    key === 'bpv' ||
    key === 'blp' ||
    key === 'blp sources'
  ) {
    const dateVal = pickParam(call, ['data', 'date']);
    const isEnglish = key === 'blp' || key === 'blp sources';
    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: isEnglish ? 'Template · BLP Policy' : 'Predefinição · Biografia de Pessoa Viva',
      title: isEnglish
        ? 'Biography of a living person — strict sourcing required'
        : 'Biografia de pessoa viva — rigor documental obrigatório',
      body: isEnglish
        ? 'Contentious material about living persons that is unsourced or poorly sourced must be removed immediately.'
        : 'Afirmações controversas sobre pessoas vivas sem fontes independentes e fiáveis devem ser removidas imediatamente.',
      meta: dateVal ? (isEnglish ? `Tagged: ${dateVal}` : `Marcado em: ${dateVal}`) : undefined,
    });
  }

  // 9ae. {{Fontes primárias}} / {{Sem fontes fiáveis}} / {{Primary sources}} / {{Self-published}}
  if (
    key === 'fontes primarias' ||
    key === 'sem fontes fiaveis' ||
    key === 'primary sources' ||
    key === 'self published'
  ) {
    const reason = pickParam(
      call,
      ['motivo', 'reason', '1'],
      'Este artigo depende excessivamente de fontes primárias ou autopublicadas; adicione fontes secundárias independentes.'
    );
    const dateVal = pickParam(call, ['data', 'date']);
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Predefinição · Fontes Primárias',
      title: 'Carece de fontes secundárias independentes',
      body: reason,
      meta: dateVal ? `Marcado em: ${dateVal}` : undefined,
    });
  }

  // 9af. {{Conteúdo suspeito}} / {{VDA}} / {{Copyvio}} / {{Copyright}}
  if (
    key === 'conteudo suspeito' ||
    key === 'vda' ||
    key === 'copyvio' ||
    key === 'copyright' ||
    key === 'violacao de direitos'
  ) {
    const source = pickParam(call, ['fonte', 'source', 'url', '1']);
    const reason = pickParam(
      call,
      ['motivo', 'reason', '2'],
      'Trechos desta página estão sob verificação por possível reprodução sem autorização de obra protegida.'
    );
    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: 'Predefinição · Direitos Autorais (VDA)',
      title: 'Suspeita de violação de direitos autorais',
      body: `${reason}${source ? ` Fonte apontada: ${source}` : ''}`,
    });
  }

  // 9ag. {{Órfão}} / {{Página órfã}} / {{Orphan}} / {{Dead end}}
  if (
    key === 'orfao' ||
    key === 'pagina orfa' ||
    key === 'orphan' ||
    key === 'dead end' ||
    key === 'sem ligacoes'
  ) {
    const dateVal = pickParam(call, ['data', 'date']);
    const isDeadEnd = key === 'dead end' || key === 'sem ligacoes';
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: isDeadEnd ? 'Predefinição · Beco sem Saída' : 'Predefinição · Artigo Órfão',
      title: isDeadEnd ? 'Este artigo possui poucas ligações internas' : 'Este artigo é órfão',
      body: isDeadEnd
        ? 'Adicione ligações internas (`[[slug|Título]]`) conectando este verbete a tópicos relacionados da wiki.'
        : 'Poucos ou nenhum outro artigo apontam para esta página. Ajude criando links em verbetes relacionados.',
      meta: dateVal ? `Marcado em: ${dateVal}` : undefined,
    });
  }

  // 9ah. {{Introdução longa}} / {{Lead too long}} / {{Lead missing}} / {{Sem introdução}}
  if (
    key === 'introducao longa' ||
    key === 'lead too long' ||
    key === 'lead missing' ||
    key === 'sem introducao'
  ) {
    const note = pickParam(
      call,
      ['1', 'motivo', 'texto'],
      'A introdução deve sintetizar os pontos centrais do verbete de forma clara e proporcional antes da primeira secção.'
    );
    const isMissing = key === 'lead missing' || key === 'sem introducao';
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Predefinição · Estrutura Introdutória',
      title: isMissing ? 'Este artigo precisa de uma secção introdutória' : 'A introdução pode ser condensada',
      body: note,
    });
  }

  // 9ai. {{Expandir secção}} / {{Expandir}} / {{Expand section}} / {{Empty section}}
  if (
    key === 'expandir secao' ||
    key === 'expandir seccao' ||
    key === 'expandir' ||
    key === 'expand section' ||
    key === 'empty section' ||
    key === 'secao vazia' ||
    key === 'seccao vazia'
  ) {
    const section = pickParam(call, ['secao', 'seção', 'section', '1']);
    const reason = pickParam(
      call,
      ['motivo', 'reason', 'texto', '2'],
      'Esta secção está vazia ou muito breve. Você pode ajudar expandindo-a com informações verificáveis.'
    );
    return serializePredefinicaoBlock({
      variant: 'stub',
      kicker: 'Predefinição · Expandir Secção',
      title: section ? `A secção "${section}" precisa ser expandida` : 'Esta secção precisa ser expandida',
      body: reason,
    });
  }

  // 9aj. {{Prosa}} / {{Em formato de lista}} / {{Prose}} / {{List to prose}}
  if (
    key === 'prosa' ||
    key === 'em formato de lista' ||
    key === 'prose' ||
    key === 'list to prose'
  ) {
    const section = pickParam(call, ['secao', 'seção', 'section', '1']);
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Predefinição · Formato Enciclopédico',
      title: section ? `Converter "${section}" em prosa contínua` : 'Secção em formato de lista',
      body: 'Este trecho está escrito predominantemente em tópicos; considere convertê-lo em parágrafos de prosa fluida.',
    });
  }

  // 9ak. {{Divisão}} / {{Dividir}} / {{Split}} / {{Split section}}
  if (key === 'divisao' || key === 'dividir' || key === 'split' || key === 'split section') {
    const suggestion = pickParam(call, ['sugestao', 'sugestão', 'alvo', '1']);
    const reason = pickParam(
      call,
      ['motivo', 'reason', '2'],
      'Foi proposto dividir parte deste conteúdo em um novo verbete independente.'
    );
    const linkPart = suggestion ? ` Sugestão de destino: [[${toWikiSlug(suggestion)}]].` : '';
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Predefinição · Proposta de Divisão',
      title: 'Divisão de artigo proposta',
      body: `${reason}${linkPart}`,
    });
  }

  // 9al. {{Publicidade}} / {{Propaganda}} / {{Promocional}} / {{Advert}} / {{Spam}} / {{Peacock}}
  if (
    key === 'publicidade' ||
    key === 'propaganda' ||
    key === 'promocional' ||
    key === 'advert' ||
    key === 'spam' ||
    key === 'peacock'
  ) {
    const reason = pickParam(
      call,
      ['motivo', 'reason', '1'],
      'Este texto parece redigido em tom promocional ou publicitário; reescreva com neutralidade enciclopédica e fontes terceiras.'
    );
    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: 'Predefinição · Tom Promocional',
      title: 'Conteúdo com características publicitárias',
      body: reason,
    });
  }

  // 9am. {{Notoriedade}} / {{Sem relevância}} / {{Relevância}} / {{Notability}}
  if (
    key === 'notoriedade' ||
    key === 'sem relevancia' ||
    key === 'relevancia' ||
    key === 'notability'
  ) {
    const reason = pickParam(
      call,
      ['motivo', 'reason', '1'],
      'O tema deste artigo pode não satisfazer os critérios de notoriedade enciclopédica sem fontes secundárias independentes.'
    );
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Predefinição · Notoriedade',
      title: 'A notoriedade do tema é questionada',
      body: reason,
    });
  }

  // 9an. {{Globalizar}} / {{Lusofonia}} / {{Visão regional}} / {{Globalize}}
  if (
    key === 'globalizar' ||
    key === 'lusofonia' ||
    key === 'visao regional' ||
    key === 'globalize'
  ) {
    const region = pickParam(call, ['regiao', 'região', 'region', '1'], 'uma única região');
    const reason = pickParam(
      call,
      ['motivo', 'reason', '2'],
      `Os exemplos e a abordagem refletem principalmente a realidade de ${region}, não representando uma visão global.`
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Predefinição · Escopo Geográfico',
      title: 'Necessita perspectiva global',
      body: reason,
    });
  }

  // 9ao. {{Ficção}} / {{Enredo}} / {{In-universe}} / {{Plot}}
  if (key === 'ficcao' || key === 'enredo' || key === 'in universe' || key === 'plot') {
    const work = pickParam(call, ['obra', 'work', '1']);
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Predefinição · Perspectiva Ficcional',
      title: work ? `Contexto de mundo real necessário (${work})` : 'Escrito na perspectiva interna da obra',
      body: 'Descreva obras e personagens a partir da perspectiva do mundo real (criação, autores, recepção), e não apenas como fatos internos da ficção.',
    });
  }

  // 9ap. {{Pesquisa inédita}} / {{Original research}} / {{OR}} / {{Síntese}}
  if (
    key === 'pesquisa inedita' ||
    key === 'original research' ||
    key === 'or' ||
    key === 'sintese'
  ) {
    const section = pickParam(call, ['secao', 'seção', 'section', '1']);
    const dateVal = pickParam(call, ['data', 'date']);
    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: 'Predefinição · Pesquisa Inédita',
      title: section
        ? `Possível pesquisa inédita na secção "${section}"`
        : 'Pode conter pesquisa inédita ou síntese não publicada',
      body: 'As análises e conclusões presentes em uma enciclopédia devem estar respaldadas por fontes independentes já publicadas.',
      meta: dateVal ? `Marcado em: ${dateVal}` : undefined,
    });
  }

  // 9aq. {{Curiosidades}} / {{Trivia}}
  if (key === 'curiosidades' || key === 'trivia') {
    const reason = pickParam(
      call,
      ['motivo', 'reason', '1'],
      'Evite seções isoladas de curiosidades; integre informações relevantes às secções principais do artigo.'
    );
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Predefinição · Organização',
      title: 'Secção de curiosidades desencorajada',
      body: reason,
    });
  }

  // 9ar. {{Aviso médico}} / {{Medical}} / {{Aviso legal}} / {{Legal disclaimer}}
  if (
    key === 'aviso medico' ||
    key === 'medical' ||
    key === 'aviso legal' ||
    key === 'legal disclaimer'
  ) {
    const rawKind = normalizeTemplateKey(pickParam(call, ['tipo', 'type', '1'], key));
    const isLegal = rawKind.includes('legal');
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: isLegal ? 'Predefinição · Aviso Legal' : 'Predefinição · Aviso Médico',
      title: isLegal ? 'Conteúdo meramente informativo (não constitui parecer jurídico)' : 'Aviso médico — conteúdo exclusivamente informativo',
      body: isLegal
        ? 'As informações desta página têm caráter educativo/documental e não substituem aconselhamento jurídico profissional.'
        : 'Esta página tem caráter informativo e enciclopédico; nunca substitui diagnóstico ou orientação de profissionais de saúde qualificados.',
    });
  }

  // 9as. {{Humor}} / {{Piada}} / {{Sátira}} / {{Humour}}
  if (key === 'humor' || key === 'piada' || key === 'satira' || key === 'humour') {
    const note = pickParam(
      call,
      ['1', 'texto'],
      'Esta página possui caráter humorístico ou satírico e não constitui diretriz normativa oficial da wiki.'
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Predefinição · Humor Comunitário',
      title: 'Ensaio humorístico',
      body: note,
    });
  }

  // 9at. {{Arquivo}} / {{Talk archive}} / {{Histórico preservado}} / {{Archive}}
  if (
    key === 'arquivo' ||
    key === 'talk archive' ||
    key === 'historico preservado' ||
    key === 'archive'
  ) {
    const period = pickParam(call, ['periodo', 'período', '1'], 'Ciclo anterior');
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Predefinição · Arquivo',
      title: `Arquivo histórico (${period})`,
      body: 'Esta página preserva discussões ou registros históricos encerrados. Evite editar o arquivo; inicie novos tópicos na página atual.',
    });
  }

  // 9au. {{Fim de spoiler}} / {{End spoiler}} / {{Spoiler end}}
  if (key === 'fim de spoiler' || key === 'end spoiler' || key === 'spoiler end') {
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Fim de Spoiler',
      body: 'Fim da secção com revelações de enredo.',
    });
  }

  // 9av. {{Userbox}} / {{Caixa de usuário}} / {{Babel}}
  if (key === 'userbox' || key === 'caixa de usuario' || key === 'babel') {
    const code = pickParam(call, ['sigla', 'codigo', 'código', '1'], 'WIKI');
    const label = pickParam(call, ['titulo', 'título', 'categoria'], 'Perfil de Colaborador');
    const text = pickParam(
      call,
      ['texto', 'text', '2'],
      'Este colaborador participa ativamente da construção da enciclopédia.'
    );
    return serializePredefinicaoBlock({
      variant: 'success',
      kicker: `Userbox · ${code}`,
      title: label,
      body: text,
    });
  }

  // 9aw. {{Navbox}} / {{Caixa de navegação}} / {{Navegação}}
  if (key === 'navbox' || key === 'caixa de navegacao' || key === 'navegacao') {
    const title = pickParam(call, ['titulo', 'título', 'title', 'nome'], 'Artigos relacionados');
    const explicitList = pickParam(call, ['lista', 'itens', 'links', 'conteudo', 'conteúdo']);
    const rawItems =
      call.positional.filter(Boolean).length > 0
        ? call.positional.filter(Boolean)
        : explicitList
          ? explicitList.split(/[•·,|;]+/).map((s) => s.trim()).filter(Boolean)
          : [];
    const items = rawItems.map((item) => `[[${toWikiSlug(item)}|${item.trim()}]]`);
    const body =
      items.length > 0 ? items.join(' · ') : '[[start|Página Inicial]] · [[markdown-guide|Guia de Markdown]]';
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Navbox · Navegação Temática',
      title,
      body,
    });
  }

  // 9ax. {{Artigo em série}} / {{Série}} / {{Part of a series}}
  if (key === 'artigo em serie' || key === 'serie' || key === 'part of a series') {
    const serie = pickParam(call, ['serie', 'série', 'series', 'titulo', 'título', 'title', '1'], 'Série Editorial');
    const idx = pickParam(call, ['indice', 'índice', 'index']);
    const prev = pickParam(call, ['anterior', 'prev']);
    const next = pickParam(call, ['proximo', 'próximo', 'next']);
    const links: string[] = [];
    if (prev) links.push(`← Anterior: [[${toWikiSlug(prev)}]]`);
    if (idx) links.push(`Índice: [[${toWikiSlug(idx)}|${serie}]]`);
    if (next) links.push(`Próximo: [[${toWikiSlug(next)}]] →`);
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Série de Artigos',
      title: `Parte da série: ${serie}`,
      body: links.length > 0 ? links.join(' · ') : '[[start|Explorar índice da wiki]]',
    });
  }

  // 9ay. {{Lista dinâmica}} / {{Dynamic list}} / {{Lista incompleta}}
  if (key === 'lista dinamica' || key === 'dynamic list' || key === 'lista incompleta') {
    const tema = pickParam(call, ['tema', '1'], 'entradas documentadas');
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Predefinição · Lista Dinâmica',
      title: 'Esta é uma lista dinâmica',
      body: `Esta lista de ${tema} pode nunca estar completa; contribua adicionando itens verificáveis e referenciados.`,
    });
  }

  // 9az. {{Documentação}} / {{Documentation}} / {{Doc}}
  if (key === 'documentacao' || key === 'documentation' || key === 'doc') {
    const text = pickParam(
      call,
      ['texto', 'text', '1'],
      'Documentação técnica de parâmetros, aliases e exemplos de uso desta predefinição.'
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Predefinição · Documentação',
      title: 'Documentação da predefinição',
      body: text,
    });
  }

  // 9ba. {{Índice}} / {{Compact TOC}} / {{TOCRight}} / {{TOC}}
  if (key === 'indice' || key === 'compact toc' || key === 'tocright' || key === 'toc') {
    const note = pickParam(
      call,
      ['1', 'texto'],
      'Utilize o índice lateral automático da página para navegar entre todas as secções.'
    );
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Navegação · Índice',
      body: note,
    });
  }

  // 9bb. {{Âncora}} / {{Anchor}}
  if (key === 'ancora' || key === 'anchor') {
    const anchorId = toWikiSlug(pickParam(call, ['1', 'id', 'nome'], 'ancora'));
    return `<span id="${anchorId}"></span>`;
  }

  // 9bc. {{Citar periódico}} / {{Citar revista}} / {{Citar tese}} / {{Cite thesis}}
  if (
    key === 'citar periodico' ||
    key === 'citar revista' ||
    key === 'citar tese' ||
    key === 'cite thesis'
  ) {
    const title = pickParam(call, ['título', 'titulo', 'title', '1'], 'Academic Article');
    const author = pickParam(call, ['autor', 'author', 'last']);
    const journal = pickParam(call, ['revista', 'periodico', 'periódico', 'journal', 'instituicao', 'university']);
    const volume = pickParam(call, ['volume', 'vol']);
    const year = pickParam(call, ['ano', 'year', 'data', 'date']);
    const doi = pickParam(call, ['doi']);
    const refName = pickParam(call, ['name', 'nome']).replace(/["<>]/g, '').trim();

    const segments: string[] = [];
    if (author) segments.push(`${author}.`);
    segments.push(`"${title}"`);
    if (journal) segments.push(`— *${journal}*`);
    if (volume) segments.push(`vol. ${volume}`);
    if (year) segments.push(`(${year})`);
    if (doi) segments.push(`[doi:${doi}](https://doi.org/${encodeURIComponent(doi)})`);

    const body = segments.join(' ').trim();
    return refName ? `<ref name="${refName}">${body}</ref>` : `<ref>${body}</ref>`;
  }

  // 9bd. {{Citar vídeo}} / {{Citar YouTube}} / {{Cite AV media}} / {{Cite video}}
  if (
    key === 'citar video' ||
    key === 'citar youtube' ||
    key === 'cite av media' ||
    key === 'cite video'
  ) {
    const title = pickParam(call, ['título', 'titulo', 'title', '1'], 'Video Reference');
    const author = pickParam(call, ['autor', 'author', 'canal', 'people']);
    const year = pickParam(call, ['ano', 'year', 'data', 'date']);
    const url = pickParam(call, ['url', 'link']);
    const refName = pickParam(call, ['name', 'nome']).replace(/["<>]/g, '').trim();

    const formattedTitle =
      url && (url.startsWith('https://') || url.startsWith('http://'))
        ? `[${title}](${url})`
        : `"${title}"`;
    const segments: string[] = [];
    if (author) segments.push(`${author}.`);
    segments.push(`${formattedTitle} (Vídeo)`);
    if (year) segments.push(`— (${year})`);

    const body = segments.join(' ').trim();
    return refName ? `<ref name="${refName}">${body}</ref>` : `<ref>${body}</ref>`;
  }

  // 9be. {{Citar enciclopédia}} / {{Cite encyclopedia}}
  if (key === 'citar enciclopedia' || key === 'cite encyclopedia') {
    const entry = pickParam(call, ['verbete', 'title', 'título', 'titulo', '1'], 'Verbete');
    const work = pickParam(call, ['obra', 'encyclopedia', 'enciclopedia'], 'Enciclopédia');
    const publisher = pickParam(call, ['editora', 'publisher']);
    const year = pickParam(call, ['ano', 'year']);
    const refName = pickParam(call, ['name', 'nome']).replace(/["<>]/g, '').trim();

    const segments: string[] = [`"${entry}". In: *${work}*`];
    if (publisher) segments.push(`— ${publisher}`);
    if (year) segments.push(`(${year})`);

    const body = segments.join(' ').trim();
    return refName ? `<ref name="${refName}">${body}</ref>` : `<ref>${body}</ref>`;
  }

  // 9bf. {{Citações}} / {{Wikiquote}} / {{Quote box}}
  if (key === 'citacoes' || key === 'wikiquote' || key === 'quote box') {
    const title = pickParam(call, ['titulo', 'título', 'title']);
    const text = pickParam(call, ['texto', 'text', 'quote', 'citacao', 'citação', '1'], 'Conhecimento livre e documentado.');
    const author = pickParam(call, ['autor', 'author', 'source', '2']);
    return serializePredefinicaoBlock({
      variant: 'quote',
      kicker: title || 'Citação em Destaque',
      body: text,
      author: author || undefined,
    });
  }

  // 9bg. {{Tl}} / {{Etiqueta}} / {{Predef}}
  if (key === 'tl' || key === 'etiqueta' || key === 'predef') {
    const name = pickParam(call, ['1', 'nome', 'name'], 'Aviso');
    const extra = call.orderedEntries
      .slice(1)
      .map((entry) => (entry.isNamed ? `${entry.key}=${entry.value}` : entry.value))
      .filter(Boolean)
      .join('|');
    return extra ? `\`{{${name}|${extra}}}\`` : `\`{{${name}}}\``;
  }

  // 9bh. {{Tecla}} / {{Kbd}} / {{Key press}}
  if (key === 'tecla' || key === 'kbd' || key === 'key press') {
    const keys = call.positional.filter(Boolean);
    if (keys.length === 0) return '`Enter`';
    return keys.map((k) => `\`${k.trim()}\``).join(' + ');
  }

  // 9bi. {{Conversão}} / {{Converter}} / {{Convert}}
  if (key === 'conversao' || key === 'converter' || key === 'convert') {
    const rawNum = Number.parseFloat(pickParam(call, ['1'], '0').replace(',', '.'));
    const fromUnit = pickParam(call, ['2'], 'km').trim();
    const toUnit = pickParam(call, ['3']).trim();
    if (!Number.isFinite(rawNum)) {
      return `${pickParam(call, ['1'], '0')} ${fromUnit}`;
    }
    const lower = fromUnit.toLowerCase();
    const fmt = (n: number) =>
      Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
    if (lower === 'km') return `${fmt(rawNum)} km (${fmt(rawNum * 0.621371)} ${toUnit || 'mi'})`;
    if (lower === 'mi') return `${fmt(rawNum)} mi (${fmt(rawNum * 1.60934)} ${toUnit || 'km'})`;
    if (lower === 'm') return `${fmt(rawNum)} m (${fmt(rawNum * 3.28084)} ${toUnit || 'ft'})`;
    if (lower === 'ft') return `${fmt(rawNum)} ft (${fmt(rawNum * 0.3048)} ${toUnit || 'm'})`;
    if (lower === 'kg') return `${fmt(rawNum)} kg (${fmt(rawNum * 2.20462)} ${toUnit || 'lb'})`;
    if (lower === 'lb') return `${fmt(rawNum)} lb (${fmt(rawNum * 0.453592)} ${toUnit || 'kg'})`;
    if (lower === 'c' || lower === '°c') {
      return `${fmt(rawNum)} °C (${fmt((rawNum * 9) / 5 + 32)} ${toUnit || '°F'})`;
    }
    if (lower === 'f' || lower === '°f') {
      return `${fmt(rawNum)} °F (${fmt(((rawNum - 32) * 5) / 9)} ${toUnit || '°C'})`;
    }
    return toUnit ? `${fmt(rawNum)} ${fromUnit} (${toUnit})` : `${fmt(rawNum)} ${fromUnit}`;
  }

  // 9bj. {{Moeda}} / {{BRL}} / {{USD}} / {{EUR}} / {{Currency}}
  if (
    key === 'moeda' ||
    key === 'brl' ||
    key === 'usd' ||
    key === 'eur' ||
    key === 'currency'
  ) {
    const val = pickParam(call, ['1', 'valor', 'amount'], '0');
    const code = (
      pickParam(call, ['2', 'codigo', 'código', 'currency']) ||
      (key === 'brl' || key === 'usd' || key === 'eur' ? key : 'BRL')
    ).toUpperCase();
    const symbolMap: Record<string, string> = {
      BRL: 'R$',
      USD: 'US$',
      EUR: '€',
      GBP: '£',
    };
    const prefix = symbolMap[code] ?? code;
    return `**${prefix} ${val}**`;
  }

  // 9bk. {{Coordenadas}} / {{Coord}} / {{Coordinates}}
  if (key === 'coordenadas' || key === 'coord' || key === 'coordinates') {
    const lat = pickParam(call, ['1', 'lat'], '0');
    const lon = pickParam(call, ['2', 'lon', 'lng'], '0');
    const mapUrl = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lon)}#map=12/${encodeURIComponent(lat)}/${encodeURIComponent(lon)}`;
    return `[📍 ${lat}, ${lon}](${mapUrl})`;
  }

  // 9bl. {{Idade}} / {{Age}} / {{Data de nascimento}} / {{Birth date and age}}
  if (
    key === 'idade' ||
    key === 'age' ||
    key === 'data de nascimento' ||
    key === 'birth date and age'
  ) {
    const y = Number.parseInt(pickParam(call, ['1', 'ano', 'year'], '2000'), 10);
    const m = Number.parseInt(pickParam(call, ['2', 'mes', 'mês', 'month'], '1'), 10);
    const d = Number.parseInt(pickParam(call, ['3', 'dia', 'day'], '1'), 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
      return 'Data inválida';
    }
    const today = new Date();
    let age = today.getFullYear() - y;
    const mDiff = today.getMonth() + 1 - m;
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < d)) {
      age -= 1;
    }
    const dd = String(d).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${dd}/${mm}/${y} (${Math.max(0, age)} anos)`;
  }

  // 9bm. {{Cor}} / {{Color sample}} / {{Swatch}}
  if (key === 'cor' || key === 'color sample' || key === 'swatch') {
    const hex = pickParam(call, ['1', 'hex', 'codigo'], '#2563EB');
    const label = pickParam(call, ['2', 'nome', 'label']);
    return label ? `\`${hex}\` (${label})` : `\`${hex}\``;
  }

  // 9bn. {{ISBN}} / {{DOI}} / {{ISSN}} / {{arXiv}}
  if (key === 'isbn' || key === 'doi' || key === 'issn' || key === 'arxiv') {
    const rawKind = pickParam(call, ['tipo', 'type'], key).toUpperCase();
    const id = pickParam(call, ['1', 'id', 'codigo', 'código'], '');
    if (!id) return `\`${rawKind}\``;
    if (rawKind === 'DOI') {
      return `[doi:${id}](https://doi.org/${encodeURIComponent(id)})`;
    }
    if (rawKind === 'ARXIV') {
      return `[arXiv:${id}](https://arxiv.org/abs/${encodeURIComponent(id)})`;
    }
    return `**${rawKind}** \`${id}\``;
  }

  // 9bo. {{Sim}} / {{Yes}} / {{Não}} / {{No}} / {{Parcialmente}} / {{Maybe}} / {{Check}} / {{Cross}}
  if (
    key === 'sim' ||
    key === 'yes' ||
    key === 'nao' ||
    key === 'no' ||
    key === 'parcialmente' ||
    key === 'maybe' ||
    key === 'check' ||
    key === 'cross'
  ) {
    const customLabel = pickParam(call, ['1', 'texto', 'label']);
    if (key === 'sim' || key === 'yes' || key === 'check') {
      return `✅ ${customLabel || (key === 'yes' ? 'Yes' : 'Sim')}`;
    }
    if (key === 'nao' || key === 'no' || key === 'cross') {
      return `❌ ${customLabel || (key === 'no' ? 'No' : 'Não')}`;
    }
    return `⚠️ ${customLabel || (key === 'maybe' ? 'Partial' : 'Parcial')}`;
  }

  // 10. {{Ecossistema WazzimaGiygg}} / {{WazzimaGiygg}} / {{A Verdade}}
  if (
    key === 'ecossistema wazzimagiygg' ||
    key === 'wazzimagiygg' ||
    key === 'wikipedia dossie' ||
    key === 'a verdade'
  ) {
    return serializePredefinicaoBlock({
      variant: 'ecosystem',
      kicker: 'Template · WazzimaGiygg Ecosystem',
      title: 'Part of the wazzimagiygg.com Project Network',
      body: 'Explore [NotMediaWiki](https://notmediawiki.wazzimagiygg.com/), [WikiWazzimaGiygg](https://wikiwazzimagiygg.wazzimagiygg.com/), [Jornal](https://jornal.wazzimagiygg.com/), [Core](https://core.wazzimagiygg.com/), and the Wikipedia dossier at [wazzimagiygg.com/averdade/](https://wazzimagiygg.com/averdade/).',
      meta: 'Internal dossiers: [[ecossistema-wazzimagiygg|Ecosystem Products]] · [[dossie-wikipedia-abusos|Wikipedia Abuses Dossier]]',
    });
  }

  // 11. {{Info}} / {{Info/...}} / {{Infobox}} / {{Infobox ...}} / {{Ficha}} / {{Taxobox}} / {{Chembox}}
  if (
    key === 'info' ||
    key === 'infobox' ||
    key === 'ficha' ||
    key === 'taxobox' ||
    key === 'taxocaixa' ||
    key === 'chembox' ||
    key.startsWith('info/') ||
    key.startsWith('infobox ') ||
    key.startsWith('infobox/') ||
    key.startsWith('ficha/')
  ) {
    const subType = key.startsWith('info/')
      ? key.slice('info/'.length)
      : key.startsWith('infobox/')
      ? key.slice('infobox/'.length)
      : key.startsWith('infobox ')
      ? key.slice('infobox '.length)
      : key.startsWith('ficha/')
      ? key.slice('ficha/'.length)
      : key === 'taxobox' || key === 'taxocaixa'
      ? 'taxonomia'
      : key === 'chembox'
      ? 'quimica'
      : '';
    const resolveInfoboxTypeToken = (rawToken: string): InfoboxType | null => {
      const rawType = normalizeTemplateKey(rawToken);
      if (!rawType) return null;
      const validTypes = new Set<InfoboxType>([
        'general',
        'user',
        'character',
        'location',
        'item',
        'organization',
        'project',
      ]);
      if (validTypes.has(rawType as InfoboxType)) return rawType as InfoboxType;
      if (
        rawType === 'projeto' ||
        rawType === 'software' ||
        rawType === 'aplicativo' ||
        rawType === 'jogo' ||
        rawType === 'game' ||
        rawType === 'video game' ||
        rawType === 'site' ||
        rawType === 'website' ||
        rawType === 'sistema'
      ) {
        return 'project';
      }
      if (
        rawType === 'organizacao' ||
        rawType === 'empresa' ||
        rawType === 'company' ||
        rawType === 'instituicao' ||
        rawType === 'fundacao' ||
        rawType === 'universidade' ||
        rawType === 'escola' ||
        rawType === 'university'
      ) {
        return 'organization';
      }
      if (
        rawType === 'personagem' ||
        rawType === 'biografia' ||
        rawType === 'pessoa' ||
        rawType === 'person' ||
        rawType === 'artista' ||
        rawType === 'artist' ||
        rawType === 'autor' ||
        rawType === 'escritor'
      ) {
        return 'character';
      }
      if (
        rawType === 'lugar' ||
        rawType === 'local' ||
        rawType === 'pais' ||
        rawType === 'country' ||
        rawType === 'cidade' ||
        rawType === 'settlement' ||
        rawType === 'municipio' ||
        rawType === 'estado' ||
        rawType === 'evento' ||
        rawType === 'acontecimento' ||
        rawType === 'event'
      ) {
        return 'location';
      }
      if (
        rawType === 'livro' ||
        rawType === 'obra' ||
        rawType === 'book' ||
        rawType === 'filme' ||
        rawType === 'serie' ||
        rawType === 'film' ||
        rawType === 'television' ||
        rawType === 'musica' ||
        rawType === 'album' ||
        rawType === 'song' ||
        rawType === 'objeto' ||
        rawType === 'taxonomia' ||
        rawType === 'especie' ||
        rawType === 'quimica' ||
        rawType === 'element'
      ) {
        return 'item';
      }
      if (rawType === 'usuario' || rawType === 'colaborador') {
        return 'user';
      }
      return null;
    };

    const explicitTypeParam = pickParam(call, ['tipo', 'type'], '');
    const resolvedFromSubType = subType ? resolveInfoboxTypeToken(subType) : null;
    const resolvedFromParam = explicitTypeParam ? resolveInfoboxTypeToken(explicitTypeParam) : null;
    const infoboxType: InfoboxType = resolvedFromSubType ?? resolvedFromParam ?? 'general';
    const consumedTypeParamAsMeta = Boolean(!subType && resolvedFromParam);

    const title = pickParam(
      call,
      ['título', 'titulo', 'title', 'nome', 'name'],
      options?.currentTitle || 'Untitled'
    );
    const subtitle = pickParam(call, ['subtítulo', 'subtitulo', 'subtitle']) || undefined;
    const image = pickParam(call, ['imagem', 'image', 'foto']) || undefined;
    const imageCaption = pickParam(call, ['legenda', 'caption', 'imageCaption']) || undefined;
    const rawAlign = normalizeTemplateKey(pickParam(call, ['layout', 'align', 'alinhamento'], 'right'));
    const layout = rawAlign === 'left' || rawAlign === 'full' ? rawAlign : 'right';

    const reserved = new Set([
      ...(consumedTypeParamAsMeta ? ['tipo', 'type'] : []),
      'título',
      'titulo',
      'title',
      'nome',
      'name',
      'subtítulo',
      'subtitulo',
      'subtitle',
      'imagem',
      'image',
      'foto',
      'legenda',
      'caption',
      'imagecaption',
      'layout',
      'align',
      'alinhamento',
    ]);

    const fields: InfoboxField[] = [];
    for (const entry of call.orderedEntries) {
      if (!entry.isNamed) continue;
      if (reserved.has(normalizeTemplateKey(entry.key))) continue;
      if (entry.value) {
        fields.push({ key: entry.key, value: entry.value });
      }
    }

    return serializeInfoboxBlock({
      type: infoboxType,
      title,
      subtitle,
      image,
      imageCaption,
      layout,
      fields,
    });
  }

  return null;
}

/**
 * Finds the matching `}}}` closing index starting at a `{{{` opening index,
 * handling nested `{{...}}` and `{{{...}}}` expressions cleanly.
 */
function findMatchingTripleBraceEnd(text: string, openIdx: number): number {
  let depth = 0;
  let i = openIdx;
  while (i < text.length) {
    if (text[i] === '{' && text[i + 1] === '{' && text[i + 2] === '{') {
      depth += 3;
      i += 3;
      continue;
    }
    if (text[i] === '{' && text[i + 1] === '{') {
      depth += 2;
      i += 2;
      continue;
    }
    if (text[i] === '}' && text[i + 1] === '}' && text[i + 2] === '}' && depth >= 3) {
      depth -= 3;
      i += 3;
      if (depth === 0) return i;
      continue;
    }
    if (text[i] === '}' && text[i + 1] === '}' && depth >= 2) {
      depth -= 2;
      i += 2;
      if (depth === 0) return i;
      continue;
    }
    i += 1;
  }
  return -1;
}

function findTopLevelPipe(segment: string): number {
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;

  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    const next = segment[i + 1];
    if (ch === '{' && next === '{') {
      braceDepth += 1;
      i += 1;
      continue;
    }
    if (ch === '}' && next === '}' && braceDepth > 0) {
      braceDepth -= 1;
      i += 1;
      continue;
    }
    if (ch === '[' && next === '[') {
      bracketDepth += 1;
      i += 1;
      continue;
    }
    if (ch === ']' && next === ']' && bracketDepth > 0) {
      bracketDepth -= 1;
      i += 1;
      continue;
    }
    if (ch === '(') parenDepth += 1;
    else if (ch === ')' && parenDepth > 0) parenDepth -= 1;
    else if (ch === '|' && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
      return i;
    }
  }
  return -1;
}

function substituteTemplatePlaceholders(
  source: string,
  call: ParsedTemplateCall,
  dynamicParams?: Record<string, string>,
  pass = 0
): string {
  if (pass > 4 || !source.includes('{{{')) return source;

  let out = '';
  let cursor = 0;

  while (cursor < source.length) {
    const openIdx = source.indexOf('{{{', cursor);
    if (openIdx === -1) {
      out += source.slice(cursor);
      break;
    }

    const closeIdx = findMatchingTripleBraceEnd(source, openIdx);
    if (closeIdx === -1) {
      out += source.slice(cursor);
      break;
    }

    out += source.slice(cursor, openIdx);
    const inner = source.slice(openIdx + 3, closeIdx - 3);
    const pipeIdx = findTopLevelPipe(inner);
    const rawKey = (pipeIdx === -1 ? inner : inner.slice(0, pipeIdx)).trim();
    const defaultExpr = pipeIdx === -1 ? '' : inner.slice(pipeIdx + 1);
    const norm = normalizeTemplateKey(rawKey);

    let resolved: string | undefined;
    if (rawKey in call.params && call.params[rawKey] !== '') {
      resolved = call.params[rawKey];
    } else if (norm in call.params && call.params[norm] !== '') {
      resolved = call.params[norm];
    } else if (dynamicParams) {
      if (rawKey in dynamicParams && dynamicParams[rawKey] !== '') {
        resolved = dynamicParams[rawKey];
      } else if (norm in dynamicParams && dynamicParams[norm] !== '') {
        resolved = dynamicParams[norm];
      }
    }

    if (resolved !== undefined) {
      out += resolved;
    } else if (defaultExpr) {
      out += substituteTemplatePlaceholders(defaultExpr, call, dynamicParams, pass + 1);
    }

    cursor = closeIdx;
  }

  return out;
}

/**
 * Prepares custom community template page markdown for transclusion:
 * - removes <noinclude>...</noinclude> documentation blocks
 * - unwraps <includeonly>...</includeonly> tags
 * - substitutes MediaWiki parameters {{{param|default}}} and {{{1|default}}}
 */
function instantiateCustomTemplateBody(
  templateContent: string,
  call: ParsedTemplateCall,
  dynamicParams?: Record<string, string>
): string {
  const withoutNoinclude = templateContent
    .replace(/<noinclude>[\s\S]*?<\/noinclude>/gi, '')
    .replace(/<\/?includeonly>/gi, '')
    .trim();

  return substituteTemplatePlaceholders(withoutNoinclude, call, dynamicParams);
}

/**
 * Extracts custom wiki templates stored in Firestore / pages list
 * (pages whose slug starts with `predefinicao-` or `template-`, or whose category/tags declare a template).
 */
export function listCustomWikiTemplates(pages: WikiPage[] = []): WikiPage[] {
  return pages
    .filter(
      (p) =>
        p.slug.startsWith('predefinicao-') ||
        p.slug.startsWith('template-') ||
        p.tags.some((t) => {
          const norm = normalizeTemplateKey(t);
          return norm === 'predefinicao' || norm === 'template';
        })
    )
    .sort((a, b) => a.title.localeCompare(b.title, 'en-US'));
}

function findCustomTemplatePage(
  rawName: string,
  cleanName: string,
  pagesBySlug: Map<string, WikiPage>
): WikiPage | null {
  const cleanSlug = toWikiSlug(cleanName);
  const rawSlug = toWikiSlug(rawName);
  const candidates = [
    `predefinicao-${cleanSlug}`,
    `template-${cleanSlug}`,
    cleanSlug,
    rawSlug,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const page = pagesBySlug.get(candidate);
    if (
      page &&
      (page.slug.startsWith('predefinicao-') ||
        page.slug.startsWith('template-') ||
        page.tags.some((t) => {
          const n = normalizeTemplateKey(t);
          return n === 'predefinicao' || n === 'template';
        }))
    ) {
      return page;
    }
  }
  return null;
}

const MAX_TEMPLATE_DEPTH = 4;

/**
 * Strips `<noinclude>` and `<includeonly>` XML wrappers cleanly when viewing a
 * template page directly so template docs stay readable without raw HTML tags.
 */
export function prepareTemplateSourceForDirectView(markdown: string, slug?: string): string {
  if (!slug || (!slug.startsWith('predefinicao-') && !slug.startsWith('template-'))) {
    return markdown;
  }
  return markdown
    .replace(/<\/?noinclude>/gi, '')
    .replace(/<includeonly>[\s\S]*?<\/includeonly>/gi, '');
}

const FENCE_AND_INFOBOX_SPLIT_REGEX =
  /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`|^:::infobox(?:[ \t]+[a-zA-Z0-9_-]+)?[ \t]*\r?\n[\s\S]*?^:::[ \t]*$|^:::predefinicao(?:[ \t]+[a-zA-Z0-9_-]+)?[ \t]*\r?\n[\s\S]*?^:::[ \t]*$)/gm;

/**
 * Expands MediaWiki-style templates (`{{Aviso|...}}`, `{{Esboço}}`, `{{Info|...}}`,
 * `{{Predefinição:MinhaPredef}}`, etc.) across Markdown text while leaving fenced code
 * blocks and existing block directives intact.
 */
export function resolveWikiTemplates(
  markdown: string,
  pages: WikiPage[] = [],
  options?: TemplateExpansionOptions
): string {
  if (!markdown) return markdown;

  const depth = options?.depth ?? 0;
  const currentSlug = options?.currentSlug;
  const directCleaned =
    depth === 0 ? prepareTemplateSourceForDirectView(markdown, currentSlug) : markdown;

  if (depth >= MAX_TEMPLATE_DEPTH || !directCleaned.includes('{{')) {
    return directCleaned;
  }

  const visitedSlugs = options?.visitedSlugs ?? new Set<string>(currentSlug ? [currentSlug] : []);
  const pagesBySlug = new Map<string, WikiPage>();
  for (const p of pages) {
    pagesBySlug.set(p.slug, p);
  }

  const segments = directCleaned.split(FENCE_AND_INFOBOX_SPLIT_REGEX);

  return segments
    .map((segment, segIdx) => {
      if (!segment || segIdx % 2 === 1) {
        return segment;
      }

      let out = '';
      let cursor = 0;

      while (cursor < segment.length) {
        const openIdx = segment.indexOf('{{', cursor);
        if (openIdx === -1) {
          out += segment.slice(cursor);
          break;
        }

        // Skip parameter placeholders {{{...}}} when evaluating outer text
        if (segment[openIdx + 2] === '{') {
          const closeTriple = findMatchingTripleBraceEnd(segment, openIdx);
          if (closeTriple !== -1) {
            out += segment.slice(cursor, closeTriple);
            cursor = closeTriple;
            continue;
          }
        }

        const closeIdx = findMatchingDoubleBraceEnd(segment, openIdx);
        if (closeIdx === -1) {
          out += segment.slice(cursor);
          break;
        }

        out += segment.slice(cursor, openIdx);
        const fullMatch = segment.slice(openIdx, closeIdx);
        const inner = segment.slice(openIdx + 2, closeIdx - 2);
        const call = parseTemplateCallBody(inner);

        if (!call) {
          out += fullMatch;
          cursor = closeIdx;
          continue;
        }

        // Check whether this template call sits alone on its own line
        const lineStart = segment.lastIndexOf('\n', openIdx - 1) + 1;
        const lineEndRaw = segment.indexOf('\n', closeIdx);
        const lineEnd = lineEndRaw === -1 ? segment.length : lineEndRaw;
        const beforeOnLine = segment.slice(lineStart, openIdx).trim();
        const afterOnLine = segment.slice(closeIdx, lineEnd).trim();
        const isStandaloneLine = beforeOnLine === '' && afterOnLine === '';

        const { explicitNamespace, cleanName } = stripTemplateNamespace(call.rawName);

        // Resolve any nested {{...}} inside parameter values before instantiating
        if (inner.includes('{{')) {
          const resolveArg = (val: string) =>
            val.includes('{{')
              ? resolveWikiTemplates(val, pages, {
                  ...options,
                  depth: depth + 1,
                  visitedSlugs,
                })
              : val;

          for (const key of Object.keys(call.params)) {
            call.params[key] = resolveArg(call.params[key]);
          }
          for (let pi = 0; pi < call.positional.length; pi++) {
            call.positional[pi] = resolveArg(call.positional[pi]);
          }
          for (const entry of call.orderedEntries) {
            entry.value = resolveArg(entry.value);
          }
        }

        // Priority 1: Community-created template page in Firestore (e.g., predefinicao-*)
        const customPage = findCustomTemplatePage(call.rawName, cleanName, pagesBySlug);
        if (customPage && !visitedSlugs.has(customPage.slug)) {
          const nextVisited = new Set(visitedSlugs);
          nextVisited.add(customPage.slug);
          const rawExpanded = instantiateCustomTemplateBody(
            customPage.content,
            call,
            options?.dynamicParams
          );
          out += resolveWikiTemplates(rawExpanded, pages, {
            currentSlug: customPage.slug,
            currentTitle: options?.currentTitle ?? customPage.title,
            dynamicParams: options?.dynamicParams,
            depth: depth + 1,
            visitedSlugs: nextVisited,
          });
          cursor = closeIdx;
          continue;
        }

        // Priority 2: Built-in MediaWiki-compatible Predefinição
        const builtinExpanded = resolveBuiltinTemplate(
          cleanName,
          call,
          isStandaloneLine,
          options
        );
        if (builtinExpanded !== null) {
          out += builtinExpanded;
          cursor = closeIdx;
          continue;
        }

        // Priority 3: Explicit {{Predefinição:Foo}} / {{Template:Foo}} pointing to a missing template page
        if (explicitNamespace) {
          const prefix = explicitNamespace === 'template' ? 'template-' : 'predefinicao-';
          const targetSlug = toWikiSlug(`${prefix}${cleanName}`) || 'predefinicao-nova';
          const displayLabel =
            explicitNamespace === 'template'
              ? `Template:${cleanName}`
              : `Predefinição:${cleanName}`;
          out += `[[${targetSlug}|${displayLabel}]]`;
          cursor = closeIdx;
          continue;
        }

        // Otherwise leave unrecognized double-braces intact
        out += fullMatch;
        cursor = closeIdx;
      }

      return out;
    })
    .join('');
}

export interface SpeedyDeletionTemplateMatch {
  reason: string;
  rule: string;
  proponent: string;
}

/**
 * Scans article markdown (ignoring fenced code blocks, `<noinclude>` blocks, and
 * existing serialized `:::infobox` / `:::predefinicao` blocks) for a
 * `{{Eliminação rápida|...}}` (or alias `{{ER}}`, `{{Speedy delete}}`, `{{DB}}`) call.
 */
export function extractSpeedyDeletionTemplate(markdown: string): SpeedyDeletionTemplateMatch | null {
  if (!markdown || !markdown.includes('{{')) return null;

  const cleaned = markdown.replace(/<noinclude>[\s\S]*?<\/noinclude>/gi, '');
  const segments = cleaned.split(FENCE_AND_INFOBOX_SPLIT_REGEX);

  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const segment = segments[segIdx];
    if (!segment || segIdx % 2 === 1) continue;

    let cursor = 0;
    while (cursor < segment.length) {
      const openIdx = segment.indexOf('{{', cursor);
      if (openIdx === -1) break;

      if (segment[openIdx + 2] === '{') {
        const closeTriple = findMatchingTripleBraceEnd(segment, openIdx);
        if (closeTriple !== -1) {
          cursor = closeTriple;
          continue;
        }
      }

      const closeIdx = findMatchingDoubleBraceEnd(segment, openIdx);
      if (closeIdx === -1) break;

      const inner = segment.slice(openIdx + 2, closeIdx - 2);
      const call = parseTemplateCallBody(inner);
      if (call) {
        const { cleanName } = stripTemplateNamespace(call.rawName);
        const key = normalizeTemplateKey(cleanName);
        if (isSpeedyDeletionKey(key)) {
          return {
            reason: pickParam(call, ['motivo', 'reason', 'justificativa', 'texto', 'text', '1']),
            rule: pickParam(call, ['regra', 'rule', 'criterio', 'critério', '2']),
            proponent: pickParam(call, ['proponente', 'editor', 'usuario', 'usuário', 'by']),
          };
        }
      }

      cursor = closeIdx;
    }
  }

  return null;
}

function findMatchingDoubleBraceEnd(text: string, openIdx: number): number {
  const stack: number[] = [];
  let i = openIdx;
  while (i < text.length) {
    if (text[i] === '{' && text[i + 1] === '{' && text[i + 2] === '{') {
      stack.push(3);
      i += 3;
      continue;
    }
    if (text[i] === '{' && text[i + 1] === '{') {
      stack.push(2);
      i += 2;
      continue;
    }
    const top = stack[stack.length - 1];
    if (top === 3 && text[i] === '}' && text[i + 1] === '}' && text[i + 2] === '}') {
      stack.pop();
      i += 3;
      if (stack.length === 0) return i;
      continue;
    }
    if (top === 2 && text[i] === '}' && text[i + 1] === '}') {
      stack.pop();
      i += 2;
      if (stack.length === 0) return i;
      continue;
    }
    i += 1;
  }
  return -1;
}

export interface StarterTemplateSeed {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  summary: string;
  content: string;
}

export const STARTER_TEMPLATE_SLUG = 'predefinicao-boas-vindas';
export const STARTER_TEMPLATE_TITLE = 'Predefinição:Boas-vindas';
export const STARTER_TEMPLATE_CATEGORY = 'reference';
export const STARTER_TEMPLATE_TAGS = ['predefinicao', 'template', 'mediawiki', 'onboarding'];
export const STARTER_TEMPLATE_SUMMARY =
  'Reusable MediaWiki-style community welcome template with usage rules link and parameter substitution';
export const STARTER_TEMPLATE_CONTENT = `<noinclude>
Esta página define a **Predefinição de Boas-vindas** (\`{{Predefinição:Boas-vindas}}\` ou \`{{Boas-vindas|colaborador=...|tema=...}}\`) com link direto para as [Regras de Uso do WikiMaker](#/terms). O conteúdo dentro de \`<noinclude>\` aparece apenas aqui como documentação, enquanto o bloco fora de \`<noinclude>\` é transcluído nos artigos e páginas de discussão.

## Como usar

\`\`\`markdown
{{Predefinição:Boas-vindas|colaborador=WazzimaGiygg|tema=WazzimaGiygg Maker}}
\`\`\`

## Visualização ao vivo

</noinclude>{{Aviso|tipo=sucesso|título=Boas-vindas, {{{colaborador|Colaborador}}}!|texto=Obrigado por contribuir com {{{tema|WazzimaGiygg Maker}}}. Antes de começar, consulte as [Regras de Uso do WikiMaker](#/terms), leia o [[markdown-guide|Guia de Markdown e Predefinições]] ou explore os [[ecossistema-wazzimagiygg|Produtos do Ecossistema WazzimaGiygg]].|data={{{data|}}}}}`;

export const ENGLISH_COMMUNITY_TEMPLATES: StarterTemplateSeed[] = [
  {
    slug: 'template-welcome',
    title: 'Template:Welcome',
    category: 'reference',
    tags: ['template', 'predefinicao', 'mediawiki', 'onboarding'],
    summary:
      'Reusable English MediaWiki welcome notice template with WikiMaker usage rules link and contributor parameters',
    content: `<noinclude>
Reusable English **MediaWiki-style template** (\`{{Template:Welcome|contributor=...|topic=...}}\`) linking to the [WikiMaker Usage Rules & Terms](#/terms). Content inside \`<noinclude>\` is displayed only as documentation on this template page.

## Usage

\`\`\`markdown
{{Template:Welcome|contributor=Jane Doe|topic=Open Documentation}}
\`\`\`

## Live preview

</noinclude>{{Notice|type=success|title=Welcome, {{{contributor|Collaborator}}}!|text=Thank you for contributing to {{{topic|WazzimaGiygg Maker}}}. Please review the [WikiMaker Usage Rules & Terms](#/terms), check the [[markdown-guide|Markdown & Templates Guide]], or explore [[ecossistema-wazzimagiygg|WazzimaGiygg Ecosystem Products]].}}`,
  },
  {
    slug: 'template-editorial-review',
    title: 'Template:Editorial Review',
    category: 'reference',
    tags: ['template', 'predefinicao', 'editorial', 'verification'],
    summary: 'Reusable English peer-review and source verification banner template',
    content: `<noinclude>
Reusable **English editorial verification template** (\`{{Template:Editorial Review|status=...|reviewer=...|date=...|notes=...}}\`) for dossiers, technical references, and audited articles.

## Usage

\`\`\`markdown
{{Template:Editorial Review|status=verified|reviewer=Editorial Board|date=November 2026|notes=Primary sources and citations checked.}}
\`\`\`

## Live preview

</noinclude>{{Verify|status={{{status|verified}}}|reviewer={{{reviewer|Editorial Board}}}|date={{{date|November 2026}}}|note={{{notes|Primary sources, internal links, and bibliographic references have been verified.}}}}}`,
  },
  {
    slug: 'template-release-notes',
    title: 'Template:Release Notes',
    category: 'reference',
    tags: ['template', 'predefinicao', 'release', 'changelog'],
    summary: 'Reusable English project release summary infobox template',
    content: `<noinclude>
Reusable **English release summary template** (\`{{Template:Release Notes|project=...|version=...|date=...|status=...|highlights=...}}\`) rendering a standardized project release card.

## Usage

\`\`\`markdown
{{Template:Release Notes|project=WazzimaGiygg Core|version=v2.4.0|date=November 2026|status=Stable|highlights=MediaWiki template engine with dynamic parameters.}}
\`\`\`

## Live preview

</noinclude>{{Infobox|type=project|title={{{project|Project Release}}}|subtitle={{{version|v1.0.0}}} · {{{date|November 2026}}}|Status={{{status|Stable}}}|Highlights={{{highlights|See the changelog section for detailed release notes.}}}}}`,
  },
];
