/**
 * Seed script: creates a test user, assigns a farm, and adds fields.
 *
 * Usage:
 *   npm run seed
 */

import 'dotenv/config';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

import { FirestoreUserRepository } from '../../lib/infrastructure/firebase/FirestoreUserRepository';
import { FirestoreFarmRepository } from '../../lib/infrastructure/firebase/FirestoreFarmRepository';
import { FirestoreFieldRepository } from '../../lib/infrastructure/firebase/FirestoreFieldRepository';
import { User } from '../../lib/domain/user';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const appName = 'seed';
const app = getApps().find(a => a.name === appName) ?? initializeApp(firebaseConfig, appName);
const auth = getAuth(app);
const db = getFirestore(app);

async function seed() {
  console.log('--- Iniciando seed ---');

  // 1. Create user in Firebase Auth
  const email = `test.${Date.now()}@gestioncampos.dev`;
  const password = 'Test1234!';

  console.log(`\nCreando usuario en Auth: ${email}`);
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;
  console.log(`  Auth UID: ${uid}`);

  // 2. Save user in Firestore
  const userRepo = new FirestoreUserRepository(db);
  const newUser: User = {
    uid,
    email,
    firstName: 'Juan',
    lastName: 'Test',
    accesses: [],
  };
  await userRepo.create(newUser);
  console.log('  Usuario guardado en Firestore.');

  // 3. Create a farm
  const farmRepo = new FirestoreFarmRepository(db);
  const farmId = await farmRepo.create({
    name: 'Finca El Sauce',
    centerCoordinates: [-33.4567, -68.1234],
  });
  console.log(`\n  Finca creada. ID: ${farmId}`);

  // 4. Assign farm access to user
  await userRepo.create({
    ...newUser,
    accesses: [{ farmId, role: 'owner' }],
  });
  console.log('  Acceso a finca asignado al usuario.');

  // 5. Create fields in the farm
  const fieldRepo = new FirestoreFieldRepository(db);

  const field1Id = await fieldRepo.create(farmId, {
    name: 'Cuadro Norte',
    totalArea: 12.5,
    description: 'Zona de alta exposicion solar.',
    tags: ['manzana', 'riego-goteo'],
    area: [
      [-33.4500, -68.1200],
      [-33.4510, -68.1210],
      [-33.4520, -68.1200],
      [-33.4510, -68.1190],
    ],
  });
  console.log(`\n  Cuadro "Norte" creado. ID: ${field1Id}`);

  const field2Id = await fieldRepo.create(farmId, {
    name: 'Cuadro Sur',
    totalArea: 8.3,
    description: 'Suelo arcilloso, baja pendiente.',
    tags: ['pera', 'secano'],
    area: [
      [-33.4600, -68.1250],
      [-33.4610, -68.1260],
      [-33.4620, -68.1250],
      [-33.4610, -68.1240],
    ],
  });
  console.log(`  Cuadro "Sur" creado. ID: ${field2Id}`);

  console.log('\n--- Seed completado exitosamente ---');
  console.log(JSON.stringify({ uid, email, farmId, fieldIds: [field1Id, field2Id] }, null, 2));

  process.exit(0);
}

seed().catch((err) => {
  console.error('\nError durante el seed:', err.message ?? err);
  process.exit(1);
});
