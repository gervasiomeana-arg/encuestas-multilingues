import type { Survey, SurveyResponse } from '../types';
import { csvCell, ratingScore } from './dataProtection';
import { normalizeAnswerToSpanish } from './answerTranslator';

export function ratingDistribution(values: unknown[]) {
  const scores = values.map(ratingScore).filter((value): value is number => value !== null);
  return Array.from({ length: 10 }, (_, index) => {
    const score = index + 1;
    const votes = scores.filter(value => value === score).length;
    return { name: `Puntaje ${score}`, score: String(score), Votos: votes,
      porcentaje: scores.length ? (votes / scores.length * 100).toFixed(1) : '0.0' };
  });
}

// Preserve exact stored values next to the existing interpretation for reporting.
export function surveyReportCSV(survey: Survey, responses: SurveyResponse[]): string {
  const headers = ['ID Respuesta', 'Fecha Original', 'Participante', 'Idioma Original', 'País'];
  survey.questions.forEach((question, index) => {
    headers.push(`P${index + 1} Original: ${question.text}`, `P${index + 1} Normalizada: ${question.text}`);
  });
  const rows = responses.map(response => {
    const row = [response.id, response.submittedAt, response.userName, response.userLanguage, response.userCountry ?? ''];
    survey.questions.forEach(question => {
      const raw = response.answers[question.id];
      const normalized = normalizeAnswerToSpanish(raw, question, survey);
      row.push(Array.isArray(raw) ? JSON.stringify(raw) : String(raw ?? ''),
        Array.isArray(normalized) ? normalized.join('; ') : String(normalized ?? ''));
    });
    return row.map(csvCell).join(',');
  });
  return '\uFEFF' + [headers.map(csvCell).join(','), ...rows].join('\r\n');
}

// Keep the two existing Mauritania aliases; never change a stored surveyId.
export function resolveResponseSurvey(surveys: Survey[], surveyId: string): Survey | undefined {
  const exact = surveys.find(survey => survey.id === surveyId);
  if (exact) return exact;
  const alias = surveyId === 'survey_mauritania_dos' ? 'survey_mauritania_perfecta' :
    surveyId === 'survey_mauritania_perfecta' ? 'survey_mauritania_dos' : null;
  return alias ? surveys.find(survey => survey.id === alias) : undefined;
}
