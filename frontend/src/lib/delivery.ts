import type { Order } from "../types/order";

export interface DeliveryLocation {
  lat: number;
  lng: number;
}

const COORD_PATTERN =
  /(?:พิกัดจัดส่ง|พิกัด|location|coords?)\s*:?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i;
const MAPS_Q_PATTERN = /(?:q=|destination=)(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i;

export function parseDeliveryLocation(address?: string): DeliveryLocation | null {
  if (!address) return null;
  const decoded = safeDecode(address);
  const match = decoded.match(COORD_PATTERN) ?? decoded.match(MAPS_Q_PATTERN);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function getDeliveryDestination(order: Order) {
  const location = parseDeliveryLocation(order.delivery_address);
  if (location) return `${location.lat},${location.lng}`;
  return order.delivery_address || order.customer_name || order.order_id;
}

export function getGoogleMapsDirectionsUrl(order: Order) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    getDeliveryDestination(order),
  )}`;
}

export function getDeliveryAddressSummary(address?: string) {
  if (!address) return "-";
  return address
    .split("\n")
    .filter((line) => !line.trim().startsWith("พิกัดจัดส่ง:"))
    .filter((line) => !line.trim().startsWith("แผนที่:"))
    .join("\n")
    .trim();
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
