import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Car, 
  CreditCard, 
  Eye, 
  Edit3, 
  Trash2, 
  RotateCcw,
  ArrowUpDown,
  FileText,
  Ban,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  RegistryRecord, 
  CGRecord, 
  PCRecord, 
  RecordType, 
  PCCategory 
} from '../types';
import { formatCurrency, formatDateFR, MONTHS_FR } from '../utils/formatters';

interface RecordsTableProps {
  records: RegistryRecord[];
  onEdit: (record: RegistryRecord) => void;
  onDelete: (record: RegistryRecord) => void;
  onViewReceipt: (record: RegistryRecord) => void;
  currency: string;
  onAddNew: (type: RecordType) => void;
}

export const RecordsTable: React.FC<RecordsTableProps> = ({
  records,
  onEdit,
  onDelete,
  onViewReceipt,
  currency,
  onAddNew,
}) => {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecordType, setSelectedRecordType] = useState<'ALL' | 'CG' | 'PC'>('ALL');
  const [selectedOperationType, setSelectedOperationType] = useState<'ALL' | 'NORMAL' | 'DUPLICATA' | 'EXO'>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | PCCategory>('ALL');

  // Sorting
  const [sortField, setSortField] = useState<'date' | 'numSerial' | 'name' | 'montant'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Available years from dataset
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const yr = r.date.split('-')[0];
      if (yr) set.add(yr);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [records]);

  // Filtering logic
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Search filter across numSerial, name, numCars, numQuittance, categories
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSerial = r.numSerial.toLowerCase().includes(q);
        const matchesName = r.name.toLowerCase().includes(q);
        let matchesCars = false;
        let matchesQuittance = false;
        let matchesCategory = false;

        if (r.recordType === 'CG') {
          const cg = r as CGRecord;
          matchesCars = cg.numCars.toLowerCase().includes(q);
          matchesQuittance = (
            (!!cg.numQuittance && cg.numQuittance.toLowerCase().includes(q)) ||
            (!!cg.numQuittance1 && cg.numQuittance1.toLowerCase().includes(q)) ||
            (!!cg.numQuittance2 && cg.numQuittance2.toLowerCase().includes(q))
          );
        } else {
          const pc = r as PCRecord;
          matchesQuittance = !!pc.numQuittance && pc.numQuittance.toLowerCase().includes(q);
          const cats = pc.categories || (pc.categorie ? [pc.categorie] : []);
          matchesCategory = cats.some((c) => c.toLowerCase().includes(q));
        }

        if (!matchesSerial && !matchesName && !matchesCars && !matchesQuittance && !matchesCategory) {
          return false;
        }
      }

      // 2. Filter by Record Type (CG / PC)
      if (selectedRecordType !== 'ALL' && r.recordType !== selectedRecordType) {
        return false;
      }

      // 3. Filter by Operation Type (NORMAL / DUPLICATA / EXO)
      if (selectedOperationType !== 'ALL' && r.type !== selectedOperationType) {
        return false;
      }

      // 4. Date Year filter
      const [yr, mo] = r.date.split('-');
      if (selectedYear !== 'ALL' && yr !== selectedYear) {
        return false;
      }

      // 5. Date Month filter
      if (selectedMonth !== 'ALL' && mo !== selectedMonth) {
        return false;
      }

      // 6. Category filter (PC only)
      if (selectedCategory !== 'ALL') {
        if (r.recordType !== 'PC') return false;
        const pc = r as PCRecord;
        const cats = pc.categories && pc.categories.length > 0
          ? pc.categories
          : (pc.categorie ? [pc.categorie] : []);
        if (!cats.includes(selectedCategory)) return false;
      }

      return true;
    });
  }, [
    records,
    searchQuery,
    selectedRecordType,
    selectedOperationType,
    selectedYear,
    selectedMonth,
    selectedCategory,
  ]);

  // Sorting logic
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = a.date.localeCompare(b.date);
      } else if (sortField === 'numSerial') {
        comparison = a.numSerial.localeCompare(b.numSerial);
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'montant') {
        comparison = a.montant - b.montant;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredRecords, sortField, sortOrder]);

  // Paginated records
  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedRecords.slice(start, start + itemsPerPage);
  }, [sortedRecords, currentPage, itemsPerPage]);

  const handleSort = (field: 'date' | 'numSerial' | 'name' | 'montant') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedRecordType('ALL');
    setSelectedOperationType('ALL');
    setSelectedYear('ALL');
    setSelectedMonth('ALL');
    setSelectedCategory('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedRecordType !== 'ALL' ||
    selectedOperationType !== 'ALL' ||
    selectedYear !== 'ALL' ||
    selectedMonth !== 'ALL' ||
    selectedCategory !== 'ALL';

  return (
    <div className="space-y-4" id="records-registry-section">
      {/* Filter and Search Bar Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        
        {/* Top Row: Search input + Category Type Pills */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Real-time search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              id="registry-search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Rechercher par N° Série, Nom, Plaque (numCars), Quittance..."
              className="w-full text-xs rounded-lg border border-slate-300 pl-9 pr-3 py-2 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-slate-600 absolute right-3 top-2.5"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Register Type Selector Pills */}
          <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              id="filter-type-all"
              onClick={() => {
                setSelectedRecordType('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition-all ${
                selectedRecordType === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous ({records.length})
            </button>

            <button
              type="button"
              id="filter-type-cg"
              onClick={() => {
                setSelectedRecordType('CG');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center space-x-1 ${
                selectedRecordType === 'CG'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Cartes Grises ({records.filter(r => r.recordType === 'CG').length})</span>
            </button>

            <button
              type="button"
              id="filter-type-pc"
              onClick={() => {
                setSelectedRecordType('PC');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center space-x-1 ${
                selectedRecordType === 'PC'
                  ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Permis ({records.filter(r => r.recordType === 'PC').length})</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Detailed Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          
          {/* Operation Type Dropdown */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-500 font-medium">Opération :</span>
            <select
              aria-label="Filtrer par type d'opération"
              value={selectedOperationType}
              onChange={(e) => {
                setSelectedOperationType(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 text-slate-700 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
            >
              <option value="ALL">Toutes</option>
              <option value="NORMAL">NORMAL</option>
              <option value="DUPLICATA">DUPLICATA</option>
              {selectedRecordType !== 'PC' && <option value="EXO">EXO (Exonéré)</option>}
            </select>
          </div>

          {/* Year Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-500 font-medium">Année :</span>
            <select
              aria-label="Filtrer par année"
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 text-slate-700 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
            >
              <option value="ALL">Toutes les années</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-500 font-medium">Mois :</span>
            <select
              aria-label="Filtrer par mois"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 text-slate-700 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
            >
              <option value="ALL">Tous les mois</option>
              {MONTHS_FR.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* PC Category Filter (visible if PC is relevant) */}
          {selectedRecordType !== 'CG' && (
            <div className="flex items-center space-x-1">
              <span className="text-slate-500 font-medium">Catégorie PC :</span>
              <select
                aria-label="Filtrer par catégorie permis"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 text-slate-700 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
              >
                <option value="ALL">Toutes (A-G)</option>
                <option value="A">Catégorie A</option>
                <option value="B">Catégorie B</option>
                <option value="C">Catégorie C</option>
                <option value="D">Catégorie D</option>
                <option value="E">Catégorie E</option>
                <option value="F">Catégorie F</option>
                <option value="G">Catégorie G</option>
              </select>
            </div>
          )}

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center space-x-1 text-slate-500 hover:text-red-600 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors ml-auto font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Réinitialiser les filtres</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Registry Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse" id="records-main-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold select-none">
                <th className="py-3 px-3 w-12 text-center">Type</th>
                <th 
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('numSerial')}
                >
                  <div className="flex items-center space-x-1">
                    <span>N° Série</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Bénéficiaire / Propriétaire</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Détails Spécifiques</th>
                <th className="py-3 px-3">Opération</th>
                <th className="py-3 px-3">N° Quittance</th>
                <th 
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                  onClick={() => handleSort('montant')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Montant</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center w-28">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((r) => {
                  const isCG = r.recordType === 'CG';
                  const cg = isCG ? (r as CGRecord) : null;
                  const pc = !isCG ? (r as PCRecord) : null;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Type Badge */}
                      <td className="py-3 px-3 text-center">
                        {isCG ? (
                          <span 
                            title="Carte Grise (CG)"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-extrabold text-[11px]"
                          >
                            CG
                          </span>
                        ) : (
                          <span 
                            title="Permis de Conduire (PC)"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-[11px]"
                          >
                            PC
                          </span>
                        )}
                      </td>

                      {/* Num Serial */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {r.numSerial}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {formatDateFR(r.date)}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 max-w-[200px] truncate">
                          {r.name}
                        </div>
                        {r.notes && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                            {r.notes}
                          </div>
                        )}
                      </td>

                      {/* Specific Details */}
                      <td className="py-3 px-3">
                        {isCG && cg ? (
                          <div className="space-y-0.5">
                            <span className="inline-block font-mono font-bold text-[11px] text-blue-900 bg-blue-50/80 px-1.5 py-0.5 rounded-sm border border-blue-200">
                              {cg.numCars}
                            </span>
                            <span className="text-[11px] text-slate-500 block font-medium">
                              {cg.cv} CV {cg.type === 'DUPLICATA' ? '(2 250 FDJ/CV)' : cg.type === 'NORMAL' ? '(4 500 FDJ/CV)' : ''}
                            </span>
                          </div>
                        ) : pc ? (
                          <div>
                            {(() => {
                              const cats = pc.categories && pc.categories.length > 0
                                ? pc.categories
                                : (pc.categorie ? [pc.categorie] : []);
                              return (
                                <div className="space-y-0.5">
                                  <div className="flex flex-wrap gap-1">
                                    {cats.map((c) => (
                                      <span
                                        key={c}
                                        className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono"
                                      >
                                        {c}
                                      </span>
                                    ))}
                                  </div>
                                  <span className="text-[10px] text-slate-500 block">
                                    {cats.length} catégorie{cats.length > 1 ? 's' : ''}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        ) : null}
                      </td>

                      {/* Operation Type Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {r.type === 'NORMAL' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            NORMAL
                          </span>
                        )}
                        {r.type === 'DUPLICATA' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                            DUPLICATA
                          </span>
                        )}
                        {r.type === 'EXO' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            EXO
                          </span>
                        )}
                      </td>

                      {/* Quittance */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isCG && cg?.type === 'EXO' ? (
                          <span className="inline-flex items-center space-x-1 text-[11px] text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            <Ban className="w-3 h-3 text-amber-600" />
                            <span>Sans quittance</span>
                          </span>
                        ) : isCG && cg?.type === 'NORMAL' && (cg.numQuittance1 || cg.numQuittance2) ? (
                          <div className="space-y-0.5 text-[11px]">
                            {cg.numQuittance1 && (
                              <div className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-xs font-semibold">
                                <span className="text-slate-400 text-[10px] mr-1">Q1:</span>
                                {cg.numQuittance1}
                              </div>
                            )}
                            {cg.numQuittance2 && (
                              <div className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-xs font-semibold">
                                <span className="text-slate-400 text-[10px] mr-1">Q2:</span>
                                {cg.numQuittance2}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-sm text-[11px] font-semibold">
                            {isCG ? cg?.numQuittance1 || cg?.numQuittance || '-' : pc?.numQuittance || '-'}
                          </span>
                        )}
                      </td>

                      {/* Montant */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className={`font-bold block ${
                          r.montant === 0 ? 'text-amber-700 font-semibold' : 'text-slate-900'
                        }`}>
                          {r.montant === 0 ? 'Exonéré (0)' : formatCurrency(r.montant, currency)}
                        </span>
                        {isCG && cg?.type === 'NORMAL' && (cg.montantCV !== undefined || cg.montantDossier !== undefined) && (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            CV: {(cg.montantCV ?? (cg.cv * 4500)).toLocaleString('fr-FR')} + Dos: {(cg.montantDossier ?? 0).toLocaleString('fr-FR')}
                          </span>
                        )}
                        {!isCG && pc && (
                          <span className="text-[10px] text-emerald-600 font-mono block">
                            {pc.categories?.length || 1} cat. × {pc.type === 'DUPLICATA' ? '5 000' : '7 000'} {currency}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            title="Voir et Imprimer la Quittance / Fiche"
                            onClick={() => onViewReceipt(r)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Modifier ce dossier"
                            onClick={() => onEdit(r)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Supprimer ce dossier"
                            onClick={() => onDelete(r)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <FileText className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">
                        Aucun enregistrement trouvé
                      </p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        {records.length === 0
                          ? "Le registre est prêt et connecté à la base de données. Aucun dossier non répertorié n'est affiché."
                          : "Aucun dossier ne correspond aux critères de recherche actuels."}
                      </p>
                      {hasActiveFilters ? (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Effacer tous les filtres
                        </button>
                      ) : (
                        <div className="flex space-x-2 pt-2">
                          <button
                            type="button"
                            onClick={() => onAddNew('CG')}
                            className="text-xs font-bold text-blue-600 hover:underline"
                          >
                            + Créer une Carte Grise
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => onAddNew('PC')}
                            className="text-xs font-bold text-emerald-600 hover:underline"
                          >
                            + Créer un Permis
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Affichage de{' '}
            <strong className="text-slate-800 font-semibold">
              {paginatedRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
            </strong>{' '}
            à{' '}
            <strong className="text-slate-800 font-semibold">
              {Math.min(currentPage * itemsPerPage, sortedRecords.length)}
            </strong>{' '}
            sur <strong className="text-slate-800 font-semibold">{sortedRecords.length}</strong> dossiers
            {sortedRecords.length !== records.length && ` (filtrés sur ${records.length} au total)`}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center space-x-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="p-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="px-2 font-medium text-slate-700">
                Page {currentPage} sur {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="p-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
