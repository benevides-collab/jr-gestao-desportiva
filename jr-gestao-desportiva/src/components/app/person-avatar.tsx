import { getInitials } from "@/components/app/athlete-avatar";
import { cn } from "@/lib/utils";

type PersonAvatarProps = {
  name: string;
  photoUrl?: string | null;
  className?: string;
};

export function PersonAvatar({ name, photoUrl, className }: PersonAvatarProps) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={`Foto de ${name}`}
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
