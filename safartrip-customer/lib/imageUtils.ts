import { Image } from "react-native";

export type ImagePlaceholderType = "hotel" | "homestay" | "guide";

const PLACEHOLDERS: Record<ImagePlaceholderType, number> = {
  hotel: require("../assets/placeholder-hotel.png"),
  homestay: require("../assets/placeholder-homestay.png"),
  guide: require("../assets/placeholder-guide.png"),
};

const placeholderUriCache: Partial<Record<ImagePlaceholderType, string>> = {};

function getPlaceholderUri(type: ImagePlaceholderType): string {
  const cached = placeholderUriCache[type];
  if (cached) return cached;
  const uri = Image.resolveAssetSource(PLACEHOLDERS[type]).uri;
  placeholderUriCache[type] = uri;
  return uri;
}

export function getImageUrl(
  url?: string | null,
  type: ImagePlaceholderType,
): string {
  const trimmed = typeof url === "string" ? url.trim() : "";
  if (trimmed.length > 0 && /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return getPlaceholderUri(type);
}
