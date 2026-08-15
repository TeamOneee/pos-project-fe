/**
 * Regenerates global.css from design-tokens.js so the CSS variables can never
 * drift from the token source. Run with `npm run tokens`.
 */
const fs = require('node:fs');
const path = require('node:path');

const { COLOR_TOKENS, hexToRgbChannels } = require('../design-tokens');

const OUTPUT = path.join(__dirname, '..', 'global.css');

/** Blank-line grouping mirrors how CLAUDE.md lists the tokens. */
const GROUPS = [
  ['Surfaces', ['canvas', 'surface', 'surface-raised', 'subtle']],
  ['Borders', ['border', 'border-strong']],
  ['Foreground', ['fg', 'fg-muted', 'fg-subtle']],
  ['Accent', ['accent', 'accent-hover', 'accent-subtle']],
  [
    'Status',
    ['success', 'success-subtle', 'warning', 'warning-subtle', 'danger', 'danger-subtle', 'info'],
  ],
];

function declarations(theme, indent) {
  const lines = [];

  GROUPS.forEach(([label, names], index) => {
    if (index > 0) lines.push('');
    lines.push(`${indent}/* ${label} */`);
    for (const name of names) {
      const hex = COLOR_TOKENS[name][theme];
      lines.push(`${indent}--${name}: ${hexToRgbChannels(hex)}; /* ${hex} */`);
    }
  });

  return lines.join('\n');
}

const css = `@tailwind base;
@tailwind components;
@tailwind utilities;

/*
 * GENERATED FILE — do not edit by hand.
 * Source: design-tokens.js. Regenerate with \`npm run tokens\`.
 *
 * Colours are channel triplets rather than hex so Tailwind opacity modifiers
 * work: bg-accent/10, border-border-strong/50, and so on.
 */
@layer base {
  :root {
${declarations('light', '    ')}
  }

  .dark:root {
${declarations('dark', '    ')}
  }
}

@layer base {
  /* Default every border to the semantic token, matching the web Tailwind reset. */
  * {
    border-color: rgb(var(--border));
  }
}
`;

fs.writeFileSync(OUTPUT, css, 'utf8');
console.log(`Wrote ${path.relative(process.cwd(), OUTPUT)}`);
