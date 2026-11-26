export type ChatbotBlockReason =
  | 'user-agent'
  | 'header'
  | 'referrer'
  | 'automation'
  | 'query-source';

export interface ChatbotDetectionInput {
  userAgent?: string | null;
  referer?: string | null;
  origin?: string | null;
  url?: string | null;
  headers?: Record<string, string | string[] | undefined>;
}

export interface ChatbotDetectionResult {
  blocked: boolean;
  reason: ChatbotBlockReason | null;
  matchedRule: string | null;
  detail: string | null;
}

export interface ChatbotSignatureRule {
  id: string;
  label: string;
  provider: string;
  pattern: RegExp;
}

/**
 * Platform infrastructure health-check user-agents that must never be blocked.
 */
const PLATFORM_HEALTH_PROBE_PATTERN =
  /^(?:GoogleHC|kube-probe|CloudRun|GoogleStackdriverMonitoring|UptimeChecks?)\b/i;

/**
 * Legitimate AI Studio hosting iframe origins that must never be treated as chatbot referrers.
 */
const ALLOWED_PREVIEW_HOSTS = [
  'aistudio.google.com',
  'ai.studio',
  'makersuite.google.com',
];

/**
 * Comprehensive signature rules for AI chatbots, AI assistants, AI link fetchers,
 * LLM training crawlers, and automated headless scraper engines.
 */
export const CHATBOT_USER_AGENT_RULES: ChatbotSignatureRule[] = [
  { id: 'chatgpt-user', label: 'ChatGPT-User', provider: 'OpenAI', pattern: /ChatGPT-User/i },
  { id: 'oai-searchbot', label: 'OAI-SearchBot', provider: 'OpenAI', pattern: /OAI-SearchBot/i },
  { id: 'gptbot', label: 'GPTBot', provider: 'OpenAI', pattern: /\bGPTBot\b/i },
  { id: 'searchgpt', label: 'SearchGPT', provider: 'OpenAI', pattern: /SearchGPT/i },
  { id: 'openai-crawler', label: 'OpenAI Agent', provider: 'OpenAI', pattern: /\bOpenAI(?:-|\b)/i },
  { id: 'chatgpt-operator', label: 'ChatGPT Operator', provider: 'OpenAI', pattern: /ChatGPT-Operator|OpenAI-Operator/i },
  { id: 'claudebot', label: 'ClaudeBot', provider: 'Anthropic', pattern: /ClaudeBot/i },
  { id: 'claude-user', label: 'Claude-User', provider: 'Anthropic', pattern: /Claude-User/i },
  { id: 'claude-web', label: 'Claude-Web', provider: 'Anthropic', pattern: /Claude-Web/i },
  { id: 'claude-ua', label: 'Claude Agent', provider: 'Anthropic', pattern: /\bClaude\/\d/i },
  { id: 'anthropic-ai', label: 'anthropic-ai', provider: 'Anthropic', pattern: /anthropic-ai/i },
  { id: 'perplexitybot', label: 'PerplexityBot', provider: 'Perplexity', pattern: /PerplexityBot/i },
  { id: 'perplexity-user', label: 'Perplexity-User', provider: 'Perplexity', pattern: /Perplexity-User/i },
  { id: 'perplexity-ua', label: 'Perplexity Agent', provider: 'Perplexity', pattern: /\bPerplexity\b/i },
  { id: 'google-extended', label: 'Google-Extended', provider: 'Google AI', pattern: /Google-Extended/i },
  { id: 'google-notebooklm', label: 'Google-NotebookLM', provider: 'Google AI', pattern: /Google-NotebookLM|NotebookLM/i },
  { id: 'google-cloudvertex', label: 'Google-CloudVertexBot', provider: 'Google AI', pattern: /Google-CloudVertexBot|VertexAI/i },
  { id: 'gemini-research', label: 'Gemini Deep Research', provider: 'Google AI', pattern: /Gemini-Deep-Research|Gemini-User|GeminiBot/i },
  { id: 'meta-externalagent', label: 'Meta-ExternalAgent', provider: 'Meta AI', pattern: /Meta-ExternalAgent/i },
  { id: 'meta-externalfetcher', label: 'Meta-ExternalFetcher', provider: 'Meta AI', pattern: /Meta-ExternalFetcher/i },
  { id: 'facebookbot', label: 'FacebookBot', provider: 'Meta AI', pattern: /\bFacebookBot\b/i },
  { id: 'applebot-extended', label: 'Applebot-Extended', provider: 'Apple Intelligence', pattern: /Applebot-Extended/i },
  { id: 'bytespider', label: 'Bytespider', provider: 'ByteDance / Doubao', pattern: /Bytespider/i },
  { id: 'bytedance-bot', label: 'ByteDance AI', provider: 'ByteDance', pattern: /ByteDance/i },
  { id: 'xai-grok', label: 'Grok / xAI Bot', provider: 'xAI', pattern: /\bxAI-Bot\b|\bGrokBot\b|\bGrok\/\d/i },
  { id: 'deepseek-bot', label: 'DeepSeekBot', provider: 'DeepSeek', pattern: /DeepSeekBot|\bDeepSeek\b/i },
  { id: 'mistral-user', label: 'MistralAI-User', provider: 'Mistral AI', pattern: /MistralAI-User|MistralBot/i },
  { id: 'cohere-ai', label: 'cohere-ai', provider: 'Cohere', pattern: /cohere-ai|cohere-training-data-crawler|CohereBot/i },
  { id: 'duckassist', label: 'DuckAssistBot', provider: 'DuckDuckGo AI', pattern: /DuckAssistBot/i },
  { id: 'youbot', label: 'YouBot', provider: 'You.com', pattern: /\bYouBot\b/i },
  { id: 'phindbot', label: 'PhindBot', provider: 'Phind', pattern: /PhindBot/i },
  { id: 'poebot', label: 'PoeBot', provider: 'Quora Poe', pattern: /PoeBot/i },
  { id: 'characterai', label: 'CharacterAI', provider: 'Character.AI', pattern: /CharacterAI/i },
  { id: 'manus-user', label: 'Manus-User', provider: 'Manus AI', pattern: /Manus-User|ManusBot/i },
  { id: 'kimi-moonshot', label: 'Kimi / Moonshot', provider: 'Moonshot AI', pattern: /KimiBot|MoonshotBot/i },
  { id: 'qwen-bot', label: 'Qwen AI', provider: 'Alibaba Qwen', pattern: /QwenBot|DashScope/i },
  { id: 'ernie-bot', label: 'ErnieBot', provider: 'Baidu AI', pattern: /ErnieBot/i },
  { id: 'huggingface', label: 'HuggingChat / HF', provider: 'Hugging Face', pattern: /HuggingChat|HuggingFace-Bot/i },
  { id: 'ccbot', label: 'CCBot', provider: 'Common Crawl', pattern: /\bCCBot\b/i },
  { id: 'amazonbot', label: 'Amazonbot', provider: 'Amazon', pattern: /Amazonbot/i },
  { id: 'diffbot', label: 'Diffbot', provider: 'Diffbot', pattern: /Diffbot/i },
  { id: 'imagesift', label: 'ImagesiftBot', provider: 'Hive AI', pattern: /ImagesiftBot/i },
  { id: 'omgili', label: 'Omgilibot', provider: 'Webz.io', pattern: /Omgilibot|\bOmgili\b/i },
  { id: 'webzio-extended', label: 'Webzio-Extended', provider: 'Webz.io', pattern: /Webzio-Extended/i },
  { id: 'ai2bot', label: 'AI2Bot', provider: 'Allen Institute', pattern: /AI2Bot|Ai2Bot-Dolma/i },
  { id: 'timpibot', label: 'Timpibot', provider: 'Timpi', pattern: /Timpibot/i },
  { id: 'kangaroo-bot', label: 'Kangaroo Bot', provider: 'Kangaroo', pattern: /Kangaroo Bot/i },
  { id: 'iaskspider', label: 'iAskSpider', provider: 'iAsk AI', pattern: /iaskspider/i },
  { id: 'iss-cyber', label: 'ISSCyberRiskCrawler', provider: 'ISS Crawler', pattern: /ISSCyberRiskCrawler/i },
  { id: 'langchain', label: 'LangChain', provider: 'AI Framework', pattern: /LangChain/i },
  { id: 'llamaindex', label: 'LlamaIndex', provider: 'AI Framework', pattern: /LlamaIndex/i },
  { id: 'firecrawl', label: 'Firecrawl', provider: 'AI Scraper', pattern: /Firecrawl/i },
  { id: 'jina-reader', label: 'Jina Reader', provider: 'Jina AI', pattern: /Jina(?:Reader|Bot|-ai)/i },
  { id: 'crawl4ai', label: 'Crawl4AI', provider: 'AI Scraper', pattern: /Crawl4AI/i },
  { id: 'apify', label: 'Apify Bot', provider: 'Scraper', pattern: /ApifyBot/i },
  { id: 'scrapy', label: 'Scrapy', provider: 'Scraper', pattern: /\bScrapy\b/i },
  { id: 'headless-chrome', label: 'HeadlessChrome', provider: 'Automated Browser', pattern: /HeadlessChrome/i },
  { id: 'playwright', label: 'Playwright', provider: 'Automated Browser', pattern: /\bPlaywright\b/i },
  { id: 'puppeteer', label: 'Puppeteer', provider: 'Automated Browser', pattern: /\bPuppeteer\b/i },
  { id: 'phantomjs', label: 'PhantomJS', provider: 'Automated Browser', pattern: /PhantomJS/i },
  { id: 'selenium', label: 'Selenium / WebDriver', provider: 'Automated Browser', pattern: /\bSelenium\b|\bWebDriver\b/i },
  { id: 'browserless', label: 'Browserless', provider: 'Automated Browser', pattern: /Browserless/i },
  { id: 'python-fetcher', label: 'Python HTTP Fetcher', provider: 'Automated Fetcher', pattern: /python-requests|python-urllib|aiohttp|httpx\//i },
  { id: 'node-fetcher', label: 'Node HTTP Fetcher', provider: 'Automated Fetcher', pattern: /\b(?:node-fetch|undici|got\/|axios\/)/i },
  { id: 'cli-fetcher', label: 'CLI HTTP Fetcher', provider: 'Automated Fetcher', pattern: /^(?:curl|Wget)\//i },
];

export const CHATBOT_REFERRER_DOMAINS: string[] = [
  'chatgpt.com',
  'chat.openai.com',
  'platform.openai.com',
  'claude.ai',
  'console.anthropic.com',
  'perplexity.ai',
  'gemini.google.com',
  'bard.google.com',
  'notebooklm.google.com',
  'copilot.microsoft.com',
  'grok.com',
  'x.ai',
  'poe.com',
  'you.com',
  'character.ai',
  'deepseek.com',
  'chat.deepseek.com',
  'meta.ai',
  'chat.mistral.ai',
  'phind.com',
  'kimi.moonshot.cn',
  'chat.qwen.ai',
  'qwen.ai',
  'pi.ai',
  'manus.im',
  'r.jina.ai',
];

function isHostMatch(hostname: string, targetDomain: string): boolean {
  const cleanHost = hostname.toLowerCase();
  const cleanTarget = targetDomain.toLowerCase();
  return cleanHost === cleanTarget || cleanHost.endsWith(`.${cleanTarget}`);
}

function extractHostname(rawUrl: string): string | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function getHeaderValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  targetName: string
): string {
  if (!headers) return '';
  const lower = targetName.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower && value !== undefined) {
      return Array.isArray(value) ? value.join(', ') : value;
    }
  }
  return '';
}

function hasChatbotHeaderPrefix(
  headers: Record<string, string | string[] | undefined> | undefined
): string | null {
  if (!headers) return null;
  const blockedPrefixes = ['x-openai-', 'x-anthropic-', 'x-perplexity-', 'x-ai-crawler', 'x-chatbot-'];
  for (const key of Object.keys(headers)) {
    const lowerKey = key.toLowerCase();
    if (blockedPrefixes.some((prefix) => lowerKey.startsWith(prefix))) {
      return key;
    }
  }
  return null;
}

function matchChatbotReferrer(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const hostname = extractHostname(rawUrl);
  if (!hostname) return null;
  if (ALLOWED_PREVIEW_HOSTS.some((allowed) => isHostMatch(hostname, allowed))) {
    return null;
  }
  for (const domain of CHATBOT_REFERRER_DOMAINS) {
    if (isHostMatch(hostname, domain)) {
      return domain;
    }
  }
  return null;
}

function matchChatbotQuerySource(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl, 'https://wikimaker.wazzimagiygg.com');
    const sourceParams = ['utm_source', 'ref', 'source', 'referrer'];
    for (const param of sourceParams) {
      const value = (parsed.searchParams.get(param) || '').trim().toLowerCase();
      if (!value) continue;
      for (const domain of CHATBOT_REFERRER_DOMAINS) {
        if (value === domain || value.includes(domain)) {
          return `${param}=${domain}`;
        }
      }
      if (
        value === 'chatgpt' ||
        value === 'openai' ||
        value === 'claude' ||
        value === 'perplexity' ||
        value === 'grok' ||
        value === 'deepseek' ||
        value === 'copilot'
      ) {
        return `${param}=${value}`;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function detectChatbotRequest(input: ChatbotDetectionInput): ChatbotDetectionResult {
  const ua = (input.userAgent || getHeaderValue(input.headers, 'user-agent') || '').trim();

  if (ua && PLATFORM_HEALTH_PROBE_PATTERN.test(ua)) {
    return { blocked: false, reason: null, matchedRule: null, detail: null };
  }

  if (ua) {
    for (const rule of CHATBOT_USER_AGENT_RULES) {
      if (rule.pattern.test(ua)) {
        return {
          blocked: true,
          reason: 'user-agent',
          matchedRule: rule.id,
          detail: `${rule.label} (${rule.provider})`,
        };
      }
    }
  }

  const secChUa = getHeaderValue(input.headers, 'sec-ch-ua');
  if (secChUa && /HeadlessChrome/i.test(secChUa)) {
    return {
      blocked: true,
      reason: 'header',
      matchedRule: 'sec-ch-ua-headless',
      detail: 'HeadlessChrome client hint',
    };
  }

  const fromHeader = getHeaderValue(input.headers, 'from');
  if (
    fromHeader &&
    /(openai|anthropic|perplexity|gptbot|claudebot|deepseek|mistral|cohere|bytespider|ccbot)/i.test(
      fromHeader
    )
  ) {
    return {
      blocked: true,
      reason: 'header',
      matchedRule: 'from-ai-crawler',
      detail: 'AI crawler contact header',
    };
  }

  const aiHeader = hasChatbotHeaderPrefix(input.headers);
  if (aiHeader) {
    return {
      blocked: true,
      reason: 'header',
      matchedRule: 'ai-vendor-header',
      detail: `AI vendor header (${aiHeader})`,
    };
  }

  const referer = input.referer || getHeaderValue(input.headers, 'referer');
  const origin = input.origin || getHeaderValue(input.headers, 'origin');
  const matchedReferer = matchChatbotReferrer(referer) || matchChatbotReferrer(origin);
  if (matchedReferer) {
    return {
      blocked: true,
      reason: 'referrer',
      matchedRule: `referrer:${matchedReferer}`,
      detail: `Chatbot origin (${matchedReferer})`,
    };
  }

  const matchedQuery = matchChatbotQuerySource(input.url);
  if (matchedQuery) {
    return {
      blocked: true,
      reason: 'query-source',
      matchedRule: `query:${matchedQuery}`,
      detail: `Chatbot referral parameter (${matchedQuery})`,
    };
  }

  return { blocked: false, reason: null, matchedRule: null, detail: null };
}

export function evaluateChatbotClientContext(): ChatbotDetectionResult {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { blocked: false, reason: null, matchedRule: null, detail: null };
  }

  // Check if synchronous <head> early blocker already flagged the session
  const earlyWindow = window as unknown as {
    __WAZZIMA_CHATBOT_BLOCKED__?: ChatbotDetectionResult;
    __nightmare?: unknown;
    _phantom?: unknown;
    callPhantom?: unknown;
    __playwright?: unknown;
    __puppeteer?: unknown;
    domAutomation?: unknown;
    domAutomationController?: unknown;
  };

  if (earlyWindow.__WAZZIMA_CHATBOT_BLOCKED__?.blocked) {
    return earlyWindow.__WAZZIMA_CHATBOT_BLOCKED__;
  }

  const uaResult = detectChatbotRequest({
    userAgent: navigator.userAgent,
    referer: document.referrer,
    url: window.location.href,
  });
  if (uaResult.blocked) {
    return uaResult;
  }

  if (navigator.webdriver === true) {
    return {
      blocked: true,
      reason: 'automation',
      matchedRule: 'navigator-webdriver',
      detail: 'Automated WebDriver session',
    };
  }

  if (
    earlyWindow.__nightmare ||
    earlyWindow._phantom ||
    earlyWindow.callPhantom ||
    earlyWindow.__playwright ||
    earlyWindow.__puppeteer ||
    earlyWindow.domAutomation ||
    earlyWindow.domAutomationController
  ) {
    return {
      blocked: true,
      reason: 'automation',
      matchedRule: 'headless-runtime-hook',
      detail: 'Headless browser automation runtime',
    };
  }

  const ancestorOrigins = window.location.ancestorOrigins;
  if (ancestorOrigins && ancestorOrigins.length > 0) {
    for (let i = 0; i < ancestorOrigins.length; i += 1) {
      const matchedAncestor = matchChatbotReferrer(ancestorOrigins[i]);
      if (matchedAncestor) {
        return {
          blocked: true,
          reason: 'referrer',
          matchedRule: `ancestor:${matchedAncestor}`,
          detail: `Embedded inside chatbot host (${matchedAncestor})`,
        };
      }
    }
  }

  return { blocked: false, reason: null, matchedRule: null, detail: null };
}

/**
 * Generates file contents for an installable Manifest V3 Browser Extension
 * ("WazzimaGiygg Anti-Chatbot Shield") that prevents chatbot web apps and browser
 * AI panels from opening or referencing links to this Wiki-site.
 */
export function buildBrowserExtensionBundleFiles(siteOrigin: string): Record<string, string> {
  let cleanOrigin = 'https://wikimaker.wazzimagiygg.com';
  let cleanHost = 'wikimaker.wazzimagiygg.com';
  try {
    const parsed = new URL(siteOrigin || cleanOrigin);
    cleanOrigin = parsed.origin;
    cleanHost = parsed.hostname;
  } catch {
    // Keep canonical fallback
  }

  const protectedDomains = Array.from(
    new Set([cleanHost, 'wikimaker.wazzimagiygg.com', 'wazzimagiygg.com'])
  );

  const manifest = {
    manifest_version: 3,
    name: 'WazzimaGiygg Anti-Chatbot Shield',
    version: '1.0.0',
    description:
      'Blocks AI chatbots and web-browsing assistants from opening, linking, or prefetching WazzimaGiygg Maker Wiki-site URLs.',
    permissions: ['declarativeNetRequest'],
    host_permissions: [
      'https://chatgpt.com/*',
      'https://chat.openai.com/*',
      'https://claude.ai/*',
      'https://perplexity.ai/*',
      'https://*.perplexity.ai/*',
      'https://gemini.google.com/*',
      'https://copilot.microsoft.com/*',
      'https://grok.com/*',
      'https://x.ai/*',
      'https://poe.com/*',
      'https://you.com/*',
      'https://character.ai/*',
      'https://deepseek.com/*',
      'https://chat.deepseek.com/*',
      'https://meta.ai/*',
      'https://chat.mistral.ai/*',
      ...protectedDomains.map((h) => `https://${h}/*`),
    ],
    declarative_net_request: {
      rule_resources: [
        {
          id: 'chatbot_shield_rules',
          enabled: true,
          path: 'rules.json',
        },
      ],
    },
    content_scripts: [
      {
        matches: [
          'https://chatgpt.com/*',
          'https://chat.openai.com/*',
          'https://claude.ai/*',
          'https://perplexity.ai/*',
          'https://*.perplexity.ai/*',
          'https://gemini.google.com/*',
          'https://copilot.microsoft.com/*',
          'https://grok.com/*',
          'https://x.ai/*',
          'https://poe.com/*',
          'https://you.com/*',
          'https://character.ai/*',
          'https://deepseek.com/*',
          'https://chat.deepseek.com/*',
          'https://meta.ai/*',
          'https://chat.mistral.ai/*',
        ],
        js: ['content.js'],
        run_at: 'document_start',
      },
    ],
  };

  const rules = protectedDomains.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: `||${domain}`,
      initiatorDomains: CHATBOT_REFERRER_DOMAINS,
      resourceTypes: [
        'main_frame',
        'sub_frame',
        'xmlhttprequest',
        'script',
        'image',
        'other',
      ],
    },
  }));

  const contentScript = `(() => {
  const PROTECTED_HOSTS = ${JSON.stringify(protectedDomains)};
  const isProtectedUrl = (rawUrl) => {
    try {
      const parsed = new URL(rawUrl, window.location.href);
      return PROTECTED_HOSTS.some(
        (host) => parsed.hostname === host || parsed.hostname.endsWith('.' + host)
      );
    } catch {
      return PROTECTED_HOSTS.some((host) => String(rawUrl || '').includes(host));
    }
  };

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!target) return;
      const href = target.getAttribute('href') || '';
      if (isProtectedUrl(href)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        target.setAttribute('aria-disabled', 'true');
        target.title = 'Blocked by WazzimaGiygg Anti-Chatbot Shield';
      }
    },
    true
  );

  const originalWindowOpen = window.open;
  window.open = function (url, ...rest) {
    if (typeof url === 'string' && isProtectedUrl(url)) {
      return null;
    }
    return originalWindowOpen.call(this, url, ...rest);
  };
})();
`;

  const readme = `WazzimaGiygg Anti-Chatbot Shield (Browser Extension)
====================================================

What this package protects:
- Protected Origin: ${cleanOrigin}
- Protected Domains: ${protectedDomains.join(', ')}

How it works:
1. Browser-level declarativeNetRequest rules block requests initiated from major AI
   chatbot interfaces (ChatGPT, Claude, Perplexity, Gemini, Copilot, Grok, Poe,
   DeepSeek, Meta AI, Mistral, You.com, Character.AI) from opening or fetching links
   to this Wiki-site.
2. Content script neutralizes direct link clicks and window.open() calls targeting the
   Wiki-site inside chatbot web UIs.
3. Paired with the Wiki-site's server-side HTTP 403 shield, robots.txt disallow rules,
   and runtime anti-automation guard, server-side chatbot fetchers are also blocked.

How to install in Chrome / Edge / Brave:
1. Unzip this archive to a local folder.
2. Open chrome://extensions (or edge://extensions).
3. Enable "Developer mode" in the top-right corner.
4. Click "Load unpacked" and select the unzipped folder.
`;

  return {
    'manifest.json': JSON.stringify(manifest, null, 2),
    'rules.json': JSON.stringify(rules, null, 2),
    'content.js': contentScript,
    'README.txt': readme,
  };
}
