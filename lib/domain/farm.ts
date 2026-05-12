export type Coordinate = [number, number];



// Defino interfaz para aplicar adapter
// 1. La Entidad pura
export interface Farm {
  id: string;
  name: string;
  centerCoordinates: Coordinate;
}

// 2. El Contrato (La interfaz que cualquier base de datos debe cumplir)
export interface IFarmRepository {
  create(farm: Omit<Farm, 'id'>): Promise<string>;
  getById(id: string): Promise<Farm | null>;
  update(farm: Farm): Promise<string>;
  delete(id: string): Promise<string>;
  listByUser(userId: string): Promise<Farm[]>;
}