// Public Firebase web configuration confirmed by the project owner.
// This contains no administrator credentials or private survey data.
export const NEW_FIREBASE_ENV = {
  VITE_NEW_FIREBASE_PROJECT_ID: 'gen-lang-client-0958943545',
  VITE_NEW_FIREBASE_API_KEY: 'AIzaSyBFY5l6FYwKVrSQqyL33JN8KPU9NbTGMkE',
  VITE_NEW_FIREBASE_APP_ID: '1:870931912224:web:08ad0f2421d70a3aad4e45',
  VITE_NEW_FIREBASE_AUTH_DOMAIN: 'gen-lang-client-0958943545.firebaseapp.com',
  VITE_NEW_FIREBASE_DATABASE_ID: 'encuestas-nuevas',
};

export function selectNewFirebaseEnv(env: Record<string, string | undefined>) {
  // An explicit override must be complete; never mix projects or hide mistakes.
  return Object.keys(NEW_FIREBASE_ENV).some(key => env[key]?.trim()) ? env : NEW_FIREBASE_ENV;
}
