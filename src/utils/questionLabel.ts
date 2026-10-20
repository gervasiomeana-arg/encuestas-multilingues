import type { SurveyQuestion } from '../types';

export function questionLabel(question: SurveyQuestion, index: number): string {
  if (!question.displayNumber) return `P${index + 1}`;
  return /^\d/.test(question.displayNumber) ? `P${question.displayNumber}` : question.displayNumber;
}
