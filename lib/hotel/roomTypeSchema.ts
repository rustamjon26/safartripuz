import { z } from "zod";

export const ROOM_AMENITY_OPTIONS = [
  { id: "wifi", label: "WiFi" },
  { id: "tv", label: "TV" },
  { id: "ac", label: "Konditsioner" },
  { id: "fridge", label: "Muzlatgich" },
  { id: "safe", label: "Seyf" },
  { id: "bathroom", label: "Vannaxona" },
  { id: "balcony", label: "Balkon" },
] as const;

export const ROOM_AMENITY_IDS = ROOM_AMENITY_OPTIONS.map((a) => a.id);

export const roomTypeBodySchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional().nullable(),
  basePrice: z.number().nonnegative(),
  capacityAdults: z.number().int().min(1).max(20).default(2),
  capacityChildren: z.number().int().min(0).max(20).default(0),
  amenities: z
    .array(z.enum(["wifi", "tv", "ac", "fridge", "safe", "bathroom", "balcony"]))
    .optional(),
  images: z.array(z.string().min(1)).max(15).optional(),
  isActive: z.boolean().optional(),
});

export type RoomTypeBody = z.infer<typeof roomTypeBodySchema>;

export function parseAmenities(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export function parseImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export function serializeRoomType(rt: {
  id: string;
  name: string;
  description: string | null;
  basePrice: unknown;
  capacityAdults: number;
  capacityChildren: number;
  amenities: unknown;
  images: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { rooms: number };
}) {
  return {
    id: rt.id,
    name: rt.name,
    description: rt.description,
    basePrice: Number(rt.basePrice),
    capacityAdults: rt.capacityAdults,
    capacityChildren: rt.capacityChildren,
    capacity: rt.capacityAdults + rt.capacityChildren,
    amenities: parseAmenities(rt.amenities),
    images: parseImages(rt.images),
    isActive: rt.isActive,
    roomsCount: rt._count?.rooms ?? 0,
    createdAt: rt.createdAt,
    updatedAt: rt.updatedAt,
  };
}
