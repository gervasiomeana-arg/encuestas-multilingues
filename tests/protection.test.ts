import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateResponseBatch, ratingAverage, csvCell } from '../src/utils/dataProtection';
import { requireAdministrator, createApiLimiter } from '../serverSecurity';
import { MAURITANIA_SURVEY } from '../src/utils/mauritaniaDefaultSurvey';

const response = { id: 'test-only', surveyId: 'survey-test', userName: 'Anónimo',
  userLanguage: 'es', answers: { q1: 'A' }, submittedAt: '2026-10-06T12:00:00.000Z' };

test('batch validation preserves the input and rejects duplicate IDs and invalid data', () => {
  const records = [structuredClone(response)];
  const before = JSON.stringify(records);
  validateResponseBatch(records);
  assert.equal(JSON.stringify(records), before);
  assert.throws(() => validateResponseBatch([response, response]), /IDs repetidos/);
  assert.throws(() => validateResponseBatch([{ ...response, id: 'invalid/path' }]), /inválido/);
  assert.throws(() => validateResponseBatch([{ ...response, submittedAt: 'not-a-date' }]), /inválido/);
  assert.throws(() => validateResponseBatch(Array.from({ length: 251 }, () => response)), /250/);
});

test('averages ignore blanks, nonnumeric values and out-of-range scores', () => {
  assert.equal(ratingAverage([10, '', ' ', null, undefined, 'oops', Infinity, 0, 11]), '10.0');
  assert.equal(ratingAverage([1, '9']), '5.0');
  assert.equal(ratingAverage(['', null]), 'N/A');
});

test('CSV escapes quotes, separators and spreadsheet formula prefixes', () => {
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  for (const value of ['=SUM(A1)', '+cmd', '-1+2', '@fn', ' =1', '\t=1']) {
    assert.ok(csvCell(value).startsWith('"\''));
  }
  assert.equal(csvCell('Normal'), '"Normal"');
});

test('original questionnaire and embedded record files are byte-for-byte unchanged', () => {
  const expected = {
    'src/utils/mauritaniaDefaultSurvey.ts': '38d65f00aee182c9bac8279d406f8f6f225c8ed6ab01876df960abeaae8af708',
    'src/utils/mauritaniaResponsesData.ts': '12f509d9b511a4cba51da320fd0ec49fafb7e18d32813d2bcce9f3828264cc66'
  };
  for (const [path, digest] of Object.entries(expected)) {
    assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), digest);
  }
});

test('the original survey has 42 distinct IDs; opening/translating no longer seeds or saves data', () => {
  assert.equal(MAURITANIA_SURVEY.questions.length, 42);
  assert.equal(new Set(MAURITANIA_SURVEY.questions.map(q => q.id)).size, 42);
  assert.doesNotMatch(readFileSync('src/App.tsx', 'utf8'), /saveSurvey|saveMultipleResponses/);
  assert.doesNotMatch(readFileSync('src/components/UserDashboard.tsx', 'utf8'), /saveSurvey\(/);
  assert.doesNotMatch(readFileSync('src/components/AdminReports.tsx', 'utf8'), /INITIAL_MAURITANIA_RESPONSES/);
});

test('API authorizes only verified boolean admin claims and rejects missing/invalid credentials', async () => {
  const app = express();
  let called = 0;
  app.get('/private', requireAdministrator(async token => {
    called++;
    if (token === 'invalid') throw new Error('invalid');
    return { admin: token === 'admin' ? true : token === 'string-admin' ? 'true' : false };
  }), (_req, res) => res.json({ ok: true }));
  app.get('/limited', createApiLimiter(1), (_req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal((await fetch(base + '/private')).status, 401);
    assert.equal(called, 0);
    for (const [token, expected] of [['invalid', 401], ['user', 403], ['string-admin', 403], ['admin', 200]] as const) {
      assert.equal((await fetch(base + '/private', { headers: { Authorization: `Bearer ${token}` } })).status, expected);
    }
    assert.equal((await fetch(base + '/limited')).status, 200);
    assert.equal((await fetch(base + '/limited')).status, 429);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
