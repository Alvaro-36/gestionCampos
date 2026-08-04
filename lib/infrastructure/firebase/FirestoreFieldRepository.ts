import { IFieldRepository, Field, PolygonVertices } from '../../domain/field';
import { Firestore, collection, doc, addDoc, setDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';

// Firestore does not support nested arrays, so coordinates are stored as { lat, lng } objects.
type FirestoreCoordinate = { lat: number; lng: number };
type FirestoreField = Omit<Field, 'area'> & { area: FirestoreCoordinate[] };

function toFirestoreCoords(area: PolygonVertices): FirestoreCoordinate[] {
  return area.map(([lat, lng]) => ({ lat, lng }));
}

function fromFirestoreCoords(area: FirestoreCoordinate[]): PolygonVertices {
  return area.map(({ lat, lng }) => [lat, lng]);
}

function toFirestoreField(field: Omit<Field, 'id'>): Omit<FirestoreField, 'id'> {
  return { ...field, area: toFirestoreCoords(field.area) };
}

function fromFirestoreField(id: string, data: Omit<FirestoreField, 'id'>): Field {
  let dateHourDown = data.dateHourDown || null;
  if (dateHourDown && typeof (dateHourDown as any).toDate === 'function') {
    dateHourDown = (dateHourDown as any).toDate();
  } else if (typeof dateHourDown === 'string' || typeof dateHourDown === 'number') {
    dateHourDown = new Date(dateHourDown);
  }

  return { ...data, id, area: fromFirestoreCoords(data.area), dateHourDown };
}

// Path: farms/{farmId}/fields/{fieldId}
export class FirestoreFieldRepository implements IFieldRepository {
  constructor(private db: Firestore) {}

  private getFieldsCollection(farmId: string) {
    return collection(this.db, 'farms', farmId, 'fields');
  }

  async create(farmId: string, field: Omit<Field, 'id'>): Promise<string> {
    const fieldsCol = this.getFieldsCollection(farmId);
    const docRef = await addDoc(fieldsCol, toFirestoreField(field));
    return docRef.id;
  }

  async getById(farmId: string, id: string): Promise<Field | null> {
    const fieldDocRef = doc(this.db, 'farms', farmId, 'fields', id);
    const docSnap = await getDoc(fieldDocRef);

    if (!docSnap.exists()) return null;

    return fromFirestoreField(docSnap.id, docSnap.data() as Omit<FirestoreField, 'id'>);
  }

  async update(farmId: string, field: Field): Promise<string> {
    const fieldDocRef = doc(this.db, 'farms', farmId, 'fields', field.id);
    const { id, ...rest } = field;
    await setDoc(fieldDocRef, toFirestoreField(rest));
    return field.id;
  }

  async delete(farmId: string, id: string): Promise<string> {
    const fieldDocRef = doc(this.db, 'farms', farmId, 'fields', id);
    await deleteDoc(fieldDocRef);
    return id;
  }

  async listByFarmId(farmId: string): Promise<Field[]> {
    const fieldsCol = this.getFieldsCollection(farmId);
    const snapshot = await getDocs(fieldsCol);
    return snapshot.docs.map(d =>
      fromFirestoreField(d.id, d.data() as Omit<FirestoreField, 'id'>)
    );
  }
}
