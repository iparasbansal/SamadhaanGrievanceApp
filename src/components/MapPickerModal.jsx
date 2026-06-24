import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { Search, Navigation, Loader2, Check, X } from "lucide-react";
import "leaflet/dist/leaflet.css";

// 🧩 Fix missing marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});

// Component to handle clicks on the map to set marker position
function MapClick({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

// Component to dynamically re-center the Leaflet map
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

export default function MapPickerModal({ show, onClose, position, onSelect }) {
  const initialLatLng = position && position.latitude && position.longitude
    ? { lat: position.latitude, lng: position.longitude }
    : null;

  const [markerPosition, setMarkerPosition] = useState(initialLatLng);
  const [mapCenter, setMapCenter] = useState(initialLatLng || { lat: 20.5937, lng: 78.9629 }); // Default to India center
  const [selectedAddress, setSelectedAddress] = useState(position?.address || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [geolocateLoading, setGeolocateLoading] = useState(false);

  useEffect(() => {
    if (position && position.latitude && position.longitude) {
      const latlng = { lat: position.latitude, lng: position.longitude };
      setMarkerPosition(latlng);
      setMapCenter(latlng);
      setSelectedAddress(position.address || "");
    }
  }, [position]);

  if (!show) return null;

  // Perform reverse geocoding using Nominatim
  const handleCoordsChange = async (latlng) => {
    setMarkerPosition(latlng);
    setSelectedAddress("Resolving address…");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`
      );
      const data = await res.json();
      setSelectedAddress(
        data.display_name || `Coordinates: ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`
      );
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
      setSelectedAddress(`Coordinates: ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
    }
  };

  // Perform text search geocoding using Nominatim
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newCoords = { lat: parseFloat(lat), lng: parseFloat(lon) };
        setMarkerPosition(newCoords);
        setMapCenter(newCoords);
        setSelectedAddress(display_name);
      }
    } catch (err) {
      console.error("Geocoding search failed:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Perform geolocation to grab user current position
  const handleGeolocate = () => {
    setGeolocateLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMarkerPosition(coords);
        setMapCenter(coords);
        handleCoordsChange(coords);
        setGeolocateLoading(false);
      },
      (err) => {
        console.error("Geolocation failed:", err);
        setGeolocateLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = () => {
    if (!markerPosition) return;
    onSelect({
      latitude: markerPosition.lat,
      longitude: markerPosition.lng,
      address: selectedAddress,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
      <div className="glass-panel-strong w-full max-w-3xl overflow-hidden p-0 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-emerald-100/80 px-6 py-4">
          <h3 className="font-space-grotesk text-lg font-bold bg-gradient-to-r from-emerald-700 to-sky-700 bg-clip-text text-transparent">
            Choose Grievance Location
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Location Bar */}
        <div className="bg-slate-50/50 p-4 border-b border-emerald-100/60 flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearch} className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city, street or area name…"
              className="input-dark w-full pl-4 pr-10 py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={searchLoading}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-emerald-600 transition"
            >
              {searchLoading ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin text-emerald-500" />
              ) : (
                <Search className="h-4.5 w-4.5" />
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={handleGeolocate}
            disabled={geolocateLoading}
            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-white px-4 py-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
          >
            {geolocateLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            ) : (
              <Navigation className="h-4 w-4 text-emerald-600" />
            )}
            Use GPS
          </button>
        </div>

        {/* Leaflet Map */}
        <div className="relative h-[360px] w-full bg-slate-100">
          <MapContainer
            center={mapCenter}
            zoom={14}
            style={{ height: "100%", width: "100%" }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {markerPosition && <Marker position={markerPosition}></Marker>}
            <MapClick onMapClick={handleCoordsChange} />
            <MapRecenter center={mapCenter} />
          </MapContainer>
        </div>

        {/* Footer address display and controls */}
        <div className="bg-white px-6 py-4 border-t border-emerald-100/80">
          {selectedAddress && (
            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Selected address
              </span>
              <p className="mt-1 text-sm font-medium text-slate-800 line-clamp-2">
                {selectedAddress}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              type="button"
              className="rounded-xl border border-emerald-100 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              type="button"
              disabled={!markerPosition || selectedAddress === "Resolving address…"}
              className="btn-primary !rounded-xl flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold disabled:opacity-40 disabled:pointer-events-none"
            >
              <Check className="h-4 w-4" />
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
