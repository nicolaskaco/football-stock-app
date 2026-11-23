import { describe, it, expect } from 'vitest';
import { isPlayerOverAge, getMinBirthYearForCategory } from './ageEligibility';

const settings = { ano_min_5ta: '2009', ano_min_6ta: '' };

describe('ageEligibility', () => {
  it('lee el año mínimo configurado por categoría', () => {
    expect(getMinBirthYearForCategory('5ta', settings)).toBe(2009);
    expect(getMinBirthYearForCategory('6ta', settings)).toBeNull();
    expect(getMinBirthYearForCategory('7ma', settings)).toBeNull();
  });

  it('marca como excedido a quien nació antes del año mínimo', () => {
    expect(isPlayerOverAge({ date_of_birth: '2008-12-31' }, '5ta', settings)).toEqual({ overAge: true, birthYear: 2008, minYear: 2009 });
    expect(isPlayerOverAge({ date_of_birth: '2009-01-01' }, '5ta', settings).overAge).toBe(false);
  });

  it('sin fecha de nacimiento o sin configuración no avisa', () => {
    expect(isPlayerOverAge({}, '5ta', settings).overAge).toBe(false);
    expect(isPlayerOverAge({ date_of_birth: '2000-01-01' }, '6ta', settings).overAge).toBe(false);
  });
});
