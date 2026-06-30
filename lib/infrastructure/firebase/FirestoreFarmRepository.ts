import { IFarmRepository, Farm } from '../../domain/farm';
import { Firestore, collection, doc, addDoc, setDoc, getDoc, getDocs, deleteDoc, query, where } from 'firebase/firestore';

// Path: farms/{farmId}
export class FirestoreFarmRepository implements IFarmRepository {
  private farmsCollection;

  constructor(private db: Firestore) {
    this.farmsCollection = collection(db, 'farms');
  }

  async create(farm: Omit<Farm, 'id'>): Promise<string> {
    const docRef = await addDoc(this.farmsCollection, {
      name: farm.name,
      centerCoordinates: farm.centerCoordinates,
      userIds: farm.userIds || []
    });
    return docRef.id;
  }

  async getById(id: string): Promise<Farm | null> {
    const farmDocRef = doc(this.farmsCollection, id);
    const docSnap = await getDoc(farmDocRef);

    if (!docSnap.exists()) return null;

    return { id: docSnap.id, ...docSnap.data() } as Farm;
  }

  async update(farm: Farm): Promise<string> {
    const farmDocRef = doc(this.farmsCollection, farm.id);
    const { id, ...data } = farm;
    await setDoc(farmDocRef, data);
    return farm.id;
  }

  async delete(id: string): Promise<string> {
    const farmDocRef = doc(this.farmsCollection, id);
    await deleteDoc(farmDocRef);
    return id;
  }

  async listByUser(userId: string): Promise<Farm[]> {
    const q = query(this.farmsCollection, where('userIds', 'array-contains', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Farm));
  }
}
