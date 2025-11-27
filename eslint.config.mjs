import { fileURLToPath } from 'node:url';
import { defineConfig } from 'eslint/config';
import { FlatCompat } from '@eslint/eslintrc';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

const compat = new FlatCompat({
  baseDirectory: fileURLToPath(new URL('./', import.meta.url)),
});

export default defineConfig([
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
  },
  ...compat.config({ extends: ['next/core-web-vitals', 'next/typescript'] }),
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },
  prettierConfig,
]);
