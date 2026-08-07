// Haversine great-circle distance between two lat/lng points, in meters —
// the standard formula for short-range GPS-track distance accumulation
// (accurate to within centimeters over the scale of a single walk/run/ride;
// the Earth's slight ellipsoidal shape only matters at much larger scales).
const EARTH_RADIUS_METERS = 6371000;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export const haversineDistanceMeters = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number => {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
};
