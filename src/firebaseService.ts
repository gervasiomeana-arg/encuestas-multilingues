import { collection, doc, getDocs, getDoc, setDoc, runTransaction, Firestore } from 'firebase/firestore';
import { db as historicalDb } from './firebase';
import { newDb, requireNewDatabase, connectionError } from './newFirebase';
import { requireAdmin } from './authService';
import { validateResponseBatch } from './utils/dataProtection';
import { Survey, SurveyResponse } from './types';
import { DualRepository, canonical, CollectionName, StoredRecord, WriteStore } from './utils/dualDatabase';

async function list(database: Firestore, name: CollectionName): Promise<StoredRecord[]> {
  const readPromise = getDocs(collection(database, name)).then(snapshot =>
    snapshot.docs.map(d => ({ ...d.data(), id: d.id }))
  );
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Tiempo de espera agotado al consultar ${name} en Firebase Cloud.`)), 15000);
  });
  try {
    return await Promise.race([readPromise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}
function writer(database: Firestore): WriteStore {
  return {
    list: name => list(database, name),
    async create(name, rows, allowIdentical = false) {
      return runTransaction(database, async transaction => {
        const refs = rows.map(row => doc(database, name, row.id));
        const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));
        const added = snapshots.filter(s => !s.exists()).length;
        snapshots.forEach((s, i) => {
          if (s.exists() && (!allowIdentical || canonical({ ...s.data(), id: s.id }) !== canonical(rows[i]))) {
            throw new Error('Un ID ya existe en la base nueva. No se reemplazó ningún documento.');
          }
        });
        if (name === 'responses') {
          const ids = [...new Set(rows.map(r => String(r.surveyId)))];
          const parents = await Promise.all(ids.map(id => transaction.get(doc(database, 'surveys', id))));
          if (parents.some(s => !s.exists())) throw new Error('Primero prepara las encuestas históricas en la base nueva desde Administración.');
        }
        refs.forEach((ref, i) => { if (!snapshots[i].exists()) transaction.set(ref, rows[i]); });
        return added;
      });
    }
  };
}
// The historical adapter deliberately exposes only reads. Every write uses newDb.
const repository = new DualRepository({ list: name => list(historicalDb, name) }, newDb ? writer(newDb) : null);
export function databaseStatus() {
  return { configured: !!newDb, warnings: [...repository.warnings.values()], connectionError,
    origins: { surveys: Object.fromEntries(repository.origins.surveys), responses: Object.fromEntries(repository.origins.responses) } };
}
export function assertCompleteBackup() { repository.assertComplete(); }
export async function getAllSurveys(): Promise<Survey[]> {
  return (await repository.list('surveys') as unknown as Survey[]).sort((a,b) => new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
}
export async function getSurveyById(id: string): Promise<Survey | null> {
  return (await getAllSurveys()).find(s => s.id === id) || null;
}
export async function saveSurvey(survey: Survey): Promise<void> {
  requireNewDatabase(); await requireAdmin();
  await repository.create('surveys', [survey as unknown as StoredRecord]);
}
export async function prepareHistoricalSurveys(): Promise<number> {
  requireNewDatabase(); await requireAdmin();
  return repository.prepareHistoricalSurveys();
}
export async function enableSenegalSubmissions(): Promise<void> {
  const target = requireNewDatabase();
  await requireAdmin();
  const surveys = await list(target, 'surveys');
  if (!surveys.some(survey => survey.id === 'survey_senegal')) {
    await repository.prepareHistoricalSurvey('survey_senegal');
  }
}
export async function saveResponse(response: SurveyResponse): Promise<void> {
  const target = requireNewDatabase();
  // Public users cannot read response documents to perform a transaction. Rules allow create only.
  const parent = await getDoc(doc(target, 'surveys', response.surveyId));
  if (!parent.exists()) throw new Error('Esta encuesta aún no está habilitada para nuevos envíos. Contacta a administración; tus respuestas siguen en pantalla.');
  if (!Object.keys(response.answers).length) throw new Error('Responde al menos una pregunta para enviar la encuesta. Las demás preguntas de Senegal son opcionales.');
  await setDoc(doc(target, 'responses', response.id), response);
}
export async function saveMultipleResponses(responses: SurveyResponse[]): Promise<number> {
  requireNewDatabase(); await requireAdmin(); validateResponseBatch(responses);
  return repository.create('responses', responses as unknown as StoredRecord[]);
}
export async function getAllResponses(): Promise<SurveyResponse[]> {
  await requireAdmin();
  return (await repository.list('responses') as unknown as SurveyResponse[]).sort((a,b) => new Date(b.submittedAt).getTime()-new Date(a.submittedAt).getTime());
}
export async function getResponsesBySurveyId(surveyId: string): Promise<SurveyResponse[]> {
  return (await getAllResponses()).filter(r => r.surveyId === surveyId ||
    (surveyId === 'survey_mauritania_dos' && r.surveyId === 'survey_mauritania_perfecta') ||
    (surveyId === 'survey_mauritania_perfecta' && r.surveyId === 'survey_mauritania_dos'));
}
export async function deleteSurvey(_surveyId: string, _deleteResponses = false): Promise<void> {
  throw new Error('La eliminación está deshabilitada para conservar las encuestas y sus registros.');
}
