'use client';
// web/components/map/collection-map.tsx
// Mapa interativo com Leaflet. Importado dinamicamente para evitar SSR.

import { useEffect, useRef } from 'react';
import type { CollectionPoint } from '@/lib/api';

interface CollectionMapProps {
  points: CollectionPoint[];
  center?: [number, number];
  zoom?: number;
  onPointClick?: (point: CollectionPoint) => void;
  selectedId?: string | null;
}

export function CollectionMap({
  points,
  center = [-23.5505, -46.6333], // São Paulo
  zoom = 13,
  onPointClick,
  selectedId,
}: CollectionMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<ReturnType<typeof import('leaflet')['map']> | null>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (!mapRef.current) return;

    // Leaflet seta _leaflet_id no container quando inicializa.
    // Se já existe, o React StrictMode remontou sem limpar — aguarda o cleanup.
    if ((mapRef.current as any)._leaflet_id) return;

    let map: any;

    import('leaflet').then((L) => {
      // Checa novamente após o import assíncrono (race condition)
      if (!mapRef.current || (mapRef.current as any)._leaflet_id) return;

      // Fix para ícones no Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      map = L.map(mapRef.current!, { zoomControl: false }).setView(center, zoom);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
    });

    return () => {
      // Limpa tudo: remove marcadores, destrói o mapa e limpa refs
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      map?.remove();
      mapInstanceRef.current = null;
    };
  }, []);


  // Atualiza marcadores quando os pontos mudam
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      // Ícone personalizado teal
      const defaultIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:32px;height:32px;
          background:#006a62;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -36],
      });

      const selectedIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:38px;height:38px;
          background:#00333c;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          border:3px solid white;
          box-shadow:0 2px 12px rgba(0,0,0,0.5);
        "></div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -42],
      });

      // Remove marcadores antigos que não estão mais na lista
      const currentIds = new Set(points.map((p) => p.id));
      markersRef.current.forEach((marker, id) => {
        if (!currentIds.has(id)) {
          marker.remove();
          markersRef.current.delete(id);
        }
      });

      // Adiciona/atualiza marcadores
      points.forEach((point) => {
        const isSelected = point.id === selectedId;
        const icon = isSelected ? selectedIcon : defaultIcon;

        if (markersRef.current.has(point.id)) {
          markersRef.current.get(point.id)?.setIcon(icon);
        } else {
          const marker = L.marker([point.latitude, point.longitude], { icon })
            .addTo(mapInstanceRef.current!)
            .bindPopup(`
              <div style="font-family:Inter,sans-serif;min-width:160px">
                <p style="font-weight:700;font-size:13px;color:#00333c;margin:0 0 2px">
                  ${point.organizationName ?? point.name}
                </p>
                <p style="font-size:11px;color:#666;margin:0 0 6px">
                  ${point.address ?? ''}${point.city ? ` • ${point.city}` : ''}
                </p>
                ${point.distanceKm != null ? `<p style="font-size:11px;font-weight:600;color:#006a62;margin:0">${point.distanceKm}km de distância</p>` : ''}
              </div>
            `);

          if (onPointClick) {
            marker.on('click', () => onPointClick(point));
          }

          markersRef.current.set(point.id, marker);
        }
      });
    });
  }, [points, selectedId, onPointClick]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-2xl overflow-hidden"
      style={{ minHeight: '300px' }}
    />
  );
}
