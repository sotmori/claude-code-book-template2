import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

const storageApis = ['localStorage', 'sessionStorage', 'indexedDB', 'caches'];

export default defineConfig([
  globalIgnores(['dist', 'vendor', 'tests', 'public', '**/*.cjs', 'vite.config.ts', 'tailwind.config.js', 'postcss.config.js', 'eslint.config.js']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    rules: {
      'no-restricted-properties': ['error', ...['window', 'globalThis', 'self'].flatMap(object => storageApis.map(property => ({ object, property, message: 'Use the app storage helpers.' })))],
      'no-restricted-globals': ['error',
        { name: 'localStorage', message: 'Use scopedStorage for business data; credentials use getToken().' },
        { name: 'sessionStorage', message: 'Use the session/runtime helpers.' },
        { name: 'indexedDB', message: 'Open IndexedDB only in a reviewed storage module, with scopedStorage.key(name) database names.' },
        { name: 'caches', message: 'Open CacheStorage only in a reviewed storage module, with scopedStorage.key(name) cache names.' },
      ],
    },
  },
  {
    files: ['src/auth/app-session.ts', 'src/auth/app-runtime.ts', 'src/auth/scoped-storage.ts', 'src/auth/dev-auth*.ts*'],
    rules: { 'no-restricted-globals': 'off', 'no-restricted-properties': 'off' },
  },
]);
