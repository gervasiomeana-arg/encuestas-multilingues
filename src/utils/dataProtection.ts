import type { SurveyResponse } from '../types';

export function validateResponseBatch(responses: SurveyResponse[]) {
  if (!Array.isArray(responses) || responses.length === 0 || responses.length > 250) {
    throw new Error('Importa entre 1 y 250 respuestas por operación.');
  }
  const ids = new Set<string>();
  for (const response of responses) {
    if (!response || typeof response.id !== 'string' || !response.id || response.id.includes('/') ||
        typeof response.surveyId !== 'string' || !response.surveyId || response.surveyId.includes('/') ||
        !response.answers || typeof response.answers !== 'object' || Array.isArray(response.answers) ||
        Object.keys(response.answers).length === 0 || Object.keys(response.answers).length > 250 ||
        typeof response.userName !== 'string' || response.userName.length > 200 ||
        typeof response.userLanguage !== 'string' || response.userLanguage.length > 20 ||
        (response.userCountry !== undefined && typeof response.userCountry !== 'string') ||
        typeof response.submittedAt !== 'string' || !Number.isFinite(Date.parse(response.submittedAt))) {
      throw new Error('Una respuesta tiene un formato inválido. No se importó ningún registro.');
    }
    if (ids.has(response.id)) throw new Error('Hay IDs repetidos en el archivo. No se importó ningún registro.');
    ids.add(response.id);
  }
}

// Import only explicit records. Never infer survey, timestamp or answers from UI state.
export function prepareResponseImport(input: unknown): SurveyResponse[] {
  let source: unknown = input;
  if (source && typeof source === 'object' && 'format' in source && source.format === 'survey-backup') {
    if (!('responses' in source) || !Array.isArray(source.responses)) throw new Error('El respaldo no contiene una lista de respuestas válida.');
    source = source.responses;
  }
  const records = Array.isArray(source) ? source : [source];
  const responses = records.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('El archivo contiene un registro inválido.');
    return {
      id: item.id,
      surveyId: item.surveyId,
      userName: item.userName ?? item.nombre,
      userLanguage: item.userLanguage ?? item.idioma,
      ...(item.userCountry !== undefined ? { userCountry: item.userCountry } : {}),
      answers: item.answers ?? item.respuestas,
      submittedAt: item.submittedAt ?? item.fecha
    } as SurveyResponse;
  });
  validateResponseBatch(responses);
  return responses;
}

export function ratingScore(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const score = Number(value);
  return Number.isInteger(score) && score >= 1 && score <= 10 ? score : null;
}

export function ratingAverage(values: unknown[]): string {
  const scores = values.map(ratingScore).filter((value): value is number => value !== null);
  return scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A';
}

export function csvCell(value: unknown): string {
  const text = String(value ?? '');
  // Quotes alone do not stop spreadsheet software interpreting a formula.
  const safe = /^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
