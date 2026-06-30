import { Farm } from '../farm';

export interface FarmDTO {
  id?: string;
  name: string;
  centerCoordinates: { lat: number; lng: number };
  userIds: string[];
}

export const FarmDTOConverter = {
  toDTO(farm: Farm): FarmDTO {
    return {
      id: farm.id,
      name: farm.name,
      centerCoordinates: {
        lat: farm.centerCoordinates[0],
        lng: farm.centerCoordinates[1],
      },
      userIds: farm.userIds || [],
    };
  },

  fromDTO(dto: FarmDTO): Farm {
    return {
      id: dto.id || '',
      name: dto.name,
      centerCoordinates: [dto.centerCoordinates.lat, dto.centerCoordinates.lng],
      userIds: dto.userIds || [],
    };
  }
};
