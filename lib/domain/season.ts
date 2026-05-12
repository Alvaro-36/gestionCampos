// 1. La Entidad pura
export interface Season {
  id: string;
  startDate: Date;
  endDate: Date;
  estimatedPricePerKg: number;
  realPricePerKg: number;
  kilosObtained: number;
}

// 2. El Contrato
// Path: farms/{farmId}/fields/{fieldId}/seasons/{seasonId}
export interface ISeasonRepository {
  create(farmId: string, fieldId: string, season: Omit<Season, 'id'>): Promise<string>;
  getById(farmId: string, fieldId: string, id: string): Promise<Season | null>;
  update(farmId: string, fieldId: string, season: Season): Promise<string>;
  delete(farmId: string, fieldId: string, id: string): Promise<string>;
  listByField(farmId: string, fieldId: string): Promise<Season[]>;
}
