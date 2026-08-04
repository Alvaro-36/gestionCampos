export interface Access {
  farmId: string;
  role: 'owner' | 'admin';
}

// 1. La Entidad pura
export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  accesses: Access[];
}

// 2. El Contrato (La interfaz que cualquier base de datos debe cumplir)
export interface IUserRepository {
  create(user: User): Promise<string>;
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  updateAccesses(uid: string, accesses: Access[]): Promise<void>;
  listByIds(ids: string[]): Promise<User[]>;
}