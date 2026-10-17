import type { NextConfig } from 'next';
import { loadWorkspaceEnv, parseRuntimeEnv } from '../../packages/contracts/src/env';

loadWorkspaceEnv();
parseRuntimeEnv('web', process.env);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@bountydesk/contracts', '@bountydesk/db'],
};

export default nextConfig;
