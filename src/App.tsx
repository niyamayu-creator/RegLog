/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  Lock,
  Menu,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import {
  BalancingMethod,
  DatasetProfile,
  ExecutiveReportData,
  ModelId,
  ModuleDefinition,
  RawRow,
  SplitRatio,
  TrainedModel,
} from './types/analytics';
import {
  detectBinaryTargetDefaults,
  prepareDataForModeling,
  profileDataset,
  trainAllFiveModels,
} from './utils/logisticEngine';
import {
  generateCarteraSample,
  generateSatisfaccionSample,
} from './utils/sampleDatasets';
import { GlossaryDrawer } from './components/GlossaryDrawer';
import {
  Module1DataLoad,
  Module2ModelDefinition,
  Module3Preparation,
  Module4Training,
} from './components/modules/DataModules';
import {
  Module5ModelsComparator,
  Module6Interpretation,
  Module7OddsAnalyzer,
  Module8CaseSimulator,
} from './components/modules/ModelSelectionModules';
import {
  Module9ConfusionMatrix,
  Module10RocCurve,
  Module11PrecisionRecall,
  Module12GainsLiftProfit,
} from './components/modules/EvaluationModules';
import {
  Module13Explainability,
  Module14BatchPrediction,
  Module15ExecutiveReport,
} from './components/modules/ExplainDeployModules';

const MODULES: ModuleDefinition[] = [
  {
    id: 1,
    key: 'load',
    title: 'Carga de Datos',
    shortTitle: '01. Carga de Datos',
    stage: 'Datos',
    description: 'Importa Excel y diagnostica calidad',
  },
  {
    id: 2,
    key: 'define',
    title: 'Definición del Modelo',
    shortTitle: '02. Definición del Modelo',
    stage: 'Datos',
    description: 'Objetivo binario y predictores',
  },
  {
    id: 3,
    key: 'prepare',
    title: 'Preparación de Datos',
    shortTitle: '03. Preparación y Balanceo',
    stage: 'Datos',
    description: 'Dummies y balanceo de clases',
  },
  {
    id: 4,
    key: 'train',
    title: 'Entrenamiento',
    shortTitle: '04. Partición y Entrenamiento',
    stage: 'Modelado',
    description: 'Split configurable Train/Valid/Test',
  },
  {
    id: 5,
    key: 'models',
    title: 'Modelos y Comparador',
    shortTitle: '05. Comparador de Modelos',
    stage: 'Modelado',
    description: '5 modelos automáticos y 🏆 Mejor',
  },
  {
    id: 6,
    key: 'interpret',
    title: 'Interpretación Automática',
    shortTitle: '06. Interpretación Automática',
    stage: 'Modelado',
    description: 'Ecuación logística y lectura gerencial',
  },
  {
    id: 7,
    key: 'odds',
    title: 'Analizador de Odds Ratios',
    shortTitle: '07. Analizador de Odds Ratios',
    stage: 'Modelado',
    description: 'Odds Base, Finales y Mapa de Calor',
  },
  {
    id: 8,
    key: 'simulator',
    title: 'Simulador de Casos',
    shortTitle: '08. Simulador de Casos',
    stage: 'Modelado',
    description: 'Predicción interactiva en vivo',
  },
  {
    id: 9,
    key: 'confusion',
    title: 'Matriz de Confusión',
    shortTitle: '09. Matriz de Confusión',
    stage: 'Evaluación',
    description: 'TP, TN, FP, FN y métricas clave',
  },
  {
    id: 10,
    key: 'roc',
    title: 'Curva ROC',
    shortTitle: '10. Curva ROC',
    stage: 'Evaluación',
    description: 'Capacidad discriminatoria y AUC',
  },
  {
    id: 11,
    key: 'pr',
    title: 'Curva Precision-Recall',
    shortTitle: '11. Precision-Recall',
    stage: 'Evaluación',
    description: 'Búsqueda de Threshold óptimo',
  },
  {
    id: 12,
    key: 'gains',
    title: 'Curva de Ganancias',
    shortTitle: '12. Gain, Lift y Profit',
    stage: 'Evaluación',
    description: 'Retorno financiero por cutoff',
  },
  {
    id: 13,
    key: 'shap',
    title: 'Explicabilidad SHAP',
    shortTitle: '13. Explicabilidad (SHAP)',
    stage: 'Evaluación',
    description: 'Waterfall, Impact Plot y Ranking',
  },
  {
    id: 14,
    key: 'batch',
    title: 'Predicción Masiva',
    shortTitle: '14. Predicción Masiva',
    stage: 'Despliegue',
    description: 'Scoring Excel y exportación',
  },
  {
    id: 15,
    key: 'report',
    title: 'Informe Ejecutivo IA',
    shortTitle: '15. Informe Ejecutivo IA',
    stage: 'Despliegue',
    description: 'Reporte gerencial automatizado',
  },
];

const STAGES: ModuleDefinition['stage'][] = ['Datos', 'Modelado', 'Evaluación', 'Despliegue'];

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  const [currentModule, setCurrentModule] = useState<number>(1);
  const [dataset, setDataset] = useState<DatasetProfile | null>(null);

  // Module 2 state
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [positiveLabel, setPositiveLabel] = useState<string>('1');
  const [negativeLabel, setNegativeLabel] = useState<string>('0');
  const [selectedPredictors, setSelectedPredictors] = useState<string[]>([]);

  // Module 3 & 4 state
  const [balancingMethod, setBalancingMethod] = useState<BalancingMethod>('undersample');
  const [splitRatio, setSplitRatio] = useState<SplitRatio>('75/25');

  // Module 5+ trained models
  const [models, setModels] = useState<TrainedModel[]>([]);
  const [activeModelId, setActiveModelId] = useState<ModelId>('both');
  const [threshold, setThreshold] = useState<number>(0.5);
  const [executiveReport, setExecutiveReport] = useState<ExecutiveReportData | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const loadRowsIntoPipeline = (fileName: string, rows: RawRow[]) => {
    const profile = profileDataset(fileName, rows);
    const defaults = detectBinaryTargetDefaults(profile.columns);
    setDataset(profile);
    setTargetColumn(defaults.targetColumn);
    setPositiveLabel(defaults.positiveLabel);
    setNegativeLabel(defaults.negativeLabel);
    setSelectedPredictors(defaults.predictors);
    setModels([]);
    setExecutiveReport(null);
    setThreshold(0.5);
  };

  const handleLoadSample = (sampleKey: 'cartera' | 'satisfaccion') => {
    if (sampleKey === 'cartera') {
      loadRowsIntoPipeline('carteraguia2017.xlsx', generateCarteraSample());
      setBalancingMethod('undersample');
      setSplitRatio('75/25');
    } else {
      loadRowsIntoPipeline('financierosatisfaccion.xlsx', generateSatisfaccionSample());
      setBalancingMethod('none');
      setSplitRatio('75/25');
    }
  };

  const preparedData = useMemo(() => {
    if (!dataset || !targetColumn || selectedPredictors.length === 0) return null;
    return prepareDataForModeling(
      dataset,
      targetColumn,
      positiveLabel,
      negativeLabel,
      selectedPredictors,
      balancingMethod,
      splitRatio
    );
  }, [
    dataset,
    targetColumn,
    positiveLabel,
    negativeLabel,
    selectedPredictors,
    balancingMethod,
    splitRatio,
  ]);

  // Keep already-trained models synchronized if user tweaks preparation or split later
  useEffect(() => {
    if (models.length > 0 && preparedData && preparedData.encodedFeatureNames.length > 0) {
      const updated = trainAllFiveModels(preparedData);
      setModels(updated);
      setExecutiveReport(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preparedData]);

  const handleTrainModels = () => {
    if (!preparedData || preparedData.encodedFeatureNames.length === 0) return;
    const trained = trainAllFiveModels(preparedData);
    setModels(trained);
    const best = trained.find((m) => m.isBest) ?? trained[0];
    setActiveModelId(best.id);
    setThreshold(0.5);
    setExecutiveReport(null);
    setCurrentModule(5);
  };

  const activeModel = useMemo(
    () => models.find((m) => m.id === activeModelId) ?? models[0] ?? null,
    [models, activeModelId]
  );

  const isModuleUnlocked = (id: number) => {
    if (id === 1) return true;
    if (id === 2) return Boolean(dataset);
    if (id === 3 || id === 4) return Boolean(dataset && preparedData);
    return Boolean(dataset && preparedData && models.length > 0);
  };

  const handleNavigate = (id: number) => {
    if (!isModuleUnlocked(id)) return;
    setCurrentModule(id);
    setMobileMenuOpen(false);
  };

  const activeModuleMeta = MODULES.find((m) => m.id === currentModule) ?? MODULES[0];
  const unlockedCount = MODULES.filter((m) => isModuleUnlocked(m.id)).length;
  const progressPct = Math.round((currentModule / MODULES.length) * 100);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Persistent Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-[268px] shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 h-16 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <div className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
            LogiStudio Analytics
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Cerrar menú lateral"
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Workflow Progress Indicator */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            <span>Progreso del Flujo</span>
            <span className="font-mono tabular-nums text-slate-700 dark:text-slate-200">
              {currentModule} / 15 ({progressPct}%)
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-200"
              style={{ width: `${(unlockedCount / MODULES.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 15 Consecutive Modules grouped by Stage */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Módulos del flujo">
          {STAGES.map((stage) => (
            <div key={stage}>
              <div className="px-2.5 mb-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                Etapa: {stage}
              </div>
              <div className="space-y-0.5">
                {MODULES.filter((m) => m.stage === stage).map((mod) => {
                  const unlocked = isModuleUnlocked(mod.id);
                  const active = currentModule === mod.id;
                  const completed = unlocked && mod.id < currentModule;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => handleNavigate(mod.id)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                        active
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold'
                          : unlocked
                            ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 font-medium'
                            : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      <span className="truncate">{mod.shortTitle}</span>
                      {!unlocked ? (
                        <Lock className="w-3.5 h-3.5 shrink-0 opacity-60" />
                      ) : completed ? (
                        <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Clean 3-Zone Top Bar */}
        <header className="sticky top-0 z-30 h-16 px-4 sm:px-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir navegación"
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
              <span className="hidden sm:inline font-medium text-slate-800 dark:text-slate-200">
                {dataset ? dataset.fileName : 'Nuevo Proyecto'}
              </span>
              {dataset && <span className="hidden sm:inline" aria-hidden="true">/</span>}
              <span className="truncate font-medium text-slate-900 dark:text-white">
                {activeModuleMeta.shortTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setDarkMode((prev) => !prev)}
              aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{darkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
            </button>
            <button
              type="button"
              onClick={() => setGlossaryOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Glosario</span>
            </button>
          </div>
        </header>

        {/* Active Module Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1360px] w-full mx-auto">
          {currentModule === 1 && (
            <Module1DataLoad
              dataset={dataset}
              onLoadRows={loadRowsIntoPipeline}
              onLoadSample={handleLoadSample}
              onNext={() => handleNavigate(2)}
            />
          )}

          {currentModule === 2 && dataset && (
            <Module2ModelDefinition
              dataset={dataset}
              targetColumn={targetColumn}
              positiveLabel={positiveLabel}
              negativeLabel={negativeLabel}
              selectedPredictors={selectedPredictors}
              onChangeTarget={(col, pos, neg) => {
                setTargetColumn(col);
                setPositiveLabel(pos);
                setNegativeLabel(neg);
                setSelectedPredictors((prev) => prev.filter((p) => p !== col));
              }}
              onTogglePredictor={(col) => {
                setSelectedPredictors((prev) =>
                  prev.includes(col) ? prev.filter((p) => p !== col) : [...prev, col]
                );
              }}
              onSelectAllPredictors={() => {
                const defaults = detectBinaryTargetDefaults(dataset.columns);
                setSelectedPredictors(
                  defaults.predictors.filter((p) => p !== targetColumn)
                );
              }}
              onPrev={() => handleNavigate(1)}
              onNext={() => handleNavigate(3)}
            />
          )}

          {currentModule === 3 && preparedData && (
            <Module3Preparation
              prepared={preparedData}
              balancingMethod={balancingMethod}
              onChangeBalancing={setBalancingMethod}
              onPrev={() => handleNavigate(2)}
              onNext={() => handleNavigate(4)}
            />
          )}

          {currentModule === 4 && preparedData && (
            <Module4Training
              prepared={preparedData}
              splitRatio={splitRatio}
              onChangeSplit={setSplitRatio}
              onTrainModels={handleTrainModels}
              onPrev={() => handleNavigate(3)}
            />
          )}

          {currentModule === 5 && models.length > 0 && (
            <Module5ModelsComparator
              models={models}
              activeModelId={activeModelId}
              onSelectModel={(id) => {
                setActiveModelId(id);
              }}
              onPrev={() => handleNavigate(4)}
              onNext={() => handleNavigate(6)}
            />
          )}

          {currentModule === 6 && activeModel && (
            <Module6Interpretation
              model={activeModel}
              onPrev={() => handleNavigate(5)}
              onNext={() => handleNavigate(7)}
            />
          )}

          {currentModule === 7 && activeModel && preparedData && (
            <Module7OddsAnalyzer
              model={activeModel}
              prepared={preparedData}
              onPrev={() => handleNavigate(6)}
              onNext={() => handleNavigate(8)}
            />
          )}

          {currentModule === 8 && activeModel && preparedData && (
            <Module8CaseSimulator
              model={activeModel}
              prepared={preparedData}
              onPrev={() => handleNavigate(7)}
              onNext={() => handleNavigate(9)}
            />
          )}

          {currentModule === 9 && activeModel && preparedData && (
            <Module9ConfusionMatrix
              model={activeModel}
              prepared={preparedData}
              threshold={threshold}
              onChangeThreshold={setThreshold}
              onPrev={() => handleNavigate(8)}
              onNext={() => handleNavigate(10)}
            />
          )}

          {currentModule === 10 && activeModel && models.length > 0 && (
            <Module10RocCurve
              models={models}
              activeModel={activeModel}
              onPrev={() => handleNavigate(9)}
              onNext={() => handleNavigate(11)}
            />
          )}

          {currentModule === 11 && activeModel && (
            <Module11PrecisionRecall
              model={activeModel}
              threshold={threshold}
              onChangeThreshold={setThreshold}
              onPrev={() => handleNavigate(10)}
              onNext={() => handleNavigate(12)}
            />
          )}

          {currentModule === 12 && activeModel && preparedData && (
            <Module12GainsLiftProfit
              model={activeModel}
              prepared={preparedData}
              onPrev={() => handleNavigate(11)}
              onNext={() => handleNavigate(13)}
            />
          )}

          {currentModule === 13 && activeModel && preparedData && (
            <Module13Explainability
              model={activeModel}
              prepared={preparedData}
              onPrev={() => handleNavigate(12)}
              onNext={() => handleNavigate(14)}
            />
          )}

          {currentModule === 14 && dataset && activeModel && preparedData && (
            <Module14BatchPrediction
              dataset={dataset}
              model={activeModel}
              prepared={preparedData}
              threshold={threshold}
              onPrev={() => handleNavigate(13)}
              onNext={() => handleNavigate(15)}
            />
          )}

          {currentModule === 15 && dataset && preparedData && activeModel && (
            <Module15ExecutiveReport
              dataset={dataset}
              prepared={preparedData}
              models={models}
              activeModel={activeModel}
              threshold={threshold}
              report={executiveReport}
              onReportGenerated={setExecutiveReport}
              onPrev={() => handleNavigate(14)}
            />
          )}
        </main>
      </div>

      <GlossaryDrawer open={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
    </div>
  );
}
