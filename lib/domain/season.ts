// 1. La Entidad pura
export interface Season {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date | null;
  estimatedPricePerKg: number;
  realPricePerKg: number;
  kilosObtained: number;
  fieldIds: string[];
}

// 2. El Contrato
// Path: farms/{farmId}/seasons/{seasonId}
export interface ISeasonRepository {
  create(farmId: string, season: Omit<Season, 'id'>): Promise<string>;
  getById(farmId: string, id: string): Promise<Season | null>;
  update(farmId: string, season: Season): Promise<string>;
  delete(farmId: string, id: string): Promise<string>;
  listByFarm(farmId: string): Promise<Season[]>;
}

// 3. Funciones de Dominio

/**
 * Crea un nuevo objeto de Temporada (sin ID) copiando los lotes de la temporada anterior.
 * @param oldSeason La temporada que se desea repetir
 * @param newName El nombre para la nueva temporada
 * @returns Omit<Season, 'id'> con los datos para la nueva temporada
 */
export function repeatSeason(oldSeason: Season, newName: string): Omit<Season, 'id'> {
  return {
    name: newName,
    startDate: new Date(),
    endDate: null,
    estimatedPricePerKg: 0,
    realPricePerKg: 0,
    kilosObtained: 0,
    fieldIds: [...(oldSeason.fieldIds || [])]
  };
}

/**
 * Verifica si una temporada pasada puede ser repetida.
 * Una temporada NO puede repetirse si alguno de sus lotes ya está asociado a otra temporada que se encuentre activa.
 * @param seasonToRepeat La temporada que se quiere evaluar
 * @param activeSeasons La lista de todas las temporadas actualmente activas
 * @returns boolean indicando si es posible repetir la temporada
 */
export function canRepeatSeason(seasonToRepeat: Season, activeSeasons: Season[]): boolean {
  if (!seasonToRepeat.fieldIds || seasonToRepeat.fieldIds.length === 0) return true;
  
  const activeFieldIds = new Set<string>();
  for (const activeSeason of activeSeasons) {
    if (activeSeason.fieldIds) {
      for (const fieldId of activeSeason.fieldIds) {
        activeFieldIds.add(fieldId);
      }
    }
  }

  return !seasonToRepeat.fieldIds.some(id => activeFieldIds.has(id));
}
