import { Field } from '../field';

export interface FieldDTO {
  id?: string;
  name: string;
  totalArea: number;
  area: { lat: number; lng: number }[];
  description: string;
  tags: string[];
}

export class FieldDTOConverter {
  static toDTO(field: Field): FieldDTO {
    return {
      id: field.id,
      name: field.name,
      totalArea: field.totalArea,
      area: field.area.map(([lat, lng]) => ({ lat, lng })),
      description: field.description,
      tags: field.tags,
    };
  }

  static fromDTO(dto: FieldDTO): Field {
    return {
      id: dto.id || '',
      name: dto.name,
      totalArea: dto.totalArea,
      area: dto.area.map(({ lat, lng }) => [lat, lng]),
      description: dto.description || '',
      tags: dto.tags || [],
      dateHourDown: null,
    };
  }
}
