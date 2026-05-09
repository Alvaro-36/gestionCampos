// Defino interfaz para aplicar adapter
// 1. La Entidad pura
export interface User {
  uid: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

// 2. El Contrato (La interfaz que cualquier base de datos debe cumplir)
export interface IUserRepository {
  crear(user: User): Promise<string>;
  obtenerPorId(id: string): Promise<User | null>;
}