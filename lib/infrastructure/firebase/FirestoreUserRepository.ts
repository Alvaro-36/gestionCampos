import { IUserRepository, User } from '../../domain/user';
import { db } from '../../firebase';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';

export class FirestoreUserRepository implements IUserRepository {
  private usersCollection = collection(db, 'users');

  async crear(user: User): Promise<string> {
    // Usamos el UID de Firebase Auth como ID del documento en Firestore
    const userDocRef = doc(this.usersCollection, user.uid);
    await setDoc(userDocRef, user);
    return user.uid;
  }

  async obtenerPorId(id: string): Promise<User | null> {
    const userDocRef = doc(this.usersCollection, id);
    const docSnap = await getDoc(userDocRef);
    
    if (!docSnap.exists()) return null;
    
    return docSnap.data() as User;
  }
}