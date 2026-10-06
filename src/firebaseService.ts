import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
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
    await setDoc(docRef, survey);
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
    let saved = 0;
    for (const r of responses) {
      const docRef = doc(db, RESPONSES_COLLECTION, r.id);
      await setDoc(docRef, r);
      saved++;
    }
    return saved;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, RESPONSES_COLLECTION);
  }
}

export async function getResponsesBySurveyId(surveyId: string): Promise<SurveyResponse[]> {
  try {
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

export async function deleteSurvey(surveyId: string, deleteResponses: boolean = false): Promise<void> {
  try {
    await deleteDoc(doc(db, SURVEYS_COLLECTION, surveyId));
    
    // Only clean up responses if explicitly requested by admin
    if (deleteResponses) {
      const responses = await getResponsesBySurveyId(surveyId);
      for (const r of responses) {
        await deleteDoc(doc(db, RESPONSES_COLLECTION, r.id));
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SURVEYS_COLLECTION}/${surveyId}`);
  }
}
