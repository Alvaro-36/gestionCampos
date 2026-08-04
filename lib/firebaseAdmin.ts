import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function initAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Si hay un service account key en la variable de entorno, usarlo
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      return initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (e) {
      console.error("Error parseando FIREBASE_SERVICE_ACCOUNT_KEY:", e);
    }
  }

  // Fallback: inicializar solo con projectId (funciona con emulador o sin auth admin)
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  return initializeApp({
    projectId: projectId || undefined,
  });
}

const adminApp = initAdmin();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

export { adminAuth, adminDb };
