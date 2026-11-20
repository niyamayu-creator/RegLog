import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.post('/api/executive-report', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(400).json({
        error:
          'No se detectó una clave GEMINI_API_KEY configurada en el entorno. Configura tu clave en el panel Settings > Secrets para generar el informe ejecutivo con IA.',
      });
      return;
    }

    try {
      const payload = req.body;
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `
Actúa como Director de Ciencia de Datos y Estrategia Empresarial. Redacta un informe ejecutivo gerencial en español, claro, preciso y orientado a la toma de decisiones de negocio (sin jerga de programación ni código), basado estrictamente en los siguientes resultados reales del análisis de Regresión Logística:

${JSON.stringify(payload, null, 2)}

Requisitos por sección:
- resumenEjecutivo: Síntesis directa del objetivo de negocio, hallazgo principal, capacidad predictiva y recomendación central (2-3 párrafos cortos).
- calidadDatos: Evaluación de integridad de la base de datos, registros totales, columnas, valores faltantes tratados, variables numéricas/categóricas y estrategia de balanceo aplicada.
- modeloSeleccionado: Justificación de por qué el modelo elegido superó a las alternativas (AIC, BIC, AUC, F1) y qué significa en términos de parsimonia y estabilidad.
- variablesImportantes: Análisis de los 3 a 5 predictores con mayor peso estadístico (significancia y dirección del efecto).
- oddsRatios: Interpretación ejecutiva de las razones de momios (Odds Ratios) clave y cómo multiplican o reducen la probabilidad del evento objetivo.
- curvaRoc: Lectura gerencial de la capacidad discriminatoria (AUC) y qué tan confiable es el modelo para separar casos positivos de negativos.
- matrizConfusion: Balance entre falsos positivos y falsos negativos, Sensibilidad (Recall), Especificidad y punto de corte óptimo sugerido.
- riesgoDetectado: Segmentos, perfiles o umbrales críticos donde se concentra el mayor riesgo u oportunidad según los datos y el punto de corte económico.
- recomendacionesNegocio: Lista de 4 a 5 acciones operativas concretas, accionables y medibles para los equipos comerciales, de riesgo o de operación.
- conclusiones: Cierre estratégico con próximos pasos de implementación y monitoreo del modelo en producción.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'Eres un consultor senior de analítica avanzada para ejecutivos. Responde exclusivamente con JSON válido siguiendo el esquema solicitado. Usa cifras exactas del contexto recibido sin inventar números.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              resumenEjecutivo: { type: Type.STRING },
              calidadDatos: { type: Type.STRING },
              modeloSeleccionado: { type: Type.STRING },
              variablesImportantes: { type: Type.STRING },
              oddsRatios: { type: Type.STRING },
              curvaRoc: { type: Type.STRING },
              matrizConfusion: { type: Type.STRING },
              riesgoDetectado: { type: Type.STRING },
              recomendacionesNegocio: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              conclusiones: { type: Type.STRING },
            },
            required: [
              'resumenEjecutivo',
              'calidadDatos',
              'modeloSeleccionado',
              'variablesImportantes',
              'oddsRatios',
              'curvaRoc',
              'matrizConfusion',
              'riesgoDetectado',
              'recomendacionesNegocio',
              'conclusiones',
            ],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json({ report: parsed });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al comunicarse con el servicio de IA.';
      console.error('Executive report generation error:', message);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LogiStudio Analytics running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
