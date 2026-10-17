import { afterAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error('TEST_DATABASE_URL is required for real PostgreSQL integration tests');
const pool = new Pool({ connectionString, max: 1 });

describe('PostgreSQL integration smoke', () => {
  afterAll(async () => { await pool.end(); });
  it('can query the real database and reports a supported major', async () => {
    const result = await pool.query<{ server_version_num: string }>('SHOW server_version_num');
    expect(Number(result.rows[0]?.server_version_num)).toBeGreaterThanOrEqual(170000);
  });
});
