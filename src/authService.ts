import { getAuth, onIdTokenChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { newFirebaseApp, requireNewDatabase } from './newFirebase';

export const auth = newFirebaseApp ? getAuth(newFirebaseApp) : null;

export function watchAdminSession(callback: (admin: boolean) => void) {
  if (!auth) { callback(false); return () => {}; }
  let generation = 0;
  return onIdTokenChanged(auth, async user => {
    const current = ++generation;
    callback(false);
    if (!user) return;
    try {
      const token = await user.getIdTokenResult();
      if (current === generation) callback(token.claims.admin === true);
    } catch {
      if (current === generation) callback(false);
    }
  });
}

export async function loginAdmin(accessKey: string) {
  requireNewDatabase();
  if (!auth) throw new Error('La cuenta administradora necesita la base nueva.');

  const res = await fetch('/api/admin-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessKey: accessKey.trim() })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Clave de acceso incorrecta.');
  }

  const { user } = await signInWithEmailAndPassword(auth, data.email, data.password);
  const token = await user.getIdTokenResult(true);
  if (token.claims.admin !== true) {
    await signOut(auth);
    throw new Error('Esta cuenta no tiene permiso de administración.');
  }
}

export async function requireAdmin() {
  const user = auth?.currentUser;
  if (!user || (await user.getIdTokenResult()).claims.admin !== true) {
    throw new Error('Debes iniciar sesión con una cuenta administradora.');
  }
}

export async function adminAuthorizationHeaders(): Promise<Record<string, string>> {
  await requireAdmin();
  return { Authorization: `Bearer ${await auth!.currentUser!.getIdToken()}` };
}

export const logoutAdmin = () => auth ? signOut(auth) : Promise.resolve();
