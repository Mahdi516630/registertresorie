import { describe, it, expect } from 'vitest';
import {
  isValid6DigitSerial,
  generateSerial,
  generateQuittanceNumber,
  formatCurrency,
  formatDateFR,
} from '../../src/utils/formatters';
import { createMockCGRecord, createMockPCRecord } from '../test-utils';

describe('TDD: Validations et Formateurs du Registre', () => {
  describe('Validation du Numéro de Série (6 chiffres obligatoires)', () => {
    it('doit valider strictement les chaînes de 6 chiffres', () => {
      expect(isValid6DigitSerial('100001')).toBe(true);
      expect(isValid6DigitSerial('000042')).toBe(true);
      expect(isValid6DigitSerial('999999')).toBe(true);
    });

    it('doit rejeter les numéros avec moins ou plus de 6 chiffres', () => {
      expect(isValid6DigitSerial('12345')).toBe(false);
      expect(isValid6DigitSerial('1234567')).toBe(false);
      expect(isValid6DigitSerial('')).toBe(false);
    });

    it('doit rejeter les numéros contenant des lettres ou caractères spéciaux', () => {
      expect(isValid6DigitSerial('12A456')).toBe(false);
      expect(isValid6DigitSerial('12-456')).toBe(false);
      expect(isValid6DigitSerial(' 123456 ')).toBe(true); // trim est accepté
    });
  });

  describe('Génération Séquentielle de Numéro de Série', () => {
    it('doit générer 100001 pour la première Carte Grise si la liste est vide', () => {
      const serial = generateSerial('CG', []);
      expect(serial).toBe('100001');
    });

    it('doit générer 200001 pour le premier Permis si la liste est vide', () => {
      const serial = generateSerial('PC', []);
      expect(serial).toBe('200001');
    });

    it('doit incrémenter le dernier numéro existant', () => {
      const records = [
        createMockCGRecord({ numSerial: '100005' }),
        createMockCGRecord({ numSerial: '100010' }),
      ];
      const nextSerial = generateSerial('CG', records);
      expect(nextSerial).toBe('100011');
    });
  });

  describe('Formateur de Montant et Dates Françaises', () => {
    it('doit formater les devises avec séparateur et suffixe FDJ', () => {
      expect(formatCurrency(35000)).toContain('35');
      expect(formatCurrency(35000)).toContain('FDJ');
      expect(formatCurrency(0)).toBe('0 FDJ');
    });

    it('doit formater les dates au format JJ/MM/AAAA', () => {
      expect(formatDateFR('2026-09-12')).toBe('12/09/2026');
      expect(formatDateFR('')).toBe('-');
    });

    it('doit générer un format de quittance valide', () => {
      const q = generateQuittanceNumber('Q');
      expect(q).toMatch(/^Q-\d{4}-\d{5}$/);
    });
  });
});
