import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { TaskStore } from './store.js';

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = process.env.DATA_FILE || fileURLToPath(new URL('../data/tasks.json', import.meta.url));

const store = new TaskStore(DATA_FILE);
await store.load();

const server = createApp(store, { log: true });
server.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على http://localhost:${PORT}`);
  console.log(`📁 البيانات محفوظة في ${DATA_FILE}`);
});

// إيقاف نظيف عند الضغط على Ctrl+C
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log('\n👋 جارٍ إيقاف الخادم...');
    server.close(() => process.exit(0));
  });
}
