import type { Survey, SurveyQuestion, TranslationData } from '../types';

export function optionIndex(survey: Survey, question: SurveyQuestion, value: unknown): number {
  if (typeof value !== 'string' || !question.options) return -1;
  const direct = question.options.indexOf(value);
  if (direct >= 0) return direct;
  for (const translation of Object.values(survey.translations || {})) {
    const options = translation.questions?.[question.id]?.options;
    if (Array.isArray(options) && options.length === question.options.length) {
      const index = options.indexOf(value);
      if (index >= 0) return index;
    }
  }
  return -1;
}

export function optionMatches(survey: Survey, question: SurveyQuestion, left: unknown, right: string) {
  const index = optionIndex(survey, question, left);
  return index >= 0 && index === optionIndex(survey, question, right);
}

export function maximumSelections(question: SurveyQuestion): number | undefined {
  const match = /m[aá]ximo\s+(\d+)/i.exec(question.text);
  return match ? Number(match[1]) : undefined;
}

function isExclusive(question: SurveyQuestion, index: number) {
  return index >= 0 && /^ningun[ao]s?(?:\b|\.)/i.test(question.options?.[index] || '');
}

// Operates only on an unsaved form. Never rewrites historical answers.
export function toggleChoices(survey: Survey, question: SurveyQuestion, current: string[], option: string): string[] {
  const chosen = optionIndex(survey, question, option);
  if (chosen < 0) return current;
  if (current.some(value => optionMatches(survey, question, value, option))) {
    return current.filter(value => !optionMatches(survey, question, value, option));
  }
  if (isExclusive(question, chosen)) return [option];
  const next = current.filter(value => !isExclusive(question, optionIndex(survey, question, value)));
  const maximum = maximumSelections(question);
  if (maximum !== undefined && next.length >= maximum) throw new Error(`Puedes seleccionar como máximo ${maximum} opciones.`);
  return [...next, option];
}

export function answerError(survey: Survey, question: SurveyQuestion, value: unknown): string | null {
  const empty = value === undefined || value === null ||
    (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0);
  if (empty) return question.required ? 'Completa esta pregunta obligatoria.' : null;
  if (question.type === 'text') return typeof value === 'string' ? null : 'Escribe una respuesta de texto.';
  if (question.type === 'rating') return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 10 ? null : 'Elige un puntaje entre 1 y 10.';
  if (question.type === 'boolean') return value === 'Sí' || value === 'No' ? null : 'Elige Sí o No.';
  if (question.type === 'single_choice') {
    const index = optionIndex(survey, question, value);
    if (index < 0) return 'Selecciona una de las opciones disponibles.';
    if (/aceptas? participar|acepta participar|(?:aceptaci[oó]n|consentimiento) (?:de |para |a )?(?:participar|participaci[oó]n)/i.test(question.text)) {
      const acceptance = question.options?.findIndex(option => /^acepto\b|^s[ií](?:\b|,)/i.test(option)) ?? -1;
      if (acceptance >= 0 && index !== acceptance) return 'No aceptaste participar. Puedes cerrar la encuesta; no se enviaron respuestas.';
    }
    return null;
  }
  if (question.type === 'multiple_choice') {
    if (!Array.isArray(value)) return 'Selecciona opciones de la lista.';
    const indexes = value.map(item => optionIndex(survey, question, item));
    if (indexes.some(index => index < 0) || new Set(indexes).size !== indexes.length) return 'Hay opciones inválidas o repetidas.';
    const maximum = maximumSelections(question);
    if (maximum !== undefined && indexes.length > maximum) return `Selecciona como máximo ${maximum} opciones.`;
    if (indexes.length > 1 && indexes.some(index => isExclusive(question, index))) return 'Ninguna no puede combinarse con otras opciones.';
  }
  return null;
}

export function translationCoverage(survey: Pick<Survey, 'questions'>, translation?: TranslationData) {
  const valid = survey.questions.filter(question => {
    const item = translation?.questions?.[question.id];
    return typeof item?.text === 'string' && item.text.trim() !== '' &&
      (!question.options?.length || (Array.isArray(item.options) && item.options.length === question.options.length &&
        item.options.every(option => typeof option === 'string' && option.trim() !== '') &&
        new Set(item.options).size === item.options.length));
  }).length;
  return { translated: valid, total: survey.questions.length, complete: survey.questions.length > 0 && valid === survey.questions.length };
}
