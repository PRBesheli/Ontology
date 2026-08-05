/**
 * Static server for the Tonbak PWA.
 *
 * Deliberately dependency-free — the app is static files, and a PWA only
 * really needs three things from its host: correct MIME types (a service
 * worker served as text/plain will not register), HTTPS, and cache headers
 * that let the app update without stranding people on an old shell.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

const ROOT = __dirname;
const PORT = process.env.PORT || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * The service worker and the entry HTML must never be served stale, or a
 * deployed fix can sit behind a cached shell indefinitely. Hashed-by-name
 * assets could be cached hard, but nothing here is content-hashed yet, so
 * everything else gets a short revalidating TTL.
 */
function cacheControl(pathname) {
  if (pathname === '/sw.js' || pathname === '/index.html' || pathname === '/') {
    return 'no-cache';
  }
  if (pathname.startsWith('/icons/')) return 'public, max-age=604800';
  return 'public, max-age=0, must-revalidate';
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';

    // Resolve inside ROOT only — no traversal out of the served directory.
    const filePath = path.join(ROOT, path.normalize(pathname));
    if (!filePath.startsWith(ROOT + path.sep) && filePath !== path.join(ROOT, 'index.html')) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    let info;
    try {
      info = await stat(filePath);
    } catch {
      // Unknown paths fall back to the app shell so a deep link still boots.
      const shell = await readFile(path.join(ROOT, 'index.html'));
      res.writeHead(200, {
        'Content-Type': TYPES['.html'],
        'Cache-Control': 'no-cache',
      });
      res.end(shell);
      return;
    }

    if (info.isDirectory()) {
      res.writeHead(301, { Location: pathname.replace(/\/?$/, '/') + 'index.html' }).end();
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const body = await readFile(filePath);
    const etag = `W/"${info.size}-${Number(info.mtimeMs).toString(36)}"`;

    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304).end();
      return;
    }

    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': cacheControl(pathname),
      ETag: etag,
      // Service workers are scoped by path; this lets sw.js control the root.
      'Service-Worker-Allowed': '/',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (err) {
    console.error(err);
    res.writeHead(500).end('Internal error');
  }
});

server.listen(PORT, () => {
  console.log(`Tonbak serving on http://0.0.0.0:${PORT}`);
});
