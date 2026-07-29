import {
  Droplet,
  Flame,
  PawPrint,
  ShowerHead,
  Toilet,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";

const AMENITY_ICONS: Record<string, LucideIcon> = {
  "toilets:flush": Toilet,
  "toilets:vault": Toilet,
  water: Droplet,
  drinking_water: Droplet,
  fire_pit: Flame,
  electricity: Zap,
  shower: ShowerHead,
  pets: PawPrint,
  waterfront: Waves,
};

// Vault toilets reuse the flush-toilet glyph, muted, since lucide has no separate vault icon.
const MUTED_KEYS = new Set(["toilets:vault"]);

export default function AmenityIcon({
  amenityKey,
  label,
  className,
}: {
  amenityKey: string;
  label?: string;
  className?: string;
}) {
  const Icon = AMENITY_ICONS[amenityKey];
  if (!Icon) return null;
  const muted = MUTED_KEYS.has(amenityKey) ? "opacity-60" : "";
  return (
    <Icon
      size={16}
      strokeWidth={1.75}
      color="currentColor"
      className={[muted, className].filter(Boolean).join(" ")}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
