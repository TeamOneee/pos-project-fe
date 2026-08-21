/**
 * Every interpolation is escaped unless something explicitly said otherwise,
 * and a nested fragment is escaped once — twice prints "&amp;" on a receipt.
 */

import { describe, expect, it } from 'vitest';

import { escapeHtml, raw, render, safeHtml } from '@/lib/html';

describe('escapeHtml', () => {
  it('escapes the five characters that end a text or quoted-attribute context', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  it('escapes the ampersand first, so an entity is not double-encoded', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('leaves ordinary text, Indonesian names and emoji alone', () => {
    expect(escapeHtml('Kopi Susu Gula Aren 250ml 🧋')).toBe('Kopi Susu Gula Aren 250ml 🧋');
  });
});

describe('safeHtml', () => {
  it('escapes an interpolated value', () => {
    const name = '<script>alert(1)</script>';

    expect(render(safeHtml`<div>${name}</div>`)).toBe(
      '<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>'
    );
  });

  it('escapes a value that would break out of a quoted attribute', () => {
    const value = '" onerror="alert(1)';

    expect(render(safeHtml`<img alt="${value}" />`)).toBe(
      '<img alt="&quot; onerror=&quot;alert(1)" />'
    );
  });

  it('leaves the literal parts of the template untouched', () => {
    expect(render(safeHtml`<div class="item">${'x'}</div>`)).toBe('<div class="item">x</div>');
  });

  it('passes a nested fragment through, escaping it once and not twice', () => {
    const inner = safeHtml`<span>${'Kopi & Susu'}</span>`;

    expect(render(safeHtml`<div>${inner}</div>`)).toBe('<div><span>Kopi &amp; Susu</span></div>');
  });

  it('joins an array of fragments, which is what a list of rows is', () => {
    const rows = ['a', '<b>'].map((value) => safeHtml`<li>${value}</li>`);

    expect(render(safeHtml`<ul>${rows}</ul>`)).toBe('<ul><li>a</li><li>&lt;b&gt;</li></ul>');
  });

  it('stringifies a number rather than trusting it', () => {
    expect(render(safeHtml`<span>${1500}</span>`)).toBe('<span>1500</span>');
  });

  it('prints nothing for a missing value, not "undefined"', () => {
    expect(render(safeHtml`<span>${undefined}</span><span>${null}</span>`)).toBe(
      '<span></span><span></span>'
    );
  });

  it('escapes an object that stringifies to markup', () => {
    // The guard is the `kind` brand, which only `raw` can set.
    const hostile = { toString: () => '<script>alert(1)</script>' };

    expect(render(safeHtml`<div>${hostile}</div>`)).not.toContain('<script>');
  });

  it('passes raw() through unescaped, which is the whole point of it', () => {
    expect(render(safeHtml`<div>${raw('<br />')}</div>`)).toBe('<div><br /></div>');
  });
});
