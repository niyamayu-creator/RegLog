import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  BatchPredictionRow,
  DatasetProfile,
  ExecutiveReportData,
  PreparedData,
  RawRow,
  TrainedModel,
} from '../../types/analytics';
import {
  computeShapSummary,
  runBatchPrediction,
} from '../../utils/logisticEngine';
import { InfoTooltip, KpiCard, ModuleHeader } from '../ui/InfoTooltip';

/* ============================================================================
   MÓDULO 13: EXPLICABILIDAD DEL MODELO (SHAP VALUES & IMPORTANCIA)
============================================================================ */
interface Module13Props {
  model: TrainedModel;
  prepared: PreparedData;
  onPrev: () => void;
  onNext: () => void;
}

export const Module13Explainability: React.FC<Module13Props> = ({
  model,
  prepared,
  onPrev,
  onNext,
}) => {
  const shapSummary = useMemo(
    () => computeShapSummary(model, prepared),
    [model, prepared]
  );

  const sampleCases = useMemo(() => {
    const X = prepared.testX.length > 0 ? prepared.testX : prepared.trainX;
    const probs = prepared.testX.length > 0 ? model.testProbs : model.trainProbs;
    return X.slice(0, 30).map((row, i) => ({
      idx: i,
      row,
      prob: probs[i] ?? 0.5,
      actual: (prepared.testX.length > 0 ? prepared.testY : prepared.trainY)[i] ?? 0,
    }));
  }, [prepared, model]);

  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const currentCase = sampleCases[selectedCaseIdx] ?? sampleCases[0];

  const waterfallItems = useMemo(() => {
    if (!currentCase) return [];
    return model.coefficients
      .map((coef, cIdx) => {
        const featIdx = model.selectedIndices[cIdx];
        const mean = prepared.featureMeta[coef.name]?.mean ?? 0;
        const val = currentCase.row[featIdx];
        const shap = coef.beta * (val - mean);
        return {
          name: coef.name,
          value: val,
          mean,
          shap,
        };
      })
      .sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap));
  }, [currentCase, model, prepared]);

  const maxAbsImpact = Math.max(
    0.1,
    ...shapSummary.features.flatMap((f) => f.samples.map((s) => Math.abs(s.shapValue)))
  );

  return (
    <div>
      <ModuleHeader
        stepNumber={13}
        stage="Evaluación"
        title="Explicabilidad del Modelo (SHAP e Importancia)"
        description="Comprende exactamente qué variables impulsan las decisiones del modelo a nivel global y por qué un caso individual recibió su puntaje."
        onPrev={onPrev}
        onNext={onNext}
        nextLabel="Predicción Masiva"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 items-start">
        {/* Global Predictor Importance Ranking */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1 flex items-center">
            Ranking de Predictores (Importancia SHAP)
            <InfoTooltip
              title="Importancia Global SHAP"
              text="Promedio del impacto absoluto que cada variable ejerce sobre las predicciones en la muestra de evaluación."
            />
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Peso relativo (%) de cada variable en {model.name.replace(/^Modelo \d+ · /, '')}.
          </p>

          <div className="space-y-3">
            {shapSummary.features.map((f, idx) => (
              <div key={f.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                    <span className="font-mono text-slate-400 mr-1.5">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    {f.name}
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white shrink-0">
                    {f.importancePct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-500 rounded"
                    style={{ width: `${Math.max(4, f.importancePct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Impact / Beeswarm Plot */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Impact Plot (SHAP Summary)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cada punto representa un registro. Rojo = valor alto de la variable · Azul = valor bajo.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Bajo
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Alto
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {shapSummary.features.slice(0, 7).map((f) => (
              <div key={f.name} className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-4 text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                  {f.name}
                </div>
                <div className="col-span-8 relative h-7 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200/80 dark:border-slate-800">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 dark:bg-slate-700" />
                  {f.samples.map((s, sIdx) => {
                    const normPos = 50 + (s.shapValue / maxAbsImpact) * 44;
                    const clampedPos = Math.max(4, Math.min(96, normPos));
                    const jitterY = 22 + ((sIdx * 17) % 56);
                    const color =
                      s.featureNorm >= 0.65
                        ? 'bg-rose-500'
                        : s.featureNorm <= 0.35
                          ? 'bg-blue-500'
                          : 'bg-amber-500';
                    return (
                      <span
                        key={sIdx}
                        className={`absolute w-2 h-2 rounded-full opacity-80 -translate-x-1/2 -translate-y-1/2 ${color}`}
                        style={{ left: `${clampedPos}%`, top: `${jitterY}%` }}
                        title={`${f.name}: SHAP = ${s.shapValue.toFixed(3)}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="grid grid-cols-12 text-[10px] font-mono text-slate-400 pt-1">
              <div className="col-span-4" />
              <div className="col-span-8 flex justify-between px-1">
                <span>← Reduce riesgo (SHAP &lt; 0)</span>
                <span>0</span>
                <span>Aumenta riesgo (SHAP &gt; 0) →</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Case Waterfall */}
      {currentCase && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Gráfico Waterfall por Caso Individual
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Probabilidad base de la población:{' '}
                <span className="font-mono font-semibold">
                  {(shapSummary.baseProb * 100).toFixed(1)}%
                </span>{' '}
                → Predicción del caso:{' '}
                <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                  {(currentCase.prob * 100).toFixed(1)}%
                </span>{' '}
                (Real = {currentCase.actual})
              </p>
            </div>
            <select
              value={selectedCaseIdx}
              onChange={(e) => setSelectedCaseIdx(Number(e.target.value))}
              aria-label="Seleccionar caso de prueba para Waterfall"
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              {sampleCases.map((c) => (
                <option key={c.idx} value={c.idx}>
                  Caso #{c.idx + 1} · Prob {(c.prob * 100).toFixed(1)}% · Real {c.actual}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2.5">
            {waterfallItems.map((item) => {
              const maxW = Math.max(0.2, ...waterfallItems.map((w) => Math.abs(w.shap)));
              const widthPct = Math.min(48, (Math.abs(item.shap) / maxW) * 48);
              const isPos = item.shap >= 0;
              return (
                <div key={item.name} className="grid grid-cols-12 items-center gap-3 text-xs">
                  <div className="col-span-5 sm:col-span-4 truncate">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {item.name}
                    </span>{' '}
                    <span className="font-mono text-[11px] text-slate-400">
                      = {Number.isInteger(item.value) ? item.value : item.value.toFixed(1)}
                    </span>
                  </div>
                  <div className="col-span-5 sm:col-span-6 relative h-5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200/70 dark:border-slate-800">
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 dark:bg-slate-700" />
                    <div
                      className={`absolute top-1 bottom-1 rounded-sm ${
                        isPos ? 'bg-rose-500' : 'bg-emerald-600'
                      }`}
                      style={{
                        left: isPos ? '50%' : `${50 - widthPct}%`,
                        width: `${widthPct}%`,
                      }}
                    />
                  </div>
                  <div
                    className={`col-span-2 text-right font-mono tabular-nums font-semibold ${
                      isPos
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {isPos ? `+${item.shap.toFixed(3)}` : item.shap.toFixed(3)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   MÓDULO 14: PREDICCIÓN MASIVA
============================================================================ */
interface Module14Props {
  dataset: DatasetProfile;
  model: TrainedModel;
  prepared: PreparedData;
  threshold: number;
  onPrev: () => void;
  onNext: () => void;
}

export const Module14BatchPrediction: React.FC<Module14Props> = ({
  dataset,
  model,
  prepared,
  threshold,
  onPrev,
  onNext,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [batchName, setBatchName] = useState(dataset.fileName);
  const [batchRows, setBatchRows] = useState<RawRow[]>(dataset.rows);
  const [error, setError] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<'all' | 'Alto Riesgo' | 'Riesgo Medio' | 'Bajo Riesgo'>('all');
  const [search, setSearch] = useState('');

  const predictions: BatchPredictionRow[] = useMemo(
    () => runBatchPrediction(batchRows, model, prepared, threshold),
    [batchRows, model, prepared, threshold]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return predictions.filter((p) => {
      const matchesRisk = riskFilter === 'all' || p.riskLevel === riskFilter;
      const matchesQuery =
        !q ||
        String(p.rowId).toLowerCase().includes(q) ||
        p.riskLevel.toLowerCase().includes(q);
      return matchesRisk && matchesQuery;
    });
  }, [predictions, riskFilter, search]);

  const counts = useMemo(() => {
    const high = predictions.filter((p) => p.riskLevel === 'Alto Riesgo').length;
    const med = predictions.filter((p) => p.riskLevel === 'Riesgo Medio').length;
    const low = predictions.filter((p) => p.riskLevel === 'Bajo Riesgo').length;
    const pos = predictions.filter((p) => p.prediction === 1).length;
    return { high, med, low, pos };
  }, [predictions]);

  const handleUploadBatch = async (file: File) => {
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: null });
      if (!rows.length) {
        setError('El archivo cargado está vacío.');
        return;
      }
      setBatchName(file.name);
      setBatchRows(rows);
    } catch {
      setError('No se pudo leer el archivo Excel/CSV.');
    }
  };

  const downloadTemplate = () => {
    const sampleRow: Record<string, string | number> = { ID_CASO: 'NUEVO-001' };
    prepared.selectedPredictors.forEach((p) => {
      const mapping = prepared.dummyMappings.find((m) => m.originalColumn === p);
      if (mapping) sampleRow[p] = mapping.referenceCategory;
      else sampleRow[p] = Number((prepared.featureMeta[p]?.mean ?? 0).toFixed(1));
    });
    const ws = XLSX.utils.json_to_sheet([sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla_Prediccion');
    XLSX.writeFile(wb, 'plantilla_prediccion_masiva.xlsx');
  };

  const exportExcel = () => {
    const out = predictions.map((p) => ({
      ID: p.rowId,
      Probabilidad_Pct: Number((p.probability * 100).toFixed(2)),
      Prediccion: p.prediction,
      Nivel_Riesgo: p.riskLevel,
      ...p.raw,
    }));
    const ws = XLSX.utils.json_to_sheet(out);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Predicciones');
    XLSX.writeFile(wb, 'resultados_prediccion_masiva.xlsx');
  };

  const exportCsv = () => {
    const header = ['ID', 'Probabilidad', 'Prediccion', 'Nivel_Riesgo'];
    const lines = [
      header.join(','),
      ...predictions.map((p) =>
        [
          `"${String(p.rowId).replace(/"/g, '""')}"`,
          (p.probability * 100).toFixed(2) + '%',
          p.prediction,
          `"${p.riskLevel}"`,
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resultados_prediccion_masiva.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Resultados de Predicción Masiva — LogiStudio Analytics', 14, 18);
    doc.setFontSize(10);
    doc.text(
      `Modelo: ${model.name} | Base: ${batchName} | Registros: ${predictions.length} | Cutoff: ${threshold.toFixed(2)}`,
      14,
      26
    );
    let y = 36;
    doc.setFontSize(9);
    doc.text('ID                 Probabilidad     Predicción     Nivel de Riesgo', 14, y);
    y += 6;
    predictions.slice(0, 40).forEach((p) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(
        `${String(p.rowId).slice(0, 16).padEnd(18)} ${(p.probability * 100).toFixed(1).padStart(6)}%           ${p.prediction}              ${p.riskLevel}`,
        14,
        y
      );
      y += 5.5;
    });
    doc.save('resultados_prediccion_masiva.pdf');
  };

  return (
    <div>
      <ModuleHeader
        stepNumber={14}
        stage="Despliegue"
        title="Predicción Masiva por Lotes (Scoring)"
        description="Carga un nuevo archivo Excel con casos nuevos para aplicar automáticamente el modelo entrenado, clasificar riesgos y exportar resultados."
        onPrev={onPrev}
        onNext={onNext}
        nextLabel="Informe Ejecutivo IA"
      />

      {/* Upload & Export Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUploadBatch(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            Cargar nuevo Excel
          </button>
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Descargar plantilla
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Evaluando: <span className="font-medium text-slate-900 dark:text-white">{batchName}</span> ({predictions.length} filas)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Exportar Resultados:</span>
          <button
            type="button"
            onClick={exportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            Excel
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            CSV
          </button>
          <button
            type="button"
            onClick={exportPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Predicciones Positivas (1)"
          value={counts.pos}
          subtext={`${((counts.pos / Math.max(1, predictions.length)) * 100).toFixed(1)}% con cutoff ${threshold.toFixed(2)}`}
          tone="accent"
        />
        <KpiCard
          label="Alto Riesgo (≥ 65%)"
          value={counts.high}
          subtext="Prioridad de intervención inmediata"
          tone="danger"
        />
        <KpiCard
          label="Riesgo Medio (30%–65%)"
          value={counts.med}
          subtext="Monitoreo preventivo"
          tone="warning"
        />
        <KpiCard
          label="Bajo Riesgo (< 30%)"
          value={counts.low}
          subtext="Operación saludable"
          tone="positive"
        />
      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
            {(['all', 'Alto Riesgo', 'Riesgo Medio', 'Bajo Riesgo'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRiskFilter(r)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  riskFilter === r
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r === 'all' ? 'Todos' : r}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ID o nivel..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2.5 px-4 font-semibold">ID</th>
                <th className="py-2.5 px-4 font-semibold text-right">Probabilidad</th>
                <th className="py-2.5 px-4 font-semibold text-center">Predicción</th>
                <th className="py-2.5 px-4 font-semibold">Nivel Riesgo</th>
                <th className="py-2.5 px-4 font-semibold">Variables Clave</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.slice(0, 100).map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                    {row.rowId}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold">
                    {(row.probability * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono font-bold">
                    {row.prediction === 1 ? (
                      <span className="text-rose-600 dark:text-rose-400">1 (Sí)</span>
                    ) : (
                      <span className="text-emerald-700 dark:text-emerald-400">0 (No)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 font-semibold">
                    <span
                      className={
                        row.riskLevel === 'Alto Riesgo'
                          ? 'text-rose-700 dark:text-rose-400'
                          : row.riskLevel === 'Riesgo Medio'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                      }
                    >
                      {row.riskLevel}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 truncate max-w-xs">
                    {prepared.selectedPredictors
                      .slice(0, 3)
                      .map((p) => `${p}: ${row.raw[p] ?? '—'}`)
                      .join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   MÓDULO 15: INFORME EJECUTIVO IA
============================================================================ */
interface Module15Props {
  dataset: DatasetProfile;
  prepared: PreparedData;
  models: TrainedModel[];
  activeModel: TrainedModel;
  threshold: number;
  report: ExecutiveReportData | null;
  onReportGenerated: (r: ExecutiveReportData) => void;
  onPrev: () => void;
}

export const Module15ExecutiveReport: React.FC<Module15Props> = ({
  dataset,
  prepared,
  models,
  activeModel,
  threshold,
  report,
  onReportGenerated,
  onPrev,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const generateReport = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        dataset: {
          archivo: dataset.fileName,
          registros: dataset.rowCount,
          columnas: dataset.colCount,
          completitudPct: Number(dataset.completenessPct.toFixed(2)),
          faltantesImputados: prepared.imputedCellsCount,
          variableObjetivo: prepared.targetColumn,
          tasaEventoOriginalPct: Number(prepared.originalClassCounts.onePct.toFixed(2)),
          balanceoAplicado: prepared.balancingMethod,
          particion: prepared.splitRatio,
          registrosTrain: prepared.splitCounts.train,
          registrosValidacion: prepared.splitCounts.valid,
          registrosTest: prepared.splitCounts.test,
        },
        modelosComparados: models.map((m) => ({
          nombre: m.name,
          esMejor: m.isBest,
          aic: Number(m.aic.toFixed(2)),
          bic: Number(m.bic.toFixed(2)),
          aucTest: Number(m.aucTest.toFixed(4)),
          accuracyTest: Number((m.testMetrics.accuracy * 100).toFixed(2)),
          f1Test: Number((m.testMetrics.f1 * 100).toFixed(2)),
          variables: m.selectedFeatures.length,
        })),
        modeloSeleccionado: {
          nombre: activeModel.name,
          aic: Number(activeModel.aic.toFixed(2)),
          bic: Number(activeModel.bic.toFixed(2)),
          aucTest: Number(activeModel.aucTest.toFixed(4)),
          thresholdEvaluado: threshold,
          thresholdOptimo: activeModel.optimalThreshold,
          matrizConfusionTest: activeModel.testMetrics,
          topVariables: [...activeModel.coefficients]
            .sort((a, b) => Math.abs(b.zValue) - Math.abs(a.zValue))
            .slice(0, 6)
            .map((c) => ({
              variable: c.name,
              beta: Number(c.beta.toFixed(4)),
              pValue: Number(c.pValue.toFixed(4)),
              oddsRatio: Number(c.oddsRatio.toFixed(4)),
              impactoPct: Number(c.impactPct.toFixed(2)),
              interpretacion: c.interpretation,
            })),
        },
      };

      const res = await fetch('/api/executive-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo generar el informe ejecutivo.');
      }

      onReportGenerated(data.report as ExecutiveReportData);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Error inesperado al generar el informe ejecutivo.'
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadReportPdf = () => {
    if (!report) return;
    const doc = new jsPDF();
    let y = 18;
    const addBlock = (title: string, text: string) => {
      if (y > 260) {
        doc.addPage();
        y = 18;
      }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, y);
      y += 6;
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(text, 182);
      for (const line of lines) {
        if (y > 282) {
          doc.addPage();
          y = 18;
        }
        doc.text(line, 14, y);
        y += 4.8;
      }
      y += 4;
    };

    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('Informe Ejecutivo de Analítica Predictiva', 14, y);
    y += 7;
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Base: ${dataset.fileName} | Objetivo: ${prepared.targetColumn} | Modelo: ${activeModel.name}`,
      14,
      y
    );
    y += 10;

    addBlock('1. Resumen Ejecutivo', report.resumenEjecutivo);
    addBlock('2. Calidad de Datos', report.calidadDatos);
    addBlock('3. Modelo Seleccionado', report.modeloSeleccionado);
    addBlock('4. Variables más Importantes', report.variablesImportantes);
    addBlock('5. Odds Ratios', report.oddsRatios);
    addBlock('6. Curva ROC', report.curvaRoc);
    addBlock('7. Matriz de Confusión', report.matrizConfusion);
    addBlock('8. Riesgo Detectado', report.riesgoDetectado);
    addBlock(
      '9. Recomendaciones de Negocio',
      report.recomendacionesNegocio.map((r, i) => `${i + 1}. ${r}`).join('\n')
    );
    addBlock('10. Conclusiones', report.conclusiones);

    doc.save('informe_ejecutivo_regresion_logistica.pdf');
  };

  return (
    <div>
      <ModuleHeader
        stepNumber={15}
        stage="Despliegue"
        title="Informe Ejecutivo Gerencial con IA"
        description="Consolida automáticamente los resultados estadísticos, Odds Ratios, capacidad ROC, riesgos detectados y recomendaciones estratégicas en un reporte listo para comité directivo."
        onPrev={onPrev}
        rightSlot={
          <div className="flex items-center gap-2 no-print">
            {report && (
              <>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir
                </button>
                <button
                  type="button"
                  onClick={downloadReportPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exportar PDF
                </button>
              </>
            )}
            <button
              type="button"
              onClick={generateReport}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white whitespace-nowrap shrink-0"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {report ? 'Regenerar Informe' : 'Generar Informe Ejecutivo'}
            </button>
          </div>
        }
      />

      {/* Executive KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Base Analizada"
          value={dataset.rowCount}
          subtext={`${dataset.fileName} · ${dataset.completenessPct.toFixed(1)}% completa`}
        />
        <KpiCard
          label="Modelo Activo"
          value={activeModel.aucTest.toFixed(3)}
          subtext={`AUC Test · ${activeModel.name.replace(/^Modelo \d+ · /, '')}`}
          tone="positive"
        />
        <KpiCard
          label="Precisión y Cobertura"
          value={`${(activeModel.testMetrics.accuracy * 100).toFixed(1)}%`}
          subtext={`Recall: ${(activeModel.testMetrics.recall * 100).toFixed(1)}% · F1: ${(activeModel.testMetrics.f1 * 100).toFixed(1)}%`}
          tone="accent"
        />
        <KpiCard
          label="Incidencia del Evento"
          value={`${prepared.originalClassCounts.onePct.toFixed(1)}%`}
          subtext={`Objetivo: ${prepared.targetColumn} (${prepared.positiveLabel})`}
        />
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-1">No se pudo completar la generación del informe</div>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 space-y-4">
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800/70 rounded animate-pulse" />
          <div className="h-3 w-5/6 bg-slate-100 dark:bg-slate-800/70 rounded animate-pulse" />
          <div className="h-3 w-4/6 bg-slate-100 dark:bg-slate-800/70 rounded animate-pulse" />
        </div>
      )}

      {!loading && !report && !errorMsg && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center">
          <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">
            Genera tu Informe Ejecutivo Completo
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-5 leading-relaxed">
            Nuestro motor redactará las 10 secciones gerenciales (Resumen Ejecutivo, Calidad de Datos, Modelo Seleccionado, Variables Clave, Odds Ratios, Curva ROC, Matriz de Confusión, Riesgo Detectado, Recomendaciones y Conclusiones) utilizando las cifras reales de tu modelo.
          </p>
          <button
            type="button"
            onClick={generateReport}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Sparkles className="w-4 h-4" />
            Generar Informe Ejecutivo IA
          </button>
        </div>
      )}

      {!loading && report && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="pb-5 border-b border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              Informe Ejecutivo Generado · {dataset.fileName} · {activeModel.name}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Diagnóstico Predictivo de {prepared.targetColumn}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ReportSection title="01. Resumen Ejecutivo" body={report.resumenEjecutivo} full />
            <ReportSection title="02. Calidad de Datos" body={report.calidadDatos} />
            <ReportSection title="03. Modelo Seleccionado" body={report.modeloSeleccionado} />
            <ReportSection title="04. Variables más Importantes" body={report.variablesImportantes} />
            <ReportSection title="05. Interpretación de Odds Ratios" body={report.oddsRatios} />
            <ReportSection title="06. Curva ROC y Discriminación" body={report.curvaRoc} />
            <ReportSection title="07. Matriz de Confusión" body={report.matrizConfusion} />
            <ReportSection title="08. Riesgo Detectado" body={report.riesgoDetectado} full />

            <div className="md:col-span-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                09. Recomendaciones de Negocio
              </h3>
              <ul className="space-y-2">
                {report.recomendacionesNegocio.map((rec, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                  >
                    <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
                      0{i + 1}.
                    </span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            <ReportSection title="10. Conclusiones" body={report.conclusiones} full />
          </div>
        </div>
      )}
    </div>
  );
};

const ReportSection: React.FC<{ title: string; body: string; full?: boolean }> = ({
  title,
  body,
  full,
}) => (
  <div className={full ? 'md:col-span-2' : ''}>
    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">{title}</h3>
    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
      {body}
    </p>
  </div>
);
