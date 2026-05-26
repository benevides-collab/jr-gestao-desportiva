import { cn } from "@/lib/utils";

type AthleteAvatarProps = {
  name: string;
  photoUrl?: string | null;
  className?: string;
};

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AthleteAvatar({ name, photoUrl, className }: AthleteAvatarProps) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={`Foto 3x4 de ${name}`}
        className={cn(
          "aspect-[3/4] rounded-md border border-zinc-200 object-cover",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex aspect-[3/4] items-center justify-center rounded-md border border-zinc-200 bg-zinc-100 text-sm font-black text-zinc-500",
        className
      )}
      aria-label={`Avatar de ${name}`}
    >
      {getInitials(name) || "JR"}
    </div>
  );
}
