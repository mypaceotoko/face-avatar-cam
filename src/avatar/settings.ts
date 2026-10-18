export const SKIN_TONES = [
  "#edc6ad",
  "#dbab8d",
  "#c99172",
  "#9c664c",
  "#654332",
];
export type AvatarSettings = {
  skin: string;
  hair: string;
  iris: string;
  faceWidth: number;
  jaw: number;
  eyeSize: number;
  eyeShape: number;
  browArch: number;
  nose: number;
  lips: number;
  hairstyle: "bob" | "short" | "long";
  coverage: number;
};
export const DEFAULT_SETTINGS: AvatarSettings = {
  skin: SKIN_TONES[0],
  hair: "#493025",
  iris: "#85552c",
  faceWidth: 1,
  jaw: 0.5,
  eyeSize: 1,
  eyeShape: 0.5,
  browArch: 0.5,
  nose: 0.5,
  lips: 0.5,
  hairstyle: "bob",
  coverage: 1.12,
};
export const PRESETS = [
  { name: "Hazel", settings: DEFAULT_SETTINGS },
  {
    name: "Amber",
    settings: {
      ...DEFAULT_SETTINGS,
      skin: SKIN_TONES[2],
      hair: "#291d1b",
      iris: "#a77137",
      faceWidth: 1.04,
      hairstyle: "short" as const,
    },
  },
  {
    name: "Noor",
    settings: {
      ...DEFAULT_SETTINGS,
      skin: SKIN_TONES[4],
      hair: "#211a20",
      iris: "#59432e",
      hairstyle: "long" as const,
    },
  },
];
export const SETTINGS_KEY = "face-avatar-studio:v1";
export function sanitizeSettings(value: unknown): AvatarSettings {
  const result = { ...DEFAULT_SETTINGS };
  if (!value || typeof value !== "object") return result;
  const v = value as Record<string, unknown>;
  for (const key of ["skin", "hair", "iris"] as const) {
    if (typeof v[key] === "string" && /^#[\da-f]{6}$/i.test(v[key]))
      result[key] = v[key];
  }
  const ranges = {
    faceWidth: [0.88, 1.12],
    jaw: [0, 1],
    eyeSize: [0.85, 1.15],
    eyeShape: [0, 1],
    browArch: [0, 1],
    nose: [0, 1],
    lips: [0, 1],
    coverage: [1, 1.4],
  };
  for (const key of Object.keys(ranges) as (keyof typeof ranges)[]) {
    const n = v[key];
    if (typeof n === "number" && Number.isFinite(n))
      result[key] = Math.max(ranges[key][0], Math.min(ranges[key][1], n));
  }
  if (
    v.hairstyle === "bob" ||
    v.hairstyle === "short" ||
    v.hairstyle === "long"
  )
    result.hairstyle = v.hairstyle;
  return result;
}
export function loadSettings(): AvatarSettings {
  try {
    return sanitizeSettings(
      JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null"),
    );
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
