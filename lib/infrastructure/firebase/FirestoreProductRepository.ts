import { IProductRepository, Product } from '../../domain/product';
import { Firestore, collection, doc, addDoc, setDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';

// Path: farms/{farmId}/products/{productId}
export class FirestoreProductRepository implements IProductRepository {
  constructor(private db: Firestore) {}

  private getProductsCollection(farmId: string) {
    return collection(this.db, 'farms', farmId, 'products');
  }

  async create(product: Omit<Product, 'id'>): Promise<string> {
    const productsCol = this.getProductsCollection(product.farmId);
    const docRef = await addDoc(productsCol, product);
    return docRef.id;
  }

  async getById(farmId: string, id: string): Promise<Product | null> {
    const productDocRef = doc(this.db, 'farms', farmId, 'products', id);
    const docSnap = await getDoc(productDocRef);

    if (!docSnap.exists()) return null;

    return { id: docSnap.id, ...docSnap.data() } as Product;
  }

  async update(product: Product): Promise<string> {
    const productDocRef = doc(this.db, 'farms', product.farmId, 'products', product.id);
    const { id, ...data } = product;
    await setDoc(productDocRef, data);
    return product.id;
  }

  async delete(farmId: string, id: string): Promise<string> {
    const productDocRef = doc(this.db, 'farms', farmId, 'products', id);
    await deleteDoc(productDocRef);
    return id;
  }

  async listByFarm(farmId: string): Promise<Product[]> {
    const productsCol = this.getProductsCollection(farmId);
    const snapshot = await getDocs(productsCol);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
  }
}
