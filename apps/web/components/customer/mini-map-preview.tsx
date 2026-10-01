'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { SERVICEGO_BRANCHES } from './branch-map-modal';

interface MiniMapPreviewProps {
  onOpenFullMap?: () => void;
}

export function MiniMapPreview({ onOpenFullMap }: MiniMapPreviewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isSubscribed = true;

    // 1. Ensure Leaflet CSS is present
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const initMiniMap = () => {
      if (!isSubscribed || !mapContainerRef.current) return;
      const L = (window as any).L;
      if (!L) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Initialize compact mini-map
      const map = L.map(mapContainerRef.current, {
        center: [-6.35, 106.81],
        zoom: 10,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add 5 ServiceGo markers: Red diamond (ketupat) pin design with clean white outline
      SERVICEGO_BRANCHES.forEach((branch) => {
        const markerHtml = `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-50%, -50%); pointer-events: none;">
            <div style="width: 10px; height: 10px; background: #dc2626; border: 2px solid #ffffff; transform: rotate(45deg); box-shadow: 0 1px 4px rgba(0,0,0,0.45);"></div>
          </div>
        `;

        L.marker([branch.lat, branch.lng], {
          icon: L.divIcon({
            className: 'mini-servicego-marker',
            html: markerHtml,
            iconSize: [0, 0]
          }),
          interactive: false
        }).addTo(map);
      });

      // Add user location pulse dot in Depok/Margonda area
      const userDotHtml = `
        <div style="position: relative; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%); pointer-events: none;">
          <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: rgba(37,99,235,0.3); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 10px; height: 10px; border-radius: 50%; background: #2563eb; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(37,99,235,0.6);"></div>
        </div>
      `;

      L.marker([-6.365, 106.828], {
        icon: L.divIcon({
          className: 'mini-user-marker',
          html: userDotHtml,
          iconSize: [0, 0]
        }),
        interactive: false
      }).addTo(map);

      // Fit bounds to display Jabodetabek cluster neatly
      try {
        const bounds = L.latLngBounds(
          SERVICEGO_BRANCHES.map((b) => [b.lat, b.lng])
        );
        map.fitBounds(bounds, {
          padding: [14, 14],
          maxZoom: 10
        });
      } catch {
        // Fallback to center
      }

      setIsLoaded(true);

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    };

    // 2. Ensure Leaflet JS is available
    if ((window as any).L) {
      initMiniMap();
    } else {
      let script = document.getElementById('leaflet-js') as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        document.body.appendChild(script);
      }
      script.addEventListener('load', initMiniMap);
    }

    return () => {
      isSubscribed = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenFullMap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenFullMap?.();
        }
      }}
      className="isolate relative h-32 sm:h-36 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 group cursor-pointer shadow-inner select-none transition-all duration-200 hover:ring-2 hover:ring-primary-500/25 hover:border-primary-400 dark:hover:border-primary-500"
      title="Buka peta interaktif ServiceGo"
    >
      {/* Real OpenStreetMap Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0 pointer-events-none" />

      {/* Loading state before map tiles render */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center gap-1.5 z-10 text-slate-400">
          <MapPin className="h-5 w-5 text-primary-500 animate-bounce" />
          <span className="text-[11px] font-medium">Memuat peta Jabodetabek...</span>
        </div>
      )}

      {/* Top right: Live Map Badge */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-[10px] font-semibold text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-sm pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>Peta Langsung</span>
      </div>

      {/* Margonda indicator badge */}
      <div className="absolute bottom-2 left-2 z-10 text-[9.5px] font-bold bg-white/95 dark:bg-slate-900/95 px-1.5 py-0.5 rounded shadow border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 pointer-events-none">
        📍 Margonda 1.2km
      </div>
    </div>
  );
}
