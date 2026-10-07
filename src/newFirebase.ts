import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { newDatabaseConfig } from './utils/dualDatabase';
import { selectNewFirebaseEnv } from './newFirebaseConfig';
const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env || {};
export let connectionError = '';
let config: ReturnType<typeof newDatabaseConfig> = null;
try { config = newDatabaseConfig(selectNewFirebaseEnv(env)); } catch (error) { connectionError = (error as Error).message; }
export const newFirebaseApp = config ? initializeApp(config, 'new-survey-storage') : null;
export const newDb = newFirebaseApp && config ? initializeFirestore(newFirebaseApp, {}, config.databaseId) : null;
export function requireNewDatabase() {
  if (!newDb) throw new Error(connectionError || 'La base nueva aún no está configurada. No se guardó nada.');
  return newDb;
}
