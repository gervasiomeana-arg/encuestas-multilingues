import test from 'node:test';
import assert from 'node:assert/strict';
import { OCCUPIED_TERRITORIES_SURVEY as survey } from '../src/utils/occupiedTerritoriesSurvey';
import { addOccupiedTerritories, occupiedTerritoriesAnswers, withOccupiedTerritoriesArabic } from '../src/utils/occupiedTerritories';
import { occupiedTerritoriesUI } from '../src/utils/occupiedTerritoriesUI';
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

test('Arabic display is complete and every choice maps back to the same Spanish option without rewriting the source', () => {
  const stored = structuredClone(survey);
  const before = structuredClone(stored);
  const display = withOccupiedTerritoriesArabic(stored);
  assert.deepEqual(translationCoverage(display, display.translations.haa), {translated:30,total:30,complete:true});
  assert.match(display.translations.haa.title, /[\u0600-\u06ff]/);
  assert.match(display.translations.haa.description, /[\u0600-\u06ff]/);
  for (const q of display.questions) {
    const arabic = display.translations.haa.questions[q.id];
    assert.doesNotMatch(arabic.text, /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/, q.id);
    for (const [index, option] of (arabic.options || []).entries()) {
      assert.doesNotMatch(option, /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/, q.id);
      assert.equal(normalizeAnswerToSpanish(option, q, display), q.options![index], `${q.id}:${index}`);
      if (q.id === 'to_consent' && index !== 0) continue;
      const value = q.type === 'multiple_choice' ? [option] : option;
      const raw = { to_consent: display.translations.haa.questions.to_consent.options![0], to_1: display.translations.haa.questions.to_1.options![0], [q.id]: value };
      const previous = structuredClone(raw);
      assert.equal(answerError(display,q,value),null);
      const result = occupiedTerritoriesAnswers(display,raw);
      assert.deepEqual(result[q.id],q.type === 'multiple_choice' ? [q.options![index]] : q.options![index]);
      assert.deepEqual(raw,previous);
    }
  }
  assert.deepEqual(stored,before);
  assert.equal(stored.translations.haa,undefined);
  assert.deepEqual(display.questions,stored.questions);
  for (const value of Object.values(occupiedTerritoriesUI(survey.id,'haa')!)) assert.doesNotMatch(value,/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/);
  assert.equal(occupiedTerritoriesUI('survey_senegal','haa'),undefined);
});

test('display overlay never changes stored snapshots or breaks repeat-add checks; different questionnaires are not overlaid', async () => {
  const old = memory([]);
  const fresh = memory([]);
  const repository = new DualRepository(old,fresh);
  assert.equal(await addOccupiedTerritories(repository),1);
  const stored = (await repository.list('surveys'))[0] as unknown as typeof survey;
  const snapshot = structuredClone(fresh.data);
  withOccupiedTerritoriesArabic(stored);
  assert.deepEqual(fresh.data,snapshot);
  assert.equal(await addOccupiedTerritories(repository),0);
  assert.equal((fresh.data.surveys[0].translations as typeof survey.translations).haa,undefined);
  const other = {...survey,id:'survey_rasd'};
  assert.equal(withOccupiedTerritoriesArabic(other),other);
  const changed = structuredClone(survey);
  changed.questions[2].options!.reverse();
  assert.equal(withOccupiedTerritoriesArabic(changed),changed);
  assert.equal(changed.translations.haa,undefined);
});
