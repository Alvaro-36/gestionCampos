export type Coordinate = [number, number];
export type PolygonVertices = Coordinate[];

export interface IMapProvider {
    /**
     * Initializes the map in the given HTML element container.
     */
    initMap(container: HTMLElement, options?: any): Promise<void>;

    /**
     * Enters a mode to select a polygon area by clicking on the map.
     * Returns the selected vertices.
     */
    selectMapArea(): Promise<PolygonVertices>;

    /**
     * Centers the map at the given coordinates.
     */
    setCenter(coords: Coordinate): void;

    /**
     * Sets a callback for when the map background is clicked.
     */
    onMapClick(callback: () => void): void;

    /**
     * Draws a polygon on the map with the given vertices and color.
     * Optionally takes an ID and a callback for click events.
     */
    drawPolygon(vertices: PolygonVertices, color: string, options?: { id?: string, onClick?: (id: string) => void }): Promise<any>;

    /**
     * Highlights a specific polygon by its ID and resets others.
     * Pass null to reset all highlights.
     */
    highlightPolygon(id: string | null): void;

    /**
     * Calculates the area of the given polygon in square meters.
     */
    getPolygonArea(polygon: any): Promise<number>;

    /**
     * Removes the last vertex added during the current selection process.
     */
    undoLastVertex(): void;

    /**
     * Clears any active area selection markers and listeners.
     */
    clearAreaSelection(): void;
    
    /**
     * Removes all drawn polygons from the map.
     */
    clearPolygons(): void;

    /**
     * Removes a specific polygon by its ID from the map.
     */
    removePolygon(id: string): void;
    
    /**
     * Cleans up the map and releases resources.
     */
    destroyMap(): void;
}
