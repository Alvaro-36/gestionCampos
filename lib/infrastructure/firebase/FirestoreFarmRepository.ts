import { IFarmRepository, Farm } from '../../domain/farm';
import { Firestore, collection, doc, addDoc, setDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';

// Path: farms/{farmId}
export class FirestoreFarmRepository implements IFarmRepository {
  private farmsCollection;

  constructor(private db: Firestore) {
    this.farmsCollection = collection(db, 'farms');
  }

  async create(farm: Omit<Farm, 'id'>): Promise<string> {
    const docRef = await addDoc(this.farmsCollection, farm);
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
    const userDocRef = doc(this.db, 'users', userId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) return [];

    const userData = userSnap.data();
    const accesses: { farmId: string; role: string }[] = userData.accesses || [];
    const farmIds = accesses.map(a => a.farmId);

    if (farmIds.length === 0) return [];

    const farms: Farm[] = [];
    for (const farmId of farmIds) {
      const farm = await this.getById(farmId);
      if (farm) farms.push(farm);
    }
    return farms;
  }
}
