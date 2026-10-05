import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { TaskStore } from '../src/store.js';

let server;
let base;

before(async () => {
  server = createApp(new TaskStore()); // تخزين في الذاكرة فقط
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

const request = async (path, method = 'GET', body) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: res.status, data: res.status === 204 ? null : await res.json() };
};

test('health check', async () => {
  const { status, data } = await request('/api/health');
  assert.equal(status, 200);
  assert.equal(data.ok, true);
});

test('full task lifecycle: create → read → update → delete', async () => {
  const created = await request('/api/tasks', 'POST', { title: '  تعلم Node.js  ', priority: 'high' });
  assert.equal(created.status, 201);
  assert.equal(created.data.title, 'تعلم Node.js');
  assert.equal(created.data.done, false);

  const { id } = created.data;
  assert.equal((await request(`/api/tasks/${id}`)).data.priority, 'high');

  const updated = await request(`/api/tasks/${id}`, 'PATCH', { done: true });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.done, true);

  assert.equal((await request(`/api/tasks/${id}`, 'DELETE')).status, 204);
  assert.equal((await request(`/api/tasks/${id}`)).status, 404);
});

test('filtering, search and stats', async () => {
  const a = await request('/api/tasks', 'POST', { title: 'شراء حليب' });
  await request('/api/tasks', 'POST', { title: 'كتابة تقرير' });
  await request(`/api/tasks/${a.data.id}`, 'PATCH', { done: true });

  assert.deepEqual((await request('/api/tasks?status=done')).data.map((t) => t.title), ['شراء حليب']);
  assert.deepEqual((await request('/api/tasks?status=open')).data.map((t) => t.title), ['كتابة تقرير']);
  assert.deepEqual((await request('/api/tasks?q=تقرير')).data.map((t) => t.title), ['كتابة تقرير']);
  assert.deepEqual((await request('/api/stats')).data, { total: 2, done: 1, open: 1 });
});

test('validation errors', async () => {
  assert.equal((await request('/api/tasks', 'POST', {})).status, 400);
  assert.equal((await request('/api/tasks', 'POST', { title: 'x', priority: 'urgent' })).status, 400);
  assert.equal((await request('/api/tasks', 'POST', '{bad json')).status, 400);
  const { data } = await request('/api/tasks', 'POST', { title: 'y' });
  assert.equal((await request(`/api/tasks/${data.id}`, 'PATCH', { done: 'yes' })).status, 400);
  assert.equal((await request(`/api/tasks/${data.id}`, 'PATCH', {})).status, 400);
});

test('unknown routes and methods', async () => {
  assert.equal((await request('/api/nope')).status, 404);
  assert.equal((await request('/api/tasks', 'PUT', {})).status, 405);
});

test('serves the web UI', async () => {
  const res = await fetch(base + '/');
  assert.equal(res.status, 200);
  assert.match(await res.text(), /مهامي/);
});
