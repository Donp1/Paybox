import { Pool } from 'pg';

if (process.env.NODE_ENV === 'production' || process.env.PAYMENTS_MODE === 'live') {
  throw new Error('Demo seed is disabled in production and live payment mode');
}
if (!process.env.DATABASE_URL) throw new Error('Demo seed requires DATABASE_URL');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  await pool.query(
    'INSERT INTO "BootstrapCheck" (id) VALUES ($1) ON CONFLICT (id) DO NOTHING',
    ['00000000-0000-0000-0000-000000000001'],
  );
  console.log('Demo bootstrap seed applied. Bounty fixtures arrive with Task 03.');
} finally {
  await pool.end();
}
