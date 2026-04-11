'use client';

import { useEffect, useRef } from 'react';
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
  const latestCenterRef = useRef(center);
  const latestZoomRef = useRef(zoom);

  latestCenterRef.current = center;
  latestZoomRef.current = zoom;

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    let isMounted = true;
    let frameId: number | null = null;
    let timeoutId: number | null = null;
    let observer: ResizeObserver | null = null;
    let invalidateMap = () => {};

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

      const map = L.map(mapRef.current, { zoomControl: false }).setView(
        latestCenterRef.current,
        latestZoomRef.current,
      );
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      invalidateMap = () => {
        if (frameId != null) {
          window.cancelAnimationFrame(frameId);
        }

        frameId = window.requestAnimationFrame(() => {
          map.invalidateSize({ animate: false });
        });

        if (timeoutId != null) {
          window.clearTimeout(timeoutId);
        }

        timeoutId = window.setTimeout(() => {
          map.invalidateSize({ animate: false });
        }, 180);
      };

      invalidateMap();
      window.addEventListener('resize', invalidateMap);

      observer =
        typeof window.ResizeObserver === 'function'
          ? new window.ResizeObserver(() => invalidateMap())
          : null;

      observer?.observe(mapRef.current);
    });

    return () => {
      isMounted = false;
      window.removeEventListener('resize', invalidateMap);
      observer?.disconnect();

      if (frameId != null) {
        window.cancelAnimationFrame(frameId);
      }

      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }

      markersRef.current.forEach((marker) => marker.remove?.());
      markersRef.current.clear();
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.setView(center, zoom, { animate: true });

    const resizeHandle = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 120);

    return () => {
      window.clearTimeout(resizeHandle);
    };
  }, [center, zoom]);

  useEffect(() => {
    if (!mapInstanceRef.current) {
      return;
    }

    import('leaflet').then((L) => {
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

      if (selectedId) {
        markersRef.current.get(selectedId)?.openPopup?.();
      }
    });
  }, [onPointClick, points, selectedId]);

  return (
    <div
      ref={mapRef}
      className="h-full w-full overflow-hidden rounded-[1.75rem]"
      style={{ minHeight: '100%' }}
    />
  );
}
