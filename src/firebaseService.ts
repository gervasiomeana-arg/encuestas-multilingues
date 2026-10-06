import { collection, doc, getDocs, getDoc, setDoc, runTransaction, query } from 'firebase/firestore';
import { db } from './firebase';
import { requireAdmin } from './authService';
import { validateResponseBatch } from './utils/dataProtection';
import { Survey, SurveyResponse } from './types';

const SURVEYS_COLLECTION = 'surveys';
const RESPONSES_COLLECTION = 'responses';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function getAllSurveys(): Promise<Survey[]> {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, SURVEYS_COLLECTION))
    );
    const surveys: Survey[] = [];
    querySnapshot.forEach((docSnap) => {
      surveys.push({ id: docSnap.id, ...docSnap.data() } as Survey);
    });
    // Sort surveys by date descending
    return surveys.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, SURVEYS_COLLECTION);
  }
}

export async function getSurveyById(id: string): Promise<Survey | null> {
  try {
    const docRef = doc(db, SURVEYS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Survey;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${SURVEYS_COLLECTION}/${id}`);
  }
}

export async function saveSurvey(survey: Survey): Promise<void> {
  try {
    const docRef = doc(db, SURVEYS_COLLECTION, survey.id);
    await requireAdmin();
    await runTransaction(db, async transaction => {
      if ((await transaction.get(docRef)).exists()) {
        throw new Error('Las encuestas existentes están protegidas. Guarda una copia nueva.');
      }
      transaction.set(docRef, survey);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SURVEYS_COLLECTION}/${survey.id}`);
  }
}

export async function saveResponse(response: SurveyResponse): Promise<void> {
  try {
    const docRef = doc(db, RESPONSES_COLLECTION, response.id);
    await setDoc(docRef, response);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${RESPONSES_COLLECTION}/${response.id}`);
  }
}

export async function saveMultipleResponses(responses: SurveyResponse[]): Promise<number> {
  try {
    await requireAdmin();
    validateResponseBatch(responses);
    const references = responses.map(r => doc(db, RESPONSES_COLLECTION, r.id));
    await runTransaction(db, async transaction => {
      const snapshots = await Promise.all(references.map(ref => transaction.get(ref)));
      if (snapshots.some(snapshot => snapshot.exists())) {
        throw new Error('El archivo contiene IDs ya guardados. No se importó ni reemplazó ningún registro.');
      }
      const surveyIds = [...new Set(responses.map(r => r.surveyId))];
      const surveys = await Promise.all(surveyIds.map(id => transaction.get(doc(db, SURVEYS_COLLECTION, id))));
      if (surveys.some(snapshot => !snapshot.exists())) {
        throw new Error('Una respuesta apunta a una encuesta que no existe. No se importó ningún registro.');
      }
      references.forEach((ref, index) => transaction.set(ref, responses[index]));
    });
    return responses.length;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, RESPONSES_COLLECTION);
  }
}

export async function getResponsesBySurveyId(surveyId: string): Promise<SurveyResponse[]> {
  try {
    await requireAdmin();
    const querySnapshot = await getDocs(
      collection(db, RESPONSES_COLLECTION)
    );
    const responses: SurveyResponse[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as SurveyResponse;
      if (
        data.surveyId === surveyId || 
        (surveyId === 'survey_mauritania_dos' && data.surveyId === 'survey_mauritania_perfecta') ||
        (surveyId === 'survey_mauritania_perfecta' && data.surveyId === 'survey_mauritania_dos')
      ) {
        responses.push({ id: docSnap.id, ...data });
      }
    });
    // Sort answers by date descending
    return responses.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, RESPONSES_COLLECTION);
  }
}

export async function getAllResponses(): Promise<SurveyResponse[]> {
  try {
    await requireAdmin();
    const querySnapshot = await getDocs(
      collection(db, RESPONSES_COLLECTION)
    );
    const responses: SurveyResponse[] = [];
    querySnapshot.forEach((docSnap) => {
      responses.push({ id: docSnap.id, ...docSnap.data() } as SurveyResponse);
    });
    return responses.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, RESPONSES_COLLECTION);
  }
}

// Existing questionnaires and responses must never be deleted from this app.
export async function deleteSurvey(_surveyId: string, _deleteResponses: boolean = false): Promise<void> {
  throw new Error('La eliminación está deshabilitada para conservar las encuestas y sus registros.');
}
