/**
 * Ephemeral static server on 127.0.0.1.
 *
 * `file://` is deliberately not supported: its null origin breaks axe's frame
 * injection (axe-core #3002), ES modules and `fetch`, and Windows path→URL
 * conversion is its own bug source. Serving over HTTP costs ~20 lines and no
 * dependencies, and behaves like the real thing.
 */

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, join, sep } from 'node:path';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

const contentTypeFor = (path) => CONTENT_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream';

/**
 * Wrap an HTML fragment in a minimal valid document.
 *
 * `lang` and `<title>` are supplied so that auditing a fragment does not
 * report the wrapper's own missing-lang and missing-title failures as if they
 * were the agent's. A fragment that already looks like a full document is
 * passed through untouched, so `--html` can also take a whole page.
 */
export function wrapFragment(fragment) {
  const text = String(fragment ?? '');
  if (/<html[\s>]/i.test(text) || /^\s*<!doctype/i.test(text)) {
    return /^\s*<!doctype/i.test(text) ? text : `<!doctype html>\n${text}`;
  }
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>a11y-loop fragment audit</title>',
    '</head>',
    '<body>',
    text,
    '</body>',
    '</html>',
  ].join('\n');
}

/**
 * Serve a single in-memory HTML document.
 * @param {string} html
 * @returns {Promise<{url:string, close:() => Promise<void>}>}
 */
export async function serveHtml(html) {
  const body = Buffer.from(html, 'utf8');
  const server = createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'content-length': body.length,
      });
      res.end(body);
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  });
  const port = await listen(server);
  return {
    url: `http://127.0.0.1:${port}/`,
    close: () => closeServer(server),
  };
}

/**
 * Serve a file's own directory as the document root, so relative stylesheets,
 * scripts and images resolve the way they would in a dev server.
 *
 * @param {string} filePath
 * @returns {Promise<{url:string, close:() => Promise<void>}>}
 */
export async function serveFile(filePath) {
  const absolute = resolve(filePath);
  const info = await stat(absolute).catch(() => null);
  if (!info) throw new Error(`File not found: ${absolute}`);
  if (info.isDirectory()) return serveDirectory(absolute, 'index.html');

  const root = absolute.slice(0, absolute.lastIndexOf(sep));
  const entry = absolute.slice(absolute.lastIndexOf(sep) + 1);
  return serveDirectory(root, entry);
}

/**
 * @param {string} root
 * @param {string} entry file within `root` served at `/`
 */
export async function serveDirectory(root, entry = 'index.html') {
  const server = createServer(async (req, res) => {
    try {
      const requested = decodeURIComponent((req.url ?? '/').split('?')[0]);
      const relative = requested === '/' ? entry : requested.replace(/^\/+/, '');
      const target = resolve(join(root, relative));

      // Never serve outside the document root.
      if (target !== resolve(root) && !target.startsWith(resolve(root) + sep)) {
        res.writeHead(403, { 'content-type': 'text/plain' });
        res.end('Forbidden');
        return;
      }

      const info = await stat(target).catch(() => null);
      if (!info || info.isDirectory()) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('Not found');
        return;
      }

      res.writeHead(200, { 'content-type': contentTypeFor(target), 'content-length': info.size });
      createReadStream(target).pipe(res);
    } catch {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('Server error');
    }
  });
  const port = await listen(server);
  return {
    url: `http://127.0.0.1:${port}/`,
    close: () => closeServer(server),
  };
}

/**
 * Resolve the target of an audit into a URL plus a teardown function.
 *
 * @param {{type:'url'|'file'|'html', value:string}} target
 * @returns {Promise<{url:string, close:() => Promise<void>}>}
 */
export async function resolveTarget(target) {
  if (target.type === 'url') {
    return { url: target.value, close: async () => {} };
  }
  if (target.type === 'file') {
    return serveFile(target.value);
  }
  if (target.type === 'html') {
    return serveHtml(wrapFragment(target.value));
  }
  throw new Error(`Unknown target type: ${target.type}`);
}

/** Read a fragment or document from disk, for `--html @file` style use. */
export async function readHtmlFile(path) {
  return readFile(resolve(path), 'utf8');
}

/** Listen on an OS-assigned port and resolve with it. */
function listen(server) {
  return new Promise((resolvePort, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolvePort(typeof address === 'object' && address ? address.port : 0);
    });
  });
}

function closeServer(server) {
  return new Promise((done) => {
    server.closeAllConnections?.();
    server.close(() => done());
  });
}
