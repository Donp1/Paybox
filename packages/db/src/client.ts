import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { loadWorkspaceEnv } from '../../contracts/src/env.ts';
import { PrismaClient } from '../generated/client.ts';

loadWorkspaceEnv();

const globals = globalThis as typeof globalThis & {
  bountydeskPool?: Pool;
  bountydeskPrisma?: PrismaClient;
};

const pool = globals.bountydeskPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
const adapter = new PrismaPg(pool);

export const prisma = globals.bountydeskPrisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globals.bountydeskPool = pool;
  globals.bountydeskPrisma = prisma;
}
