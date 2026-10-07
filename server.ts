import express from "express";
import path from "path";
import multer from "multer";
import mammoth from "mammoth";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import * as pdf from "pdf-parse";
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { requireAdministrator, createApiLimiter, apiErrorHandler } from './serverSecurity';
import { parseRawTextToSurveyVerbatim } from './src/utils/surveyParser';
import { validSurveyDraft, validTranslationRequest } from './src/utils/apiValidation';
import { translationCoverage } from './src/utils/surveyValidation';
import { NEW_FIREBASE_ENV } from './src/newFirebaseConfig';

// Ensure environment variables are loaded in local developer environment
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
// Authentication belongs exclusively to the new project; no fallback to historical credentials.
const projectId = process.env.FIREBASE_PROJECT_ID ?? NEW_FIREBASE_ENV.VITE_NEW_FIREBASE_PROJECT_ID;
const adminApp = projectId && projectId !== 'chromatic-pride-0ttsj'
  ? getApps().find(app => app.name === 'survey-auth') || initializeApp({ projectId }, 'survey-auth') : null;
const adminOnly = requireAdministrator(async token => {
  if (!adminApp) throw new Error('New administrator project is not configured');
  const claims = await getAuth(adminApp).verifyIdToken(token);
  return { admin: claims.admin };
});
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(['/api/parse-survey', '/api/translate-survey'], createApiLimiter());
app.use('/api/parse-survey', adminOnly);

// Body parser middlewares
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));

// Configure Multer to intercept files in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Lazy-loaded Gemini AI helper so server doesn't crash on boot if environment variables aren't set
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined in this app.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

/**
 * Retries raw model.generateContent calls with exponential backoff on transient errors (e.g. 503, 429)
 */
async function generateContentWithRetry(
  ai: GoogleGenAI,
  options: { model: string; contents: string; [key: string]: any },
  maxRetries = 4
): Promise<any> {
  let attempt = 0;
  let delay = 1000;

  while (true) {
    try {
      return await ai.models.generateContent(options);
    } catch (error: any) {
      attempt++;
      const errMessage = error instanceof Error ? error.message : String(error);
      const isTransient =
        errMessage.includes("503") ||
        errMessage.includes("UNAVAILABLE") ||
        errMessage.includes("high demand") ||
        errMessage.includes("temporary") ||
        errMessage.includes("429") ||
        errMessage.includes("RESOURCE_EXHAUSTED") ||
        (error?.status && [429, 503].includes(error.status));

      if (isTransient && attempt < maxRetries) {
        // Fallback option to extremely stable gemini-2.5-flash if 3.5-flash fails
        if (options.model === "gemini-3.5-flash") {
          console.warn(`Transient Gemini API 503 on gemini-3.5-flash. Switching to gemini-2.5-flash for safety.`);
          options.model = "gemini-2.5-flash";
        }
        console.warn(`Transient Gemini API error on attempt ${attempt}/${maxRetries}. Retrying in ${delay}ms... Error:`, errMessage);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
      } else {
        throw error;
      }
    }
  }
}

/**
 * Returns a human-friendly Spanish message for Gemini API failures
 */
function getFriendlyAIErrorMessage(error: any): string {
  const errStr = error instanceof Error ? error.message : String(error);
  if (
    errStr.includes("503") ||
    errStr.includes("UNAVAILABLE") ||
    errStr.includes("high demand") ||
    errStr.includes("temporary")
  ) {
    return "El servidor de Inteligencia Artificial (Gemini) está experimentando una demanda extremadamente alta en este momento (Error 503). Por favor, intenta de nuevo en unos segundos. Por lo general, el servicio se restablece de inmediato.";
  }
  if (
    errStr.includes("429") ||
    errStr.includes("RESOURCE_EXHAUSTED") ||
    errStr.includes("quota")
  ) {
    return "Se ha superado temporalmente el límite de consultas permitidas a la IA (Error 429). Por favor, intenta de nuevo en unos momentos.";
  }
  return "No se pudo completar la operación. Reintenta más tarde.";
}

// -------------------------------------------------------------------------
// SERVER API ROUTES
// -------------------------------------------------------------------------

// Healthcheck route
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Endpoint: Parse PDF/Word files to structured survey JSON
app.post("/api/parse-survey", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No se proporcionó ningún archivo." });
      return;
    }

    let extractedText = "";
    const mimetype = req.file.mimetype;
    const filename = req.file.originalname;

    if (mimetype === "application/pdf") {
      try {
        const parser = new pdf.PDFParse({ data: req.file.buffer });
        try { extractedText = (await parser.getText()).text; }
        finally { await parser.destroy(); }
      } catch (pdfErr: any) {
        throw new Error(`Error al procesar el archivo PDF: ${pdfErr.message}`);
      }
    } else if (
      mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      filename.endsWith(".docx")
    ) {
      try {
        const parsedDoc = await mammoth.extractRawText({ buffer: req.file.buffer });
        extractedText = parsedDoc.value;
      } catch (docErr: any) {
        throw new Error(`Error al procesar el archivo de Word (.docx): ${docErr.message}`);
      }
    } else {
      if (!filename.toLowerCase().endsWith('.txt')) {
        res.status(400).json({ error: 'Solo se admiten PDF, DOCX o TXT.' }); return;
      }
      extractedText = req.file.buffer.toString("utf8");
    }

    if (!extractedText || extractedText.trim().length === 0) {
      res.status(400).json({ error: "No se pudo extraer texto del archivo o el documento está vacío." });
      return;
    }

    if (extractedText.length > 200_000) {
      res.status(413).json({ error: 'El documento contiene demasiado texto. Divídelo antes de importarlo.' }); return;
    }
    const useAI = req.body.useAI !== "false" && req.query.useAI !== "false";

    if (!useAI) {
      console.log(`Bypassing Gemini AI parsing as requested. Extracting text verbatim for: ${filename}`);
      const parsedSurvey = parseRawTextToSurveyVerbatim(extractedText, filename);
      res.json({ success: true, survey: parsedSurvey, warnings: parsedSurvey.warnings });
      return;
    }

    // Call Gemini to convert this raw text to clean structured JSON survey
    const ai = getGeminiClient();
    const prompt = `
Eres un especialista en encuestas e investigación de mercado. Analiza el siguiente texto extraído de un documento de encuesta y estructúralo en una encuesta formal y limpia en formato JSON estricto.

CRITICAL: NO alteres, simplifiques ni modifiques de ninguna forma el texto o vocabulario de las preguntas. Tu objetivo es mapear el contenido EXACTAMENTE AL PIE DE LA LETRA (literal/verbatim) tal cual está escrito en el documento de Word. Copia textualmente cada pregunta y sus opciones de respuesta correspondientes. No omitas ninguna pregunta.

Reglas de salida:
1. Debes retornar ÚNICAMENTE el código JSON. No incluyas comentarios, bloques explicativos ni formateo de markdown que no sea el JSON crudo o un bloque de código JSON \`\`\`json.
2. La estructura del JSON final debe ser obligatoriamente esta:
{
  "title": "Un título sugerido o extraído para la encuesta",
  "description": "Una breve descripción del propósito de la encuesta o instrucciones",
  "questions": [
    {
      "id": "un_id_único_corto_como_q1_q2_q3_o_un_uuid_generado_azarosamente",
      "text": "La pregunta de la encuesta formulada de manera clara",
      "type": "text" | "rating" | "multiple_choice" | "boolean" | "single_choice",
      "options": ["Opción A", "Opción B", "etc"], // Solo incluye la propiedad options si el tipo es multiple_choice o single_choice
      "required": true
    }
  ]
}

3. Regla de "type":
- "text": Para respuestas libres escritas.
- "rating": Para preguntas de escala numérica (del 1 al 5 o del 1 al 10).
- "multiple_choice": Para preguntas con varias opciones donde pueden seleccionar varias.
- "single_choice": Para preguntas con múltiples opciones donde solo se selecciona una.
- "boolean": Para preguntas Sí/No o Verdadero/Falso.

Texto del documento:
---
${extractedText}
---
`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    let resultText = response.text || "";

    // Clean up codeblock if Gemini returns it decorated
    if (resultText.includes("```json")) {
      resultText = resultText.substring(resultText.indexOf("```json") + 7);
      resultText = resultText.substring(0, resultText.lastIndexOf("```"));
    } else if (resultText.includes("```")) {
      resultText = resultText.substring(resultText.indexOf("```") + 3);
      resultText = resultText.substring(0, resultText.lastIndexOf("```"));
    }

    try {
      const parsedSurvey = JSON.parse(resultText.trim());
      if (!validSurveyDraft(parsedSurvey)) throw new Error('Invalid survey schema');
      res.json({ success: true, survey: parsedSurvey });
    } catch (jsonErr) {
      console.error("La IA devolvió un formato de encuesta inválido.");
      res.status(500).json({
        error: "La IA no pudo estructurar el contenido en un formato JSON válido.",
        // Raw AI content is not included in public error responses.
      });
    }
  } catch (err: any) {
    console.error("File parsing error:", err);
    res.status(500).json({ error: getFriendlyAIErrorMessage(err) });
  }
});

// Endpoint: Translate survey content into a selected language using Gemini
app.post("/api/translate-survey", async (req, res) => {
  try {
    const { survey, targetLanguageCode, targetLanguageName } = req.body;
    if (!validTranslationRequest(survey, targetLanguageCode, targetLanguageName)) {
      res.status(400).json({ error: "Faltan parámetros de encuesta o idioma para traducir." });
      return;
    }

    const ai = getGeminiClient();
    const prompt = `
Eres un traductor profesional nativo. Traduce los siguientes contenidos de encuesta de forma natural y adaptada al idioma: "${targetLanguageName}" (Código de idioma: "${targetLanguageCode}").

La entrada contiene un título, una descripción y un conjunto de preguntas con opciones.
Debes mantener exactamente los mismos IDs correspondientes de cada pregunta para asegurar la consistencia.

Reglas de salida:
1. Retorna ÚNICAMENTE un formato JSON válido. No agregues explicaciones externas ni notas.
2. El JSON resultante de la traducción debe tener la siguiente estructura exacta:
{
  "title": "Título traducido",
  "description": "Descripción traducida",
  "questions": {
    "question_id_1": {
      "text": "Pregunta traducida",
      "options": ["Opción 1 traducida", "Opción 2 traducida", "etc"] // SOLO si la pregunta cuenta con opciones en el original
    },
    "question_id_2": {
      "text": "Otra pregunta traducida"
    }
  }
}

Encuesta original a traducir:
{
  "title": "${survey.title}",
  "description": "${survey.description}",
  "questions": ${JSON.stringify(survey.questions)}
}
`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    let resultText = response.text || "";

    if (resultText.includes("```json")) {
      resultText = resultText.substring(resultText.indexOf("```json") + 7);
      resultText = resultText.substring(0, resultText.lastIndexOf("```"));
    } else if (resultText.includes("```")) {
      resultText = resultText.substring(resultText.indexOf("```") + 3);
      resultText = resultText.substring(0, resultText.lastIndexOf("```"));
    }

    try {
      const parsedTranslation = JSON.parse(resultText.trim());
      if (!translationCoverage(survey, parsedTranslation).complete ||
          typeof parsedTranslation.title !== 'string' || !parsedTranslation.title.trim() ||
          typeof parsedTranslation.description !== 'string') throw new Error('Incomplete translation');
      res.json({ success: true, translation: parsedTranslation });
    } catch (jsonErr) {
      console.error("La IA devolvió un formato de traducción inválido.");
      res.status(500).json({
        error: "La IA no pudo formatear la traducción como un JSON válido.",
        // Raw AI content is not included in public error responses.
      });
    }
  } catch (err: any) {
    console.error("Translation error:", err);
    res.status(500).json({ error: getFriendlyAIErrorMessage(err) });
  }
});

// -------------------------------------------------------------------------
// VITE OR STATIC FRONTEND SERVING
// -------------------------------------------------------------------------
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'La función solicitada no existe.' });
});
app.use(apiErrorHandler);

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode: mount Vite dev middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve built client assets from /dist
    const distPath = path.join(process.cwd(), "dist", "client");
    app.use((req, res, next) => {
      if (/\.(?:cjs|map)$/.test(req.path)) { res.sendStatus(404); return; }
      next();
    });
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind to 0.0.0.0 and port 3000 as required
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${PORT} [NODE_ENV=${process.env.NODE_ENV || "development"}]`);
  });
}

startServer();
