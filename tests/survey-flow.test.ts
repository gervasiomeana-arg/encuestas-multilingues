import test from 'node:test';
import assert from 'node:assert/strict';
import { MAURITANIA_SURVEY as survey } from '../src/utils/mauritaniaDefaultSurvey';
import { answerError, toggleChoices, optionMatches, translationCoverage } from '../src/utils/surveyValidation';
import { parseRawTextToSurveyVerbatim } from '../src/utils/surveyParser';
import { validSurveyDraft, validTranslationRequest, validQuestions } from '../src/utils/apiValidation';

const question = (id: string) => survey.questions.find(q => q.id === id)!;

test('refusal of consent is blocked in original and translated options', () => {
  const q = question('m1');
  assert.match(answerError(survey, q, q.options![1])!, /No aceptaste/);
  assert.equal(answerError(survey, q, q.options![0]), null);
  for (const language of ['fr', 'haa']) {
    const options = survey.translations[language].questions.m1.options!;
    assert.match(answerError(survey, q, options[1])!, /No aceptaste/);
    assert.equal(answerError(survey, q, options[0]), null);
  }
});

test('required whitespace, invalid choices and invalid scores are rejected', () => {
  assert.match(answerError(survey, question('m3'), '  ')!, /obligatoria/);
  assert.match(answerError(survey, question('m2'), 'made up')!, /opciones/);
  const rating = { id: 'test', text: 'Test', type: 'rating' as const, required: true };
  for (const value of [0, 11, NaN, '5', 1.5]) assert.ok(answerError(survey, rating, value));
  assert.equal(answerError(survey, rating, 5), null);
});

test('maximum three selections is applied without mutating the current answer', () => {
  const q = question('m8');
  const current = q.options!.slice(0, 3);
  assert.throws(() => toggleChoices(survey, q, current, q.options![3]), /máximo 3/);
  assert.deepEqual(current, q.options!.slice(0, 3));
  assert.ok(answerError(survey, q, q.options!.slice(0, 4)));
  assert.equal(answerError(survey, q, current), null);
  assert.deepEqual(toggleChoices(survey, q, current, current[0]), current.slice(1));
});

test('Ninguna is exclusive and form validation rejects contradictory selections', () => {
  const q = question('m9');
  assert.deepEqual(toggleChoices(survey, q, [q.options![0]], 'Ninguna'), ['Ninguna']);
  assert.deepEqual(toggleChoices(survey, q, ['Ninguna'], q.options![0]), [q.options![0]]);
  assert.match(answerError(survey, q, ['Ninguna', q.options![0]])!, /combinarse/);
});

test('changing language keeps option identity without rewriting the answer', () => {
  const q = question('m2');
  const original = q.options![3];
  const french = survey.translations.fr.questions.m2.options![3];
  const hassaniya = survey.translations.haa.questions.m2.options![3];
  assert.equal(optionMatches(survey, q, original, french), true);
  assert.equal(optionMatches(survey, q, french, hassaniya), true);
  assert.equal(original, 'Más de 50');
});

test('partial translations report 7 of 42 and wrong option counts are incomplete', () => {
  assert.deepEqual(translationCoverage(survey, survey.translations.fr), { translated: 7, total: 42, complete: false });
  const small = { questions: [question('m2')] };
  const malformed = { ...survey.translations.fr, questions: { m2: { text: 'Test', options: ['only one'] } } };
  assert.equal(translationCoverage(small, malformed).complete, false);
  assert.equal(translationCoverage(small, survey.translations.fr).complete, true);
});

test('parser preserves separate numbered questions and alphabetic options', () => {
  const result = parseRawTextToSurveyVerbatim('Encuesta\n1. ¿Cómo estás?\na) Bien\nb) Mal\n2. ¿Dónde vivís?', 'test.txt');
  assert.equal(result.questions.length, 2);
  assert.equal(result.questions[0].text, '1. ¿Cómo estás?');
  assert.deepEqual(result.questions[0].options, ['Bien', 'Mal']);
  assert.equal(result.questions[1].text, '2. ¿Dónde vivís?');
  assert.ok(result.warnings?.length);
});

test('parser keeps the first question in files with no title and handles long options', () => {
  const option = 'a'.repeat(230);
  const result = parseRawTextToSurveyVerbatim(`1. ¿Primera pregunta?\n- ${option}\n2. Edad`, 'test.txt');
  assert.equal(result.questions.length, 2);
  assert.deepEqual(result.questions[0].options, [option]);
  assert.equal(result.questions[0].text, '1. ¿Primera pregunta?');
});

test('invalid AI/import output cannot become a new questionnaire', () => {
  assert.equal(validSurveyDraft(survey), true);
  assert.equal(validQuestions([question('m2'), question('m2')]), false);
  assert.equal(validQuestions([{ ...question('m2'), type: 'unexpected' }]), false);
  assert.equal(validQuestions([{ ...question('m2'), options: ['Duplicate', 'Duplicate'] }]), false);
  assert.equal(validQuestions([{ ...question('m2'), options: [' '] }]), false);
});

test('translation input is bounded and validated before any model call', () => {
  assert.equal(validTranslationRequest(survey, 'fr', 'Français'), true);
  assert.equal(validTranslationRequest(survey, 'unknown', 'Unknown'), false);
  assert.equal(validTranslationRequest({ title: 'Test', description: '', questions: [] }, 'fr', 'Français'), false);
  assert.equal(validTranslationRequest({ ...survey, title: 'a'.repeat(1001) }, 'fr', 'Français'), false);
});
