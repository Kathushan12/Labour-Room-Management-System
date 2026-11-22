import { AppDataSource, initializeDatabase } from '../config/database.js';
import { seedDemoData } from '../database/seeds/demo-data.seed.js';

async function runSeed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo seed must not run in production.');
  }

  await initializeDatabase();
  const result = await seedDemoData();
  await AppDataSource.destroy();

  console.log('\nDemo staff logins (passwords are shown only when the account is created):\n');
  for (const c of result.credentials) {
    const password = c.password ?? '(account already exists, password unchanged)';
    console.log(`  ${c.role.padEnd(12)} ${c.username.padEnd(16)} ${password}   ${c.fullName}`);
  }
  console.log(`\nActive demo admissions: ${result.admissionReferenceIds.join(', ')}`);
}

runSeed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[FATAL] Demo seed failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
