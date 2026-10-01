import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  ShieldCheck, 
  Ban, 
  Copy, 
  Check, 
  Edit3, 
  LogOut, 
  FileText, 
  Car, 
  CreditCard, 
  Calendar, 
  User, 
  Hash, 
  Tag, 
  Sparkles,
  Info
} from 'lucide-react';
import { RegistryRecord, CGRecord, PCRecord } from '../types';
import { formatCurrency, formatDateFR } from '../utils/formatters';
import { AppLogo } from './AppLogo';

export interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: RegistryRecord | null;
  currency: string;
  onEdit?: (record: RegistryRecord) => void;
  currentUserName?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  record,
  currency,
  onEdit,
  currentUserName,
}) => {
  const [copied, setCopied] = useState(false);
  const [printTimestamp, setPrintTimestamp] = useState<string>('');

  // Update real-time timestamp when opened
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const timeStr = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setPrintTimestamp(`${dateStr} à ${timeStr}`);
    }
  }, [isOpen]);

  // Keyboard shortcut listener: Escape to exit, Ctrl+P to print
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  const isCG = record.recordType === 'CG';
  const cg = isCG ? (record as CGRecord) : null;
  const pc = !isCG ? (record as PCRecord) : null;

  const pcCategories = pc?.categories && pc.categories.length > 0
    ? pc.categories
    : pc?.categorie
      ? [pc.categorie]
      : [];

  const handlePrint = () => {
    document.body.classList.add('printing-receipt');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-receipt');
    }, 1500);
  };

  const handleCopyDetails = async () => {
    const lines = [
      `RÉPUBLIQUE DE DJIBOUTI - TRÉSORERIE DE LA PRÉFECTURE`,
      `Document : ${isCG ? 'Carte Grise (CG)' : 'Permis de Conduire (PC)'}`,
      `N° de Série : ${record.numSerial}`,
      `Date : ${formatDateFR(record.date)}`,
      `Titulaire : ${record.name}`,
      `Opération : ${record.type}`,
      isCG && cg ? `Immatriculation : ${cg.numCars} (${cg.cv} CV)` : null,
      !isCG && pc && pc.numIdentite ? `N° d'Identité : ${pc.numIdentite}` : null,
      !isCG && pc ? `Catégories : ${pcCategories.join(', ')}` : null,
      isCG && cg?.type === 'EXO' ? `Quittance : Exonéré d'office` : `Quittance : ${record.numQuittance || cg?.numQuittance1 || 'N/A'}`,
      `Montant : ${record.montant === 0 ? 'Exonéré (0)' : `${record.montant.toLocaleString('fr-FR')} ${currency}`}`,
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      id="receipt-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-200"
        id="receipt-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-dialog-title"
      >
        {/* Top Action Toolbar (Non-printable) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200 print:hidden select-none">
          <div className="flex items-center space-x-2.5">
            <AppLogo size="sm" />
            <div>
              <h2 id="receipt-dialog-title" className="text-xs font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                <span>Fiche & Quittance Officielle</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100/80 text-blue-800 font-semibold">
                  N° {record.numSerial}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Prévisualisation certifiée • Trésorerie de la Préfecture
              </p>
            </div>
          </div>

          {/* Quick Header Buttons */}
          <div className="flex items-center space-x-2">
            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopyDetails}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                copied 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Copier les références textuelles du dossier"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? 'Copié !' : 'Copier'}</span>
            </button>

            {/* Edit Button (if onEdit callback provided) */}
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(record);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                title="Modifier ce dossier"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">Modifier</span>
              </button>
            )}

            {/* Print Button (Imprimer) */}
            <button
              type="button"
              id="btn-print-receipt-top"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-xs hover:shadow-md cursor-pointer"
              title="Imprimer le reçu officiel (Raccourci: Ctrl+P)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>

            {/* Exit Button (Quitter / Fermer) */}
            <button
              type="button"
              id="btn-exit-receipt-top"
              onClick={onClose}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors cursor-pointer"
              title="Fermer la vue (Raccourci: Échap)"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Quitter</span>
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-8 text-slate-800 font-sans relative overflow-y-auto max-h-[calc(85vh-130px)]" id="printable-receipt-content">
          
          {/* Subtle Watermark for authenticity */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
            <ShieldCheck className="w-80 h-80 text-slate-900" />
          </div>

          {/* Official Document Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-5">
            <div className="flex justify-center mb-2">
              <AppLogo size="sm" />
            </div>
            <div className="flex items-center justify-center space-x-3 mb-1">
              <span className="h-0.5 w-10 bg-slate-400 inline-block"></span>
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-600">
                RÉPUBLIQUE DE DJIBOUTI
              </h2>
              <span className="h-0.5 w-10 bg-slate-400 inline-block"></span>
            </div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Unité — Égalité — Paix
            </p>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
              Trésorerie De La Préfecture De Djibouti
            </h3>
            <p className="text-[11px] text-slate-600 font-medium">
              Direction des Titres de Circulation & Permis de Conduire
            </p>

            <div className="inline-block bg-slate-900 text-white text-[11px] font-mono px-4 py-1 rounded-full mt-3 font-bold tracking-wider shadow-xs">
              {isCG 
                ? "ATTESTATION DE REGISTRE & QUITTANCE CARTE GRISE (CG)" 
                : "QUITTANCE OFFICIELLE — DROITS DE PERMIS DE CONDUIRE (PC)"}
            </div>
          </div>

          {/* Key Reference Header Banner */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">
                NUMÉRO DE SÉRIE (6 CHIFFRES) :
              </span>
              <strong className="font-mono text-lg text-slate-900 font-black tracking-wider block mt-0.5">
                {record.numSerial}
              </strong>
              <span className="text-[10px] text-emerald-700 font-semibold inline-flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Dossier validé & répertorié
              </span>
            </div>

            <div className="text-right">
              <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">
                DATE D'ENREGISTREMENT :
              </span>
              <strong className="text-slate-900 font-bold text-sm block mt-0.5">
                {formatDateFR(record.date)}
              </strong>
              <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                Réf: DJ-TR-2026-{record.numSerial}
              </span>
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-2.5 text-xs mb-5">
            {/* Titulaire */}
            <div className="flex justify-between py-2 border-b border-slate-100 items-center">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Titulaire / Propriétaire :</span>
              </span>
              <strong className="text-slate-900 font-bold text-sm text-right">
                {record.name}
              </strong>
            </div>

            {/* Nature du Titre */}
            <div className="flex justify-between py-2 border-b border-slate-100 items-center">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                {isCG ? <Car className="w-3.5 h-3.5 text-blue-600" /> : <CreditCard className="w-3.5 h-3.5 text-emerald-600" />}
                <span>Nature du Titre :</span>
              </span>
              <span className="font-semibold text-slate-800">
                {isCG ? 'Carte Grise (Certificat d’Immatriculation Automobile)' : 'Permis de Conduire Biométrique'}
              </span>
            </div>

            {/* Type d'Opération */}
            <div className="flex justify-between py-2 border-b border-slate-100 items-center">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Type d'Opération :</span>
              </span>
              <div>
                {record.type === 'NORMAL' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                    NORMAL
                  </span>
                )}
                {record.type === 'DUPLICATA' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    DUPLICATA
                  </span>
                )}
                {record.type === 'EXO' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    EXONÉRÉ (EXO)
                  </span>
                )}
              </div>
            </div>

            {/* CG Specifics */}
            {isCG && cg && (
              <>
                <div className="flex justify-between py-2 border-b border-slate-100 items-center">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-slate-400" />
                    <span>Immatriculation (NUM_CARS) :</span>
                  </span>
                  <strong className="font-mono text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs font-black">
                    {cg.numCars}
                  </strong>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-100 items-center">
                  <span className="text-slate-500 font-medium">Puissance Fiscale :</span>
                  <strong className="text-slate-800 font-bold">
                    {cg.cv} CV {cg.type === 'DUPLICATA' ? '(Tarif réduit : 2 250 FDJ / CV)' : '(Tarif légal : 4 500 FDJ / CV)'}
                  </strong>
                </div>

                {/* CG Normal 2 Montants Breakdown */}
                {cg.type === 'NORMAL' && (
                  <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-950 space-y-1.5 my-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-blue-900 font-medium">• Taxe selon CV ({cg.cv} CV × 4 500 FDJ) :</span>
                      <strong className="font-mono font-bold">
                        {((cg.montantCV ?? cg.cv * 4500)).toLocaleString('fr-FR')} {currency}
                      </strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-blue-900 font-medium">• Frais de dossier administratifs :</span>
                      <strong className="font-mono font-bold">
                        {((cg.montantDossier ?? (cg.montant - (cg.montantCV ?? cg.cv * 4500)))).toLocaleString('fr-FR')} {currency}
                      </strong>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* PC Specifics */}
            {!isCG && pc && (
              <>
                <div className="flex justify-between py-2 border-b border-slate-100 items-center">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    <span>N° Pièce d'Identité (NUM_IDENTITE) :</span>
                  </span>
                  <strong className="font-mono text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs font-black">
                    {pc.numIdentite || 'N/A'}
                  </strong>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-100 items-center">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Catégories Accordées :</span>
                  </span>
                  <div className="flex items-center space-x-1.5">
                    {pcCategories.map((c) => (
                      <span 
                        key={c}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200"
                      >
                        {c}
                      </span>
                    ))}
                    <span className="text-[11px] text-slate-500 ml-1">
                      ({pcCategories.length} catégorie{pcCategories.length > 1 ? 's' : ''})
                    </span>
                  </div>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-100 items-center">
                  <span className="text-slate-500 font-medium">Barème Légal Appliqué :</span>
                  <span className="text-slate-700 font-semibold font-mono text-[11px]">
                    {pc.type === 'NORMAL'
                      ? `${pcCategories.length} cat. × 7 000 ${currency} = ${record.montant.toLocaleString('fr-FR')} ${currency}`
                      : `${pcCategories.length} cat. × 5 000 ${currency} (Duplicata) = ${record.montant.toLocaleString('fr-FR')} ${currency}`}
                  </span>
                </div>
              </>
            )}

            {/* Quittance Details */}
            <div className="py-2.5 border-b border-slate-200 space-y-1.5">
              <span className="text-slate-500 font-bold block text-[11px] uppercase tracking-wider">
                Références de Quittance :
              </span>
              {isCG && cg?.type === 'EXO' ? (
                <div className="flex items-center space-x-2 text-amber-900 font-bold bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                  <Ban className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-[11px]">EXONÉRATION D'OFFICE — AUCUNE QUITTANCE REQUISE</span>
                </div>
              ) : isCG && cg?.type === 'NORMAL' ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-semibold">Quittance 1 (Taxe CV) :</span>
                    <strong className="font-mono text-xs text-slate-900 font-black block mt-0.5">
                      {cg?.numQuittance1 || cg?.numQuittance?.split('/')[0]?.trim() || 'N/A'}
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-semibold">Quittance 2 (Frais dossier) :</span>
                    <strong className="font-mono text-xs text-slate-900 font-black block mt-0.5">
                      {cg?.numQuittance2 || cg?.numQuittance?.split('/')[1]?.trim() || 'N/A'}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 inline-block min-w-[200px]">
                  <span className="text-[10px] text-slate-500 block font-semibold">Numéro de Quittance :</span>
                  <strong className="font-mono text-xs text-slate-900 font-black block mt-0.5">
                    {isCG ? cg?.numQuittance1 || cg?.numQuittance || 'N/A' : pc?.numQuittance || 'N/A'}
                  </strong>
                </div>
              )}
            </div>

            {/* Montant Payé */}
            <div className="flex justify-between py-3.5 px-4 items-center bg-slate-900 text-white rounded-xl shadow-xs mt-3">
              <div>
                <span className="font-semibold text-slate-300 text-xs block">
                  Montant Total des Droits Liquidés :
                </span>
                <span className="text-[10px] text-slate-400">
                  {record.montant === 0 ? 'Exonération intégrale validée' : 'Trésor Public de Djibouti'}
                </span>
              </div>
              <strong className="text-lg sm:text-xl font-black font-mono tracking-tight">
                {record.montant === 0 
                  ? '0 ' + currency + ' (EXO)' 
                  : formatCurrency(record.montant, currency)}
              </strong>
            </div>

            {record.notes && (
              <div className="py-2 px-3 rounded-lg bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 mt-2">
                <span className="font-bold">Observation :</span> {record.notes}
              </div>
            )}
          </div>

          {/* Official Signatures & Seal Section */}
          <div className="mt-7 pt-5 border-t-2 border-dashed border-slate-300 grid grid-cols-2 gap-6 text-xs">
            <div>
              <p className="font-bold text-slate-800">L'Agent Percepteur / Caissier :</p>
              <p className="text-[10px] text-slate-500">
                {currentUserName ? `Par : ${currentUserName}` : 'Trésorerie de la Préfecture'}
              </p>
              <div className="h-16 mt-2 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-[10px] text-slate-400 bg-slate-50/50">
                <span>Visa et Cachet Officiel</span>
              </div>
            </div>

            <div className="text-right">
              <p className="font-bold text-slate-800">Le Régisseur des Titres :</p>
              <p className="text-[10px] text-slate-500">Préfecture de Djibouti</p>
              <div className="h-16 mt-2 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-[10px] text-slate-400 bg-slate-50/50">
                <span>Signature et Sceau de l'État</span>
              </div>
            </div>
          </div>

          {/* Legal Stamp & Document Verification Notice */}
          <div className="mt-6 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 space-y-1">
            <p>
              Document officiel certifié conforme au Registre National Informatisé des Cartes Grises & Permis.
            </p>
            <p className="font-mono text-[9px] text-slate-400">
              Imprimé le {printTimestamp || 'ce jour'} • ID: {record.id}
            </p>
          </div>
        </div>

        {/* Bottom Action Footer (Non-printable) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 border-t border-slate-200 print:hidden select-none">
          <div className="text-[11px] text-slate-500 flex items-center space-x-2">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>
              Raccourcis : <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px]">Échap</kbd> pour quitter • <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px]">Ctrl+P</kbd> pour imprimer
            </span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            {/* Exit Button (Quitter) */}
            <button
              type="button"
              id="btn-exit-receipt-bottom"
              onClick={onClose}
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-500 rotate-180" />
              <span>Quitter (Échap)</span>
            </button>

            {/* Edit Button */}
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(record);
                }}
                className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-colors shadow-2xs cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-amber-700" />
                <span>Modifier</span>
              </button>
            )}

            {/* Print Button (Imprimer le reçu) */}
            <button
              type="button"
              id="btn-print-receipt-bottom"
              onClick={handlePrint}
              className="inline-flex items-center justify-center space-x-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer le reçu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
