import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

// ترتيب الأولويات من الأعلى إلى الأدنى (رقم أصغر = أهم)
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

// مخزن مهام بسيط يحفظ البيانات في ملف JSON.
// إذا لم يُمرَّر مسار ملف، تبقى البيانات في الذاكرة فقط (مفيد للاختبارات).
export class TaskStore {
  #tasks = new Map();
  #file;

  constructor(file = null) {
    this.#file = file;
  }

  async load() {
    if (!this.#file) return;
    try {
      const raw = await readFile(this.#file, 'utf8');
      for (const task of JSON.parse(raw)) this.#tasks.set(task.id, task);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  async #save() {
    if (!this.#file) return;
    await mkdir(dirname(this.#file), { recursive: true });
    // الكتابة في ملف مؤقت ثم إعادة التسمية لتجنّب تلف الملف عند الانقطاع
    const tmp = `${this.#file}.tmp`;
    await writeFile(tmp, JSON.stringify([...this.#tasks.values()], null, 2));
    await rename(tmp, this.#file);
  }

  list({ status, q, sort } = {}) {
    let tasks = [...this.#tasks.values()];
    if (status === 'done') tasks = tasks.filter((t) => t.done);
    if (status === 'open') tasks = tasks.filter((t) => !t.done);
    if (q) {
      const needle = q.toLowerCase();
      tasks = tasks.filter((t) => t.title.toLowerCase().includes(needle));
    }
    const byCreated = (a, b) => a.createdAt.localeCompare(b.createdAt);
    if (sort === 'priority') {
      // الأعلى أولوية أولًا، وعند التساوي الأقدم إنشاءً أولًا
      return tasks.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byCreated(a, b));
    }
    return tasks.sort(byCreated);
  }

  get(id) {
    return this.#tasks.get(id) ?? null;
  }

  async create({ title, priority = 'medium', dueDate = null }) {
    const now = new Date().toISOString();
    const task = { id: randomUUID(), title, priority, dueDate, done: false, createdAt: now, updatedAt: now };
    this.#tasks.set(task.id, task);
    await this.#save();
    return task;
  }

  async update(id, changes) {
    const task = this.#tasks.get(id);
    if (!task) return null;
    Object.assign(task, changes, { updatedAt: new Date().toISOString() });
    await this.#save();
    return task;
  }

  async remove(id) {
    const existed = this.#tasks.delete(id);
    if (existed) await this.#save();
    return existed;
  }

  stats() {
    const all = [...this.#tasks.values()];
    const done = all.filter((t) => t.done).length;
    return { total: all.length, done, open: all.length - done };
  }
}
