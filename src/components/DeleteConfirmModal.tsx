import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { RegistryRecord } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  record: RegistryRecord | null;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  record,
}) => {
  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
        id="delete-confirm-dialog"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h3 className="text-base font-bold text-slate-900">
          Confirmer la suppression
        </h3>
        
        <p className="text-xs text-slate-600 mt-2">
          Êtes-vous sûr de vouloir supprimer définitivement ce dossier du registre ?
        </p>

        <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Registre :</span>
            <span className="font-bold text-slate-800">
              {record.recordType === 'CG' ? 'Carte Grise (CG)' : 'Permis de Conduire (PC)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">N° Série :</span>
            <span className="font-mono font-bold text-slate-900">{record.numSerial}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Titulaire :</span>
            <span className="font-semibold text-slate-900">{record.name}</span>
          </div>
        </div>

        <p className="text-[11px] text-red-600 mb-5">
          Cette action est irréversible et supprimera le dossier des statistiques d'analyse.
        </p>

        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            id="btn-confirm-delete"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-xs flex items-center space-x-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Supprimer le dossier</span>
          </button>
        </div>
      </div>
    </div>
  );
};
