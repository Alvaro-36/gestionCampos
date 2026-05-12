export interface Access {
  farmId: string;
  role: string;
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
}