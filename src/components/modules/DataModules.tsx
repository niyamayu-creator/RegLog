import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Database,
  FileSpreadsheet,
  Layers,
  Play,
  Search,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import {
  BalancingMethod,
  ColumnProfile,
  DatasetProfile,
  PreparedData,
  RawRow,
  SplitRatio,
} from '../../types/analytics';
import { InfoTooltip, KpiCard, ModuleHeader } from '../ui/InfoTooltip';

/* ============================================================================
   MÓDULO 1: CARGA DE DATOS
============================================================================ */
interface Module1Props {
  dataset: DatasetProfile | null;
  onLoadRows: (fileName: string, rows: RawRow[]) => void;
  onLoadSample: (sampleKey: 'cartera' | 'satisfaccion') => void;
  onNext: () => void;
}

export const Module1DataLoad: React.FC<Module1Props> = ({
  dataset,
  onLoadRows,
  onLoadSample,
  onNext,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'quality' | 'types'>('preview');

  const handleFile = async (file: File) => {
    setErrorMsg(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
      setErrorMsg('Formato no compatible. Por favor selecciona un archivo Excel (.xlsx, .xls) o .csv.');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) {
        setErrorMsg('El archivo no contiene hojas de cálculo legibles.');
        return;
      }
      const sheet = workbook.Sheets[firstSheet];
      const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: null });
      if (!rows.length) {
        setErrorMsg('La hoja de cálculo seleccionada está vacía.');
        return;
      }
      onLoadRows(file.name, rows);
    } catch {
      setErrorMsg('No fue posible leer el archivo Excel. Verifica que no esté protegido con contraseña.');
    }
  };

  const filteredRows = useMemo(() => {
    if (!dataset) return [];
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? dataset.rows.filter((r) =>
          Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q))
        )
      : dataset.rows;
    return list.slice(0, 50);
  }, [dataset, searchQuery]);

  return (
    <div>
      <ModuleHeader
        stepNumber={1}
        stage="Datos"
        title="Carga y Diagnóstico de Datos"
        description="Sube tu archivo Excel (.xlsx o .xls) o inicia con una de las bases empresariales listas para explorar el flujo completo sin programar."
        onNext={dataset ? onNext : undefined}
        nextLabel="Definir Modelo"
      />

      {/* Upload + Sample Datasets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-stretch">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={`lg:col-span-2 rounded-xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center transition-colors ${
            dragging
              ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
            <Upload className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            Arrastra y suelta tu archivo Excel aquí
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 max-w-md">
            Compatible con formatos XLSX, XLS y CSV. Procesamos tus datos localmente en el navegador con perfilado automático de calidad.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Seleccionar archivo
          </button>
          {errorMsg && (
            <div className="mt-4 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-3 py-2 rounded-lg">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Bases de Demostración</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
              ¿Sin archivo Excel a la mano?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Carga al instante los casos de negocio incluidos para validar riesgo de cartera o satisfacción de clientes.
            </p>
          </div>
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => onLoadSample('cartera')}
              className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-950 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  carteraguia2017.xlsx
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                240 registros · 9 variables · Objetivo: Retrasos (0/1)
              </div>
            </button>
            <button
              type="button"
              onClick={() => onLoadSample('satisfaccion')}
              className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-950 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  financierosatisfaccion.xlsx
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                140 registros · 6 variables · Objetivo: Satisfecho (0/1)
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Dataset Diagnostics */}
      {dataset && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <KpiCard
              label="Archivo activo"
              value={dataset.rowCount.toLocaleString()}
              subtext={`${dataset.fileName}`}
              tooltip="Número total de filas u observaciones cargadas desde el archivo."
            />
            <KpiCard
              label="Columnas detectadas"
              value={dataset.colCount}
              subtext={`${dataset.binaryCount} binarias detectadas`}
              tooltip="Total de variables disponibles en la tabla de datos."
            />
            <KpiCard
              label="Calidad / Completitud"
              value={`${dataset.completenessPct.toFixed(1)}%`}
              subtext={`${dataset.totalMissing} valores faltantes`}
              tone={dataset.completenessPct >= 95 ? 'positive' : 'warning'}
              tooltip="Porcentaje de celdas con datos válidos frente al total de celdas."
            />
            <KpiCard
              label="Variables Numéricas"
              value={dataset.numericCount}
              subtext="Continuas y discretas"
              tone="accent"
            />
            <KpiCard
              label="Variables Categóricas"
              value={dataset.categoricalCount}
              subtext="Listas para Dummies"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'preview'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Vista Previa de Datos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('quality')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'quality'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Calidad y Faltantes
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('types')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'types'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Numéricas vs Categóricas
                </button>
              </div>

              {activeTab === 'preview' && (
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar registros..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {activeTab === 'preview' && (
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">#</th>
                      {dataset.columns.map((col) => (
                        <th key={col.name} className="py-2.5 px-3 font-semibold whitespace-nowrap">
                          {col.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {filteredRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2 px-3 font-mono tabular-nums text-slate-400">
                          {idx + 1}
                        </td>
                        {dataset.columns.map((col) => {
                          const val = row[col.name];
                          const empty = val === null || val === undefined || val === '';
                          return (
                            <td
                              key={col.name}
                              className={`py-2 px-3 whitespace-nowrap ${
                                col.type === 'numeric' || col.type === 'binary'
                                  ? 'font-mono tabular-nums text-slate-800 dark:text-slate-200'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {empty ? (
                                <span className="text-amber-600 dark:text-amber-400 italic">
                                  Faltante
                                </span>
                              ) : (
                                String(val)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2.5 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                  Mostrando {filteredRows.length} de {dataset.rowCount} registros totales.
                </div>
              </div>
            )}

            {activeTab === 'quality' && (
              <div className="p-5 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 px-3 font-semibold">Variable</th>
                      <th className="py-2.5 px-3 font-semibold">Tipo Detectado</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Únicos</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Faltantes</th>
                      <th className="py-2.5 px-3 font-semibold w-56">Completitud</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Resumen / Rango</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {dataset.columns.map((col) => {
                      const complete = 100 - col.missingPct;
                      return (
                        <tr key={col.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                            {col.name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            {col.type === 'numeric'
                              ? 'Numérica'
                              : col.type === 'binary'
                                ? 'Binaria (0/1)'
                                : 'Categórica'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            {col.uniqueCount}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            <span
                              className={
                                col.missingCount > 0
                                  ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                  : 'text-slate-500 dark:text-slate-400'
                              }
                            >
                              {col.missingCount} ({col.missingPct.toFixed(1)}%)
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    complete === 100
                                      ? 'bg-emerald-500'
                                      : complete >= 90
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${complete}%` }}
                                />
                              </div>
                              <span className="font-mono tabular-nums w-11 text-right text-[11px] text-slate-600 dark:text-slate-400">
                                {complete.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                            {col.type === 'numeric' && col.min !== undefined && col.max !== undefined
                              ? `${col.min.toFixed(1)} – ${col.max.toFixed(1)} (μ=${col.mean?.toFixed(1)})`
                              : col.topCategories
                                  ?.slice(0, 2)
                                  .map((c) => `${c.label}: ${c.pct.toFixed(0)}%`)
                                  .join(' · ')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'types' && (
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                    Variables Numéricas y Binarias ({dataset.numericCount + dataset.binaryCount})
                  </h3>
                  <div className="space-y-2.5">
                    {dataset.columns
                      .filter((c) => c.type !== 'categorical')
                      .map((c) => (
                        <div
                          key={c.name}
                          className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                              {c.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {c.type === 'binary' ? 'Variable binaria' : 'Variable continua/discreta'} · Media:{' '}
                              <span className="font-mono tabular-nums">
                                {c.mean?.toFixed(2) ?? '—'}
                              </span>
                            </div>
                          </div>
                          {c.histogram && <MiniHistogram bins={c.histogram} />}
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                    Variables Categóricas ({dataset.categoricalCount})
                  </h3>
                  <div className="space-y-2.5">
                    {dataset.columns.filter((c) => c.type === 'categorical').length === 0 ? (
                      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                        No se detectaron variables categóricas nominales en esta base de datos.
                      </div>
                    ) : (
                      dataset.columns
                        .filter((c) => c.type === 'categorical')
                        .map((c) => (
                          <div
                            key={c.name}
                            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm font-medium text-slate-900 dark:text-white">
                                {c.name}
                              </span>
                              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                                {c.uniqueCount} categorías
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300">
                              {c.topCategories
                                ?.slice(0, 4)
                                .map((cat) => `${cat.label} (${cat.pct.toFixed(0)}%)`)
                                .join(' · ')}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const MiniHistogram: React.FC<{ bins: number[] }> = ({ bins }) => {
  const max = Math.max(1, ...bins);
  return (
    <div className="flex items-end gap-0.5 h-7 w-20" aria-hidden="true">
      {bins.map((b, i) => (
        <div
          key={i}
          className="flex-1 bg-blue-500/75 dark:bg-blue-400/75 rounded-t-[1px]"
          style={{ height: `${Math.max(12, (b / max) * 100)}%` }}
        />
      ))}
    </div>
  );
};

/* ============================================================================
   MÓDULO 2: DEFINICIÓN DEL MODELO
============================================================================ */
interface Module2Props {
  dataset: DatasetProfile;
  targetColumn: string;
  positiveLabel: string;
  negativeLabel: string;
  selectedPredictors: string[];
  onChangeTarget: (col: string, pos: string, neg: string) => void;
  onTogglePredictor: (col: string) => void;
  onSelectAllPredictors: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export const Module2ModelDefinition: React.FC<Module2Props> = ({
  dataset,
  targetColumn,
  positiveLabel,
  negativeLabel,
  selectedPredictors,
  onChangeTarget,
  onTogglePredictor,
  onSelectAllPredictors,
  onPrev,
  onNext,
}) => {
  const binaryColumns = dataset.columns.filter((c) => c.type === 'binary');
  const candidateTargets = binaryColumns.length > 0 ? binaryColumns : dataset.columns;
  const activeTargetCol = dataset.columns.find((c) => c.name === targetColumn);

  return (
    <div>
      <ModuleHeader
        stepNumber={2}
        stage="Datos"
        title="Definición del Modelo Predictivo"
        description="Elige la variable binaria que deseas predecir (0 = No, 1 = Sí) y selecciona las variables explicativas (predictoras) que alimentarán los modelos."
        onPrev={onPrev}
        onNext={onNext}
        nextDisabled={!targetColumn || selectedPredictors.length === 0}
        nextLabel="Preparar Datos"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Target Variable */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center">
              1. Variable Objetivo (Binaria)
              <InfoTooltip
                title="Variable Objetivo"
                text="Es el evento de negocio que quieres predecir, por ejemplo: Retrasos, Morosidad, Abandono, Compra o Satisfacción. Debe tener dos valores (0 = No ocurre, 1 = Sí ocurre)."
              />
            </h2>
          </div>

          {binaryColumns.length === 0 && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
              No se detectó una columna estrictamente binaria (0/1). Selecciona una columna con dos categorías principales.
            </div>
          )}

          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            Selecciona la variable dependiente (Y)
          </label>
          <select
            value={targetColumn}
            onChange={(e) => {
              const col = dataset.columns.find((c) => c.name === e.target.value);
              if (col?.binaryValues) {
                const vals = col.binaryValues;
                if (vals.includes('1') && vals.includes('0')) {
                  onChangeTarget(col.name, '1', '0');
                } else {
                  const sorted = [...vals].sort();
                  onChangeTarget(col.name, sorted[1], sorted[0]);
                }
              } else if (col?.topCategories && col.topCategories.length >= 2) {
                onChangeTarget(col.name, col.topCategories[0].label, col.topCategories[1].label);
              } else {
                onChangeTarget(e.target.value, '1', '0');
              }
            }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {candidateTargets.map((col) => (
              <option key={col.name} value={col.name}>
                {col.name} ({col.uniqueCount} valores únicos)
              </option>
            ))}
          </select>

          {activeTargetCol && (
            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Codificación de Clases
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Clase Negativa (0 = No)
                  </div>
                  <div className="text-sm font-semibold font-mono text-slate-900 dark:text-white mt-0.5">
                    {negativeLabel}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/70">
                  <div className="text-[11px] text-blue-700 dark:text-blue-300">
                    Evento Objetivo (1 = Sí)
                  </div>
                  <div className="text-sm font-semibold font-mono text-blue-900 dark:text-blue-100 mt-0.5">
                    {positiveLabel}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onChangeTarget(targetColumn, negativeLabel, positiveLabel)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Invertir clase positiva (0 ↔ 1)
              </button>
            </div>
          )}
        </div>

        {/* Predictor Variables */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center">
                2. Variables Predictoras ({selectedPredictors.length} seleccionadas)
                <InfoTooltip
                  title="Variables Predictoras (X)"
                  text="Características o indicadores que ayudan a explicar la probabilidad del evento objetivo. Las columnas tipo ID único se excluyen por defecto."
                />
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Marca o desmarca las variables que participarán en la selección automática de modelos.
              </p>
            </div>
            <button
              type="button"
              onClick={onSelectAllPredictors}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0"
            >
              Seleccionar recomendadas
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2 px-2 w-10">Usar</th>
                  <th className="py-2 px-3 font-semibold">Nombre Variable</th>
                  <th className="py-2 px-3 font-semibold">Tipo Dato</th>
                  <th className="py-2 px-3 font-semibold">Distribución</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dataset.columns
                  .filter((col) => col.name !== targetColumn)
                  .map((col: ColumnProfile) => {
                    const checked = selectedPredictors.includes(col.name);
                    const highCard = col.type === 'categorical' && col.uniqueCount > 20;
                    return (
                      <tr
                        key={col.name}
                        onClick={() => onTogglePredictor(col.name)}
                        className={`cursor-pointer transition-colors ${
                          checked
                            ? 'bg-blue-50/40 dark:bg-blue-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-2.5 px-2">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              checked
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {checked && <Check className="w-3 h-3" />}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {col.name}
                          </div>
                          {highCard && (
                            <div className="text-[11px] text-amber-600 dark:text-amber-400">
                              Alta cardinalidad ({col.uniqueCount} únicos) · Posible ID
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {col.type === 'numeric'
                            ? 'Numérica'
                            : col.type === 'binary'
                              ? 'Binaria'
                              : 'Categórica'}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                              {col.type === 'numeric'
                                ? `${col.min?.toFixed(1)} .. ${col.max?.toFixed(1)}`
                                : `${col.uniqueCount} categorías`}
                            </span>
                            {col.histogram && <MiniHistogram bins={col.histogram} />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   MÓDULO 3: PREPARACIÓN DE DATOS (DUMMIES + BALANCEO)
============================================================================ */
interface Module3Props {
  prepared: PreparedData;
  balancingMethod: BalancingMethod;
  onChangeBalancing: (method: BalancingMethod) => void;
  onPrev: () => void;
  onNext: () => void;
}

export const Module3Preparation: React.FC<Module3Props> = ({
  prepared,
  balancingMethod,
  onChangeBalancing,
  onPrev,
  onNext,
}) => {
  const balancingOptions: {
    id: BalancingMethod;
    title: string;
    subtitle: string;
    detail: string;
  }[] = [
    {
      id: 'none',
      title: 'Opción 1 · Sin balancear',
      subtitle: 'Distribución natural original',
      detail: 'Conserva las proporciones reales de la base. Recomendado cuando las clases ya son cercanas a 50/50.',
    },
    {
      id: 'undersample',
      title: 'Opción 2 · Balanceo Automático (Submuestreo)',
      subtitle: 'Igualación exacta como en el script R',
      detail: 'Reduce la clase mayoritaria en entrenamiento para igualar exactamente los casos de la clase minoritaria.',
    },
    {
      id: 'smote',
      title: 'Opción 3 · SMOTE',
      subtitle: 'Generación sintética por vecinos cercanos',
      detail: 'Crea registros sintéticos realistas de la clase minoritaria interpolando vecinos cercanos sin perder datos.',
    },
    {
      id: 'oversample',
      title: 'Opción 4 · Oversampling',
      subtitle: 'Sobremuestreo aleatorio de clase minoritaria',
      detail: 'Replica casos de la clase minoritaria hasta equilibrar el entrenamiento en 50% / 50%.',
    },
  ];

  return (
    <div>
      <ModuleHeader
        stepNumber={3}
        stage="Datos"
        title="Preparación de Datos y Balanceo de Clases"
        description="Convertimos automáticamente las variables categóricas en variables Dummy (0/1), imputamos valores faltantes y equilibramos las clases para evitar sesgos."
        onPrev={onPrev}
        onNext={onNext}
        nextLabel="Configurar Partición"
      />

      {/* Dummy Variables Transformation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center">
              <Layers className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              Generación Automática de Variables Dummy
              <InfoTooltip
                title="Variables Dummy"
                text="Las categorías se transforman en columnas binarias (0 o 1), dejando una categoría base como referencia para evitar colinealidad perfecta."
              />
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {prepared.encodedFeatureNames.length} características finales listas para el algoritmo ·{' '}
              {prepared.imputedCellsCount} valores faltantes imputados automáticamente.
            </p>
          </div>
        </div>

        {prepared.dummyMappings.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            Todas las variables predictoras seleccionadas son numéricas o binarias (0/1). No fue necesario expandir columnas categóricas.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prepared.dummyMappings.map((m) => (
              <div
                key={m.originalColumn}
                className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              >
                <div className="grid grid-cols-11 items-center gap-2">
                  <div className="col-span-4">
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Antes (Categórica)
                    </div>
                    <div className="px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-900 dark:text-white truncate">
                      {m.originalColumn}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                      Referencia base: <span className="font-mono">{m.referenceCategory}</span>
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-center text-slate-400">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <div className="col-span-6">
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Después ({m.generatedDummies.length} Dummies 0/1)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {m.generatedDummies.map((d) => (
                        <span
                          key={d}
                          className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-blue-700 dark:text-blue-300"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Class Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1 flex items-center">
            Distribución de Clases
            <InfoTooltip
              title="Balance de Clases"
              text="Cuando una clase representa menos del 35% de los casos, los modelos sin balancear tienden a subestimar los casos positivos. El balanceo se aplica únicamente sobre el conjunto de Entrenamiento."
            />
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Comparativa entre la base original y el conjunto de entrenamiento tras aplicar el método elegido.
          </p>

          <div className="space-y-5">
            <ClassBarBlock
              title={`Base Original (${prepared.originalClassCounts.zero + prepared.originalClassCounts.one} registros)`}
              zeroCount={prepared.originalClassCounts.zero}
              oneCount={prepared.originalClassCounts.one}
              zeroPct={prepared.originalClassCounts.zeroPct}
              onePct={prepared.originalClassCounts.onePct}
              negLabel={prepared.negativeLabel}
              posLabel={prepared.positiveLabel}
            />
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <ClassBarBlock
                title={`Entrenamiento Balanceado (${prepared.balancedTrainCounts.zero + prepared.balancedTrainCounts.one} registros)`}
                zeroCount={prepared.balancedTrainCounts.zero}
                oneCount={prepared.balancedTrainCounts.one}
                zeroPct={prepared.balancedTrainCounts.zeroPct}
                onePct={prepared.balancedTrainCounts.onePct}
                negLabel={prepared.negativeLabel}
                posLabel={prepared.positiveLabel}
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
            Estrategia de Balanceo en Entrenamiento
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Selecciona cómo equilibrar la clase minoritaria antes de ajustar los 5 modelos. Validación y Test mantienen siempre la proporción real del negocio.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {balancingOptions.map((opt) => {
              const active = balancingMethod === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeBalancing(opt.id)}
                  className={`text-left p-4 rounded-xl border transition-colors ${
                    active
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {opt.title}
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        active
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {active && <Check className="w-2.5 h-2.5" />}
                    </div>
                  </div>
                  <div className="text-[11px] font-medium text-blue-700 dark:text-blue-400 mb-1.5">
                    {opt.subtitle}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {opt.detail}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const ClassBarBlock: React.FC<{
  title: string;
  zeroCount: number;
  oneCount: number;
  zeroPct: number;
  onePct: number;
  negLabel: string;
  posLabel: string;
}> = ({ title, zeroCount, oneCount, zeroPct, onePct, negLabel, posLabel }) => (
  <div>
    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">{title}</div>
    <div className="space-y-2.5">
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-600 dark:text-slate-400">
            Clase 0 ({negLabel})
          </span>
          <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-white">
            {zeroCount} ({zeroPct.toFixed(1)}%)
          </span>
        </div>
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden">
          <div className="h-full bg-slate-500 dark:bg-slate-400 rounded-md" style={{ width: `${zeroPct}%` }} />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-600 dark:text-slate-400">
            Clase 1 ({posLabel})
          </span>
          <span className="font-mono tabular-nums font-medium text-blue-700 dark:text-blue-400">
            {oneCount} ({onePct.toFixed(1)}%)
          </span>
        </div>
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden">
          <div className="h-full bg-blue-600 dark:bg-blue-500 rounded-md" style={{ width: `${onePct}%` }} />
        </div>
      </div>
    </div>
  </div>
);

/* ============================================================================
   MÓDULO 4: ENTRENAMIENTO Y PARTICIÓN
============================================================================ */
interface Module4Props {
  prepared: PreparedData;
  splitRatio: SplitRatio;
  onChangeSplit: (ratio: SplitRatio) => void;
  onTrainModels: () => void;
  onPrev: () => void;
}

export const Module4Training: React.FC<Module4Props> = ({
  prepared,
  splitRatio,
  onChangeSplit,
  onTrainModels,
  onPrev,
}) => {
  const ratios: { id: SplitRatio; label: string; desc: string }[] = [
    { id: '70/30', label: '70% / 30%', desc: 'Más registros para validar generalización' },
    { id: '75/25', label: '75% / 25%', desc: 'Configuración estándar del script R' },
    { id: '80/20', label: '80% / 20%', desc: 'Maximiza datos de entrenamiento' },
  ];

  const totalSplit =
    prepared.splitCounts.train + prepared.splitCounts.valid + prepared.splitCounts.test;
  const trainPct = (prepared.splitCounts.train / Math.max(1, totalSplit)) * 100;
  const validPct = (prepared.splitCounts.valid / Math.max(1, totalSplit)) * 100;
  const testPct = (prepared.splitCounts.test / Math.max(1, totalSplit)) * 100;

  return (
    <div>
      <ModuleHeader
        stepNumber={4}
        stage="Modelado"
        title="Partición y Entrenamiento Automático"
        description="Divide tu base de datos de forma estratificada en Entrenamiento, Validación y Prueba (Test) y ejecuta automáticamente los 5 algoritmos de Regresión Logística."
        onPrev={onPrev}
        onNext={onTrainModels}
        nextLabel="Entrenar los 5 Modelos"
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center">
              <SlidersHorizontal className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              Proporción de División (Train+Validación / Test)
              <InfoTooltip
                title="División Estratificada"
                text="Reservamos una muestra independiente de Test para medir cómo responderá el modelo ante datos nuevos que nunca vio durante el entrenamiento."
              />
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Semilla aleatoria fija para garantizar resultados reproducibles en auditorías.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
            {ratios.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onChangeSplit(r.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  splitRatio === r.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Split Bar */}
        <div className="mb-6">
          <div className="h-5 w-full rounded-lg overflow-hidden flex border border-slate-200 dark:border-slate-700">
            <div
              className="bg-blue-600 flex items-center justify-center text-[11px] font-mono font-semibold text-white"
              style={{ width: `${trainPct}%` }}
            >
              Train ({trainPct.toFixed(0)}%)
            </div>
            <div
              className="bg-amber-500 flex items-center justify-center text-[11px] font-mono font-semibold text-white"
              style={{ width: `${validPct}%` }}
            >
              Valid ({validPct.toFixed(0)}%)
            </div>
            <div
              className="bg-emerald-600 flex items-center justify-center text-[11px] font-mono font-semibold text-white"
              style={{ width: `${testPct}%` }}
            >
              Test ({testPct.toFixed(0)}%)
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70">
            <div className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">
              Conjunto Train (Entrenamiento)
            </div>
            <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-white">
              {prepared.splitCounts.train} registros
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Casos positivos (1):{' '}
              <span className="font-mono tabular-nums font-medium">
                {prepared.splitCounts.trainPos} (
                {((prepared.splitCounts.trainPos / Math.max(1, prepared.splitCounts.train)) * 100).toFixed(1)}
                %)
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70">
            <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
              Conjunto Validación
            </div>
            <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-white">
              {prepared.splitCounts.valid} registros
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Casos positivos (1):{' '}
              <span className="font-mono tabular-nums font-medium">
                {prepared.splitCounts.validPos} (
                {((prepared.splitCounts.validPos / Math.max(1, prepared.splitCounts.valid)) * 100).toFixed(1)}
                %)
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70">
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
              Conjunto Test (Prueba Final)
            </div>
            <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-white">
              {prepared.splitCounts.test} registros
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Casos positivos (1):{' '}
              <span className="font-mono tabular-nums font-medium">
                {prepared.splitCounts.testPos} (
                {((prepared.splitCounts.testPos / Math.max(1, prepared.splitCounts.test)) * 100).toFixed(1)}
                %)
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Motor de Entrenamiento Multi-Modelo Listo
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Al ejecutar, entrenaremos automáticamente Regresión Completa, Stepwise Forward, Stepwise Backward, Stepwise Both Directions (AIC) y Best Subsets con {prepared.encodedFeatureNames.length} variables codificadas.
          </p>
        </div>
        <button
          type="button"
          onClick={onTrainModels}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors whitespace-nowrap shrink-0"
        >
          <Play className="w-4 h-4" />
          Entrenar y Comparar 5 Modelos
        </button>
      </div>
    </div>
  );
};
