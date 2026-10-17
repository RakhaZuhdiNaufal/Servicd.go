'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  X,
  MapPin,
  Star,
  Clock,
  Phone,
  ExternalLink,
  ChevronRight,
  Car,
  CheckCircle2,
  Navigation,
  Search,
  Share2,
  Calendar,
  ChevronLeft,
  Wrench,
  Check
} from 'lucide-react';
import { clsx } from 'clsx';
import { WorkshopFront, WorkshopSmall } from '@/components/illustrations/workshop';

export interface ServiceGoBranchLocation {
  id: string;
  name: string;
  city: 'Jakarta' | 'Depok' | 'Bogor';
  cityLabel: string;
  address: string;
  phone: string;
  hours: string;
  rating: number;
  reviewsCount: number;
  lat: number;
  lng: number;
  distance: string;
  badge: string;
  specialty: string;
}

// Satu-satunya bengkel ServiceGo (sama dengan data seed). Gambar bengkel memakai ilustrasi SVG,
// bukan foto.
export const SERVICEGO_BRANCHES: ServiceGoBranchLocation[] = [
  {
    id: '11111111-1111-1111-1111-111111111113',
    name: 'ServiceGo Depok',
    city: 'Depok',
    cityLabel: 'Kota Depok',
    address: 'Jl. Margonda Raya No. 45, Beji, Kota Depok',
    phone: '021-77201234',
    hours: 'Slot datang 08.00 sampai 16.00 WIB',
    rating: 4.8,
    reviewsCount: 1240,
    lat: -6.3725,
    lng: 106.8327,
    distance: '1.2 km',
    badge: 'Bengkel ServiceGo',
    specialty: 'Ganti Oli · Rem · Tune-up · AC Mobil'
  }
];

interface BranchMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBranchId?: string;
}

export function BranchMapModal({ isOpen, onClose, initialBranchId }: BranchMapModalProps) {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState<'All' | 'Jakarta' | 'Depok' | 'Bogor'>('All');
  const [activeBranch, setActiveBranch] = useState<ServiceGoBranchLocation>(SERVICEGO_BRANCHES[0]);
  const activeBranchIdRef = useRef<string>(initialBranchId || SERVICEGO_BRANCHES[0].id);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Search states & refs
  const [searchInput, setSearchInput] = useState(
    (initialBranchId ? SERVICEGO_BRANCHES.find((b) => b.id === initialBranchId) : null)?.name ||
      SERVICEGO_BRANCHES[0].name
  );
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync search input when activeBranch changes, provided user is not actively typing
  useEffect(() => {
    if (!isSearchFocused) {
      setSearchInput(activeBranch.name);
    }
  }, [activeBranch, isSearchFocused]);

  // Close search suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  // Live autocomplete matches based on search query
  const searchMatches = SERVICEGO_BRANCHES.filter((b) => {
    const q = searchInput.toLowerCase().trim();
    if (!q) return true;
    return (
      b.name.toLowerCase().includes(q) ||
      b.city.toLowerCase().includes(q) ||
      b.cityLabel.toLowerCase().includes(q) ||
      b.address.toLowerCase().includes(q) ||
      b.specialty.toLowerCase().includes(q) ||
      b.badge.toLowerCase().includes(q)
    );
  });

  const isCustomQuery =
    isSearchFocused &&
    searchInput.trim().length > 0 &&
    searchInput.trim().toLowerCase() !== activeBranch.name.toLowerCase();

  const filteredBranches = SERVICEGO_BRANCHES.filter((b) => {
    if (selectedCity !== 'All' && b.city !== selectedCity) return false;
    if (isCustomQuery) {
      const q = searchInput.toLowerCase().trim();
      return (
        b.name.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q) ||
        b.cityLabel.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        b.specialty.toLowerCase().includes(q) ||
        b.badge.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Lock body scroll when drawer is open to prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Open Google Maps in a new tab
  const handleOpenGoogleMaps = (branch: ServiceGoBranchLocation) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${branch.lat},${branch.lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Select branch and navigate to booking
  const handleBookingAtBranch = (branch: ServiceGoBranchLocation) => {
    onClose();
    router.push(`/booking/new?branch_id=${branch.id}`);
  };

  // Share branch link
  const handleShareBranch = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(
        `${window.location.origin}/booking/new?branch_id=${activeBranch.id}`
      );
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Helper to generate custom marker HTML:
  // - Unselected: Label box is BLACK (#0f172a), bottom diamond/ketupat is RED (#dc2626)
  // - Selected: Both label box and diamond turn BLUE (#2563eb)
  // - Label name: Includes "ServiceGo" name
  const createMarkerHtml = (branch: ServiceGoBranchLocation, isSelected: boolean) => {
    const labelBg = isSelected ? '#2563eb' : '#0f172a';
    const labelShadow = isSelected
      ? '0 4px 14px rgba(37,99,235,0.45)'
      : '0 4px 12px rgba(0,0,0,0.35)';
    // Red diamond when unselected, Blue diamond when selected
    const diamondBg = isSelected ? '#2563eb' : '#dc2626';
    const diamondShadow = isSelected
      ? '0 2px 8px rgba(37,99,235,0.7)'
      : '0 2px 8px rgba(220,38,38,0.8)';

    return `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer; transition: all 0.2s ease;">
        <div style="background: ${labelBg}; color: white; padding: 5px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; box-shadow: ${labelShadow}; white-space: nowrap; border: 2px solid white; display: flex; align-items: center; gap: 5px; transition: background 0.2s ease;">
          <span>🔧</span>
          <span>${branch.name}</span>
        </div>
        <div style="width: 14px; height: 14px; background: ${diamondBg}; border: 2px solid white; transform: rotate(45deg); margin-top: -7px; box-shadow: ${diamondShadow}; transition: background 0.2s ease;"></div>
      </div>
    `;
  };

  // Update all marker icons on the map
  const updateAllMarkers = (activeId: string) => {
    const L = (window as any).L;
    if (!L) return;

    SERVICEGO_BRANCHES.forEach((b) => {
      const marker = markersRef.current.get(b.id);
      if (marker) {
        const isSelected = b.id === activeId;
        const icon = L.divIcon({
          className: 'custom-servicego-marker',
          html: createMarkerHtml(b, isSelected),
          iconSize: [0, 0]
        });
        marker.setIcon(icon);
      }
    });
  };

  // Center and focus branch (Click 1: turns blue & centers; Click 2: opens popup options)
  const focusBranch = (branch: ServiceGoBranchLocation) => {
    const isAlreadyActive = activeBranchIdRef.current === branch.id;

    if (!isAlreadyActive) {
      activeBranchIdRef.current = branch.id;
      setActiveBranch(branch);
      setSearchInput(branch.name);
      updateAllMarkers(branch.id);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.closePopup();
        mapInstanceRef.current.flyTo([branch.lat, branch.lng], 14, {
          duration: 0.8
        });
      }
    } else {
      // Second click on already active branch: open popup options
      const marker = markersRef.current.get(branch.id);
      if (marker) {
        marker.openPopup();
      }
    }
  };

  // Switch city filter, fly map directly to target city, and display relevant workshop(s)
  const handleSelectCity = (city: 'All' | 'Jakarta' | 'Depok' | 'Bogor') => {
    setSelectedCity(city);
    const map = mapInstanceRef.current;
    const L = (window as any).L;

    // Branches in this city
    const branchesInCity =
      city === 'All'
        ? SERVICEGO_BRANCHES
        : SERVICEGO_BRANCHES.filter((b) => b.city === city);

    const primaryBranch = branchesInCity[0] || SERVICEGO_BRANCHES[0];
    activeBranchIdRef.current = primaryBranch.id;
    setActiveBranch(primaryBranch);

    if (map && L) {
      map.closePopup();

      // Show/hide markers based on city filter
      SERVICEGO_BRANCHES.forEach((b) => {
        const marker = markersRef.current.get(b.id);
        if (marker) {
          const isVisible = city === 'All' || b.city === city;
          if (isVisible) {
            if (!map.hasLayer(marker)) {
              marker.addTo(map);
            }
          } else {
            if (map.hasLayer(marker)) {
              map.removeLayer(marker);
            }
          }
        }
      });

      // Update marker icons (active branch is blue, others red)
      updateAllMarkers(primaryBranch.id);

      // Smoothly navigate the map camera
      if (city === 'Bogor') {
        // Fly directly to Kota Bogor branch
        map.flyTo([primaryBranch.lat, primaryBranch.lng], 14, { duration: 0.8 });
      } else if (city === 'Depok') {
        // Direct map to Depok area
        map.flyTo([-6.347, 106.807], 13, { duration: 0.8 });
      } else if (city === 'Jakarta') {
        // Direct map to Jakarta area
        map.flyTo([-6.242, 106.781], 12.5, { duration: 0.8 });
      } else {
        // All branches: fit bounds to frame Jabodetabek
        const bounds = L.latLngBounds(SERVICEGO_BRANCHES.map((b) => [b.lat, b.lng]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12, animate: true });
      }

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    }
  };

  // Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load Leaflet and initialize map
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;

    // 1. Inject Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (!isSubscribed || !mapContainerRef.current) return;
      const L = (window as any).L;
      if (!L) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const targetBranch = initialBranchId
        ? SERVICEGO_BRANCHES.find((b) => b.id === initialBranchId) || SERVICEGO_BRANCHES[0]
        : SERVICEGO_BRANCHES[0];

      activeBranchIdRef.current = targetBranch.id;
      setActiveBranch(targetBranch);

      const map = L.map(mapContainerRef.current, {
        center: [targetBranch.lat, targetBranch.lng],
        zoom: 12,
        scrollWheelZoom: true,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
      markersRef.current.clear();

      // Marker bengkel
      SERVICEGO_BRANCHES.forEach((b) => {
        const isInitialSelected = b.id === targetBranch.id;
        const marker = L.marker([b.lat, b.lng], {
          icon: L.divIcon({
            className: 'custom-servicego-marker',
            html: createMarkerHtml(b, isInitialSelected),
            iconSize: [0, 0]
          })
        }).addTo(map);

        const popupContent = `
          <div style="font-family: inherit; padding: 4px 2px; min-width: 220px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 800; background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 9999px;">
                ${b.cityLabel}
              </span>
              <span style="font-size: 11px; font-weight: 700; color: #f59e0b;">
                ★ ${b.rating}
              </span>
            </div>
            <h4 style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">
              ${b.name}
            </h4>
            <p style="font-size: 11px; color: #64748b; margin: 0 0 6px 0; line-height: 1.4;">
              ${b.address}
            </p>
            <div style="font-size: 10px; color: #059669; font-weight: 600; margin-bottom: 8px;">
              ● Buka Hari Ini (${b.hours})
            </div>
            <div style="display: flex; gap: 6px;">
              <a href="https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background: #0f172a; color: white; padding: 7px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; text-decoration: none;">
                Google Maps ↗
              </a>
              <a href="/booking/new?branch_id=${b.id}" style="flex: 1; text-align: center; background: #2563eb; color: white; padding: 7px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; text-decoration: none;">
                Booking
              </a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          closeButton: true,
          offset: [0, -20]
        });

        // Click handler:
        // 1st click: turns BLUE, updates others to red diamond, closes popup, centers map
        // 2nd click on already active marker: opens the popup with Google Maps / Booking options
        marker.on('click', () => {
          const isAlreadyActive = activeBranchIdRef.current === b.id;

          if (!isAlreadyActive) {
            activeBranchIdRef.current = b.id;
            setActiveBranch(b);
            updateAllMarkers(b.id);
            map.closePopup();
            map.flyTo([b.lat, b.lng], 14, { duration: 0.8 });
          } else {
            marker.openPopup();
          }
        });

        markersRef.current.set(b.id, marker);
      });

      // Recalculate map size during & after drawer slide animation
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 350);
    };

    // 2. Inject Leaflet JS if not already available
    if ((window as any).L) {
      initMap();
    } else {
      let script = document.getElementById('leaflet-js') as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        document.body.appendChild(script);
      }
      script.addEventListener('load', initMap);
    }

    return () => {
      isSubscribed = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, initialBranchId]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 !m-0 !p-0 z-[9999] flex justify-end overflow-hidden">
      {/* Backdrop with Blur covering the remaining part of the website */}
      <div
        className="fixed inset-0 top-0 left-0 right-0 bottom-0 !m-0 !p-0 bg-slate-950/45 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Google Maps Style Slide-over Drawer Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-map-drawer-title"
        className="relative z-10 w-full sm:w-[94vw] md:w-[88vw] lg:w-[80vw] xl:w-[75vw] 2xl:w-[70vw] max-w-[1360px] h-full bg-white dark:bg-slate-900 shadow-2xl flex border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300 ease-out overflow-hidden"
      >
        {/* ───────────────────────────────────────────────────────────── */}
        {/* LEFT: Google Maps Sidebar Panel (Collapsible)                 */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div
          className={clsx(
            'shrink-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-20 shadow-lg relative transition-all duration-300 ease-in-out overflow-hidden',
            isSidebarOpen
              ? 'w-full sm:w-[380px] lg:w-[400px]'
              : 'w-0 border-r-0'
          )}
        >
          {/* Top Search Header Bar (Google Maps Style) */}
          <div
            ref={searchContainerRef}
            className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 relative z-30"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchMatches.length > 0) {
                  const target = searchMatches[0];
                  focusBranch(target);
                  if (selectedCity !== 'All' && target.city !== selectedCity) {
                    setSelectedCity(target.city);
                  }
                  setSearchInput(target.name);
                  setIsSearchFocused(false);
                  searchInputRef.current?.blur();
                }
              }}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/90 rounded-full px-3.5 py-2 shadow-inner border border-slate-200/80 dark:border-slate-700 focus-within:border-primary-500 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-primary-500/20 transition"
            >
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setIsSearchFocused(true);
                }}
                onFocus={() => {
                  setIsSearchFocused(true);
                }}
                placeholder="Cari bengkel, wilayah, layanan..."
                className="text-xs font-semibold text-slate-800 dark:text-slate-100 bg-transparent w-full outline-hidden placeholder:text-slate-400"
              />

              {/* Clear button (when input has text) */}
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setIsSearchFocused(true);
                    searchInputRef.current?.focus();
                  }}
                  title="Hapus pencarian"
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Separator */}
              <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-700 shrink-0" />

              {/* Close Drawer Button */}
              <button
                type="button"
                onClick={onClose}
                title="Tutup Peta"
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </form>

            {/* Google Maps Style Autocomplete Dropdown */}
            {isSearchFocused && (
              <div className="absolute top-full left-3 right-3 mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-80 overflow-y-auto z-40 py-2 divide-y divide-slate-100 dark:divide-slate-800/80 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3.5 py-1.5 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Hasil Pencarian ({searchMatches.length})</span>
                  {searchInput.trim() && (
                    <span className="text-[10px] text-primary-600 dark:text-primary-400 font-medium truncate max-w-[150px]">
                      &quot;{searchInput}&quot;
                    </span>
                  )}
                </div>

                {searchMatches.length > 0 ? (
                  searchMatches.map((branch) => {
                    const isSelected = activeBranch.id === branch.id;
                    return (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => {
                          focusBranch(branch);
                          if (selectedCity !== 'All' && branch.city !== selectedCity) {
                            setSelectedCity(branch.city);
                          }
                          setSearchInput(branch.name);
                          setIsSearchFocused(false);
                        }}
                        className={clsx(
                          'w-full px-3.5 py-2.5 flex items-start gap-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60',
                          isSelected && 'bg-blue-50/70 dark:bg-blue-950/40'
                        )}
                      >
                        <span className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                          <WorkshopSmall decorative cover />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {branch.name}
                            </span>
                            <span className="text-[10px] font-extrabold text-amber-500 shrink-0">
                              ★ {branch.rating}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {branch.address}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px]">
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                              {branch.cityLabel}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-primary-600 dark:text-primary-400 font-medium truncate">
                              {branch.specialty.split('·')[0].trim()}
                            </span>
                            <span className="ml-auto text-slate-400 font-semibold">
                              {branch.distance}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-4 text-center space-y-1">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Tidak ada bengkel yang cocok
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Coba cari dengan kata kunci &quot;Depok&quot;, &quot;Bogor&quot;, &quot;Jakarta&quot;, atau jenis servis seperti &quot;AC&quot;, &quot;Oli&quot;.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scrollable Sidebar Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* Header City & Workshop Photo Banner */}
            <div className="relative h-36 sm:h-44 bg-slate-900 overflow-hidden shrink-0 flex items-end p-4 group/banner">
              <div className="absolute inset-0">
                <WorkshopFront decorative cover />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent" />

              <div className="relative z-10 text-white space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold border border-white/20">
                  <Car className="h-3 w-3" />
                  <span>Bengkel Resmi ServiceGo</span>
                </div>
                <h3 id="branch-map-drawer-title" className="text-base sm:text-lg font-extrabold text-white drop-shadow-md leading-tight">
                  {activeBranch.name}
                </h3>
                <p className="text-xs text-slate-200 font-medium">
                  {activeBranch.cityLabel}
                </p>
              </div>
            </div>

            {/* Active Branch Header Info */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {activeBranch.name}
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 shrink-0 mt-0.5">
                  {activeBranch.distance}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-amber-500 flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span>{activeBranch.rating}</span>
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {activeBranch.reviewsCount} ulasan
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-primary-600 dark:text-primary-400 font-semibold text-[11px]">
                  {activeBranch.badge}
                </span>
              </div>
            </div>

            {/* Round Action Buttons Row (Like Google Maps in Screenshot) */}
            <div className="grid grid-cols-4 gap-2 px-3 py-3 border-b border-slate-100 dark:border-slate-800 text-center">
              {/* Rute (Opens Google Maps) */}
              <button
                type="button"
                onClick={() => handleOpenGoogleMaps(activeBranch)}
                className="flex flex-col items-center gap-1 group transition"
              >
                <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition flex items-center justify-center shadow-xs">
                  <Navigation className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition">
                  Rute
                </span>
              </button>

              {/* Booking */}
              <button
                type="button"
                onClick={() => handleBookingAtBranch(activeBranch)}
                className="flex flex-col items-center gap-1 group transition"
              >
                <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition flex items-center justify-center shadow-xs">
                  <Calendar className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 transition">
                  Booking
                </span>
              </button>

              {/* Telepon */}
              <a
                href={`tel:${activeBranch.phone}`}
                className="flex flex-col items-center gap-1 group transition"
              >
                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-slate-800 group-hover:text-white dark:group-hover:bg-slate-700 transition flex items-center justify-center shadow-xs">
                  <Phone className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                  Telepon
                </span>
              </a>

              {/* Bagikan */}
              <button
                type="button"
                onClick={handleShareBranch}
                className="flex flex-col items-center gap-1 group transition"
              >
                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-slate-800 group-hover:text-white dark:group-hover:bg-slate-700 transition flex items-center justify-center shadow-xs">
                  {isCopied ? (
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                </div>
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                  {isCopied ? 'Tersalin!' : 'Bagikan'}
                </span>
              </button>
            </div>

            {/* Google Maps Detail Rows */}
            <div className="p-4 space-y-3.5 border-b border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-primary-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                    {activeBranch.address}
                  </p>
                  <p className="text-[11px] text-slate-400">Jarak sekitar {activeBranch.distance}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-slate-800 dark:text-slate-200 font-medium">
                    <span className="text-emerald-600 font-bold">Buka</span> · Tutup pukul 17:00 WIB
                  </p>
                  <p className="text-[11px] text-slate-400">{activeBranch.hours}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Wrench className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-slate-800 dark:text-slate-200 font-medium">
                    Layanan & Fasilitas
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {activeBranch.specialty}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                <p className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                  {activeBranch.phone}
                </p>
              </div>
            </div>

            {/* Daftar lokasi lain: hanya bila ada lebih dari satu bengkel */}
            {SERVICEGO_BRANCHES.length > 1 && (
            <div className="p-4 space-y-2.5 bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Lokasi lain ({filteredBranches.length})
                </p>
                <span className="text-[10px] text-slate-400 font-medium">Klik untuk pilih</span>
              </div>

              <div className="space-y-2">
                {filteredBranches.map((branch) => {
                  const isSelected = activeBranch.id === branch.id;
                  return (
                    <div
                      key={branch.id}
                      onClick={() => focusBranch(branch)}
                      className={clsx(
                        'p-2.5 rounded-xl border transition cursor-pointer text-left flex items-center gap-3',
                        isSelected
                          ? 'bg-white dark:bg-slate-800 border-primary-500 shadow-sm ring-1 ring-primary-500'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-primary-300'
                      )}
                    >
                      <span className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-200/80 dark:border-slate-700">
                        <WorkshopSmall decorative cover />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                            {branch.name}
                          </span>
                          <span className="text-[10px] text-amber-500 font-bold shrink-0">
                            ★ {branch.rating}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {branch.address}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                          <span className="font-semibold text-primary-600 dark:text-primary-400">{branch.cityLabel}</span>
                          <span>·</span>
                          <span>{branch.distance}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredBranches.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    Tidak ada bengkel yang cocok dengan filter atau pencarian ini.
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* RIGHT: Real Interactive Map Canvas                            */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="flex-1 h-full relative overflow-hidden bg-slate-100 dark:bg-slate-800">
          {/* Leaflet Map Div */}
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Collapse / Expand Toggle Button (Like Google Maps in Screenshot) */}
          <button
            type="button"
            onClick={() => {
              setIsSidebarOpen(!isSidebarOpen);
              setTimeout(() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.invalidateSize();
                }
              }, 320);
            }}
            title={isSidebarOpen ? 'Ciutkan panel samping' : 'Buka panel samping'}
            className="absolute top-1/2 -translate-y-1/2 left-2 z-30 h-8 w-8 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition hover:scale-105"
          >
            <ChevronLeft
              className={clsx(
                'h-4 w-4 transition-transform duration-200',
                !isSidebarOpen && 'rotate-180'
              )}
            />
          </button>

          {/* Floating Pill Filters at the top of the map (Like GMaps: Restoran, Hotel, etc.) */}
          {SERVICEGO_BRANCHES.length > 1 && (
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 overflow-x-auto max-w-[calc(100%-80px)] p-1">
            {(['All', 'Jakarta', 'Depok', 'Bogor'] as const).map((city) => {
              const count =
                city === 'All'
                  ? SERVICEGO_BRANCHES.length
                  : SERVICEGO_BRANCHES.filter((b) => b.city === city).length;
              const isActive = selectedCity === city;

              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => handleSelectCity(city)}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-md backdrop-blur-md border',
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-slate-900 dark:border-white ring-2 ring-primary-500/20'
                      : 'bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <span>{city === 'All' ? 'Semua lokasi' : city}</span>
                  <span
                    className={clsx(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                      isActive
                        ? 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          )}

          {/* Floating Close Button at top right of map canvas */}
          <button
            type="button"
            onClick={onClose}
            title="Tutup Peta"
            className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-md border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Quick Floating Active Branch Card at Bottom of Map */}
          <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                <WorkshopSmall decorative cover />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
                  <h5 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    {activeBranch.name}
                  </h5>
                  <span className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5 shrink-0">
                    ★ {activeBranch.rating}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {activeBranch.address}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenGoogleMaps(activeBranch)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Buka navigasi di Google Maps"
              >
                <Navigation className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleBookingAtBranch(activeBranch)}
                className="px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
              >
                <span>Booking di Sini</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
