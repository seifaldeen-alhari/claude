export const PRIORITIES = ['low', 'medium', 'high'];

// يتحقق من جسم الطلب ويعيد { value } أو { error }
export function validateTask(body, { partial = false } = {}) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { error: 'يجب أن يكون جسم الطلب كائن JSON' };
  }
  const value = {};

  if ('title' in body || !partial) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return { error: 'العنوان (title) مطلوب ويجب أن يكون نصًا غير فارغ' };
    }
    if (body.title.length > 200) return { error: 'العنوان طويل جدًا (الحد 200 حرف)' };
    value.title = body.title.trim();
  }

  if ('priority' in body) {
    if (!PRIORITIES.includes(body.priority)) {
      return { error: `الأولوية يجب أن تكون إحدى: ${PRIORITIES.join(', ')}` };
    }
    value.priority = body.priority;
  }

  if ('dueDate' in body) {
    if (body.dueDate !== null && !isValidDate(body.dueDate)) {
      return { error: 'تاريخ الاستحقاق (dueDate) يجب أن يكون بصيغة YYYY-MM-DD أو null' };
    }
    value.dueDate = body.dueDate;
  }

  if ('done' in body) {
    if (typeof body.done !== 'boolean') return { error: 'الحقل done يجب أن يكون true أو false' };
    value.done = body.done;
  }

  if (partial && Object.keys(value).length === 0) {
    return { error: 'لا توجد حقول صالحة للتحديث' };
  }
  return { value };
}

// يقبل فقط تواريخ حقيقية بصيغة YYYY-MM-DD (يرفض مثلًا 2026-02-30)
function isValidDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const date = new Date(`${str}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(str);
}
