"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { MapFactory } from '@/lib/infrastructure/factories/MapFactory';
import { IMapProvider } from '@/lib/domain/interfaces/IMapProvider';

export interface MapRef {
    getProvider: () => IMapProvider | null;
}

interface MapProps {
    provider?: string;
    options?: any;
    className?: string;
    onReady?: (provider: IMapProvider) => void;
}

const Map = forwardRef<MapRef, MapProps>(({ provider = 'google', options, className, onReady }, ref) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [mapProvider, setMapProvider] = useState<IMapProvider | null>(null);

    useImperativeHandle(ref, () => ({
        getProvider: () => mapProvider
    }), [mapProvider]);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        const providerInstance = MapFactory.getMapProvider(provider);
        setMapProvider(providerInstance);

        providerInstance.initMap(mapContainerRef.current, options).then(() => {
            if (onReady) onReady(providerInstance);
        }).catch(err => {
            console.error("Error initializing map:", err);
        });

        return () => {
            providerInstance.destroyMap();
        };
    }, [provider, options, onReady]);

    return <div ref={mapContainerRef} className={className} style={{ width: '100%', height: '100%', minHeight: '400px' }} />;
});

Map.displayName = 'Map';

export default Map;
