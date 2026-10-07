import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { inspectBackup, compareBackups } from '../scripts/check-backup.mjs';

const snapshot = { format: 'survey-backup', version: 1, counts: { surveys: 1, responses: 1 },
  surveys: [{ id: 'synthetic-survey', title: 'Test', questions: [{ id: 'q1', options: ['A', 'B'] }] }],
  responses: [{ id: 'synthetic-only', surveyId: 'synthetic-survey', userName: 'PRIVATE_TEST_NAME',
    answers: { q1: 'PRIVATE_TEST_ANSWER' }, submittedAt: '2026-10-06' }] };

test('backup inspection rejects incomplete backups, mismatched counts and duplicate IDs', () => {
  assert.deepEqual(inspectBackup(snapshot).summary.surveys, 1);
  assert.throws(() => inspectBackup(snapshot.responses));
  assert.throws(() => inspectBackup({ ...snapshot, counts: { surveys: 1, responses: 2 } }));
  assert.throws(() => inspectBackup({ ...snapshot, counts: { surveys: 2, responses: 1 }, surveys: [...snapshot.surveys, ...snapshot.surveys] }));
});

test('backup fingerprint ignores JSON key and document ordering, preserving arrays and inputs', () => {
  const original = structuredClone(snapshot);
  const reordered = { ...snapshot, responses: [{ ...snapshot.responses[0], answers: { q1: 'PRIVATE_TEST_ANSWER' } }] };
  assert.equal(inspectBackup(reordered).summary.fingerprint, inspectBackup(snapshot).summary.fingerprint);
  const recordKeys = { ...snapshot, responses: [Object.fromEntries(Object.entries(snapshot.responses[0]).reverse())] };
  assert.equal(inspectBackup(recordKeys).summary.fingerprint, inspectBackup(snapshot).summary.fingerprint);
  const twoRecords = { ...snapshot, counts: { surveys: 1, responses: 2 }, responses: [...snapshot.responses, { ...snapshot.responses[0], id: 'another-test' }] };
  assert.equal(inspectBackup(twoRecords).summary.fingerprint,
    inspectBackup({ ...twoRecords, responses: [...twoRecords.responses].reverse() }).summary.fingerprint);
  const changed = structuredClone(snapshot); changed.surveys[0].questions[0].options.reverse();
  assert.notEqual(inspectBackup(changed).summary.fingerprint, inspectBackup(snapshot).summary.fingerprint);
  assert.deepEqual(snapshot, original);
});

test('backup comparison admits additions but detects loss and exact changes to existing records', () => {
  const added = structuredClone(snapshot);
  added.responses.push({ ...snapshot.responses[0], id: 'synthetic-new' }); added.counts.responses++;
  assert.equal(compareBackups(snapshot, added).preserved, true);
  assert.equal(compareBackups(snapshot, added).collections.responses.added, 1);
  added.responses[0].answers.q1 = 'Changed';
  assert.equal(compareBackups(snapshot, added).preserved, false);
  assert.equal(compareBackups(snapshot, added).collections.responses.changed, 1);
  const removed = { ...snapshot, responses: [], counts: { surveys: 1, responses: 0 } };
  assert.equal(compareBackups(snapshot, removed).collections.responses.missing, 1);
});

test('backup CLI only reads files and prints counts and hashes without private content', () => {
  const dir = mkdtempSync(join(tmpdir(), 'synthetic-backup-'));
  try {
    const path = join(dir, 'backup.json');
    const raw = JSON.stringify(snapshot); writeFileSync(path, raw);
    const result = spawnSync(process.execPath, ['scripts/check-backup.mjs', path, path], { encoding: 'utf8' });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /"preserved":true/);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_TEST_NAME|PRIVATE_TEST_ANSWER/);
    assert.equal(readFileSync(path, 'utf8'), raw);
    assert.notEqual(spawnSync(process.execPath, ['scripts/check-backup.mjs'], { encoding: 'utf8' }).status, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('production template cannot target the historical database before new configuration', () => {
  const configuration = JSON.parse(readFileSync('firebase.production.json', 'utf8'));
  assert.equal(configuration.firestore[0].database, 'REPLACE_WITH_NEW_DATABASE_ID');
  assert.equal(configuration.firestore[0].rules, 'firestore.rules');
  assert.doesNotMatch(JSON.stringify(configuration), /ai-studio-f947253c|chromatic-pride/);
});
