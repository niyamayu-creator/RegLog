export type RawValue = string | number | boolean | null | undefined;
export type RawRow = Record<string, RawValue>;

export type ColumnType = 'numeric' | 'categorical' | 'binary';

export interface CategoryCount {
  label: string;
  count: number;
  pct: number;
}

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  missingCount: number;
  missingPct: number;
  uniqueCount: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  histogram?: number[];
  topCategories?: CategoryCount[];
  binaryValues?: [string, string];
}

export interface DatasetProfile {
  fileName: string;
  rowCount: number;
  colCount: number;
  totalMissing: number;
  completenessPct: number;
  numericCount: number;
  categoricalCount: number;
  binaryCount: number;
  columns: ColumnProfile[];
  rows: RawRow[];
}

export type BalancingMethod = 'none' | 'undersample' | 'smote' | 'oversample';
export type SplitRatio = '70/30' | '75/25' | '80/20';

export interface DummyMapping {
  originalColumn: string;
  referenceCategory: string;
  categories: string[];
  generatedDummies: string[];
}

export interface FeatureMeta {
  name: string;
  sourceColumn: string;
  isDummy: boolean;
  categoryValue?: string;
  mean: number;
  std: number;
  min: number;
  max: number;
}

export interface PreparedData {
  targetColumn: string;
  positiveLabel: string;
  negativeLabel: string;
  selectedPredictors: string[];
  balancingMethod: BalancingMethod;
  splitRatio: SplitRatio;
  dummyMappings: DummyMapping[];
  encodedFeatureNames: string[];
  featureMeta: Record<string, FeatureMeta>;
  originalClassCounts: {
    zero: number;
    one: number;
    zeroPct: number;
    onePct: number;
  };
  balancedTrainCounts: {
    zero: number;
    one: number;
    zeroPct: number;
    onePct: number;
  };
  splitCounts: {
    train: number;
    valid: number;
    test: number;
    trainPos: number;
    validPos: number;
    testPos: number;
  };
  trainX: number[][];
  trainY: number[];
  validX: number[][];
  validY: number[];
  testX: number[][];
  testY: number[];
  allX: number[][];
  allY: number[];
  imputedCellsCount: number;
}

export interface CoefficientStat {
  name: string;
  sourceColumn: string;
  beta: number;
  stdError: number;
  zValue: number;
  pValue: number;
  oddsRatio: number;
  impactPct: number;
  ciLow: number;
  ciHigh: number;
  significance: '***' | '**' | '*' | '.' | 'ns';
  interpretation: string;
}

export interface ConfusionMetrics {
  tp: number;
  tn: number;
  fp: number;
  fn: number;
  accuracy: number;
  precision: number;
  recall: number;
  specificity: number;
  f1: number;
  balancedAccuracy: number;
  errorRate: number;
}

export interface CurvePoint {
  threshold: number;
  fpr: number;
  tpr: number;
  precision: number;
  recall: number;
  rpp: number;
  lift: number;
  gain: number;
  profit: number;
  f1: number;
}

export type ModelId = 'full' | 'forward' | 'backward' | 'both' | 'best_subsets';

export interface TrainedModel {
  id: ModelId;
  name: string;
  subtitle: string;
  selectedFeatures: string[];
  selectedIndices: number[];
  intercept: number;
  interceptSe: number;
  interceptZ: number;
  interceptP: number;
  coefficients: CoefficientStat[];
  aic: number;
  bic: number;
  logLikelihood: number;
  nullDeviance: number;
  residualDeviance: number;
  pseudoR2: number;
  aucTrain: number;
  aucValid: number;
  aucTest: number;
  trainMetrics: ConfusionMetrics;
  validMetrics: ConfusionMetrics;
  testMetrics: ConfusionMetrics;
  rocCurve: CurvePoint[];
  optimalThreshold: number;
  isBest: boolean;
  baseOdds: number;
  baseProb: number;
  trainProbs: number[];
  validProbs: number[];
  testProbs: number[];
}

export interface BatchPredictionRow {
  rowId: number | string;
  probability: number;
  prediction: 0 | 1;
  riskLevel: 'Bajo Riesgo' | 'Riesgo Medio' | 'Alto Riesgo';
  raw: RawRow;
}

export interface ExecutiveReportData {
  resumenEjecutivo: string;
  calidadDatos: string;
  modeloSeleccionado: string;
  variablesImportantes: string;
  oddsRatios: string;
  curvaRoc: string;
  matrizConfusion: string;
  riesgoDetectado: string;
  recomendacionesNegocio: string[];
  conclusiones: string;
}

export interface ModuleDefinition {
  id: number;
  key: string;
  title: string;
  shortTitle: string;
  stage: 'Datos' | 'Modelado' | 'Evaluación' | 'Despliegue';
  description: string;
}
