import { createServer } from 'node:http';
import { Pool } from 'pg';
import { loadWorkspaceEnv, parseRuntimeEnv } from '@bountydesk/contracts';

loadWorkspaceEnv();
const env = parseRuntimeEnv('worker', process.env);
const pool = new Pool({ connectionString: env.DATABASE_URL, max: 2 });
const port = Number(process.env.WORKER_HEALTH_PORT ?? '3101');

const server = createServer(async (request, response) => {
  if (request.url !== '/health') {
    response.writeHead(404).end();
    return;
  }
  try {
    await pool.query('SELECT 1');
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok', service: 'worker' }));
  } catch {
    response.writeHead(503, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ status: 'unready', service: 'worker' }));
  }
});

server.listen(port, () => console.log(JSON.stringify({ event: 'worker_health_listening', port })));

async function shutdown(): Promise<void> {
  server.close();
  await pool.end();
}
process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());
