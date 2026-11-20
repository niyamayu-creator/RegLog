import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  ShieldAlert,
  Trophy,
} from 'lucide-react';
import {
  ModelId,
  PreparedData,
  TrainedModel,
} from '../../types/analytics';
import { computeSingleCaseProbability } from '../../utils/logisticEngine';
import { InfoTooltip, KpiCard, ModuleHeader } from '../ui/InfoTooltip';

/* ============================================================================
   MÓDULO 5: MODELOS DE REGRESIÓN LOGÍSTICA & COMPARADOR
============================================================================ */
interface Module5Props {
  models: TrainedModel[];
  activeModelId: ModelId;
  onSelectModel: (id: ModelId) => void;
  onPrev: () => void;
  onNext: () => void;
}

export const Module5ModelsComparator: React.FC<Module5Props> = ({
  models,
  activeModelId,
  onSelectModel,
  onPrev,
  onNext,
}) => {
  const activeModel = models.find((m) => m.id === activeModelId) ?? models[0];
  const bestModel = models.find((m) => m.isBest) ?? models[0];

  return (
    <div>
      <ModuleHeader
        stepNumber={5}
        stage="Modelado"
        title="Comparador de Modelos de Regresión Logística"
        description="Se han entrenado automáticamente los 5 enfoques de modelado y selección de variables. Selecciona cualquier fila para inspeccionar sus ecuaciones, curvas e interpretaciones en los siguientes módulos."
        onPrev={onPrev}
        onNext={onNext}
        nextLabel="Ver Interpretación"
      />

      {/* Top KPI summary for Active Model */}
      {activeModel && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <KpiCard
            label="Modelo en inspección"
            value={activeModel.selectedFeatures.length}
            subtext={activeModel.name.replace(/^Modelo \d+ · /, '')}
            tooltip="Cantidad de variables predictoras retenidas en el modelo seleccionado."
          />
          <KpiCard
            label="AUC (Test)"
            value={activeModel.aucTest.toFixed(3)}
            subtext={`Train: ${activeModel.aucTrain.toFixed(3)} · Valid: ${activeModel.aucValid.toFixed(3)}`}
            tone={activeModel.aucTest >= 0.8 ? 'positive' : 'accent'}
            tooltip="Área bajo la curva ROC medida en datos de prueba independientes."
          />
          <KpiCard
            label="Criterio AIC / BIC"
            value={activeModel.aic.toFixed(1)}
            subtext={`BIC: ${activeModel.bic.toFixed(1)} · Pseudo-R²: ${(activeModel.pseudoR2 * 100).toFixed(1)}%`}
            tooltip="Menor AIC indica mejor equilibrio entre ajuste y simplicidad."
          />
          <KpiCard
            label="Accuracy / F1 (Test)"
            value={`${(activeModel.testMetrics.accuracy * 100).toFixed(1)}%`}
            subtext={`F1 Score: ${(activeModel.testMetrics.f1 * 100).toFixed(1)}%`}
          />
          <KpiCard
            label="Sensibilidad / Especif."
            value={`${(activeModel.testMetrics.recall * 100).toFixed(1)}%`}
            subtext={`Especificidad: ${(activeModel.testMetrics.specificity * 100).toFixed(1)}%`}
            tone="accent"
          />
        </div>
      )}

      {/* Best Model Banner (No thick left accent border, clean hairline container) */}
      {bestModel && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                Mejor Modelo Recomendado Automáticamente: {bestModel.name}
              </div>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                Logra el mejor equilibrio entre capacidad discriminatoria en Test (AUC ={' '}
                <span className="font-mono font-semibold">{bestModel.aucTest.toFixed(3)}</span>),
                F1 Score (<span className="font-mono font-semibold">{(bestModel.testMetrics.f1 * 100).toFixed(1)}%</span>) y
                parsimonia (AIC = <span className="font-mono font-semibold">{bestModel.aic.toFixed(1)}</span>) con{' '}
                {bestModel.selectedFeatures.length} variables.
              </p>
            </div>
          </div>
          {activeModelId !== bestModel.id && (
            <button
              type="button"
              onClick={() => onSelectModel(bestModel.id)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap shrink-0 transition-colors"
            >
              Activar Mejor Modelo
            </button>
          )}
        </div>
      )}

      {/* Visual Comparison Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Tabla Comparativa de Desempeño (Evaluación en Test)
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Haz clic en cualquier modelo para analizarlo en detalle
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold">Modelo</th>
                <th className="py-3 px-2.5 font-semibold text-right">AIC</th>
                <th className="py-3 px-2.5 font-semibold text-right">BIC</th>
                <th className="py-3 px-2.5 font-semibold text-right">Accuracy</th>
                <th className="py-3 px-2.5 font-semibold text-right">Precision</th>
                <th className="py-3 px-2.5 font-semibold text-right">Recall</th>
                <th className="py-3 px-2.5 font-semibold text-right">Specificity</th>
                <th className="py-3 px-2.5 font-semibold text-right">F1 Score</th>
                <th className="py-3 px-2.5 font-semibold text-right">AUC</th>
                <th className="py-3 px-2.5 font-semibold text-right">Sensibilidad</th>
                <th className="py-3 px-2.5 font-semibold text-right">Error</th>
                <th className="py-3 px-4 font-semibold">Variables seleccionadas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {models.map((m) => {
                const isActive = m.id === activeModelId;
                return (
                  <tr
                    key={m.id}
                    onClick={() => onSelectModel(m.id)}
                    className={`cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-blue-50/70 dark:bg-blue-950/35'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 px-4 min-w-[230px]">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={isActive}
                          onChange={() => onSelectModel(m.id)}
                          aria-label={`Seleccionar ${m.name}`}
                          className="accent-blue-600"
                        />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{m.name}</span>
                            {m.isBest && (
                              <span
                                title="Mejor Modelo"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
                              >
                                <Trophy className="w-3.5 h-3.5" />
                                Mejor Modelo
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {m.subtitle}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                      {m.aic.toFixed(1)}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                      {m.bic.toFixed(1)}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                      {(m.testMetrics.accuracy * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                      {(m.testMetrics.precision * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                      {(m.testMetrics.recall * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                      {(m.testMetrics.specificity * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums font-medium">
                      {(m.testMetrics.f1 * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums font-semibold text-blue-700 dark:text-blue-400">
                      {m.aucTest.toFixed(3)}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                      {(m.testMetrics.recall * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                      {(m.testMetrics.errorRate * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 min-w-[220px]">
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        <span className="font-mono font-semibold text-slate-900 dark:text-white mr-1">
                          ({m.selectedFeatures.length})
                        </span>
                        {m.selectedFeatures.join(' · ')}
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
  );
};

/* ============================================================================
   MÓDULO 6: INTERPRETACIÓN AUTOMÁTICA
============================================================================ */
interface Module6Props {
  model: TrainedModel;
  onPrev: () => void;
  onNext: () => void;
}

export const Module6Interpretation: React.FC<Module6Props> = ({
  model,
  onPrev,
  onNext,
}) => {
  const equationString = useMemo(() => {
    const terms = model.coefficients.map((c) => {
      const sign = c.beta >= 0 ? '+' : '-';
      return `${sign} ${Math.abs(c.beta).toFixed(4)}(${c.name})`;
    });
    return `Logit(P) = ${model.intercept.toFixed(4)} ${terms.join(' ')}`;
  }, [model]);

  return (
    <div>
      <ModuleHeader
        stepNumber={6}
        stage="Modelado"
        title="Interpretación Automática de Coeficientes"
        description={`Traducción directa a lenguaje de negocio para ${model.name}. Descubre qué variables impulsan o reducen la probabilidad del evento objetivo.`}
        onPrev={onPrev}
        onNext={onNext}
        nextLabel="Analizar Odds Ratios"
      />

      {/* Logistic Equation Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center">
            Ecuación Logística Estimada
            <InfoTooltip
              title="Ecuación Logit(P)"
              text="La probabilidad final P se obtiene aplicando la función logística: P = 1 / (1 + exp(-Logit(P))). Un coeficiente positivo aumenta la probabilidad; uno negativo la reduce."
            />
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Intercepto β₀ = {model.intercept.toFixed(4)} (p = {model.interceptP.toFixed(4)})
          </span>
        </div>
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs sm:text-sm text-slate-900 dark:text-blue-200 overflow-x-auto leading-relaxed">
          {equationString}
        </div>
      </div>

      {/* Coefficients Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Tabla de Coeficientes, Significancia e Impacto de Negocio
          </h2>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Significancia: *** p &lt; 0.001 · ** p &lt; 0.01 · * p &lt; 0.05 · ns No significativa
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold">Variable</th>
                <th className="py-3 px-3 font-semibold text-right">Coeficiente (β)</th>
                <th className="py-3 px-3 font-semibold text-right">P-value</th>
                <th className="py-3 px-3 font-semibold text-right">Odds Ratio</th>
                <th className="py-3 px-3 font-semibold text-right">Impacto %</th>
                <th className="py-3 px-4 font-semibold">Interpretación Automática</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {model.coefficients.map((c) => {
                const isIncrease = c.oddsRatio >= 1;
                const isSignificant = c.pValue < 0.05;
                return (
                  <tr
                    key={c.name}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {c.name}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {c.beta >= 0 ? `+${c.beta.toFixed(4)}` : c.beta.toFixed(4)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <span
                        className={
                          isSignificant
                            ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                            : 'text-slate-500 dark:text-slate-400'
                        }
                      >
                        {c.pValue < 0.0001 ? '< 0.0001' : c.pValue.toFixed(4)} ({c.significance})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                      {c.oddsRatio.toFixed(3)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                        isIncrease
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {c.impactPct >= 0 ? `+${c.impactPct.toFixed(1)}%` : `${c.impactPct.toFixed(1)}%`}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 leading-relaxed min-w-[280px]">
                      {c.interpretation}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   MÓDULO 7: ANALIZADOR DE ODDS RATIOS (GAUGES, BARRAS Y HEATMAP DE PASOS)
============================================================================ */
interface Module7Props {
  model: TrainedModel;
  prepared: PreparedData;
  onPrev: () => void;
  onNext: () => void;
}

export const Module7OddsAnalyzer: React.FC<Module7Props> = ({
  model,
  prepared,
  onPrev,
  onNext,
}) => {
  const [selectedCoefName, setSelectedCoefName] = useState<string>(
    model.coefficients[0]?.name ?? ''
  );

  useEffect(() => {
    if (!model.coefficients.some((c) => c.name === selectedCoefName)) {
      setSelectedCoefName(model.coefficients[0]?.name ?? '');
    }
  }, [model, selectedCoefName]);

  const activeCoef =
    model.coefficients.find((c) => c.name === selectedCoefName) ?? model.coefficients[0];

  const oddsBase = model.baseOdds;
  const oddsFinales = activeCoef ? oddsBase * activeCoef.oddsRatio : oddsBase;
  const probTransformada = oddsFinales / (1 + oddsFinales);

  // Replicate R script's oddprueba / probprueba matrix (-10 to +18 steps)
  const stepRange = useMemo(() => {
    const steps: number[] = [];
    for (let s = -10; s <= 18; s += 2) steps.push(s);
    return steps;
  }, []);

  const topCoefsForHeatmap = useMemo(() => {
    return [...model.coefficients]
      .sort((a, b) => Math.abs(b.zValue) - Math.abs(a.zValue))
      .slice(0, 6);
  }, [model]);

  return (
    <div>
      <ModuleHeader
        stepNumber={7}
        stage="Modelado"
        title="Analizador Especializado de Odds Ratios"
        description="Explora cómo los Odds Base de tu población se transforman en Odds Finales y Probabilidad Transformada al variar cada predictor paso a paso."
        onPrev={onPrev}
        onNext={onNext}
        nextLabel="Simular Casos"
      />

      {/* Selector & 3 Gauge Charts */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Calculadora de Odds Base → Odds Finales → Probabilidad Transformada
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Implementación visual del cálculo exacto: Odds Finales = Odds Base × exp(β)
            </p>
          </div>
          <select
            value={activeCoef?.name ?? ''}
            onChange={(e) => setSelectedCoefName(e.target.value)}
            aria-label="Seleccionar variable para analizar Odds"
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {model.coefficients.map((c) => (
              <option key={c.name} value={c.name}>
                Variable: {c.name} (OR = {c.oddsRatio.toFixed(3)})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <RadialGauge
            label="Odds Ratio (exp(β))"
            value={activeCoef ? activeCoef.oddsRatio : 1}
            max={Math.max(3, (activeCoef?.oddsRatio ?? 1) * 1.4)}
            displayValue={activeCoef ? activeCoef.oddsRatio.toFixed(3) : '1.000'}
            subtext={
              activeCoef
                ? `${activeCoef.impactPct >= 0 ? '+' : ''}${activeCoef.impactPct.toFixed(1)}% por unidad`
                : ''
            }
            color="#2563eb"
          />
          <RadialGauge
            label="Odds Base (Población)"
            value={oddsBase}
            max={Math.max(2, oddsBase * 2)}
            displayValue={oddsBase.toFixed(3)}
            subtext={`Tasa base: ${(model.baseProb * 100).toFixed(1)}%`}
            color="#64748b"
          />
          <RadialGauge
            label="Odds Finales (+1 paso)"
            value={oddsFinales}
            max={Math.max(2.5, oddsFinales * 1.5)}
            displayValue={oddsFinales.toFixed(3)}
            subtext="Odds Base × Odds Ratio"
            color="#d97706"
          />
          <RadialGauge
            label="Probabilidad Transformada"
            value={probTransformada * 100}
            max={100}
            displayValue={`${(probTransformada * 100).toFixed(1)}%`}
            subtext={`Base ${(model.baseProb * 100).toFixed(1)}% → ${(probTransformada * 100).toFixed(1)}%`}
            color={probTransformada >= 0.5 ? '#dc2626' : '#16a34a'}
          />
        </div>
      </div>

      {/* Bar Chart + Step Progression Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1 flex items-center">
            Comparación de Odds Ratios
            <InfoTooltip
              title="Línea Neutra OR = 1.0"
              text="Los valores a la derecha de 1.0 incrementan la probabilidad del evento; los valores menores a 1.0 actúan como factores protectores que reducen la probabilidad."
            />
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Impacto multiplicativo de cada predictor incluido en {model.name.replace(/^Modelo \d+ · /, '')}.
          </p>
          <div className="space-y-3">
            {model.coefficients.map((c) => {
              const ratio = Math.min(3.5, Math.max(0.1, c.oddsRatio));
              const pctWidth = Math.min(100, (ratio / 3.5) * 100);
              const isRisk = c.oddsRatio >= 1;
              return (
                <div
                  key={c.name}
                  onClick={() => setSelectedCoefName(c.name)}
                  className={`cursor-pointer p-2 rounded-lg transition-colors ${
                    c.name === activeCoef?.name
                      ? 'bg-slate-100 dark:bg-slate-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                      {c.name}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white shrink-0">
                      OR {c.oddsRatio.toFixed(3)}
                    </span>
                  </div>
                  <div className="relative h-2.5 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 w-px bg-slate-400 dark:bg-slate-500 z-10"
                      style={{ left: `${(1 / 3.5) * 100}%` }}
                    />
                    <div
                      className={`h-full rounded ${
                        isRisk ? 'bg-rose-500 dark:bg-rose-400' : 'bg-emerald-600 dark:bg-emerald-500'
                      }`}
                      style={{ width: `${pctWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Matrix Heatmap (R script's oddprueba / probprueba) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1 flex items-center">
            Mapa de Calor: Evolución de Probabilidad por Pasos (-10 a +18 unidades)
            <InfoTooltip
              title="Matriz Multipaso (oddprueba / probprueba)"
              text="Simula cómo evoluciona la probabilidad del evento desde la tasa base (paso 0) si una variable disminuye hasta -10 pasos o aumenta hasta +18 pasos."
            />
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Cada celda muestra la probabilidad resultante (%) partiendo desde la tasa base ({(model.baseProb * 100).toFixed(1)}%) para {prepared.targetColumn}.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 pr-3 text-left font-semibold whitespace-nowrap">Predictor</th>
                  {stepRange.map((s) => (
                    <th key={s} className="py-2 px-1 text-center font-mono tabular-nums">
                      {s > 0 ? `+${s}` : s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {topCoefsForHeatmap.map((c) => {
                  const meta = prepared.featureMeta[c.name];
                  // Scale step size cleanly if numeric range is huge (e.g. saldo)
                  const stepUnit =
                    meta && !meta.isDummy && meta.std > 25
                      ? Math.round(meta.std * 0.25)
                      : 1;
                  return (
                    <tr key={c.name}>
                      <td className="py-2 pr-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        <div>{c.name}</div>
                        {stepUnit > 1 && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            1 paso = {stepUnit} uds
                          </div>
                        )}
                      </td>
                      {stepRange.map((s) => {
                        const odd = oddsBase * Math.pow(c.oddsRatio, s * stepUnit);
                        const prob = odd / (1 + odd);
                        const pct = prob * 100;
                        const bg =
                          pct >= 70
                            ? 'bg-rose-600 text-white'
                            : pct >= 50
                              ? 'bg-rose-400/80 text-white dark:bg-rose-500/70'
                              : pct >= 35
                                ? 'bg-amber-200 text-amber-950 dark:bg-amber-500/40 dark:text-amber-100'
                                : 'bg-emerald-100 text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-200';
                        return (
                          <td key={s} className="p-0.5 text-center">
                            <div
                              className={`py-1.5 px-1 rounded font-mono tabular-nums font-medium ${bg}`}
                              title={`${c.name} (${s >= 0 ? '+' : ''}${s * stepUnit}): ${pct.toFixed(1)}%`}
                            >
                              {pct.toFixed(0)}%
                            </div>
                          </td>
                        );
                      })}
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

const RadialGauge: React.FC<{
  label: string;
  value: number;
  max: number;
  displayValue: string;
  subtext: string;
  color: string;
}> = ({ label, value, max, displayValue, subtext, color }) => {
  const clamped = Math.max(0, Math.min(1, value / Math.max(1e-6, max)));
  const r = 38;
  const c = Math.PI * r; // semicircle arc length
  const dashOffset = c * (1 - clamped);

  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{label}</div>
      <svg viewBox="0 0 100 60" className="w-32 h-20 overflow-visible">
        <path
          d="M 12 52 A 38 38 0 0 1 88 52"
          fill="none"
          stroke="currentColor"
          className="text-slate-200 dark:text-slate-800"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M 12 52 A 38 38 0 0 1 88 52"
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
        />
        <text
          x="50"
          y="48"
          textAnchor="middle"
          className="fill-slate-900 dark:fill-white font-mono font-bold text-[14px]"
        >
          {displayValue}
        </text>
      </svg>
      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{subtext}</div>
    </div>
  );
};

/* ============================================================================
   MÓDULO 8: SIMULADOR DE CASOS
============================================================================ */
interface Module8Props {
  model: TrainedModel;
  prepared: PreparedData;
  onPrev: () => void;
  onNext: () => void;
}

export const Module8CaseSimulator: React.FC<Module8Props> = ({
  model,
  prepared,
  onPrev,
  onNext,
}) => {
  // Group model features back to original predictors for clean business UX
  const activeOriginalPredictors = useMemo(() => {
    const usedSources = new Set(model.coefficients.map((c) => c.sourceColumn));
    return prepared.selectedPredictors.filter((p) => usedSources.has(p));
  }, [model, prepared]);

  const initialInputs = useMemo(() => {
    const defaults: Record<string, number | string> = {};
    for (const orig of activeOriginalPredictors) {
      const mapping = prepared.dummyMappings.find((m) => m.originalColumn === orig);
      if (mapping) {
        defaults[orig] = mapping.referenceCategory;
      } else {
        const meta = prepared.featureMeta[orig];
        defaults[orig] = meta ? Number(meta.mean.toFixed(1)) : 0;
      }
    }
    return defaults;
  }, [activeOriginalPredictors, prepared]);

  const [inputs, setInputs] = useState<Record<string, number | string>>(initialInputs);

  useEffect(() => {
    setInputs(initialInputs);
  }, [initialInputs]);

  // Convert UI inputs into encoded feature vector for the model
  const encodedFeatureValues = useMemo(() => {
    const vec: Record<string, number> = {};
    for (const coef of model.coefficients) {
      const meta = prepared.featureMeta[coef.name];
      if (meta?.isDummy && meta.categoryValue !== undefined) {
        vec[coef.name] = String(inputs[meta.sourceColumn]) === meta.categoryValue ? 1 : 0;
      } else {
        vec[coef.name] = Number(inputs[coef.sourceColumn] ?? 0);
      }
    }
    return vec;
  }, [inputs, model, prepared]);

  const simResult = useMemo(
    () => computeSingleCaseProbability(model, encodedFeatureValues),
    [model, encodedFeatureValues]
  );

  const probPct = simResult.probability * 100;
  const riskStatus =
    probPct < 30
      ? {
          label: 'Bajo Riesgo',
          icon: CheckCircle2,
          toneClass:
            'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300',
          gaugeColor: '#16a34a',
        }
      : probPct < 65
        ? {
            label: 'Riesgo Medio',
            icon: AlertCircle,
            toneClass:
              'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300',
            gaugeColor: '#d97706',
          }
        : {
            label: 'Alto Riesgo',
            icon: ShieldAlert,
            toneClass:
              'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300',
            gaugeColor: '#dc2626',
          };

  const RiskIcon = riskStatus.icon;

  return (
    <div>
      <ModuleHeader
        stepNumber={8}
        stage="Modelado"
        title="Simulador Interactivo de Casos"
        description="Ajusta las variables de un cliente u operación con los controles deslizantes para calcular su probabilidad predicha en tiempo real."
        onPrev={onPrev}
        onNext={onNext}
        nextLabel="Matriz de Confusión"
        rightSlot={
          <button
            type="button"
            onClick={() => setInputs(initialInputs)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer promedios
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Parámetros del Caso a Simular
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {activeOriginalPredictors.map((orig) => {
              const mapping = prepared.dummyMappings.find((m) => m.originalColumn === orig);
              if (mapping) {
                return (
                  <div
                    key={orig}
                    className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  >
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                      {orig}
                    </label>
                    <select
                      value={String(inputs[orig] ?? mapping.referenceCategory)}
                      onChange={(e) =>
                        setInputs((prev) => ({ ...prev, [orig]: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {mapping.categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat} {cat === mapping.referenceCategory ? '(Referencia base)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              const meta = prepared.featureMeta[orig];
              const min = meta ? meta.min : 0;
              const max = meta ? (meta.max > meta.min ? meta.max : meta.min + 10) : 100;
              const val = Number(inputs[orig] ?? min);
              const step = max - min <= 2 ? 0.1 : max - min > 200 ? Math.round((max - min) / 100) : 1;

              return (
                <div
                  key={orig}
                  className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {orig}
                    </label>
                    <span className="font-mono tabular-nums text-xs font-bold text-blue-700 dark:text-blue-400">
                      {val.toFixed(step < 1 ? 1 : 0)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={val}
                    onChange={(e) =>
                      setInputs((prev) => ({ ...prev, [orig]: Number(e.target.value) }))
                    }
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono tabular-nums text-slate-400 mt-1">
                    <span>{min.toFixed(0)}</span>
                    <span>μ = {meta?.mean.toFixed(1)}</span>
                    <span>{max.toFixed(0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Result Panel */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Probabilidad Predicha ({prepared.targetColumn} = {prepared.positiveLabel})
          </div>
          <div className="my-4 flex flex-col items-center">
            <svg viewBox="0 0 180 105" className="w-56 h-32">
              <path
                d="M 20 90 A 70 70 0 0 1 160 90"
                fill="none"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d="M 20 90 A 70 70 0 0 1 160 90"
                fill="none"
                stroke={riskStatus.gaugeColor}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={Math.PI * 70}
                strokeDashoffset={Math.PI * 70 * (1 - simResult.probability)}
              />
              <text
                x="90"
                y="78"
                textAnchor="middle"
                className="fill-slate-900 dark:fill-white font-mono font-bold text-[26px]"
              >
                {probPct.toFixed(1)}%
              </text>
              <text
                x="90"
                y="96"
                textAnchor="middle"
                className="fill-slate-500 dark:fill-slate-400 font-mono text-[10px]"
              >
                Logit(P) = {simResult.logit.toFixed(3)}
              </text>
            </svg>

            <div
              className={`mt-2 w-full py-2.5 px-4 rounded-lg border flex items-center justify-center gap-2 text-sm font-semibold ${riskStatus.toneClass}`}
            >
              <RiskIcon className="w-4 h-4" />
              <span>{riskStatus.label}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5">
              Desglose de Contribución (β · X)
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Intercepto Base (β₀)</span>
                <span className="font-mono tabular-nums">{model.intercept.toFixed(3)}</span>
              </div>
              {simResult.contributions.map((item) => (
                <div key={item.name} className="flex justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-300 truncate pr-2">
                    {item.name}
                  </span>
                  <span
                    className={`font-mono tabular-nums font-medium ${
                      item.betaX > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : item.betaX < 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-400'
                    }`}
                  >
                    {item.betaX >= 0 ? `+${item.betaX.toFixed(3)}` : item.betaX.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
