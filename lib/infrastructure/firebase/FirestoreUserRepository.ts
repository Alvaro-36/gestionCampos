import { IUserRepository, User } from '../../domain/user';
import { Firestore, collection, doc, setDoc, getDoc } from 'firebase/firestore';

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
}