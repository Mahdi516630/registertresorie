import React from 'react';
import { X, Printer, ShieldCheck, Ban, Layers, Receipt } from 'lucide-react';
import { RegistryRecord, CGRecord, PCRecord } from '../types';
import { formatCurrency, formatDateFR } from '../utils/formatters';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: RegistryRecord | null;
  currency: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  record,
  currency,
}) => {
  if (!isOpen || !record) return null;

  const isCG = record.recordType === 'CG';
  const cg = isCG ? (record as CGRecord) : null;
  const pc = !isCG ? (record as PCRecord) : null;

  const handlePrint = () => {
    window.print();
  };

  const pcCategories = pc?.categories && pc.categories.length > 0
    ? pc.categories
    : pc?.categorie
      ? [pc.categorie]
      : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden"
        id="receipt-modal-dialog"
      >
        {/* Modal Toolbar (Non-printable) */}
        <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200 print:hidden">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Fiche Officielle de Quittance & Enregistrement</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              id="btn-print-receipt"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer le reçu</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 text-slate-800 font-sans relative" id="printable-receipt-content">
          
          {/* Subtle Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
            <ShieldCheck className="w-96 h-96 text-slate-900" />
          </div>

          {/* Official Document Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
              RÉPUBLIQUE DE DJIBOUTI
            </h2>
            <h3 className="text-base font-bold text-slate-900 tracking-tight mt-1 uppercase">
              Trésorie De La Préfecture De Djibouti • Djibouti
            </h3>
            <div className="inline-block bg-slate-900 text-white text-[11px] font-mono px-3 py-0.5 rounded-full mt-2 font-bold tracking-wider">
              {isCG ? "ATTESTATION DE REGISTRE CARTE GRISE (CG)" : "QUITTANCE OFFICIELLE — PERMIS DE CONDUIRE (PC)"}
            </div>
          </div>

          {/* Key Reference Header */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">NUMÉRO DE SÉRIE (6 CHIFFRES) :</span>
              <strong className="font-mono text-base text-slate-900 font-black tracking-wider">
                {record.numSerial}
              </strong>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[11px]">DATE D'ENREGISTREMENT :</span>
              <strong className="text-slate-900 font-bold">
                {formatDateFR(record.date)}
              </strong>
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-3 text-xs mb-6">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Titulaire / Propriétaire :</span>
              <strong className="text-slate-900 font-bold">{record.name}</strong>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Nature du Titre :</span>
              <span className="font-semibold text-slate-800">
                {isCG ? 'Carte Grise (Certificat d’Immatriculation)' : 'Permis de Conduire Biométrique'}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Type d'Opération :</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800">
                {record.type}
              </span>
            </div>

            {/* CG Specifics */}
            {isCG && cg && (
              <>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Immatriculation / Plaque (NUM_CARS) :</span>
                  <strong className="font-mono text-blue-800 font-bold">{cg.numCars}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Puissance Fiscale (CV) :</span>
                  <strong className="text-slate-800 font-bold">
                    {cg.cv} CV {cg.type === 'DUPLICATA' ? '(Tarif moitié prix : 2 250 FDJ/CV)' : '(Tarif normal : 4 500 FDJ/CV)'}
                  </strong>
                </div>

                {/* CG Normal 2 Montants Breakdown */}
                {cg.type === 'NORMAL' && (
                  <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 text-blue-950 space-y-1 my-2">
                    <div className="flex justify-between text-[11px]">
                      <span>• Montant selon CV ({cg.cv} × 4 500) :</span>
                      <strong className="font-mono">
                        {((cg.montantCV ?? cg.cv * 4500)).toLocaleString('fr-FR')} {currency}
                      </strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>• Frais de dossier (Barème FDJ) :</span>
                      <strong className="font-mono">
                        {((cg.montantDossier ?? (cg.montant - (cg.montantCV ?? cg.cv * 4500)))).toLocaleString('fr-FR')} {currency}
                      </strong>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* PC Specifics with multiple categories */}
            {!isCG && pc && (
              <>
                <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
                  <span className="text-slate-500">Catégories Accordées :</span>
                  <div className="flex items-center space-x-1">
                    {pcCategories.map((c) => (
                      <span 
                        key={c}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-black bg-emerald-100 text-emerald-800"
                      >
                        {c}
                      </span>
                    ))}
                    <span className="text-[11px] text-slate-500 ml-1">
                      ({pcCategories.length} catégorie{pcCategories.length > 1 ? 's' : ''})
                    </span>
                  </div>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Barème appliqué :</span>
                  <span className="text-slate-700 font-medium">
                    {pc.type === 'NORMAL'
                      ? `${pcCategories.length} cat. × 7 000 ${currency} = ${record.montant.toLocaleString('fr-FR')} ${currency}`
                      : `${pcCategories.length} cat. × 5 000 ${currency} (Duplicata) = ${record.montant.toLocaleString('fr-FR')} ${currency}`}
                  </span>
                </div>
              </>
            )}

            {/* Quittance Details */}
            <div className="py-2 border-b border-slate-200 space-y-1.5">
              <span className="text-slate-500 font-medium block">Références de Quittance :</span>
              {isCG && cg?.type === 'EXO' ? (
                <span className="inline-flex items-center space-x-1 text-amber-800 font-bold bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                  <Ban className="w-3.5 h-3.5" />
                  <span>AUCUNE QUITTANCE REQUISE (EXONÉRÉ D'OFFICE)</span>
                </span>
              ) : isCG && cg?.type === 'NORMAL' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Quittance 1 (Taxe CV) :</span>
                    <strong className="font-mono text-xs text-slate-900 font-bold">
                      {cg?.numQuittance1 || cg?.numQuittance?.split('/')[0]?.trim() || 'N/A'}
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Quittance 2 (Frais dossier) :</span>
                    <strong className="font-mono text-xs text-slate-900 font-bold">
                      {cg?.numQuittance2 || cg?.numQuittance?.split('/')[1]?.trim() || 'N/A'}
                    </strong>
                  </div>
                </div>
              ) : (
                <strong className="font-mono text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md font-bold inline-block">
                  {isCG ? cg?.numQuittance1 || cg?.numQuittance || 'N/A' : pc?.numQuittance || 'N/A'}
                </strong>
              )}
            </div>

            {/* Montant Payé */}
            <div className="flex justify-between py-3 items-center text-sm bg-slate-50 px-3 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-700">Montant Total des Droits :</span>
              <strong className="text-base font-extrabold text-slate-900">
                {record.montant === 0 
                  ? '0 ' + currency + ' (EXONÉRATION TOTALE)' 
                  : formatCurrency(record.montant, currency)}
              </strong>
            </div>

            {record.notes && (
              <div className="py-2 text-[11px] text-slate-500 italic">
                Note / Observation : {record.notes}
              </div>
            )}
          </div>

          {/* Signatures & Seal Box */}
          <div className="mt-8 pt-6 border-t border-dashed border-slate-300 grid grid-cols-2 gap-8 text-xs">
            <div>
              <p className="font-bold text-slate-700">L'Agent Percepteur / Caissier :</p>
              <div className="h-16 mt-2 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-[10px] text-slate-400">
                Cachet et Visa
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-700">Le Régisseur des Titres :</p>
              <div className="h-16 mt-2 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-[10px] text-slate-400">
                Signature et Sceau
              </div>
            </div>
          </div>

          {/* Footer Warning */}
          <div className="mt-6 text-center text-[10px] text-slate-400">
            Document officiel certifié conforme au registre national informatisé. Conserver précieusement.
          </div>
        </div>
      </div>
    </div>
  );
};
