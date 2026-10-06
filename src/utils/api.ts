import { Survey, TranslationData } from '../types';
import { adminAuthorizationHeaders } from '../authService';

export interface ParseResult {
  success: boolean;
  survey?: {
    title: string;
    description: string;
    questions: Array<{
      id: string;
      text: string;
      type: 'text' | 'rating' | 'multiple_choice' | 'boolean' | 'single_choice';
      options?: string[];
      required: boolean;
    }>;
  };
  error?: string;
}

export interface TranslateResult {
  success: boolean;
  translation?: TranslationData;
  error?: string;
}

/**
 * Uploads a PDF or Word file to the server and parses it into a structured survey JSON
 */
export async function uploadAndParseSurveyFile(file: File, useAI: boolean = true): Promise<ParseResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('useAI', String(useAI));

  try {
    const response = await fetch(`/api/parse-survey?useAI=${useAI}`, {
      method: 'POST',
      headers: await adminAuthorizationHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const errResponse = await response.json();
      throw new Error(errResponse.error || `Error del servidor: ${response.statusText}`);
    }

    return await response.json() as ParseResult;
  } catch (error: any) {
    console.error('Error uploading/parsing survey file:', error);
    return {
      success: false,
      error: error.message || 'Error de conexión de red al intentar analizar el documento.'
    };
  }
}

/**
 * Translates survey contents into a destination language using Gemini AI
 */
export async function translateSurveyWithAI(
  survey: Partial<Survey>, 
  targetLanguageCode: string, 
  targetLanguageName: string
): Promise<TranslateResult> {
  try {
    const response = await fetch('/api/translate-survey', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        survey,
        targetLanguageCode,
        targetLanguageName
      }),
    });

    if (!response.ok) {
      const errResponse = await response.json();
      throw new Error(errResponse.error || `Error del servidor: ${response.statusText}`);
    }

    return await response.json() as TranslateResult;
  } catch (error: any) {
    console.error('Error translating survey with AI:', error);
    return {
      success: false,
      error: error.message || 'Error de conexión de red al intentar traducir la encuesta.'
    };
  }
}
