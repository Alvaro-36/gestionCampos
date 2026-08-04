import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseServer';
import { FieldPath } from 'firebase-admin/firestore';

// Validación simple de formato de email
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Cache de claves públicas de Google para verificar tokens Firebase
let cachedKeys: Record<string, string> | null = null;
let cacheExpiry = 0;

async function getGooglePublicKeys(): Promise<Record<string, string>> {
  if (cachedKeys && Date.now() < cacheExpiry) {
    return cachedKeys;
  }

  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  const keys = await res.json();

  cachedKeys = keys;
  cacheExpiry = Date.now() + 3600 * 1000;
  return keys;
}

// Decodifica base64url
function base64urlDecode(str: string): string {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf-8');
}

// Verifica el token Firebase ID Token usando las claves públicas de Google
async function verifyAuth(request: NextRequest): Promise<{ uid: string } | NextResponse> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const parts = token.split('.');
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    }

    const header = JSON.parse(base64urlDecode(parts[0]));
    const payload = JSON.parse(base64urlDecode(parts[1]));

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (payload.aud !== projectId) {
      return NextResponse.json({ error: 'Token no válido para este proyecto.' }, { status: 401 });
    }

    if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
      return NextResponse.json({ error: 'Issuer del token inválido.' }, { status: 401 });
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return NextResponse.json({ error: 'Token expirado.' }, { status: 401 });
    }

    const keys = await getGooglePublicKeys();
    const kid = header.kid;
    if (!kid || !keys[kid]) {
      return NextResponse.json({ error: 'Clave de firma no encontrada.' }, { status: 401 });
    }

    const crypto = await import('crypto');
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${parts[0]}.${parts[1]}`);
    const isValid = verifier.verify(keys[kid], parts[2], 'base64url');

    if (!isValid) {
      return NextResponse.json({ error: 'Firma del token inválida.' }, { status: 401 });
    }

    return { uid: payload.sub || payload.user_id };
  } catch (error) {
    console.error('Error verificando token:', error);
    return NextResponse.json({ error: 'Token inválido o expirado.' }, { status: 401 });
  }
}

// GET: Obtener la lista de miembros de una finca
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params;

    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { uid } = authResult;

    const farmDoc = await adminDb.collection('farms').doc(farmId).get();
    if (!farmDoc.exists) {
      return NextResponse.json({ error: 'Finca no encontrada.' }, { status: 404 });
    }

    const farmData = farmDoc.data()!;
    const userIds: string[] = farmData.userIds || [];

    if (!userIds.includes(uid)) {
      return NextResponse.json({ error: 'No tienes acceso a esta finca.' }, { status: 403 });
    }

    if (userIds.length === 0) {
      return NextResponse.json({ members: [], ownerId: farmData.ownerId || '' });
    }

    const members: Array<{
      uid: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    }> = [];

    // Firestore Admin 'in' soporta máximo 30 items por query
    const chunks: string[][] = [];
    for (let i = 0; i < userIds.length; i += 30) {
      chunks.push(userIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      const usersSnapshot = await adminDb.collection('users')
        .where(FieldPath.documentId(), 'in', chunk)
        .get();

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const accesses: Array<{ farmId: string; role: string }> = userData.accesses || [];
        const farmAccess = accesses.find((a) => a.farmId === farmId);

        members.push({
          uid: userDoc.id,
          email: userData.email || '',
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          role: farmAccess?.role || 'admin',
        });
      }
    }

    return NextResponse.json({ members, ownerId: farmData.ownerId || '' });
  } catch (error: any) {
    console.error('GET /api/farms/[farmId]/members - Error:', error?.message, error?.stack);
    return NextResponse.json(
      { error: 'Error interno del servidor.', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

// POST: Agregar un miembro a la finca
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params;

    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { uid } = authResult;

    let body: { email?: string };
    try {
      body = await request.json();
    } catch {
      console.log('POST member 400: Body inválido');
      return NextResponse.json({ error: 'Body inválido.' }, { status: 400 });
    }

    const email = body.email?.toLowerCase().trim();
    if (!email || !isValidEmail(email)) {
      console.log('POST member 400: Email inválido', email);
      return NextResponse.json({ error: 'El formato del correo electrónico no es válido.' }, { status: 400 });
    }

    const farmRef = adminDb.collection('farms').doc(farmId);
    const farmDoc = await farmRef.get();
    if (!farmDoc.exists) {
      return NextResponse.json({ error: 'Finca no encontrada.' }, { status: 404 });
    }

    const farmData = farmDoc.data()!;
    const userIds: string[] = farmData.userIds || [];

    if (!userIds.includes(uid)) {
      return NextResponse.json({ error: 'No tienes permisos para gestionar esta finca.' }, { status: 403 });
    }

    // Buscar al usuario por email
    const usersSnapshot = await adminDb.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    // Anti-enumeración: error genérico si no existe
    if (usersSnapshot.empty) {
      console.log('POST member 400: Usuario no encontrado con email', email);
      return NextResponse.json({ error: 'No se pudo añadir el usuario.' }, { status: 400 });
    }

    const targetUserDoc = usersSnapshot.docs[0];
    const targetUid = targetUserDoc.id;
    const targetUserData = targetUserDoc.data();

    // Bloqueo de auto-asignación
    if (targetUid === uid) {
      console.log('POST member 400: Intentó auto-asignarse');
      return NextResponse.json({ error: 'No puedes añadirte a ti mismo.' }, { status: 400 });
    }

    // Prevención de duplicados
    if (userIds.includes(targetUid)) {
      console.log('POST member 409: Ya existe el usuario');
      return NextResponse.json({ error: 'Este usuario ya tiene acceso a la finca.' }, { status: 409 });
    }

    // Asignación atómica
    const targetAccesses: Array<{ farmId: string; role: string }> = targetUserData.accesses || [];
    targetAccesses.push({ farmId, role: 'admin' });

    const batch = adminDb.batch();
    batch.update(farmRef, { userIds: [...userIds, targetUid] });
    batch.update(adminDb.collection('users').doc(targetUid), { accesses: targetAccesses });
    await batch.commit();

    return NextResponse.json({
      message: 'Usuario añadido correctamente.',
      member: {
        uid: targetUid,
        email: targetUserData.email,
        firstName: targetUserData.firstName || '',
        lastName: targetUserData.lastName || '',
        role: 'admin',
      },
    });
  } catch (error: any) {
    console.error('POST /api/farms/[farmId]/members - Error:', error?.message, error?.stack);
    return NextResponse.json(
      { error: 'Error interno del servidor.', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un miembro de la finca
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params;

    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { uid } = authResult;

    let body: { userId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body inválido.' }, { status: 400 });
    }

    const targetUid = body.userId?.trim();
    if (!targetUid) {
      return NextResponse.json({ error: 'Se requiere el ID del usuario a eliminar.' }, { status: 400 });
    }

    const farmRef = adminDb.collection('farms').doc(farmId);
    const farmDoc = await farmRef.get();
    if (!farmDoc.exists) {
      return NextResponse.json({ error: 'Finca no encontrada.' }, { status: 404 });
    }

    const farmData = farmDoc.data()!;
    const userIds: string[] = farmData.userIds || [];
    const ownerId: string = farmData.ownerId || '';

    if (!userIds.includes(uid)) {
      return NextResponse.json({ error: 'No tienes permisos para gestionar esta finca.' }, { status: 403 });
    }

    // No permitir eliminar al owner
    if (targetUid === ownerId) {
      return NextResponse.json({ error: 'No se puede eliminar al propietario de la finca.' }, { status: 403 });
    }

    if (!userIds.includes(targetUid)) {
      return NextResponse.json({ error: 'El usuario no pertenece a esta finca.' }, { status: 404 });
    }

    // Remover acceso atómicamente
    const targetUserDoc = await adminDb.collection('users').doc(targetUid).get();
    const targetUserData = targetUserDoc.data();
    const targetAccesses: Array<{ farmId: string; role: string }> = targetUserData?.accesses || [];
    const updatedAccesses = targetAccesses.filter((a) => a.farmId !== farmId);
    const updatedUserIds = userIds.filter((id) => id !== targetUid);

    const batch = adminDb.batch();
    batch.update(farmRef, { userIds: updatedUserIds });
    batch.update(adminDb.collection('users').doc(targetUid), { accesses: updatedAccesses });
    await batch.commit();

    return NextResponse.json({ message: 'Usuario eliminado de la finca.' });
  } catch (error: any) {
    console.error('DELETE /api/farms/[farmId]/members - Error:', error?.message, error?.stack);
    return NextResponse.json(
      { error: 'Error interno del servidor.', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
