import React, { useMemo, useState } from 'react';
import { Award, CheckCircle2, Sliders } from 'lucide-react';
import {
  CurvePoint,
  PreparedData,
  TrainedModel,
} from '../../types/analytics';
import {
  computeConfusionMetrics,
  computeCurvesAndAUC,
} from '../../utils/logisticEngine';
import { InfoTooltip, KpiCard, ModuleHeader } from '../ui/InfoTooltip';

/* ============================================================================
   MÓDULO 9: MATRIZ DE CONFUSIÓN
============================================================================ */
interface Module9Props {
  model: TrainedModel;
  prepared: PreparedData;
  threshold: number;
  onChangeThreshold: (t: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

export const Module9ConfusionMatrix: React.FC<Module9Props> = ({
  model,
  prepared,
  threshold,
  onChangeThreshold,
  onPrev,
  onNext,
}) => {
  const [evalSplit, setEvalSplit] = useState<'test' | 'valid' | 'train'>('test');

  const { probs, yTrue } = useMemo(() => {
    if (evalSplit === 'train') return { probs: model.trainProbs, yTrue: prepared.trainY };
    if (evalSplit === 'valid') return { probs: model.validProbs, yTrue: prepared.validY };
    return { probs: model.testProbs, yTrue: prepared.testY };
  }, [evalSplit, model, prepared]);

  const metrics = useMemo(
    () => computeConfusionMetrics(probs, yTrue, threshold),
    [probs, yTrue, threshold]
  );

  const total = Math.max(1, metrics.tp + metrics.tn + metrics.fp + metrics.fn);

  return (
    <div>
      <ModuleHeader
        stepNumber={9}
        stage="Evaluación"
        title="Matriz de Confusión y Métricas de Clasificación"
        description="Evalúa los aciertos y errores reales del modelo sobre datos independientes ajustando el punto de corte (Threshold)."
        onPrev={onPrev}
        onNext={onNext}
        nextLabel="Ver Curva ROC"
      />

      {/* Split Selector & Cutoff Slider */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
          {(
            [
              { id: 'test', label: `Test (${prepared.testY.length})` },
              { id: 'valid', label: `Validación (${prepared.validY.length})` },
              { id: 'train', label: `Train (${prepared.trainY.length})` },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setEvalSplit(s.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                evalSplit === s.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1 max-w-xl">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center">
                Punto de Corte (Threshold)
                <InfoTooltip
                  title="Punto de Corte"
                  text="Probabilidad mínima para clasificar un caso como Positivo (1). Bajar el corte aumenta el Recall; subirlo aumenta la Precision."
                />
              </span>
              <span className="font-mono tabular-nums font-bold text-blue-700 dark:text-blue-400">
                {(threshold * 100).toFixed(0)}% ({threshold.toFixed(2)})
              </span>
            </div>
            <input
              type="range"
              min={0.05}
              max={0.95}
              step={0.01}
              value={threshold}
              onChange={(e) => onChangeThreshold(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>
          <button
            type="button"
            onClick={() => onChangeThreshold(model.optimalThreshold)}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/70 whitespace-nowrap shrink-0"
          >
            Usar Óptimo ({model.optimalThreshold.toFixed(2)})
          </button>
        </div>
      </div>

      {/* 2x2 Matrix + 6 Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Matriz 2 × 2 (Predicho vs Real)
          </h2>

          <div className="grid grid-cols-12 gap-3 items-center">
            <div className="col-span-2" />
            <div className="col-span-5 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
              Real: Negativo (0)
            </div>
            <div className="col-span-5 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
              Real: Positivo (1)
            </div>

            {/* Row 1: Pred 0 */}
            <div className="col-span-2 text-right pr-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Pred: 0
            </div>
            <div className="col-span-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/80 text-center">
              <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                TN · Verdadero Negativo
              </div>
              <div className="text-3xl font-bold font-mono tabular-nums text-emerald-900 dark:text-emerald-200 my-1">
                {metrics.tn}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                {((metrics.tn / total) * 100).toFixed(1)}% del total
              </div>
            </div>
            <div className="col-span-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/80 text-center">
              <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                FN · Falso Negativo
              </div>
              <div className="text-3xl font-bold font-mono tabular-nums text-amber-900 dark:text-amber-200 my-1">
                {metrics.fn}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-amber-700 dark:text-amber-400">
                {((metrics.fn / total) * 100).toFixed(1)}% (Riesgo omitido)
              </div>
            </div>

            {/* Row 2: Pred 1 */}
            <div className="col-span-2 text-right pr-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Pred: 1
            </div>
            <div className="col-span-5 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/35 border border-rose-200 dark:border-rose-800/80 text-center">
              <div className="text-[11px] font-semibold text-rose-800 dark:text-rose-300">
                FP · Falso Positivo
              </div>
              <div className="text-3xl font-bold font-mono tabular-nums text-rose-900 dark:text-rose-200 my-1">
                {metrics.fp}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-rose-700 dark:text-rose-400">
                {((metrics.fp / total) * 100).toFixed(1)}% (Falsa alarma)
              </div>
            </div>
            <div className="col-span-5 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/35 border border-blue-200 dark:border-blue-800/80 text-center">
              <div className="text-[11px] font-semibold text-blue-800 dark:text-blue-300">
                TP · Verdadero Positivo
              </div>
              <div className="text-3xl font-bold font-mono tabular-nums text-blue-900 dark:text-blue-200 my-1">
                {metrics.tp}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-blue-700 dark:text-blue-400">
                {((metrics.tp / total) * 100).toFixed(1)}% del total
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <KpiCard
            label="Accuracy (Exactitud)"
            value={`${(metrics.accuracy * 100).toFixed(1)}%`}
            subtext={`${metrics.tp + metrics.tn} de ${total} aciertos`}
            tone={metrics.accuracy >= 0.75 ? 'positive' : 'neutral'}
            tooltip="Proporción total de predicciones correctas (TP + TN) sobre el total."
          />
          <KpiCard
            label="Recall (Sensibilidad)"
            value={`${(metrics.recall * 100).toFixed(1)}%`}
            subtext="Cobertura de casos reales = 1"
            tone="accent"
            tooltip="De todos los casos positivos reales, qué porcentaje logra detectar el modelo."
          />
          <KpiCard
            label="Precision (VPP)"
            value={`${(metrics.precision * 100).toFixed(1)}%`}
            subtext="Confiabilidad al alertar"
            tooltip="Cuando el modelo predice 1, qué porcentaje es realmente positivo."
          />
          <KpiCard
            label="F1 Score"
            value={`${(metrics.f1 * 100).toFixed(1)}%`}
            subtext="Media armónica P & R"
            tone={metrics.f1 >= 0.65 ? 'positive' : 'warning'}
            tooltip="Equilibrio entre Precision y Recall; ideal para clases desbalanceadas."
          />
          <KpiCard
            label="Specificity"
            value={`${(metrics.specificity * 100).toFixed(1)}%`}
            subtext="Acierto en negativos (0)"
            tooltip="De todos los casos negativos reales, qué porcentaje clasifica bien."
          />
          <KpiCard
            label="Balanced Accuracy"
            value={`${(metrics.balancedAccuracy * 100).toFixed(1)}%`}
            subtext="Promedio Recall & Especif."
            tone="accent"
            tooltip="Exactitud balanceada promedio entre ambas clases."
          />
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   MÓDULO 10: CURVA ROC
============================================================================ */
interface Module10Props {
  models: TrainedModel[];
  activeModel: TrainedModel;
  onPrev: () => void;
  onNext: () => void;
}

const MODEL_COLORS: Record<string, string> = {
  full: '#64748b',
  forward: '#0ea5e9',
  backward: '#f59e0b',
  both: '#2563eb',
  best_subsets: '#10b981',
};

export const Module10RocCurve: React.FC<Module10Props> = ({
  models,
  activeModel,
  onPrev,
  onNext,
}) => {
  const [compareAll, setCompareAll] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const auc = activeModel.aucTest;
  const interpretation =
    auc >= 0.9
      ? `AUC = ${auc.toFixed(3)} indica una excelente capacidad discriminatoria.`
      : auc >= 0.8
        ? `AUC = ${auc.toFixed(3)} indica una muy buena capacidad discriminatoria para separar clases.`
        : auc >= 0.7
          ? `AUC = ${auc.toFixed(3)} indica una capacidad discriminatoria aceptable para apoyo a decisiones.`
          : `AUC = ${auc.toFixed(3)} indica una capacidad discriminatoria moderada; evalúa agregar predictores o balancear.`;

  const W = 560;
  const H = 360;
  const PAD = 48;
  const plotW = W - PAD * 2;
  const plotH = H - PAD * 2;

  const toX = (fpr: number) => PAD + fpr * plotW;
  const toY = (tpr: number) => PAD + (1 - tpr) * plotH;

  const buildPath = (pts: CurvePoint[]) => {
    const sorted = [...pts].sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr);
    return sorted
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.fpr).toFixed(1)} ${toY(p.tpr).toFixed(1)}`)
      .join(' ');
  };

  const activeSorted = useMemo(
    () => [...activeModel.rocCurve].sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr),
    [activeModel]
  );

  const activePath = buildPath(activeSorted);
  const areaPath = `${activePath} L ${toX(1).toFixed(1)} ${toY(0).toFixed(1)} L ${toX(0).toFixed(1)} ${toY(0).toFixed(1)} Z`;
  const hoveredPoint = hoverIdx !== null ? activeSorted[hoverIdx] : null;

  return (
    <div>
      <ModuleHeader
        stepNumber={10}
        stage="Evaluación"
        title="Curva ROC y Capacidad Discriminatoria (AUC)"
        description="Visualiza el equilibrio entre la Tasa de Verdaderos Positivos (Sensibilidad) y la Tasa de Falsos Positivos en todos los umbrales posibles."
        onPrev={onPrev}
        onNext={onNext}
        nextLabel="Curva Precision-Recall"
        rightSlot={
          <button
            type="button"
            onClick={() => setCompareAll((v) => !v)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              compareAll
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {compareAll ? 'Mostrando los 5 modelos' : 'Comparar los 5 modelos'}
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Curva ROC Interactivo (Test)
            </h2>
            {hoveredPoint ? (
              <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                Cutoff: {hoveredPoint.threshold.toFixed(2)} · TPR:{' '}
                {(hoveredPoint.tpr * 100).toFixed(1)}% · FPR:{' '}
                {(hoveredPoint.fpr * 100).toFixed(1)}%
              </div>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Pasa el cursor sobre la curva para inspeccionar umbrales
              </div>
            )}
          </div>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto select-none"
            onMouseLeave={() => setHoverIdx(null)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = ((e.clientX - rect.left) / rect.width) * W;
              const targetFpr = Math.max(0, Math.min(1, (relX - PAD) / plotW));
              let best = 0;
              let bestDist = Infinity;
              activeSorted.forEach((pt, idx) => {
                const d = Math.abs(pt.fpr - targetFpr);
                if (d < bestDist) {
                  bestDist = d;
                  best = idx;
                }
              });
              setHoverIdx(best);
            }}
          >
            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <g key={t}>
                <line
                  x1={toX(0)}
                  y1={toY(t)}
                  x2={toX(1)}
                  y2={toY(t)}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeDasharray="3 3"
                />
                <line
                  x1={toX(t)}
                  y1={toY(0)}
                  x2={toX(t)}
                  y2={toY(1)}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeDasharray="3 3"
                />
                <text
                  x={PAD - 8}
                  y={toY(t) + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {t.toFixed(2)}
                </text>
                <text
                  x={toX(t)}
                  y={H - PAD + 16}
                  textAnchor="middle"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {t.toFixed(2)}
                </text>
              </g>
            ))}

            {/* Axes labels */}
            <text
              x={W / 2}
              y={H - 8}
              textAnchor="middle"
              className="fill-slate-500 dark:fill-slate-400 text-[11px] font-medium"
            >
              Tasa de Falsos Positivos (1 - Especificidad)
            </text>
            <text
              x={14}
              y={H / 2}
              textAnchor="middle"
              transform={`rotate(-90 14 ${H / 2})`}
              className="fill-slate-500 dark:fill-slate-400 text-[11px] font-medium"
            >
              Tasa de Verdaderos Positivos (Sensibilidad)
            </text>

            {/* Random Diagonal */}
            <line
              x1={toX(0)}
              y1={toY(0)}
              x2={toX(1)}
              y2={toY(1)}
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />

            {/* Area shading */}
            {!compareAll && <path d={areaPath} fill="#2563eb" fillOpacity="0.12" />}

            {/* Multi-model overlay */}
            {compareAll &&
              models.map((m) => (
                <path
                  key={m.id}
                  d={buildPath(m.rocCurve)}
                  fill="none"
                  stroke={MODEL_COLORS[m.id] ?? '#2563eb'}
                  strokeWidth={m.id === activeModel.id ? 3 : 1.75}
                  strokeOpacity={m.id === activeModel.id ? 1 : 0.65}
                />
              ))}

            {/* Active ROC line */}
            {!compareAll && (
              <path
                d={activePath}
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                strokeLinecap="round"
              />
            )}

            {/* Hover crosshair */}
            {hoveredPoint && (
              <g>
                <line
                  x1={toX(hoveredPoint.fpr)}
                  y1={toY(0)}
                  x2={toX(hoveredPoint.fpr)}
                  y2={toY(1)}
                  stroke="#3b82f6"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={toX(hoveredPoint.fpr)}
                  cy={toY(hoveredPoint.tpr)}
                  r="5.5"
                  fill="#2563eb"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>

          {compareAll && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 text-xs">
              {models.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <span
                    className="w-3 h-1.5 rounded-sm inline-block"
                    style={{ backgroundColor: MODEL_COLORS[m.id] }}
                  />
                  <span className="text-slate-700 dark:text-slate-300">
                    {m.name.replace(/^Modelo \d+ · /, '')}
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                    ({m.aucTest.toFixed(3)})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Interpretation Column */}
        <div className="lg:col-span-4 space-y-4">
          <KpiCard
            label="AUC en Prueba (Test)"
            value={activeModel.aucTest.toFixed(3)}
            subtext={`Train: ${activeModel.aucTrain.toFixed(3)} · Validación: ${activeModel.aucValid.toFixed(3)}`}
            tone={auc >= 0.8 ? 'positive' : 'accent'}
            tooltip="Valores cercanos a 1.0 indican discriminación perfecta; 0.50 equivale a lanzar una moneda al aire."
          />
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Interpretación Automática
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed mb-3">
              {interpretation}
            </p>
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div>· 0.90 – 1.00: Discriminación excelente</div>
              <div>· 0.80 – 0.89: Muy buena capacidad</div>
              <div>· 0.70 – 0.79: Aceptable para negocio</div>
              <div>· 0.50 – 0.69: Baja separación (revisar variables)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   MÓDULO 11: CURVA PRECISION-RECALL
============================================================================ */
interface Module11Props {
  model: TrainedModel;
  threshold: number;
  onChangeThreshold: (t: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

export const Module11PrecisionRecall: React.FC<Module11Props> = ({
  model,
  threshold,
  onChangeThreshold,
  onPrev,
  onNext,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const sortedPts = useMemo(
    () =>
      [...model.rocCurve]
        .filter((p) => p.threshold > 0 && p.threshold < 1)
        .sort((a, b) => a.recall - b.recall),
    [model]
  );

  const optimalPt = useMemo(() => {
    return (
      sortedPts.reduce(
        (best, cur) => (cur.f1 > best.f1 ? cur : best),
        sortedPts[0] ?? {
          threshold: 0.5,
          precision: 0.5,
          recall: 0.5,
          f1: 0.5,
          fpr: 0,
          tpr: 0,
          rpp: 0,
          lift: 1,
          gain: 0,
          profit: 0,
        }
      )
    );
  }, [sortedPts]);

  const W = 560;
  const H = 350;
  const PAD = 48;
  const plotW = W - PAD * 2;
  const plotH = H - PAD * 2;

  const toX = (rec: number) => PAD + rec * plotW;
  const toY = (prec: number) => PAD + (1 - prec) * plotH;

  const prPath = sortedPts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.recall).toFixed(1)} ${toY(p.precision).toFixed(1)}`)
    .join(' ');

  const hovered = hoverIdx !== null ? sortedPts[hoverIdx] : null;

  return (
    <div>
      <ModuleHeader
        stepNumber={11}
        stage="Evaluación"
        title="Curva Precision–Recall y Threshold Óptimo"
        description="Indispensable cuando las clases están desbalanceadas: encuentra el punto de corte que maximiza el equilibrio (F1 Score) entre precisión de alertas y cobertura."
        onPrev={onPrev}
        onNext={onNext}
        nextLabel="Curva de Ganancias"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Precision vs Recall por Umbral (Threshold)
            </h2>
            {hovered ? (
              <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                Cutoff: {hovered.threshold.toFixed(2)} · Prec:{' '}
                {(hovered.precision * 100).toFixed(1)}% · Rec:{' '}
                {(hovered.recall * 100).toFixed(1)}% · F1: {(hovered.f1 * 100).toFixed(1)}%
              </div>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                El marcador verde señala el punto F1 máximo
              </div>
            )}
          </div>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto select-none"
            onMouseLeave={() => setHoverIdx(null)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = ((e.clientX - rect.left) / rect.width) * W;
              const targetRec = Math.max(0, Math.min(1, (relX - PAD) / plotW));
              let best = 0;
              let bestDist = Infinity;
              sortedPts.forEach((pt, idx) => {
                const d = Math.abs(pt.recall - targetRec);
                if (d < bestDist) {
                  bestDist = d;
                  best = idx;
                }
              });
              setHoverIdx(best);
            }}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <g key={t}>
                <line
                  x1={toX(0)}
                  y1={toY(t)}
                  x2={toX(1)}
                  y2={toY(t)}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeDasharray="3 3"
                />
                <line
                  x1={toX(t)}
                  y1={toY(0)}
                  x2={toX(t)}
                  y2={toY(1)}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeDasharray="3 3"
                />
                <text
                  x={PAD - 8}
                  y={toY(t) + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {t.toFixed(2)}
                </text>
                <text
                  x={toX(t)}
                  y={H - PAD + 16}
                  textAnchor="middle"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {t.toFixed(2)}
                </text>
              </g>
            ))}

            <text
              x={W / 2}
              y={H - 8}
              textAnchor="middle"
              className="fill-slate-500 dark:fill-slate-400 text-[11px] font-medium"
            >
              Recall (Sensibilidad / Exhaustividad)
            </text>
            <text
              x={14}
              y={H / 2}
              textAnchor="middle"
              transform={`rotate(-90 14 ${H / 2})`}
              className="fill-slate-500 dark:fill-slate-400 text-[11px] font-medium"
            >
              Precision (Valor Predictivo Positivo)
            </text>

            {/* Baseline positive rate */}
            <line
              x1={toX(0)}
              y1={toY(model.baseProb)}
              x2={toX(1)}
              y2={toY(model.baseProb)}
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />

            <path d={prPath} fill="none" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />

            {/* Optimal Threshold Marker */}
            <circle
              cx={toX(optimalPt.recall)}
              cy={toY(optimalPt.precision)}
              r="7"
              fill="#16a34a"
              stroke="#ffffff"
              strokeWidth="2.5"
            />

            {hovered && (
              <circle
                cx={toX(hovered.recall)}
                cy={toY(hovered.precision)}
                r="5"
                fill="#0284c7"
                stroke="#ffffff"
                strokeWidth="2"
              />
            )}
          </svg>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
              <Award className="w-4 h-4" />
              Threshold Óptimo Detectado
            </div>
            <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white my-2">
              {optimalPt.threshold.toFixed(2)}
            </div>
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-4">
              <div className="flex justify-between">
                <span>Precision en punto óptimo:</span>
                <span className="font-mono font-semibold">
                  {(optimalPt.precision * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Recall en punto óptimo:</span>
                <span className="font-mono font-semibold">
                  {(optimalPt.recall * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>F1 Score máximo:</span>
                <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                  {(optimalPt.f1 * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onChangeThreshold(optimalPt.threshold)}
              className="w-full py-2 px-4 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              {Math.abs(threshold - optimalPt.threshold) < 0.01
                ? 'Threshold Óptimo Activo'
                : `Aplicar Threshold ${optimalPt.threshold.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   MÓDULO 12: CURVA DE GANANCIAS (GAIN, LIFT Y PROFIT CHART)
============================================================================ */
interface Module12Props {
  model: TrainedModel;
  prepared: PreparedData;
  onPrev: () => void;
  onNext: () => void;
}

export const Module12GainsLiftProfit: React.FC<Module12Props> = ({
  model,
  prepared,
  onPrev,
  onNext,
}) => {
  const [benefitPerTp, setBenefitPerTp] = useState(500);
  const [costPerContact, setCostPerContact] = useState(100);
  const [chartTab, setChartTab] = useState<'gain' | 'lift' | 'profit'>('profit');

  const points = useMemo(() => {
    const res = computeCurvesAndAUC(
      model.testProbs,
      prepared.testY,
      model.baseProb,
      benefitPerTp,
      costPerContact
    );
    return res.points;
  }, [model, prepared, benefitPerTp, costPerContact]);

  const bestProfitPt = useMemo(() => {
    return points.reduce(
      (best, cur) => (cur.profit > best.profit ? cur : best),
      points[0] ?? {
        threshold: 0.5,
        profit: 0,
        gain: 0,
        lift: 1,
        rpp: 0,
        precision: 0,
        recall: 0,
        fpr: 0,
        tpr: 0,
        f1: 0,
      }
    );
  }, [points]);

  // Top 20% RPP point for executive Gain/Lift summary
  const top20Pt = useMemo(() => {
    return points.reduce((best, cur) =>
      Math.abs(cur.rpp - 0.2) < Math.abs(best.rpp - 0.2) ? cur : best
    );
  }, [points]);

  const W = 640;
  const H = 330;
  const PAD = 52;
  const plotW = W - PAD * 2;
  const plotH = H - PAD * 2;

  const gainPoints = useMemo(() => [...points].sort((a, b) => a.rpp - b.rpp), [points]);
  const liftPoints = useMemo(
    () => [...points].filter((p) => p.rpp >= 0.03).sort((a, b) => a.rpp - b.rpp),
    [points]
  );
  const profitPoints = useMemo(
    () => [...points].filter((p) => p.threshold > 0.02 && p.threshold < 0.98).sort((a, b) => a.threshold - b.threshold),
    [points]
  );

  const maxLift = Math.max(2, ...liftPoints.map((p) => p.lift));
  const minProfit = Math.min(0, ...profitPoints.map((p) => p.profit));
  const maxProfit = Math.max(50, ...profitPoints.map((p) => p.profit));

  return (
    <div>
      <ModuleHeader
        stepNumber={12}
        stage="Evaluación"
        title="Curva de Ganancias, Lift y Utilidad por Cutoff"
        description="Basado en la evaluación financiera del script: mide cuántos casos positivos capturas contactando a los clientes prioritarios y cuál es el cutoff que maximiza la ganancia neta."
        onPrev={onPrev}
        onNext={onNext}
        nextLabel="Explicabilidad (SHAP)"
      />

      {/* Financial Parameters & Summary KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Beneficio por Acierto ($ TP)
            </label>
            <input
              type="number"
              value={benefitPerTp}
              onChange={(e) => setBenefitPerTp(Math.max(10, Number(e.target.value)))}
              className="w-full px-3 py-1.5 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Costo de Gestión ($ por caso)
            </label>
            <input
              type="number"
              value={costPerContact}
              onChange={(e) => setCostPerContact(Math.max(0, Number(e.target.value)))}
              className="w-full px-3 py-1.5 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-3 gap-4">
          <KpiCard
            label="Ganancia Máxima Estimada"
            value={`$${bestProfitPt.profit.toFixed(1)}`}
            subtext={`Cutoff óptimo: ${bestProfitPt.threshold.toFixed(2)}`}
            tone="positive"
            tooltip="Utilidad esperada por caso analizado siguiendo la fórmula financiera del modelo."
          />
          <KpiCard
            label="Captura en Top 20%"
            value={`${(top20Pt.gain * 100).toFixed(1)}%`}
            subtext="De todos los casos positivos"
            tone="accent"
          />
          <KpiCard
            label="Lift en Top 20%"
            value={`${top20Pt.lift.toFixed(2)}x`}
            subtext="Veces mejor que el azar"
          />
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
            {(
              [
                { id: 'profit', label: 'Profit Chart (Ganancias vs Cutoff)' },
                { id: 'gain', label: 'Gain Chart (TPR vs RPP)' },
                { id: 'lift', label: 'Lift Chart (Elevación)' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setChartTab(t.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  chartTab === t.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            <span>Fórmula: tasa_base × Recall × (Beneficio − Costo / Precision)</span>
          </div>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = PAD + (1 - frac) * plotH;
            let yLabel = '';
            if (chartTab === 'gain') yLabel = `${(frac * 100).toFixed(0)}%`;
            else if (chartTab === 'lift')
              yLabel = `${(1 + frac * (maxLift - 1)).toFixed(1)}x`;
            else yLabel = `$${(minProfit + frac * (maxProfit - minProfit)).toFixed(0)}`;

            return (
              <g key={frac}>
                <line
                  x1={PAD}
                  y1={y}
                  x2={PAD + plotW}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeDasharray="3 3"
                />
                <text
                  x={PAD - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {yLabel}
                </text>
              </g>
            );
          })}

          {[0, 0.25, 0.5, 0.75, 1].map((xFrac) => {
            const x = PAD + xFrac * plotW;
            const xLabel = chartTab === 'profit' ? xFrac.toFixed(2) : `${(xFrac * 100).toFixed(0)}%`;
            return (
              <g key={xFrac}>
                <line
                  x1={x}
                  y1={PAD}
                  x2={x}
                  y2={PAD + plotH}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeDasharray="3 3"
                />
                <text
                  x={x}
                  y={H - PAD + 16}
                  textAnchor="middle"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {xLabel}
                </text>
              </g>
            );
          })}

          <text
            x={W / 2}
            y={H - 8}
            textAnchor="middle"
            className="fill-slate-500 dark:fill-slate-400 text-[11px] font-medium"
          >
            {chartTab === 'profit'
              ? 'Punto de Corte (Cutoff)'
              : '% de Población Contactada (Rate of Positive Predictions)'}
          </text>

          {chartTab === 'gain' && (
            <>
              <line
                x1={PAD}
                y1={PAD + plotH}
                x2={PAD + plotW}
                y2={PAD}
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
              <path
                d={gainPoints
                  .map(
                    (p, i) =>
                      `${i === 0 ? 'M' : 'L'} ${(PAD + p.rpp * plotW).toFixed(1)} ${(PAD + (1 - p.gain) * plotH).toFixed(1)}`
                  )
                  .join(' ')}
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
              />
            </>
          )}

          {chartTab === 'lift' && (
            <>
              <line
                x1={PAD}
                y1={PAD + plotH}
                x2={PAD + plotW}
                y2={PAD + plotH}
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
              <path
                d={liftPoints
                  .map((p, i) => {
                    const normY = Math.max(0, Math.min(1, (p.lift - 1) / Math.max(0.5, maxLift - 1)));
                    return `${i === 0 ? 'M' : 'L'} ${(PAD + p.rpp * plotW).toFixed(1)} ${(PAD + (1 - normY) * plotH).toFixed(1)}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#d97706"
                strokeWidth="3"
              />
            </>
          )}

          {chartTab === 'profit' && (
            <>
              {minProfit < 0 && (
                <line
                  x1={PAD}
                  y1={PAD + (1 - (0 - minProfit) / (maxProfit - minProfit)) * plotH}
                  x2={PAD + plotW}
                  y2={PAD + (1 - (0 - minProfit) / (maxProfit - minProfit)) * plotH}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                />
              )}
              <path
                d={profitPoints
                  .map((p, i) => {
                    const normY = (p.profit - minProfit) / Math.max(1, maxProfit - minProfit);
                    return `${i === 0 ? 'M' : 'L'} ${(PAD + p.threshold * plotW).toFixed(1)} ${(PAD + (1 - normY) * plotH).toFixed(1)}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#16a34a"
                strokeWidth="3"
              />
              <circle
                cx={PAD + bestProfitPt.threshold * plotW}
                cy={
                  PAD +
                  (1 -
                    (bestProfitPt.profit - minProfit) /
                      Math.max(1, maxProfit - minProfit)) *
                    plotH
                }
                r="6"
                fill="#16a34a"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </>
          )}
        </svg>
      </div>
    </div>
  );
};
