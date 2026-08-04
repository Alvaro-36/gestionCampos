import { ITaskRepository, Task } from '../../domain/task';
import { Firestore, collection, doc, addDoc, setDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';

// Path: farms/{farmId}/seasons/{seasonId}/tasks/{taskId}
export class FirestoreTaskRepository implements ITaskRepository {
  constructor(private db: Firestore) {}

  private getTasksCollection(farmId: string, seasonId: string) {
    return collection(this.db, 'farms', farmId, 'seasons', seasonId, 'tasks');
  }

  async create(farmId: string, seasonId: string, task: Omit<Task, 'id'>): Promise<string> {
    const tasksCol = this.getTasksCollection(farmId, seasonId);
    const docRef = await addDoc(tasksCol, task);
    return docRef.id;
  }

  async getById(farmId: string, seasonId: string, id: string): Promise<Task | null> {
    const taskDocRef = doc(this.db, 'farms', farmId, 'seasons', seasonId, 'tasks', id);
    const docSnap = await getDoc(taskDocRef);

    if (!docSnap.exists()) return null;

    return { id: docSnap.id, ...docSnap.data() } as Task;
  }

  async update(farmId: string, seasonId: string, task: Task): Promise<string> {
    const taskDocRef = doc(this.db, 'farms', farmId, 'seasons', seasonId, 'tasks', task.id);
    const { id, ...data } = task;
    await setDoc(taskDocRef, data);
    return task.id;
  }

  async delete(farmId: string, seasonId: string, id: string): Promise<string> {
    const taskDocRef = doc(this.db, 'farms', farmId, 'seasons', seasonId, 'tasks', id);
    await deleteDoc(taskDocRef);
    return id;
  }

  async listBySeason(farmId: string, seasonId: string): Promise<Task[]> {
    const tasksCol = this.getTasksCollection(farmId, seasonId);
    const snapshot = await getDocs(tasksCol);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
  }
}
