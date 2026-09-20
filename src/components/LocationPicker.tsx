import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, Trash2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const DEFAULT_CENTER: [number, number] = [26.9124, 75.7873]; // Jaipur

function ClickCatcher({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  const ref = useRef(onPick);
  ref.current = onPick;
  useMapEvents({
    click(e) {
      ref.current(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (lat !== null && lng !== null && isFinite(lat) && isFinite(lng)) {
      map.setView([lat, lng], first.current ? 14 : Math.max(map.getZoom(), 14));
      first.current = false;
    }
  }, [lat, lng, map]);
  return null;
}

export default function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const { info, error } = useToast();

  const numLat = lat !== null && lat !== undefined ? Number(lat) : null;
  const numLng = lng !== null && lng !== undefined ? Number(lng) : null;
  const hasPin =
    numLat !== null &&
    numLng !== null &&
    !isNaN(numLat) &&
    !isNaN(numLng) &&
    isFinite(numLat) &&
    isFinite(numLng);

  const locateMe = () => {
    if (!navigator.geolocation) {
      error('Geolocation unavailable', 'Your browser does not support location detection.');
      return;
    }
    info('Locating…', 'Requesting your GPS position.');
    navigator.geolocation.getCurrentPosition(
      (pos) => onChange(pos.coords.latitude, pos.coords.longitude),
      () => error('Location denied', 'Please tap the map to drop a pin manually.'),
      { timeout: 10000 }
    );
  };

  const markerIcon = L.divIcon({
    className: 'cf-pin-wrap',
    html: '<div class="cf-pin cf-pin-pick"><span></span></div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm" style={{ height: 320 }}>
        <MapContainer
          center={hasPin ? [numLat!, numLng!] : DEFAULT_CENTER}
          zoom={hasPin ? 15 : 12}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickCatcher onPick={onChange} />
          <Recenter lat={numLat} lng={numLng} />
          {hasPin && (
            <Marker
              position={[numLat!, numLng!]}
              icon={markerIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target.getLatLng();
                  onChange(m.lat, m.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={locateMe}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-700"
        >
          <Crosshair className="h-3.5 w-3.5" /> Use my location
        </button>
        {hasPin && (
          <>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-[11px] font-semibold text-slate-600">
              {numLat!.toFixed(5)}, {numLng!.toFixed(5)}
            </span>
            <button
              type="button"
              onClick={() => onChange(null as unknown as number, null as unknown as number)}
              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
          </>
        )}
        {!hasPin && <p className="text-xs text-slate-400">Tap anywhere on the map to drop a pin (drag to adjust).</p>}
      </div>
    </div>
  );
}
