import { Coordinate, IFarmRepository } from '../farm';
import { Field, IFieldRepository } from '../field';

export class FarmService {
  constructor(
    private farmRepo: IFarmRepository,
    private fieldRepo: IFieldRepository
  ) {}

  /**
   * Calculates the center of a single field using the Bounding Box method
   * (Equivalent to google.maps.LatLngBounds).
   */
  public calculateFieldCenter(field: Omit<Field, 'id'>): Coordinate {
    const coords = field.area;
    
    if (coords.length === 0) return [0, 0];

    let minLat = coords[0][0];
    let maxLat = coords[0][0];
    let minLng = coords[0][1];
    let maxLng = coords[0][1];

    for (const [lat, lng] of coords) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }

    return [
      (minLat + maxLat) / 2,
      (minLng + maxLng) / 2
    ];
  }

  /**
   * Updates the farm center by averaging the centers of all fields belonging to this farm.
   */
  async syncFarmCenterWithField(farmId: string): Promise<void> {
    const farm = await this.farmRepo.getById(farmId);
    if (!farm) return;

    // Obtener todos los campos de la finca
    const fields = await this.fieldRepo.listByFarmId(farmId);
    if (fields.length === 0) return;

    let sumLat = 0;
    let sumLng = 0;

    for (const field of fields) {
      const center = this.calculateFieldCenter(field);
      sumLat += center[0];
      sumLng += center[1];
    }

    const avgCenter: Coordinate = [
      sumLat / fields.length,
      sumLng / fields.length
    ];

    await this.farmRepo.update({
      ...farm,
      centerCoordinates: avgCenter
    });
    console.log(`Finca ${farmId} centrada en el promedio de sus campos:`, avgCenter);
  }
}
