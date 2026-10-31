import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

/**
 * FrankenLab — lint configuration.
 *
 * Deliberately small. The rules that matter here are the ones that protect
 * the scientific claims: no floating promises, no accidental `any`, and no
 * unused code hiding in the kernel.
 */
const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'next-env.d.ts'],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  {
    // The kernel and the engines are plain TypeScript with no React, and the
    // diagnostics scripts are meant to print. The Kiro hook scripts also print
    // by contract: their stdout is the agent's context.
    files: [
      'src/kernel/**/*.ts',
      'src/engines/**/*.ts',
      'src/interactions/**/*.ts',
      'scripts/**/*.ts',
      'scripts/**/*.mjs',
    ],
    rules: {
      'no-console': 'off',
    },
  },
];

export default config;
