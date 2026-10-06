import express from "express";
import path from "path";
import multer from "multer";
import mammoth from "mammoth";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import * as pdf from "pdf-parse";

// Ensure environment variables are loaded in local developer environment
dotenv.config();

const app = express();
const PORT = 3000;

// Body parser middlewares
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
  return `Error de la IA: ${errStr}`;
}

/**
 * Parses raw text extracted from a document into a structured survey JSON verbatim (verbatim/literal offline copy)
 */
function parseRawTextToSurveyVerbatim(text: string, filename: string) {
  const rawLines = text.split(/\r?\n/).map(l => l.trim());
  const lines = rawLines.filter(l => l.length > 0);

  if (lines.length === 0) {
    const cleanFilename = filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    return {
      title: cleanFilename,
      description: "Encuesta importada directamente del archivo original.",
      questions: []
    };
  }

  // Find a good title and description
  let title = lines[0];
  let description = "Encuesta importada directamente del archivo original (Modo copia literal sin IA).";
  let startIndex = 1;

  if (title.length > 100) {
    title = filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    description = lines[0];
    startIndex = 1;
  } else if (lines.length > 1) {
    const secondLine = lines[1];
    const isQuestion = secondLine.endsWith("?") || secondLine.includes("¿") || /^\d+[\.\)]/.test(secondLine);
    const isOption = /^[\s\d\w\)\.\-\*•\[\]]+$/.test(secondLine) && secondLine.length < 50 && (secondLine.startsWith("-") || secondLine.startsWith("*") || /^[a-gA-G][\)\.]/.test(secondLine));
    if (!isQuestion && !isOption && secondLine.length > 10) {
      description = secondLine;
      startIndex = 2;
    }
  }

  // Clean title from common labels
  title = title.replace(/^(t[ií]tulo|title|encuesta|survey|evaluaci[oó]n):\s*/i, "").trim();

  const questions: any[] = [];
  let currentQuestion: any = null;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];

    // Detect if this line represents an option of the previous question
    const isBulletOption = /^[•\-\*\+]\s*(.+)$/.test(line);
    const isCheckboxOption = /^\[\s*x?\s*\]\s*(.+)$/i.test(line) || /^\(\s*x?\s*\)\s*(.+)$/i.test(line);
    const isIndexOption = /^[a-gA-G0-9]+\s*[\)\.\-]\s*(.+)$/.test(line);

    const isOption = (isBulletOption || isCheckboxOption || isIndexOption) && currentQuestion && line.length < 200;

    if (isOption) {
      if (currentQuestion.type === "text") {
        currentQuestion.type = "single_choice";
      }
      if (!currentQuestion.options) {
        currentQuestion.options = [];
      }
      
      let optionText = line;
      if (isBulletOption) {
        optionText = line.replace(/^[•\-\*\+]\s*/, "");
      } else if (isCheckboxOption) {
        optionText = line.replace(/^\[\s*x?\s*\]\s*/i, "").replace(/^\(\s*x?\s*\)\s*/i, "");
      } else if (isIndexOption) {
        optionText = line.replace(/^[a-gA-G0-9]+\s*[\)\.\-]\s*/, "");
      }

      currentQuestion.options.push(optionText.trim());
    } else {
      // Treat this line as a new question!
      if (currentQuestion) {
        questions.push(currentQuestion);
      }

      let type: "text" | "rating" | "boolean" | "single_choice" = "text";
      const lineLower = line.toLowerCase();
      
      if (
        lineLower.includes("sí o no") || 
        lineLower.includes("si o no") || 
        lineLower.includes("verdadero o falso") ||
        lineLower.includes("(si/no)") ||
        lineLower.includes("(sí/no)")
      ) {
        type = "boolean";
      } else if (
        lineLower.includes("escala del") || 
        lineLower.includes("escala de 1") || 
        lineLower.includes("(1 al") || 
        lineLower.includes("(1-5)") || 
        lineLower.includes("(1-10)")
      ) {
        type = "rating";
      }

      currentQuestion = {
        id: `q_parsed_${Date.now()}_${questions.length}_${Math.random().toString(36).substr(2, 4)}`,
        text: line,
        type,
        options: [],
        required: true
      };
    }
  }

  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  return {
    title,
    description,
    questions
  };
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
        const parsedPdf = await parser.getText();
        extractedText = parsedPdf.text;
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
      // Fallback as plain text if it looks like any text file
      extractedText = req.file.buffer.toString("utf8");
    }

    if (!extractedText || extractedText.trim().length === 0) {
      res.status(400).json({ error: "No se pudo extraer texto del archivo o el documento está vacío." });
      return;
    }

    const useAI = req.body.useAI !== "false" && req.query.useAI !== "false";

    if (!useAI) {
      console.log(`Bypassing Gemini AI parsing as requested. Extracting text verbatim for: ${filename}`);
      const parsedSurvey = parseRawTextToSurveyVerbatim(extractedText, filename);
      res.json({ success: true, survey: parsedSurvey });
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
      res.json({ success: true, survey: parsedSurvey });
    } catch (jsonErr) {
      console.error("Error al analizar el formato JSON devuelto por Gemini:", resultText);
      res.status(500).json({ 
        error: "La IA no pudo estructurar el contenido en un formato JSON válido.",
        rawResponse: resultText 
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
    if (!survey || !targetLanguageCode || !targetLanguageName) {
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
      res.json({ success: true, translation: parsedTranslation });
    } catch (jsonErr) {
      console.error("Error al analizar el formato JSON de traducción:", resultText);
      res.status(500).json({ 
        error: "La IA no pudo formatear la traducción como un JSON válido.", 
        rawResponse: resultText 
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
    const distPath = path.join(process.cwd(), "dist");
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
