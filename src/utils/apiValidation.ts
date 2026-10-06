import type { SurveyQuestion } from '../types';

export function validQuestions(questions: unknown): questions is SurveyQuestion[] {
  if (!Array.isArray(questions) || questions.length === 0 || questions.length > 250) return false;
  const ids = new Set<string>();
  for (const question of questions) {
    if (!question || typeof question.id !== 'string' || !question.id || question.id.length > 200 || ids.has(question.id) ||
      typeof question.text !== 'string' || !question.text.trim() || question.text.length > 5000 ||
      !['text', 'rating', 'boolean', 'single_choice', 'multiple_choice'].includes(question.type) ||
      typeof question.required !== 'boolean') return false;
    if (question.options !== undefined && (!Array.isArray(question.options) || question.options.length > 100 ||
      question.options.some((option: unknown) => typeof option !== 'string' || !option.trim() || option.length > 5000) ||
      new Set(question.options).size !== question.options.length)) return false;
    if (['single_choice', 'multiple_choice'].includes(question.type) && !question.options?.length) return false;
    ids.add(question.id);
  }
  return true;
}

export function validSurveyDraft(survey: any): boolean {
  return !!(survey && typeof survey.title === 'string' && survey.title.trim() !== '' && survey.title.length <= 1000 &&
    typeof survey.description === 'string' && survey.description.length <= 10_000 && validQuestions(survey.questions));
}

export function validTranslationRequest(survey: any, code: unknown, name: unknown): boolean {
  return validSurveyDraft(survey) && typeof code === 'string' &&
    ['es', 'en', 'pt', 'fr', 'ja', 'de', 'it', 'zh', 'haa'].includes(code) &&
    typeof name === 'string' && name.length > 0 && name.length <= 80 &&
    JSON.stringify(survey).length <= 200_000;
}
