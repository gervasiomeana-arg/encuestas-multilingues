import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareResponseImport } from '../src/utils/dataProtection';

const record = { id: 'synthetic-only', surveyId: 'synthetic-survey', userName: '',
  userLanguage: 'fr', submittedAt: '2026-10-06T14:00:00.000Z', answers: { q1: 'Texte original' } };

test('backup import preserves records, missing optional country and stable IDs without mutating input', () => {
  const backup = { format: 'survey-backup', version: 1, surveys: [{ id: 'not-imported' }], responses: [record] };
  const before = structuredClone(backup);
  const first = prepareResponseImport(backup);
  assert.deepEqual(first, [record]);
  assert.deepEqual(prepareResponseImport(backup), first);
  assert.deepEqual(backup, before);
  assert.equal('userCountry' in first[0], false);
});

test('legacy explicit fields are supported without guessing survey, date, IDs or answers', () => {
  const legacy = { id: record.id, surveyId: record.surveyId, nombre: '', idioma: 'fr',
    fecha: record.submittedAt, respuestas: record.answers };
  assert.deepEqual(prepareResponseImport(legacy), [record]);
  for (const key of ['id', 'surveyId', 'userName', 'userLanguage', 'submittedAt', 'answers']) {
    const incomplete = { ...record };
    delete incomplete[key as keyof typeof incomplete];
    assert.throws(() => prepareResponseImport([incomplete]), /inválido/);
  }
  for (const invalid of [null, 'text', [null], { format: 'survey-backup' }]) {
    assert.throws(() => prepareResponseImport(invalid));
  }
});

test('import rejects rules-incompatible metadata, empty answers, duplicate IDs and oversized batches', () => {
  for (const change of [{ userName: 'x'.repeat(201) }, { userLanguage: 'x'.repeat(21) },
    { userCountry: 5 }, { answers: {} }, { answers: Array.from({ length: 2 }) },
    { answers: Object.fromEntries(Array.from({ length: 251 }, (_, index) => [`q${index}`, 'x'])) }]) {
    assert.throws(() => prepareResponseImport([{ ...record, ...change }]));
  }
  assert.throws(() => prepareResponseImport([record, record]), /IDs repetidos/);
  assert.throws(() => prepareResponseImport(Array.from({ length: 251 }, (_, index) => ({ ...record, id: `test-${index}` }))), /250/);
});
