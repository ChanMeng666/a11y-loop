import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { wrapFragment, serveHtml, serveFile, resolveTarget } from '../../src/lib/serve.js';

const tempDirs = [];
async function tempDir() {
  const dir = await mkdtemp(join(tmpdir(), 'a11y-loop-serve-'));
  tempDirs.push(dir);
  return dir;
}
after(async () => {
  for (const dir of tempDirs) await rm(dir, { recursive: true, force: true });
});

describe('wrapFragment', () => {
  test('wraps a fragment in a minimal document with lang and title', () => {
    const doc = wrapFragment('<button>Hi</button>');
    assert.match(doc, /^<!doctype html>/);
    assert.match(doc, /<html lang="en">/);
    assert.match(doc, /<title>/);
    assert.match(doc, /<meta charset="utf-8">/);
    assert.ok(doc.includes('<button>Hi</button>'));
  });

  test('does not double-wrap a full document', () => {
    const full = '<!doctype html><html lang="fr"><head><title>t</title></head><body>x</body></html>';
    assert.equal(wrapFragment(full), full);
    assert.equal((wrapFragment(full).match(/<html/g) ?? []).length, 1);
  });

  test('adds a doctype to a document that has html but no doctype', () => {
    const doc = wrapFragment('<html lang="en"><body>x</body></html>');
    assert.match(doc, /^<!doctype html>/);
    assert.equal((doc.match(/<html/g) ?? []).length, 1);
    assert.equal(doc.includes('lang="en"'), true);
  });

  test('handles empty and nullish input', () => {
    assert.match(wrapFragment(''), /<html lang="en">/);
    assert.match(wrapFragment(undefined), /<html lang="en">/);
  });
});

describe('serveHtml', () => {
  test('serves the document on 127.0.0.1 over http, never file://', async () => {
    const server = await serveHtml('<!doctype html><title>ok</title><p>hello</p>');
    try {
      assert.match(server.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
      const response = await fetch(server.url);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /text\/html/);
      assert.match(await response.text(), /hello/);
    } finally {
      await server.close();
    }
  });

  test('picks a free port each time', async () => {
    const a = await serveHtml('<p>a</p>');
    const b = await serveHtml('<p>b</p>');
    try {
      assert.notEqual(a.url, b.url);
    } finally {
      await a.close();
      await b.close();
    }
  });

  test('404s anything other than the document', async () => {
    const server = await serveHtml('<p>a</p>');
    try {
      const response = await fetch(`${server.url}missing.css`);
      assert.equal(response.status, 404);
    } finally {
      await server.close();
    }
  });

  test('close() releases the port', async () => {
    const server = await serveHtml('<p>a</p>');
    const { url } = server;
    await server.close();
    await assert.rejects(() => fetch(url));
  });
});

describe('serveFile', () => {
  test('serves the file at / and its siblings by relative path', async () => {
    const dir = await tempDir();
    await writeFile(join(dir, 'page.html'), '<!doctype html><link rel="stylesheet" href="s.css">');
    await writeFile(join(dir, 's.css'), 'body{color:#000}');

    const server = await serveFile(join(dir, 'page.html'));
    try {
      const page = await fetch(server.url);
      assert.equal(page.status, 200);
      assert.match(await page.text(), /stylesheet/);

      const css = await fetch(`${server.url}s.css`);
      assert.equal(css.status, 200);
      assert.match(css.headers.get('content-type'), /text\/css/);
      assert.match(await css.text(), /color:#000/);
    } finally {
      await server.close();
    }
  });

  test('refuses to serve outside the document root', async () => {
    const dir = await tempDir();
    await writeFile(join(dir, 'page.html'), '<p>x</p>');
    await writeFile(join(dir, '..', 'a11y-loop-secret.txt'), 'secret');

    const server = await serveFile(join(dir, 'page.html'));
    try {
      const response = await fetch(`${server.url}../a11y-loop-secret.txt`);
      assert.ok([403, 404].includes(response.status), `got ${response.status}`);
      if (response.status !== 404) {
        assert.equal((await response.text()).includes('secret'), false);
      }
    } finally {
      await server.close();
      await rm(join(dir, '..', 'a11y-loop-secret.txt'), { force: true });
    }
  });

  test('rejects a missing file with a clear message', async () => {
    const dir = await tempDir();
    await assert.rejects(() => serveFile(join(dir, 'nope.html')), /File not found/);
  });
});

describe('resolveTarget', () => {
  test('passes a url through without starting a server', async () => {
    const resolved = await resolveTarget({ type: 'url', value: 'https://example.test/page' });
    assert.equal(resolved.url, 'https://example.test/page');
    await resolved.close();
  });

  test('serves an html fragment', async () => {
    const resolved = await resolveTarget({ type: 'html', value: '<button>x</button>' });
    try {
      assert.match(resolved.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
      assert.match(await (await fetch(resolved.url)).text(), /<button>x<\/button>/);
    } finally {
      await resolved.close();
    }
  });

  test('serves a file', async () => {
    const dir = await tempDir();
    await writeFile(join(dir, 'p.html'), '<!doctype html><p>from disk</p>');
    const resolved = await resolveTarget({ type: 'file', value: join(dir, 'p.html') });
    try {
      assert.match(await (await fetch(resolved.url)).text(), /from disk/);
    } finally {
      await resolved.close();
    }
  });

  test('rejects an unknown target type', async () => {
    await assert.rejects(() => resolveTarget({ type: 'ftp', value: 'x' }), /Unknown target type/);
  });
});
