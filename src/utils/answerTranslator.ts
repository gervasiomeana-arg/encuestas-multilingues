import { Survey, SurveyQuestion, SurveyResponse } from '../types';

/**
 * Common cross-language translations fallback dictionary for standard responses
 * in international humanitarian and human rights surveys (Arabic, French, English -> Spanish)
 */
const GLOBAL_TRANSLATIONS_FALLBACK: Record<string, string> = {
  // Saharawi Camps & Territories (Hassaniya / Arabic / English / French)
  'الجمهورية الصحراوية (المخيمات)': 'RASD (Campamentos)',
  'الأراضي المحتلة (الصحراء الغربية المحتلة)': 'TTOO (Sáhara Occidental Ocupado)',
  'sadr (camps)': 'RASD (Campamentos)',
  'occupied territories (occupied western sahara)': 'TTOO (Sáhara Occidental Ocupado)',
  'camps de réfugiés': 'RASD (Campamentos)',
  'territoires occupés': 'TTOO (Sáhara Occidental Ocupado)',

  // Organizations & Participation
  'نعم، في الاتحاد الوطني للمرأة الصحراوية': 'Sí, en la UNMS (Unión Nacional de Mujeres Saharauis)',
  'نعم، في منظمة أخرى': 'Sí, en otra organización',
  'لا أشارك': 'No participo',
  'no, i do not participate': 'No participo',
  'non, je ne participe pas': 'No participo',

  // Common options
  'does not apply': 'No aplica',
  'ne s\'applique pas': 'No aplica',
  'لا ينطبق': 'No aplica',
  'none of the above.': 'Ninguna de las anteriores.',
  'none of the above': 'Ninguna de las anteriores.',
  'aucune de ces réponses': 'Ninguna de las anteriores.',
  'لا شيء مما سبق': 'Ninguna de las anteriores.',
  'other': 'Otro',
  'autre': 'Otro',
  'آخر': 'Otro',
  'أخرى': 'Otra',
  'none': 'Ninguna',
  'aucun': 'Ninguno',
  'aucune': 'Ninguna',
  'لا أحد': 'Ninguno',
  'لا شيء': 'Ninguno',
  'sometimes': 'A veces',
  'parfois': 'A veces',
  'أحياناً': 'A veces',
  'أحيانا': 'A veces',
  'always': 'Siempre',
  'toujours': 'Siempre',
  'دائماً': 'Siempre',
  'دائما': 'Siempre',
  'never': 'Nunca',
  'jamais': 'Nunca',
  'أبداً': 'Nunca',
  'أبدا': 'Nunca',
  'i prefer not to answer': 'Prefiero no responder',
  'je préfère ne pas répondre': 'Prefiero no responder',
  'أفضل عدم الإجابة': 'Prefiero no responder',
  'i do not know / i do not remember': 'No sé / No recuerdo',
  'je ne sais pas / je ne me souviens pas': 'No sé / No recuerdo',
  'لا أعلم / لا أتذكر': 'No sé / No recuerdo',
  'between 10 and 20 years': 'Entre 10 y 20 años',
  'labor exploitation': 'Explotación laboral',
  'no housing': 'Sin vivienda',
  'no, i have never worked': 'No, nunca he trabajado',
  'yes, some': 'Sí, algunas',
  'no, i have always lived in the same place.': 'No, siempre he vivido en el mismo lugar.',
  'my family has always lived in the camps (does not apply)': 'Mi familia siempre ha vivido en los campamentos (no aplica)',
  'no, because i do not trust that justice will be done': 'No, porque no confío en que se haga justicia',
  'i agree to voluntarily participate and for my responses to be used for human rights reports': 'Acepto participar de forma voluntaria y que mis respuestas se utilicen para informes de DDHH',

  // Numbers & ranges
  'más de 5': 'Más de 5',
  'أكثر من 5': 'Más de 5',
  'more than 5': 'Más de 5',
  'plus de 5': 'Más de 5',
  'más de 50': 'Más de 50',
  'أكثر من 50': 'Más de 50',
  '25-18': '18-25',
  '35-26': '26-35',
  '50-36': '36-50',
  '2-1': '1-2',
  '5-3': '3-5'
};

/**
 * Normalizes a single value (string, boolean, number) into pure Spanish
 * matching the question's Spanish options or canonical Spanish wording.
 */
export function normalizeSingleValue(
  val: any, 
  question: SurveyQuestion, 
  survey?: Survey
): string {
  if (val === undefined || val === null) return '';
  const rawStr = String(val).trim();
  if (!rawStr) return '';
  const lower = rawStr.toLowerCase();

  // 1. Boolean questions
  if (question.type === 'boolean') {
    const affirmative = ['sí', 'si', 'yes', 'oui', 'true', '1', 'نعم', 'verdadero', 'correct', 'vrai', 'صح'];
    const negative = ['no', 'non', 'false', '0', 'لا', 'falso', 'incorrect', 'faux', 'خطأ'];
    if (affirmative.includes(lower)) return 'Sí';
    if (negative.includes(lower)) return 'No';
    return rawStr;
  }

  // 2. Choice questions with predefined options in Spanish
  if (question.options && question.options.length > 0) {
    // 2a. Direct match with a Spanish option (exact or case-insensitive)
    const directMatch = question.options.find(
      opt => opt.trim().toLowerCase() === lower
    );
    if (directMatch) return directMatch;

    // 2b. Match against survey translation indexes (Arabic / Hassaniya / French / English)
    if (survey?.translations) {
      for (const langCode of Object.keys(survey.translations)) {
        const transOpts = survey.translations[langCode]?.questions?.[question.id]?.options;
        if (transOpts && Array.isArray(transOpts)) {
          const matchIndex = transOpts.findIndex(
            to => to && to.trim().toLowerCase() === lower
          );
          if (matchIndex !== -1 && question.options[matchIndex]) {
            return question.options[matchIndex];
          }
        }
      }
    }

    // 2c. Match against Global Fallback translations dictionary
    if (GLOBAL_TRANSLATIONS_FALLBACK[lower]) {
      const fallbackTarget = GLOBAL_TRANSLATIONS_FALLBACK[lower];
      // If the target is one of the question's options, return the canonical option
      const matchingOpt = question.options.find(
        opt => opt.trim().toLowerCase() === fallbackTarget.toLowerCase()
      );
      if (matchingOpt) return matchingOpt;
      return fallbackTarget;
    }

    // 2d. Substring/fuzzy check: if a Spanish option contains or is contained
    const partialMatch = question.options.find(opt => {
      const optL = opt.toLowerCase();
      return (optL.length > 6 && lower.includes(optL)) || (lower.length > 6 && optL.includes(lower));
    });
    if (partialMatch) return partialMatch;
  }

  // 3. Fallback dictionary check for general terms outside options
  if (GLOBAL_TRANSLATIONS_FALLBACK[lower]) {
    return GLOBAL_TRANSLATIONS_FALLBACK[lower];
  }

  return rawStr;
}

/**
 * Normalizes any answer (string, array of strings, boolean, number) into pure Spanish
 */
export function normalizeAnswerToSpanish(
  rawAnswer: any, 
  question: SurveyQuestion, 
  survey?: Survey
): string | string[] {
  if (rawAnswer === undefined || rawAnswer === null) return '';

  if (Array.isArray(rawAnswer)) {
    return rawAnswer.map(item => normalizeSingleValue(item, question, survey));
  }

  return normalizeSingleValue(rawAnswer, question, survey);
}

/**
 * Returns a human-friendly Spanish title for question types
 */
export function getQuestionTypeLabelES(type: string): string {
  switch (type) {
    case 'single_choice':
      return 'Opción Única';
    case 'multiple_choice':
      return 'Opción Múltiple';
    case 'boolean':
      return 'Sí / No';
    case 'rating':
      return 'Valoración (1 al 10)';
    case 'text':
      return 'Respuesta Abierta';
    default:
      return type;
  }
}

export interface LocalityItem {
  id: string;
  name: string;
  count: number;
}

/**
 * Detects the location question in a survey (e.g. Lugar de residencia) and compiles
 * the available locality options and their response counts.
 */
export function getSurveyLocalities(
  survey?: Survey, 
  responses: SurveyResponse[] = []
): { question?: SurveyQuestion; localities: LocalityItem[] } {
  if (!survey || !survey.questions) {
    return { localities: [{ id: 'ALL', name: 'Todas las localidades', count: responses.length }] };
  }

  // Find the primary question determining location/residence
  const locationQuestion = survey.questions.find(q => {
    if (q.id === 'r3') return true;
    const textLower = q.text.toLowerCase();
    const hasOptions = q.options && q.options.length > 0;
    const isLocationKeyword = 
      textLower.includes('lugar de residencia') ||
      textLower.includes('residencia') ||
      textLower.includes('dónde se refugió') ||
      textLower.includes('país de origen') ||
      textLower.includes('localidad');
    return hasOptions && isLocationKeyword;
  });

  const localities: LocalityItem[] = [
    { id: 'ALL', name: 'Todas las localidades / Todo el país', count: responses.length }
  ];

  if (locationQuestion && locationQuestion.options) {
    const countsMap: Record<string, number> = {};
    locationQuestion.options.forEach(opt => { countsMap[opt] = 0; });

    responses.forEach(res => {
      const rawAns = res.answers[locationQuestion.id];
      if (rawAns === undefined || rawAns === null) return;
      const normalized = normalizeAnswerToSpanish(rawAns, locationQuestion, survey);
      const items = Array.isArray(normalized) ? normalized : [normalized];
      items.forEach(it => {
        if (typeof it === 'string' && it.trim()) {
          countsMap[it] = (countsMap[it] || 0) + 1;
        }
      });
    });

    Object.keys(countsMap).forEach(locName => {
      localities.push({
        id: locName,
        name: locName,
        count: countsMap[locName]
      });
    });
  }

  return { question: locationQuestion, localities };
}
