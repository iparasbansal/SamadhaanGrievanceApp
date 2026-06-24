import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useState, useEffect } from "react";

// 🧩 Fix missing marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});

function MapClick({ setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return null;
}

export default function MapPicker({ position, setPosition }) {
  const [mapCenter, setMapCenter] = useState(position || { lat: 20.5937, lng: 78.9629 }); // India center

  useEffect(() => {
    if (position) setMapCenter(position);
  }, [position]);

  return (
    <div className="rounded-xl overflow-hidden border border-cyan-400/30 shadow-md mt-3">
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: "300px", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {position && <Marker position={position}></Marker>}
        <MapClick setPosition={setPosition} />
      </MapContainer>
    </div>
  );
}
