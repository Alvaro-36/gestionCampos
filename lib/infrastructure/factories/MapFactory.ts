import { IMapProvider } from '../interfaces/IMapProvider';
import { GoogleMapsAdapter } from '../adapters/GoogleMapsAdapter';

export class MapFactory {
    /**
     * Factory method to get an instance of a map provider.
     * Currently returns GoogleMapsAdapter by default, but could be extended
     * to return other providers (e.g. LeafletAdapter, MapboxAdapter) based on config.
     * 
     * @param provider The name of the map provider (defaults to 'google')
     * @returns An implementation of IMapProvider
     */
    static getMapProvider(provider: string = 'google'): IMapProvider {
        switch (provider.toLowerCase()) {
            case 'google':
                return new GoogleMapsAdapter();
            // case 'leaflet':
            //     return new LeafletAdapter();
            default:
                console.warn(`Map provider '${provider}' not found. Falling back to default (Google Maps).`);
                return new GoogleMapsAdapter();
        }
    }
}
