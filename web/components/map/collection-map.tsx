'use client';

import { useEffect, useRef, useState } from 'react';
import type { CollectionPoint } from '@/lib/api';

interface CollectionMapProps {
  points: CollectionPoint[];
  center?: [number, number];
  zoom?: number;
  onPointClick?: (point: CollectionPoint) => void;
  selectedId?: string | null;
}

type MarkerLike = {
  remove?: () => void;
  setIcon?: (nextIcon: unknown) => void;
  openPopup?: () => void;
};

function hasViewChanged(
  previous: { center: [number, number]; zoom: number } | null,
  nextCenter: [number, number],
  nextZoom: number,
) {
  if (!previous) return true;

  const sameLat = Math.abs(previous.center[0] - nextCenter[0]) < 0.00001;
  const sameLng = Math.abs(previous.center[1] - nextCenter[1]) < 0.00001;
  const sameZoom = previous.zoom === nextZoom;

  return !(sameLat && sameLng && sameZoom);
}

export function CollectionMap({
  points,
  center = [-23.5505, -46.6333],
  zoom = 13,
  onPointClick,
  selectedId,
}: CollectionMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<ReturnType<typeof import('leaflet')['map']> | null>(null);
  const markersRef = useRef<Map<string, MarkerLike>>(new Map());
  const lastViewRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const lastOpenedPopupIdRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    let isMounted = true;
    let resizeTimer: number | null = null;
    let removeResizeListener = () => {};

    import('leaflet').then((L) => {
      if (!isMounted || !mapRef.current || mapInstanceRef.current) {
        return;
      }

      delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current, { zoomControl: false }).setView(center, zoom);
      mapInstanceRef.current = map;
      lastViewRef.current = { center, zoom };
      setMapReady(true);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const invalidateMap = () => {
        map.invalidateSize({ animate: false });
      };

      window.requestAnimationFrame(invalidateMap);
      window.setTimeout(invalidateMap, 180);

      const handleResize = () => {
        if (resizeTimer) {
          window.clearTimeout(resizeTimer);
        }

        resizeTimer = window.setTimeout(() => {
          map.invalidateSize({ animate: false });
        }, 150);
      };

      window.addEventListener('resize', handleResize);
      removeResizeListener = () => {
        window.removeEventListener('resize', handleResize);
      };
    });

    return () => {
      isMounted = false;
      removeResizeListener();

      if (resizeTimer) {
        window.clearTimeout(resizeTimer);
      }

      markersRef.current.forEach((marker) => marker.remove?.());
      markersRef.current.clear();
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      lastViewRef.current = null;
      lastOpenedPopupIdRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;

    if (!map || !hasViewChanged(lastViewRef.current, center, zoom)) {
      return;
    }

    map.setView(center, zoom, { animate: false });
    lastViewRef.current = { center, zoom };
  }, [center, zoom]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) {
      return;
    }

    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled || !mapInstanceRef.current) {
        return;
      }

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

      const currentIds = new Set(points.map((point) => point.id));
      markersRef.current.forEach((marker, id) => {
        if (!currentIds.has(id)) {
          marker.remove?.();
          markersRef.current.delete(id);
        }
      });

      points.forEach((point) => {
        const icon = point.id === selectedId ? selectedIcon : defaultIcon;
        const popupDescription = point.description ?? point.address ?? 'Perfil publico ativo.';
        const popupRole = point.role === 'NGO' ? 'ONG parceira' : 'Ponto de coleta';

        if (markersRef.current.has(point.id)) {
          markersRef.current.get(point.id)?.setIcon?.(icon);
          return;
        }

        const marker = L.marker([point.latitude, point.longitude], { icon })
          .addTo(mapInstanceRef.current!)
          .bindPopup(`
            <div style="font-family: ui-sans-serif, system-ui, sans-serif; min-width: 180px">
              <p style="font-weight:700;font-size:13px;color:#00333c;margin:0 0 4px">
                ${point.organizationName ?? point.name}
              </p>
              <p style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#6b7280;margin:0 0 6px">
                ${popupRole}
              </p>
              <p style="font-size:11px;color:#4b5563;line-height:1.5;margin:0 0 8px">
                ${popupDescription}
              </p>
              ${
                point.distanceKm != null
                  ? `<p style="font-size:11px;font-weight:600;color:#006a62;margin:0">${point.distanceKm}km de distancia</p>`
                  : ''
              }
            </div>
          `);

        if (onPointClick) {
          marker.on('click', () => onPointClick(point));
        }

        markersRef.current.set(point.id, marker);
      });

      if (selectedId && lastOpenedPopupIdRef.current !== selectedId) {
        markersRef.current.get(selectedId)?.openPopup?.();
        lastOpenedPopupIdRef.current = selectedId;
      }

      if (!selectedId) {
        lastOpenedPopupIdRef.current = null;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mapReady, onPointClick, points, selectedId]);

  return <div ref={mapRef} className="h-full w-full overflow-hidden rounded-[1.75rem]" />;
}
