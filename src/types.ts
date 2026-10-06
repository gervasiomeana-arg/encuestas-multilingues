export type QuestionType = 'text' | 'rating' | 'multiple_choice' | 'single_choice' | 'boolean';

export interface SurveyQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[]; // Used for multiple_choice and single_choice
  required: boolean;
}

export interface TranslationData {
  title: string;
  description: string;
  questions: {
    [questionId: string]: {
      text: string;
      options?: string[];
    };
  };
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
  targetCountry: string;
  targetLanguage: string; // The official language of that country, e.g., "pt", "fr", "ja"
  translations: {
    [langCode: string]: TranslationData; // Translations indexable by language code (e.g., "en", "es", "pt", "fr", "ja", "it", etc.)
  };
  createdAt: string;
  createdBy: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  userName: string;
  userLanguage: string; // The language the user filled this survey in
  userCountry?: string; // The country of the user filling the survey
  answers: {
    [questionId: string]: string | number | string[]; // Answer value
  };
  submittedAt: string;
}

export interface CountryInfo {
  name: string;
  code: string;
  nativeLanguage: {
    code: string;
    name: string;
  };
}

export const COUNTRIES: CountryInfo[] = [
  { name: 'Argentina', code: 'AR', nativeLanguage: { code: 'es', name: 'Español' } },
  { name: 'Brasil', code: 'BR', nativeLanguage: { code: 'pt', name: 'Português' } },
  { name: 'Estados Unidos', code: 'US', nativeLanguage: { code: 'en', name: 'English' } },
  { name: 'Francia', code: 'FR', nativeLanguage: { code: 'fr', name: 'Français' } },
  { name: 'Japón', code: 'JP', nativeLanguage: { code: 'ja', name: '日本語' } },
  { name: 'Alemania', code: 'DE', nativeLanguage: { code: 'de', name: 'Deutsch' } },
  { name: 'Italia', code: 'IT', nativeLanguage: { code: 'it', name: 'Italiano' } },
  { name: 'China', code: 'CN', nativeLanguage: { code: 'zh', name: '简体中文' } },
  { name: 'Portugal', code: 'PT', nativeLanguage: { code: 'pt', name: 'Português' } },
  { name: 'Reino Unido', code: 'GB', nativeLanguage: { code: 'en', name: 'English' } },
  { name: 'España', code: 'ES', nativeLanguage: { code: 'es', name: 'Español' } },
  { name: 'Mauritania', code: 'MR', nativeLanguage: { code: 'haa', name: 'Hassanía' } },
  { name: 'Senegal', code: 'SN', nativeLanguage: { code: 'fr', name: 'Français' } }
];

export const AVAILABLE_LANGUAGES = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Português' },
  { code: 'fr', name: 'Français' },
  { code: 'ja', name: '日本語' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'zh', name: '简体中文' },
  { code: 'haa', name: 'Hassanía' }
];
