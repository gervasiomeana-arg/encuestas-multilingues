import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DualRepository, StoredRecord, CollectionName, canonical, newDatabaseConfig } from '../src/utils/dualDatabase';
import { NEW_FIREBASE_ENV, selectNewFirebaseEnv } from '../src/newFirebaseConfig';
function store(initial: {surveys?: StoredRecord[]; responses?: StoredRecord[]}, fail = false) {
  const data = {surveys: structuredClone(initial.surveys || []), responses: structuredClone(initial.responses || [])};
  let writes = 0;
  return {data, get writes() { return writes; }, async list(name: CollectionName) { if (fail) throw new Error('offline'); return structuredClone(data[name]); },
    async create(name: CollectionName, records: StoredRecord[], identical = false) {
      for (const row of records) { const existing = data[name].find(r => r.id === row.id); if (existing && (!identical || canonical(row) !== canonical(existing))) throw new Error('conflict'); }
      const fresh = records.filter(r => !data[name].some(old => old.id === r.id)); data[name].push(...structuredClone(fresh)); writes += fresh.length; return fresh.length;
    }};
}
test('merged sources deduplicate identical IDs without mutating historical records and reject conflicts', async () => {
  const old = store({surveys:[{id:'s',title:'Original'}],responses:[{id:'r',surveyId:'s',answers:{q:'private'}}]});
  const fresh = store({surveys:[{id:'s',title:'Original'}],responses:[{id:'new',surveyId:'s'}]});
  const repo = new DualRepository(old,fresh); const before = structuredClone(old.data);
  assert.equal((await repo.list('surveys')).length,1); assert.equal(repo.origins.surveys.get('s'),'ambas');
  assert.equal((await repo.list('responses')).length,2); assert.equal(repo.origins.responses.get('new'),'nueva');
  fresh.data.surveys[0].title='Different'; await assert.rejects(repo.list('surveys'),/contenido diferente/);
  assert.deepEqual(old.data,before); assert.equal(old.writes,0);
});
test('explicit historical preparation copies only definitions, repeats safely and fails atomically on changed IDs', async () => {
  const old=store({surveys:[{id:'a',questions:[{id:'q',options:['A','B']}],translations:{fr:{title:'French'}}},{id:'b'}],responses:[{id:'r'}]});
  const fresh=store({}); const repo=new DualRepository(old,fresh); const before=structuredClone(old.data);
  assert.equal(await repo.prepareHistoricalSurveys(),2); assert.equal(await repo.prepareHistoricalSurveys(),0);
  assert.deepEqual(fresh.data.surveys,old.data.surveys); assert.equal(fresh.data.responses.length,0);
  old.data.surveys.push({id:'c'}); fresh.data.surveys[0].questions=[];
  await assert.rejects(repo.prepareHistoricalSurveys(),/conflict/); assert.equal(fresh.data.surveys.length,2);
  assert.deepEqual(old.data.responses,before.responses); assert.equal(old.writes,0);
});
test('unconfigured writes never fall back to history; imports reject historical IDs and history outages', async () => {
  const old=store({responses:[{id:'old'}]}); const fresh=store({}); const repo=new DualRepository(old,fresh);
  await assert.rejects(repo.create('responses',[{id:'old'}]),/historial/); assert.equal(fresh.writes,0);
  await repo.create('responses',[{id:'new'}]); assert.equal(fresh.writes,1); assert.equal(old.writes,0);
  await assert.rejects(new DualRepository(old,null).create('responses',[{id:'x'}]),/configurada/);
  await assert.rejects(new DualRepository(store({},true),fresh).create('responses',[{id:'x'}]),/offline/); assert.equal(fresh.writes,1);
});
test('history outage is explicit, blocks integral backup, and new outage is fatal', async () => {
  const repo=new DualRepository(store({},true),store({responses:[{id:'new'}]}));
  assert.equal((await repo.list('responses')).length,1); assert.equal(repo.warnings.size,1); assert.throws(()=>repo.assertComplete(),/falta consultar/);
  await assert.rejects(new DualRepository(store({}),store({},true)).list('responses'),/offline/);
});
test('new configuration requires all fields and a separate project', () => {
  assert.equal(newDatabaseConfig({}),null); assert.throws(()=>newDatabaseConfig({VITE_NEW_FIREBASE_PROJECT_ID:'new'}),/completar/);
  const env=Object.fromEntries(['PROJECT_ID','API_KEY','APP_ID','AUTH_DOMAIN','DATABASE_ID'].map(k=>['VITE_NEW_FIREBASE_'+k,'synthetic']));
  assert.equal(newDatabaseConfig(env)?.databaseId,'synthetic'); env.VITE_NEW_FIREBASE_PROJECT_ID='chromatic-pride-0ttsj'; assert.throws(()=>newDatabaseConfig(env),/otro proyecto/);
});
test('confirmed default targets the new named database and partial overrides fail closed', () => {
  const config = newDatabaseConfig(selectNewFirebaseEnv({}));
  assert.equal(config?.projectId, 'gen-lang-client-0958943545');
  assert.equal(config?.databaseId, 'encuestas-nuevas');
  assert.deepEqual(selectNewFirebaseEnv({VITE_NEW_FIREBASE_PROJECT_ID: ''}), NEW_FIREBASE_ENV);
  assert.throws(() => newDatabaseConfig(selectNewFirebaseEnv({VITE_NEW_FIREBASE_PROJECT_ID: 'other-project'})), /completar/);
  assert.throws(() => newDatabaseConfig(selectNewFirebaseEnv({...NEW_FIREBASE_ENV, VITE_NEW_FIREBASE_PROJECT_ID: 'chromatic-pride-0ttsj'})), /otro proyecto/);
});
test('Firebase write path and token verification never use the historical project as a fallback', () => {
  const service=readFileSync('src/firebaseService.ts','utf8');
  assert.doesNotMatch(service,/setDoc\(doc\(historicalDb|runTransaction\(historicalDb/);
  assert.match(service,/const target = requireNewDatabase\(\)/);
  assert.match(readFileSync('src/authService.ts','utf8'),/getAuth\(newFirebaseApp\)/);
  assert.doesNotMatch(readFileSync('server.ts','utf8'),/projectId: process.env.FIREBASE_PROJECT_ID \|\|/);
});
