import { z } from 'zod';

import { parseMoney } from '@/lib/money';

/**
 * Shared zod pieces. Each form owns its own schema, colocated with the form
 * (CLAUDE.md § Stack) — these are only the primitives those schemas build on.
 *
 * Messages are Bahasa Indonesia because they are UI copy (rule 5).
 */

/** Required text field with a trimmed, non-empty value. */
export const requiredString = (label: string, max = 255) =>
  z
    .string({ required_error: `${label} wajib diisi` })
    .trim()
    .min(1, `${label} wajib diisi`)
    .max(max, `${label} maksimal ${max} karakter`);

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
