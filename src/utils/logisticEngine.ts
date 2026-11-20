import {
  BalancingMethod,
  BatchPredictionRow,
  CoefficientStat,
  ColumnProfile,
  ColumnType,
  ConfusionMetrics,
  CurvePoint,
  DatasetProfile,
  DummyMapping,
  FeatureMeta,
  ModelId,
  PreparedData,
  RawRow,
  RawValue,
  SplitRatio,
  TrainedModel,
} from '../types/analytics';

// Deterministic PRNG for reproducible splits & balancing
function createRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function isMissing(v: RawValue): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

function toNumeric(v: RawValue): number | null {
  if (isMissing(v)) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const cleaned = String(v).trim().replace(/,/g, '.').replace(/[^0-9eE.+-]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function profileDataset(fileName: string, rows: RawRow[]): DatasetProfile {
  if (!rows.length) {
    return {
      fileName,
      rowCount: 0,
      colCount: 0,
      totalMissing: 0,
      completenessPct: 100,
      numericCount: 0,
      categoricalCount: 0,
      binaryCount: 0,
      columns: [],
      rows: [],
    };
  }

  const colNames = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  let totalMissing = 0;
  let numericCount = 0;
  let categoricalCount = 0;
  let binaryCount = 0;

  const columns: ColumnProfile[] = colNames.map((name) => {
    let missingCount = 0;
    const rawValues: RawValue[] = [];
    const nonMissingStrings: string[] = [];
    const numericValues: number[] = [];

    for (const row of rows) {
      const val = row[name];
      if (isMissing(val)) {
        missingCount++;
      } else {
        rawValues.push(val);
        nonMissingStrings.push(String(val).trim());
        const num = toNumeric(val);
        if (num !== null && typeof val !== 'boolean') {
          numericValues.push(num);
        } else if (typeof val === 'boolean') {
          numericValues.push(val ? 1 : 0);
        }
      }
    }

    totalMissing += missingCount;
    const nonMissingCount = rawValues.length;
    const uniqueStrings = Array.from(new Set(nonMissingStrings));
    const uniqueCount = uniqueStrings.length;
    const isMostlyNumeric = nonMissingCount > 0 && numericValues.length / nonMissingCount >= 0.9;

    // Heuristic: Treat small-cardinality integer codes like TIPO_ips (1..5) if named TIPO/CATEGORIA/CLASE or string
    const lowerName = name.toLowerCase();
    const looksNominalCode =
      (lowerName.includes('tipo') ||
        lowerName.includes('categ') ||
        lowerName.includes('grupo') ||
        lowerName.includes('segmento') ||
        lowerName.includes('zona') ||
        lowerName.includes('nivel')) &&
      uniqueCount <= 10 &&
      uniqueCount > 2;

    let type: ColumnType = 'categorical';
    if (uniqueCount === 2) {
      type = 'binary';
      binaryCount++;
    } else if (isMostlyNumeric && !looksNominalCode) {
      type = 'numeric';
      numericCount++;
    } else {
      type = 'categorical';
      categoricalCount++;
    }

    const freqMap = new Map<string, number>();
    for (const s of nonMissingStrings) {
      freqMap.set(s, (freqMap.get(s) ?? 0) + 1);
    }
    const topCategories = Array.from(freqMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, count]) => ({
        label,
        count,
        pct: nonMissingCount > 0 ? (count / nonMissingCount) * 100 : 0,
      }));

    let min: number | undefined;
    let max: number | undefined;
    let mean: number | undefined;
    let median: number | undefined;
    let std: number | undefined;
    let histogram: number[] | undefined;

    if ((type === 'numeric' || type === 'binary') && numericValues.length > 0) {
      const sorted = [...numericValues].sort((a, b) => a - b);
      min = sorted[0];
      max = sorted[sorted.length - 1];
      const sum = sorted.reduce((acc, v) => acc + v, 0);
      mean = sum / sorted.length;
      const mid = Math.floor(sorted.length / 2);
      median =
        sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      const variance =
        sorted.reduce((acc, v) => acc + Math.pow(v - mean!, 2), 0) /
        Math.max(1, sorted.length - 1);
      std = Math.sqrt(variance);

      // 10-bin histogram for visual sparklines
      const bins = new Array(10).fill(0);
      const span = max - min || 1;
      for (const v of sorted) {
        const idx = Math.min(9, Math.max(0, Math.floor(((v - min) / span) * 10)));
        bins[idx]++;
      }
      histogram = bins;
    }

    const binaryValues: [string, string] | undefined =
      uniqueCount === 2 ? [uniqueStrings[0], uniqueStrings[1]] : undefined;

    return {
      name,
      type,
      missingCount,
      missingPct: rows.length > 0 ? (missingCount / rows.length) * 100 : 0,
      uniqueCount,
      min,
      max,
      mean,
      median,
      std,
      histogram,
      topCategories,
      binaryValues,
    };
  });

  const totalCells = rows.length * colNames.length;
  const completenessPct = totalCells > 0 ? ((totalCells - totalMissing) / totalCells) * 100 : 100;

  return {
    fileName,
    rowCount: rows.length,
    colCount: colNames.length,
    totalMissing,
    completenessPct,
    numericCount,
    categoricalCount,
    binaryCount,
    columns,
    rows,
  };
}

export function detectBinaryTargetDefaults(columns: ColumnProfile[]): {
  targetColumn: string;
  positiveLabel: string;
  negativeLabel: string;
  predictors: string[];
} {
  const binaryCols = columns.filter((c) => c.type === 'binary');
  const preferredNames = ['retraso', 'mora', 'satisfecho', 'abandono', 'churn', 'compra', 'target', 'y'];
  let chosen =
    binaryCols.find((c) =>
      preferredNames.some((p) => c.name.toLowerCase().includes(p))
    ) ?? binaryCols[0];

  if (!chosen) {
    chosen = columns[columns.length - 1];
  }

  let positiveLabel = '1';
  let negativeLabel = '0';
  if (chosen?.binaryValues) {
    const vals = chosen.binaryValues;
    if (vals.includes('1') && vals.includes('0')) {
      positiveLabel = '1';
      negativeLabel = '0';
    } else {
      const sorted = [...vals].sort();
      negativeLabel = sorted[0];
      positiveLabel = sorted[1];
    }
  }

  const predictors = columns
    .filter((c) => {
      if (c.name === chosen?.name) return false;
      // Exclude obvious ID columns (unique values > 90% of rows and categorical)
      if (c.type === 'categorical' && c.uniqueCount > 20) return false;
      const lower = c.name.toLowerCase();
      if ((lower === 'id' || lower.startsWith('id_') || lower.endsWith('_id')) && c.uniqueCount > 20) {
        return false;
      }
      return true;
    })
    .map((c) => c.name);

  return {
    targetColumn: chosen?.name ?? '',
    positiveLabel,
    negativeLabel,
    predictors,
  };
}

function encodeTargetValue(v: RawValue, positiveLabel: string, negativeLabel: string): number | null {
  if (isMissing(v)) return null;
  const s = String(v).trim();
  if (s === positiveLabel) return 1;
  if (s === negativeLabel) return 0;
  const num = toNumeric(v);
  if (num === 1) return 1;
  if (num === 0) return 0;
  return null;
}

export function prepareDataForModeling(
  profile: DatasetProfile,
  targetColumn: string,
  positiveLabel: string,
  negativeLabel: string,
  selectedPredictors: string[],
  balancingMethod: BalancingMethod,
  splitRatio: SplitRatio
): PreparedData {
  const colMap = new Map(profile.columns.map((c) => [c.name, c]));

  // Filter rows that have a valid binary target
  const validRows = profile.rows.filter(
    (r) => encodeTargetValue(r[targetColumn], positiveLabel, negativeLabel) !== null
  );

  // Determine encoding schema per predictor
  const dummyMappings: DummyMapping[] = [];
  const encodedFeatureNames: string[] = [];
  const featureMeta: Record<string, FeatureMeta> = {};

  interface ColumnEncoder {
    sourceColumn: string;
    isDummy: boolean;
    meanForImpute: number;
    modeForImpute: string;
    categoriesKept?: string[]; // excludes reference
  }

  const encoders: ColumnEncoder[] = [];

  for (const predName of selectedPredictors) {
    const colProf = colMap.get(predName);
    if (!colProf) continue;

    if (colProf.type === 'numeric') {
      const mean = colProf.mean ?? 0;
      encoders.push({
        sourceColumn: predName,
        isDummy: false,
        meanForImpute: mean,
        modeForImpute: String(mean),
      });
      encodedFeatureNames.push(predName);
    } else if (colProf.type === 'binary') {
      const vals = colProf.binaryValues ?? ['0', '1'];
      const isZeroOne = vals.includes('0') && vals.includes('1');
      if (isZeroOne) {
        encoders.push({
          sourceColumn: predName,
          isDummy: false,
          meanForImpute: colProf.mean ?? 0,
          modeForImpute: '0',
        });
        encodedFeatureNames.push(predName);
      } else {
        const ref = vals[0];
        const pos = vals[1];
        const dummyName = `${predName}_${pos.replace(/\s+/g, '_')}`;
        encoders.push({
          sourceColumn: predName,
          isDummy: true,
          meanForImpute: 0,
          modeForImpute: ref,
          categoriesKept: [pos],
        });
        dummyMappings.push({
          originalColumn: predName,
          referenceCategory: ref,
          categories: [ref, pos],
          generatedDummies: [dummyName],
        });
        encodedFeatureNames.push(dummyName);
      }
    } else {
      // Categorical: gather sorted categories (max 10 to prevent dimensionality explosion)
      const counts = new Map<string, number>();
      for (const r of validRows) {
        if (!isMissing(r[predName])) {
          const s = String(r[predName]).trim();
          counts.set(s, (counts.get(s) ?? 0) + 1);
        }
      }
      const sortedCats = Array.from(counts.entries())
        .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
        .map(([k]) => k)
        .slice(0, 10);

      if (sortedCats.length <= 1) continue;

      // Drop the last category as reference (like carterafin2 <- rm(TIPOips.5) in R script!)
      const referenceCategory = sortedCats[sortedCats.length - 1];
      const kept = sortedCats.slice(0, sortedCats.length - 1);
      const generatedDummies = kept.map(
        (cat) => `${predName}_${cat.replace(/\s+/g, '_')}`
      );

      encoders.push({
        sourceColumn: predName,
        isDummy: true,
        meanForImpute: 0,
        modeForImpute: colProf.topCategories?.[0]?.label ?? referenceCategory,
        categoriesKept: kept,
      });

      dummyMappings.push({
        originalColumn: predName,
        referenceCategory,
        categories: sortedCats,
        generatedDummies,
      });

      generatedDummies.forEach((d) => encodedFeatureNames.push(d));
    }
  }

  let imputedCellsCount = 0;
  const allX: number[][] = [];
  const allY: number[] = [];

  for (const r of validRows) {
    const y = encodeTargetValue(r[targetColumn], positiveLabel, negativeLabel)!;
    const xRow: number[] = [];

    for (const enc of encoders) {
      const rawVal = r[enc.sourceColumn];
      if (!enc.isDummy) {
        let num = toNumeric(rawVal);
        if (num === null) {
          num = enc.meanForImpute;
          imputedCellsCount++;
        }
        xRow.push(num);
      } else {
        let strVal: string;
        if (isMissing(rawVal)) {
          strVal = enc.modeForImpute;
          imputedCellsCount++;
        } else {
          strVal = String(rawVal).trim();
        }
        for (const cat of enc.categoriesKept ?? []) {
          xRow.push(strVal === cat ? 1 : 0);
        }
      }
    }

    allX.push(xRow);
    allY.push(y);
  }

  // Compute feature metadata (mean, std, min, max)
  const p = encodedFeatureNames.length;
  for (let j = 0; j < p; j++) {
    const fName = encodedFeatureNames[j];
    const colVals = allX.map((row) => row[j]);
    const n = Math.max(1, colVals.length);
    const mean = colVals.reduce((a, b) => a + b, 0) / n;
    const variance =
      colVals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / Math.max(1, n - 1);
    const std = Math.sqrt(variance) || 1;
    const min = Math.min(...colVals);
    const max = Math.max(...colVals);

    const mapping = dummyMappings.find((m) => m.generatedDummies.includes(fName));
    const catIdx = mapping ? mapping.generatedDummies.indexOf(fName) : -1;

    featureMeta[fName] = {
      name: fName,
      sourceColumn: mapping ? mapping.originalColumn : fName,
      isDummy: Boolean(mapping),
      categoryValue: catIdx >= 0 ? mapping!.categories[catIdx] : undefined,
      mean,
      std,
      min,
      max,
    };
  }

  // Class counts in original valid dataset
  const onesIdx: number[] = [];
  const zerosIdx: number[] = [];
  allY.forEach((y, i) => (y === 1 ? onesIdx.push(i) : zerosIdx.push(i)));

  const totalN = allY.length;
  const originalClassCounts = {
    zero: zerosIdx.length,
    one: onesIdx.length,
    zeroPct: totalN > 0 ? (zerosIdx.length / totalN) * 100 : 0,
    onePct: totalN > 0 ? (onesIdx.length / totalN) * 100 : 0,
  };

  // Stratified split matching R script: Test (20/25/30%), remaining split into Train & Validation
  const rng = createRng(1545867);
  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const shufZeros = shuffle(zerosIdx);
  const shufOnes = shuffle(onesIdx);

  const testFraction = splitRatio === '70/30' ? 0.3 : splitRatio === '75/25' ? 0.25 : 0.2;
  const zTestCount = Math.max(1, Math.round(shufZeros.length * testFraction));
  const oTestCount = Math.max(1, Math.round(shufOnes.length * testFraction));

  const testIndices = [
    ...shufZeros.slice(0, zTestCount),
    ...shufOnes.slice(0, oTestCount),
  ];
  const restZeros = shufZeros.slice(zTestCount);
  const restOnes = shufOnes.slice(oTestCount);

  // Validation gets 15% of rest (so Train ~60-68%, Valid ~12-15%, Test 20-30%)
  const zValidCount = Math.max(1, Math.round(restZeros.length * 0.15));
  const oValidCount = Math.max(1, Math.round(restOnes.length * 0.15));

  const validIndices = [
    ...restZeros.slice(0, zValidCount),
    ...restOnes.slice(0, oValidCount),
  ];

  const trainZeroIndices = restZeros.slice(zValidCount);
  const trainOneIndices = restOnes.slice(oValidCount);

  const validX = validIndices.map((i) => allX[i]);
  const validY = validIndices.map((i) => allY[i]);
  const testX = testIndices.map((i) => allX[i]);
  const testY = testIndices.map((i) => allY[i]);

  // Apply balancing method strictly on Train set (preventing data leakage into Valid/Test!)
  let trainX: number[][] = [];
  let trainY: number[] = [];

  if (balancingMethod === 'none') {
    const combined = shuffle([...trainZeroIndices, ...trainOneIndices]);
    trainX = combined.map((i) => allX[i]);
    trainY = combined.map((i) => allY[i]);
  } else if (balancingMethod === 'undersample') {
    // Exact R script strategy: sample majority class down to minority count
    const minLen = Math.min(trainZeroIndices.length, trainOneIndices.length);
    const sampledZ = shuffle(trainZeroIndices).slice(0, minLen);
    const sampledO = shuffle(trainOneIndices).slice(0, minLen);
    const combined = shuffle([...sampledZ, ...sampledO]);
    trainX = combined.map((i) => allX[i]);
    trainY = combined.map((i) => allY[i]);
  } else if (balancingMethod === 'oversample') {
    const isOneMinority = trainOneIndices.length <= trainZeroIndices.length;
    const maj = isOneMinority ? trainZeroIndices : trainOneIndices;
    const min = isOneMinority ? trainOneIndices : trainZeroIndices;
    const minLabel = isOneMinority ? 1 : 0;
    const majLabel = isOneMinority ? 0 : 1;

    const sampledMin: number[][] = min.map((i) => allX[i]);
    while (sampledMin.length < maj.length && min.length > 0) {
      const pick = min[Math.floor(rng() * min.length)];
      sampledMin.push([...allX[pick]]);
    }
    const pairs: { x: number[]; y: number }[] = [
      ...maj.map((i) => ({ x: allX[i], y: majLabel })),
      ...sampledMin.map((x) => ({ x, y: minLabel })),
    ];
    const shufPairs = shuffle(pairs);
    trainX = shufPairs.map((item) => item.x);
    trainY = shufPairs.map((item) => item.y);
  } else if (balancingMethod === 'smote') {
    const isOneMinority = trainOneIndices.length <= trainZeroIndices.length;
    const maj = isOneMinority ? trainZeroIndices : trainOneIndices;
    const min = isOneMinority ? trainOneIndices : trainZeroIndices;
    const minLabel = isOneMinority ? 1 : 0;
    const majLabel = isOneMinority ? 0 : 1;

    const minVectors = min.map((i) => allX[i]);
    const synthetic: number[][] = [...minVectors];

    const k = Math.min(5, Math.max(1, minVectors.length - 1));
    while (synthetic.length < maj.length && minVectors.length > 0) {
      const baseIdx = Math.floor(rng() * minVectors.length);
      const base = minVectors[baseIdx];
      if (minVectors.length === 1) {
        synthetic.push([...base]);
        continue;
      }
      // Find k nearest neighbors in standardized space
      const dists = minVectors
        .map((v, idx) => {
          if (idx === baseIdx) return { idx, d: Infinity };
          let sq = 0;
          for (let j = 0; j < p; j++) {
            const std = featureMeta[encodedFeatureNames[j]]?.std || 1;
            const diff = (v[j] - base[j]) / std;
            sq += diff * diff;
          }
          return { idx, d: sq };
        })
        .sort((a, b) => a.d - b.d)
        .slice(0, k);

      const nn = minVectors[dists[Math.floor(rng() * dists.length)].idx];
      const gap = rng();
      const synth = base.map((val, j) => {
        const meta = featureMeta[encodedFeatureNames[j]];
        const interp = val + gap * (nn[j] - val);
        return meta?.isDummy ? (interp >= 0.5 ? 1 : 0) : interp;
      });
      synthetic.push(synth);
    }

    const pairs: { x: number[]; y: number }[] = [
      ...maj.map((i) => ({ x: allX[i], y: majLabel })),
      ...synthetic.map((x) => ({ x, y: minLabel })),
    ];
    const shufPairs = shuffle(pairs);
    trainX = shufPairs.map((item) => item.x);
    trainY = shufPairs.map((item) => item.y);
  }

  const trainPos = trainY.filter((y) => y === 1).length;
  const trainZero = trainY.length - trainPos;
  const trainLen = Math.max(1, trainY.length);

  return {
    targetColumn,
    positiveLabel,
    negativeLabel,
    selectedPredictors,
    balancingMethod,
    splitRatio,
    dummyMappings,
    encodedFeatureNames,
    featureMeta,
    originalClassCounts,
    balancedTrainCounts: {
      zero: trainZero,
      one: trainPos,
      zeroPct: (trainZero / trainLen) * 100,
      onePct: (trainPos / trainLen) * 100,
    },
    splitCounts: {
      train: trainY.length,
      valid: validY.length,
      test: testY.length,
      trainPos,
      validPos: validY.filter((y) => y === 1).length,
      testPos: testY.filter((y) => y === 1).length,
    },
    trainX,
    trainY,
    validX,
    validY,
    testX,
    testY,
    allX,
    allY,
    imputedCellsCount,
  };
}

// Gauss-Jordan Matrix Inversion for small p x p covariance matrix
function invertMatrix(matrix: number[][]): number[][] | null {
  const n = matrix.length;
  const aug: number[][] = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
        maxRow = k;
      }
    }
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

    const pivot = aug[i][i];
    if (Math.abs(pivot) < 1e-12) return null;

    for (let j = 0; j < 2 * n; j++) {
      aug[i][j] /= pivot;
    }

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = aug[k][i];
        for (let j = 0; j < 2 * n; j++) {
          aug[k][j] -= factor * aug[i][j];
        }
      }
    }
  }

  return aug.map((row) => row.slice(n));
}

function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const inv = invertMatrix(A);
  if (!inv) return null;
  return inv.map((row) => row.reduce((acc, v, j) => acc + v * b[j], 0));
}

// Standard Normal CDF via Abramowitz & Stegun approximation
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

function twoTailedPValue(z: number): number {
  if (!Number.isFinite(z)) return 1;
  return Math.max(1e-12, Math.min(1, 2 * (1 - normalCdf(Math.abs(z)))));
}

function sigmoid(eta: number): number {
  if (eta > 30) return 1 - 1e-13;
  if (eta < -30) return 1e-13;
  return 1 / (1 + Math.exp(-eta));
}

interface FitResult {
  intercept: number;
  betas: number[];
  interceptSe: number;
  betaSes: number[];
  logLikelihood: number;
  nullDeviance: number;
  residualDeviance: number;
  aic: number;
  bic: number;
}

/**
 * Fits Binomial Logistic Regression using IRLS (Newton-Raphson) in standardized feature space,
 * then maps back to original feature units so Coefficients and Odds Ratios match R's glm().
 */
function fitLogisticIRLS(X: number[][], y: number[], featureIndices: number[]): FitResult {
  const n = X.length;
  const p = featureIndices.length;

  // Null deviance
  const posRate = Math.min(1 - 1e-9, Math.max(1e-9, y.reduce((a, b) => a + b, 0) / Math.max(1, n)));
  const nullLL = y.reduce(
    (acc, yi) => acc + (yi === 1 ? Math.log(posRate) : Math.log(1 - posRate)),
    0
  );
  const nullDeviance = -2 * nullLL;

  if (p === 0) {
    const b0 = Math.log(posRate / (1 - posRate));
    const se0 = Math.sqrt(1 / Math.max(1, n * posRate * (1 - posRate)));
    return {
      intercept: b0,
      betas: [],
      interceptSe: se0,
      betaSes: [],
      logLikelihood: nullLL,
      nullDeviance,
      residualDeviance: nullDeviance,
      aic: 2 - 2 * nullLL,
      bic: Math.log(Math.max(2, n)) - 2 * nullLL,
    };
  }

  // Standardize selected columns for rock-solid IRLS convergence
  const means = new Array(p).fill(0);
  const stds = new Array(p).fill(1);
  for (let j = 0; j < p; j++) {
    const colIdx = featureIndices[j];
    let sum = 0;
    for (let i = 0; i < n; i++) sum += X[i][colIdx];
    means[j] = sum / Math.max(1, n);
    let sq = 0;
    for (let i = 0; i < n; i++) sq += Math.pow(X[i][colIdx] - means[j], 2);
    stds[j] = Math.sqrt(sq / Math.max(1, n - 1)) || 1;
  }

  const Z: number[][] = X.map((row) => [
    1,
    ...featureIndices.map((colIdx, j) => (row[colIdx] - means[j]) / stds[j]),
  ]);

  const dim = p + 1;
  let wStd = new Array(dim).fill(0);
  wStd[0] = Math.log(posRate / (1 - posRate));
  const ridge = 1e-5;

  for (let iter = 0; iter < 30; iter++) {
    const XtWX: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
    const grad: number[] = new Array(dim).fill(0);

    for (let i = 0; i < n; i++) {
      const zi = Z[i];
      let eta = 0;
      for (let k = 0; k < dim; k++) eta += zi[k] * wStd[k];
      const pi = sigmoid(eta);
      const wi = Math.max(1e-6, pi * (1 - pi));
      const err = y[i] - pi;

      for (let a = 0; a < dim; a++) {
        grad[a] += zi[a] * err;
        for (let b = a; b < dim; b++) {
          XtWX[a][b] += zi[a] * wi * zi[b];
        }
      }
    }

    for (let a = 0; a < dim; a++) {
      for (let b = 0; b < a; b++) {
        XtWX[a][b] = XtWX[b][a];
      }
      XtWX[a][a] += ridge;
      if (a > 0) grad[a] -= ridge * wStd[a];
    }

    const delta = solveLinearSystem(XtWX, grad);
    if (!delta) break;

    let maxStep = 0;
    for (let k = 0; k < dim; k++) {
      const step = Math.max(-3, Math.min(3, delta[k]));
      wStd[k] += step;
      maxStep = Math.max(maxStep, Math.abs(step));
    }
    if (maxStep < 1e-6) break;
  }

  // Transform weights back to original scale
  const betas = wStd.slice(1).map((wj, j) => wj / stds[j]);
  let intercept = wStd[0];
  for (let j = 0; j < p; j++) {
    intercept -= betas[j] * means[j];
  }

  // Compute log-likelihood & Fisher Information on original scale for exact Wald SEs
  const XtWXOrig: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
  let logLikelihood = 0;

  for (let i = 0; i < n; i++) {
    const xi = X[i];
    let eta = intercept;
    for (let j = 0; j < p; j++) eta += betas[j] * xi[featureIndices[j]];
    const pi = sigmoid(eta);
    logLikelihood += y[i] === 1 ? Math.log(pi) : Math.log(1 - pi);
    const wi = Math.max(1e-6, pi * (1 - pi));

    const origVec = [1, ...featureIndices.map((colIdx) => xi[colIdx])];
    for (let a = 0; a < dim; a++) {
      for (let b = a; b < dim; b++) {
        XtWXOrig[a][b] += origVec[a] * wi * origVec[b];
      }
    }
  }

  for (let a = 0; a < dim; a++) {
    for (let b = 0; b < a; b++) XtWXOrig[a][b] = XtWXOrig[b][a];
    XtWXOrig[a][a] += 1e-6;
  }

  const cov = invertMatrix(XtWXOrig);
  const interceptSe = cov ? Math.sqrt(Math.max(1e-12, cov[0][0])) : 0.1;
  const betaSes = betas.map((_, j) =>
    cov ? Math.sqrt(Math.max(1e-12, cov[j + 1][j + 1])) : 0.1
  );

  const residualDeviance = -2 * logLikelihood;
  const kParams = p + 1;
  const aic = 2 * kParams - 2 * logLikelihood;
  const bic = kParams * Math.log(Math.max(2, n)) - 2 * logLikelihood;

  return {
    intercept,
    betas,
    interceptSe,
    betaSes,
    logLikelihood,
    nullDeviance,
    residualDeviance,
    aic,
    bic,
  };
}

export function predictProbs(
  X: number[][],
  intercept: number,
  betas: number[],
  featureIndices: number[]
): number[] {
  return X.map((row) => {
    let eta = intercept;
    for (let j = 0; j < featureIndices.length; j++) {
      eta += betas[j] * row[featureIndices[j]];
    }
    return sigmoid(eta);
  });
}

export function computeConfusionMetrics(
  probs: number[],
  yTrue: number[],
  threshold = 0.5
): ConfusionMetrics {
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;

  for (let i = 0; i < yTrue.length; i++) {
    const pred = probs[i] >= threshold ? 1 : 0;
    const actual = yTrue[i];
    if (pred === 1 && actual === 1) tp++;
    else if (pred === 0 && actual === 0) tn++;
    else if (pred === 1 && actual === 0) fp++;
    else fn++;
  }

  const total = Math.max(1, tp + tn + fp + fn);
  const accuracy = (tp + tn) / total;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const specificity = tn + fp > 0 ? tn / (tn + fp) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const balancedAccuracy = (recall + specificity) / 2;
  const errorRate = 1 - accuracy;

  return {
    tp,
    tn,
    fp,
    fn,
    accuracy,
    precision,
    recall,
    specificity,
    f1,
    balancedAccuracy,
    errorRate,
  };
}

export function computeCurvesAndAUC(
  probs: number[],
  yTrue: number[],
  basePositiveRate: number,
  benefitPerTp = 500,
  costPerPositivePred = 100
): { auc: number; points: CurvePoint[]; optimalThreshold: number } {
  const n = yTrue.length;
  if (n === 0) {
    return { auc: 0.5, points: [], optimalThreshold: 0.5 };
  }

  const totalPos = Math.max(1, yTrue.filter((y) => y === 1).length);
  const totalNeg = Math.max(1, n - totalPos);

  // Exact AUC via sorted thresholds
  const paired = probs
    .map((p, i) => ({ p, y: yTrue[i] }))
    .sort((a, b) => b.p - a.p);

  let auc = 0;
  let prevFpr = 0;
  let prevTpr = 0;
  let cumTp = 0;
  let cumFp = 0;

  for (let i = 0; i < paired.length; i++) {
    if (paired[i].y === 1) cumTp++;
    else cumFp++;
    if (i === paired.length - 1 || paired[i].p !== paired[i + 1].p) {
      const tpr = cumTp / totalPos;
      const fpr = cumFp / totalNeg;
      auc += ((fpr - prevFpr) * (tpr + prevTpr)) / 2;
      prevFpr = fpr;
      prevTpr = tpr;
    }
  }

  // Generate 101 smooth cutoff points from 1.00 down to 0.00
  const points: CurvePoint[] = [];
  let bestF1 = -1;
  let optimalThreshold = 0.5;

  for (let step = 0; step <= 100; step++) {
    const threshold = Number((1 - step / 100).toFixed(2));
    let tp = 0;
    let fp = 0;
    for (let i = 0; i < n; i++) {
      if (probs[i] >= threshold) {
        if (yTrue[i] === 1) tp++;
        else fp++;
      }
    }
    const tpr = tp / totalPos;
    const fpr = fp / totalNeg;
    const predPos = tp + fp;
    const precision = predPos > 0 ? tp / predPos : 1;
    const recall = tpr;
    const rpp = predPos / n;
    const lift = rpp > 0 ? tpr / rpp : 1;
    const gain = tpr;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    // Exact profit formula from attached R script:
    // tablacruce$wins <- prop.table(balance)[2]*recalls*(500-(100/precisions))
    const profit =
      predPos > 0 && precision > 0
        ? basePositiveRate * recall * (benefitPerTp - costPerPositivePred / precision)
        : 0;

    if (f1 > bestF1 && threshold > 0.05 && threshold < 0.95) {
      bestF1 = f1;
      optimalThreshold = threshold;
    }

    points.push({
      threshold,
      fpr,
      tpr,
      precision,
      recall,
      rpp,
      lift,
      gain,
      profit,
      f1,
    });
  }

  return {
    auc: Math.max(0.5, Math.min(1, auc)),
    points,
    optimalThreshold,
  };
}

function buildCoefficientInterpretation(
  featureName: string,
  meta: FeatureMeta | undefined,
  oddsRatio: number,
  impactPct: number,
  targetLabel: string
): string {
  const absPct = Math.abs(impactPct).toFixed(1);
  const direction = oddsRatio >= 1 ? 'aumenta' : 'disminuye';

  if (meta?.isDummy && meta.categoryValue) {
    return `Cuando ${meta.sourceColumn} es "${meta.categoryValue}" (frente a la categoría de referencia), la probabilidad relativa (odds) de "${targetLabel}" ${direction} aproximadamente ${absPct}% (OR = ${oddsRatio.toFixed(2)}).`;
  }

  return `Por cada unidad adicional de ${featureName}, la probabilidad relativa (odds) de "${targetLabel}" ${direction} aproximadamente ${absPct}% (OR = ${oddsRatio.toFixed(2)}).`;
}

function buildTrainedModel(
  id: ModelId,
  name: string,
  subtitle: string,
  prepared: PreparedData,
  selectedIndices: number[],
  fit: FitResult
): TrainedModel {
  const selectedFeatures = selectedIndices.map((idx) => prepared.encodedFeatureNames[idx]);
  const targetPositiveDisplay = `${prepared.targetColumn} (${prepared.positiveLabel})`;

  const coefficients: CoefficientStat[] = selectedIndices.map((featIdx, j) => {
    const fName = prepared.encodedFeatureNames[featIdx];
    const meta = prepared.featureMeta[fName];
    const beta = fit.betas[j];
    const stdError = fit.betaSes[j];
    const zValue = beta / Math.max(1e-9, stdError);
    const pValue = twoTailedPValue(zValue);
    const oddsRatio = Math.exp(Math.max(-20, Math.min(20, beta)));
    const impactPct = (oddsRatio - 1) * 100;
    const ciLow = Math.exp(Math.max(-20, Math.min(20, beta - 1.96 * stdError)));
    const ciHigh = Math.exp(Math.max(-20, Math.min(20, beta + 1.96 * stdError)));

    let significance: CoefficientStat['significance'] = 'ns';
    if (pValue < 0.001) significance = '***';
    else if (pValue < 0.01) significance = '**';
    else if (pValue < 0.05) significance = '*';
    else if (pValue < 0.1) significance = '.';

    return {
      name: fName,
      sourceColumn: meta?.sourceColumn ?? fName,
      beta,
      stdError,
      zValue,
      pValue,
      oddsRatio,
      impactPct,
      ciLow,
      ciHigh,
      significance,
      interpretation: buildCoefficientInterpretation(
        fName,
        meta,
        oddsRatio,
        impactPct,
        targetPositiveDisplay
      ),
    };
  });

  const trainProbs = predictProbs(prepared.trainX, fit.intercept, fit.betas, selectedIndices);
  const validProbs = predictProbs(prepared.validX, fit.intercept, fit.betas, selectedIndices);
  const testProbs = predictProbs(prepared.testX, fit.intercept, fit.betas, selectedIndices);

  const basePositiveRate = Math.max(
    0.01,
    Math.min(0.99, prepared.originalClassCounts.onePct / 100)
  );
  const baseOdds = basePositiveRate / (1 - basePositiveRate);

  const trainEval = computeCurvesAndAUC(trainProbs, prepared.trainY, basePositiveRate);
  const validEval = computeCurvesAndAUC(validProbs, prepared.validY, basePositiveRate);
  const testEval = computeCurvesAndAUC(testProbs, prepared.testY, basePositiveRate);

  const trainMetrics = computeConfusionMetrics(trainProbs, prepared.trainY, 0.5);
  const validMetrics = computeConfusionMetrics(validProbs, prepared.validY, 0.5);
  const testMetrics = computeConfusionMetrics(testProbs, prepared.testY, 0.5);

  const interceptZ = fit.intercept / Math.max(1e-9, fit.interceptSe);
  const interceptP = twoTailedPValue(interceptZ);
  const pseudoR2 =
    fit.nullDeviance > 0 ? Math.max(0, 1 - fit.residualDeviance / fit.nullDeviance) : 0;

  return {
    id,
    name,
    subtitle,
    selectedFeatures,
    selectedIndices,
    intercept: fit.intercept,
    interceptSe: fit.interceptSe,
    interceptZ,
    interceptP,
    coefficients,
    aic: fit.aic,
    bic: fit.bic,
    logLikelihood: fit.logLikelihood,
    nullDeviance: fit.nullDeviance,
    residualDeviance: fit.residualDeviance,
    pseudoR2,
    aucTrain: trainEval.auc,
    aucValid: validEval.auc,
    aucTest: testEval.auc,
    trainMetrics,
    validMetrics,
    testMetrics,
    rocCurve: testEval.points,
    optimalThreshold: testEval.optimalThreshold,
    isBest: false,
    baseOdds,
    baseProb: basePositiveRate,
    trainProbs,
    validProbs,
    testProbs,
  };
}

/**
 * Trains all 5 Logistic Regression models from the prompt & R script:
 * 1. Regresión Logística Completa (GLM Binomial)
 * 2. Stepwise Forward (AIC)
 * 3. Stepwise Backward (AIC)
 * 4. Stepwise Both Directions (AIC) - matches step(modelo.logit, direction="both")
 * 5. Best Subsets (AIC)
 */
export function trainAllFiveModels(prepared: PreparedData): TrainedModel[] {
  const p = prepared.encodedFeatureNames.length;
  const allIndices = Array.from({ length: p }, (_, i) => i);
  const X = prepared.trainX;
  const y = prepared.trainY;

  const fitCache = new Map<string, FitResult>();
  const getFit = (indices: number[]) => {
    const sorted = [...indices].sort((a, b) => a - b);
    const key = sorted.join(',');
    const cached = fitCache.get(key);
    if (cached) return cached;
    const res = fitLogisticIRLS(X, y, sorted);
    fitCache.set(key, res);
    return res;
  };

  // 1. Full Model
  const fullFit = getFit(allIndices);

  // 2. Stepwise Forward (AIC)
  let fwdIndices: number[] = [];
  let fwdFit = getFit(fwdIndices);
  while (fwdIndices.length < p) {
    let bestCand: number | null = null;
    let bestCandFit = fwdFit;
    for (const idx of allIndices) {
      if (fwdIndices.includes(idx)) continue;
      const candFit = getFit([...fwdIndices, idx]);
      if (candFit.aic < bestCandFit.aic - 1e-4) {
        bestCand = idx;
        bestCandFit = candFit;
      }
    }
    if (bestCand === null) break;
    fwdIndices = [...fwdIndices, bestCand].sort((a, b) => a - b);
    fwdFit = bestCandFit;
  }
  if (fwdIndices.length === 0 && p > 0) {
    // Ensure at least 1 top feature if forward stopped at intercept
    let bestSingle = 0;
    let bestAic = Infinity;
    for (const idx of allIndices) {
      const f = getFit([idx]);
      if (f.aic < bestAic) {
        bestAic = f.aic;
        bestSingle = idx;
      }
    }
    fwdIndices = [bestSingle];
    fwdFit = getFit(fwdIndices);
  }

  // 3. Stepwise Backward (AIC)
  let bwdIndices = [...allIndices];
  let bwdFit = fullFit;
  while (bwdIndices.length > 1) {
    let worstIdx: number | null = null;
    let bestRemFit = bwdFit;
    for (const idx of bwdIndices) {
      const cand = bwdIndices.filter((i) => i !== idx);
      const candFit = getFit(cand);
      if (candFit.aic < bestRemFit.aic - 1e-4) {
        worstIdx = idx;
        bestRemFit = candFit;
      }
    }
    if (worstIdx === null) break;
    bwdIndices = bwdIndices.filter((i) => i !== worstIdx);
    bwdFit = bestRemFit;
  }

  // 4. Stepwise Both Directions (AIC) - matches R's step(modelo.logit, direction="both")
  let bothIndices = [...allIndices];
  let bothFit = fullFit;
  for (let step = 0; step < 25; step++) {
    let changed = false;
    let bestNextIndices = bothIndices;
    let bestNextFit = bothFit;

    // Try dropping one
    if (bothIndices.length > 1) {
      for (const idx of bothIndices) {
        const cand = bothIndices.filter((i) => i !== idx);
        const candFit = getFit(cand);
        if (candFit.aic < bestNextFit.aic - 1e-4) {
          bestNextFit = candFit;
          bestNextIndices = cand;
          changed = true;
        }
      }
    }
    // Try adding one
    for (const idx of allIndices) {
      if (bothIndices.includes(idx)) continue;
      const cand = [...bothIndices, idx].sort((a, b) => a - b);
      const candFit = getFit(cand);
      if (candFit.aic < bestNextFit.aic - 1e-4) {
        bestNextFit = candFit;
        bestNextIndices = cand;
        changed = true;
      }
    }

    if (!changed) break;
    bothIndices = bestNextIndices;
    bothFit = bestNextFit;
  }

  // 5. Best Subsets (Exhaustive up to p <= 10, Beam Search for p > 10)
  let bestSubIndices = [...bothIndices];
  let bestSubFit = bothFit;

  if (p <= 10) {
    const totalMasks = 1 << p;
    for (let mask = 1; mask < totalMasks; mask++) {
      const subset: number[] = [];
      for (let j = 0; j < p; j++) {
        if ((mask & (1 << j)) !== 0) subset.push(j);
      }
      const f = getFit(subset);
      if (f.aic < bestSubFit.aic - 1e-4) {
        bestSubFit = f;
        bestSubIndices = subset;
      }
    }
  } else {
    // Beam search across subset sizes
    let beam: { indices: number[]; fit: FitResult }[] = allIndices.map((idx) => ({
      indices: [idx],
      fit: getFit([idx]),
    }));
    beam.sort((a, b) => a.fit.aic - b.fit.aic);
    beam = beam.slice(0, 6);
    for (const item of beam) {
      if (item.fit.aic < bestSubFit.aic) {
        bestSubFit = item.fit;
        bestSubIndices = item.indices;
      }
    }
    for (let size = 2; size <= Math.min(8, p); size++) {
      const nextMap = new Map<string, { indices: number[]; fit: FitResult }>();
      for (const b of beam) {
        for (const idx of allIndices) {
          if (b.indices.includes(idx)) continue;
          const next = [...b.indices, idx].sort((a, b) => a - b);
          const key = next.join(',');
          if (!nextMap.has(key)) {
            nextMap.set(key, { indices: next, fit: getFit(next) });
          }
        }
      }
      beam = Array.from(nextMap.values())
        .sort((a, b) => a.fit.aic - b.fit.aic)
        .slice(0, 6);
      if (beam[0] && beam[0].fit.aic < bestSubFit.aic) {
        bestSubFit = beam[0].fit;
        bestSubIndices = beam[0].indices;
      }
    }
  }

  const models: TrainedModel[] = [
    buildTrainedModel(
      'full',
      'Modelo 1 · Regresión Logística Completa',
      'GLM Binomial con todas las variables codificadas',
      prepared,
      allIndices,
      fullFit
    ),
    buildTrainedModel(
      'forward',
      'Modelo 2 · Stepwise Forward',
      'Selección progresiva por adición (AIC)',
      prepared,
      fwdIndices,
      fwdFit
    ),
    buildTrainedModel(
      'backward',
      'Modelo 3 · Stepwise Backward',
      'Depuración regresiva por eliminación (AIC)',
      prepared,
      bwdIndices,
      bwdFit
    ),
    buildTrainedModel(
      'both',
      'Modelo 4 · Stepwise Both Directions',
      'Optimización bidireccional (AIC)',
      prepared,
      bothIndices,
      bothFit
    ),
    buildTrainedModel(
      'best_subsets',
      'Modelo 5 · Best Subsets',
      'Búsqueda óptima de subconjuntos (AIC)',
      prepared,
      bestSubIndices,
      bestSubFit
    ),
  ];

  // Rank models by composite Test AUC (primary) and parsimony AIC (tie-breaker)
  let bestIdx = 0;
  let bestScore = -Infinity;
  const minAic = Math.min(...models.map((m) => m.aic));

  models.forEach((m, i) => {
    const aicPenalty = Math.max(0, m.aic - minAic) * 0.002;
    const score = m.aucTest * 100 + m.testMetrics.f1 * 15 - aicPenalty;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  });

  models[bestIdx].isBest = true;
  return models;
}

export function computeSingleCaseProbability(
  model: TrainedModel,
  featureValues: Record<string, number>
): { probability: number; logit: number; contributions: { name: string; betaX: number }[] } {
  let logit = model.intercept;
  const contributions: { name: string; betaX: number }[] = [];

  for (const coef of model.coefficients) {
    const val = featureValues[coef.name] ?? 0;
    const contrib = coef.beta * val;
    logit += contrib;
    contributions.push({ name: coef.name, betaX: contrib });
  }

  return {
    probability: sigmoid(logit),
    logit,
    contributions,
  };
}

export interface ShapFeatureSummary {
  name: string;
  sourceColumn: string;
  meanAbsShap: number;
  importancePct: number;
  beta: number;
  oddsRatio: number;
  pValue: number;
  samples: { featureNorm: number; shapValue: number }[];
}

/**
 * Exact Linear Shapley values in log-odds space: phi_j(x) = beta_j * (x_j - E[x_j])
 */
export function computeShapSummary(
  model: TrainedModel,
  prepared: PreparedData
): {
  baseLogit: number;
  baseProb: number;
  features: ShapFeatureSummary[];
} {
  const X = prepared.testX.length > 0 ? prepared.testX : prepared.trainX;
  const n = Math.max(1, X.length);

  // Expected logit at mean feature values
  let baseLogit = model.intercept;
  const means: Record<string, number> = {};
  for (const coef of model.coefficients) {
    const meta = prepared.featureMeta[coef.name];
    const m = meta?.mean ?? 0;
    means[coef.name] = m;
    baseLogit += coef.beta * m;
  }

  const rawSummaries = model.coefficients.map((coef, cIdx) => {
    const featIdx = model.selectedIndices[cIdx];
    const meta = prepared.featureMeta[coef.name];
    const m = means[coef.name];
    const span = (meta?.max ?? 1) - (meta?.min ?? 0) || 1;

    let absSum = 0;
    const samples: { featureNorm: number; shapValue: number }[] = [];
    const stride = Math.max(1, Math.floor(n / 60));

    for (let i = 0; i < X.length; i++) {
      const val = X[i][featIdx];
      const phi = coef.beta * (val - m);
      absSum += Math.abs(phi);
      if (i % stride === 0) {
        samples.push({
          featureNorm: Math.max(0, Math.min(1, (val - (meta?.min ?? 0)) / span)),
          shapValue: phi,
        });
      }
    }

    return {
      name: coef.name,
      sourceColumn: coef.sourceColumn,
      meanAbsShap: absSum / n,
      beta: coef.beta,
      oddsRatio: coef.oddsRatio,
      pValue: coef.pValue,
      samples,
    };
  });

  const totalAbs = rawSummaries.reduce((a, b) => a + b.meanAbsShap, 0) || 1;
  const features: ShapFeatureSummary[] = rawSummaries
    .map((s) => ({
      ...s,
      importancePct: (s.meanAbsShap / totalAbs) * 100,
    }))
    .sort((a, b) => b.meanAbsShap - a.meanAbsShap);

  return {
    baseLogit,
    baseProb: sigmoid(baseLogit),
    features,
  };
}

export function runBatchPrediction(
  rows: RawRow[],
  model: TrainedModel,
  prepared: PreparedData,
  threshold = 0.5
): BatchPredictionRow[] {
  const idCol =
    Object.keys(rows[0] ?? {}).find((k) => k.toLowerCase().includes('id')) ?? null;

  return rows.map((row, idx) => {
    let logit = model.intercept;

    for (const coef of model.coefficients) {
      const meta = prepared.featureMeta[coef.name];
      let val = 0;
      if (meta?.isDummy && meta.categoryValue !== undefined) {
        const rawCat = row[meta.sourceColumn];
        val = !isMissing(rawCat) && String(rawCat).trim() === meta.categoryValue ? 1 : 0;
      } else {
        const num = toNumeric(row[coef.sourceColumn]);
        val = num !== null ? num : meta?.mean ?? 0;
      }
      logit += coef.beta * val;
    }

    const probability = sigmoid(logit);
    const prediction: 0 | 1 = probability >= threshold ? 1 : 0;
    const riskLevel: BatchPredictionRow['riskLevel'] =
      probability < 0.3 ? 'Bajo Riesgo' : probability < 0.65 ? 'Riesgo Medio' : 'Alto Riesgo';

    return {
      rowId: idCol && !isMissing(row[idCol]) ? String(row[idCol]) : idx + 1,
      probability,
      prediction,
      riskLevel,
      raw: row,
    };
  });
}
