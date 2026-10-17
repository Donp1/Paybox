import { NextResponse } from 'next/server';
import { parseRuntimeEnv } from '@bountydesk/contracts';

export const runtime = 'nodejs';

export function GET() {
  parseRuntimeEnv('web', process.env);
  return NextResponse.json({ status: 'ok', service: 'web' });
}
