# 📝 مهامي — تطبيق إدارة مهام بـ Node.js

مشروع تجريبي صغير ومتكامل مبني بـ **Node.js فقط بدون أي مكتبات خارجية** (لا Express ولا غيره)، يضم:

- **REST API** كامل لإدارة المهام (إنشاء، عرض، تعديل، حذف، بحث، تصفية، إحصائيات)
- **واجهة ويب** عربية (RTL) تدعم الوضع الداكن
- **حفظ البيانات** في ملف JSON مع كتابة آمنة (ملف مؤقت ثم إعادة تسمية)
- **اختبارات تلقائية** باستخدام `node:test` المدمج

## التشغيل

```bash
npm start          # تشغيل الخادم على http://localhost:3000
npm run dev        # تشغيل مع إعادة التحميل التلقائي عند تعديل الملفات
npm test           # تشغيل الاختبارات
```

يتطلب Node.js 20 أو أحدث. يمكن تغيير المنفذ ومكان الحفظ:

```bash
PORT=8080 DATA_FILE=./my-tasks.json npm start
```

## واجهة API

| الطريقة | المسار | الوصف |
|---|---|---|
| `GET` | `/api/health` | فحص حالة الخادم |
| `GET` | `/api/stats` | عدد المهام الكلي / المنجزة / المتبقية |
| `GET` | `/api/tasks?status=open\|done&q=نص` | عرض المهام مع تصفية وبحث اختياريين |
| `POST` | `/api/tasks` | إنشاء مهمة `{ "title": "...", "priority": "low\|medium\|high", "dueDate": "YYYY-MM-DD" }` |
| `GET` | `/api/tasks/:id` | عرض مهمة واحدة |
| `PATCH` | `/api/tasks/:id` | تعديل `title` أو `priority` أو `dueDate` أو `done` |
| `DELETE` | `/api/tasks/:id` | حذف مهمة |

### أمثلة بـ curl

```bash
curl -X POST localhost:3000/api/tasks -H 'Content-Type: application/json' \
  -d '{"title":"تعلم Node.js","priority":"high"}'

curl localhost:3000/api/tasks?status=open

curl -X PATCH localhost:3000/api/tasks/<id> -H 'Content-Type: application/json' -d '{"done":true}'
```

## هيكل المشروع

```
src/
  server.js    نقطة البداية: تحميل البيانات وتشغيل الخادم
  app.js       الموجّه (router) ومعالجة الطلبات والملفات الثابتة
  store.js     مخزن المهام وحفظها في JSON
  validate.js  التحقق من صحة المدخلات
public/
  index.html   واجهة المستخدم
test/
  api.test.js  اختبارات الـ API
```
