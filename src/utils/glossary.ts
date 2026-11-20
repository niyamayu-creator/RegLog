export interface GlossaryTerm {
  term: string;
  category: 'Modelado' | 'Métricas' | 'Preparación' | 'Negocio';
  summary: string;
  businessExample: string;
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: 'Regresión Logística (GLM Binomial)',
    category: 'Modelado',
    summary:
      'Modelo estadístico que estima la probabilidad (entre 0% y 100%) de que ocurra un evento binario (Sí/No, Retraso/Al día, Compra/No compra) a partir de múltiples variables.',
    businessExample:
      'Calcular la probabilidad de que un cliente entre en mora el próximo mes según su saldo, antigüedad y tipo de entidad.',
  },
  {
    term: 'Odds Ratio (Razón de Momios)',
    category: 'Modelado',
    summary:
      'Factor multiplicativo que indica cuánto cambian las probabilidades relativas (odds) del evento cuando una variable aumenta en 1 unidad. OR > 1 aumenta el riesgo/evento; OR < 1 lo reduce.',
    businessExample:
      'Un Odds Ratio de 1.25 en Edad indica que cada año adicional multiplica los odds del evento por 1.25 (+25% de impacto relativo).',
  },
  {
    term: 'Logit(P)',
    category: 'Modelado',
    summary:
      'Transformación matemática (logaritmo natural de los odds: ln(P / (1 - P))) que permite expresar la relación entre las variables y la probabilidad mediante una ecuación lineal.',
    businessExample:
      'Si Logit(P) = 0, la probabilidad predicha es exactamente 50%. Valores positivos indican probabilidad > 50%.',
  },
  {
    term: 'P-value (Significancia Estadística)',
    category: 'Métricas',
    summary:
      'Probabilidad de observar el efecto de una variable por puro azar. Valores menores a 0.05 indican evidencia estadística sólida de que la variable realmente influye en el resultado.',
    businessExample:
      'Un P-value de 0.002 confirma que el porcentaje de pasivo sobre ventas es un predictor genuino del retraso.',
  },
  {
    term: 'AIC y BIC',
    category: 'Modelado',
    summary:
      'Criterios de información (Akaike y Bayesiano) que equilibran qué tan bien se ajusta el modelo a los datos frente a su complejidad. Valores más bajos indican mejores modelos.',
    businessExample:
      'Entre dos modelos con similar precisión, elegimos el de menor AIC porque explica lo mismo con menos variables innecesarias.',
  },
  {
    term: 'Stepwise (Forward / Backward / Both)',
    category: 'Modelado',
    summary:
      'Métodos automáticos que prueban agregar o quitar variables paso a paso para conservar únicamente los predictores que aportan valor real según el AIC.',
    businessExample:
      'Depura automáticamente 12 variables iniciales hasta dejar solo las 5 verdaderamente determinantes.',
  },
  {
    term: 'Variables Dummy (One-Hot Encoding)',
    category: 'Preparación',
    summary:
      'Conversión automática de categorías de texto o códigos nominales en columnas binarias (0 o 1), dejando una categoría base como referencia para evitar redundancia.',
    businessExample:
      'TIPO_IPS se transforma en TIPO_IPS_1, TIPO_IPS_2, TIPO_IPS_3 y TIPO_IPS_4, comparándose contra TIPO_IPS_5.',
  },
  {
    term: 'Balanceo de Clases (Submuestreo / SMOTE / Oversampling)',
    category: 'Preparación',
    summary:
      'Técnicas que equilibran la cantidad de casos positivos (1) y negativos (0) durante el entrenamiento para evitar que el modelo ignore la clase minoritaria.',
    businessExample:
      'Si solo el 15% de clientes tiene retrasos, SMOTE o Submuestreo evitan que el modelo prediga siempre "0" para acertar por mayoría.',
  },
  {
    term: 'AUC (Área Bajo la Curva ROC)',
    category: 'Métricas',
    summary:
      'Mide entre 0.50 (azar puro) y 1.00 (separación perfecta) la capacidad del modelo para asignar mayor probabilidad a un caso positivo real que a uno negativo.',
    businessExample:
      'Un AUC de 0.88 significa que el 88% de las veces el modelo ordena correctamente a un cliente moroso por encima de uno cumplido.',
  },
  {
    term: 'Sensibilidad (Recall) y Especificidad',
    category: 'Métricas',
    summary:
      'Sensibilidad es el % de positivos reales detectados correctamente. Especificidad es el % de negativos reales clasificados correctamente.',
    businessExample:
      'En prevención de fraude o mora, priorizamos alta Sensibilidad para no dejar escapar casos riesgosos.',
  },
  {
    term: 'Precision-Recall y Threshold Óptimo',
    category: 'Métricas',
    summary:
      'El Threshold (punto de corte) define desde qué probabilidad clasificamos un caso como 1. El umbral óptimo maximiza el equilibrio (F1 Score) entre Precision y Recall.',
    businessExample:
      'Con datos desbalanceados, un corte de 0.35 puede detectar muchos más riesgos reales que el 0.50 estándar.',
  },
  {
    term: 'Curva de Ganancias (Gain / Lift / Profit)',
    category: 'Negocio',
    summary:
      'Muestra cuántos casos positivos se capturan al contactar al top X% de mayor probabilidad (Gain), cuántas veces supera al azar (Lift) y cuál es la utilidad neta estimada (Profit).',
    businessExample:
      'Contactando solo al 30% con mayor puntaje se logra capturar el 72% de los retrasos y maximizar el retorno financiero.',
  },
  {
    term: 'Valores SHAP',
    category: 'Modelado',
    summary:
      'Descomposición exacta de cuánto empuja cada variable individual la predicción de un caso específico por encima o por debajo del promedio base.',
    businessExample:
      'Explica por qué un cliente concreto obtuvo 78% de riesgo: +22% por pasivo alto, +14% por Tipo IPS 4 y -5% por antigüedad.',
  },
];
