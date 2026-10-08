import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: ['.next/**', 'out/**', 'node_modules/**', 'shots/**', 'public/sw.js', 'test-results/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];

export default config;
