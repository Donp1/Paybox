import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  { settings: { next: { rootDir: 'apps/web/' } }, rules: { '@next/next/no-html-link-for-pages': 'off' } },
  { ignores: ['**/.next/**', '**/dist/**', '**/node_modules/**'] },
]);
