'use client';

import { useEffect, useRef, useState } from 'react';
import type { CollectionPoint } from '@/lib/api';
import { formatAddressSummary } from '@/lib/address';

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

function getMarkerColors(point: CollectionPoint, selected: boolean) {
  if (point.role === 'NGO') {
    return selected
      ? { fill: '#312e81', shadow: 'rgba(49,46,129,0.45)' }
      : { fill: '#4f46e5', shadow: 'rgba(79,70,229,0.35)' };
  }

  if (point.donationEligibility?.canDonateHere === false) {
    return selected
      ? { fill: '#92400e', shadow: 'rgba(146,64,14,0.45)' }
      : { fill: '#d97706', shadow: 'rgba(217,119,6,0.35)' };
  }

  return selected
    ? { fill: '#00333c', shadow: 'rgba(0,51,60,0.45)' }
    : { fill: '#006a62', shadow: 'rgba(0,106,98,0.35)' };
}

function buildMarkerIcon(point: CollectionPoint, selected: boolean, size: 32 | 38) {
  const colors = getMarkerColors(point, selected);
  const iconSize = size;
  const iconAnchorX = size / 2;
  const iconAnchorY = size;
  const popupAnchorY = size + 4;

  return {
    html: `<div style="
      width:${iconSize}px;
      height:${iconSize}px;
      background:${colors.fill};
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid white;
      box-shadow:0 2px 10px ${colors.shadow};
    "></div>`,
    iconSize: [iconSize, iconSize] as [number, number],
    iconAnchor: [iconAnchorX, iconAnchorY] as [number, number],
    popupAnchor: [0, -popupAnchorY] as [number, number],
  };
}

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
  center = [-23.50153, -47.45256],
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

      const currentIds = new Set(points.map((point) => point.id));
      markersRef.current.forEach((marker, id) => {
        if (!currentIds.has(id)) {
          marker.remove?.();
          markersRef.current.delete(id);
        }
      });

      points.forEach((point) => {
        const icon = L.divIcon({
          className: '',
          ...buildMarkerIcon(point, point.id === selectedId, point.id === selectedId ? 38 : 32),
        });
        const popupDescription =
          point.description ?? formatAddressSummary(point) ?? 'Perfil publico ativo.';
        const popupRole = point.role === 'NGO' ? 'ONG parceira' : 'Ponto de coleta';
        const popupEligibility = point.donationEligibility
          ? `<div style="margin-top:8px;padding:8px 10px;border-radius:12px;background:${
              point.donationEligibility.canDonateHere ? '#ecfdf5' : '#fffbeb'
            };color:${point.donationEligibility.canDonateHere ? '#047857' : '#92400e'}">
              <p style="margin:0;font-size:11px;font-weight:700">${point.donationEligibility.label}</p>
              <p style="margin:4px 0 0;font-size:11px;line-height:1.5">${point.donationEligibility.message}</p>
            </div>`
          : '';

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
              ${popupEligibility}
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
