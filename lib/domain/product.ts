// 1. La Entidad pura
export interface Product {
  id: string;
  farmId: string;
  name: string;
  unit: string;
  defaultPrice?: number;
  defaultDose?: number;
}

// 2. El Contrato
// Path: farms/{farmId}/products/{productId}
export interface IProductRepository {
  create(product: Omit<Product, 'id'>): Promise<string>;
  getById(farmId: string, id: string): Promise<Product | null>;
  update(product: Product): Promise<string>;
  delete(farmId: string, id: string): Promise<string>;
  listByFarm(farmId: string): Promise<Product[]>;
}
