// Deletes the local database. Fresh sample data is created on the next request.
import { rmSync } from 'node:fs';
for (const f of ['themess.db', 'themess.db-wal', 'themess.db-shm', 'themess.db-journal']) rmSync(f, { force: true });
console.log('Database removed. Restart the app and sample data will be created again.');
