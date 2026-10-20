import test from 'node:test';
import assert from 'node:assert/strict';
import { OCCUPIED_TERRITORIES_SURVEY as survey } from '../src/utils/occupiedTerritoriesSurvey';
import { addOccupiedTerritories, occupiedTerritoriesAnswers } from '../src/utils/occupiedTerritories';
import { DualRepository, canonical, type StoredRecord } from '../src/utils/dualDatabase';
import { answerError, translationCoverage } from '../src/utils/surveyValidation';
import { validSurveyDraft } from '../src/utils/apiValidation';
import { normalizeAnswerToSpanish } from '../src/utils/answerTranslator';
import { surveyReportCSV } from '../src/utils/reportData';
import { questionLabel } from '../src/utils/questionLabel';
import type { SurveyResponse } from '../src/types';

function memory(surveys: StoredRecord[], responses: StoredRecord[] = []) {
  const data = structuredClone({ surveys, responses });
  const operations: string[] = [];
  return { data, operations,
    async list(name: 'surveys' | 'responses') { operations.push(`read:${name}`); return structuredClone(data[name]); },
    async create(name: 'surveys' | 'responses', records: StoredRecord[]) {
      operations.push(`create:${name}`);
      if (records.some(record => data[name].some(existing => existing.id === record.id))) throw new Error('conflict');
      data[name].push(...structuredClone(records)); return records.length;
    }
  };
}

test('new questionnaire keeps 22 source numbers, the seven matrix rows and all optional research fields', () => {
  assert.equal(validSurveyDraft(survey), true);
  assert.equal(survey.questions.length, 30);
  for (let number = 1; number <= 22; number++) {
    const fields = survey.questions.filter(q => q.displayNumber?.split('.')[0] === String(number));
    assert.equal(fields.length, number === 17 ? 7 : 1);
  }
  assert.deepEqual(survey.questions.filter(q => q.required).map(q => q.id), ['to_consent']);
  const rows = survey.questions.filter(q => q.id.startsWith('to_17_'));
  assert.ok(rows.every(q => q.type === 'single_choice' && canonical(q.options) === canonical(['Nunca', 'A veces', 'Siempre', 'No responde'])));
  assert.match(rows[0].text, /Preocupación por familiares en campamentos u otros lugares/);
  assert.match(rows[6].text, /Dificultad para actividades diarias por su estado emocional/);
  for (const q of survey.questions.filter(q => q.text.includes('Puede marcar varias'))) assert.equal(q.type, 'multiple_choice');
  assert.deepEqual(translationCoverage(survey, survey.translations.fr), { translated: 30, total: 30, complete: true });
  assert.equal(questionLabel(rows[0], 0), 'P17.1');
  assert.equal(questionLabel({ id: 'old', text: 'Old', required: false, type: 'text' }, 4), 'P5');
});

test('partial and complete translated submissions normalize to Spanish without changing source answers', () => {
  const french = survey.translations.fr.questions;
  const raw = { to_consent: french.to_consent.options![0], to_5: french.to_5.options!.slice(0, 2), to_17_4: 'Parfois' };
  const before = structuredClone({ survey, raw });
  for (const q of survey.questions) assert.equal(answerError(survey, q, raw[q.id]), null, q.id);
  const prepared = occupiedTerritoriesAnswers(survey, raw);
  assert.deepEqual(prepared.to_5, ['Separación de familiares', 'Dificultades para viajar o visitar a familiares']);
  assert.equal(prepared.to_17_4, 'A veces');
  assert.equal(Object.keys(prepared).length, 3); // Omitted answers are never invented.
  const row: SurveyResponse = { id: 'synthetic-only', surveyId: survey.id, userName: 'Anónimo', userLanguage: 'fr',
    answers: prepared, submittedAt: '2026-10-20T15:00:00.000Z' };
  const csv = surveyReportCSV(survey, [row]);
  assert.match(csv, /Separación de familiares/);
  assert.match(csv, /P17.4 Original/);
  assert.ok(survey.questions.filter(q => q.type !== 'text').every(q => Array.isArray(q.options) && q.options.length > 0)); // Existing bar renderer supports every categorical field.
  const full = Object.fromEntries(survey.questions.map(q => [q.id,
    q.type === 'text' ? '20/10/2026' : q.type === 'multiple_choice' ? [french[q.id].options![0]] : french[q.id].options![0]]));
  assert.equal(Object.keys(occupiedTerritoriesAnswers(survey, full)).length, 30);
  assert.deepEqual({ survey, raw }, before);
});

test('other session translations map by option index, while original text and unrelated surveys stay untouched', () => {
  const session = structuredClone(survey);
  session.translations.en = { title: 'Test-only translation', description: '', questions: {
    to_consent: {text:'Consent', options:['Accept','Decline']},
    to_2: {text:'Residence', options:['Laayoune','Smara','Boujdour','Dakhla','Other','Skip']}
  }};
  const answers = { to_consent: 'Accept', to_2: 'Laayoune', to_date: '2026-10-20' };
  const prepared = occupiedTerritoriesAnswers(session, answers);
  assert.equal(prepared.to_2, 'El Aaiún');
  assert.equal(prepared.to_date, answers.to_date);
  assert.equal(normalizeAnswerToSpanish(prepared.to_2, survey.questions.find(q => q.id === 'to_2')!, survey), 'El Aaiún');
  assert.equal(occupiedTerritoriesAnswers({ ...survey, id: 'survey_senegal' }, answers), answers);
  assert.throws(() => occupiedTerritoriesAnswers(survey, { to_2: 'El Aaiún' }), /aceptar/);
  assert.throws(() => occupiedTerritoriesAnswers(survey, { to_consent: survey.questions[0].options![1], to_2: 'El Aaiún' }), /aceptar/);
  assert.throws(() => occupiedTerritoriesAnswers(survey, { to_consent: survey.questions[0].options![0] }), /al menos una/);
});

test('adding twice creates only the new definition and leaves both databases and concurrent responses intact', async () => {
  const historical = memory([{ id: 'survey_rasd', title: 'SÁHARA OCCIDENTAL' }], [{ id: 'historical-answer', answers: { r1: 'Original' } }]);
  const current = memory([{ id: 'survey_senegal', title: 'SENEGAL' }], [{ id: 'senegal-answer', answers: { s13: 'Original' } }]);
  const before = structuredClone({ old: historical.data, current: current.data });
  const repository = new DualRepository(historical, current);
  assert.equal(await addOccupiedTerritories(repository), 1);
  current.data.responses.push({ id: 'arrived-during-add', answers: { s20: ['Adecuada'] } });
  assert.equal(await addOccupiedTerritories(repository), 0);
  assert.deepEqual(historical.data, before.old);
  assert.deepEqual(current.data.surveys[0], before.current.surveys[0]);
  assert.deepEqual(current.data.responses.slice(0, 1), before.current.responses);
  assert.equal(current.data.responses[1].id, 'arrived-during-add');
  assert.equal(current.data.surveys.length, 2);
  assert.equal(current.operations.filter(operation => operation === 'create:surveys').length, 1);
  assert.ok([...historical.operations, ...current.operations].every(operation => !operation.includes('responses')));
});

test('name or ID conflicts and unavailable history prevent duplicate creation without overwrites', async () => {
  for (const conflict of [
    { ...survey, title: 'Existing version with same ID' },
    { id: 'different-id', title: 'Encuesta TERRITORIO OCUPADO SAHARAHUI' }
  ]) {
    const old = memory([]);
    const current = memory([conflict]);
    const before = structuredClone(current.data);
    await assert.rejects(addOccupiedTerritories(new DualRepository(old, current)), /ID|existe/);
    assert.deepEqual(current.data, before);
    assert.equal(current.operations.filter(operation => operation.startsWith('create')).length, 0);
  }
  const current = memory([]);
  const offline = { async list() { throw new Error('offline'); } };
  await assert.rejects(addOccupiedTerritories(new DualRepository(offline, current)), /comprobar/);
  assert.equal(current.data.surveys.length, 0);
});
