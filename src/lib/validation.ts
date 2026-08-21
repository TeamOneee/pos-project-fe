import { z } from 'zod';

import { parseMoney } from '@/lib/money';

/**
 * Shared zod pieces. Each form owns its own schema, colocated with the form
 * (CLAUDE.md § Stack) — these are only the primitives those schemas build on.
 *
 * Messages are Bahasa Indonesia because they are UI copy (rule 5).
 */

/**
 * Invisible characters that arrive by paste and survive a round trip: two names
 * that look identical stop matching in search, and a bidi override reorders how
 * one prints on a receipt. Stripped, because a user cannot see them to fix them.
 *
 * *Not* an XSS defence, and must not become one: `<`, `>` and `&` are legitimate
 * in "Kopi & Susu", and are made safe where they render, not where they are
 * typed. See docs/security.md.
 */
/* eslint-disable no-control-regex -- stripping the control range is the point */
const CONTROL = /[\0-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;
/* eslint-enable no-control-regex */

/** Tab, newline and CR are excluded above: whitespace, handled per field. */
const INVISIBLE = /[\u200B-\u200F\u2028\u2029\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/** NFC so "Cafe\u0301" and "Café" compare equal; CRLF becomes LF. */
const normalize = (value: string) =>
  value.normalize('NFC').replace(/\r\n?/g, '\n').replace(CONTROL, '').replace(INVISIBLE, '');

/** Single-line text: normalized, whitespace runs collapsed, trimmed. */
export const safeText = (label: string, max = 255) =>
  z
    .string({ required_error: `${label} wajib diisi` })
    .transform((value) => normalize(value).replace(/\s+/g, ' ').trim())
    .pipe(z.string().min(1, `${label} wajib diisi`).max(max, `${label} maksimal ${max} karakter`));

/** Optional multi-line text — an address, a note. Line breaks are content. */
export const optionalText = (label: string, max = 255) =>
  z
    .string()
    .transform((value) =>
      normalize(value)
        .replace(/[^\S\n]+/g, ' ')
        .split('\n')
        .map((line) => line.trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    )
    .pipe(z.string().max(max, `${label} maksimal ${max} karakter`));

/** Required text field with a trimmed, non-empty value. */
export const requiredString = (label: string, max = 255) => safeText(label, max);

export const emailSchema = z
  .string({ required_error: 'Email wajib diisi' })
  .trim()
  .min(1, 'Email wajib diisi')
  .email('Format email tidak valid');

export const passwordSchema = z
  .string({ required_error: 'Kata sandi wajib diisi' })
  .min(8, 'Kata sandi minimal 8 karakter');

/**
 * A money field the user types into. Accepts "15.750.000" or "15750000",
 * rejects anything with a decimal separator — there are no sen in this product
 * (CLAUDE.md rule 1) — and yields an integer number of rupiah.
 */
export const rupiahInput = (label = 'Harga') =>
  z
    .string({ required_error: `${label} wajib diisi` })
    .trim()
    .min(1, `${label} wajib diisi`)
    .refine((value) => !/[,.]\d{1,2}$/.test(value), `${label} tidak boleh pakai desimal`)
    .transform((value) => value.replace(/\./g, ''))
    .refine((value) => /^\d+$/.test(value), `${label} harus berupa angka`)
    .transform((value) => parseMoney(value))
    .refine((value) => value >= 0, `${label} tidak boleh negatif`);

/** A non-negative whole quantity, e.g. stock on hand. */
export const quantityInput = (label = 'Jumlah') =>
  z
    .string({ required_error: `${label} wajib diisi` })
    .trim()
    .min(1, `${label} wajib diisi`)
    .refine((value) => /^\d+$/.test(value), `${label} harus berupa angka bulat`)
    .transform((value) => Number(value))
    .refine((value) => Number.isSafeInteger(value), `${label} terlalu besar`);

/** The three roles from the role matrix. */
export const roleSchema = z.enum(['OWNER', 'ADMIN', 'CASHIER'], {
  required_error: 'Peran wajib dipilih',
  invalid_type_error: 'Peran tidak valid',
});

export type Role = z.infer<typeof roleSchema>;
