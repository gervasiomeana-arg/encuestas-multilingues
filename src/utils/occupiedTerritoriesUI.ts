import { OCCUPIED_TERRITORIES_ID } from './occupiedTerritories';

const es = {
  languageTitle: 'Idioma de la encuesta', languageIntro: 'Selecciona tu idioma para responder la encuesta.',
  languageAvailable: 'Idioma disponible', regionLabel: 'Territorio', region: 'Sáhara Occidental (Territorios Ocupados)',
  consent: 'Consentimiento', date: 'Fecha', required: 'Requerido', placeholder: 'Día / mes / año',
  participation: 'La participación es voluntaria. Después de aceptar participar, puedes responder todas las preguntas o solo algunas y enviar tus respuestas.',
  cancel: 'Cancelar y volver', send: 'Enviar respuestas', sending: 'Enviando respuestas…',
  thanks: 'Gracias por participar en nuestra encuesta', back: 'Volver a las encuestas',
  review: 'Revisa las siguientes respuestas:', consentError: 'Para enviar debes aceptar participar. Si no aceptas, puedes cerrar la encuesta; no se enviaron respuestas.',
  invalid: 'Revisa la opción seleccionada.', needAnswer: 'Responde al menos una pregunta del cuestionario. Puedes dejar las demás sin responder.',
  permissionError: 'El envío fue rechazado por los permisos. Contacta a administración; tus respuestas siguen en pantalla.',
  networkError: 'No se pudo conectar. Tus respuestas siguen en pantalla; reintenta cuando vuelva la conexión.',
  saveError: 'No se pudo guardar. Tus respuestas siguen en pantalla. Revisa tus respuestas o vuelve a intentarlo.',
  unavailable: 'La traducción completa no está disponible para esta versión. Puedes elegir otro idioma sin borrar tus respuestas.',
  translating: 'Traduciendo…', translate: 'Traducir la encuesta', complete: 'Completar traducción de esta sesión',
  incomplete: 'La traducción está incompleta.', translationError: 'No se pudo completar la traducción. Vuelve a intentarlo.'
};

const fr: typeof es = {
  languageTitle: 'Langue du questionnaire', languageIntro: 'Choisissez votre langue pour répondre au questionnaire.',
  languageAvailable: 'Langue disponible', regionLabel: 'Territoire', region: 'Sahara occidental (territoires occupés)',
  consent: 'Consentement', date: 'Date', required: 'Obligatoire', placeholder: 'Jour / mois / année',
  participation: 'La participation est volontaire. Après avoir accepté de participer, vous pouvez répondre à toutes les questions ou seulement à certaines et envoyer vos réponses.',
  cancel: 'Annuler et revenir', send: 'Envoyer les réponses', sending: 'Envoi des réponses…',
  thanks: 'Merci de votre participation à notre enquête', back: 'Revenir aux questionnaires',
  review: 'Vérifiez les réponses suivantes :', consentError: 'Pour envoyer, vous devez accepter de participer. Sinon, vous pouvez fermer le questionnaire ; aucune réponse n’a été envoyée.',
  invalid: 'Vérifiez l’option sélectionnée.', needAnswer: 'Répondez à au moins une question du questionnaire. Vous pouvez laisser les autres sans réponse.',
  permissionError: 'L’envoi a été refusé pour des raisons d’autorisation. Contactez l’administration ; vos réponses restent à l’écran.',
  networkError: 'La connexion a échoué. Vos réponses restent à l’écran ; réessayez lorsque la connexion sera rétablie.',
  saveError: 'L’enregistrement a échoué. Vos réponses restent à l’écran. Vérifiez-les ou réessayez.',
  unavailable: 'La traduction complète n’est pas disponible pour cette version. Vous pouvez choisir une autre langue sans effacer vos réponses.',
  translating: 'Traduction en cours…', translate: 'Traduire le questionnaire', complete: 'Compléter la traduction de cette session',
  incomplete: 'La traduction est incomplète.', translationError: 'La traduction n’a pas pu être terminée. Réessayez.'
};

const haa: typeof es = {
  languageTitle: 'لغة الاستبيان', languageIntro: 'اختاري اللغة التي تريدين الإجابة بها عن الاستبيان.',
  languageAvailable: 'اللغة متوفرة', regionLabel: 'المنطقة', region: 'الصحراء الغربية (الأراضي المحتلة)',
  consent: 'الموافقة', date: 'التاريخ', required: 'مطلوب', placeholder: 'اليوم / الشهر / السنة',
  participation: 'المشاركة طوعية. بعد الموافقة على المشاركة، يمكنك الإجابة عن جميع الأسئلة أو بعضها فقط، ثم إرسال إجاباتك.',
  cancel: 'إلغاء والعودة', send: 'إرسال الإجابات', sending: 'جارٍ إرسال الإجابات…',
  thanks: 'شكراً على مشاركتك في الاستبيان', back: 'العودة إلى الاستبيانات',
  review: 'راجعي الإجابات التالية:', consentError: 'للإرسال، يجب أن توافقي على المشاركة. إذا لم توافقي، يمكنك إغلاق الاستبيان؛ لم تُرسل أي إجابات.',
  invalid: 'راجعي الخيار المحدد.', needAnswer: 'أجيبي عن سؤال واحد على الأقل من أسئلة الاستبيان. يمكنك ترك بقية الأسئلة دون إجابة.',
  permissionError: 'رُفض إرسال الإجابات بسبب الصلاحيات. اتصلي بالجهة المسؤولة؛ إجاباتك ما زالت ظاهرة على الشاشة.',
  networkError: 'تعذر الاتصال. إجاباتك ما زالت ظاهرة على الشاشة؛ حاولي مجدداً عند عودة الاتصال.',
  saveError: 'تعذر حفظ الإجابات. إجاباتك ما زالت ظاهرة على الشاشة. راجعيها أو حاولي مجدداً.',
  unavailable: 'الترجمة الكاملة غير متوفرة لهذه النسخة. يمكنك اختيار لغة أخرى دون مسح إجاباتك.',
  translating: 'جارٍ الترجمة…', translate: 'ترجمة الاستبيان', complete: 'إكمال ترجمة هذه الجلسة',
  incomplete: 'الترجمة غير مكتملة.', translationError: 'تعذر إكمال الترجمة. حاولي مجدداً.'
};

export function occupiedTerritoriesUI(surveyId: string | undefined, language: string) {
  if (surveyId !== OCCUPIED_TERRITORIES_ID) return undefined;
  return language === 'haa' ? haa : language === 'fr' ? fr : es;
}

export function occupiedTerritoriesError(message: string, language: string): string {
  const ui = occupiedTerritoriesUI(OCCUPIED_TERRITORIES_ID, language)!;
  if (/aceptar participar/.test(message)) return ui.consentError;
  if (/al menos una pregunta/.test(message)) return ui.needAnswer;
  return ui.saveError;
}
