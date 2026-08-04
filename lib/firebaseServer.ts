import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function initAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Si hay un service account key en variable de entorno, usarlo
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      const cleanKey = serviceAccountKey.replace(/^'|'$/g, '');
      const serviceAccount = JSON.parse(cleanKey);
      // Asegurarse de que los saltos de línea sean correctos
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      
      return initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (e) {
      console.error("Error parseando FIREBASE_SERVICE_ACCOUNT_KEY:", e);
    }
  }

  // Fallback: inicializar solo con projectId
  // Funciona para operaciones de Firestore sin credenciales explícitas
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  return initializeApp({
    projectId: projectId || undefined,
  });
}

const adminApp = initAdmin();
const adminDb = getFirestore(adminApp);

export { adminDb };
