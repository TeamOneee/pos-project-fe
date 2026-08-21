import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import pluginPrettier from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

/**
 * Keeps the XSS surface at zero as the app grows: React escapes what it renders,
 * so an injection has to reach past it — innerHTML, a `javascript:` URL, eval.
 * The receipt print frame is the one exemption. See docs/security.md.
 */
const noHtmlSinks = [
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message:
      'dangerouslySetInnerHTML is an XSS sink. Render the value as a JSX child — React escapes it — or build the markup with safeHtml from @/lib/html.',
  },
  {
    selector: 'AssignmentExpression[left.property.name=/^(inner|outer)HTML$/]',
    message:
      'Assigning innerHTML/outerHTML is an XSS sink. Use textContent, or build the markup with safeHtml from @/lib/html.',
  },
  {
    selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
    message: 'insertAdjacentHTML is an XSS sink. Build the markup with safeHtml from @/lib/html.',
  },
  {
    selector:
      "CallExpression[callee.property.name='write'][callee.object.name=/^(doc|.*[Dd]ocument)$/], CallExpression[callee.property.name='write'][callee.object.property.name='contentDocument'], CallExpression[callee.property.name='write'][callee.object.expression.property.name='contentDocument']",
    message:
      'document.write is an XSS sink. The receipt print frame in src/lib/print-receipt.ts is the only sanctioned use.',
  },
];

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
      'no-restricted-syntax': ['error', ...noHtmlSinks],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      // `javascript:` in an href runs as script on click.
      'no-script-url': 'error',
    },
  },
  {
    // Written into a sandboxed frame that cannot run script.
    files: ['src/lib/print-receipt.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...noHtmlSinks.slice(0, 3)],
    },
  }
);
