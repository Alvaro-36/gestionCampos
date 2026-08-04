import { IUserRepository, User, Access } from '../../domain/user';
import { Firestore, collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, documentId } from 'firebase/firestore';

export class FirestoreUserRepository implements IUserRepository {
  private usersCollection;

  constructor(private db: Firestore) {
    this.usersCollection = collection(db, 'users');
  }

  async create(user: User): Promise<string> {
    // Firebase Auth UID is used as the document ID
    const userDocRef = doc(this.usersCollection, user.uid);
    await setDoc(userDocRef, user);
    return user.uid;
  }

  async getById(id: string): Promise<User | null> {
    const userDocRef = doc(this.usersCollection, id);
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) return null;

    return docSnap.data() as User;
  }

  async getByEmail(email: string): Promise<User | null> {
    const q = query(this.usersCollection, where('email', '==', email.toLowerCase().trim()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const docData = snapshot.docs[0];
    return { uid: docData.id, ...docData.data() } as User;
  }

  async updateAccesses(uid: string, accesses: Access[]): Promise<void> {
    const userDocRef = doc(this.usersCollection, uid);
    await updateDoc(userDocRef, { accesses });
  }

  async listByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];

    // Firestore 'in' queries support max 30 items per query
    const results: User[] = [];
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 30) {
      chunks.push(ids.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      const q = query(this.usersCollection, where(documentId(), 'in', chunk));
      const snapshot = await getDocs(q);
      for (const docSnap of snapshot.docs) {
        results.push({ uid: docSnap.id, ...docSnap.data() } as User);
      }
    }

    return results;
  }
}