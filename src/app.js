import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTask } from './validate.js';

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
const MAX_BODY = 1_000_000;
const SORTS = ['created', 'priority'];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(res, status, data) {
  const body = data === undefined ? '' : JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, 'جسم الطلب كبير جدًا');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null');
  } catch {
    throw new HttpError(400, 'JSON غير صالح');
  }
}

async function serveStatic(res, pathname) {
  const rel = normalize(pathname === '/' ? 'index.html' : pathname.slice(1));
  if (rel.startsWith('..')) throw new HttpError(403, 'ممنوع');
  try {
    const content = await readFile(join(PUBLIC_DIR, rel));
    res.writeHead(200, { 'Content-Type': MIME[extname(rel)] ?? 'application/octet-stream' });
    res.end(content);
  } catch {
    throw new HttpError(404, 'غير موجود');
  }
}

// يبني موجّه الطلبات: كل مسار عبارة عن [method, regex, handler]
function buildRoutes(store) {
  return [
    ['GET', /^\/api\/health$/, () => [200, { ok: true, uptime: process.uptime() }]],
    ['GET', /^\/api\/stats$/, () => [200, store.stats()]],
    ['GET', /^\/api\/tasks$/, (_req, _params, url) => {
      const sort = url.searchParams.get('sort');
      if (sort && !SORTS.includes(sort)) {
        throw new HttpError(400, `الترتيب (sort) يجب أن يكون إحدى: ${SORTS.join(', ')}`);
      }
      return [200, store.list({ status: url.searchParams.get('status'), q: url.searchParams.get('q'), sort })];
    }],
    ['POST', /^\/api\/tasks$/, async (req) => {
      const { value, error } = validateTask(await readJson(req));
      if (error) throw new HttpError(400, error);
      return [201, await store.create(value)];
    }],
    ['GET', /^\/api\/tasks\/([\w-]+)$/, (_req, [id]) => {
      const task = store.get(id);
      if (!task) throw new HttpError(404, 'المهمة غير موجودة');
      return [200, task];
    }],
    ['PATCH', /^\/api\/tasks\/([\w-]+)$/, async (req, [id]) => {
      const { value, error } = validateTask(await readJson(req), { partial: true });
      if (error) throw new HttpError(400, error);
      const task = await store.update(id, value);
      if (!task) throw new HttpError(404, 'المهمة غير موجودة');
      return [200, task];
    }],
    ['DELETE', /^\/api\/tasks\/([\w-]+)$/, async (_req, [id]) => {
      if (!(await store.remove(id))) throw new HttpError(404, 'المهمة غير موجودة');
      return [204];
    }],
  ];
}

export function createApp(store, { log = false } = {}) {
  const routes = buildRoutes(store);

  return createServer(async (req, res) => {
    const started = Date.now();
    const url = new URL(req.url, 'http://localhost');
    try {
      if (!url.pathname.startsWith('/api/')) {
        if (req.method !== 'GET') throw new HttpError(405, 'طريقة غير مسموحة');
        return await serveStatic(res, url.pathname);
      }
      let pathMatched = false;
      for (const [method, pattern, handler] of routes) {
        const match = url.pathname.match(pattern);
        if (!match) continue;
        pathMatched = true;
        if (method !== req.method) continue;
        const [status, data] = await handler(req, match.slice(1), url);
        return sendJson(res, status, data);
      }
      throw pathMatched ? new HttpError(405, 'طريقة غير مسموحة') : new HttpError(404, 'المسار غير موجود');
    } catch (err) {
      const status = err.status ?? 500;
      if (status === 500) console.error(err);
      sendJson(res, status, { error: status === 500 ? 'خطأ داخلي في الخادم' : err.message });
    } finally {
      if (log) console.log(`${req.method} ${url.pathname} → ${res.statusCode} (${Date.now() - started}ms)`);
    }
  });
}
