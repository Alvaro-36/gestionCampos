// Defino interfaz para aplicar adapter
export type Coordinate = [number, number];
export type PolygonVertices = Coordinate[];
// 1. La Entidad pura
export interface Field {
  id: string;
  name: string;
  totalArea: number;
  area: PolygonVertices;
  description: string;
  tags: string[];
}

// 2. El Contrato (La interfaz que cualquier base de datos debe cumplir)
export interface IFieldRepository {
  create(farmId: string, field: Omit<Field, 'id'>): Promise<string>;
  getById(farmId: string, id: string): Promise<Field | null>;
  update(farmId: string, field: Field): Promise<string>;
  delete(farmId: string, id: string): Promise<string>;
  listByFarmId(farmId: string): Promise<Field[]>;
}