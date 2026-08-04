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

    const onReadyRef = useRef(onReady);
    useEffect(() => {
        onReadyRef.current = onReady;
    }, [onReady]);

    const optionsRef = useRef(options);
    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        const providerInstance = MapFactory.getMapProvider(provider);
        setMapProvider(providerInstance);

        providerInstance.initMap(mapContainerRef.current, optionsRef.current).then(() => {
            if (onReadyRef.current) onReadyRef.current(providerInstance);
        }).catch((err: any) => {
            console.error("Error initializing map:", err);
        });

        return () => {
            providerInstance.destroyMap();
        };
    }, [provider]); // Solo reinicializar si cambia el provider principal

    return <div ref={mapContainerRef} className={className} style={{ width: '100%', height: '100%', minHeight: '400px' }} />;
});

Map.displayName = 'Map';

export default Map;
