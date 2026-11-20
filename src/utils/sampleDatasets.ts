import { RawRow } from '../types/analytics';

// Deterministic PRNG so built-in sample datasets are reproducible
function createRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function normalSample(rng: () => number, mean: number, std: number) {
  const u1 = Math.max(1e-8, rng());
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

/**
 * Generates a realistic 240-row dataset modeled directly after `carteraguia2017.xlsx`
 * from the attached R script:
 * Variables: ID_CLIENTE, TIPO_ips (1..5), IGUAL_DUENO, ANOS_DIR_ACTUAL,
 * PCT_PASIVO_VENTA, cartera_actual_insumos_A, cartera_actual_insumos_B,
 * VENTAS_MENS_PROMEDIO, retrasos (0/1).
 */
export function generateCarteraSample(): RawRow[] {
  const rng = createRng(1545867);
  const rows: RawRow[] = [];

  for (let i = 1; i <= 240; i++) {
    const rType = rng();
    let tipoIps = '5';
    if (rType < 0.22) tipoIps = '1';
    else if (rType < 0.36) tipoIps = '2';
    else if (rType < 0.56) tipoIps = '3';
    else if (rType < 0.78) tipoIps = '4';
    else tipoIps = '5';

    const igualDueno = Math.max(1, Math.round(normalSample(rng, 11, 5.5)));
    const anosDirActual = Math.max(1, Math.round(Math.min(igualDueno, normalSample(rng, 7, 4))));
    const pctPasivoVenta = Math.max(
      4,
      Math.min(95, Number(normalSample(rng, 38, 17).toFixed(1)))
    );
    const ventasMensProm = Math.max(
      12,
      Number((normalSample(rng, 85, 34) + (tipoIps === '1' ? 20 : 0)).toFixed(1))
    );
    const carteraInsumosA = Math.max(
      0,
      Number((normalSample(rng, 24, 14) + pctPasivoVenta * 0.22).toFixed(1))
    );
    const carteraInsumosB = Math.max(
      0,
      Number((carteraInsumosA * 0.65 + normalSample(rng, 8, 5)).toFixed(1))
    );

    // True underlying logistic propensity aligned with R script predictors
    const logit =
      -3.15 -
      0.11 * igualDueno -
      0.08 * anosDirActual +
      0.048 * pctPasivoVenta +
      0.055 * carteraInsumosA +
      (tipoIps === '4' ? 1.25 : tipoIps === '3' ? 0.55 : tipoIps === '1' ? -0.35 : 0.1) +
      normalSample(rng, 0, 0.45);

    const prob = 1 / (1 + Math.exp(-logit));
    const retrasos = rng() < prob ? 1 : 0;

    // Introduce ~2% realistic missing cells in non-target columns to showcase Module 1 & 3 imputation
    const missingPassivo = i % 53 === 0 ? null : pctPasivoVenta;
    const missingDir = i % 79 === 0 ? null : anosDirActual;

    rows.push({
      ID_CLIENTE: `IPS-${String(1000 + i)}`,
      TIPO_ips: tipoIps,
      IGUAL_DUENO: igualDueno,
      ANOS_DIR_ACTUAL: missingDir,
      PCT_PASIVO_VENTA: missingPassivo,
      cartera_actual_insumos_A: carteraInsumosA,
      cartera_actual_insumos_B: carteraInsumosB,
      VENTAS_MENS_PROMEDIO: ventasMensProm,
      retrasos,
    });
  }

  return rows;
}

/**
 * Generates a realistic 140-row dataset modeled after `financierosatisfaccion.xlsx`
 * from the attached R script (`edad`, `saldo`, plus business context columns and `satisfecho`).
 */
export function generateSatisfaccionSample(): RawRow[] {
  const rng = createRng(24029114);
  const canales = ['App Móvil', 'Sucursal', 'Banca Web'];
  const rows: RawRow[] = [];

  // Include the exact 12 anchor rows from `finansatis1` in the R script first
  const anchor = [
    { edad: 30, saldo: 1787, satisfecho: 1, canal: 'App Móvil', productos: 3 },
    { edad: 33, saldo: 4108, satisfecho: 0, canal: 'Banca Web', productos: 2 },
    { edad: 35, saldo: 1350, satisfecho: 1, canal: 'App Móvil', productos: 3 },
    { edad: 30, saldo: 1476, satisfecho: 1, canal: 'App Móvil', productos: 2 },
    { edad: 59, saldo: 0, satisfecho: 1, canal: 'Sucursal', productos: 4 },
    { edad: 35, saldo: 747, satisfecho: 1, canal: 'Banca Web', productos: 2 },
    { edad: 36, saldo: 307, satisfecho: 0, canal: 'Sucursal', productos: 1 },
    { edad: 39, saldo: 147, satisfecho: 1, canal: 'App Móvil', productos: 2 },
    { edad: 41, saldo: 221, satisfecho: 0, canal: 'Sucursal', productos: 1 },
    { edad: 43, saldo: -88, satisfecho: 0, canal: 'Sucursal', productos: 1 },
    { edad: 39, saldo: 3374, satisfecho: 1, canal: 'App Móvil', productos: 4 },
    { edad: 43, saldo: 264, satisfecho: 0, canal: 'Banca Web', productos: 1 },
  ];

  anchor.forEach((a, idx) => {
    rows.push({
      ID_CUENTA: `CTA-${200 + idx + 1}`,
      edad: a.edad,
      saldo: a.saldo,
      productos_activos: a.productos,
      canal_preferido: a.canal,
      satisfecho: a.satisfecho,
    });
  });

  for (let i = 13; i <= 140; i++) {
    const edad = Math.max(21, Math.min(72, Math.round(normalSample(rng, 40, 10))));
    const saldo = Math.round(normalSample(rng, 1450, 1150));
    const productos = Math.max(1, Math.min(5, Math.round(normalSample(rng, 2.5, 1.1))));
    const canal = canales[Math.floor(rng() * canales.length)];

    const logit =
      -2.45 +
      0.048 * edad +
      0.0012 * saldo +
      0.42 * productos +
      (canal === 'App Móvil' ? 0.65 : canal === 'Banca Web' ? 0.2 : -0.35) +
      normalSample(rng, 0, 0.5);

    const prob = 1 / (1 + Math.exp(-logit));
    const satisfecho = rng() < prob ? 1 : 0;

    rows.push({
      ID_CUENTA: `CTA-${200 + i}`,
      edad,
      saldo,
      productos_activos: productos,
      canal_preferido: canal,
      satisfecho,
    });
  }

  return rows;
}
