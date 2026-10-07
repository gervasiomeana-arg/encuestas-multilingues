import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  User, 
  ArrowRight, 
  ArrowLeft,
  Check,
  CheckCircle, 
  Loader2, 
  HelpCircle, 
  Sparkles, 
  AlertCircle, 
  CornerDownRight, 
  RefreshCw,
  Info,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Survey, SurveyResponse, AVAILABLE_LANGUAGES, COUNTRIES } from '../types';
import { saveResponse } from '../firebaseService';
import { translateSurveyWithAI } from '../utils/api';
import { answerError, isQuestionRequired, optionMatches, toggleChoices, translationCoverage } from '../utils/surveyValidation';

interface UserDashboardProps {
  surveys: Survey[];
  onActiveStateChange?: (isAnsweringAndAccepted: boolean) => void;
}

export default function UserDashboard({ surveys, onActiveStateChange }: UserDashboardProps) {
  // State for user tracking (Preset to anonymous / Mauritania per request)
  const [userName, setUserName] = useState<string>('Anónimo');
  const [userLang, setUserLang] = useState<string>('es'); // Default browser language code
  const [userCountry, setUserCountry] = useState<string>('Mauritania');

  // Active survey being completed
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, any>>({});
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submissionInFlight = useRef(false);
  
  // Translation on-the-fly state
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [sessionSurveys, setSessionSurveys] = useState<Record<string, Survey>>({});

  // Form error notification
  const [formError, setFormError] = useState<string | null>(null);

  // Stepper state for Survio format
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (onActiveStateChange) {
      const isAnswering = activeSurvey 
        ? (activeSurvey.id === 'survey_mauritania_dos' ? currentStep > 0 : true)
        : false;
      onActiveStateChange(isAnswering);
    }
  }, [activeSurvey, currentStep, onActiveStateChange]);

  // Auto-select when only one survey is loaded (i.e. shared directly via unique link)
  useEffect(() => {
    if (surveys.length === 1 && !activeSurvey && !submittedSuccess) {
      handleSelectSurvey(surveys[0]);
    }
  }, [surveys, activeSurvey, submittedSuccess]);

  // Helper to identify block format of question
  const getBlockIndex = (q: any): number => {
    const text = q.text || '';
    if (text.includes('BLOQUE 1.') || text.includes('BLOQUE 1:') || text.includes('BLOC 1:') || text.includes('BLOC 1.')) return 1;
    if (text.includes('BLOQUE 2.') || text.includes('BLOQUE 2:') || text.includes('BLOC 2:') || text.includes('BLOC 2.')) return 2;
    if (text.includes('BLOQUE 3.') || text.includes('BLOQUE 3:') || text.includes('BLOC 3:') || text.includes('BLOC 3.')) return 3;
    if (text.includes('BLOQUE 4.') || text.includes('BLOQUE 4:') || text.includes('BLOC 4:') || text.includes('BLOC 4.')) return 4;
    if (text.includes('BLOQUE 5.') || text.includes('BLOQUE 5:') || text.includes('BLOC 5:') || text.includes('BLOC 5.')) return 5;
    if (text.includes('BLOQUE 6.') || text.includes('BLOQUE 6:') || text.includes('BLOC 6:') || text.includes('BLOC 6.')) return 6;
    if (text.includes('BLOQUE 7.') || text.includes('BLOQUE 7:') || text.includes('BLOC 7:') || text.includes('BLOC 7.')) return 7;
    if (text.includes('BLOQUE 8.') || text.includes('BLOQUE 8:') || text.includes('BLOC 8:') || text.includes('BLOC 8.')) return 8;
    return 0; // Consentimiento
  };

  const getBlockTitle = (step: number, lang: string): string => {
    const titlesSpan: Record<number, string> = {
      0: 'ACUERDO DE PARTICIPACIÓN VOLUNTARIA',
      1: 'BLOQUE 1: PERFIL DEMOGRÁFICO',
      2: 'BLOQUE 2: SALIDA DE PAÍS DE ORIGEN',
      3: 'BLOQUE 3: TRÁNSITO MIGRATORIO',
      4: 'BLOQUE 4: SITUACIÓN ACTUAL EN MAURITANIA',
      5: 'BLOQUE 5: ACCESO A DERECHOS BÁSICOS',
      6: 'BLOQUE 6: DISCRIMINACIÓN Y PARTICIPACIÓN COMUNITARIA',
      7: 'BLOQUE 7: BIENESTAR PSICOSOCIAL',
      8: 'BLOQUE 8: PREGUNTAS DE GÉNERO'
    };

    const titlesFr: Record<number, string> = {
      0: 'CONSENTEMENT DE PARTICIPATION',
      1: 'BLOC 1: PROFIL DÉMOGRAPHIQUE',
      2: 'BLOC 2: DÉPART DU PAYS D\'ORIGINE',
      3: 'BLOC 3: TRANSIT MIGRATOIRE',
      4: 'BLOC 4: SITUATION ACTUELLE EN MAURITANIE',
      5: 'BLOC 5: ACCÈS AUX DROITS FONDAMENTAUX',
      6: 'BLOC 6: DISCRIMINATION ET PARTICIPATION',
      7: 'BLOC 7: BIENÊTRE PSYCHOSOCIAL',
      8: 'BLOC 8: VIOLENCE SEXUELLE ET DE GENRE'
    };

    const titlesHaa: Record<number, string> = {
      0: 'الموافقة الطوعية للمشاركة',
      1: 'القسم 1: الملف الشخصي والديموغرافي',
      2: 'القسم 2: الخروج من بلد المنشأ',
      3: 'القسم 3: العبور والهجرة',
      4: 'القسم 4: الوضع الحالي في موريتانيا',
      5: 'القسم 5: الوصول إلى الحقوق الأساسية',
      6: 'القسم 6: التمييز والمشاركة المجتمعية',
      7: 'القسم 7: الرفاه النفسي والاجتماعي',
      8: 'القسم 8: أسئلة النوع والنوع الاجتماعي'
    };

    const titlesEn: Record<number, string> = {
      0: 'VOLUNTARY PARTICIPATION CONSENT',
      1: 'BLOCK 1: DEMOGRAPHIC PROFILE',
      2: 'BLOCK 2: DEPARTURE FROM COUNTRY OF ORIGIN',
      3: 'BLOCK 3: MIGRATORY TRANSIT ROUTE',
      4: 'BLOCK 4: CURRENT SITUATION IN MAURITANIA',
      5: 'BLOCK 5: ACCESS TO BASIC ESSENTIAL RIGHTS',
      6: 'BLOCK 6: DISCRIMINATION & SOCIAL PARTICIPATION',
      7: 'BLOCK 7: PSYCHOSOCIAL WELLBEING',
      8: 'BLOCK 8: GENDER-BASED TOPICS'
    };

    if (lang === 'haa') return titlesHaa[step] || titlesSpan[step];
    if (lang === 'fr') return titlesFr[step] || titlesSpan[step];
    if (lang === 'en') return titlesEn[step] || titlesSpan[step];
    return titlesSpan[step];
  };

  const cleanQuestionText = (text: string): string => {
    if (!text) return '';
    if (/^(BLOQUE|BLOC|القسم)\s*\d+/i.test(text) && text.includes(':')) {
      const parts = text.split(':');
      return parts.slice(1).join(':').trim();
    }
    if (text.includes(' - ')) {
      const parts = text.split(' - ');
      const firstPart = parts[0].toLowerCase();
      if (
        firstPart.includes('bloque') ||
        firstPart.includes('bloc') ||
        firstPart.includes('salud') ||
        firstPart.includes('educación') ||
        firstPart.includes('educacion') ||
        firstPart.includes('vivienda') ||
        firstPart.includes('القسم')
      ) {
        return parts.slice(1).join(' - ').trim();
      }
    }
    return text;
  };

  // User name and country are not tracked individually now, only language preference is set.

  // Handle on-the-fly Gemini Translation for surveys that aren't pre-translated
  const handleDynamicTranslation = async (survey: Survey, destLangCode: string) => {
    const destLangName = AVAILABLE_LANGUAGES.find(l => l.code === destLangCode)?.name || destLangCode;
    setTranslatingId(survey.id);
    setTranslateError(null);

    try {
      const response = await translateSurveyWithAI(survey, destLangCode, destLangName);
      if (response.success && response.translation) {
        if (!translationCoverage(survey, response.translation).complete) throw new Error("La traducción está incompleta. No se modificó la encuesta; vuelve a intentar.");
        // Append a translation only in this session, after checking complete coverage
        const updatedSurvey: Survey = {
          ...survey,
          translations: {
            ...survey.translations,
            [destLangCode]: response.translation
          }
        };

        setSessionSurveys(previous => ({ ...previous, [survey.id]: {
          ...updatedSurvey,
          translations: { ...survey.translations, ...previous[survey.id]?.translations, [destLangCode]: response.translation! }
        }}));
        setActiveSurvey(previous => previous?.id === survey.id ? {
          ...previous, translations: { ...previous.translations, [destLangCode]: response.translation! }
        } : previous);
      } else {
        setTranslateError(response.error || "La traducción automática no se pudo completar.");
      }
    } catch (err: any) {
      setTranslateError(err.message || "Error al conectar con la pasarela de traducción.");
    } finally {
      setTranslatingId(null);
    }
  };

  // Switch Active survey to start answering
  const handleSelectSurvey = (survey: Survey) => {
    setFormError(null);
    setActiveSurvey(sessionSurveys[survey.id] || survey);
    setCurrentAnswers({});
    setSubmittedSuccess(false);
    setCurrentStep(0);
  };

  // Helper to extract localized text (falls back to original if selected language isn't available)
  const getLocalizedContent = (survey: Survey) => {
    survey = sessionSurveys[survey.id] || survey;
    const hasTranslation = survey.translations && survey.translations[userLang];
    const data = hasTranslation ? survey.translations[userLang] : {
      title: survey.title,
      description: survey.description,
      questions: {} as Record<string, { text: string; options?: string[] }>
    };

    return {
      title: data.title || survey.title,
      description: data.description || survey.description,
      isTranslated: userLang === 'es' || translationCoverage(survey, hasTranslation).complete,
      coverage: translationCoverage(survey, hasTranslation),
      getQuestionText: (qId: string, defaultText: string) => {
        if (hasTranslation && data.questions && data.questions[qId]) {
          return data.questions[qId].text || defaultText;
        }
        return defaultText;
      },
      getQuestionOptions: (qId: string, defaultOptions?: string[]) => {
        if (hasTranslation && data.questions && data.questions[qId] && data.questions[qId].options) {
          return data.questions[qId].options;
        }
        return defaultOptions;
      }
    };
  };

  // State answering helpers
  const handleSetAnswer = (qId: string, value: any) => {
    setCurrentAnswers(prev => ({
      ...prev,
      [qId]: value
    }));
  };

  const handleMultipleChoiceToggle = (qId: string, option: string) => {
    const question = activeSurvey?.questions.find(q => q.id === qId);
    if (!activeSurvey || !question) return;
    try {
      handleSetAnswer(qId, toggleChoices(activeSurvey, question, (currentAnswers[qId] as string[]) || [], option));
      setFormError(null);
    } catch (error) { setFormError((error as Error).message); }
  };

  // Multi-step validation for Survio format
  const validateStep = (stepIndex: number, survey: Survey, localized: any): boolean => {
    const stepQuestions = survey.questions.filter(q => getBlockIndex(q) === stepIndex);
    const missing: string[] = [];

    stepQuestions.forEach(q => {
      const error = answerError(survey, q, currentAnswers[q.id]);
      if (error) missing.push(`${cleanQuestionText(localized.getQuestionText(q.id, q.text))}: ${error}`);
    });

    if (missing.length > 0) {
      setFormError(`Por favor completa las siguientes preguntas obligatorias en este bloque:\n- ${missing.join('\n- ')}`);
      // Scroll smoothly to form error banner
      const canvasEl = document.getElementById('answering-survey-canvas');
      if (canvasEl) {
        canvasEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 300, behavior: 'smooth' });
      }
      return false;
    }

    setFormError(null);
    return true;
  };

  // Submit survey responses to Firestore
  const handleSubmitSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSurvey || submissionInFlight.current || submittedSuccess) return;

    const localized = getLocalizedContent(activeSurvey);

    // If survey is Mauritania Survey II (Survio Style), run block-by-block validations
    if (activeSurvey.id === 'survey_mauritania_dos') {
      for (let s = 0; s <= 8; s++) {
        if (!validateStep(s, activeSurvey, localized)) {
          setCurrentStep(s);
          return;
        }
      }
    } else {
      // Standard full form validation for original format
      const missingFields: string[] = [];
      activeSurvey.questions.forEach(q => {
        const error = answerError(activeSurvey, q, currentAnswers[q.id]);
        if (error) missingFields.push(`${localized.getQuestionText(q.id, q.text)}: ${error}`);
      });

      if (missingFields.length > 0) {
        setFormError(`Por favor completa las siguientes preguntas obligatorias:\n- ${missingFields.join('\n- ')}`);
        window.scrollTo({ top: 300, behavior: 'smooth' });
        return;
      }
    }

    setFormError(null);
    submissionInFlight.current = true;
    setSubmitting(true);

    try {
      const newResponse: SurveyResponse = {
        id: `resp_${crypto.randomUUID()}`,
        surveyId: activeSurvey.id,
        userName: userName.trim(),
        userLanguage: userLang,
        ...(activeSurvey.targetCountry ? { userCountry: activeSurvey.targetCountry } : {}),
        answers: currentAnswers,
        submittedAt: new Date().toISOString()
      };

      await saveResponse(newResponse);
      setSubmittedSuccess(true);
    } catch (err: any) {
      setFormError("Ocurrió un error al intentar enviar tu encuesta a la base de datos.");
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8" id="user-dashboard-wrapper">
      
      {/* SECTION 1: SYSTEM LANGUAGE */}
      {!submittedSuccess && (
        <section className="bg-white p-6 rounded-2xl border border-slate-205 shadow-xs max-w-xl mx-auto" id="user-profile-card">
          <h2 className="text-base font-bold font-display text-slate-800 mb-2 flex items-center justify-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600 animate-pulse" />
            <span>Idioma de la Encuesta / Choose Language</span>
          </h2>
          <p className="text-slate-500 text-xs text-center mb-4">
            Selecciona tu idioma para responder la encuesta / Select your language for the survey
          </p>
          <div className="relative max-w-xs mx-auto">
            <select
              disabled={submitting}
              value={userLang}
              onChange={(e) => {
                setUserLang(e.target.value);
                setFormError(null);
              }}
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all text-sm font-semibold text-slate-700 bg-slate-50/50 appearance-none cursor-pointer text-center"
            >
              {AVAILABLE_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
            <span className="absolute left-3.5 top-3.5 text-slate-400">
              <Globe className="w-4 h-4" />
            </span>
          </div>
        </section>
      )}

      {activeSurvey && (() => {
        const content = getLocalizedContent(activeSurvey);
        return !content.isTranslated && <div role="status" className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
          Traducción disponible: {content.coverage.translated} de {content.coverage.total} preguntas. Las restantes aparecen en el idioma original.
          <button type="button" onClick={() => handleDynamicTranslation(activeSurvey, userLang)} disabled={translatingId === activeSurvey.id} className="ml-2 underline font-semibold">
            {translatingId === activeSurvey.id ? 'Traduciendo…' : 'Completar traducción de esta sesión'}
          </button>
        </div>;
      })()}
      {translateError && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{translateError}</div>}

      {/* Global general error banner */}
      {formError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start gap-3 shadow-xs animate-shake">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 font-medium whitespace-pre-line">{formError}</div>
        </div>
      )}

      {/* SECTION 2: VIEW OR FILL ACTIVE SURVEY */}
      {activeSurvey ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden card-transition" id="answering-survey-canvas" dir={userLang === 'haa' ? 'rtl' : 'ltr'}>
          
          {/* Active Survey Header */}
          {(() => {
            const tempLang = getLocalizedContent(activeSurvey);
            const countryDef = COUNTRIES.find(c => c.name === activeSurvey.targetCountry);
            const userLangName = AVAILABLE_LANGUAGES.find(l => l.code === userLang)?.name || userLang;

            return (
              <>
                {!(activeSurvey.id === 'survey_mauritania_dos' && currentStep > 0) && (
                  <div className="p-4 md:p-6 bg-indigo-950 text-white border-b border-indigo-900">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <span className="inline-block md:hidden bg-indigo-500/20 text-indigo-200 font-mono text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-md border border-indigo-400/20 mb-2">
                          🇵🇹 {activeSurvey.targetCountry}
                        </span>
                        <h2 className="text-lg md:text-2xl font-bold font-display tracking-tight text-white leading-snug">
                          {tempLang.title}
                        </h2>
                        <p className="text-slate-300 text-xs md:text-sm mt-1.5 max-w-2xl leading-relaxed">
                          {tempLang.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center md:items-end gap-2 shrink-0">
                        <span className="hidden md:inline-block bg-indigo-500/20 text-indigo-200 font-mono text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full border border-indigo-400/25">
                          País Destino: {activeSurvey.targetCountry}
                        </span>
                        {!tempLang.isTranslated ? (
                          <button
                            type="button"
                            onClick={() => handleDynamicTranslation(activeSurvey, userLang)}
                            disabled={translatingId === activeSurvey.id}
                            className="bg-purple-650 hover:bg-purple-700 text-purple-100 text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-xl border border-purple-400/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                          >
                            {translatingId === activeSurvey.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Traduciendo...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                                <span>Traducir al {userLangName}</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="bg-emerald-500/25 text-emerald-300 border border-emerald-400/20 font-mono text-[9px] md:text-[10px] uppercase font-bold tracking-widest px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            Idioma disponible
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                )}

                {/* Question Canvas Form */}
                <form onSubmit={handleSubmitSurvey} className="p-6 md:p-8 space-y-8">
                  <fieldset disabled={submitting} className="min-w-0">
                  {submittedSuccess ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-fadeIn">
                      <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-200 shadow-xs">
                        <CheckCircle className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800">GRACIAS POR PARTICIPAR EN NUESTRA ENCUESTA</h3>
                      
                      <div className="pt-4 flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSurvey(null);
                            setSubmittedSuccess(false);
                            setCurrentAnswers({});
                            setCurrentStep(0);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                        >
                          Volver a las encuestas
                        </button>
                      </div>
                    </div>
                  ) : activeSurvey.id === 'survey_mauritania_dos' ? (
                    /* SURVIO STYLE MULTI-PAGE STEPPER VIEW */
                    <div className="space-y-6">
                      {/* Progress bar and Step Map */}
                      {(() => {
                        const progressPercent = Math.min(100, Math.round((currentStep / 8) * 100));
                        const stepQuestions = activeSurvey.questions.filter(q => getBlockIndex(q) === currentStep);
                        return (
                          <>
                            <div className="mb-6 bg-slate-50 border border-slate-100 rounded-2xl p-4 md:p-5">
                              <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                                <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider font-mono">
                                  {getBlockTitle(currentStep, userLang)}
                                </span>
                                <span className="text-xs font-bold text-slate-500 font-mono">
                                  {progressPercent}% {userLang === 'haa' ? 'مكتمل' : userLang === 'fr' ? 'complété' : 'completado'} ({currentStep + 1} / 9)
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                              
                              {/* Step Bubbles Tracking Row */}
                              <div className="mt-4 flex justify-between items-center max-w-xl mx-auto gap-1">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
                                  const isDone = s < currentStep;
                                  const isActive = s === currentStep;
                                  return (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => {
                                        if (s < currentStep) {
                                          setCurrentStep(s);
                                          setFormError(null);
                                        } else if (s > currentStep) {
                                          if (validateStep(currentStep, activeSurvey, tempLang)) {
                                            let allValid = true;
                                            for (let check = currentStep; check < s; check++) {
                                              if (!validateStep(check, activeSurvey, tempLang)) {
                                                setCurrentStep(check);
                                                allValid = false;
                                                break;
                                              }
                                            }
                                            if (allValid) {
                                              setCurrentStep(s);
                                              setFormError(null);
                                            }
                                          }
                                        }
                                      }}
                                      className={`w-7 h-7 rounded-full text-[10px] font-bold font-mono transition-all flex items-center justify-center cursor-pointer ${
                                        isActive 
                                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-200' 
                                          : isDone 
                                          ? 'bg-emerald-500 text-white' 
                                          : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-300'
                                      }`}
                                    >
                                      {isDone ? <Check className="w-3.5 h-3.5" /> : s}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Actively Filtered step questions */}
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 15 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -15 }}
                                transition={{ duration: 0.25 }}
                                className="space-y-6"
                              >
                                {stepQuestions.map((q) => {
                                  // Locate the original absolute question position across all questions
                                  const originalIndex = activeSurvey.questions.findIndex(item => item.id === q.id);
                                  const localizedQuestionText = tempLang.getQuestionText(q.id, q.text);
                                  const localizedOptions = tempLang.getQuestionOptions(q.id, q.options);
                                  const currentVal = currentAnswers[q.id];

                                  return (
                                    <div key={q.id} className="p-6 md:p-8 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-indigo-150 transition-all space-y-4">
                                      <div className="flex justify-between items-start gap-3">
                                        <h4 className="text-sm font-semibold text-slate-800 flex items-start gap-2 leading-relaxed">
                                          <span className="text-slate-400 font-mono text-xs mt-0.5">{originalIndex + 1}.</span>
                                          <span className="text-slate-800">{cleanQuestionText(localizedQuestionText)}</span>
                                        </h4>
                                        {isQuestionRequired(activeSurvey, q) && (
                                          <span className="text-[10px] text-red-500 font-bold tracking-widest uppercase bg-red-50 border border-red-100 px-2 py-0.5 rounded-md shrink-0">
                                            Requerido
                                          </span>
                                        )}
                                      </div>

                                      {/* TEXT INPUT TYPE */}
                                      {q.type === 'text' && (
                                        <textarea
                                          placeholder="Escribe tu respuesta detallada aquí..."
                                          value={currentVal || ''}
                                          onChange={(e) => handleSetAnswer(q.id, e.target.value)}
                                          rows={4}
                                          className="w-full border border-slate-200 rounded-xl p-4 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-sm text-slate-700 bg-white"
                                        />
                                      )}

                                      {/* NUMERIC RATING TYPE */}
                                      {q.type === 'rating' && (
                                        <div className="space-y-2 mt-2">
                                          <div className="flex gap-2 justify-between max-w-lg flex-wrap">
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                              <button
                                                key={num}
                                                type="button"
                                                onClick={() => handleSetAnswer(q.id, num)}
                                                className={`w-11 h-11 rounded-full text-xs font-bold font-mono border transition-all flex items-center justify-center cursor-pointer ${
                                                  currentVal === num
                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md ring-4 ring-indigo-100 scale-105'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-indigo-300'
                                                }`}
                                              >
                                                {num}
                                              </button>
                                            ))}
                                          </div>
                                          <div className="flex justify-between max-w-lg text-[10px] text-slate-400 font-bold tracking-wider px-1 pt-1">
                                            <span>MUY BAJO</span>
                                            <span>MUY ALTO</span>
                                          </div>
                                        </div>
                                      )}

                                      {/* BOOLEAN TYPE */}
                                      {q.type === 'boolean' && (
                                        <div className="flex flex-col sm:flex-row gap-3">
                                          <button
                                            type="button"
                                            onClick={() => handleSetAnswer(q.id, 'Sí')}
                                            className={`flex-1 py-3.5 px-4 border rounded-xl text-center font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                                              currentVal === 'Sí'
                                                ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs ring-2 ring-emerald-100'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                            }`}
                                          >
                                            {currentVal === 'Sí' && <Check className="w-4 h-4 text-emerald-700" />}
                                            Sí / Verdadero
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleSetAnswer(q.id, 'No')}
                                            className={`flex-1 py-3.5 px-4 border rounded-xl text-center font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                                              currentVal === 'No'
                                                ? 'bg-rose-50 border-rose-400 text-rose-800 shadow-xs ring-2 ring-rose-100'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                            }`}
                                          >
                                            {currentVal === 'No' && <Check className="w-4 h-4 text-rose-700" />}
                                            No / Falso
                                          </button>
                                        </div>
                                      )}

                                      {/* SINGLE CHOICE TYPE */}
                                      {q.type === 'single_choice' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                                          {localizedOptions?.map((opt) => {
                                            const isSelected = optionMatches(activeSurvey, q, currentVal, opt);
                                            return (
                                              <button
                                                key={opt}
                                                aria-pressed={Array.isArray(currentVal) ? currentVal.some(value => optionMatches(activeSurvey, q, value, opt)) : optionMatches(activeSurvey, q, currentVal, opt)}
                                                type="button"
                                                onClick={() => handleSetAnswer(q.id, opt)}
                                                className={`py-3.5 px-5 rounded-2xl border text-left text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center justify-between group ${
                                                  isSelected
                                                    ? 'bg-indigo-50/75 border-indigo-400 text-indigo-900 shadow-xs'
                                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-350'
                                                }`}
                                              >
                                                <div className="flex items-center gap-3">
                                                  <span className={`w-5 h-5 rounded-full border shrink-0 flex items-center justify-center transition-all ${
                                                    isSelected 
                                                      ? 'border-indigo-600 bg-indigo-600' 
                                                      : 'border-slate-300 bg-white group-hover:border-slate-400'
                                                  }`}>
                                                    {isSelected && <span className="w-2 h-2 bg-white rounded-full"></span>}
                                                  </span>
                                                  <span>{opt}</span>
                                                </div>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {/* MULTIPLE CHOICE TYPE */}
                                      {q.type === 'multiple_choice' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                                          {localizedOptions?.map((opt) => {
                                            const isSelected = Array.isArray(currentVal) && currentVal.some(value => optionMatches(activeSurvey, q, value, opt));
                                            return (
                                              <button
                                                key={opt}
                                                aria-pressed={Array.isArray(currentVal) ? currentVal.some(value => optionMatches(activeSurvey, q, value, opt)) : optionMatches(activeSurvey, q, currentVal, opt)}
                                                type="button"
                                                onClick={() => handleMultipleChoiceToggle(q.id, opt)}
                                                className={`py-3.5 px-5 rounded-2xl border text-left text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center justify-between group ${
                                                  isSelected
                                                    ? 'bg-indigo-50/75 border-indigo-500 text-indigo-950 shadow-xs'
                                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-350'
                                                }`}
                                              >
                                                <div className="flex items-center gap-3">
                                                  <span className={`w-5 h-5 rounded-lg border shrink-0 flex items-center justify-center transition-all ${
                                                    isSelected 
                                                      ? 'border-indigo-600 bg-indigo-600 text-white font-bold' 
                                                      : 'border-slate-300 bg-white group-hover:border-slate-400'
                                                  }`}>
                                                    {isSelected && <Check className="w-3.5 h-3.5" />}
                                                  </span>
                                                  <span>{opt}</span>
                                                </div>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </motion.div>
                            </AnimatePresence>

                            {/* Stepper Navigation Buttons */}
                            <div className="flex justify-between items-center border-t border-slate-150 pt-6 mt-8">
                              <button
                                type="button"
                                onClick={() => {
                                  if (currentStep > 0) {
                                    setCurrentStep(currentStep - 1);
                                    setFormError(null);
                                    window.scrollTo({ top: 300, behavior: 'smooth' });
                                  } else {
                                    setActiveSurvey(null);
                                    setCurrentStep(0);
                                  }
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <ArrowLeft className="w-4 h-4" />
                                <span>{currentStep > 0 ? 'Atrás' : 'Cancelar y Volver'}</span>
                              </button>

                              <div className="flex items-center gap-3">
                                {currentStep < 8 ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (validateStep(currentStep, activeSurvey, tempLang)) {
                                        setCurrentStep(currentStep + 1);
                                        window.scrollTo({ top: 300, behavior: 'smooth' });
                                      }
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                  >
                                    <span>Siguiente Paso</span>
                                    <ArrowRight className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-100"
                                  >
                                    {submitting ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Enviando Encuesta...</span>
                                      </>
                                    ) : (
                                      <>
                                        <span>Enviar Encuesta Finalizada</span>
                                        <Check className="w-4 h-4" />
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    /* ORIGINAL FULL SCROLL FORM STYLE */
                    <>
                      <div className="space-y-6">
                        {activeSurvey.questions.map((q, index) => {
                          const localizedQuestionText = tempLang.getQuestionText(q.id, q.text);
                          const localizedOptions = tempLang.getQuestionOptions(q.id, q.options);
                          const currentVal = currentAnswers[q.id];

                          return (
                            <div key={q.id} className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-slate-200/80 transition-all space-y-3">
                              <div className="flex justify-between items-start">
                                <h4 className="text-sm font-semibold text-slate-800 flex items-start gap-2">
                                  <span className="text-slate-400 font-mono text-xs mt-0.5">{index + 1}.</span>
                                  <span>{localizedQuestionText}</span>
                                </h4>
                                {isQuestionRequired(activeSurvey, q) && (
                                  <span className="text-[10px] text-red-500 font-bold tracking-widest uppercase bg-red-50 border border-red-100 px-2 py-0.5 rounded-md">
                                    Requerido
                                  </span>
                                )}
                              </div>

                              {/* TEXT INPUT TYPE */}
                              {q.type === 'text' && (
                                <textarea
                                  placeholder="Escribe tu respuesta detallada aquí..."
                                  value={currentVal || ''}
                                  onChange={(e) => handleSetAnswer(q.id, e.target.value)}
                                  rows={3}
                                  className="w-full border border-slate-200 rounded-xl p-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm text-slate-700 bg-white"
                                />
                              )}

                              {/* NUMERIC RATING TYPE */}
                              {q.type === 'rating' && (
                                <div className="space-y-1.5">
                                  <div className="flex gap-2 justify-between max-w-md">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                      <button
                                        key={num}
                                        type="button"
                                        onClick={() => handleSetAnswer(q.id, num)}
                                        className={`w-10 h-10 rounded-full text-xs font-bold font-mono border transition-all flex items-center justify-center cursor-pointer ${
                                          currentVal === num
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                      >
                                        {num}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="flex justify-between max-w-md text-[10px] text-slate-400 font-bold tracking-wider px-1">
                                    <span>MUY BAJO</span>
                                    <span>MUY ALTO</span>
                                  </div>
                                </div>
                              )}

                              {/* BOOLEAN TYPE */}
                              {q.type === 'boolean' && (
                                <div className="flex gap-4">
                                  <button
                                    type="button"
                                    onClick={() => handleSetAnswer(q.id, 'Sí')}
                                    className={`flex-1 py-3 px-4 border rounded-xl text-center font-semibold text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                      currentVal === 'Sí'
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    Sí / Verdadero
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSetAnswer(q.id, 'No')}
                                    className={`flex-1 py-3 px-4 border rounded-xl text-center font-semibold text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                      currentVal === 'No'
                                        ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-xs'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    No / Falso
                                  </button>
                                </div>
                              )}

                              {/* SINGLE CHOICE TYPE */}
                              {q.type === 'single_choice' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                  {localizedOptions?.map((opt) => (
                                    <button
                                      key={opt}
                                                aria-pressed={Array.isArray(currentVal) ? currentVal.some(value => optionMatches(activeSurvey, q, value, opt)) : optionMatches(activeSurvey, q, currentVal, opt)}
                                      type="button"
                                      onClick={() => handleSetAnswer(q.id, opt)}
                                      className={`py-2.5 px-4 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer flex items-center gap-3 ${
                                        optionMatches(activeSurvey, q, currentVal, opt)
                                          ? 'bg-indigo-50 border-indigo-300 text-indigo-800 shadow-xs'
                                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                      }`}
                                    >
                                      <span className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center ${optionMatches(activeSurvey, q, currentVal, opt) ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'}`}>
                                        {optionMatches(activeSurvey, q, currentVal, opt) && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                                      </span>
                                      <span>{opt}</span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* MULTIPLE CHOICE TYPE */}
                              {q.type === 'multiple_choice' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                  {localizedOptions?.map((opt) => {
                                    const isSelected = Array.isArray(currentVal) && currentVal.some(value => optionMatches(activeSurvey, q, value, opt));
                                    return (
                                      <button
                                        key={opt}
                                                aria-pressed={Array.isArray(currentVal) ? currentVal.some(value => optionMatches(activeSurvey, q, value, opt)) : optionMatches(activeSurvey, q, currentVal, opt)}
                                        type="button"
                                        onClick={() => handleMultipleChoiceToggle(q.id, opt)}
                                        className={`py-2.5 px-4 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer flex items-center gap-3 ${
                                          isSelected
                                            ? 'bg-indigo-50 border-indigo-400 text-indigo-800 shadow-xs'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                      >
                                        <span className={`w-4 h-4 rounded-md border shrink-0 flex items-center justify-center transition-all ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                                          {isSelected && (
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                          )}
                                        </span>
                                        <span>{opt}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Submit Actions Button Toolbar */}
                      <div className="flex gap-3 justify-end items-center border-t border-slate-100 pt-6">
                        <button
                          type="button"
                          onClick={() => setActiveSurvey(null)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                        >
                          Cancelar y Volver
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm shadow-indigo-100"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Enviando Encuesta...</span>
                            </>
                          ) : (
                            <>
                              <span>Enviar Encuestas Terminada</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                  </fieldset>
                </form>
              </>
            );
          })()}
        </div>
      ) : (
        /* LIST OF SURVEYS */
        <div className="space-y-4" id="surveys-gallery">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
            <h3 className="text-sm font-semibold text-slate-700">Encuestas Disponibles Para Ti</h3>
            <span className="text-xs text-slate-400 font-medium">Ordenadas por fecha reciente</span>
          </div>

          {surveys.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 flex flex-col items-center">
              <span className="p-4 bg-slate-50 text-slate-400 rounded-full mb-3 border">
                <HelpCircle className="w-8 h-8" />
              </span>
              <p className="font-semibold text-slate-700 text-sm">No hay encuestas cargadas aún</p>
              <p className="text-xs text-slate-400 mt-1.5 max-w-xs">Pídele al administrador que cree o suba encuestas para verlas reflejadas en esta sección.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {surveys.map((survey) => {
                const localized = getLocalizedContent(survey);
                const hasAnswers = survey.questions && survey.questions.length > 0;
                const countryDef = COUNTRIES.find(c => c.name === survey.targetCountry);
                const isSelectedLangAvail = localized.isTranslated;

                return (
                  <div 
                    key={survey.id} 
                    className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-400/50 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <span className="bg-slate-100/80 text-slate-600 border border-slate-200 text-[9px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md flex items-center gap-1">
                          🇵🇹 {survey.targetCountry}
                        </span>

                        {isSelectedLangAvail ? (
                          <span className="text-[9px] bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold tracking-widest uppercase px-2.5 py-1 rounded-md flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            Disponible en tu idioma
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDynamicTranslation(survey, userLang);
                            }}
                            disabled={translatingId === survey.id}
                            className="text-[9px] bg-purple-50 hover:bg-purple-100 border border-purple-100 text-purple-700 font-bold tracking-widest uppercase px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {translatingId === survey.id ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-2.5 h-2.5" />
                            )}
                            <span>Traducir al {AVAILABLE_LANGUAGES.find(l => l.code === userLang)?.name || userLang} con IA</span>
                          </button>
                        )}
                      </div>

                      {/* Title & Desc */}
                      <h4 className="text-base font-bold font-display text-slate-800 tracking-tight leading-snug line-clamp-2">
                        {localized.title}
                      </h4>
                      <p className="text-slate-500 text-xs mt-1.5 line-clamp-3 leading-relaxed">
                        {localized.description}
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-4 text-[11px] text-slate-400 font-mono">
                        <span>{survey.questions.length} preguntas</span>
                        <span>•</span>
                        <span>Creada: {new Date(survey.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="mt-5">
                      <button
                        onClick={() => handleSelectSurvey(survey)}
                        className="w-full bg-slate-50 hover:bg-indigo-600 text-slate-700 hover:text-white border border-slate-200 hover:border-indigo-600 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Responder Encuesta</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
