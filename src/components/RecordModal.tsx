import React, { useState, useEffect } from 'react';
import { 
  X, 
  Car, 
  CreditCard, 
  AlertCircle, 
  Check, 
  Sparkles,
  Receipt,
  FileCheck2,
  Layers
} from 'lucide-react';
import { 
  RegistryRecord, 
  CGRecord, 
  PCRecord, 
  RecordType, 
  CGType, 
  PCType, 
  PCCategory 
} from '../types';
import { 
  generateSerial, 
  generateQuittanceNumber, 
  isValid6DigitSerial,
  calculateCGAmounts,
  calculatePCAmount,
  CG_RATE_PER_CV_NORMAL,
  CG_RATE_PER_CV_DUPLICATA,
  PC_RATE_PER_CATEGORY_NORMAL,
  PC_RATE_DUPLICATA,
  CG_DOSSIER_FEE_OPTIONS
} from '../utils/formatters';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: RegistryRecord) => void;
  editingRecord: RegistryRecord | null;
  initialType: RecordType;
  allRecords: RegistryRecord[];
  currency: string;
}

const ALL_PC_CATEGORIES: { code: PCCategory; label: string; desc: string }[] = [
  { code: 'A', label: 'Catégorie A', desc: 'Motocycles & 2-roues motorisés' },
  { code: 'B', label: 'Catégorie B', desc: 'Véhicules légers de tourisme (voitures)' },
  { code: 'C', label: 'Catégorie C', desc: 'Poids lourds (transport de marchandises)' },
  { code: 'D', label: 'Catégorie D', desc: 'Transport en commun (autobus, autocars)' },
  { code: 'E', label: 'Catégorie E', desc: 'Ensembles de véhicules avec remorque lourde' },
  { code: 'F', label: 'Catégorie F', desc: 'Véhicules spéciaux & aménagements PMR' },
  { code: 'G', label: 'Catégorie G', desc: 'Tracteurs agricoles et engins de travaux publics' },
];

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRecord,
  initialType,
  allRecords,
  currency,
}) => {
  // Selected registration type: CG or PC
  const [recordType, setRecordType] = useState<RecordType>(
    editingRecord ? editingRecord.recordType : initialType
  );

  // Common fields
  // Rule: LE NUMERO DE SERIE EST UN NUM DE 6 CHIFFRE POUR LE PC ET CG
  const [numSerial, setNumSerial] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [date, setDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');

  // CG specific fields
  const [cv, setCv] = useState<number>(7);
  const [cgType, setCgType] = useState<CGType>('NORMAL');
  const [numCars, setNumCars] = useState<string>('');
  // CG Normal has 2 amounts and 2 quittances:
  // Montant selon CV (4500 FDJ/CV en Normal, 2250 en Duplicata)
  const [montantCV, setMontantCV] = useState<number>(31500); // 7 * 4500
  // Montant Frais de dossier (saisi manuellement)
  const [montantDossier, setMontantDossier] = useState<number>(3500);
  // Total montant
  const [montant, setMontant] = useState<number>(35000);
  // 1ère quittance (Taxe CV)
  const [cgNumQuittance1, setCgNumQuittance1] = useState<string>('');
  // 2ème quittance (Frais de dossier pour CG Normal)
  const [cgNumQuittance2, setCgNumQuittance2] = useState<string>('');

  // PC specific fields
  // Rule: UN PERSONNE PEUT AVOIR PLUSIEUR CATEGORIE
  const [pcCategories, setPcCategories] = useState<PCCategory[]>(['B']);
  const [pcType, setPcType] = useState<PCType>('NORMAL');
  const [pcNumQuittance, setPcNumQuittance] = useState<string>('');

  // Form error tracking
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize or reset form when modal opens or editingRecord changes
  useEffect(() => {
    if (editingRecord) {
      setRecordType(editingRecord.recordType);
      setNumSerial(editingRecord.numSerial);
      setName(editingRecord.name);
      setDate(editingRecord.date);
      setNotes(editingRecord.notes || '');
      setMontant(editingRecord.montant);

      if (editingRecord.recordType === 'CG') {
        const cg = editingRecord as CGRecord;
        setCv(cg.cv);
        setCgType(cg.type);
        setNumCars(cg.numCars);
        const calc = calculateCGAmounts(cg.cv, cg.type, cg.montantDossier || 0);
        setMontantCV(cg.montantCV ?? calc.montantCV);
        setMontantDossier(cg.montantDossier ?? 0);
        setCgNumQuittance1(cg.numQuittance1 || cg.numQuittance || '');
        setCgNumQuittance2(cg.numQuittance2 || '');
      } else {
        const pc = editingRecord as PCRecord;
        const cats = pc.categories && pc.categories.length > 0 
          ? pc.categories 
          : (pc.categorie ? [pc.categorie] : ['B']);
        setPcCategories(cats);
        setPcType(pc.type);
        setPcNumQuittance(pc.numQuittance || '');
      }
    } else {
      // New record mode: Fields start completely empty (no auto-generated text)
      setRecordType(initialType);
      setNumSerial('');
      setName('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');

      if (initialType === 'CG') {
        setCv(7);
        setCgType('NORMAL');
        setNumCars('');
        const calc = calculateCGAmounts(7, 'NORMAL', 3000);
        setMontantCV(calc.montantCV);
        setMontantDossier(calc.montantDossier);
        setMontant(calc.total);
        setCgNumQuittance1('');
        setCgNumQuittance2('');
      } else {
        setPcCategories(['B']);
        setPcType('NORMAL');
        setMontant(calculatePCAmount(1, 'NORMAL'));
        setPcNumQuittance('');
      }
    }
    setErrors({});
  }, [editingRecord, initialType, isOpen]);

  // Handle switching between CG and PC in ADD mode
  const handleTypeChange = (newType: RecordType) => {
    if (editingRecord) return;
    setRecordType(newType);
    if (newType === 'CG') {
      const calc = calculateCGAmounts(cv, cgType, montantDossier);
      setMontantCV(calc.montantCV);
      setMontant(calc.total);
    } else {
      setMontant(calculatePCAmount(pcCategories.length, pcType));
    }
  };

  // Recalculate CG amounts when CV, type, or dossier fees change
  const updateCGCalculations = (newCv: number, newCgType: CGType, newDossier: number) => {
    if (newCgType === 'EXO') {
      setMontantCV(0);
      setMontantDossier(0);
      setMontant(0);
      setCgNumQuittance1('');
      setCgNumQuittance2('');
    } else {
      const calc = calculateCGAmounts(newCv, newCgType, newDossier);
      setMontantCV(calc.montantCV);
      setMontantDossier(calc.montantDossier);
      setMontant(calc.total);
    }
  };

  const handleCGTypeChange = (newCgType: CGType) => {
    setCgType(newCgType);
    updateCGCalculations(cv, newCgType, montantDossier);
  };

  const handleCvChange = (newCv: number) => {
    const validCv = Math.max(1, newCv);
    setCv(validCv);
    updateCGCalculations(validCv, cgType, montantDossier);
  };

  const handleDossierChange = (newDossier: number) => {
    const val = Math.max(0, newDossier);
    setMontantDossier(val);
    updateCGCalculations(cv, cgType, val);
  };

  // PC Category selection & calculation
  const togglePCCategory = (cat: PCCategory) => {
    let nextCats: PCCategory[];
    if (pcCategories.includes(cat)) {
      if (pcCategories.length === 1) return; // Keep at least one category
      nextCats = pcCategories.filter((c) => c !== cat);
    } else {
      nextCats = [...pcCategories, cat];
    }
    setPcCategories(nextCats);
    setMontant(calculatePCAmount(nextCats.length, pcType));
  };

  const handlePCTypeChange = (newPcType: PCType) => {
    setPcType(newPcType);
    setMontant(calculatePCAmount(pcCategories.length, newPcType));
  };

  // Validation according to user instructions
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Check Serial Number: must be exactly 6 digits
    if (!numSerial.trim()) {
      newErrors.numSerial = 'Le numéro de série est obligatoire';
    } else if (!isValid6DigitSerial(numSerial)) {
      newErrors.numSerial = 'Le numéro de série doit comporter exactement 6 chiffres (ex: 100001)';
    }

    // 2. Check Name
    if (!name.trim()) {
      newErrors.name = 'Le nom complet du titulaire ou raison sociale est obligatoire';
    }

    // 3. Check Date
    if (!date) {
      newErrors.date = 'La date d’enregistrement est obligatoire';
    }

    if (recordType === 'CG') {
      if (!numCars.trim()) {
        newErrors.numCars = 'Le numéro d’immatriculation (plaque) est obligatoire';
      }
      if (!cv || cv < 1) {
        newErrors.cv = 'La puissance fiscale (CV) doit être supérieure à 0';
      }

      // Quittance Rules for CG:
      // CG NORMAL: 2 quittances required (CV and Dossier)
      // CG DUPLICATA: 1 quittance required
      // CG EXO: NO quittance ("IF EXO , SO NO NUMQUITTANCE")
      if (cgType === 'NORMAL') {
        if (!cgNumQuittance1.trim()) {
          newErrors.cgNumQuittance1 = 'La 1ère quittance (Taxe CV) est obligatoire pour une Carte Grise Normale';
        }
        if (!cgNumQuittance2.trim()) {
          newErrors.cgNumQuittance2 = 'La 2ème quittance (Frais de dossier) est obligatoire pour une Carte Grise Normale';
        }
      } else if (cgType === 'DUPLICATA') {
        if (!cgNumQuittance1.trim()) {
          newErrors.cgNumQuittance1 = 'Le numéro de quittance est obligatoire pour le duplicata';
        }
      }
    } else {
      // PC: At least 1 category selected, 1 quittance required
      if (pcCategories.length === 0) {
        newErrors.pcCategories = 'Veuillez sélectionner au moins une catégorie de permis';
      }
      if (!pcNumQuittance.trim()) {
        newErrors.pcNumQuittance = 'Le numéro de quittance est obligatoire pour le Permis de Conduire';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (recordType === 'CG') {
      const isExo = cgType === 'EXO';
      const isNormal = cgType === 'NORMAL';
      const finalMontant = isExo ? 0 : montantCV + montantDossier;

      const savedRecord: CGRecord = {
        id: editingRecord ? editingRecord.id : `cg-${Date.now()}`,
        recordType: 'CG',
        numSerial: numSerial.trim(),
        name: name.trim(),
        cv: Number(cv),
        type: cgType,
        montantCV: isExo ? 0 : montantCV,
        montantDossier: isExo ? 0 : montantDossier,
        montant: finalMontant,
        numCars: numCars.trim().toUpperCase(),
        numQuittance1: isExo ? '' : cgNumQuittance1.trim(),
        numQuittance2: isNormal ? cgNumQuittance2.trim() : '',
        numQuittance: isExo 
          ? '' 
          : isNormal && cgNumQuittance2.trim()
            ? `${cgNumQuittance1.trim()} / ${cgNumQuittance2.trim()}`
            : cgNumQuittance1.trim(),
        date,
        createdAt: editingRecord ? editingRecord.createdAt : new Date().toISOString(),
        notes: notes.trim(),
      };
      onSave(savedRecord);
    } else {
      const savedRecord: PCRecord = {
        id: editingRecord ? editingRecord.id : `pc-${Date.now()}`,
        recordType: 'PC',
        numSerial: numSerial.trim(),
        name: name.trim(),
        categories: pcCategories,
        categorie: pcCategories[0] || 'B',
        type: pcType,
        montant: Number(montant) || 0,
        numQuittance: pcNumQuittance.trim(),
        date,
        createdAt: editingRecord ? editingRecord.createdAt : new Date().toISOString(),
        notes: notes.trim(),
      };
      onSave(savedRecord);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200"
        id="record-modal-dialog"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
              recordType === 'CG' ? 'bg-blue-600' : 'bg-emerald-600'
            }`}>
              {recordType === 'CG' ? <Car className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {editingRecord
                  ? `Modifier l'enregistrement N° ${editingRecord.numSerial}`
                  : `Nouvel Enregistrement — ${recordType === 'CG' ? 'Carte Grise (CG)' : 'Permis de Conduire (PC)'}`}
              </h3>
              <p className="text-xs text-slate-500">
                {recordType === 'CG' 
                  ? "Certificat d'Immatriculation de Véhicule • Règle CG (4 500 FDJ/CV ou 2 250 FDJ Duplicata)" 
                  : "Titre de Permis de Conduire • Règle PC (7 000 FDJ/catégorie ou 5 000 FDJ Duplicata)"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Register Type Switcher (only in creation mode) */}
          {!editingRecord && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Sélectionnez le Registre :
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="btn-switch-to-cg"
                  onClick={() => handleTypeChange('CG')}
                  className={`flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all ${
                    recordType === 'CG'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs ring-2 ring-blue-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Car className="w-4 h-4 text-blue-600" />
                  <span>Carte Grise (CG)</span>
                </button>

                <button
                  type="button"
                  id="btn-switch-to-pc"
                  onClick={() => handleTypeChange('PC')}
                  className={`flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all ${
                    recordType === 'PC'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs ring-2 ring-emerald-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Permis de Conduire (PC)</span>
                </button>
              </div>
            </div>
          )}

          {/* Section 1: Identifiants Principaux */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* NUM_SERIAL : Strict 6-digit number */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  NUM_SERIAL (Numéro de Série - 6 chiffres) *
                </label>
                {!editingRecord && (
                  <button
                    type="button"
                    onClick={() => setNumSerial(generateSerial(recordType, allRecords))}
                    className="text-[11px] text-blue-600 hover:underline inline-flex items-center space-x-1 font-medium"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Générer</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  id="field-num-serial"
                  maxLength={6}
                  pattern="\d{6}"
                  inputMode="numeric"
                  value={numSerial}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    setNumSerial(clean);
                  }}
                  placeholder="Ex: 100001"
                  className={`w-full text-sm rounded-lg border px-3 py-2 font-mono font-bold tracking-wider bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                    errors.numSerial ? 'border-red-500 bg-red-50/50' : 'border-slate-300'
                  }`}
                />
                <span className="absolute right-3 top-2.5 text-[11px] text-slate-400 font-mono">
                  {numSerial.length}/6
                </span>
              </div>
              {errors.numSerial ? (
                <p className="text-[11px] text-red-600 mt-1">{errors.numSerial}</p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-1">Numéro à 6 chiffres obligatoire</p>
              )}
            </div>

            {/* DATE */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date d'Enregistrement *
              </label>
              <input
                type="date"
                id="field-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full text-sm rounded-lg border px-3 py-2 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                  errors.date ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {errors.date && (
                <p className="text-[11px] text-red-600 mt-1">{errors.date}</p>
              )}
            </div>
          </div>

          {/* NAME (Titulaire / Propriétaire) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              NAME (Nom & Prénom / Société Titulaire) *
            </label>
            <input
              type="text"
              id="field-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mamadou Diop ou SOGECAR SARL"
              className={`w-full text-sm rounded-lg border px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500 bg-red-50/50' : 'border-slate-300'
              }`}
            />
            {errors.name && (
              <p className="text-[11px] text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION SPÉCIFIQUE CARTE GRISE (CG)                                       */}
          {/* Règle : CG NORMAL = 2 quittances + 2 montants (CV à 4500 FDJ + Dossier)   */}
          {/* Règle : CG DUPLICATA = 1 CV à moitié prix (2250 FDJ)                     */}
          {/* Règle : CG EXO = 0 FDJ, AUCUNE quittance                                  */}
          {/* ========================================================================= */}
          {recordType === 'CG' && (
            <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200/70 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-blue-900">
                  <Car className="w-4 h-4 text-blue-700" />
                  <span>Détails Carte Grise (CG)</span>
                </div>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                  1 CV = {cgType === 'DUPLICATA' ? '2 250 FDJ (Moitié prix)' : '4 500 FDJ'}
                </span>
              </div>

              {/* TYPE: NORMAL / DUPLICATA / EXO */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  TYPE d'Opération : NORMAL / DUPLICATA / EXO *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCGTypeChange('NORMAL')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      cgType === 'NORMAL'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    NORMAL (4 500 FDJ/CV)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCGTypeChange('DUPLICATA')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      cgType === 'DUPLICATA'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    DUPLICATA (2 250 FDJ/CV)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCGTypeChange('EXO')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      cgType === 'EXO'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    EXO (0 FDJ - Pas de quittance)
                  </button>
                </div>
              </div>

              {/* NUM_CARS & CV */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NUM_CARS (Plaque d'Immatriculation) *
                  </label>
                  <input
                    type="text"
                    id="field-num-cars"
                    value={numCars}
                    onChange={(e) => setNumCars(e.target.value)}
                    placeholder="Ex: DK-8492-BC"
                    className={`w-full text-sm rounded-lg border px-3 py-2 uppercase font-mono bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                      errors.numCars ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {errors.numCars && (
                    <p className="text-[11px] text-red-600 mt-1">{errors.numCars}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CV (Puissance Fiscale) *
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      id="field-cv"
                      min="1"
                      max="60"
                      value={cv}
                      onChange={(e) => handleCvChange(parseInt(e.target.value) || 1)}
                      className="w-24 text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white text-center font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Chevaux Fiscaux (CV)</span>
                  </div>
                </div>
              </div>

              {/* DUAL AMOUNTS BREAKDOWN (POUR CG) */}
              {cgType !== 'EXO' && (
                <div className="p-3.5 rounded-xl bg-white border border-blue-200/80 space-y-3">
                  <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Ventilation des Deux Montants (CG) :</span>
                    <span className="text-[11px] text-blue-600 font-semibold">
                      Total : {(montantCV + montantDossier).toLocaleString('fr-FR')} {currency}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Montant 1 : Selon CV */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 font-medium">1. Montant selon CV :</span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {cv} CV × {cgType === 'DUPLICATA' ? '2 250' : '4 500'} {currency}
                        </span>
                      </div>
                      <div className="text-base font-extrabold text-blue-900 font-mono">
                        {montantCV.toLocaleString('fr-FR')} {currency}
                      </div>
                    </div>

                    {/* Montant 2 : Frais de dossier (Barème officiel : 500, 1500, 2400, 2900, 3000, 4100, 5300 FDJ) */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center space-x-2">
                          <label htmlFor="field-frais-dossier" className="text-xs font-bold text-slate-800">
                            2. Frais de Dossier (Barème Officiel FDJ) * :
                          </label>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                            Franc Djibouti
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-blue-800 font-mono">
                          {montantDossier.toLocaleString('fr-FR')} {currency}
                        </span>
                      </div>

                      {/* 7 Official Fee Preset Buttons */}
                      <div>
                        <span className="text-[11px] text-slate-500 block mb-1.5 font-medium">
                          Sélectionnez parmi les montants réglementaires :
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {CG_DOSSIER_FEE_OPTIONS.map((fee) => {
                            const isSelected = montantDossier === fee;
                            return (
                              <button
                                key={fee}
                                type="button"
                                onClick={() => handleDossierChange(fee)}
                                className={`text-xs px-2.5 py-1.5 rounded-lg font-mono font-bold transition-all border inline-flex items-center space-x-1 ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/30'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900'
                                }`}
                              >
                                <span>{fee.toLocaleString('fr-FR')} {currency}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-white ml-0.5" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Manual input fallback */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                        <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                          Ou saisie personnalisée :
                        </span>
                        <div className="relative max-w-xs flex-1">
                          <input
                            type="number"
                            id="field-frais-dossier"
                            min="0"
                            step="100"
                            value={montantDossier}
                            onChange={(e) => handleDossierChange(Number(e.target.value))}
                            className="w-full text-xs font-bold font-mono rounded-md border border-slate-300 px-2.5 py-1.5 pr-14 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="absolute right-2.5 top-1.5 text-xs font-semibold text-slate-500">
                            {currency}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DUAL QUITTANCES FOR CG */}
              <div className="pt-2 border-t border-blue-200/50">
                {cgType === 'EXO' ? (
                  <div className="p-3.5 rounded-lg bg-amber-100/70 border border-amber-300 text-amber-900 text-xs">
                    <div className="flex items-center space-x-2 font-bold text-amber-950">
                      <AlertCircle className="w-4 h-4 text-amber-700" />
                      <span>Règle Exonération : « IF EXO , SO NO NUMQUITTANCE »</span>
                    </div>
                    <p className="mt-1">
                      Le dossier est légalement exonéré de taxe. Aucun numéro de quittance n'est requis ni généré.
                    </p>
                  </div>
                ) : cgType === 'NORMAL' ? (
                  /* Règle utilisateur : CG - NORMAL A 2 QUITTANCE */
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                      <Receipt className="w-4 h-4 text-blue-600" />
                      <span>Les Deux Quittances Obligatoires (CG Normal) :</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Quittance 1 : Taxe CV */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700">
                            1ère Quittance (Taxe CV) *
                          </label>
                          <button
                            type="button"
                            onClick={() => setCgNumQuittance1(generateQuittanceNumber('Q-CV'))}
                            className="text-[11px] text-blue-600 hover:underline font-medium"
                          >
                            Générer
                          </button>
                        </div>
                        <input
                          type="text"
                          value={cgNumQuittance1}
                          onChange={(e) => setCgNumQuittance1(e.target.value)}
                          placeholder="Ex: Q-2026-89101"
                          className={`w-full text-sm rounded-lg border px-3 py-2 font-mono uppercase bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                            errors.cgNumQuittance1 ? 'border-red-500 bg-red-50/50' : 'border-slate-300'
                          }`}
                        />
                        {errors.cgNumQuittance1 && (
                          <p className="text-[11px] text-red-600 mt-1">{errors.cgNumQuittance1}</p>
                        )}
                      </div>

                      {/* Quittance 2 : Frais de Dossier */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700">
                            2ème Quittance (Frais de Dossier) *
                          </label>
                          <button
                            type="button"
                            onClick={() => setCgNumQuittance2(generateQuittanceNumber('Q-DOS'))}
                            className="text-[11px] text-blue-600 hover:underline font-medium"
                          >
                            Générer
                          </button>
                        </div>
                        <input
                          type="text"
                          value={cgNumQuittance2}
                          onChange={(e) => setCgNumQuittance2(e.target.value)}
                          placeholder="Ex: Q-2026-89102"
                          className={`w-full text-sm rounded-lg border px-3 py-2 font-mono uppercase bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                            errors.cgNumQuittance2 ? 'border-red-500 bg-red-50/50' : 'border-slate-300'
                          }`}
                        />
                        {errors.cgNumQuittance2 && (
                          <p className="text-[11px] text-red-600 mt-1">{errors.cgNumQuittance2}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* CG Duplicata : 1 quittance */
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Quittance de Duplicata *
                      </label>
                      <button
                        type="button"
                        onClick={() => setCgNumQuittance1(generateQuittanceNumber('Q-DUP'))}
                        className="text-[11px] text-purple-600 hover:underline font-medium"
                      >
                        Générer
                      </button>
                    </div>
                    <input
                      type="text"
                      value={cgNumQuittance1}
                      onChange={(e) => setCgNumQuittance1(e.target.value)}
                      placeholder="Ex: Q-2026-44820"
                      className={`w-full text-sm rounded-lg border px-3 py-2 font-mono uppercase bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 ${
                        errors.cgNumQuittance1 ? 'border-red-500 bg-red-50/50' : 'border-slate-300'
                      }`}
                    />
                    {errors.cgNumQuittance1 && (
                      <p className="text-[11px] text-red-600 mt-1">{errors.cgNumQuittance1}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION SPÉCIFIQUE PERMIS DE CONDUIRE (PC)                                */}
          {/* Règle : UNE PERSONNE PEUT AVOIR PLUSIEURS CATÉGORIES                      */}
          {/* Règle : 1 CATÉGORIE = 7000 FDJ, DUPLICATA = 5000 FDJ                      */}
          {/* ========================================================================= */}
          {recordType === 'PC' && (
            <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200/70 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-emerald-900">
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  <span>Détails Permis de Conduire (PC)</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  {pcType === 'NORMAL' ? '7 000 FDJ par catégorie' : '5 000 FDJ par catégorie (Duplicata)'}
                </span>
              </div>

              {/* TYPE: NORMAL / DUPLICATA */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  TYPE de Demande : NORMAL / DUPLICATA *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handlePCTypeChange('NORMAL')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      pcType === 'NORMAL'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    NORMAL (7 000 FDJ / catégorie)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePCTypeChange('DUPLICATA')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      pcType === 'DUPLICATA'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    DUPLICATA (5 000 FDJ / catégorie)
                  </button>
                </div>
              </div>

              {/* MULTI-CATEGORY SELECTION : UNE PERSONNE PEUT AVOIR PLUSIEURS CATÉGORIES */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Catégories de Permis (Sélection multiple autorisée) *
                  </label>
                  <span className="text-[11px] text-emerald-700 font-bold">
                    {pcCategories.length} sélectionnée{pcCategories.length > 1 ? 's' : ''} : {pcCategories.join(', ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_PC_CATEGORIES.map(({ code, label, desc }) => {
                    const isSelected = pcCategories.includes(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => togglePCCategory(code)}
                        className={`p-2.5 text-left rounded-xl border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-extrabold text-sm">{label}</span>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isSelected ? 'bg-white text-emerald-700' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {isSelected ? '✓' : '+'}
                          </span>
                        </div>
                        <span className={`text-[10px] mt-1 line-clamp-1 ${
                          isSelected ? 'text-emerald-100' : 'text-slate-500'
                        }`}>
                          {desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {errors.pcCategories && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.pcCategories}</p>
                )}

                <div className="mt-2.5 p-2 rounded-lg bg-emerald-100/60 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
                  <span>
                    Calcul des droits :{' '}
                    <strong>
                      {pcType === 'NORMAL' 
                        ? `${pcCategories.length} catégorie(s) × 7 000 ${currency}`
                        : `${pcCategories.length} catégorie(s) × 5 000 ${currency}`}
                    </strong>
                  </span>
                  <span className="font-mono font-black text-sm text-emerald-900">
                    = {montant.toLocaleString('fr-FR')} {currency}
                  </span>
                </div>
              </div>

              {/* NUM_QUITTANCE for PC */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    NUM_QUITTANCE (Quittance de Paiement PC) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setPcNumQuittance(generateQuittanceNumber('Q-PC'))}
                    className="text-[11px] text-emerald-600 hover:underline inline-flex items-center space-x-1 font-medium"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Générer reçu</span>
                  </button>
                </div>
                <input
                  type="text"
                  id="field-pc-quittance"
                  value={pcNumQuittance}
                  onChange={(e) => setPcNumQuittance(e.target.value)}
                  placeholder="Ex: Q-2026-10492"
                  className={`w-full text-sm rounded-lg border px-3 py-2 font-mono uppercase bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                    errors.pcNumQuittance ? 'border-red-500 bg-red-50/50' : 'border-slate-300'
                  }`}
                />
                {errors.pcNumQuittance && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.pcNumQuittance}</p>
                )}
              </div>
            </div>
          )}

          {/* MONTANT TOTAL & REMARQUES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                MONTANT TOTAL DES DROITS ({currency}) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="field-montant"
                  min="0"
                  disabled={recordType === 'CG' && cgType === 'EXO'}
                  value={montant}
                  onChange={(e) => setMontant(Number(e.target.value))}
                  className={`w-full text-base font-black font-mono rounded-lg border px-3 py-2 pr-14 focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                    recordType === 'CG' && cgType === 'EXO'
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-slate-300'
                  }`}
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-500">
                  {currency}
                </span>
              </div>
              {recordType === 'CG' && cgType === 'EXO' ? (
                <p className="text-[11px] text-amber-700 font-semibold mt-1">
                  Exonéré de tous droits légaux (0 {currency})
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-1">
                  Calculé automatiquement selon le barème officiel (modifiable si besoin)
                </p>
              )}
            </div>

            {/* Notes / Remarques */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observations / Motif (Optionnel)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Première immatriculation, véhicule médical..."
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Modal Actions Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              id="btn-submit-record"
              className={`px-5 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-all flex items-center space-x-2 ${
                recordType === 'CG'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{editingRecord ? 'Mettre à jour' : 'Enregistrer le dossier'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
