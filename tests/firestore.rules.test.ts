import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
let env: RulesTestEnvironment;
const survey = { id: 'survey-existing', title: 'Synthetic only', questions: [{ id: 'q1', text: 'Test?', type: 'text', required: true }] };
const response = { id: 'response-existing', surveyId: survey.id, userName: 'Anónimo', userLanguage: 'es', answers: { q1: 'Test' }, submittedAt: '2026-10-06T12:00:00.000Z' };
before(async () => {
  if (!enabled) return;
  assert.match(process.env.FIRESTORE_EMULATOR_HOST!, /^(127\.0\.0\.1|localhost):\d+$/, 'Tests only run against a loopback emulator');
  env = await initializeTestEnvironment({ projectId: 'demo-survey-preservation', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'surveys', survey.id), survey);
    await setDoc(doc(context.firestore(), 'responses', response.id), response);
  });
});
after(async () => { if (env) await env.cleanup(); });

test('rules: public can read surveys, never responses or private collections', { skip: !enabled }, async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(db, 'surveys', survey.id)));
  await assertFails(getDoc(doc(db, 'responses', response.id)));
  await assertFails(getDocs(collection(db, 'responses')));
  await assertFails(getDoc(doc(db, 'private', 'x')));
});

test('rules: only a verified admin can read responses and create a new survey', { skip: !enabled }, async () => {
  const user = env.authenticatedContext('ordinary-user').firestore();
  const forged = env.authenticatedContext('string-admin', { admin: 'true' }).firestore();
  const admin = env.authenticatedContext('admin', { admin: true }).firestore();
  await assertFails(getDoc(doc(user, 'responses', response.id)));
  await assertFails(getDoc(doc(forged, 'responses', response.id)));
  await assertSucceeds(getDoc(doc(admin, 'responses', response.id)));
  await assertFails(setDoc(doc(user, 'surveys', 'new-user'), { ...survey, id: 'new-user' }));
  await assertSucceeds(setDoc(doc(admin, 'surveys', 'new-admin'), { ...survey, id: 'new-admin' }));
});

test('rules: nobody can overwrite or delete existing questionnaires or responses', { skip: !enabled }, async () => {
  for (const context of [env.unauthenticatedContext(), env.authenticatedContext('user'), env.authenticatedContext('admin', { admin: true })]) {
    const db = context.firestore();
    for (const [collectionName, value] of [['surveys', survey], ['responses', response]] as const) {
      const reference = doc(db, collectionName, value.id);
      await assertFails(setDoc(reference, { ...value, changed: true }));
      await assertFails(updateDoc(reference, { changed: true }));
      await assertFails(deleteDoc(reference));
    }
  }
  const admin = env.authenticatedContext('admin', { admin: true }).firestore();
  assert.deepEqual((await getDoc(doc(admin, 'surveys', survey.id))).data(), survey);
  assert.deepEqual((await getDoc(doc(admin, 'responses', response.id))).data(), response);
});

test('rules: a valid new response is accepted, malformed and orphan responses are rejected', { skip: !enabled }, async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertSucceeds(setDoc(doc(db, 'responses', 'new-public'), { ...response, id: 'new-public' }));
  await assertFails(setDoc(doc(db, 'responses', 'bad-id'), response));
  await assertFails(setDoc(doc(db, 'responses', 'orphan'), { ...response, id: 'orphan', surveyId: 'absent' }));
  await assertFails(setDoc(doc(db, 'responses', 'empty'), { ...response, id: 'empty', answers: {} }));
});

test('rules: a transaction cannot partially replace an existing response', { skip: !enabled }, async () => {
  const db = env.authenticatedContext('admin', { admin: true }).firestore();
  await assertFails(runTransaction(db, async tx => {
    tx.set(doc(db, 'responses', 'atomic-new'), { ...response, id: 'atomic-new' });
    tx.set(doc(db, 'responses', response.id), { ...response, answers: { q1: 'CHANGED' } });
  }));
  assert.equal((await getDoc(doc(db, 'responses', 'atomic-new'))).exists(), false);
  assert.deepEqual((await getDoc(doc(db, 'responses', response.id))).data(), response);
});
