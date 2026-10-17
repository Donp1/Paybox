import { defineConfig, env } from 'prisma/config';
import { loadWorkspaceEnv } from '../contracts/src/env.ts';

loadWorkspaceEnv();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL') },
});
