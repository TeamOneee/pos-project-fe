import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import pluginPrettier from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '.vscode', '*.config.*', '*.cjs', '*.html', '*.json'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh, prettier: pluginPrettier },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'prettier/prettier': 'error',
    },
  }
);
