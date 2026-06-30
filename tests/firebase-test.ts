/**
 * Inicialización de Firebase para el entorno de test.
 * Conecta Auth y Firestore a los emuladores del Firebase Local Emulator Suite.
 *
 * Requiere que los emuladores estén corriendo:
 *   firebase emulators:start --only auth,firestore
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Cargamos .env.test explícitamente; nunca toca .env (producción).
config({ path: resolve(process.cwd(), '.env.test') });

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const TEST_APP_NAME = 'test';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app =
  getApps().find((a) => a.name === TEST_APP_NAME) ??
  initializeApp(firebaseConfig, TEST_APP_NAME);

const auth = getAuth(app);
const db = getFirestore(app);

const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const firestoreEmulatorHost = process.env.FIREBASE_FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';

const [firestoreHost, firestorePortStr] = firestoreEmulatorHost.split(':');
const firestorePort = parseInt(firestorePortStr, 10);

// connectAuthEmulator y connectFirestoreEmulator solo se pueden llamar una vez
// por instancia de app. Usamos flags para evitar llamadas duplicadas en HMR o tests paralelos.
const _auth = auth as typeof auth & { _emulatorConnected?: boolean };
if (!_auth._emulatorConnected) {
  connectAuthEmulator(auth, `http://${authEmulatorHost}`, { disableWarnings: true });
  _auth._emulatorConnected = true;
}

const _db = db as typeof db & { _emulatorConnected?: boolean };
if (!_db._emulatorConnected) {
  connectFirestoreEmulator(db, firestoreHost, firestorePort);
  _db._emulatorConnected = true;
}

export { auth, db };
