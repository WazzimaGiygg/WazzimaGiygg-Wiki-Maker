import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectChatbotRequest } from './src/lib/chatbotBlocker.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const FRAME_ANCESTORS_CSP =
  "frame-ancestors 'self' https://aistudio.google.com https://*.aistudio.google.com https://ai.studio https://*.ai.studio https://makersuite.google.com";

const BLOCKED_CHATBOT_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow, noai, noimageai" />
    <title>403 Forbidden — Chatbot Access Blocked</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: #fbf9f5;
        color: #1c1917;
        font-family: Georgia, "Times New Roman", serif;
      }
      main {
        max-width: 560px;
        width: 100%;
        background: #ffffff;
        border: 1px solid #e7e5e4;
        border-radius: 12px;
        padding: 32px;
      }
      .kicker {
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #9a3412;
        margin-bottom: 10px;
      }
      h1 {
        margin: 0 0 14px;
        font-size: 28px;
        line-height: 1.2;
      }
      p {
        margin: 0;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: #44403c;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="kicker">HTTP 403 · Anti-Chatbot Shield</div>
      <h1>Chatbot access is prohibited</h1>
      <p>
        This Wiki-site blocks AI chatbots, automated link fetchers, and LLM crawlers from
        opening or retrieving its pages. Please open this URL directly in a standard web browser.
      </p>
    </main>
  </body>
</html>`;

function setBaselineSecurityHeaders(res: Response): void {
  res.setHeader('Content-Security-Policy', FRAME_ANCESTORS_CSP);
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noai, noimageai');
}

function antiChatbotMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Always permit explicit health-check probes and crawler policy files
  if (
    req.path === '/healthz' ||
    req.path === '/api/health' ||
    req.path === '/robots.txt' ||
    req.path === '/ai.txt' ||
    req.path === '/llms.txt'
  ) {
    next();
    return;
  }

  const detection = detectChatbotRequest({
    headers: req.headers,
    url: req.originalUrl,
  });

  if (!detection.blocked) {
    next();
    return;
  }

  res.status(403);
  res.setHeader('X-Chatbot-Access', 'blocked');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noai, noimageai');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Vary', 'User-Agent, Referer, Origin');

  const acceptHeader = String(req.headers.accept || '').toLowerCase();
  if (acceptHeader.includes('text/html') || !acceptHeader) {
    res.type('text/html; charset=utf-8').send(BLOCKED_CHATBOT_HTML);
    return;
  }

  res.json({
    error: 'Chatbot and AI crawler access is prohibited on this Wiki-site.',
    code: 'CHATBOT_ACCESS_BLOCKED',
    reason: detection.reason,
  });
}

async function startServer(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);

  app.use((_req, res, next) => {
    setBaselineSecurityHeaders(res);
    next();
  });

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Block chatbots and AI link fetchers before Vite or static assets serve any wiki content
  app.use(antiChatbotMiddleware);

  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WazzimaGiygg Maker server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
