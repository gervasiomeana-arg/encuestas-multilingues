import type { Survey, SurveyResponse } from '../types';
import { canonical, DualRepository, type StoredRecord } from './dualDatabase';
import { optionIndex } from './surveyValidation';
import { OCCUPIED_TERRITORIES_SURVEY } from './occupiedTerritoriesSurvey';

export const OCCUPIED_TERRITORIES_ID = OCCUPIED_TERRITORIES_SURVEY.id;

export function isOccupiedTerritoriesTitle(title: string): boolean {
  const normalized = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return /territori/.test(normalized) && /ocupad/.test(normalized) && /sahar/.test(normalized);
}

// Called only by the administrator's explicit add action. No response collection is read or written.
export async function addOccupiedTerritories(repository: DualRepository): Promise<number> {
  const surveys = await repository.list('surveys');
  if (repository.warnings.has('surveys')) throw new Error('No se pudieron comprobar todas las encuestas. Reintenta; no se creó ningún duplicado.');
  const definition = OCCUPIED_TERRITORIES_SURVEY as unknown as StoredRecord;
  const existing = surveys.find(survey => survey.id === definition.id);
  if (existing) {
    if (canonical(existing) !== canonical(definition)) throw new Error('Este ID ya tiene otra definición. No se reemplazó la encuesta ni sus respuestas.');
    return 0;
  }
  if (surveys.some(survey => typeof survey.title === 'string' && isOccupiedTerritoriesTitle(survey.title))) {
    throw new Error('Ya existe una encuesta de Territorios Ocupados del Sáhara. Revisa la existente; no se creó un duplicado.');
  }
  try {
    return await repository.create('surveys', [structuredClone(definition)]);
  } catch (error) {
    // Concurrent administrators may add the same definition; the writer never overwrites it.
    const current = await repository.list('surveys');
    if (!repository.warnings.has('surveys') && current.some(survey => survey.id === definition.id && canonical(survey) === canonical(definition))) return 0;
    throw error;
  }
}

// Canonical Spanish choice values allow reports to work even when a translation was session-only.
// Text is retained verbatim. Existing surveys and their answer format are untouched.
export function occupiedTerritoriesAnswers(survey: Survey, answers: SurveyResponse['answers']): SurveyResponse['answers'] {
  if (survey.id !== OCCUPIED_TERRITORIES_ID) return answers;
  const consent = survey.questions.find(question => question.id === 'to_consent')!;
  if (optionIndex(survey, consent, answers.to_consent) !== 0) {
    throw new Error('Para enviar debes aceptar participar. Si no aceptas, puedes cerrar la encuesta; no se enviaron respuestas.');
  }
  if (!survey.questions.some(question => {
    const value = answers[question.id];
    return !['to_consent', 'to_date'].includes(question.id) && value !== undefined && value !== '' &&
      (!Array.isArray(value) || value.length > 0);
  })) {
    throw new Error('Responde al menos una pregunta del cuestionario. Puedes dejar las demás sin responder.');
  }
  return Object.fromEntries(Object.entries(answers).map(([id, value]) => {
    const question = survey.questions.find(question => question.id === id);
    if (!question) throw new Error('Hay una pregunta no reconocida. No se guardó la respuesta.');
    if (!question.options) return [id, value];
    const original = (option: unknown) => {
      const index = optionIndex(survey, question, option);
      if (index < 0) throw new Error('Hay una opción no reconocida. Revisa la respuesta antes de enviar.');
      return question.options![index];
    };
    return [id, Array.isArray(value) ? value.map(original) : original(value)];
  }));
}
