import { describe, it, expect } from 'vitest';
import {
  calculateCGAmounts,
  calculatePCAmount,
  CG_RATE_PER_CV_NORMAL,
  CG_RATE_PER_CV_DUPLICATA,
  PC_RATE_PER_CATEGORY_NORMAL,
  PC_RATE_DUPLICATA_PER_CATEGORY,
} from '../../src/utils/formatters';

describe('TDD: Calculs des Tarifs et Taxes (Barème Officiel Djibouti)', () => {
  describe('Cartes Grises (CG)', () => {
    it('doit calculer le montant Carte Grise NORMAL selon (CV * 4500 FDJ) + Frais de dossier', () => {
      const cv = 6;
      const frais = 3000;
      const res = calculateCGAmounts(cv, 'NORMAL', frais);

      expect(res.montantCV).toBe(6 * CG_RATE_PER_CV_NORMAL); // 27 000 FDJ
      expect(res.montantDossier).toBe(3000);
      expect(res.total).toBe(30000);
    });

    it('doit calculer le montant Carte Grise DUPLICATA à moitié prix (CV * 2250 FDJ) + Frais', () => {
      const cv = 8;
      const frais = 1500;
      const res = calculateCGAmounts(cv, 'DUPLICATA', frais);

      expect(res.montantCV).toBe(8 * CG_RATE_PER_CV_DUPLICATA); // 18 000 FDJ
      expect(res.montantDossier).toBe(1500);
      expect(res.total).toBe(19500);
    });

    it('doit exonérer totalement les dossiers de type EXO (Total = 0 FDJ)', () => {
      const cv = 12;
      const frais = 5300;
      const res = calculateCGAmounts(cv, 'EXO', frais);

      expect(res.montantCV).toBe(0);
      expect(res.montantDossier).toBe(0);
      expect(res.total).toBe(0);
    });

    it('doit sécuriser les valeurs négatives ou nulles de CV', () => {
      const resZero = calculateCGAmounts(0, 'NORMAL', 500);
      expect(resZero.montantCV).toBe(0);
      expect(resZero.total).toBe(500);

      const resNeg = calculateCGAmounts(-5, 'NORMAL', 1000);
      expect(resNeg.montantCV).toBe(0);
      expect(resNeg.total).toBe(1000);
    });
  });

  describe('Permis de Conduire (PC)', () => {
    it('doit facturer 7000 FDJ par catégorie pour un Permis NORMAL', () => {
      // 1 catégorie (ex: B)
      expect(calculatePCAmount(1, 'NORMAL')).toBe(PC_RATE_PER_CATEGORY_NORMAL); // 7 000 FDJ

      // 2 catégories (ex: B + D)
      expect(calculatePCAmount(2, 'NORMAL')).toBe(2 * PC_RATE_PER_CATEGORY_NORMAL); // 14 000 FDJ

      // 3 catégories (ex: A + B + C)
      expect(calculatePCAmount(3, 'NORMAL')).toBe(3 * PC_RATE_PER_CATEGORY_NORMAL); // 21 000 FDJ
    });

    it('doit facturer 5000 FDJ par catégorie pour un Duplicata Permis', () => {
      expect(calculatePCAmount(1, 'DUPLICATA')).toBe(PC_RATE_DUPLICATA_PER_CATEGORY); // 5 000 FDJ
      expect(calculatePCAmount(2, 'DUPLICATA')).toBe(2 * PC_RATE_DUPLICATA_PER_CATEGORY); // 10 000 FDJ
    });

    it('doit appliquer au minimum 1 catégorie même si count est 0', () => {
      expect(calculatePCAmount(0, 'NORMAL')).toBe(7000);
    });
  });
});
