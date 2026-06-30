import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getGrievances, getImageUrl } from '../services/api';
import GrievanceCard, { LiveTrace } from '../components/GrievanceCard';
import TypingText from '../components/TypingText';
import DepartmentAdminTools from '../components/DepartmentAdminTools';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  BarChart3,
  CheckCircle,
  ThumbsUp,
  Clock,
  AlertTriangle,
  MapPin,
  Activity,
  Radar,
  LayoutGrid,
  Map as MapIcon,
  X,
} from 'lucide-react';

const ALL_CATEGORIES = [
  'Roads & Infrastructure',
  'Water Supply',
  'Electricity',
  'Waste Management',
  'Public Safety',
  'Emergency Services',
  'Other',
];

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="skeleton-shimmer h-48 rounded-2xl" />
        <div className="skeleton-shimmer h-48 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-shimmer h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="skeleton-shimmer h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/** Radial resolution gauge (SVG) */
function ResolutionRadial({ percent }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <defs>
          <linearGradient id="radGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(16,185,129,0.12)" strokeWidth="10" />
        <motion.circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="url(#radGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums text-slate-900">{Math.round(percent)}%</span>
        <span className="text-[10px] uppercase tracking-widest text-slate-500">Resolved</span>
      </div>
    </div>
  );
}

/** Sparkline from last N days of volume */
const getTrailingDates = () => {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
  }
  return result;
};

const getTrailingDays = () => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push(days[d.getDay()]);
  }
  return result;
};

/** Sparkline from last N days of volume */
function TrendSparkline({ points }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  if (!points.length) return null;

  const w = 500;
  const h = 120;
  const chartH = 92;
  const max = Math.max(...points, 1);
  const step = w / Math.max(points.length - 1, 1);

  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${chartH - (p / max) * (chartH - 24) - 12}`)
    .join(' ');

  const areaD = `${d} L ${w} ${chartH} L 0 ${chartH} Z`;

  const days = getTrailingDays();
  const dates = getTrailingDates();

  const hoverX = hoveredIdx !== null ? hoveredIdx * step : 0;
  const hoverY = hoveredIdx !== null ? chartH - (points[hoveredIdx] / max) * (chartH - 24) - 12 : 0;

  return (
    <div className="relative w-full h-full group/chart">
      <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="overflow-visible">
        <defs>
          <linearGradient id="lineGlow" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={w} y2="0">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#0ea5e9" stopOpacity="1" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Horizontal Gridlines */}
        <line x1="0" y1="12" x2={w} y2="12" stroke="rgba(148, 163, 184, 0.08)" strokeDasharray="3 3" />
        <line x1="0" y1="48" x2={w} y2="48" stroke="rgba(148, 163, 184, 0.08)" strokeDasharray="3 3" />
        <line x1="0" y1="84" x2={w} y2="84" stroke="rgba(148, 163, 184, 0.08)" strokeDasharray="3 3" />

        {/* Area Under Curve */}
        <motion.path
          d={areaD}
          fill="url(#areaGlow)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />

        {/* Stroke Line */}
        <motion.path
          d={d}
          fill="none"
          stroke="url(#lineGlow)"
          strokeWidth="3"
          filter="url(#glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />

        {/* Vertical Tracker Guide Line */}
        {hoveredIdx !== null && (
          <line
            x1={hoverX}
            y1={4}
            x2={hoverX}
            y2={chartH}
            stroke="rgba(14, 165, 233, 0.3)"
            strokeDasharray="3 3"
            strokeWidth="1.5"
          />
        )}

        {/* Highlighted Marker Circle */}
        {hoveredIdx !== null && (
          <>
            <circle cx={hoverX} cy={hoverY} r="7" fill="#0ea5e9" opacity="0.3" />
            <circle cx={hoverX} cy={hoverY} r="4.5" fill="#0ea5e9" stroke="#ffffff" strokeWidth="2" />
          </>
        )}

        {/* X-Axis Labels */}
        {days.map((day, i) => (
          <text
            key={i}
            x={i * step}
            y={h - 6}
            textAnchor={i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle'}
            className="text-[9px] font-bold tracking-wider fill-slate-400 font-mono uppercase"
          >
            {day}
          </text>
        ))}

        {/* Hover Target Overlay Columns */}
        {points.map((_, i) => {
          const colW = w / (points.length - 1);
          const colX = i === 0 ? 0 : i * step - colW / 2;
          const actualColW = i === 0 || i === points.length - 1 ? colW / 2 : colW;
          return (
            <rect
              key={i}
              x={colX}
              y={0}
              width={actualColW}
              height={chartH}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          );
        })}
      </svg>

      {/* Floating HTML Tooltip */}
      {hoveredIdx !== null && (
        <div
          className="absolute z-10 bg-slate-900/95 text-white px-3 py-2 rounded-xl text-xs pointer-events-none shadow-2xl border border-slate-800 flex flex-col font-mono min-w-[100px] backdrop-blur-md"
          style={{
            left: `${(hoverX / w) * 100}%`,
            top: `${(hoverY / h) * 100 - 55}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{dates[hoveredIdx]}</span>
          <span className="font-extrabold text-sky-400 mt-0.5 text-sm">
            {points[hoveredIdx]} {points[hoveredIdx] === 1 ? 'complaint' : 'complaints'}
          </span>
        </div>
      )}
    </div>
  );
}

function MapFocus({ focusCoords }) {
  const map = useMap();
  useEffect(() => {
    if (focusCoords) {
      const lat = focusCoords.lat ?? focusCoords.latitude;
      const lng = focusCoords.lng ?? focusCoords.longitude;
      if (lat && lng) {
        map.flyTo([lat, lng], 14, { animate: true, duration: 1.5 });
      }
    }
  }, [focusCoords, map]);
  return null;
}

function DashboardMap({
  grievances,
  userLocation,
  onInspectGrievance,
  mapFocusCoords,
  selectedGrievance,
  setSelectedGrievance,
}) {
  const center = userLocation?.latitude && userLocation?.longitude
    ? [userLocation.latitude, userLocation.longitude]
    : [20.5937, 78.9629];

  const [mapFilters, setMapFilters] = useState({
    showResolved: true,
    showCriticalOnly: false,
  });

  const mapGrievances = grievances.filter((g) => {
    if (mapFilters.showCriticalOnly && g.aiPriority !== "Critical") return false;
    if (!mapFilters.showResolved && g.status === "Resolved") return false;
    return true;
  });

  // Leaflet marker default configuration
  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
    });
  }, []);

  return (
    <div className="overflow-hidden h-full w-full relative">
      <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapFocus focusCoords={mapFocusCoords} />

        {/* Selected Grievance Popup (opens automatically on card click) */}
        {selectedGrievance?.location?.latitude && selectedGrievance?.location?.longitude && (
          <Popup
            position={[selectedGrievance.location.latitude, selectedGrievance.location.longitude]}
            onClose={() => setSelectedGrievance(null)}
          >
            <div className="p-2 max-w-[220px] text-slate-800 space-y-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                {selectedGrievance.category}
              </span>
              <h4 className="font-bold text-xs line-clamp-1 leading-tight">{selectedGrievance.title}</h4>
              <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed">
                {selectedGrievance.description}
              </p>
              
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
                <span
                  className={`text-[9px] font-bold uppercase ${
                    selectedGrievance.status === "Resolved" ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {selectedGrievance.status}
                </span>
                <button
                  type="button"
                  onClick={() => onInspectGrievance(selectedGrievance)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2.5 py-1 text-[10px] font-semibold transition"
                >
                  Inspect
                </button>
              </div>
            </div>
          </Popup>
        )}

        {/* User Location Marker */}
        {userLocation?.latitude && userLocation?.longitude && (
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={L.divIcon({
              html: `<div class="relative flex h-5 w-5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span><span class="relative inline-flex rounded-full h-5 w-5 bg-sky-500 border border-white"></span></div>`,
              className: "",
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          >
            <Popup>
              <div className="text-xs font-semibold text-slate-800">You are here</div>
            </Popup>
          </Marker>
        )}

        {/* Grievances Markers */}
        {mapGrievances
          .filter((g) => g.location?.latitude && g.location?.longitude)
          .map((g) => {
            const isResolved = g.status === "Resolved";
            const colorClass =
              g.aiPriority === "Critical"
                ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                : g.aiPriority === "High"
                ? "bg-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                : isResolved
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                : "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]";

            return (
              <Marker
                key={g._id}
                position={[g.location.latitude, g.location.longitude]}
                icon={L.divIcon({
                  html: `<div class="relative flex h-7 w-7 items-center justify-center rounded-full ${colorClass} text-white border-2 border-white shadow-md font-extrabold text-[10px]">${g.aiPriority[0]}</div>`,
                  className: "",
                  iconSize: [28, 28],
                  iconAnchor: [14, 14],
                })}
              >
                <Popup>
                  <div className="p-2 max-w-[220px] text-slate-800 space-y-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                      {g.category}
                    </span>
                    <h4 className="font-bold text-xs line-clamp-1 leading-tight">{g.title}</h4>
                    <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed">
                      {g.description}
                    </p>
                    
                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
                      <span
                        className={`text-[9px] font-bold uppercase ${
                          isResolved ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {g.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => onInspectGrievance(g)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2.5 py-1 text-[10px] font-semibold transition"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* Floating Legend */}
      <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur-md p-3 rounded-xl border border-emerald-100/70 shadow-lg text-[10px] font-medium text-slate-800 space-y-2 max-w-[160px] pointer-events-auto">
        <span className="font-bold text-slate-900 uppercase tracking-wider block border-b border-emerald-50 pb-1">Map Legend</span>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 border border-white shadow-sm" />
            <span>Critical Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-orange-500 border border-white shadow-sm" />
            <span>High Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 border border-white shadow-sm" />
            <span>Medium / Low</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white shadow-sm" />
            <span>Resolved Issue</span>
          </div>
        </div>
      </div>

      {/* Map Interactive Filters Overlays */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={() => setMapFilters(prev => ({ ...prev, showResolved: !prev.showResolved }))}
          className={`flex items-center justify-center px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider shadow-md transition ${
            mapFilters.showResolved
              ? 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {mapFilters.showResolved ? 'Hide Resolved' : 'Show Resolved'}
        </button>

        <button
          type="button"
          onClick={() => setMapFilters(prev => ({ ...prev, showCriticalOnly: !prev.showCriticalOnly }))}
          className={`flex items-center justify-center px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider shadow-md transition ${
            mapFilters.showCriticalOnly
              ? 'bg-red-600 border-red-500 text-white animate-pulse hover:bg-red-700'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {mapFilters.showCriticalOnly ? 'Show All Priorities' : 'Critical Only'}
        </button>
      </div>
    </div>
  );
}

function DashboardPage() {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: 'All', category: 'All', priority: 'All', timeRange: 'All', search: '' });
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState('list');
  const [inspectedGrievance, setInspectedGrievance] = useState(null);
  const [mapFocusCoords, setMapFocusCoords] = useState(null);
  const [selectedGrievanceForMap, setSelectedGrievanceForMap] = useState(null);
  const [leaderboardTab, setLeaderboardTab] = useState('departments');

  const { isAuthority, isSuperAdmin, user, departmentId, token } = useAuth();

  const [toast, setToast] = useState(null);

  const [userLocation, setUserLocation] = useState({
    latitude: null,
    longitude: null,
    address: 'Fetching location…',
  });

  const [placeholder, setPlaceholder] = useState('');

  useEffect(() => {
    const placeholderTexts = ['Query: water outage', 'Query: road hazard', 'Query: critical', 'Filter by department'];
    let index = 0;
    let isDeleting = false;
    let text = '';
    let interval;
    
    const tick = () => {
      const current = placeholderTexts[index % placeholderTexts.length];
      if (!isDeleting) {
        text = current.slice(0, text.length + 1);
        setPlaceholder(text);
        if (text === current) {
          isDeleting = true;
          clearInterval(interval);
          setTimeout(() => {
            interval = setInterval(tick, 40);
          }, 900);
        }
      } else {
        text = text.slice(0, -1);
        setPlaceholder(text);
        if (text === '') {
          isDeleting = false;
          index++;
          clearInterval(interval);
          setTimeout(() => {
            interval = setInterval(tick, 80);
          }, 500);
        }
      }
    };
    
    interval = setInterval(tick, 80);
    return () => clearInterval(interval);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        showToast('Triangulating position…', 'info');
        await new Promise((res) => setTimeout(res, 800));
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          })
        );
        const { latitude, longitude } = pos.coords;
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        const geoJson = await geoRes.json();
        const address = geoJson.display_name || 'Unknown location';
        setUserLocation({ latitude, longitude, address });
        showToast(`Locked: ${address.split(',')[0]}`, 'success');
      } catch (err) {
        console.warn("GPS triangulation failed, attempting IP fallback:", err);
        try {
          const ipRes = await fetch('https://ipapi.co/json/');
          const ipJson = await ipRes.json();
          const fallbackAddress = `${ipJson.city}, ${ipJson.region}`;
          setUserLocation({
            latitude: ipJson.latitude,
            longitude: ipJson.longitude,
            address: fallbackAddress,
          });
          showToast(`Approximate: ${fallbackAddress}`, 'info');
        } catch {
          setUserLocation({ latitude: null, longitude: null, address: 'Location unavailable' });
          showToast('Location unavailable', 'error');
        }
      }
    };
    fetchLocation();
  }, []);

  const getDistanceKm = (loc1, loc2) => {
    if (!loc1?.latitude || !loc2?.latitude) return Infinity;
    const R = 6371;
    const dLat = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
    const dLon = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((loc1.latitude * Math.PI) / 180) *
        Math.cos((loc2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const stats = useMemo(() => {
    return grievances.reduce(
      (acc, g) => {
        acc.total++;
        if (g.status === 'In Progress') acc.inProgress++;
        if (g.status === 'Resolved') acc.resolved++;
        return acc;
      },
      { total: 0, inProgress: 0, resolved: 0 }
    );
  }, [grievances]);

  const resolutionPercent = stats.total ? (stats.resolved / stats.total) * 100 : 0;

  const trendPoints = useMemo(() => {
    const days = 7;
    const now = new Date();
    const buckets = Array(days).fill(0);
    grievances.forEach((g) => {
      const d = new Date(g.createdAt);
      const diff = Math.floor((now - d) / (86400000));
      if (diff >= 0 && diff < days) buckets[days - 1 - diff]++;
    });
    return buckets;
  }, [grievances]);

  const deptResolvePreview = useMemo(() => {
    const map = {};
    grievances.forEach((g) => {
      const cat = g.category || 'Other';
      if (!map[cat]) map[cat] = { total: 0, resolved: 0 };
      map[cat].total++;
      if (g.status === 'Resolved') map[cat].resolved++;
    });
    return Object.entries(map)
      .map(([name, v]) => ({
        name,
        rate: v.total ? Math.round((v.resolved / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 4);
  }, [grievances]);

  const sortedLeaderboard = useMemo(() => {
    const map = {};
    ALL_CATEGORIES.forEach((cat) => {
      map[cat] = { total: 0, resolved: 0 };
    });
    
    grievances.forEach((g) => {
      const cat = g.category || 'Other';
      if (map[cat]) {
        map[cat].total++;
        if (g.status === 'Resolved') map[cat].resolved++;
      }
    });

    return Object.entries(map)
      .map(([name, v]) => ({
        name,
        total: v.total,
        resolved: v.resolved,
        rate: v.total ? Math.round((v.resolved / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.rate - a.rate || b.total - a.total);
  }, [grievances]);

  const sortedCitizenLeaderboard = useMemo(() => {
    const map = {};
    grievances.forEach((g) => {
      const uid = g.submitterUserId;
      if (!uid) return;
      const name = g.submitterName || 'Anonymous Citizen';
      
      if (!map[uid]) {
        map[uid] = {
          name,
          total: 0,
          resolved: 0,
          upvotes: 0,
        };
      }
      
      if (name && name !== 'Anonymous' && name !== 'Anonymous Citizen') {
        map[uid].name = name;
      }
      
      map[uid].total++;
      if (g.status === 'Resolved') map[uid].resolved++;
      map[uid].upvotes += g.upvotes || 0;
    });

    return Object.entries(map)
      .map(([id, v]) => ({
        id,
        name: v.name,
        total: v.total,
        resolved: v.resolved,
        upvotes: v.upvotes,
        score: v.total * 20 + v.resolved * 50 + v.upvotes * 15,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [grievances]);

  useEffect(() => {
    setLoading(true);
    getGrievances(1, 100, token)
      .then((data) => {
        setGrievances(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load grievances. Please refresh.');
        setLoading(false);
      });
  }, [token]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const priorityOrder = {
    Critical: 1,
    High: 2,
    Medium: 3,
    Low: 4,
    Pending: 5,
    undefined: 6,
  };

  const filteredGrievances = grievances
    .filter((g) => {
      const matchesStatus = filters.status === 'All' || g.status === filters.status;
      const matchesCategory = filters.category === 'All' || g.category === filters.category;
      const matchesPriority = filters.priority === 'All' || g.aiPriority === filters.priority;

      let matchesTime = true;
      if (filters.timeRange !== 'All') {
        const createdDate = new Date(g.createdAt);
        const diffMs = new Date() - createdDate;
        const diffHours = diffMs / (1000 * 60 * 60);
        if (filters.timeRange === '24h') {
          matchesTime = diffHours <= 24;
        } else if (filters.timeRange === '7d') {
          matchesTime = diffHours <= 24 * 7;
        } else if (filters.timeRange === '30d') {
          matchesTime = diffHours <= 24 * 30;
        }
      }

      const matchesSearch =
        !filters.search ||
        (g.title || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (g.category || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (g.aiPriority || '').toLowerCase().includes(filters.search.toLowerCase());
      return matchesStatus && matchesCategory && matchesPriority && matchesTime && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const aPriority = priorityOrder[a.aiPriority] || 6;
        const bPriority = priorityOrder[b.aiPriority] || 6;
        return aPriority - bPriority;
      }
      if (sortBy === 'upvotes') return (b.upvotes || 0) - (a.upvotes || 0);
      if (sortBy === 'nearest' && userLocation) {
        const distA = getDistanceKm(userLocation, a.location);
        const distB = getDistanceKm(userLocation, b.location);
        return distA - distB;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  return (
    <motion.div
      className="relative min-h-[60vh] overflow-hidden text-slate-800"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className={`fixed bottom-6 right-6 z-50 rounded-xl border px-5 py-3 text-sm font-medium shadow-lg backdrop-blur-xl ${
              toast.type === 'success'
                ? 'border-neon-emerald/40 bg-neon-emerald-dim/20 text-neon-emerald'
                : toast.type === 'error'
                  ? 'border-neon-crimson-hot/50 bg-neon-crimson-hot/15 text-neon-crimson'
                  : 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="mb-10 space-y-8"
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45 }}
      >
        <div className="glass-panel-strong relative overflow-hidden p-6 lg:p-8">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/12 via-white/40 to-sky-500/10" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-700">
              for Our Own Public
            </p>
            <h1 className="font-space-grotesk bg-gradient-to-r from-slate-900 via-emerald-700 to-sky-700 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent md:text-5xl">
              Community issue dashboard
            </h1>
            <p className="mt-3 max-w-xl text-sm font-medium text-slate-600">
              {isSuperAdmin
                ? 'All departments and citizen reports in one clean civic view'
                : isAuthority
                  ? `Department workspace · ${departmentId}`
                  : 'Track, filter, and support live public grievances'}
            </p>
          </div>

          <div className="relative w-full max-w-md">
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder={placeholder}
              className="input-dark w-full py-3 pl-4 pr-10"
            />
          </div>
          </div>
        </div>

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Hero visualizations */}
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <motion.div
                className="glass-panel-strong hover-lift relative overflow-hidden p-6"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-sky-500/10" />
                <div className="flex flex-col gap-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-600">
                        <Activity className="h-5 w-5 animate-pulse" />
                        <span className="text-xs font-semibold uppercase tracking-widest">Ingest volume</span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-1.5">
                        <span className="font-space-grotesk text-3xl font-extrabold text-slate-900">{stats.total}</span>
                        <span className="text-xs text-slate-500">complaints · trailing 7 days</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50/70 px-2.5 py-1 rounded-full border border-emerald-100/50 uppercase tracking-wider">
                      Live tracking
                    </span>
                  </div>
                  <div className="h-[120px] w-full mt-1">
                    <TrendSparkline points={trendPoints} />
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="glass-panel-strong hover-lift flex flex-col gap-4 p-6"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Radar className="h-5 w-5" />
                    <span className="text-xs font-semibold uppercase tracking-widest">Resolution field</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
                  <ResolutionRadial percent={resolutionPercent} />
                  <ul className="w-full space-y-2 text-xs sm:max-w-[160px]">
                    {deptResolvePreview.map((d) => (
                      <li
                        key={d.name}
                        className="flex items-center justify-between gap-2 border-b border-emerald-100 pb-2 text-slate-600 last:border-0"
                      >
                        <span className="truncate">{d.name}</span>
                        <span className="font-mono text-emerald-600">{d.rate}%</span>
                      </li>
                    ))}
                    {deptResolvePreview.length === 0 && (
                      <li className="text-slate-500">No department data yet</li>
                    )}
                  </ul>
                </div>
              </motion.div>
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full">
              {/* Layout Toggle */}
              <div className="flex items-center gap-1 rounded-full border border-emerald-100 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                    viewMode === 'list'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-emerald-700'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                    viewMode === 'map'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-emerald-700'
                  }`}
                >
                  <MapIcon className="h-3.5 w-3.5" />
                  Map View
                </button>
              </div>

              {/* Sorting buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'date', label: 'Newest', icon: Clock },
                  { id: 'upvotes', label: 'Upvotes', icon: ThumbsUp },
                  { id: 'priority', label: 'Priority', icon: AlertTriangle },
                  { id: 'nearest', label: 'Nearest', icon: MapPin },
                ].map((btn) => {
                  const Icon = btn.icon;
                  return (
                    <motion.button
                      key={btn.id}
                      type="button"
                      onClick={() => setSortBy(btn.id)}
                      whileTap={{ scale: 0.97 }}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                        sortBy === btn.id
                          ? 'border-emerald-300 bg-emerald-100 text-emerald-800 shadow-[0_8px_24px_rgba(16,185,129,0.18)]'
                          : 'border-emerald-100 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {btn.label}
                    </motion.button>
                  );
                })}
              </div>

              {/* Filtering dropdowns */}
              <div className="md:ml-auto flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="input-dark max-w-[140px] py-2 text-xs"
                >
                  <option>All</option>
                  <option>Submitted</option>
                  <option>In Progress</option>
                  <option>Resolved</option>
                </select>

                <select
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                  className="input-dark max-w-[180px] py-2 text-xs"
                >
                  <option>All</option>
                  {ALL_CATEGORIES.map((cat) => (
                    <option key={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <select
                  name="priority"
                  value={filters.priority}
                  onChange={handleFilterChange}
                  className="input-dark max-w-[140px] py-2 text-xs"
                >
                  <option value="All">All Priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                <select
                  name="timeRange"
                  value={filters.timeRange}
                  onChange={handleFilterChange}
                  className="input-dark max-w-[140px] py-2 text-xs"
                >
                  <option value="All">All Time</option>
                  <option value="24h">Past 24 Hours</option>
                  <option value="7d">Past 7 Days</option>
                  <option value="30d">Past 30 Days</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  label: 'Total cases',
                  value: stats.total,
                  icon: BarChart3,
                  edge: 'border-neon-cyan/30 shadow-neon-cyan',
                },
                {
                  label: 'In progress',
                  value: stats.inProgress,
                  icon: Clock,
                  edge: 'neon-edge-amber',
                },
                {
                  label: 'Resolved',
                  value: stats.resolved,
                  icon: CheckCircle,
                  edge: 'neon-edge-emerald',
                },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`glass-panel hover-lift relative overflow-hidden p-5 ${stat.edge}`}
                  >
                    <div className="absolute left-0 top-0 h-1 w-full bg-gradient-primary opacity-70" />
                    <Icon className="mb-3 h-5 w-5 text-emerald-600" />
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      {stat.label}
                    </p>
                    <p className="font-space-grotesk mt-1 text-3xl font-extrabold text-slate-900">{stat.value}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Category Analytics & Leaderboard Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Column 1: Department Category Analytics */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="glass-panel-strong p-6 relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80" />
                <div className="flex items-center gap-2 border-b border-emerald-100 pb-3 mb-5">
                  <BarChart3 className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-space-grotesk text-base font-bold text-slate-900">
                    Department Category Analytics
                  </h3>
                </div>
                <div className="space-y-4">
                  {ALL_CATEGORIES.map((cat, i) => {
                    const count = grievances.filter((g) => g.category === cat).length;
                    const percentage = stats.total ? (count / stats.total) * 100 : 0;
                    const gradients = [
                      "from-blue-500 to-indigo-500",
                      "from-cyan-400 to-blue-500",
                      "from-amber-400 to-orange-500",
                      "from-emerald-400 to-teal-500",
                      "from-rose-500 to-red-600",
                      "from-red-500 to-rose-600",
                      "from-slate-400 to-slate-500",
                    ];
                    const grad = gradients[i % gradients.length];
                    return (
                      <div key={cat} className="space-y-1.5 bg-slate-50/50 hover:bg-slate-50/80 p-3 rounded-xl border border-slate-100 transition duration-200">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">{cat}</span>
                          <span className="font-mono text-slate-600 font-bold">
                            {count} {stats.total ? `(${Math.round(percentage)}%)` : ''}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100/80 rounded-full overflow-hidden border border-slate-200/30">
                          <motion.div
                            className={`h-full bg-gradient-to-r ${grad}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Column 2: Tabbed Leaderboard (Departments vs Citizen Heroes) */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
                className="glass-panel-strong p-6 relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-teal-500 to-sky-500 opacity-80" />
                
                {/* Header with Tabs */}
                <div className="flex items-center justify-between border-b border-emerald-100 pb-3 mb-5 gap-4">
                  <div className="flex items-center gap-1.5 rounded-full border border-emerald-50 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setLeaderboardTab('departments')}
                      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                        leaderboardTab === 'departments'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-emerald-700'
                      }`}
                    >
                      Departments
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaderboardTab('citizens')}
                      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                        leaderboardTab === 'citizens'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-emerald-700'
                      }`}
                    >
                      Citizen Heroes
                    </button>
                  </div>
                  <h3 className="font-space-grotesk text-xs font-bold uppercase tracking-wider text-slate-500">
                    Leaderboard
                  </h3>
                </div>

                <div className="space-y-4">
                  {leaderboardTab === 'departments' ? (
                    sortedLeaderboard.map((dept, index) => {
                      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}`;
                      const isMedal = index < 3;
                      return (
                        <div
                          key={dept.name}
                          className={`flex items-center justify-between p-3 rounded-xl border transition duration-200 ${
                            index === 0
                              ? 'bg-amber-500/5 border-amber-200/50 hover:bg-amber-500/10'
                              : index === 1
                              ? 'bg-slate-300/10 border-slate-200/50 hover:bg-slate-300/15'
                              : index === 2
                              ? 'bg-amber-700/5 border-amber-600/30 hover:bg-amber-700/10'
                              : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50/80'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              isMedal ? 'bg-white shadow-sm border border-slate-100' : 'text-slate-400'
                            }`}>
                              {medal}
                            </span>
                            <span className="text-xs font-bold text-slate-800">{dept.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-xs font-bold text-emerald-600 block">
                              {dept.rate}% resolved
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {dept.resolved} of {dept.total} cases
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    sortedCitizenLeaderboard.map((citizen, index) => {
                      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}`;
                      const isMedal = index < 3;
                      return (
                        <div
                          key={citizen.id}
                          className={`flex items-center justify-between p-3 rounded-xl border transition duration-200 ${
                            index === 0
                              ? 'bg-amber-500/5 border-amber-200/50 hover:bg-amber-500/10'
                              : index === 1
                              ? 'bg-slate-300/10 border-slate-200/50 hover:bg-slate-300/15'
                              : index === 2
                              ? 'bg-amber-700/5 border-amber-600/30 hover:bg-amber-700/10'
                              : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50/80'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              isMedal ? 'bg-white shadow-sm border border-slate-100' : 'text-slate-400'
                            }`}>
                              {medal}
                            </span>
                            <span className="text-xs font-bold text-slate-800">{citizen.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-xs font-bold text-emerald-600 block">
                              {citizen.score} pts
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {citizen.total} filed · {citizen.resolved} resolved
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  {leaderboardTab === 'citizens' && sortedCitizenLeaderboard.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-500">
                      No citizen reports logged yet.
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 py-12 text-center text-red-600">
                {error}
              </div>
            ) : filteredGrievances.length === 0 ? (
              <div className="glass-panel py-16 text-center text-slate-500">
                No grievances match this filter.
              </div>
            ) : viewMode === 'map' ? (
              <div className="flex flex-col lg:flex-row gap-6 h-[650px] w-full items-stretch">
                {/* Left feed panel */}
                <div className="w-full lg:w-[38%] h-[350px] lg:h-full overflow-y-auto pr-2 space-y-4">
                  <div className="p-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-3">
                      Filtered grievances ({filteredGrievances.length})
                    </span>
                    <div className="space-y-4">
                      {filteredGrievances.map((g, index) => (
                        <GrievanceCard
                          key={g._id}
                          grievance={g}
                          index={index}
                          isAuthority={isAuthority}
                          currentUserId={user?.id}
                          showToast={showToast}
                          userLocation={userLocation}
                          getDistanceKm={getDistanceKm}
                          onGrievanceUpdate={(updated) => {
                            setGrievances((prev) => prev.map((x) => (x._id === updated._id ? { ...x, ...updated } : x)));
                          }}
                          onCardClick={(e, clickedG) => {
                            e.stopPropagation();
                            setMapFocusCoords(clickedG.location);
                            setSelectedGrievanceForMap(clickedG);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right map panel */}
                <div className="w-full lg:w-[62%] h-[400px] lg:h-full rounded-2xl overflow-hidden border border-emerald-100/60 shadow-sm relative bg-white flex-1">
                  <DashboardMap
                    grievances={filteredGrievances}
                    userLocation={userLocation}
                    isAuthority={isAuthority}
                    currentUserId={user?.id}
                    showToast={showToast}
                    getDistanceKm={getDistanceKm}
                    onGrievanceUpdate={(updated) => {
                      setGrievances((prev) => prev.map((x) => (x._id === updated._id ? { ...x, ...updated } : x)));
                    }}
                    onInspectGrievance={(g) => setInspectedGrievance(g)}
                    mapFocusCoords={mapFocusCoords}
                    selectedGrievance={selectedGrievanceForMap}
                    setSelectedGrievance={setSelectedGrievanceForMap}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredGrievances.map((g, index) => (
                  <GrievanceCard
                    key={g._id}
                    grievance={g}
                    index={index}
                    isAuthority={isAuthority}
                    currentUserId={user?.id}
                    showToast={showToast}
                    userLocation={userLocation}
                    getDistanceKm={getDistanceKm}
                    onGrievanceUpdate={(updated) => {
                      setGrievances((prev) => prev.map((x) => (x._id === updated._id ? { ...x, ...updated } : x)));
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Shared Inspection Details Modal */}
      <AnimatePresence>
        {inspectedGrievance && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md"
            onClick={() => setInspectedGrievance(null)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 16 }}
              className="glass-panel-strong max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 text-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-emerald-100 pb-3 mb-4">
                <h2 className="font-space-grotesk text-xl font-bold text-slate-900">{inspectedGrievance.title}</h2>
                <button
                  type="button"
                  onClick={() => setInspectedGrievance(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <p className="text-sm text-slate-700 leading-relaxed mb-4">{inspectedGrievance.description}</p>

              <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                <div>
                  <span className="text-slate-500 font-semibold block">Department</span>
                  <p className="text-slate-700 font-medium">{inspectedGrievance.category}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Priority</span>
                  <p className="text-slate-700 font-medium">{inspectedGrievance.aiPriority}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Status</span>
                  <p className="text-slate-700 font-medium">{inspectedGrievance.status}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Signals (Upvotes)</span>
                  <p className="text-slate-700 font-medium">{inspectedGrievance.upvotes || 0}</p>
                </div>
              </div>

              {inspectedGrievance.summary && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3.5 mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">AI summary</span>
                  <p className="text-xs text-slate-600 leading-relaxed">{inspectedGrievance.summary}</p>
                </div>
              )}

              {inspectedGrievance.location?.address && (
                <div className="mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Location</span>
                  <p className="text-xs text-slate-600">{inspectedGrievance.location.address}</p>
                </div>
              )}

              <LiveTrace status={inspectedGrievance.status} />

              {inspectedGrievance.citizenPhoto?.url && (
                <div className="mt-4 overflow-hidden rounded-xl border border-emerald-100 bg-white">
                  <img
                    src={getImageUrl(inspectedGrievance.citizenPhoto.url)}
                    alt="Grievance proof"
                    className="max-h-64 w-full object-cover"
                  />
                  <p className="px-3 py-2 text-[10px] text-slate-500">
                    Citizen photo proof
                    {inspectedGrievance.citizenPhoto.uploadedAt
                      ? ` · ${new Date(inspectedGrievance.citizenPhoto.uploadedAt).toLocaleString('en-IN')}`
                      : ''}
                  </p>
                </div>
              )}

              {inspectedGrievance.resolutionPhoto?.url && (
                <div className="mt-4 overflow-hidden rounded-xl border border-emerald-100 bg-white">
                  <img
                    src={getImageUrl(inspectedGrievance.resolutionPhoto.url)}
                    alt="Solved proof"
                    className="max-h-64 w-full object-cover"
                  />
                  <p className="px-3 py-2 text-[10px] text-slate-500">
                    Solved photo proof
                    {inspectedGrievance.resolutionPhoto.uploadedAt
                      ? ` · ${new Date(inspectedGrievance.resolutionPhoto.uploadedAt).toLocaleString('en-IN')}`
                      : ''}
                  </p>
                </div>
              )}

              <DepartmentAdminTools
                grievance={inspectedGrievance}
                isAuthority={isAuthority}
                showToast={showToast}
                onGrievanceUpdate={(updated) => {
                  setGrievances((prev) => prev.map((x) => (x._id === updated._id ? { ...x, ...updated } : x)));
                  setInspectedGrievance(updated);
                }}
              />

              <button
                type="button"
                onClick={() => setInspectedGrievance(null)}
                className="btn-primary mt-6 w-full !py-2.5"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default DashboardPage;
