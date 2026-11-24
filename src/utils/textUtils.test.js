import { describe, it, expect } from 'vitest';
import { normalizeSearchText, textoATelegramHTML } from './textUtils';

describe('normalizeSearchText', () => {
  it('quita tildes y pasa a minúsculas', () => {
    expect(normalizeSearchText('Martín PÉREZ')).toBe('martin perez');
  });
});

describe('textoATelegramHTML', () => {
  it('convierte *negrita* en <b> y escapa HTML', () => {
    expect(textoATelegramHTML('*5ta* (15/03) — A & B <x>')).toBe('<b>5ta</b> (15/03) — A &amp; B &lt;x&gt;');
  });

  it('no une asteriscos de renglones distintos', () => {
    expect(textoATelegramHTML('a*b\nc*d')).toBe('a*b\nc*d');
  });
});
