import { Coordinate, IFarmRepository } from '../farm';
import { Field } from '../field';

export class FarmService {
  constructor(
    private farmRepo: IFarmRepository
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
   * Updates the farm center using the center of a specific field.
   * Useful to call when the first field is created.
   */
  async syncFarmCenterWithField(farmId: string, field: Omit<Field, 'id'>): Promise<void> {
    const fieldCenter = this.calculateFieldCenter(field);
    
    const farm = await this.farmRepo.getById(farmId);
    if (farm) {
      await this.farmRepo.update({
        ...farm,
        centerCoordinates: fieldCenter
      });
      console.log(`Finca ${farmId} centrada en el cuadro:`, fieldCenter);
    }
  }
}
