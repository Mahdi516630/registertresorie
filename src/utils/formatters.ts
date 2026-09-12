import { RegistryRecord, CGRecord, PCRecord, PCCategory, CGType, PCType } from '../types';

export const MONTHS_FR = [
  { value: '01', label: 'Janvier' },
  { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' },
  { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' },
  { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
];

// Official Rates according to instructions in Franc Djibouti (FDJ)
export const CG_RATE_PER_CV_NORMAL = 4500; // 4500 FDJ per CV
export const CG_RATE_PER_CV_DUPLICATA = 2250; // 2250 FDJ per CV (half price)
export const PC_RATE_PER_CATEGORY_NORMAL = 7000; // 7000 FDJ per category (Normal)
export const PC_RATE_DUPLICATA_PER_CATEGORY = 5000; // 5000 FDJ per category (Duplicata)
export const PC_RATE_DUPLICATA = 5000; // Constant alias for backward compatibility

/**
 * Barème officiel des Frais de Dossier en Franc Djibouti (FDJ) :
 * 500, 1500, 2400, 2900, 3000, 4100, 5300 FDJ
 */
export const CG_DOSSIER_FEE_OPTIONS = [500, 1500, 2400, 2900, 3000, 4100, 5300] as const;
export type CGDossierFee = (typeof CG_DOSSIER_FEE_OPTIONS)[number];

export function formatCurrency(amount: number, currency = 'FDJ'): string {
  const formatted = new Intl.NumberFormat('fr-FR').format(amount);
  return `${formatted} ${currency}`;
}

export function formatDateFR(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('fr-FR');
  } catch {
    return dateStr;
  }
}

/**
 * Generate a sequential 6-digit serial number (e.g., "000001", "104820")
 */
export function generateSerial(type: 'CG' | 'PC', existingRecords: RegistryRecord[]): string {
  const relevantRecords = existingRecords.filter((r) => r.recordType === type);

  let maxNum = 0;
  for (const record of relevantRecords) {
    // If it's pure 6 digits or contains digits
    const digitsOnly = record.numSerial.replace(/\D/g, '');
    if (digitsOnly) {
      const num = parseInt(digitsOnly, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum > 0 ? maxNum + 1 : (type === 'CG' ? 100001 : 200001);
  return String(nextNum).padStart(6, '0');
}

/**
 * Validate that a serial number is strictly 6 digits
 */
export function isValid6DigitSerial(serial: string): boolean {
  return /^\d{6}$/.test(serial.trim());
}

export function generateQuittanceNumber(prefix = 'Q'): string {
  const now = new Date();
  const year = now.getFullYear();
  const randomPart = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${year}-${randomPart}`;
}

/**
 * Calculate CG amounts:
 * - NORMAL: CV * 4500 FDJ + Frais de dossier (saisi manuellement)
 * - DUPLICATA: CV * 2250 FDJ + Frais de dossier (optionnel)
 * - EXO: 0 FDJ
 */
export function calculateCGAmounts(cv: number, type: CGType, fraisDossier = 0) {
  if (type === 'EXO') {
    return {
      montantCV: 0,
      montantDossier: 0,
      total: 0,
    };
  }
  const rate = type === 'DUPLICATA' ? CG_RATE_PER_CV_DUPLICATA : CG_RATE_PER_CV_NORMAL;
  const montantCV = Math.max(0, cv) * rate;
  const validFrais = Math.max(0, Number(fraisDossier) || 0);
  return {
    montantCV,
    montantDossier: validFrais,
    total: montantCV + validFrais,
  };
}

/**
 * Calculate PC amount:
 * - NORMAL: 7000 FDJ per category (e.g., B et D = 2 * 7000 = 14 000 FDJ)
 * - DUPLICATA: 5000 FDJ per category (e.g., B et G = 2 * 5000 = 10 000 FDJ)
 */
export function calculatePCAmount(categoriesCount: number, type: PCType): number {
  const count = Math.max(1, categoriesCount);
  const ratePerCategory = type === 'DUPLICATA' ? PC_RATE_DUPLICATA_PER_CATEGORY : PC_RATE_PER_CATEGORY_NORMAL;
  return count * ratePerCategory;
}

export function exportRecordsToCSV(records: RegistryRecord[], filename = 'registre-cg-pc.csv') {
  const headers = [
    'Type Registre',
    'Numéro Série (6 chiffres)',
    'Date',
    'Nom & Prénom',
    'Type Opération',
    'Montant Total (FDJ)',
    'Montant CV (FDJ)',
    'Frais Dossier (FDJ)',
    '1ère Quittance (Taxe CV / Quittance)',
    '2ème Quittance (Frais Dossier - CG Normal)',
    'CV (CG)',
    'Immatriculation / Plaque (CG)',
    'Catégories (PC)',
  ];

  const rows = records.map((r) => {
    if (r.recordType === 'CG') {
      const cg = r as CGRecord;
      const q1 = cg.type === 'EXO' ? 'EXONÉRÉ' : (cg.numQuittance1 || cg.numQuittance || '-');
      const q2 = cg.type === 'NORMAL' ? (cg.numQuittance2 || '-') : 'N/A';
      return [
        'Carte Grise (CG)',
        `"${cg.numSerial}"`,
        `"${cg.date}"`,
        `"${cg.name.replace(/"/g, '""')}"`,
        `"${cg.type}"`,
        cg.montant,
        cg.montantCV ?? (cg.type === 'EXO' ? 0 : cg.cv * (cg.type === 'DUPLICATA' ? CG_RATE_PER_CV_DUPLICATA : CG_RATE_PER_CV_NORMAL)),
        cg.montantDossier ?? 0,
        `"${q1}"`,
        `"${q2}"`,
        cg.cv,
        `"${cg.numCars}"`,
        'N/A',
      ];
    } else {
      const pc = r as PCRecord;
      const cats = pc.categories && pc.categories.length > 0 ? pc.categories.join(', ') : (pc.categorie || 'B');
      return [
        'Permis de Conduire (PC)',
        `"${pc.numSerial}"`,
        `"${pc.date}"`,
        `"${pc.name.replace(/"/g, '""')}"`,
        `"${pc.type}"`,
        pc.montant,
        'N/A',
        'N/A',
        `"${pc.numQuittance || ''}"`,
        'N/A',
        'N/A',
        'N/A',
        `"${cats}"`,
      ];
    }
  });

  const csvContent = [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
