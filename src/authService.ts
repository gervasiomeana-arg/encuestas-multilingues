import { getAuth, onIdTokenChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseApp } from './firebase';

export const auth = getAuth(firebaseApp);

export function watchAdminSession(callback: (admin: boolean) => void) {
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

export async function loginAdmin(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
  const token = await user.getIdTokenResult(true);
  if (token.claims.admin !== true) {
    await signOut(auth);
    throw new Error('Esta cuenta no tiene permiso de administración.');
  }
}

export async function requireAdmin() {
  const user = auth.currentUser;
  if (!user || (await user.getIdTokenResult()).claims.admin !== true) {
    throw new Error('Debes iniciar sesión con una cuenta administradora.');
  }
}

export async function adminAuthorizationHeaders(): Promise<Record<string, string>> {
  await requireAdmin();
  return { Authorization: `Bearer ${await auth.currentUser!.getIdToken()}` };
}

export const logoutAdmin = () => signOut(auth);
