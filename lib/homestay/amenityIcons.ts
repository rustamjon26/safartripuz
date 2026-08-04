import type { LucideIcon } from "lucide-react";
import {
  Wifi,
  Car,
  CookingPot,
  AirVent,
  Tv,
  WashingMachine,
  Waves,
  Flame,
  Check,
} from "lucide-react";

export type AmenityOption = {
  key: string;
  label: string;
  Icon: LucideIcon;
};

/** Canonical filter/display list for HomeStay amenities. */
export const HOMESTAY_AMENITIES: AmenityOption[] = [
  { key: "wifi", label: "WiFi", Icon: Wifi },
  { key: "parking", label: "Avtoturargoh", Icon: Car },
  { key: "kitchen", label: "Oshxona", Icon: CookingPot },
  { key: "AC", label: "Konditsioner", Icon: AirVent },
  { key: "TV", label: "Televizor", Icon: Tv },
  { key: "washing machine", label: "Kir yuvish", Icon: WashingMachine },
  { key: "pool", label: "Basseyn", Icon: Waves },
  { key: "BBQ", label: "Mangal", Icon: Flame },
];

const BY_KEY = new Map<string, AmenityOption>();
for (const a of HOMESTAY_AMENITIES) {
  BY_KEY.set(a.key, a);
  BY_KEY.set(a.key.toLowerCase(), a);
  BY_KEY.set(a.key.replace(/\s+/g, "_"), a);
  BY_KEY.set(a.key.replace(/\s+/g, "_").toLowerCase(), a);
}
BY_KEY.set("ac", HOMESTAY_AMENITIES.find((a) => a.key === "AC")!);
BY_KEY.set("tv", HOMESTAY_AMENITIES.find((a) => a.key === "TV")!);
BY_KEY.set("bbq", HOMESTAY_AMENITIES.find((a) => a.key === "BBQ")!);
BY_KEY.set(
  "washing_machine",
  HOMESTAY_AMENITIES.find((a) => a.key === "washing machine")!,
);

export function getAmenityMeta(key: string): AmenityOption {
  return (
    BY_KEY.get(key) ??
    BY_KEY.get(key.toLowerCase()) ?? {
      key,
      label: key,
      Icon: Check,
    }
  );
}
