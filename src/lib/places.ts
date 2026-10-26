// Places on the globe, shared by the planet and the section captions.
export type PlaceId = "school" | "keyboards" | "oss" | "homelab" | "silt";

export const places: Record<PlaceId, { lat: number; lon: number; name: string }> = {
  school: { lat: 36, lon: 10, name: "Academy Building" },
  keyboards: { lat: 16, lon: 72, name: "Keyboard workshop" },
  oss: { lat: -14, lon: 150, name: "Upstream dock" },
  homelab: { lat: -12, lon: -140, name: "Off-grid homelab" },
  silt: { lat: 26, lon: -68, name: "Silt chunk" },
};

export const coords = (id: PlaceId) => {
  const { lat, lon } = places[id];
  return `${Math.abs(lat)}°${lat < 0 ? "S" : "N"} ${Math.abs(lon)}°${lon < 0 ? "W" : "E"}`;
};
