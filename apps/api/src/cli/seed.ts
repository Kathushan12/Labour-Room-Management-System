import { AppDataSource, initializeDatabase } from '../config/database.js';
import { seedReferenceData } from '../database/seeds/reference-data.seed.js';

async function runSeed(): Promise<void> {
  await initializeDatabase();
  await seedReferenceData(AppDataSource);
  console.log('[✔] Reference roles and risk flag definitions verified/seeded idempotently.');
  await AppDataSource.destroy();
}

runSeed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[FATAL] Reference seed failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
