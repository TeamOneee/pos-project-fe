/**
 * As much about what is *kept* as what is stripped: a product really can be
 * called "Kopi & Susu <Spesial>", and mangling it to dodge an XSS these
 * primitives cannot reach would corrupt the catalogue for nothing.
 */

import { describe, expect, it } from 'vitest';

import { optionalText, requiredString, safeText } from '@/lib/validation';

const parse = (schema: ReturnType<typeof safeText>, value: string) => schema.parse(value);

describe('safeText', () => {
  const schema = safeText('Nama');

  it('keeps the characters that make an XSS payload, because they make names too', () => {
    expect(parse(schema, 'Kopi & Susu <Spesial> "Manis"')).toBe('Kopi & Susu <Spesial> "Manis"');
  });

  it('keeps Indonesian text and emoji intact', () => {
    expect(parse(schema, 'Teh Botol Sosro 350ml 🧃')).toBe('Teh Botol Sosro 350ml 🧃');
  });

  it('strips zero-width characters, which two identical-looking names differ by', () => {
    const withZeroWidth = 'Indo\u200bmart\ufeff';

    expect(parse(schema, withZeroWidth)).toBe('Indomart');
    expect(parse(schema, withZeroWidth)).toBe(parse(schema, 'Indomart'));
  });

  it('strips control characters', () => {
    expect(parse(schema, 'Nasi\u0000 Goreng\u0007')).toBe('Nasi Goreng');
  });

  it('strips bidi overrides, which reorder how a name prints on a receipt', () => {
    expect(parse(schema, '\u202eKopi\u202c')).toBe('Kopi');
  });

  it('normalizes to NFC, so a decomposed accent matches a composed one', () => {
    expect(parse(schema, 'Cafe\u0301 Latte')).toBe(parse(schema, 'Café Latte'));
  });

  it('collapses whitespace runs and trims, newlines included', () => {
    expect(parse(schema, '  Kopi \t\n  Susu  ')).toBe('Kopi Susu');
  });

  it('rejects a value that is empty once normalized', () => {
    // A field holding only zero-width characters is empty, however full it looks.
    expect(schema.safeParse('\u200b\u200b').success).toBe(false);
    expect(schema.safeParse('   ').success).toBe(false);
  });

  it('measures the length after normalizing, not before', () => {
    const short = safeText('Nama', 5);

    expect(short.parse('ab\u200bcde')).toBe('abcde');
    expect(short.safeParse('abcdef').success).toBe(false);
  });

  it('reports the field label in its message', () => {
    const result = safeText('Nama outlet').safeParse('');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe('Nama outlet wajib diisi');
  });
});

describe('requiredString', () => {
  it('is safeText, so every form that already imports it normalizes now', () => {
    expect(requiredString('Nama').parse('Indo\u200bmart  Retail')).toBe('Indomart Retail');
  });
});

describe('optionalText', () => {
  const schema = optionalText('Alamat');

  it('accepts an empty value, because the field is optional', () => {
    expect(parse(schema, '')).toBe('');
  });

  it('keeps line breaks, which are content in an address', () => {
    expect(parse(schema, 'Jl. Merdeka No. 1\nJakarta Pusat')).toBe(
      'Jl. Merdeka No. 1\nJakarta Pusat'
    );
  });

  it('trims each line and collapses runs of blank lines', () => {
    expect(parse(schema, '  Jl. Merdeka   No. 1  \n\n\n\n  Jakarta  ')).toBe(
      'Jl. Merdeka No. 1\n\nJakarta'
    );
  });

  it('strips the same invisible characters as safeText', () => {
    expect(parse(schema, 'Jl.\u200b Merdeka\u0000')).toBe('Jl. Merdeka');
  });

  it('rejects a value past the limit', () => {
    expect(optionalText('Alamat', 10).safeParse('x'.repeat(11)).success).toBe(false);
  });
});
