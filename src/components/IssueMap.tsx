import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { priorityMeta } from '../lib/format';
import { CategoryBadge, PriorityBadge, StatusBadge } from './Badges';

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  title: string;
  category: string;
  priority_band?: string;
  priority_score?: number;
  status?: string;
  complaint_count?: number;
  address?: string;
}

function pinIcon(color: string, count?: number) {
  const label = count && count > 1 ? `<span>${count > 9 ? '9+' : count}</span>` : '<span></span>';
  return L.divIcon({
    className: 'cf-pin-wrap',
    html: `<div class="cf-pin" style="--pin:${color}">${label}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  });
}

function FitBounds({ sig, points }: { sig: string; points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds.pad(0.18));
    } else if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return null;
}

export default function IssueMap({
  points,
  height = 440,
  linkPrefix = '/issues',
  autoFit = true,
  center = [26.9124, 75.7873] as [number, number],
  zoom = 12,
}: {
  points: MapPoint[];
  height?: number;
  linkPrefix?: string;
  autoFit?: boolean;
  center?: [number, number];
  zoom?: number;
}) {
  const valid = points.filter((p) => isFinite(p.lat) && isFinite(p.lng));
  const sig = valid.map((p) => p.id).join(',');

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm" style={{ height }}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {autoFit && <FitBounds sig={sig} points={valid} />}
        {valid.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(priorityMeta(p.priority_band).pin, p.complaint_count)}>
            <Popup>
              <div className="min-w-[220px] max-w-[280px]">
                <p className="text-sm font-bold leading-snug text-slate-900">{p.title}</p>
                {p.address && <p className="mt-0.5 text-xs text-slate-500">{p.address}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <CategoryBadge category={p.category} size="sm" />
                  {p.priority_band && <PriorityBadge band={p.priority_band} score={p.priority_score} size="sm" />}
                  {p.status && <StatusBadge status={p.status} size="sm" />}
                </div>
                {(p.complaint_count ?? 0) > 1 && (
                  <p className="mt-1.5 text-xs font-semibold text-indigo-700">
                    {p.complaint_count} linked reports (deduplicated)
                  </p>
                )}
                <Link
                  to={`${linkPrefix}/${p.id}`}
                  className="mt-2.5 inline-block rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
                >
                  Open details →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
