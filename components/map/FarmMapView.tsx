"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import Map, { MapRef } from './Map';
import { IMapProvider } from '@/lib/domain/interfaces/IMapProvider';
import { Field } from '@/lib/domain/field';
import { FirestoreFieldRepository } from '@/lib/infrastructure/firebase/FirestoreFieldRepository';
import { db } from '@/lib/firebase';

export interface FarmMapViewRef {
  getProvider: () => IMapProvider | null;
  reloadFields: () => Promise<void>;
}

interface FarmMapViewProps {
  farmId: string | null;
  centerCoordinates?: [number, number] | null;
  selectedFieldIds: string[];
  onFieldClick?: (fieldId: string) => void;
  onMapClick?: () => void;
  onFieldsLoaded?: (fields: Field[]) => void;
  onReady?: (provider: IMapProvider) => void;
  className?: string;
}

const FarmMapView = forwardRef<FarmMapViewRef, FarmMapViewProps>(({
  farmId,
  centerCoordinates,
  selectedFieldIds,
  onFieldClick,
  onMapClick,
  onFieldsLoaded,
  onReady,
  className
}, ref) => {
  const mapRef = useRef<MapRef>(null);
  const [mapProvider, setMapProvider] = useState<IMapProvider | null>(null);
  const [fields, setFields] = useState<Field[]>([]);

  const handleMapReady = (provider: IMapProvider) => {
    setMapProvider(provider);
    if (onReady) {
      onReady(provider);
    }
  };

  // Función para cargar los fields de la base de datos
  const loadFields = useCallback(async () => {
    if (!farmId) {
      setFields([]);
      if (onFieldsLoaded) {
        onFieldsLoaded([]);
      }
      return;
    }

    try {
      const fieldRepo = new FirestoreFieldRepository(db);
      const domainFields = await fieldRepo.listByFarmId(farmId);
      setFields(domainFields);
      if (onFieldsLoaded) {
        onFieldsLoaded(domainFields);
      }
    } catch (err) {
      console.error("Error al cargar lotes en FarmMapView:", err);
    }
  }, [farmId, onFieldsLoaded]);

  // Exponer métodos imperativos
  useImperativeHandle(ref, () => ({
    getProvider: () => mapProvider,
    reloadFields: loadFields
  }), [mapProvider, loadFields]);

  // Referencias para evitar re-renders por cambios en las funciones callbacks
  const onFieldClickRef = useRef(onFieldClick);
  const onMapClickRef = useRef(onMapClick);
  const selectedFieldIdsRef = useRef(selectedFieldIds);

  useEffect(() => {
    onFieldClickRef.current = onFieldClick;
    onMapClickRef.current = onMapClick;
    selectedFieldIdsRef.current = selectedFieldIds;
  }, [onFieldClick, onMapClick, selectedFieldIds]);

  // 1. Cargar fields cuando cambia el farmId
  useEffect(() => {
    loadFields();
  }, [loadFields]);

  // 2. Centrar mapa cuando cambia la finca
  useEffect(() => {
    if (mapProvider && centerCoordinates) {
      mapProvider.setCenter(centerCoordinates);
    }
  }, [centerCoordinates, mapProvider]);

  // 3. Configurar eventos generales del mapa (click en el fondo)
  useEffect(() => {
    if (!mapProvider) return;
    mapProvider.onMapClick(() => {
      if (onMapClickRef.current) {
        onMapClickRef.current();
      }
    });
  }, [mapProvider]);

  // 4. Dibujar polígonos reactivamente cuando cambien los fields o el provider
  useEffect(() => {
    if (!mapProvider) return;

    mapProvider.clearPolygons();

    const activeFields = fields.filter(f => f.dateHourDown === null || f.dateHourDown === undefined);

    activeFields.forEach(async (field) => {
      await mapProvider.drawPolygon(field.area, "#09ff00ff", {
        id: field.id,
        onClick: (id) => {
          if (onFieldClickRef.current) {
            onFieldClickRef.current(id);
          }
        }
      });
    });

    // Volver a aplicar el highlight después de dibujar usando el ref actualizado
    if (selectedFieldIdsRef.current.length > 0) {
      setTimeout(() => {
        mapProvider.highlightPolygon(selectedFieldIdsRef.current);
      }, 50);
    }
  }, [fields, mapProvider]);

  // 5. Actualizar resaltado de parcelas seleccionadas
  useEffect(() => {
    if (mapProvider) {
      mapProvider.highlightPolygon(selectedFieldIds);
    }
  }, [selectedFieldIds, mapProvider]);

  return (
    <div className={className || "w-full h-full relative flex-1"}>
      <Map ref={mapRef} onReady={handleMapReady} />
    </div>
  );
});

FarmMapView.displayName = 'FarmMapView';

export default FarmMapView;
