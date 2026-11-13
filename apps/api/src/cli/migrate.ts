import { AppDataSource, initializeDatabase } from '../config/database.js';

async function runMigrations(): Promise<void> {
  await initializeDatabase();
  const executed = await AppDataSource.runMigrations({ transaction: 'all' });

  if (executed.length === 0) {
    console.log('[i] No pending migrations. Database schema is up to date.');
  } else {
    console.log(`[✔] Applied ${executed.length} migration(s):`);
    for (const migration of executed) {
      console.log(`    - ${migration.name}`);
    }
  }

  await AppDataSource.destroy();
}

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[FATAL] Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
