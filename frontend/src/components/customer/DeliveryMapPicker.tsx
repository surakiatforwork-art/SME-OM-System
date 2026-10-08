import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { LocateFixed, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Button } from "../ui/Button";

export interface DeliveryLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

interface DeliveryMapPickerProps {
  value: DeliveryLocation | null;
  onChange: (location: DeliveryLocation) => void;
}

const DEFAULT_LOCATION: DeliveryLocation = {
  lat: 13.7563,
  lng: 100.5018,
};

const markerIcon = L.divIcon({
  className: "delivery-map-marker",
  html: '<span></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

export function DeliveryMapPicker({ value, onChange }: DeliveryMapPickerProps) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const location = value ?? DEFAULT_LOCATION;

  const mapsUrl = useMemo(
    () => `https://www.google.com/maps?q=${location.lat.toFixed(6)},${location.lng.toFixed(6)}`,
    [location.lat, location.lng],
  );

  function useCurrentLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("เบราว์เซอร์นี้ไม่รองรับการดึงตำแหน่งปัจจุบัน");
      return;
    }
    setStatus("กำลังขอตำแหน่ง...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setStatus("ใช้ตำแหน่งปัจจุบันแล้ว สามารถลากหมุดปรับจุดส่งได้");
      },
      () => {
        setError("ไม่สามารถดึงตำแหน่งได้ กรุณาอนุญาต GPS หรือเลื่อนหมุดเอง");
        setStatus("");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      },
    );
  }

  return (
    <div className="grid gap-3 rounded-xl border border-cream-200/70 bg-rice-100 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint-100 text-mint-700">
            <MapPin size={18} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold text-cocoa-900">ปักหมุดจุดจัดส่ง</p>
            <p className="text-xs leading-5 text-cocoa-500">
              กดใช้ GPS หรือแตะ/ลากหมุดบนแผนที่เพื่อปรับตำแหน่ง
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={useCurrentLocation}
          icon={<LocateFixed size={16} aria-hidden />}
        >
          ใช้ตำแหน่งปัจจุบัน
        </Button>
      </div>

      <div className="delivery-map-shell overflow-hidden rounded-xl border border-white bg-white">
        <MapContainer
          center={[location.lat, location.lng]}
          zoom={15}
          scrollWheelZoom={false}
          className="h-72 w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapSync location={location} />
          <MapClickHandler onChange={onChange} />
          <DraggableMarker location={location} onChange={onChange} />
        </MapContainer>
      </div>

      <div className="grid gap-2 rounded-xl bg-white p-3 text-xs text-cocoa-600 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="font-semibold text-cocoa-900">
            พิกัด: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </p>
          {location.accuracy ? (
            <p className="mt-1">ความแม่นยำประมาณ {Math.round(location.accuracy)} เมตร</p>
          ) : (
            <p className="mt-1">ยังไม่ใช้ GPS สามารถเลือกจากแผนที่ได้</p>
          )}
          {status ? <p className="mt-1 font-semibold text-mint-700">{status}</p> : null}
          {error ? <p className="mt-1 font-semibold text-red-600">{error}</p> : null}
        </div>
        <a
          className="font-bold text-mint-700"
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
        >
          เปิดใน Google Maps
        </a>
      </div>
    </div>
  );
}

function MapSync({ location }: { location: DeliveryLocation }) {
  const map = useMap();

  useEffect(() => {
    map.setView([location.lat, location.lng], Math.max(map.getZoom(), 15), {
      animate: true,
    });
  }, [location.lat, location.lng, map]);

  return null;
}

function MapClickHandler({
  onChange,
}: {
  onChange: (location: DeliveryLocation) => void;
}) {
  useMapEvents({
    click(event) {
      onChange({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return null;
}

function DraggableMarker({
  location,
  onChange,
}: {
  location: DeliveryLocation;
  onChange: (location: DeliveryLocation) => void;
}) {
  return (
    <Marker
      draggable
      icon={markerIcon}
      position={[location.lat, location.lng]}
      eventHandlers={{
        dragend(event) {
          const marker = event.target as L.Marker;
          const next = marker.getLatLng();
          onChange({
            lat: next.lat,
            lng: next.lng,
          });
        },
      }}
    />
  );
}

export function formatDeliveryLocation(location: DeliveryLocation | null) {
  if (!location) return "";
  const lat = location.lat.toFixed(6);
  const lng = location.lng.toFixed(6);
  return `พิกัดจัดส่ง: ${lat}, ${lng}\nแผนที่: https://www.google.com/maps?q=${lat},${lng}`;
}
