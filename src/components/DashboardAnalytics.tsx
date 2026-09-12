import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  Car, 
  CreditCard, 
  ShieldAlert, 
  Award, 
  FileCheck2,
  PieChart,
  Layers,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { RegistryRecord, CGRecord, PCRecord, PCCategory } from '../types';
import { formatCurrency, MONTHS_FR } from '../utils/formatters';

interface DashboardAnalyticsProps {
  records: RegistryRecord[];
  currency: string;
}

export const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({ records, currency }) => {
  // Available years from records
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    records.forEach((r) => {
      const yr = r.date.split('-')[0];
      if (yr) yearsSet.add(yr);
    });
    const sorted = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
    return sorted.length > 0 ? sorted : [new Date().getFullYear().toString()];
  }, [records]);

  // Selected time mode: 'year' (analyzes all months of a year) or 'month' (analyzes specific month) or 'all'
  const [viewMode, setViewMode] = useState<'year' | 'month' | 'all'>('year');
  const [selectedYear, setSelectedYear] = useState<string>(availableYears[0] || '2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  // Filter records based on selected time horizon
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const [year, month] = r.date.split('-');
      if (viewMode === 'all') return true;
      if (selectedYear !== 'ALL' && year !== selectedYear) return false;
      if (viewMode === 'month' && selectedMonth !== 'ALL' && month !== selectedMonth) return false;
      return true;
    });
  }, [records, viewMode, selectedYear, selectedMonth]);

  // General KPIs computation
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let cgCount = 0;
    let pcCount = 0;
    let cgRevenue = 0;
    let cgRevenueCV = 0;
    let cgRevenueDossier = 0;
    let pcRevenue = 0;
    let normalCount = 0;
    let duplicataCount = 0;
    let exoCount = 0;
    let theoreticalExoSavings = 0;

    const pcCategoryCounts: Record<PCCategory, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      E: 0,
      F: 0,
      G: 0,
    };

    const cvBrackets = {
      '1 - 4 CV': 0,
      '5 - 7 CV': 0,
      '8 - 10 CV': 0,
      '11 - 15 CV': 0,
      '16+ CV': 0,
    };

    filteredRecords.forEach((r) => {
      totalRevenue += r.montant;

      if (r.recordType === 'CG') {
        const cg = r as CGRecord;
        cgCount++;
        cgRevenue += cg.montant;

        const cvTax = cg.montantCV ?? (cg.type === 'NORMAL' ? cg.cv * 4500 : cg.type === 'DUPLICATA' ? cg.cv * 2250 : 0);
        const dossierFee = cg.montantDossier ?? Math.max(0, cg.montant - cvTax);
        cgRevenueCV += cvTax;
        cgRevenueDossier += dossierFee;

        if (cg.type === 'NORMAL') normalCount++;
        else if (cg.type === 'DUPLICATA') duplicataCount++;
        else if (cg.type === 'EXO') {
          exoCount++;
          // Official rule: 1 CV = 4500 FDJ in Normal CG
          theoreticalExoSavings += (cg.cv * 4500);
        }

        // Bracket CV
        if (cg.cv <= 4) cvBrackets['1 - 4 CV']++;
        else if (cg.cv <= 7) cvBrackets['5 - 7 CV']++;
        else if (cg.cv <= 10) cvBrackets['8 - 10 CV']++;
        else if (cg.cv <= 15) cvBrackets['11 - 15 CV']++;
        else cvBrackets['16+ CV']++;
      } else {
        const pc = r as PCRecord;
        pcCount++;
        pcRevenue += pc.montant;

        if (pc.type === 'NORMAL') normalCount++;
        else if (pc.type === 'DUPLICATA') duplicataCount++;

        // Multiple categories support: count all categories
        const cats = pc.categories && pc.categories.length > 0
          ? pc.categories
          : (pc.categorie ? [pc.categorie] : []);
        cats.forEach((cat) => {
          if (pcCategoryCounts[cat] !== undefined) {
            pcCategoryCounts[cat]++;
          }
        });
      }
    });

    const totalCount = filteredRecords.length;
    const avgTicket = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;

    return {
      totalRevenue,
      totalCount,
      cgCount,
      pcCount,
      cgRevenue,
      cgRevenueCV,
      cgRevenueDossier,
      pcRevenue,
      normalCount,
      duplicataCount,
      exoCount,
      theoreticalExoSavings,
      avgTicket,
      pcCategoryCounts,
      cvBrackets,
    };
  }, [filteredRecords]);

  // Monthly breakdown for selected year (all 12 months)
  const monthlyData = useMemo(() => {
    const yearToAnalyze = viewMode === 'all' ? (availableYears[0] || '2026') : selectedYear;
    const monthsArray = MONTHS_FR.map((m) => ({
      code: m.value,
      name: m.label,
      cgRevenue: 0,
      pcRevenue: 0,
      totalRevenue: 0,
      cgCount: 0,
      pcCount: 0,
      totalCount: 0,
    }));

    records.forEach((r) => {
      const [year, month] = r.date.split('-');
      if (year === yearToAnalyze) {
        const target = monthsArray.find((m) => m.code === month);
        if (target) {
          target.totalCount++;
          target.totalRevenue += r.montant;
          if (r.recordType === 'CG') {
            target.cgCount++;
            target.cgRevenue += r.montant;
          } else {
            target.pcCount++;
            target.pcRevenue += r.montant;
          }
        }
      }
    });

    const maxMonthlyRevenue = Math.max(...monthsArray.map((m) => m.totalRevenue), 1);
    return { monthsArray, maxMonthlyRevenue, yearAnalyzed: yearToAnalyze };
  }, [records, selectedYear, viewMode, availableYears]);

  // Annual comparison breakdown
  const yearlyData = useMemo(() => {
    const map = new Map<string, { year: string; cgRev: number; pcRev: number; totalRev: number; count: number }>();

    records.forEach((r) => {
      const [yr] = r.date.split('-');
      if (!map.has(yr)) {
        map.set(yr, { year: yr, cgRev: 0, pcRev: 0, totalRev: 0, count: 0 });
      }
      const item = map.get(yr)!;
      item.count++;
      item.totalRev += r.montant;
      if (r.recordType === 'CG') {
        item.cgRev += r.montant;
      } else {
        item.pcRev += r.montant;
      }
    });

    return Array.from(map.values()).sort((a, b) => a.year.localeCompare(b.year));
  }, [records]);

  return (
    <div className="space-y-6 pb-12" id="analytics-dashboard">
      {/* Top Filter Bar: Controls for Period (Year vs Month) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Tableau de Bord Analytique
              </h2>
              <p className="text-xs text-slate-500">
                Analyses des recettes et enregistrements par Mois ou Année
              </p>
            </div>
          </div>

          {/* Period Selection Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setViewMode('year');
                  setSelectedMonth('ALL');
                }}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  viewMode === 'year'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Par Année
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode('month');
                  if (selectedMonth === 'ALL') setSelectedMonth('08');
                }}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  viewMode === 'month'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Par Mois
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode('all');
                  setSelectedYear('ALL');
                  setSelectedMonth('ALL');
                }}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  viewMode === 'all'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Global (Tout)
              </button>
            </div>

            {/* Year Dropdown */}
            {viewMode !== 'all' && (
              <div className="flex items-center space-x-1.5 text-xs">
                <span className="text-slate-500 font-medium">Année:</span>
                <select
                  aria-label="Sélectionner l'année"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-white border border-slate-300 font-semibold text-slate-800 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Month Dropdown (shown when in month mode) */}
            {viewMode === 'month' && (
              <div className="flex items-center space-x-1.5 text-xs">
                <span className="text-slate-500 font-medium">Mois:</span>
                <select
                  aria-label="Sélectionner le mois"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-white border border-slate-300 font-semibold text-slate-800 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="ALL">Tous les mois</option>
                  {MONTHS_FR.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Revenue */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Recettes Totales
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {formatCurrency(stats.totalRevenue, currency)}
              </span>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>CG: {formatCurrency(stats.cgRevenue, currency)}</span>
            <span className="text-slate-300">•</span>
            <span>PC: {formatCurrency(stats.pcRevenue, currency)}</span>
          </div>
        </div>

        {/* Total Dossiers Enregistrés */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Dossiers
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <FileCheck2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {stats.totalCount}
              </span>
              <span className="ml-2 text-xs font-medium text-slate-500">
                opérations
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-blue-700 font-medium">{stats.cgCount} CG ({stats.totalCount > 0 ? Math.round((stats.cgCount / stats.totalCount) * 100) : 0}%)</span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 font-medium">{stats.pcCount} PC ({stats.totalCount > 0 ? Math.round((stats.pcCount / stats.totalCount) * 100) : 0}%)</span>
          </div>
        </div>

        {/* Cartes Grises Breakdown */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Cartes Grises (CG)
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Car className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-blue-700">
                {stats.cgCount}
              </span>
              <span className="text-xs font-semibold text-slate-600">
                {formatCurrency(stats.cgRevenue, currency)}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-500">
            <div className="flex items-center justify-between">
              <span>Taxe CV : <strong className="text-slate-700 font-mono">{formatCurrency(stats.cgRevenueCV, currency)}</strong></span>
              <span>Dossier : <strong className="text-slate-700 font-mono">{formatCurrency(stats.cgRevenueDossier, currency)}</strong></span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Normal: {filteredRecords.filter(r => r.recordType === 'CG' && r.type === 'NORMAL').length} • Dupl.: {filteredRecords.filter(r => r.recordType === 'CG' && r.type === 'DUPLICATA').length}</span>
              <span className="text-amber-700 font-semibold">Exo: {stats.exoCount}</span>
            </div>
          </div>
        </div>

        {/* Permis de Conduire Breakdown */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Permis Conduire (PC)
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-emerald-700">
                {stats.pcCount}
              </span>
              <span className="text-xs font-semibold text-slate-600">
                {formatCurrency(stats.pcRevenue, currency)}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Normal: {filteredRecords.filter(r => r.recordType === 'PC' && r.type === 'NORMAL').length}</span>
            <span>Duplicata: {filteredRecords.filter(r => r.recordType === 'PC' && r.type === 'DUPLICATA').length}</span>
            <span>Moy.: {stats.pcCount > 0 ? formatCurrency(Math.round(stats.pcRevenue / stats.pcCount), currency) : '-'}</span>
          </div>
        </div>

      </div>

      {/* Main Visual Chart: Monthly Performance over the Year */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Évolution des Recettes par Mois — Année {monthlyData.yearAnalyzed}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Montant collecté mensuellement pour les Cartes Grises (bleu) et Permis de Conduire (vert)
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-medium">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-600"></span>
              <span className="text-slate-600">Cartes Grises (CG)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-600"></span>
              <span className="text-slate-600">Permis de Conduire (PC)</span>
            </div>
          </div>
        </div>

        {/* Chart Bars */}
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 sm:gap-3 items-end h-56 pt-4 border-b border-slate-200">
          {monthlyData.monthsArray.map((m) => {
            const heightPercent = Math.round((m.totalRevenue / monthlyData.maxMonthlyRevenue) * 100);
            const cgPercent = m.totalRevenue > 0 ? (m.cgRevenue / m.totalRevenue) * 100 : 0;
            const pcPercent = m.totalRevenue > 0 ? (m.pcRevenue / m.totalRevenue) * 100 : 0;

            const isCurrentSelected = viewMode === 'month' && selectedMonth === m.code;

            return (
              <div 
                key={m.code} 
                className={`flex flex-col items-center h-full justify-end group cursor-pointer p-1 rounded-md transition-colors ${
                  isCurrentSelected ? 'bg-blue-50/70 ring-1 ring-blue-400' : 'hover:bg-slate-50'
                }`}
                onClick={() => {
                  setViewMode('month');
                  setSelectedMonth(m.code);
                }}
                title={`${m.name}: ${formatCurrency(m.totalRevenue, currency)} (${m.totalCount} opérations)`}
              >
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-semibold text-slate-700 mb-1 text-center whitespace-nowrap">
                  {m.totalRevenue > 0 ? `${Math.round(m.totalRevenue / 1000)}k` : '0'}
                </div>

                {/* Stacked bar container */}
                <div className="w-full max-w-[28px] bg-slate-100 rounded-t-md overflow-hidden flex flex-col justify-end" style={{ height: '80%' }}>
                  <div
                    className="w-full flex flex-col justify-end transition-all duration-500"
                    style={{ height: `${Math.max(heightPercent, m.totalRevenue > 0 ? 8 : 2)}%` }}
                  >
                    {/* PC slice */}
                    {pcPercent > 0 && (
                      <div
                        style={{ height: `${pcPercent}%` }}
                        className="w-full bg-emerald-600 transition-all"
                      />
                    )}
                    {/* CG slice */}
                    {cgPercent > 0 && (
                      <div
                        style={{ height: `${cgPercent}%` }}
                        className="w-full bg-blue-600 transition-all"
                      />
                    )}
                  </div>
                </div>

                {/* Month label */}
                <span className={`mt-2 text-[11px] font-medium truncate ${
                  isCurrentSelected ? 'text-blue-700 font-bold' : 'text-slate-500'
                }`}>
                  {m.name.slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Monthly table recap toggle / summary */}
        <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <span>* Cliquez sur un mois pour focaliser le tableau de bord sur cette période.</span>
          <span className="font-semibold text-slate-700">
            Total Annuel {monthlyData.yearAnalyzed}: {formatCurrency(
              monthlyData.monthsArray.reduce((sum, m) => sum + m.totalRevenue, 0),
              currency
            )}
          </span>
        </div>
      </div>

      {/* Secondary Analytical Grids: PC Categories & CG Power (CV) & Operations Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Card 1: PC Breakdown by Category (A, B, C, D, E, F) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Permis : Par Catégorie</span>
              </h4>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {stats.pcCount} délivrés
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Distribution des catégories A à G sur la période sélectionnée
            </p>

            <div className="space-y-2.5">
              {(['A', 'B', 'C', 'D', 'E', 'F', 'G'] as PCCategory[]).map((cat) => {
                const count = stats.pcCategoryCounts[cat] || 0;
                const percentage = stats.pcCount > 0 ? Math.round((count / stats.pcCount) * 100) : 0;
                const labelMap: Record<PCCategory, string> = {
                  A: 'Cat. A — Motocycles & 2-roues',
                  B: 'Cat. B — Véhicules légers (< 3.5T)',
                  C: 'Cat. C — Poids Lourds (> 3.5T)',
                  D: 'Cat. D — Transport en Commun',
                  E: 'Cat. E — Remorques & Articulés',
                  F: 'Cat. F — Véhicules Aménagés / PMR',
                  G: 'Cat. G — Engins Agricoles & TP',
                };

                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">{labelMap[cat]}</span>
                      <span className="text-slate-500 font-medium">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 2: CG Breakdown by Fiscal Horsepower (CV) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Car className="w-4 h-4 text-blue-600" />
                <span>CG : Puissance Fiscale (CV)</span>
              </h4>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {stats.cgCount} immatriculations
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Répartition selon les tranches de puissance (Chevaux Fiscaux)
            </p>

            <div className="space-y-2.5">
              {Object.entries(stats.cvBrackets).map(([bracket, count]) => {
                const countNum = count as number;
                const percentage = stats.cgCount > 0 ? Math.round((countNum / stats.cgCount) * 100) : 0;
                return (
                  <div key={bracket} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">{bracket}</span>
                      <span className="text-slate-500 font-medium">
                        {countNum} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>Moyenne puissance :</span>
            <span className="font-semibold text-slate-800">
              {stats.cgCount > 0 
                ? (filteredRecords.filter(r => r.recordType === 'CG').reduce((acc: number, r) => acc + (r as CGRecord).cv, 0) / stats.cgCount).toFixed(1) + ' CV' 
                : '-'}
            </span>
          </div>
        </div>

        {/* Card 3: Types of Operation & Exonérations Audit */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <PieChart className="w-4 h-4 text-indigo-600" />
                <span>Types d'Opérations</span>
              </h4>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Audit Quittances
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Contrôle des quittances et dossiers exonérés (sans quittance)
            </p>

            <div className="space-y-3">
              {/* Normal operations */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <span className="font-semibold text-slate-800">Opérations NORMAL</span>
                  </div>
                  <span className="font-bold text-slate-900">{stats.normalCount}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-4.5">
                  Quittance de paiement obligatoire et vérifiée.
                </p>
              </div>

              {/* Duplicata */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                    <span className="font-semibold text-slate-800">DUPLICATA</span>
                  </div>
                  <span className="font-bold text-slate-900">{stats.duplicataCount}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-4.5">
                  Remplacement pour perte ou détérioration.
                </p>
              </div>

              {/* Exonéré (EXO) */}
              <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                    <span className="font-bold text-amber-900">EXONÉRÉ (EXO)</span>
                  </div>
                  <span className="font-bold text-amber-900">{stats.exoCount}</span>
                </div>
                <p className="text-[11px] text-amber-800 mt-1 pl-4.5">
                  Dispensé de paiement : <strong>Aucune quittance requise</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 flex justify-between">
            <span>Exemptions théoriques :</span>
            <span className="font-bold text-amber-700">
              {formatCurrency(stats.theoreticalExoSavings, currency)}
            </span>
          </div>
        </div>

      </div>

      {/* Multi-Year Comparison Table (When viewing global or multi-year) */}
      {yearlyData.length > 1 && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Synthèse Comparative Pluriannuelle</span>
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Année</th>
                  <th className="py-2.5 px-3">Nombre d'opérations</th>
                  <th className="py-2.5 px-3">Recettes CG</th>
                  <th className="py-2.5 px-3">Recettes PC</th>
                  <th className="py-2.5 px-3 text-right">Recettes Totales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {yearlyData.map((y) => (
                  <tr key={y.year} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{y.year}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">{y.count} dossiers</td>
                    <td className="py-2.5 px-3 text-blue-700">{formatCurrency(y.cgRev, currency)}</td>
                    <td className="py-2.5 px-3 text-emerald-700">{formatCurrency(y.pcRev, currency)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(y.totalRev, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
