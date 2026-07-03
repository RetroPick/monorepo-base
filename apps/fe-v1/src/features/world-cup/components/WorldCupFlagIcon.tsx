import { cn } from "@/lib/utils";

type WorldCupFlagIconProps = {
  code: string;
  className?: string;
};

export function WorldCupFlagIcon({ code, className }: WorldCupFlagIconProps) {
  const normalized = code.toLowerCase().replace(/[^a-z-]/g, "");
  if (!normalized) return null;
  return (
    <img
      src={`https://flagcdn.com/w40/${normalized}.png`}
      alt=""
      className={cn("h-3 w-4 rounded-sm object-cover", className)}
      loading="lazy"
    />
  );
}
