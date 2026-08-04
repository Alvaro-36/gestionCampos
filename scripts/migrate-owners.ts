/**
 * Script de migración: Asignar rol "Owner" a los usuarios existentes.
 * 
 * Este script hace lo siguiente:
 * 1. Itera todas las fincas en Firestore.
 * 2. Para cada finca, toma el primer userId en userIds como owner.
 * 3. Asigna ownerId al documento de la finca.
 * 4. Actualiza los accesses del usuario owner con { farmId, role: 'owner' }.
 * 5. Para los demás userIds, asigna { farmId, role: 'admin' }.
 * 
 * Ejecución:
 *   Configurar la variable de entorno GOOGLE_APPLICATION_CREDENTIALS o
 *   FIRESTORE_EMULATOR_HOST según corresponda, luego:
 *   
 *   npx tsx scripts/migrate-owners.ts
 * 
 * Una vez ejecutado y verificado, eliminar este archivo.
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({
  credential: applicationDefault(),
});
const db = getFirestore(app);

interface Access {
  farmId: string;
  role: string;
}

async function migrate() {
  console.log('=== Inicio de migración: Asignar Owners ===\n');

  const farmsSnapshot = await db.collection('farms').get();

  if (farmsSnapshot.empty) {
    console.log('No hay fincas en la base de datos. Nada que migrar.');
    return;
  }

  console.log(`Fincas encontradas: ${farmsSnapshot.size}\n`);

  let farmsUpdated = 0;
  let usersUpdated = 0;

  for (const farmDoc of farmsSnapshot.docs) {
    const farmData = farmDoc.data();
    const farmId = farmDoc.id;
    const farmName = farmData.name || '(sin nombre)';
    const userIds: string[] = farmData.userIds || [];

    // Si ya tiene ownerId, saltar
    if (farmData.ownerId) {
      console.log(`[SKIP] Finca "${farmName}" (${farmId}) ya tiene ownerId: ${farmData.ownerId}`);
      continue;
    }

    if (userIds.length === 0) {
      console.log(`[WARN] Finca "${farmName}" (${farmId}) no tiene userIds. Saltando.`);
      continue;
    }

    // El primer userId es el owner
    const ownerUid = userIds[0];
    const adminUids = userIds.slice(1);

    console.log(`[FARM] "${farmName}" (${farmId})`);
    console.log(`  Owner: ${ownerUid}`);
    if (adminUids.length > 0) {
      console.log(`  Admins: ${adminUids.join(', ')}`);
    }

    const batch = db.batch();

    // Actualizar ownerId en la finca
    batch.update(db.collection('farms').doc(farmId), { ownerId: ownerUid });

    // Actualizar accesses del owner
    const ownerDoc = await db.collection('users').doc(ownerUid).get();
    if (ownerDoc.exists) {
      const ownerData = ownerDoc.data()!;
      const currentAccesses: Access[] = ownerData.accesses || [];
      
      // Verificar si ya tiene acceso a esta finca
      const existingIndex = currentAccesses.findIndex(a => a.farmId === farmId);
      if (existingIndex >= 0) {
        currentAccesses[existingIndex].role = 'owner';
      } else {
        currentAccesses.push({ farmId, role: 'owner' });
      }
      
      batch.update(db.collection('users').doc(ownerUid), { accesses: currentAccesses });
      usersUpdated++;
    } else {
      console.log(`  [WARN] Usuario owner ${ownerUid} no encontrado en colección users.`);
    }

    // Actualizar accesses de los admins
    for (const adminUid of adminUids) {
      const adminDoc = await db.collection('users').doc(adminUid).get();
      if (adminDoc.exists) {
        const adminData = adminDoc.data()!;
        const currentAccesses: Access[] = adminData.accesses || [];
        
        const existingIndex = currentAccesses.findIndex(a => a.farmId === farmId);
        if (existingIndex >= 0) {
          currentAccesses[existingIndex].role = 'admin';
        } else {
          currentAccesses.push({ farmId, role: 'admin' });
        }
        
        batch.update(db.collection('users').doc(adminUid), { accesses: currentAccesses });
        usersUpdated++;
      } else {
        console.log(`  [WARN] Usuario admin ${adminUid} no encontrado en colección users.`);
      }
    }

    await batch.commit();
    farmsUpdated++;
    console.log(`  [OK] Migrada correctamente.\n`);
  }

  console.log('=== Migración completada ===');
  console.log(`Fincas actualizadas: ${farmsUpdated}`);
  console.log(`Usuarios actualizados: ${usersUpdated}`);
}

migrate().catch((error) => {
  console.error('Error durante la migración:', error);
  process.exit(1);
});
