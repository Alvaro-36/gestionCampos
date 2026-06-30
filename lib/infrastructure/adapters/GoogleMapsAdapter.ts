import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

let mapsOptionsSet = false;
import chroma from 'chroma-js';
import { IMapProvider, PolygonVertices, Coordinate } from '../../domain/interfaces/IMapProvider';

export class GoogleMapsAdapter implements IMapProvider {
    private map: google.maps.Map | null = null;
    private markers: google.maps.marker.AdvancedMarkerElement[] = [];
    private currentVertices: PolygonVertices = [];
    private polygons: Map<string, google.maps.Polygon> = new Map();
    private selectionClickListener: google.maps.MapsEventListener | null = null;
    private persistentMapClickListener: google.maps.MapsEventListener | null = null;
    private isDrawing: boolean = false;

    async initMap(container: HTMLElement, options?: any): Promise<void> {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not defined in environment variables');
        }

        if (!mapsOptionsSet) {
            setOptions({
                key: apiKey,
                libraries: ['maps', 'marker', 'geometry']
            });
            mapsOptionsSet = true;
        }

        const { Map } = await importLibrary('maps') as google.maps.MapsLibrary;
        // Import marker library early to ensure it's loaded when needed
        await importLibrary('marker');

        const defaultCenter = { lat: -33.039211282806335, lng: -68.879563437838 };

        this.map = new Map(container, {
            center: options?.center || defaultCenter,
            zoom: options?.zoom || 15,
            mapTypeId: 'hybrid', // Foto satelital + nombres de calles
            mapTypeControl: false,
            clickableIcons: false, // Desactivar clics en puntos de interés (POIs) para evitar el popup predeterminado
            mapId: options?.mapId || 'DEMO_MAP_ID', // Requerido para AdvancedMarkerElement
            ...options
        });
    }

    setCenter(coords: Coordinate): void {
        if (this.map) {
            this.map.setCenter({ lat: coords[0], lng: coords[1] });
        }
    }

    async selectMapArea(): Promise<PolygonVertices> {
        if (!this.map) {
            throw new Error("Map is not initialized. Call initMap first.");
        }

        const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary;

        return new Promise((resolve) => {
            this.currentVertices = [];
            this.isDrawing = true;
            this.clearAreaSelection();
            this.map!.setOptions({ draggableCursor: 'crosshair' });

            this.selectionClickListener = this.map!.addListener("click", (e: google.maps.MapMouseEvent) => {
                if (e.latLng) {
                    const lat = e.latLng.lat();
                    const lng = e.latLng.lng();
                    
                    // Si ya hay al menos 3 puntos, comprobamos si el clic está cerca del primero
                    if (this.currentVertices.length >= 3) {
                        const firstLat = this.currentVertices[0][0];
                        const firstLng = this.currentVertices[0][1];
                        // calcular dist entre puntos
                        const dist = Math.sqrt(Math.pow(lat - firstLat, 2) + Math.pow(lng - firstLng, 2));

                        // Umbral de tolerancia (0.0005 grados son aprox 50 metros)
                        if (dist < 0.0005) {
                            const result = [...this.currentVertices];
                            this.clearAreaSelection();
                            resolve(result);
                            return;
                        }
                    }
                    
                    console.log(`Clic ${this.currentVertices.length + 1}: Latitud:`, lat, "Longitud:", lng);
                    this.currentVertices.push([lat, lng]);
                    
                    // marcador para ir viendo los vertices elegidos
                    const marker = new AdvancedMarkerElement({
                        map: this.map,
                        position: { lat, lng }
                    });
                    this.markers.push(marker);
                }
            });
        });
    }

    onMapClick(callback: () => void): void {
        if (!this.map) return;
        if (this.persistentMapClickListener) {
            google.maps.event.removeListener(this.persistentMapClickListener);
        }
        this.persistentMapClickListener = this.map.addListener('click', (e: google.maps.MapMouseEvent) => {
            console.log("Click en fondo del mapa. ¿Dibujando?:", this.isDrawing);
            // Solo disparamos el callback si no estamos en modo dibujo
            if (!this.isDrawing) {
                callback();
            }
        });
    }

    async drawPolygon(vertices: PolygonVertices, color: string, options?: { id?: string, onClick?: (id: string) => void }): Promise<google.maps.Polygon> {
        if (!this.map) {
            throw new Error("Map is not initialized. Call initMap first.");
        }

        const polygonCoords: google.maps.LatLngLiteral[] = vertices.map((vertex: Coordinate) => ({
            lat: vertex[0],
            lng: vertex[1]
        }));

        const fillColor = color;
        const borderColor = chroma(fillColor).darken(1).hex();
        
        const polygon = new google.maps.Polygon({
            paths: polygonCoords,
            strokeColor: borderColor,
            strokeOpacity: 1.0,
            strokeWeight: 2,
            fillColor: fillColor,
            fillOpacity: 0.35,
            clickable: true
        });
        
        if (options?.onClick) {
            polygon.addListener('click', (e: google.maps.MapMouseEvent) => {
                // Prevenir que el clic se propague al mapa si es necesario
                // Aunque en este caso queremos que si isDrawing es false, se seleccione el area
                if (!this.isDrawing) {
                    options.onClick?.(options.id || 'unknown');
                }
            });
        }
        
        polygon.setMap(this.map);
        const polyId = options?.id || `poly-${Date.now()}`;
        this.polygons.set(polyId, polygon);
        
        return polygon;
    }

    highlightPolygon(id: string | null): void {
        this.polygons.forEach((polygon, polyId) => {
            if (polyId === id) {
                // Seleccionado: Más opaco y borde más grueso
                polygon.setOptions({
                    fillOpacity: 0.7,
                    strokeWeight: 5,
                    zIndex: 1000
                });
            } else {
                // No seleccionado: Opacidad original y borde normal
                polygon.setOptions({
                    fillOpacity: 0.35,
                    strokeWeight: 2,
                    zIndex: 1
                });
            }
        });
    }

    async getPolygonArea(polygon: any): Promise<number> {
        const geometryLibrary = await google.maps.importLibrary("geometry") as google.maps.GeometryLibrary;
        const googlePolygon = polygon as google.maps.Polygon;
        return geometryLibrary.spherical.computeArea(googlePolygon.getPath());
    }

    clearAreaSelection(): void {
        this.isDrawing = false;
        if (this.selectionClickListener) {
            google.maps.event.removeListener(this.selectionClickListener);
            this.selectionClickListener = null;
        }

        for (const marker of this.markers) {
            marker.map = null;
        }
        this.markers = [];
        
        if (this.map) {
            this.map.setOptions({ draggableCursor: null });
        }
        this.currentVertices = [];
    }

    clearPolygons(): void {
        this.polygons.forEach(polygon => {
            polygon.setMap(null);
        });
        this.polygons.clear();
    }

    removePolygon(id: string): void {
        const polygon = this.polygons.get(id);
        if (polygon) {
            polygon.setMap(null);
            this.polygons.delete(id);
        }
    }

    undoLastVertex(): void {
        if (this.currentVertices.length > 0) {
            this.currentVertices.pop();
            const marker = this.markers.pop();
            if (marker) {
                marker.map = null;
            }
        }
    }

    destroyMap(): void {
        this.clearAreaSelection();
        if (this.persistentMapClickListener) {
            google.maps.event.removeListener(this.persistentMapClickListener);
        }
        this.map = null;
    }
}
