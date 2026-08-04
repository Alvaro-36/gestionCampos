import { ISeasonRepository, Season } from '../../domain/season';
import { Firestore, collection, doc, addDoc, setDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';

// Path: farms/{farmId}/seasons/{seasonId}
export class FirestoreSeasonRepository implements ISeasonRepository {
  constructor(private db: Firestore) {}

  private getSeasonsCollection(farmId: string) {
    return collection(this.db, 'farms', farmId, 'seasons');
  }

  async create(farmId: string, season: Omit<Season, 'id'>): Promise<string> {
    const seasonsCol = this.getSeasonsCollection(farmId);
    const docRef = await addDoc(seasonsCol, season);
    return docRef.id;
  }

  async getById(farmId: string, id: string): Promise<Season | null> {
    const seasonDocRef = doc(this.db, 'farms', farmId, 'seasons', id);
    const docSnap = await getDoc(seasonDocRef);

    if (!docSnap.exists()) return null;

    return { id: docSnap.id, ...docSnap.data() } as Season;
  }

  async update(farmId: string, season: Season): Promise<string> {
    const seasonDocRef = doc(this.db, 'farms', farmId, 'seasons', season.id);
    const { id, ...data } = season;
    await setDoc(seasonDocRef, data);
    return season.id;
  }

  async delete(farmId: string, id: string): Promise<string> {
    const seasonDocRef = doc(this.db, 'farms', farmId, 'seasons', id);
    await deleteDoc(seasonDocRef);
    return id;
  }

  async listByFarm(farmId: string): Promise<Season[]> {
    const seasonsCol = this.getSeasonsCollection(farmId);
    const snapshot = await getDocs(seasonsCol);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Season));
  }
}
