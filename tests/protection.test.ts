import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import multer from 'multer';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateResponseBatch, ratingAverage, csvCell } from '../src/utils/dataProtection';
import { requireAdministrator, createApiLimiter, apiErrorHandler } from '../serverSecurity';
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

test('API returns safe JSON for malformed bodies, oversized uploads and unexpected failures', async () => {
  const app = express();
  app.use(express.json({ limit: '1kb' }));
  app.post('/json', (_req, res) => res.json({ ok: true }));
  app.post('/upload', multer({ storage: multer.memoryStorage(), limits: { fileSize: 32 } }).single('file'),
    (_req, res) => res.json({ ok: true }));
  app.get('/failure', () => { throw new Error('PRIVATE_REQUEST_CONTENT /private/server.ts'); });
  app.use(apiErrorHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  async function check(result: Response, status: number) {
    assert.equal(result.status, status);
    assert.match(result.headers.get('content-type') || '', /application\/json/);
    const body = await result.json();
    assert.equal(typeof body.error, 'string');
    assert.doesNotMatch(JSON.stringify(body), /PRIVATE_REQUEST_CONTENT|server\.ts|SyntaxError|stack/);
  }
  try {
    const headers = { 'Content-Type': 'application/json' };
    await check(await fetch(base + '/json', { method: 'POST', headers, body: '{"PRIVATE_REQUEST_CONTENT":' }), 400);
    await check(await fetch(base + '/json', { method: 'POST', headers, body: JSON.stringify({ text: 'a'.repeat(2048) }) }), 413);
    const upload = new FormData();
    upload.set('file', new Blob(['a'.repeat(64)]), 'test.txt');
    await check(await fetch(base + '/upload', { method: 'POST', body: upload }), 413);
    const unexpected = new FormData();
    unexpected.set('unexpected', new Blob(['small']), 'test.txt');
    await check(await fetch(base + '/upload', { method: 'POST', body: unexpected }), 400);
    await check(await fetch(base + '/failure'), 500);
    assert.equal((await fetch(base + '/json', { method: 'POST', headers, body: '{}' })).status, 200);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
