import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  emailSchema,
  quantityInput,
  requiredString,
  roleSchema,
  rupiahInput,
} from '@/lib/validation';

describe('rupiahInput', () => {
  const schema = rupiahInput('Harga');

  it('parses a grouped string to integer rupiah', () => {
    expect(schema.parse('15.750.000')).toBe(15750000);
    expect(schema.parse('15750000')).toBe(15750000);
    expect(schema.parse('0')).toBe(0);
  });

  it('rejects decimals — there are no sen in this product', () => {
    expect(() => schema.parse('15750,50')).toThrow();
    expect(() => schema.parse('15750.50')).toThrow();
  });

  it('rejects non-numeric input with Indonesian copy', () => {
    const result = schema.safeParse('abc');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Harga harus berupa angka');
    }
  });

  it('requires a value', () => {
    const result = schema.safeParse('');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Harga wajib diisi');
    }
  });
});

describe('quantityInput', () => {
  it('parses whole numbers only', () => {
    expect(quantityInput().parse('12')).toBe(12);
    expect(() => quantityInput().parse('12,5')).toThrow();
    expect(() => quantityInput().parse('-3')).toThrow();
  });
});

describe('field primitives', () => {
  it('trims and requires text', () => {
    expect(requiredString('Nama').parse('  Kopi  ')).toBe('Kopi');
    expect(() => requiredString('Nama').parse('   ')).toThrow();
  });

  it('validates email format', () => {
    expect(emailSchema.parse('owner@toko.id')).toBe('owner@toko.id');
    expect(() => emailSchema.parse('bukan-email')).toThrow();
  });

  it('accepts only the three roles', () => {
    expect(roleSchema.parse('CASHIER')).toBe('CASHIER');
    expect(() => roleSchema.parse('MANAGER')).toThrow();
  });
});

describe('react-hook-form integration', () => {
  it('resolves a schema into RHF field errors', async () => {
    const schema = z.object({
      email: emailSchema,
      price: rupiahInput('Harga'),
    });
    const resolver = zodResolver(schema);

    const invalid = await resolver({ email: 'bukan-email', price: '15750,50' }, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });

    expect(invalid.errors.email?.message).toBe('Format email tidak valid');
    expect(invalid.errors.price?.message).toBe('Harga tidak boleh pakai desimal');

    const valid = await resolver({ email: 'owner@toko.id', price: '15.750.000' }, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });

    expect(valid.errors).toEqual({});
    // The form hands the API an integer, never a string or a float.
    expect(valid.values).toEqual({ email: 'owner@toko.id', price: 15750000 });
  });
});
